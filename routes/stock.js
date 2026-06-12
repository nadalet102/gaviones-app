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
// Historial completo de movimientos de un producto concreto
router.get('/api/stock/movimientos/:producto_id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*,p.referencia,p.descripcion
      FROM movimientos_stock m JOIN productos p ON p.id=m.producto_id
      WHERE m.producto_id=$1
      ORDER BY m.created_at DESC LIMIT 500`, [req.params.producto_id]);
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

// ── RECÁLCULO DE STOCK DESDE EL HISTÓRICO DE MOVIMIENTOS ───────────────────────
// El stock cacheado (stock.cantidad) puede haberse descuadrado por el antiguo
// tope a 0. movimientos_stock es el libro real: stock = Σ entradas − Σ salidas.
// Consulta compartida: stock actual vs stock calculado desde el libro.
const SQL_DESCUADRES = `
  SELECT p.id AS producto_id, p.referencia, p.descripcion,
    COALESCE(s.cantidad,0) AS stock_actual,
    COALESCE((
      SELECT SUM(CASE WHEN m.tipo='entrada' THEN m.cantidad ELSE -m.cantidad END)
      FROM movimientos_stock m WHERE m.producto_id=p.id
    ),0) AS stock_calculado
  FROM productos p
  LEFT JOIN stock s ON s.producto_id=p.id
  ORDER BY p.referencia`;

function mapDescuadres(rows){
  return rows
    .map(r => ({ ...r,
      stock_actual: +r.stock_actual,
      stock_calculado: +r.stock_calculado,
      diferencia: +r.stock_calculado - +r.stock_actual }))
    .filter(r => r.diferencia !== 0);
}

// Previsualización: NO modifica nada, solo lista los descuadres detectados.
router.get('/api/stock/recalcular-preview', async (req, res) => {
  try {
    const rows = (await pool.query(SQL_DESCUADRES)).rows;
    const descuadres = mapDescuadres(rows);
    res.json({ total_productos: rows.length, descuadres: descuadres.length, items: descuadres });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// Aplicación: recalcula stock.cantidad de cada producto desde el libro.
router.post('/api/stock/recalcular', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Asegurar fila de stock para todo producto antes de recalcular
    await client.query(`INSERT INTO stock (producto_id, cantidad)
      SELECT id,0 FROM productos
      WHERE id NOT IN (SELECT producto_id FROM stock WHERE producto_id IS NOT NULL)`);
    const antes = mapDescuadres((await client.query(SQL_DESCUADRES)).rows);
    await client.query(`
      UPDATE stock s SET cantidad = COALESCE((
        SELECT SUM(CASE WHEN m.tipo='entrada' THEN m.cantidad ELSE -m.cantidad END)
        FROM movimientos_stock m WHERE m.producto_id=s.producto_id
      ),0), updated_at=NOW()`);
    await client.query('COMMIT');
    res.json({ ok:true, corregidos: antes.length, items: antes });
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({error:e.message}); }
  finally { client.release(); }
});

module.exports = router;
