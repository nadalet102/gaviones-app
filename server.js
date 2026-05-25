const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'gavion',
      referencia TEXT,
      largo NUMERIC,
      ancho NUMERIC,
      alto NUMERIC,
      descripcion TEXT,
      unidad TEXT DEFAULT 'ud',
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stock (
      id SERIAL PRIMARY KEY,
      producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
      cantidad NUMERIC DEFAULT 0,
      ubicacion TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS movimientos_stock (
      id SERIAL PRIMARY KEY,
      producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      cantidad NUMERIC NOT NULL,
      motivo TEXT,
      referencia_pedido TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      contacto TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      cliente_nombre TEXT,
      fecha_pedido DATE DEFAULT CURRENT_DATE,
      fecha_entrega DATE,
      estado TEXT DEFAULT 'pendiente',
      tipo_fabricacion TEXT DEFAULT 'bajo_pedido',
      obra TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lineas_pedido (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      cantidad NUMERIC NOT NULL,
      cantidad_fabricada NUMERIC DEFAULT 0,
      cantidad_entregada NUMERIC DEFAULT 0,
      precio_ud NUMERIC,
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS ordenes_fabricacion (
      id SERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
      cantidad NUMERIC NOT NULL,
      cantidad_hecha NUMERIC DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      fecha_inicio DATE,
      fecha_fin DATE,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Stock record por producto (uno por producto)
    ALTER TABLE stock ADD COLUMN IF NOT EXISTS ubicacion TEXT;
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS obra TEXT;

    -- Seed productos de ejemplo si tabla vacía
    INSERT INTO productos (tipo, referencia, largo, ancho, alto, descripcion, unidad)
    SELECT * FROM (VALUES
      ('gavion','GAV-1x1x1',1.0,1.0,1.0,'Gavión 1×1×1 m','ud'),
      ('gavion','GAV-2x1x1',2.0,1.0,1.0,'Gavión 2×1×1 m','ud'),
      ('gavion','GAV-3x1x1',3.0,1.0,1.0,'Gavión 3×1×1 m','ud'),
      ('gavion','GAV-2x1x0.5',2.0,1.0,0.5,'Gavión 2×1×0.5 m','ud'),
      ('gavion','GAV-4x1x1',4.0,1.0,1.0,'Gavión 4×1×1 m','ud'),
      ('accesorio','GRAPA-STD',NULL,NULL,NULL,'Grapas de cierre (bolsa 100ud)','bolsa'),
      ('accesorio','ALAMBRE-ATD',NULL,NULL,NULL,'Alambre de atado (rollo 50m)','rollo'),
      ('colchoneta','COL-6x2x0.17',6.0,2.0,0.17,'Colchoneta Reno 6×2×0.17 m','ud'),
      ('colchoneta','COL-4x2x0.17',4.0,2.0,0.17,'Colchoneta Reno 4×2×0.17 m','ud')
    ) AS v(tipo,referencia,largo,ancho,alto,descripcion,unidad)
    WHERE NOT EXISTS (SELECT 1 FROM productos LIMIT 1);

    -- Stock inicial a 0 para cada producto
    INSERT INTO stock (producto_id, cantidad)
    SELECT id, 0 FROM productos
    WHERE id NOT IN (SELECT producto_id FROM stock WHERE producto_id IS NOT NULL);
  `);
  console.log('DB ready');
}

// ── PRODUCTOS ─────────────────────────────────────────────────────────────────
app.get('/api/productos', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, COALESCE(s.cantidad,0) as stock_actual, s.ubicacion as stock_ubicacion
      FROM productos p
      LEFT JOIN stock s ON s.producto_id = p.id
      WHERE p.activo = true
      ORDER BY p.tipo, p.largo DESC, p.ancho DESC, p.alto DESC
    `);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/productos', async (req, res) => {
  const { tipo, referencia, largo, ancho, alto, descripcion, unidad } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO productos (tipo,referencia,largo,ancho,alto,descripcion,unidad) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tipo||'gavion', referencia, largo||null, ancho||null, alto||null, descripcion, unidad||'ud']
    );
    // Create stock record
    await pool.query('INSERT INTO stock (producto_id, cantidad) VALUES ($1, 0)', [r.rows[0].id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
  const { tipo, referencia, largo, ancho, alto, descripcion, unidad, activo } = req.body;
  try {
    const r = await pool.query(
      `UPDATE productos SET tipo=$1,referencia=$2,largo=$3,ancho=$4,alto=$5,descripcion=$6,unidad=$7,activo=$8 WHERE id=$9 RETURNING *`,
      [tipo, referencia, largo||null, ancho||null, alto||null, descripcion, unidad, activo!==false, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STOCK ─────────────────────────────────────────────────────────────────────
app.get('/api/stock', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, p.referencia, p.descripcion, p.tipo, p.largo, p.ancho, p.alto, p.unidad
      FROM stock s JOIN productos p ON p.id = s.producto_id
      WHERE p.activo = true ORDER BY p.tipo, p.largo DESC
    `);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stock/movimiento', async (req, res) => {
  const { producto_id, tipo, cantidad, motivo, referencia_pedido } = req.body;
  // tipo: 'entrada' | 'salida' | 'ajuste'
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO movimientos_stock (producto_id,tipo,cantidad,motivo,referencia_pedido) VALUES ($1,$2,$3,$4,$5)`,
      [producto_id, tipo, cantidad, motivo, referencia_pedido||null]
    );
    const delta = tipo === 'entrada' ? +cantidad : tipo === 'salida' ? -cantidad : +cantidad;
    await client.query(
      `UPDATE stock SET cantidad = cantidad + $1, updated_at = NOW() WHERE producto_id = $2`,
      [delta, producto_id]
    );
    await client.query('COMMIT');
    const r = await pool.query('SELECT * FROM stock WHERE producto_id=$1', [producto_id]);
    res.json(r.rows[0]);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.get('/api/stock/movimientos', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*, p.referencia, p.descripcion
      FROM movimientos_stock m JOIN productos p ON p.id = m.producto_id
      ORDER BY m.created_at DESC LIMIT 200
    `);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── CLIENTES ──────────────────────────────────────────────────────────────────
app.get('/api/clientes', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM clientes ORDER BY nombre')).rows); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/clientes', async (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO clientes (nombre,contacto,telefono,email,direccion) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, contacto, telefono, email, direccion]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/clientes/:id', async (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  try {
    const r = await pool.query(
      `UPDATE clientes SET nombre=$1,contacto=$2,telefono=$3,email=$4,direccion=$5 WHERE id=$6 RETURNING *`,
      [nombre, contacto, telefono, email, direccion, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/clientes/:id', async (req, res) => {
  try { await pool.query('DELETE FROM clientes WHERE id=$1', [req.params.id]); res.json({ok:true}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PEDIDOS ───────────────────────────────────────────────────────────────────
app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = (await pool.query(`
      SELECT p.*, c.nombre as cliente_nombre_rel
      FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.created_at DESC
    `)).rows;
    const lineas = (await pool.query(`
      SELECT l.*, pr.referencia, pr.descripcion, pr.tipo, pr.largo, pr.ancho, pr.alto, pr.unidad
      FROM lineas_pedido l JOIN productos pr ON pr.id = l.producto_id
    `)).rows;
    pedidos.forEach(p => { p.lineas = lineas.filter(l => l.pedido_id === p.id); });
    res.json(pedidos);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pedidos', async (req, res) => {
  const { numero, cliente_id, cliente_nombre, fecha_pedido, fecha_entrega, estado, tipo_fabricacion, obra, notas, lineas } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO pedidos (numero,cliente_id,cliente_nombre,fecha_pedido,fecha_entrega,estado,tipo_fabricacion,obra,notas) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [numero, cliente_id||null, cliente_nombre, fecha_pedido||null, fecha_entrega||null, estado||'pendiente', tipo_fabricacion||'bajo_pedido', obra, notas]
    );
    const pedido = r.rows[0];
    if(lineas && lineas.length) {
      for(const l of lineas) {
        await client.query(
          `INSERT INTO lineas_pedido (pedido_id,producto_id,cantidad,precio_ud,notas) VALUES ($1,$2,$3,$4,$5)`,
          [pedido.id, l.producto_id, l.cantidad, l.precio_ud||null, l.notas||null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(pedido);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.put('/api/pedidos/:id', async (req, res) => {
  const { numero, cliente_id, cliente_nombre, fecha_pedido, fecha_entrega, estado, tipo_fabricacion, obra, notas, lineas } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE pedidos SET numero=$1,cliente_id=$2,cliente_nombre=$3,fecha_pedido=$4,fecha_entrega=$5,estado=$6,tipo_fabricacion=$7,obra=$8,notas=$9 WHERE id=$10 RETURNING *`,
      [numero, cliente_id||null, cliente_nombre, fecha_pedido||null, fecha_entrega||null, estado, tipo_fabricacion, obra, notas, req.params.id]
    );
    if(lineas) {
      await client.query('DELETE FROM lineas_pedido WHERE pedido_id=$1', [req.params.id]);
      for(const l of lineas) {
        await client.query(
          `INSERT INTO lineas_pedido (pedido_id,producto_id,cantidad,cantidad_fabricada,cantidad_entregada,precio_ud,notas) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, l.producto_id, l.cantidad, l.cantidad_fabricada||0, l.cantidad_entregada||0, l.precio_ud||null, l.notas||null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(r.rows[0]);
  } catch(e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM lineas_pedido WHERE pedido_id=$1', [req.params.id]);
    await pool.query('DELETE FROM pedidos WHERE id=$1', [req.params.id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/pedidos/:id/estado', async (req, res) => {
  try {
    const r = await pool.query('UPDATE pedidos SET estado=$1 WHERE id=$2 RETURNING *', [req.body.estado, req.params.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/lineas/:id/fabricada', async (req, res) => {
  try {
    const r = await pool.query('UPDATE lineas_pedido SET cantidad_fabricada=$1 WHERE id=$2 RETURNING *', [req.body.cantidad_fabricada, req.params.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ORDENES FABRICACION ───────────────────────────────────────────────────────
app.get('/api/ordenes', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT o.*, p.referencia, p.descripcion, p.largo, p.ancho, p.alto,
             pe.numero as pedido_numero, pe.cliente_nombre
      FROM ordenes_fabricacion o
      LEFT JOIN productos p ON p.id = o.producto_id
      LEFT JOIN pedidos pe ON pe.id = o.pedido_id
      ORDER BY o.created_at DESC
    `);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ordenes', async (req, res) => {
  const { numero, producto_id, pedido_id, cantidad, estado, fecha_inicio, fecha_fin, notas } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO ordenes_fabricacion (numero,producto_id,pedido_id,cantidad,estado,fecha_inicio,fecha_fin,notas) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [numero, producto_id, pedido_id||null, cantidad, estado||'pendiente', fecha_inicio||null, fecha_fin||null, notas]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/ordenes/:id', async (req, res) => {
  const { numero, producto_id, pedido_id, cantidad, cantidad_hecha, estado, fecha_inicio, fecha_fin, notas } = req.body;
  try {
    const r = await pool.query(
      `UPDATE ordenes_fabricacion SET numero=$1,producto_id=$2,pedido_id=$3,cantidad=$4,cantidad_hecha=$5,estado=$6,fecha_inicio=$7,fecha_fin=$8,notas=$9 WHERE id=$10 RETURNING *`,
      [numero, producto_id, pedido_id||null, cantidad, cantidad_hecha||0, estado, fecha_inicio||null, fecha_fin||null, notas, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ordenes/:id', async (req, res) => {
  try { await pool.query('DELETE FROM ordenes_fabricacion WHERE id=$1', [req.params.id]); res.json({ok:true}); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── NECESIDADES (pedidos vs stock) ────────────────────────────────────────────
app.get('/api/necesidades', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        pr.id as producto_id, pr.referencia, pr.descripcion, pr.tipo,
        pr.largo, pr.ancho, pr.alto, pr.unidad,
        COALESCE(s.cantidad, 0) as stock_actual,
        COALESCE(SUM(CASE WHEN pe.estado NOT IN ('entregado','cancelado') THEN l.cantidad ELSE 0 END), 0) as pedido_total,
        COALESCE(SUM(CASE WHEN pe.estado NOT IN ('entregado','cancelado') THEN l.cantidad_fabricada ELSE 0 END), 0) as fabricado_total,
        COALESCE(SUM(CASE WHEN o.estado NOT IN ('completada','cancelada') THEN o.cantidad ELSE 0 END), 0) as en_fabricacion
      FROM productos pr
      LEFT JOIN stock s ON s.producto_id = pr.id
      LEFT JOIN lineas_pedido l ON l.producto_id = pr.id
      LEFT JOIN pedidos pe ON pe.id = l.pedido_id
      LEFT JOIN ordenes_fabricacion o ON o.producto_id = pr.id
      WHERE pr.activo = true
      GROUP BY pr.id, pr.referencia, pr.descripcion, pr.tipo, pr.largo, pr.ancho, pr.alto, pr.unidad, s.cantidad
      ORDER BY pr.tipo, pr.largo DESC
    `);
    res.json(r.rows.map(row => ({
      ...row,
      necesidad_neta: Math.max(0, row.pedido_total - row.stock_actual - row.en_fabricacion)
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
initDB().then(() => app.listen(PORT, () => console.log(`Server on port ${PORT}`)));
