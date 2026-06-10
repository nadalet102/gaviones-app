const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ── PEDIDOS ────────────────────────────────────────────────────────────────────
router.get('/api/pedidos-gav', async (req, res) => {
  try {
    const pedidos = (await pool.query(`
      SELECT p.*,c.nombre as cliente_nombre_rel
      FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id
      ORDER BY p.created_at DESC`)).rows;
    const lineas = (await pool.query(`
      SELECT l.*,pr.referencia,pr.descripcion,pr.tipo,pr.largo,pr.ancho,pr.alto,pr.unidad
      FROM lineas_pedido l JOIN productos pr ON pr.id=l.producto_id`)).rows;
    const entregas = (await pool.query(`SELECT * FROM entregas_parciales ORDER BY fecha_carga`)).rows;
    pedidos.forEach(p => {
      p.lineas = lineas.filter(l=>l.pedido_id===p.id).map(l=>({
        ...l,
        entregas: entregas.filter(e=>e.linea_pedido_id===l.id)
      }));
    });
    res.json(pedidos);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/pedidos-gav', async (req, res) => {
  const {numero,cliente_id,cliente_nombre,fecha_pedido,fecha_entrega,estado,tipo_fabricacion,obra,notas,lineas,maps_url} = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Rechazar números de pedido duplicados (evita confusiones y reimportar el mismo PDF)
    if(numero){
      const dup = await client.query('SELECT 1 FROM pedidos WHERE numero=$1 LIMIT 1',[numero]);
      if(dup.rows.length){ await client.query('ROLLBACK'); return res.status(400).json({error:'Ya existe un pedido con el número '+numero}); }
    }
    const r = await client.query(
      `INSERT INTO pedidos (numero,cliente_id,cliente_nombre,fecha_pedido,fecha_entrega,estado,tipo_fabricacion,obra,notas) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [numero,cliente_id||null,cliente_nombre,fecha_pedido||null,fecha_entrega||null,estado||'pendiente',tipo_fabricacion||'bajo_pedido',obra,notas]
    );
    const pedido = r.rows[0];
    if(lineas&&lineas.length) {
      for(const l of lineas) {
        await client.query(
          `INSERT INTO lineas_pedido (pedido_id,producto_id,cantidad,precio_ud,notas) VALUES ($1,$2,$3,$4,$5)`,
          [pedido.id,l.producto_id,l.cantidad,l.precio_ud||null,l.notas||null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(pedido);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});
router.put('/api/pedidos-gav/:id', async (req, res) => {
  const {numero,cliente_id,cliente_nombre,fecha_pedido,fecha_entrega,estado,tipo_fabricacion,obra,notas,lineas,maps_url,update_log} = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE pedidos SET numero=$1,cliente_id=$2,cliente_nombre=$3,fecha_pedido=$4,fecha_entrega=$5,estado=$6,tipo_fabricacion=$7,obra=$8,notas=$9,maps_url=$10,update_log=COALESCE($11,update_log) WHERE id=$12 RETURNING *`,
      [numero,cliente_id||null,cliente_nombre,fecha_pedido||null,fecha_entrega||null,estado,tipo_fabricacion,obra,notas||null,maps_url||null,update_log?JSON.stringify(update_log):null,req.params.id]
    );
    if(lineas) {
      // Keep existing entregas — only delete lineas without entregas
      const existing = (await client.query('SELECT id FROM lineas_pedido WHERE pedido_id=$1',[req.params.id])).rows;
      for(const el of existing) {
        const hasEntregas = (await client.query('SELECT id FROM entregas_parciales WHERE linea_pedido_id=$1 LIMIT 1',[el.id])).rows.length>0;
        if(!hasEntregas) await client.query('DELETE FROM lineas_pedido WHERE id=$1',[el.id]);
      }
      for(const l of lineas) {
        if(l.id) {
          await client.query('UPDATE lineas_pedido SET producto_id=$1,cantidad=$2,precio_ud=$3,notas=$4 WHERE id=$5',
            [l.producto_id,l.cantidad,l.precio_ud||null,l.notas||null,l.id]);
        } else {
          await client.query('INSERT INTO lineas_pedido (pedido_id,producto_id,cantidad,precio_ud,notas) VALUES ($1,$2,$3,$4,$5)',
            [req.params.id,l.producto_id,l.cantidad,l.precio_ud||null,l.notas||null]);
        }
      }
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});
router.delete('/api/pedidos-gav/:id', async (req, res) => {
  try {
    const lineas = (await pool.query('SELECT id FROM lineas_pedido WHERE pedido_id=$1',[req.params.id])).rows;
    for(const l of lineas) await pool.query('DELETE FROM entregas_parciales WHERE linea_pedido_id=$1',[l.id]);
    await pool.query('DELETE FROM lineas_pedido WHERE pedido_id=$1',[req.params.id]);
    await pool.query('DELETE FROM pedidos WHERE id=$1',[req.params.id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.patch('/api/pedidos-gav/:id/estado', async (req, res) => {
  try {
    res.json((await pool.query('UPDATE pedidos SET estado=$1 WHERE id=$2 RETURNING *',[req.body.estado,req.params.id])).rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
// Observaciones por línea de pedido (edición rápida desde la lista)
router.patch('/api/lineas/:id/nota', async (req, res) => {
  try {
    res.json((await pool.query('UPDATE lineas_pedido SET notas=$1 WHERE id=$2 RETURNING *',[req.body.notas||null,req.params.id])).rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
