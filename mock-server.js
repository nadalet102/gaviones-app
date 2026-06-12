// ─────────────────────────────────────────────────────────────────────────────
//  mock-server.js — SERVIDOR DE DESARROLLO LOCAL (NO USAR EN PRODUCCIÓN)
//
//  Réplica de server.js + routes/*.js pero SIN PostgreSQL: todos los datos viven
//  en memoria (arrays/objetos JS). Sirve para desarrollar y probar el FRONTEND
//  en local sin necesitar una base de datos. Las rutas, métodos y la FORMA de las
//  respuestas (columnas, JOINs y campos calculados) son idénticas a las del
//  backend real, de modo que la app no nota la diferencia.
//
//  Arranque:  node mock-server.js     (escucha en process.env.PORT || 3000)
//  Los datos se reinician en cada arranque (no hay persistencia).
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────────────────────
//  ALMACENES EN MEMORIA (imitan las tablas de db.js)
// ─────────────────────────────────────────────────────────────────────────────
const db = {
  productos: [],            // {id,tipo,referencia,largo,ancho,alto,descripcion,unidad,activo,created_at}
  stock: [],                // {id,producto_id,cantidad,ubicacion,updated_at}
  movimientos_stock: [],    // {id,producto_id,tipo,cantidad,motivo,referencia_doc,fecha,created_at}
  clientes: [],             // {id,nombre,contacto,telefono,email,direccion,created_at}
  pedidos: [],              // {id,numero,cliente_id,cliente_nombre,fecha_pedido,fecha_entrega,estado,tipo_fabricacion,obra,notas,maps_url,update_log,created_at}
  lineas_pedido: [],        // {id,pedido_id,producto_id,cantidad,precio_ud,notas}
  entregas_parciales: [],   // {id,linea_pedido_id,fecha_carga,cantidad,estado,transportista,mat_camion,mat_remolque,carga_grupo_id,notas,created_at}
  zona_carado: [],          // {producto_id,cantidad}
  partes_produccion: [],    // {id,fecha,estado,notas,created_at}
  partes_lineas: [],        // {id,parte_id,producto_id,cantidad}
};

// Contadores autoincrementales (uno por tabla con SERIAL)
const seq = {
  productos: 0, stock: 0, movimientos_stock: 0, clientes: 0,
  pedidos: 0, lineas_pedido: 0, entregas_parciales: 0,
  partes_produccion: 0, partes_lineas: 0,
};
const nextId = (t) => (++seq[t]);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

