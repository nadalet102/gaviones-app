const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ── NECESIDADES ────────────────────────────────────────────────────────────────
router.get('/api/necesidades', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        pr.id as producto_id, pr.referencia, pr.descripcion, pr.tipo,
        pr.largo, pr.ancho, pr.alto, pr.unidad,
        COALESCE(s.cantidad,0) as stock_actual,
        -- Total pedido: suma de lineas de pedidos activos (sin duplicar por entregas)
        COALESCE((
          SELECT SUM(l.cantidad)
          FROM lineas_pedido l
          JOIN pedidos pe ON pe.id=l.pedido_id
          WHERE l.producto_id=pr.id
          AND pe.estado NOT IN ('entregado','cancelado')
        ),0) as pedido_total,
        -- Ya entregado: entregas confirmadas
        COALESCE((
          SELECT SUM(e.cantidad)
          FROM entregas_parciales e
          JOIN lineas_pedido l ON l.id=e.linea_pedido_id
          JOIN pedidos pe ON pe.id=l.pedido_id
          WHERE l.producto_id=pr.id
          AND e.estado='confirmada'
          AND pe.estado NOT IN ('cancelado')
        ),0) as entregado_total,
        -- Programado pendiente: entregas pendientes de confirmar
        COALESCE((
          SELECT SUM(e.cantidad)
          FROM entregas_parciales e
          JOIN lineas_pedido l ON l.id=e.linea_pedido_id
          JOIN pedidos pe ON pe.id=l.pedido_id
          WHERE l.producto_id=pr.id
          AND e.estado='pendiente'
          AND pe.estado NOT IN ('cancelado')
        ),0) as programado_pendiente
      FROM productos pr
      LEFT JOIN stock s ON s.producto_id=pr.id
      WHERE pr.activo=true
      ORDER BY pr.tipo,pr.largo DESC`);
    res.json(r.rows.map(row=>({
      ...row,
      pendiente_entregar: Math.max(0, +row.pedido_total - +row.entregado_total),
      necesidad_neta: Math.max(0, +row.pedido_total - +row.entregado_total - +row.stock_actual)
    })));
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
