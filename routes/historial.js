const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/api/historial', async (req, res) => {
  try {
    const pedidosHist = (await pool.query(`
      SELECT p.*,c.nombre as cliente_nombre_rel
      FROM pedidos p LEFT JOIN clientes c ON c.id=p.cliente_id
      WHERE p.estado IN ('entregado','cancelado')
      ORDER BY p.created_at DESC LIMIT 100`)).rows;
    const lineas = (await pool.query(`
      SELECT l.*,pr.referencia,pr.descripcion,pr.tipo,pr.largo,pr.ancho,pr.alto,pr.unidad
      FROM lineas_pedido l JOIN productos pr ON pr.id=l.producto_id`)).rows;
    const entregas = (await pool.query(`
      SELECT e.*,l.cantidad as linea_cantidad,l.pedido_id,
        pr.referencia,pr.descripcion,pr.largo,pr.ancho,pr.alto,pr.unidad,
        pe.numero as pedido_numero,pe.cliente_nombre,pe.obra
      FROM entregas_parciales e
      JOIN lineas_pedido l ON l.id=e.linea_pedido_id
      JOIN productos pr ON pr.id=l.producto_id
      JOIN pedidos pe ON pe.id=l.pedido_id
      WHERE e.estado='confirmada'
      ORDER BY e.fecha_carga DESC LIMIT 200`)).rows;
    pedidosHist.forEach(p=>{
      p.lineas=lineas.filter(l=>l.pedido_id===p.id);
    });
    res.json({pedidos:pedidosHist, entregas});
  } catch(e) { res.status(500).json({error:e.message}); }
});

module.exports = router;
