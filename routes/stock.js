const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { stockMovimiento } = require('../helpers');

// ── STOCK ──────────────────────────────────────────────────────────────────────
router.get('/api/stock', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, p.referencia,p.descripcion,p.tipo,p.largo,p.ancho,p.alto,p.unidad
      FROM stock s JOIN productos p ON p.id=s.producto_id
      WHERE p.activo=true ORDER BY p.tipo,p.largo DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.get('/api/stock/movimientos', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*,p.referencia,p.descripcion
      FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id
      ORDER BY m.created_at DESC LIMIT 300`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/stock/movimiento', async (req, res) => {
  const {producto_id,tipo,cantidad,motivo,referencia_doc,fecha} = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stockMovimiento(client,producto_id,tipo,cantidad,motivo,referencia_doc,fecha);
    await client.query('COMMIT');
    const r = await pool.query('SELECT * FROM stock WHERE producto_id=$1',[producto_id]);
    res.json(r.rows[0]);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

module.exports = router;
