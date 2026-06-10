const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ── CLIENTES ───────────────────────────────────────────────────────────────────
router.get('/api/clientes', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM clientes ORDER BY nombre')).rows); }
  catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/clientes', async (req, res) => {
  const {nombre,contacto,telefono,email,direccion} = req.body;
  try {
    res.json((await pool.query(
      `INSERT INTO clientes (nombre,contacto,telefono,email,direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre,contacto,telefono,email,direccion]
    )).rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.put('/api/clientes/:id', async (req, res) => {
  const {nombre,contacto,telefono,email,direccion} = req.body;
  try {
    res.json((await pool.query(
      `UPDATE clientes SET nombre=$1,contacto=$2,telefono=$3,email=$4,direccion=$5 WHERE id=$6 RETURNING *`,
      [nombre,contacto,telefono,email,direccion,req.params.id]
    )).rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.delete('/api/clientes/:id', async (req, res) => {
  try { await pool.query('DELETE FROM clientes WHERE id=$1',[req.params.id]); res.json({ok:true}); }
  catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
