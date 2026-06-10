const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { stockMovimiento } = require('../helpers');

// ── PARTES DE PRODUCCIÓN ───────────────────────────────────────────────────────
router.get('/api/partes', async (req, res) => {
  try {
    const partes = (await pool.query('SELECT * FROM partes_produccion ORDER BY fecha DESC LIMIT 60')).rows;
    const lineas = (await pool.query(`
      SELECT pl.*,p.referencia,p.descripcion,p.largo,p.ancho,p.alto,p.unidad
      FROM partes_lineas pl JOIN productos p ON p.id=pl.producto_id`)).rows;
    partes.forEach(p=>{ p.lineas=lineas.filter(l=>l.parte_id===p.id); });
    res.json(partes);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.get('/api/partes/hoy', async (req, res) => {
  const fecha = new Date().toISOString().slice(0,10);
  try {
    let parte = (await pool.query("SELECT * FROM partes_produccion WHERE fecha=$1 AND estado='abierto' LIMIT 1",[fecha])).rows[0];
    if(!parte) {
      parte = (await pool.query("INSERT INTO partes_produccion (fecha,estado) VALUES ($1,'abierto') RETURNING *",[fecha])).rows[0];
      const prods = (await pool.query("SELECT id FROM productos WHERE activo=true AND tipo!='accesorio'")).rows;
      for(const p of prods) {
        await pool.query('INSERT INTO partes_lineas (parte_id,producto_id,cantidad) VALUES ($1,$2,0)',[parte.id,p.id]);
      }
    }
    const lineas = (await pool.query(`
      SELECT pl.*,p.referencia,p.descripcion,p.largo,p.ancho,p.alto,p.unidad,p.tipo
      FROM partes_lineas pl JOIN productos p ON p.id=pl.producto_id
      WHERE pl.parte_id=$1 ORDER BY p.tipo,p.largo DESC`,[parte.id])).rows;
    parte.lineas = lineas;
    res.json(parte);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.patch('/api/partes/:id/linea', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  try {
    const r = await pool.query(
      'UPDATE partes_lineas SET cantidad=$1 WHERE parte_id=$2 AND producto_id=$3 RETURNING *',
      [cantidad, req.params.id, producto_id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/partes/:id/add-producto', async (req, res) => {
  const { producto_id } = req.body;
  try {
    const exists = await pool.query(
      'SELECT id FROM partes_lineas WHERE parte_id=$1 AND producto_id=$2',
      [req.params.id, producto_id]
    );
    if(exists.rows.length) return res.json({ok:true, already:true});
    await pool.query(
      'INSERT INTO partes_lineas (parte_id,producto_id,cantidad) VALUES ($1,$2,0)',
      [req.params.id, producto_id]
    );
    res.json({ok:true, already:false});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.delete('/api/partes/:id/linea/:producto_id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM partes_lineas WHERE parte_id=$1 AND producto_id=$2',
      [req.params.id, req.params.producto_id]
    );
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.post('/api/partes/:id/cerrar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const parte = (await client.query('SELECT * FROM partes_produccion WHERE id=$1',[req.params.id])).rows[0];
    if(!parte) throw new Error('Parte no encontrado');
    if(parte.estado==='cerrado') throw new Error('Ya cerrado');
    const lineas = (await client.query('SELECT * FROM partes_lineas WHERE parte_id=$1',[req.params.id])).rows;
    for(const l of lineas) {
      if(+l.cantidad>0) {
        await stockMovimiento(client,l.producto_id,'entrada',l.cantidad,'Parte producción '+parte.fecha,'PARTE-'+parte.id,parte.fecha);
      }
    }
    await client.query("UPDATE partes_produccion SET estado='cerrado' WHERE id=$1",[req.params.id]);
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

router.patch('/api/partes/:id/reabrir', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const parte = (await client.query('SELECT * FROM partes_produccion WHERE id=$1',[req.params.id])).rows[0];
    if(!parte) throw new Error('Parte no encontrado');
    if(parte.estado!=='cerrado') throw new Error('El parte no esta cerrado');
    // Reverse all stock movements from this parte
    const lineas = (await client.query('SELECT * FROM partes_lineas WHERE parte_id=$1',[req.params.id])).rows;
    for(const l of lineas){
      if(+l.cantidad>0){
        await stockMovimiento(client,l.producto_id,'salida',l.cantidad,'Reapertura parte '+parte.fecha,'REAB-'+req.params.id,new Date().toISOString().slice(0,10));
      }
    }
    await client.query("UPDATE partes_produccion SET estado='abierto' WHERE id=$1",[req.params.id]);
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

module.exports = router;
