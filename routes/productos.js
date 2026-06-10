const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ── PRODUCTOS ──────────────────────────────────────────────────────────────────
router.get('/api/productos', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, COALESCE(s.cantidad,0) as stock_actual, s.ubicacion as stock_ubicacion
      FROM productos p LEFT JOIN stock s ON s.producto_id=p.id
      WHERE p.activo=true ORDER BY p.tipo,p.largo DESC,p.ancho DESC,p.alto DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/productos', async (req, res) => {
  const {tipo,referencia,largo,ancho,alto,descripcion,unidad} = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO productos (tipo,referencia,largo,ancho,alto,descripcion,unidad) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tipo||'gavion',referencia,largo||null,ancho||null,alto||null,descripcion,unidad||'ud']
    );
    await pool.query('INSERT INTO stock (producto_id,cantidad) VALUES ($1,0)',[r.rows[0].id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.put('/api/productos/:id', async (req, res) => {
  const {tipo,referencia,largo,ancho,alto,descripcion,unidad,activo} = req.body;
  try {
    const r = await pool.query(
      `UPDATE productos SET tipo=$1,referencia=$2,largo=$3,ancho=$4,alto=$5,descripcion=$6,unidad=$7,activo=$8 WHERE id=$9 RETURNING *`,
      [tipo,referencia,largo||null,ancho||null,alto||null,descripcion,unidad,activo!==false,req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
