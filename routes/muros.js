const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ── MUROS GUARDADOS (historial del calculador) ────────────────────────────────
// El listado NO envía `datos` (puede ser grande); el detalle sí.
router.get('/api/muros', async (req, res) => {
  try {
    res.json((await pool.query(
      `SELECT id, nombre, obra, cliente, modo, resumen, created_at, updated_at
         FROM muros_guardados ORDER BY updated_at DESC`
    )).rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.get('/api/muros/:id', async (req, res) => {
  try {
    const r = (await pool.query('SELECT * FROM muros_guardados WHERE id=$1', [req.params.id])).rows[0];
    if(!r) return res.status(404).json({error:'Muro no encontrado'});
    res.json(r);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.post('/api/muros', async (req, res) => {
  const {nombre, obra, cliente, modo, resumen, datos} = req.body;
  if(!nombre || !datos) return res.status(400).json({error:'Faltan nombre o datos del muro'});
  try {
    res.json((await pool.query(
      `INSERT INTO muros_guardados (nombre, obra, cliente, modo, resumen, datos)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre, obra||null, cliente||null, modo||null, JSON.stringify(resumen||{}), JSON.stringify(datos)]
    )).rows[0]);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.put('/api/muros/:id', async (req, res) => {
  const {nombre, obra, cliente, modo, resumen, datos} = req.body;
  if(!nombre || !datos) return res.status(400).json({error:'Faltan nombre o datos del muro'});
  try {
    const r = (await pool.query(
      `UPDATE muros_guardados
          SET nombre=$1, obra=$2, cliente=$3, modo=$4, resumen=$5, datos=$6, updated_at=NOW()
        WHERE id=$7 RETURNING *`,
      [nombre, obra||null, cliente||null, modo||null, JSON.stringify(resumen||{}), JSON.stringify(datos), req.params.id]
    )).rows[0];
    if(!r) return res.status(404).json({error:'Muro no encontrado'});
    res.json(r);
  } catch(e) { res.status(500).json({error:e.message}); }
});
router.delete('/api/muros/:id', async (req, res) => {
  try { await pool.query('DELETE FROM muros_guardados WHERE id=$1', [req.params.id]); res.json({ok:true}); }
  catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
