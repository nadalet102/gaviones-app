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

module.exports = router;