// Helpers de búsqueda en memoria
const findProducto = (id) => db.productos.find(p => p.id === +id);
const findStock = (producto_id) => db.stock.find(s => s.producto_id === +producto_id);
const findCarado = (producto_id) => db.zona_carado.find(z => z.producto_id === +producto_id);

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER stockMovimiento (equivalente al de helpers.js)
//  entrada suma, salida resta, 'ajuste' = ajuste con signo (positivo suma,
//  negativo resta). Se registra SIEMPRE como 'entrada' o 'salida' en el libro
//  (movimientos_stock) para que el recálculo Σ entradas − Σ salidas cuadre.
//  SIN tope a 0: el stock puede quedar negativo.
// ─────────────────────────────────────────────────────────────────────────────
function stockMovimiento(producto_id, tipo, cantidad, motivo, referencia_doc, fecha) {
  const n = +cantidad;
  let delta, tipoNorm;
  if (tipo === 'ajuste') { delta = n; tipoNorm = n >= 0 ? 'entrada' : 'salida'; }
  else if (tipo === 'entrada') { delta = Math.abs(n); tipoNorm = 'entrada'; }
  else { delta = -Math.abs(n); tipoNorm = 'salida'; }

  db.movimientos_stock.push({
    id: nextId('movimientos_stock'),
    producto_id: +producto_id,
    tipo: tipoNorm,
    cantidad: Math.abs(delta),
    motivo: motivo || null,
    referencia_doc: referencia_doc || null,
    fecha: fecha || today(),
    created_at: now(),
  });

  let s = findStock(producto_id);
  if (!s) {
    s = { id: nextId('stock'), producto_id: +producto_id, cantidad: 0, ubicacion: null, updated_at: now() };
    db.stock.push(s);
  }
  s.cantidad = +s.cantidad + delta; // sin tope a 0
  s.updated_at = now();
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEMILLA: deja la app llena para ver todas las pestañas con datos
// ─────────────────────────────────────────────────────────────────────────────
function seed() {
  // 9 productos por defecto (idénticos a db.js)
  const productosSeed = [
    ['gavion', 'GAV-1x1x1', 1.0, 1.0, 1.0, 'Gavión 1×1×1 m', 'ud'],
    ['gavion', 'GAV-2x1x1', 2.0, 1.0, 1.0, 'Gavión 2×1×1 m', 'ud'],
    ['gavion', 'GAV-3x1x1', 3.0, 1.0, 1.0, 'Gavión 3×1×1 m', 'ud'],
    ['gavion', 'GAV-2x1x0.5', 2.0, 1.0, 0.5, 'Gavión 2×1×0.5 m', 'ud'],
    ['gavion', 'GAV-4x1x1', 4.0, 1.0, 1.0, 'Gavión 4×1×1 m', 'ud'],
    ['accesorio', 'GRAPA-STD', null, null, null, 'Grapas de cierre (bolsa 100ud)', 'bolsa'],
    ['accesorio', 'ALAMBRE-ATD', null, null, null, 'Alambre de atado (rollo 50m)', 'rollo'],
    ['colchoneta', 'COL-6x2x0.17', 6.0, 2.0, 0.17, 'Colchoneta Reno 6×2×0.17 m', 'ud'],
    ['colchoneta', 'COL-4x2x0.17', 4.0, 2.0, 0.17, 'Colchoneta Reno 4×2×0.17 m', 'ud'],
  ];
  productosSeed.forEach(([tipo, referencia, largo, ancho, alto, descripcion, unidad]) => {
    const id = nextId('productos');
    db.productos.push({
      id, tipo, referencia, largo, ancho, alto, descripcion, unidad,
      activo: true, created_at: now(),
    });
    db.stock.push({ id: nextId('stock'), producto_id: id, cantidad: 0, ubicacion: null, updated_at: now() });
  });

  // Stock inicial mediante movimientos (para que el recálculo cuadre)
  // GAV-1x1x1=40, GAV-2x1x1=25, GAV-3x1x1=10, GAV-2x1x0.5=60, GAV-4x1x1=5,
  // GRAPA=12, ALAMBRE=8, COL-6x2=18, COL-4x2=22
  const stockInicial = { 1: 40, 2: 25, 3: 10, 4: 60, 5: 5, 6: 12, 7: 8, 8: 18, 9: 22 };
  Object.entries(stockInicial).forEach(([pid, cant]) => {
    stockMovimiento(+pid, 'entrada', cant, 'Stock inicial', 'SEED', today());
  });

  // Clientes
  const c1 = { id: nextId('clientes'), nombre: 'Construcciones Ríos S.L.', contacto: 'Marta Ríos', telefono: '600111222', email: 'marta@construrios.es', direccion: 'Pol. Ind. El Soto, Nave 12, 28850 Madrid', created_at: now() };
  const c2 = { id: nextId('clientes'), nombre: 'Obras Públicas del Norte', contacto: 'Javier Pérez', telefono: '699333444', email: 'jperez@opnorte.com', direccion: 'Av. de la Ría 45, 33212 Gijón', created_at: now() };
  db.clientes.push(c1, c2);

  // ── PEDIDO 1: pendiente, con 2 líneas y entregas parciales (pendiente + confirmada)
  const p1 = {
    id: nextId('pedidos'), numero: 'PV26/00101', cliente_id: c1.id, cliente_nombre: c1.nombre,
    fecha_pedido: today(), fecha_entrega: today(), estado: 'pendiente',
    tipo_fabricacion: 'bajo_pedido', obra: 'Muro contención A-7', notas: 'Entregar por la mañana',
    maps_url: 'https://maps.google.com/?q=28850', update_log: [], created_at: now(),
  };
  db.pedidos.push(p1);
  const p1l1 = { id: nextId('lineas_pedido'), pedido_id: p1.id, producto_id: 2, cantidad: 20, precio_ud: 45.5, notas: null };
  const p1l2 = { id: nextId('lineas_pedido'), pedido_id: p1.id, producto_id: 3, cantidad: 8, precio_ud: 62.0, notas: 'Reforzados' };
  db.lineas_pedido.push(p1l1, p1l2);
  // Entrega confirmada (descuenta stock) sobre la línea 1
  db.entregas_parciales.push({
    id: nextId('entregas_parciales'), linea_pedido_id: p1l1.id, fecha_carga: today(), cantidad: 8,
    estado: 'confirmada', transportista: 'Transportes Vega', mat_camion: '1234-LMN', mat_remolque: 'R-5678-BC',
    carga_grupo_id: 'G0001AB', notas: null, created_at: now(),
  });
  stockMovimiento(2, 'salida', 8, 'Entrega confirmada ped. ' + p1.numero, 'SEED-ENT', today());
  // Entrega pendiente (programada, aún no descuenta stock)
  db.entregas_parciales.push({
    id: nextId('entregas_parciales'), linea_pedido_id: p1l2.id, fecha_carga: today(), cantidad: 4,
    estado: 'pendiente', transportista: null, mat_camion: null, mat_remolque: null,
    carga_grupo_id: null, notas: 'Programada', created_at: now(),
  });

  // ── PEDIDO 2: pendiente, 1 línea, sin entregas
  const p2 = {
    id: nextId('pedidos'), numero: 'PV26/00102', cliente_id: c2.id, cliente_nombre: c2.nombre,
    fecha_pedido: today(), fecha_entrega: null, estado: 'pendiente',
    tipo_fabricacion: 'stock', obra: 'Encauzamiento río', notas: null,
    maps_url: null, update_log: [], created_at: now(),
  };
  db.pedidos.push(p2);
  db.lineas_pedido.push({ id: nextId('lineas_pedido'), pedido_id: p2.id, producto_id: 8, cantidad: 12, precio_ud: 88.0, notas: null });

  // ── PEDIDO 3: entregado (aparece en historial), 1 línea con entrega confirmada completa
  const p3 = {
    id: nextId('pedidos'), numero: 'PV26/00100', cliente_id: c1.id, cliente_nombre: c1.nombre,
    fecha_pedido: today(), fecha_entrega: today(), estado: 'entregado',
    tipo_fabricacion: 'bajo_pedido', obra: 'Talud norte', notas: null,
    maps_url: null, update_log: [], created_at: now(),
  };
  db.pedidos.push(p3);
  const p3l1 = { id: nextId('lineas_pedido'), pedido_id: p3.id, producto_id: 1, cantidad: 10, precio_ud: 30.0, notas: null };
  db.lineas_pedido.push(p3l1);
  db.entregas_parciales.push({
    id: nextId('entregas_parciales'), linea_pedido_id: p3l1.id, fecha_carga: today(), cantidad: 10,
    estado: 'confirmada', transportista: 'Logística Norte', mat_camion: '4321-XYZ', mat_remolque: null,
    carga_grupo_id: 'G0002CD', notas: null, created_at: now(),
  });
  stockMovimiento(1, 'salida', 10, 'Entrega confirmada ped. ' + p3.numero, 'SEED-ENT', today());

  // Zona de carado (producción a la espera de pasar a stock)
  db.zona_carado.push({ producto_id: 4, cantidad: 15 });
  db.zona_carado.push({ producto_id: 9, cantidad: 6 });

  // Parte de producción del día (abierto) con líneas para productos no-accesorio
  const parte = { id: nextId('partes_produccion'), fecha: today(), estado: 'abierto', notas: null, created_at: now() };
  db.partes_produccion.push(parte);
  db.productos.filter(p => p.activo && p.tipo !== 'accesorio').forEach(p => {
    db.partes_lineas.push({ id: nextId('partes_lineas'), parte_id: parte.id, producto_id: p.id, cantidad: 0 });
  });
  // Dos líneas con producción registrada para que se vea movimiento
  const pl1 = db.partes_lineas.find(l => l.parte_id === parte.id && l.producto_id === 2);
  if (pl1) pl1.cantidad = 12;
  const pl2 = db.partes_lineas.find(l => l.parte_id === parte.id && l.producto_id === 8);
  if (pl2) pl2.cantidad = 5;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORDENACIONES (replican los ORDER BY de SQL)
// ─────────────────────────────────────────────────────────────────────────────
const num = (v) => (v == null ? -Infinity : +v); // NULL ordena al final en DESC

function ordTipoLargoAnchoAlto(a, b) { // p.tipo, p.largo DESC, p.ancho DESC, p.alto DESC
  if (a.tipo !== b.tipo) return a.tipo < b.tipo ? -1 : 1;
  if (num(a.largo) !== num(b.largo)) return num(b.largo) - num(a.largo);
  if (num(a.ancho) !== num(b.ancho)) return num(b.ancho) - num(a.ancho);
  return num(b.alto) - num(a.alto);
}
function ordTipoLargo(a, b) { // p.tipo, p.largo DESC
  if (a.tipo !== b.tipo) return a.tipo < b.tipo ? -1 : 1;
  return num(b.largo) - num(a.largo);
}

// ─────────────────────────────────────────────────────────────────────────────
//  /api/version
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({ version: '2026-06-import-mixto (MOCK)', parser: 'GVIBR + GPRE + catalogo', ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PRODUCTOS  (routes/productos.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/productos', (req, res) => {
  const rows = db.productos.filter(p => p.activo).map(p => {
    const s = findStock(p.id);
    return { ...p, stock_actual: s ? +s.cantidad : 0, stock_ubicacion: s ? s.ubicacion : null };
  }).sort(ordTipoLargoAnchoAlto);
  res.json(rows);
});
app.post('/api/productos', (req, res) => {
  const { tipo, referencia, largo, ancho, alto, descripcion, unidad } = req.body;
  const p = {
    id: nextId('productos'), tipo: tipo || 'gavion', referencia,
    largo: largo || null, ancho: ancho || null, alto: alto || null,
    descripcion, unidad: unidad || 'ud', activo: true, created_at: now(),
  };
  db.productos.push(p);
  db.stock.push({ id: nextId('stock'), producto_id: p.id, cantidad: 0, ubicacion: null, updated_at: now() });
  res.json(p);
});
app.put('/api/productos/:id', (req, res) => {
  const { tipo, referencia, largo, ancho, alto, descripcion, unidad, activo } = req.body;
  const p = findProducto(req.params.id);
  if (!p) return res.json(undefined);
  Object.assign(p, {
    tipo, referencia, largo: largo || null, ancho: ancho || null, alto: alto || null,
    descripcion, unidad, activo: activo !== false,
  });
  res.json(p);
});

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK  (routes/stock.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/stock', (req, res) => {
  const rows = db.stock
    .map(s => {
      const p = findProducto(s.producto_id);
      if (!p || !p.activo) return null;
      return {
        ...s,
        referencia: p.referencia, descripcion: p.descripcion, tipo: p.tipo,
        largo: p.largo, ancho: p.ancho, alto: p.alto, unidad: p.unidad,
      };
    })
    .filter(Boolean)
    .sort(ordTipoLargo);
  res.json(rows);
});
app.get('/api/stock/movimientos', (req, res) => {
  const rows = [...db.movimientos_stock]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))
    .slice(0, 300)
    .map(m => {
      const p = findProducto(m.producto_id);
      return { ...m, referencia: p ? p.referencia : null, descripcion: p ? p.descripcion : null };
    });
  res.json(rows);
});
app.get('/api/stock/movimientos/:producto_id', (req, res) => {
  const pid = +req.params.producto_id;
  const rows = db.movimientos_stock
    .filter(m => m.producto_id === pid)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))
    .slice(0, 500)
    .map(m => {
      const p = findProducto(m.producto_id);
      return { ...m, referencia: p ? p.referencia : null, descripcion: p ? p.descripcion : null };
    });
  res.json(rows);
});
app.post('/api/stock/movimiento', (req, res) => {
  const { producto_id, tipo, cantidad, motivo, referencia_doc, fecha } = req.body;
  try {
    stockMovimiento(producto_id, tipo, cantidad, motivo, referencia_doc, fecha);
    res.json(findStock(producto_id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recálculo: stock calculado = Σ entradas − Σ salidas (por producto)
function calcStockLibro(producto_id) {
  return db.movimientos_stock
    .filter(m => m.producto_id === +producto_id)
    .reduce((acc, m) => acc + (m.tipo === 'entrada' ? +m.cantidad : -+m.cantidad), 0);
}
function descuadres() {
  return db.productos
    .slice()
    .sort((a, b) => String(a.referencia) < String(b.referencia) ? -1 : String(a.referencia) > String(b.referencia) ? 1 : 0)
    .map(p => {
      const s = findStock(p.id);
      const stock_actual = s ? +s.cantidad : 0;
      const stock_calculado = calcStockLibro(p.id);
      return {
        producto_id: p.id, referencia: p.referencia, descripcion: p.descripcion,
        stock_actual, stock_calculado, diferencia: stock_calculado - stock_actual,
      };
    })
    .filter(r => r.diferencia !== 0);
}
app.get('/api/stock/recalcular-preview', (req, res) => {
  const items = descuadres();
  res.json({ total_productos: db.productos.length, descuadres: items.length, items });
});
app.post('/api/stock/recalcular', (req, res) => {
  // Asegurar fila de stock para todo producto
  db.productos.forEach(p => {
    if (!findStock(p.id)) db.stock.push({ id: nextId('stock'), producto_id: p.id, cantidad: 0, ubicacion: null, updated_at: now() });
  });
  const antes = descuadres();
  db.stock.forEach(s => { s.cantidad = calcStockLibro(s.producto_id); s.updated_at = now(); });
  res.json({ ok: true, corregidos: antes.length, items: antes });
});

// ─────────────────────────────────────────────────────────────────────────────
//  ZONA DE CARADO  (routes/carado.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/carado', (req, res) => {
  const rows = db.zona_carado
    .filter(z => +z.cantidad > 0)
    .map(z => {
      const p = findProducto(z.producto_id);
      if (!p) return null;
      return {
        producto_id: z.producto_id, cantidad: z.cantidad,
        referencia: p.referencia, descripcion: p.descripcion,
        largo: p.largo, ancho: p.ancho, alto: p.alto, unidad: p.unidad, tipo: p.tipo,
      };
    })
    .filter(Boolean)
    .sort((a, b) => { // p.alto DESC, p.largo DESC, p.referencia
      if (num(a.alto) !== num(b.alto)) return num(b.alto) - num(a.alto);
      if (num(a.largo) !== num(b.largo)) return num(b.largo) - num(a.largo);
      return String(a.referencia) < String(b.referencia) ? -1 : String(a.referencia) > String(b.referencia) ? 1 : 0;
    });
  res.json(rows);
});
app.post('/api/carado/add', (req, res) => {
  const { producto_id, cantidad } = req.body;
  if (!producto_id || !(+cantidad > 0)) return res.status(400).json({ error: 'producto_id y cantidad requeridos' });
  let z = findCarado(producto_id);
  if (!z) { z = { producto_id: +producto_id, cantidad: 0 }; db.zona_carado.push(z); }
  z.cantidad = +z.cantidad + +cantidad;
  res.json({ ok: true });
});
app.post('/api/carado/to-stock', (req, res) => {
  const { producto_id, cantidad } = req.body;
  if (!producto_id || !(+cantidad > 0)) return res.status(400).json({ error: 'producto_id y cantidad requeridos' });
  try {
    const z = findCarado(producto_id);
    const disp = z ? +z.cantidad : 0;
    if (+cantidad > disp) throw new Error('No hay tantos en zona de carado (disponible: ' + disp + ')');
    z.cantidad = +z.cantidad - +cantidad;
    stockMovimiento(producto_id, 'entrada', +cantidad, 'Carado → stock', null, today());
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/carado/remove', (req, res) => {
  const { producto_id, cantidad } = req.body;
  if (!producto_id || !(+cantidad > 0)) return res.status(400).json({ error: 'producto_id y cantidad requeridos' });
  const z = findCarado(producto_id);
  if (z) z.cantidad = Math.max(0, +z.cantidad - +cantidad);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENTES  (routes/clientes.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/clientes', (req, res) => {
  res.json([...db.clientes].sort((a, b) => String(a.nombre) < String(b.nombre) ? -1 : String(a.nombre) > String(b.nombre) ? 1 : 0));
});
app.post('/api/clientes', (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  const c = { id: nextId('clientes'), nombre, contacto, telefono, email, direccion, created_at: now() };
  db.clientes.push(c);
  res.json(c);
});
app.put('/api/clientes/:id', (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body;
  const c = db.clientes.find(x => x.id === +req.params.id);
  if (!c) return res.json(undefined);
  Object.assign(c, { nombre, contacto, telefono, email, direccion });
  res.json(c);
});
app.delete('/api/clientes/:id', (req, res) => {
  const i = db.clientes.findIndex(x => x.id === +req.params.id);
  if (i >= 0) db.clientes.splice(i, 1);
  // Igual que ON DELETE SET NULL: desvincular pedidos
  db.pedidos.forEach(p => { if (p.cliente_id === +req.params.id) p.cliente_id = null; });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PEDIDOS  (routes/pedidos.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/pedidos-gav', (req, res) => {
  const pedidos = [...db.pedidos]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))
    .map(p => {
      const cli = p.cliente_id != null ? db.clientes.find(c => c.id === p.cliente_id) : null;
      return { ...p, cliente_nombre_rel: cli ? cli.nombre : null };
    });
  const lineas = db.lineas_pedido
    .map(l => {
      const pr = findProducto(l.producto_id);
      if (!pr) return null;
      return {
        ...l, referencia: pr.referencia, descripcion: pr.descripcion, tipo: pr.tipo,
        largo: pr.largo, ancho: pr.ancho, alto: pr.alto, unidad: pr.unidad,
      };
    })
    .filter(Boolean);
  const entregas = [...db.entregas_parciales].sort((a, b) => String(a.fecha_carga) < String(b.fecha_carga) ? -1 : String(a.fecha_carga) > String(b.fecha_carga) ? 1 : 0);
  pedidos.forEach(p => {
    p.lineas = lineas.filter(l => l.pedido_id === p.id).map(l => ({
      ...l,
      entregas: entregas.filter(e => e.linea_pedido_id === l.id),
    }));
  });
  res.json(pedidos);
});
app.post('/api/pedidos-gav', (req, res) => {
  const { numero, cliente_id, cliente_nombre, fecha_pedido, fecha_entrega, estado, tipo_fabricacion, obra, notas, lineas, maps_url } = req.body;
  if (numero && db.pedidos.some(p => p.numero === numero)) {
    return res.status(400).json({ error: 'Ya existe un pedido con el número ' + numero });
  }
  const pedido = {
    id: nextId('pedidos'), numero, cliente_id: cliente_id || null, cliente_nombre,
    fecha_pedido: fecha_pedido || null, fecha_entrega: fecha_entrega || null,
    estado: estado || 'pendiente', tipo_fabricacion: tipo_fabricacion || 'bajo_pedido',
    obra, notas, maps_url: maps_url || null, update_log: [], created_at: now(),
  };
  db.pedidos.push(pedido);
  if (lineas && lineas.length) {
    for (const l of lineas) {
      db.lineas_pedido.push({
        id: nextId('lineas_pedido'), pedido_id: pedido.id, producto_id: l.producto_id,
        cantidad: l.cantidad, precio_ud: l.precio_ud || null, notas: l.notas || null,
      });
    }
  }
  res.json(pedido);
});
app.put('/api/pedidos-gav/:id', (req, res) => {
  const { numero, cliente_id, cliente_nombre, fecha_pedido, fecha_entrega, estado, tipo_fabricacion, obra, notas, lineas, maps_url, update_log } = req.body;
  const pedido = db.pedidos.find(p => p.id === +req.params.id);
  if (!pedido) return res.json(undefined);
  Object.assign(pedido, {
    numero, cliente_id: cliente_id || null, cliente_nombre,
    fecha_pedido: fecha_pedido || null, fecha_entrega: fecha_entrega || null,
    estado, tipo_fabricacion, obra, notas: notas || null, maps_url: maps_url || null,
    update_log: update_log != null ? update_log : pedido.update_log,
  });
  if (lineas) {
    // Conservar entregas: solo borrar líneas SIN entregas
    const existing = db.lineas_pedido.filter(l => l.pedido_id === pedido.id);
    for (const el of existing) {
      const hasEntregas = db.entregas_parciales.some(e => e.linea_pedido_id === el.id);
      if (!hasEntregas) {
        const idx = db.lineas_pedido.findIndex(l => l.id === el.id);
        if (idx >= 0) db.lineas_pedido.splice(idx, 1);
      }
    }
    for (const l of lineas) {
      if (l.id) {
        const ex = db.lineas_pedido.find(x => x.id === +l.id);
        if (ex) Object.assign(ex, { producto_id: l.producto_id, cantidad: l.cantidad, precio_ud: l.precio_ud || null, notas: l.notas || null });
      } else {
        db.lineas_pedido.push({
          id: nextId('lineas_pedido'), pedido_id: pedido.id, producto_id: l.producto_id,
          cantidad: l.cantidad, precio_ud: l.precio_ud || null, notas: l.notas || null,
        });
      }
    }
  }
  res.json(pedido);
});
app.delete('/api/pedidos-gav/:id', (req, res) => {
  const pid = +req.params.id;
  const lineaIds = db.lineas_pedido.filter(l => l.pedido_id === pid).map(l => l.id);
  db.entregas_parciales = db.entregas_parciales.filter(e => !lineaIds.includes(e.linea_pedido_id));
  db.lineas_pedido = db.lineas_pedido.filter(l => l.pedido_id !== pid);
  db.pedidos = db.pedidos.filter(p => p.id !== pid);
  res.json({ ok: true });
});
app.patch('/api/pedidos-gav/:id/estado', (req, res) => {
  const pedido = db.pedidos.find(p => p.id === +req.params.id);
  if (!pedido) return res.json(undefined);
  pedido.estado = req.body.estado;
  res.json(pedido);
});
app.patch('/api/lineas/:id/nota', (req, res) => {
  const l = db.lineas_pedido.find(x => x.id === +req.params.id);
  if (!l) return res.json(undefined);
  l.notas = req.body.notas || null;
  res.json(l);
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENTREGAS PARCIALES  (routes/entregas.js)
// ─────────────────────────────────────────────────────────────────────────────
function entregaJoin(e) {
  const l = db.lineas_pedido.find(x => x.id === e.linea_pedido_id);
  if (!l) return null;
  const pr = findProducto(l.producto_id);
  const pe = db.pedidos.find(p => p.id === l.pedido_id);
  if (!pr || !pe) return null;
  return { e, l, pr, pe };
}
app.get('/api/entregas', (req, res) => {
  const rows = db.entregas_parciales
    .map(e => {
      const j = entregaJoin(e);
      if (!j) return null;
      const { l, pr, pe } = j;
      if (pe.estado === 'cancelado') return null;
      return {
        ...e,
        linea_cantidad: l.cantidad, pedido_id: l.pedido_id, linea_notas: l.notas,
        referencia: pr.referencia, descripcion: pr.descripcion,
        largo: pr.largo, ancho: pr.ancho, alto: pr.alto, unidad: pr.unidad,
        pedido_numero: pe.numero, cliente_nombre: pe.cliente_nombre, obra: pe.obra, maps_url: pe.maps_url,
      };
    })
    .filter(Boolean)
    .sort((a, b) => { // e.fecha_carga, pe.numero
      if (String(a.fecha_carga) !== String(b.fecha_carga)) return String(a.fecha_carga) < String(b.fecha_carga) ? -1 : 1;
      return String(a.pedido_numero) < String(b.pedido_numero) ? -1 : String(a.pedido_numero) > String(b.pedido_numero) ? 1 : 0;
    });
  res.json(rows);
});
app.post('/api/entregas', (req, res) => {
  const { linea_pedido_id, fecha_carga, cantidad, notas, transportista, mat_camion, mat_remolque, carga_grupo_id } = req.body;
  const linea = db.lineas_pedido.find(l => l.id === +linea_pedido_id);
  if (!linea) return res.status(400).json({ error: 'Línea de pedido no encontrada' });
  const ya = db.entregas_parciales
    .filter(x => x.linea_pedido_id === +linea_pedido_id && (x.estado === 'pendiente' || x.estado === 'confirmada'))
    .reduce((s, x) => s + (+x.cantidad || 0), 0);
  const queda = (+linea.cantidad) - ya;
  if (+cantidad > queda) {
    return res.status(400).json({ error: queda <= 0
      ? 'Esta línea ya está toda programada/entregada (no quedan unidades sin programar)'
      : 'Solo quedan ' + queda + ' ud sin programar en esta línea (pedido ' + (+linea.cantidad) + ', ya programado/entregado ' + ya + ')' });
  }
  const e = {
    id: nextId('entregas_parciales'), linea_pedido_id: +linea_pedido_id, fecha_carga, cantidad,
    estado: 'pendiente', transportista: transportista || null, mat_camion: mat_camion || null,
    mat_remolque: mat_remolque || null, carga_grupo_id: carga_grupo_id || null, notas: notas || null,
    created_at: now(),
  };
  db.entregas_parciales.push(e);
  res.json(e);
});
app.put('/api/entregas/:id', (req, res) => {
  const { fecha_carga, cantidad, notas, estado, transportista, mat_camion, mat_remolque, carga_grupo_id } = req.body;
  const e = db.entregas_parciales.find(x => x.id === +req.params.id);
  if (!e) return res.json(undefined);
  Object.assign(e, {
    fecha_carga, cantidad, notas: notas || null, estado: estado || 'pendiente',
    transportista: transportista || null, mat_camion: mat_camion || null,
    mat_remolque: mat_remolque || null, carga_grupo_id: carga_grupo_id || null,
  });
  res.json(e);
});
app.patch('/api/entregas/:id/confirmar', (req, res) => {
  try {
    const e = db.entregas_parciales.find(x => x.id === +req.params.id);
    if (!e) throw new Error('Entrega no encontrada');
    if (e.estado === 'confirmada') throw new Error('Ya confirmada');
    const j = entregaJoin(e);
    if (!j) throw new Error('Entrega no encontrada');
    const { l, pe } = j;
    e.estado = 'confirmada';
    stockMovimiento(l.producto_id, 'salida', e.cantidad, 'Entrega confirmada ped. ' + pe.numero, 'ENT-' + e.id, e.fecha_carga);

    // ¿Pedido completo? Comprobación POR LÍNEA: ninguna línea con confirmado < pedido.
    const pedidoId = pe.id;
    const lineasPed = db.lineas_pedido.filter(x => x.pedido_id === pedidoId);
    const total_lineas = lineasPed.length;
    const lineas_incompletas = lineasPed.filter(ln => {
      const entregado = db.entregas_parciales
        .filter(ep => ep.linea_pedido_id === ln.id && ep.estado === 'confirmada')
        .reduce((acc, ep) => acc + +ep.cantidad, 0);
      return +ln.cantidad > entregado;
    }).length;

    let pedidoAutoEntregado = false;
    if (total_lineas > 0 && lineas_incompletas === 0) {
      if (pe.estado !== 'cancelado' && pe.estado !== 'entregado') pe.estado = 'entregado';
      pedidoAutoEntregado = true;
    }
    res.json({ ok: true, pedidoAutoEntregado, pedidoId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/entregas/:id/anular', (req, res) => {
  try {
    const e = db.entregas_parciales.find(x => x.id === +req.params.id);
    if (!e) throw new Error('Entrega no encontrada');
    if (e.estado !== 'confirmada') throw new Error('Solo se pueden anular entregas confirmadas');
    const j = entregaJoin(e);
    const { l, pe } = j;
    e.estado = 'pendiente';
    stockMovimiento(l.producto_id, 'entrada', e.cantidad, 'Anulacion entrega ped. ' + pe.numero, 'ANUL-' + e.id, today());
    if (pe.estado === 'entregado') pe.estado = 'pendiente';
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/entregas/:id/fecha', (req, res) => {
  const e = db.entregas_parciales.find(x => x.id === +req.params.id);
  if (!e) return res.json(undefined);
  e.fecha_carga = req.body.fecha_carga;
  res.json(e);
});
app.delete('/api/entregas/:id', (req, res) => {
  try {
    const e = db.entregas_parciales.find(x => x.id === +req.params.id);
    if (!e) throw new Error('Entrega no encontrada');
    const confirmada = e.estado === 'confirmada';
    if (confirmada) {
      const j = entregaJoin(e);
      if (j) {
        stockMovimiento(j.l.producto_id, 'entrada', e.cantidad, 'Anulación entrega confirmada', 'ANUL-' + e.id, today());
        if (j.pe.estado === 'entregado') j.pe.estado = 'pendiente';
      }
    }
    db.entregas_parciales = db.entregas_parciales.filter(x => x.id !== e.id);
    res.json({ ok: true, stockRevertido: confirmada });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PARTES DE PRODUCCIÓN  (routes/partes.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/partes', (req, res) => {
  const partes = [...db.partes_produccion]
    .sort((a, b) => String(a.fecha) < String(b.fecha) ? 1 : String(a.fecha) > String(b.fecha) ? -1 : b.id - a.id)
    .slice(0, 60)
    .map(p => ({ ...p }));
  const lineas = db.partes_lineas
    .map(l => {
      const p = findProducto(l.producto_id);
      if (!p) return null;
      return { ...l, referencia: p.referencia, descripcion: p.descripcion, largo: p.largo, ancho: p.ancho, alto: p.alto, unidad: p.unidad };
    })
    .filter(Boolean);
  partes.forEach(p => { p.lineas = lineas.filter(l => l.parte_id === p.id); });
  res.json(partes);
});
app.get('/api/partes/hoy', (req, res) => {
  const fecha = today();
  let parte = db.partes_produccion.find(p => p.fecha === fecha && p.estado === 'abierto');
  if (!parte) {
    parte = { id: nextId('partes_produccion'), fecha, estado: 'abierto', notas: null, created_at: now() };
    db.partes_produccion.push(parte);
    db.productos.filter(p => p.activo && p.tipo !== 'accesorio').forEach(p => {
      db.partes_lineas.push({ id: nextId('partes_lineas'), parte_id: parte.id, producto_id: p.id, cantidad: 0 });
    });
  }
  const lineas = db.partes_lineas
    .filter(l => l.parte_id === parte.id)
    .map(l => {
      const p = findProducto(l.producto_id);
      if (!p) return null;
      return { ...l, referencia: p.referencia, descripcion: p.descripcion, largo: p.largo, ancho: p.ancho, alto: p.alto, unidad: p.unidad, tipo: p.tipo };
    })
    .filter(Boolean)
    .sort(ordTipoLargo);
  res.json({ ...parte, lineas });
});
app.patch('/api/partes/:id/linea', (req, res) => {
  const { producto_id, cantidad } = req.body;
  const l = db.partes_lineas.find(x => x.parte_id === +req.params.id && x.producto_id === +producto_id);
  if (!l) return res.json(undefined);
  l.cantidad = cantidad;
  res.json(l);
});
app.post('/api/partes/:id/add-producto', (req, res) => {
  const { producto_id } = req.body;
  const exists = db.partes_lineas.find(x => x.parte_id === +req.params.id && x.producto_id === +producto_id);
  if (exists) return res.json({ ok: true, already: true });
  db.partes_lineas.push({ id: nextId('partes_lineas'), parte_id: +req.params.id, producto_id: +producto_id, cantidad: 0 });
  res.json({ ok: true, already: false });
});
app.delete('/api/partes/:id/linea/:producto_id', (req, res) => {
  db.partes_lineas = db.partes_lineas.filter(l => !(l.parte_id === +req.params.id && l.producto_id === +req.params.producto_id));
  res.json({ ok: true });
});
app.post('/api/partes/:id/cerrar', (req, res) => {
  try {
    const parte = db.partes_produccion.find(p => p.id === +req.params.id);
    if (!parte) throw new Error('Parte no encontrado');
    if (parte.estado === 'cerrado') throw new Error('Ya cerrado');
    db.partes_lineas.filter(l => l.parte_id === parte.id).forEach(l => {
      if (+l.cantidad > 0) stockMovimiento(l.producto_id, 'entrada', l.cantidad, 'Parte producción ' + parte.fecha, 'PARTE-' + parte.id, parte.fecha);
    });
    parte.estado = 'cerrado';
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/partes/:id/reabrir', (req, res) => {
  try {
    const parte = db.partes_produccion.find(p => p.id === +req.params.id);
    if (!parte) throw new Error('Parte no encontrado');
    if (parte.estado !== 'cerrado') throw new Error('El parte no esta cerrado');
    db.partes_lineas.filter(l => l.parte_id === parte.id).forEach(l => {
      if (+l.cantidad > 0) stockMovimiento(l.producto_id, 'salida', l.cantidad, 'Reapertura parte ' + parte.fecha, 'REAB-' + parte.id, today());
    });
    parte.estado = 'abierto';
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  NECESIDADES  (routes/necesidades.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/necesidades', (req, res) => {
  const activos = (estado) => estado !== 'entregado' && estado !== 'cancelado';
  const rows = db.productos
    .filter(pr => pr.activo)
    .map(pr => {
      const s = findStock(pr.id);
      const stock_actual = s ? +s.cantidad : 0;

      const pedido_total = db.lineas_pedido
        .filter(l => l.producto_id === pr.id)
        .filter(l => { const pe = db.pedidos.find(p => p.id === l.pedido_id); return pe && activos(pe.estado); })
        .reduce((acc, l) => acc + +l.cantidad, 0);

      const sumEntregas = (estadoEntrega) => db.entregas_parciales
        .filter(e => e.estado === estadoEntrega)
        .filter(e => {
          const l = db.lineas_pedido.find(x => x.id === e.linea_pedido_id);
          if (!l || l.producto_id !== pr.id) return false;
          const pe = db.pedidos.find(p => p.id === l.pedido_id);
          return pe && activos(pe.estado);
        })
        .reduce((acc, e) => acc + +e.cantidad, 0);

      const entregado_total = sumEntregas('confirmada');
      const programado_pendiente = sumEntregas('pendiente');

      return {
        producto_id: pr.id, referencia: pr.referencia, descripcion: pr.descripcion, tipo: pr.tipo,
        largo: pr.largo, ancho: pr.ancho, alto: pr.alto, unidad: pr.unidad,
        stock_actual, pedido_total, entregado_total, programado_pendiente,
        pendiente_entregar: Math.max(0, pedido_total - entregado_total),
        necesidad_neta: Math.max(0, pedido_total - entregado_total - stock_actual),
      };
    })
    .sort(ordTipoLargo);
  res.json(rows);
});

// ─────────────────────────────────────────────────────────────────────────────
//  HISTORIAL  (routes/historial.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/historial', (req, res) => {
  const pedidosHist = db.pedidos
    .filter(p => p.estado === 'entregado' || p.estado === 'cancelado')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))
    .slice(0, 100)
    .map(p => {
      const cli = p.cliente_id != null ? db.clientes.find(c => c.id === p.cliente_id) : null;
      return { ...p, cliente_nombre_rel: cli ? cli.nombre : null };
    });
  const lineas = db.lineas_pedido
    .map(l => {
      const pr = findProducto(l.producto_id);
      if (!pr) return null;
      return { ...l, referencia: pr.referencia, descripcion: pr.descripcion, tipo: pr.tipo, largo: pr.largo, ancho: pr.ancho, alto: pr.alto, unidad: pr.unidad };
    })
    .filter(Boolean);
  const entregas = db.entregas_parciales
    .filter(e => e.estado === 'confirmada')
    .map(e => {
      const j = entregaJoin(e);
      if (!j) return null;
      const { l, pr, pe } = j;
      return {
        ...e, linea_cantidad: l.cantidad, pedido_id: l.pedido_id,
        referencia: pr.referencia, descripcion: pr.descripcion, largo: pr.largo, ancho: pr.ancho, alto: pr.alto, unidad: pr.unidad,
        pedido_numero: pe.numero, cliente_nombre: pe.cliente_nombre, obra: pe.obra,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.fecha_carga) < String(b.fecha_carga) ? 1 : String(a.fecha_carga) > String(b.fecha_carga) ? -1 : 0)
    .slice(0, 200);
  pedidosHist.forEach(p => { p.lineas = lineas.filter(l => l.pedido_id === p.id); });
  res.json({ pedidos: pedidosHist, entregas });
});

// ─────────────────────────────────────────────────────────────────────────────
//  IMPORT  (routes/import.js) — versiones mock que no parsean de verdad
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/importar-pdf', (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'No se recibio el PDF' });
  // Devuelve un objeto de ejemplo con la misma forma que el parser real.
  res.json({
    numero: 'PV26/09999',
    cliente_nombre: 'Cliente Demo (mock)',
    obra: 'Obra de ejemplo',
    destino: 'Almacén Central, Madrid',
    fecha_pedido: today(),
    lineas: [
      { referencia: 'GAV-2x1x1', descripcion: 'Gavión 2×1×1 m', cantidad: 10 },
      { referencia: 'GAV-3x1x1', descripcion: 'Gavión 3×1×1 m', cantidad: 5 },
    ],
  });
});
app.post('/api/importar-productos', (req, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'No se recibio el archivo' });
  // Misma forma que la respuesta real, sin importar nada de verdad.
  res.json({ total: 0, importados: 0, duplicados: 0, refs_duplicadas: [] });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SPA + 404 de API  (idéntico a server.js)
// ─────────────────────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint no encontrado: ' + req.path });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
seed();
app.listen(PORT, () => console.log(`[MOCK] Server on port ${PORT} (datos en memoria, sin BD)`));
