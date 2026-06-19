const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { stockMovimiento } = require('../helpers');

// ── ZONA DE CARADO (buffer intermedio entre vibrado y stock) ───────────────────
router.get('/api/carado', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT z.producto_id, z.cantidad, p.referencia, p.descripcion, p.largo, p.ancho, p.alto, p.unidad, p.tipo
      FROM zona_carado z JOIN productos p ON p.id=z.producto_id
      WHERE z.cantidad > 0
      ORDER BY p.alto DESC, p.largo DESC, p.referencia`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
// La mesa de vibrado deja aquí lo producido (no suma a stock todavía)
router.post('/api/carado/add', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  try {
    await pool.query(
      `INSERT INTO zona_carado (producto_id,cantidad) VALUES ($1,$2)
       ON CONFLICT (producto_id) DO UPDATE SET cantidad = zona_carado.cantidad + EXCLUDED.cantidad`,
      [producto_id, +cantidad]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});
// Pasar de carado a stock (descuenta del buffer y suma a stock)
router.post('/api/carado/to-stock', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT cantidad FROM zona_carado WHERE producto_id=$1 FOR UPDATE',[producto_id])).rows[0];
    const disp = row ? +row.cantidad : 0;
    if(+cantidad > disp) throw new Error('No hay tantos en zona de carado (disponible: '+disp+')');
    await client.query('UPDATE zona_carado SET cantidad = cantidad - $1 WHERE producto_id=$2',[+cantidad, producto_id]);
    await stockMovimiento(client, producto_id, 'entrada', +cantidad, 'Carado → stock', null, new Date().toISOString().slice(0,10));
    await client.query(`INSERT INTO movimientos_produccion (seccion,producto_id,cantidad) VALUES ('carado',$1,$2)`,[producto_id, +cantidad]);
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});
// Borrar unidades del carado (corrección de errores; NO suma a stock)
router.post('/api/carado/remove', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  try {
    await pool.query('UPDATE zona_carado SET cantidad = GREATEST(0, cantidad - $1) WHERE producto_id=$2',[+cantidad, producto_id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ── ZONA DE MONTAJE (buffer previo: gaviones vacíos montados, listos para vibrar) ──
router.get('/api/montaje', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT z.producto_id, z.cantidad, p.referencia, p.descripcion, p.largo, p.ancho, p.alto, p.unidad, p.tipo
      FROM zona_montaje z JOIN productos p ON p.id=z.producto_id
      WHERE z.cantidad > 0
      ORDER BY p.alto DESC, p.largo DESC, p.referencia`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
// El montaje deja aquí los gaviones vacíos montados (preparados para vibrar)
router.post('/api/montaje/add', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  try {
    await pool.query(
      `INSERT INTO zona_montaje (producto_id,cantidad) VALUES ($1,$2)
       ON CONFLICT (producto_id) DO UPDATE SET cantidad = zona_montaje.cantidad + EXCLUDED.cantidad`,
      [producto_id, +cantidad]);
    await pool.query(`INSERT INTO movimientos_produccion (seccion,producto_id,cantidad) VALUES ('montaje',$1,$2)`,[producto_id, +cantidad]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});
// Vibrar: pasa del montaje al carado (descuenta de montaje, suma a carado). Sin stock.
router.post('/api/montaje/to-carado', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT cantidad FROM zona_montaje WHERE producto_id=$1 FOR UPDATE',[producto_id])).rows[0];
    const disp = row ? +row.cantidad : 0;
    if(+cantidad > disp) throw new Error('No hay tantos en zona de montaje (disponible: '+disp+')');
    await client.query('UPDATE zona_montaje SET cantidad = cantidad - $1 WHERE producto_id=$2',[+cantidad, producto_id]);
    await client.query(
      `INSERT INTO zona_carado (producto_id,cantidad) VALUES ($1,$2)
       ON CONFLICT (producto_id) DO UPDATE SET cantidad = zona_carado.cantidad + EXCLUDED.cantidad`,
      [producto_id, +cantidad]);
    await client.query(`INSERT INTO movimientos_produccion (seccion,producto_id,cantidad) VALUES ('vibrado',$1,$2)`,[producto_id, +cantidad]);
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});
// Borrar unidades del montaje (corrección de errores)
router.post('/api/montaje/remove', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  try {
    await pool.query('UPDATE zona_montaje SET cantidad = GREATEST(0, cantidad - $1) WHERE producto_id=$2',[+cantidad, producto_id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Premontado: se monta y va DIRECTO a stock (no pasa por vibrado/carado). Cuenta como montaje.
router.post('/api/montaje/premontado', async (req, res) => {
  const {producto_id, cantidad} = req.body;
  if(!producto_id || !(+cantidad>0)) return res.status(400).json({error:'producto_id y cantidad requeridos'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stockMovimiento(client, producto_id, 'entrada', +cantidad, 'Montaje premontado', null, new Date().toISOString().slice(0,10));
    await client.query(`INSERT INTO movimientos_produccion (seccion,producto_id,cantidad) VALUES ('montaje',$1,$2)`,[producto_id, +cantidad]);
    await client.query('COMMIT');
    res.json({ok:true});
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

// ── INFORME DIARIO DE PRODUCCIÓN (por sección: montaje / vibrado / carado) ──────
router.get('/api/informe-produccion', async (req, res) => {
  const fecha = (req.query.fecha && /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha))
    ? req.query.fecha : new Date().toISOString().slice(0,10);
  try {
    const r = await pool.query(`
      SELECT mp.seccion, mp.producto_id, COALESCE(SUM(mp.cantidad),0) AS total,
             p.referencia, p.descripcion, p.largo, p.ancho, p.alto, p.unidad, p.tipo
      FROM movimientos_produccion mp
      LEFT JOIN productos p ON p.id=mp.producto_id
      WHERE mp.fecha=$1
      GROUP BY mp.seccion, mp.producto_id, p.referencia, p.descripcion, p.largo, p.ancho, p.alto, p.unidad, p.tipo
      HAVING COALESCE(SUM(mp.cantidad),0) > 0
      ORDER BY mp.seccion, p.alto DESC, p.largo DESC, p.referencia`, [fecha]);
    const secciones = { montaje: [], vibrado: [], carado: [] };
    r.rows.forEach(row => { (secciones[row.seccion] = secciones[row.seccion] || []).push(row); });
    const totales = {
      montaje: secciones.montaje.reduce((s,x)=>s+(+x.total||0),0),
      vibrado: secciones.vibrado.reduce((s,x)=>s+(+x.total||0),0),
      carado:  secciones.carado.reduce((s,x)=>s+(+x.total||0),0),
    };
    res.json({ fecha, secciones, totales });
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
