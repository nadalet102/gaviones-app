const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { stockMovimiento } = require('../helpers');

// ── ENTREGAS PARCIALES ────────────────────────────────────────────────────────
router.get('/api/entregas', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT e.*,
        l.cantidad as linea_cantidad, l.pedido_id, l.notas as linea_notas,
        pr.referencia, pr.descripcion, pr.largo, pr.ancho, pr.alto, pr.unidad,
        pe.numero as pedido_numero, pe.cliente_nombre, pe.obra, pe.maps_url
      FROM entregas_parciales e
      JOIN lineas_pedido l ON l.id=e.linea_pedido_id
      JOIN productos pr ON pr.id=l.producto_id
      JOIN pedidos pe ON pe.id=l.pedido_id
      WHERE pe.estado NOT IN ('cancelado')
      ORDER BY e.fecha_carga, pe.numero`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/entregas', async (req, res) => {
  const {linea_pedido_id,fecha_carga,cantidad,notas,transportista,mat_camion,mat_remolque,carga_grupo_id} = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO entregas_parciales (linea_pedido_id,fecha_carga,cantidad,estado,transportista,mat_camion,mat_remolque,carga_grupo_id,notas) VALUES ($1,$2,$3,'pendiente',$4,$5,$6,$7,$8) RETURNING *`,
      [linea_pedido_id,fecha_carga,cantidad,transportista||null,mat_camion||null,mat_remolque||null,carga_grupo_id||null,notas||null]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.put('/api/entregas/:id', async (req, res) => {
  const {fecha_carga,cantidad,notas,estado,transportista,mat_camion,mat_remolque,carga_grupo_id} = req.body;
  try {
    const r = await pool.query(
      `UPDATE entregas_parciales SET fecha_carga=$1,cantidad=$2,notas=$3,estado=$4,transportista=$5,mat_camion=$6,mat_remolque=$7,carga_grupo_id=$8 WHERE id=$9 RETURNING *`,
      [fecha_carga,cantidad,notas||null,estado||'pendiente',transportista||null,mat_camion||null,mat_remolque||null,carga_grupo_id||null,req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.patch('/api/entregas/:id/confirmar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const e = (await client.query(
      `SELECT e.*,l.producto_id,l.pedido_id,pe.numero as pedido_numero
       FROM entregas_parciales e
       JOIN lineas_pedido l ON l.id=e.linea_pedido_id
       JOIN pedidos pe ON pe.id=l.pedido_id
       WHERE e.id=$1`,[req.params.id]
    )).rows[0];
    if(!e) throw new Error('Entrega no encontrada');
    if(e.estado==='confirmada') throw new Error('Ya confirmada');
    await client.query(`UPDATE entregas_parciales SET estado='confirmada' WHERE id=$1`,[req.params.id]);
    await stockMovimiento(client,e.producto_id,'salida',e.cantidad,'Entrega confirmada ped. '+e.pedido_numero,'ENT-'+req.params.id,e.fecha_carga);

    // Check if ALL lines of the pedido are now fully delivered
    const pedidoId = e.pedido_id;
    const check = await client.query(`
      SELECT
        COALESCE(SUM(l.cantidad),0) as total_pedido,
        COALESCE(SUM(CASE WHEN ep.estado='confirmada' THEN ep.cantidad ELSE 0 END),0) as total_entregado
      FROM lineas_pedido l
      LEFT JOIN entregas_parciales ep ON ep.linea_pedido_id=l.id
      WHERE l.pedido_id=$1
    `,[pedidoId]);
    const {total_pedido, total_entregado} = check.rows[0];
    let pedidoAutoEntregado = false;
    if(+total_pedido > 0 && +total_entregado >= +total_pedido) {
      await client.query(`UPDATE pedidos SET estado='entregado' WHERE id=$1 AND estado NOT IN ('cancelado','entregado')`,[pedidoId]);
      pedidoAutoEntregado = true;
    }

    await client.query('COMMIT');
    res.json({ok:true, pedidoAutoEntregado, pedidoId});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});
router.patch('/api/entregas/:id/anular', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const e = (await client.query(
      'SELECT e.*,l.producto_id,pe.numero as pedido_numero FROM entregas_parciales e JOIN lineas_pedido l ON l.id=e.linea_pedido_id JOIN pedidos pe ON pe.id=l.pedido_id WHERE e.id=$1',
      [req.params.id]
    )).rows[0];
    if(!e) throw new Error('Entrega no encontrada');
    if(e.estado!=='confirmada') throw new Error('Solo se pueden anular entregas confirmadas');
    await client.query(`UPDATE entregas_parciales SET estado='pendiente' WHERE id=$1`,[req.params.id]);
    await stockMovimiento(client,e.producto_id,'entrada',e.cantidad,'Anulacion entrega ped. '+e.pedido_numero,'ANUL-'+req.params.id,new Date().toISOString().slice(0,10));
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

router.patch('/api/entregas/:id/fecha', async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE entregas_parciales SET fecha_carga=$1 WHERE id=$2 RETURNING *',
      [req.body.fecha_carga, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.delete('/api/entregas/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // If confirmed, reverse the stock movement
    const e = (await client.query('SELECT e.*,l.producto_id FROM entregas_parciales e JOIN lineas_pedido l ON l.id=e.linea_pedido_id WHERE e.id=$1',[req.params.id])).rows[0];
    if(!e) throw new Error('Entrega no encontrada');
    if(e.estado==='confirmada'){
      // Return stock
      await stockMovimiento(client,e.producto_id,'entrada',e.cantidad,'Anulación entrega confirmada','ANUL-'+req.params.id,new Date().toISOString().slice(0,10));
    }
    await client.query('DELETE FROM entregas_parciales WHERE id=$1',[req.params.id]);
    await client.query('COMMIT');
    res.json({ok:true, stockRevertido: e.estado==='confirmada'});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

module.exports = router;
