const { Pool } = require('pg');

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
      largo NUMERIC, ancho NUMERIC, alto NUMERIC,
      descripcion TEXT, unidad TEXT DEFAULT 'ud',
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
      referencia_doc TEXT,
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL, contacto TEXT, telefono TEXT,
      email TEXT, direccion TEXT,
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
      obra TEXT, notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS lineas_pedido (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      cantidad NUMERIC NOT NULL,
      precio_ud NUMERIC, notas TEXT
    );
    CREATE TABLE IF NOT EXISTS entregas_parciales (
      id SERIAL PRIMARY KEY,
      linea_pedido_id INTEGER REFERENCES lineas_pedido(id) ON DELETE CASCADE,
      fecha_carga DATE NOT NULL,
      cantidad NUMERIC NOT NULL,
      estado TEXT DEFAULT 'pendiente',
      transportista TEXT,
      mat_camion TEXT,
      mat_remolque TEXT,
      carga_grupo_id TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE entregas_parciales ADD COLUMN IF NOT EXISTS transportista TEXT;
    ALTER TABLE entregas_parciales ADD COLUMN IF NOT EXISTS carga_grupo_id TEXT;
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS maps_url TEXT;
    ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS update_log JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE entregas_parciales ADD COLUMN IF NOT EXISTS mat_camion TEXT;
    ALTER TABLE entregas_parciales ADD COLUMN IF NOT EXISTS mat_remolque TEXT;
    CREATE TABLE IF NOT EXISTS zona_carado (
      producto_id INTEGER PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
      cantidad NUMERIC DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS zona_montaje (
      producto_id INTEGER PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
      cantidad NUMERIC DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS partes_produccion (
      id SERIAL PRIMARY KEY,
      fecha DATE NOT NULL,
      estado TEXT DEFAULT 'abierto',
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Log de producción por sección (montaje / vibrado / carado) para el informe diario
    CREATE TABLE IF NOT EXISTS movimientos_produccion (
      id SERIAL PRIMARY KEY,
      seccion TEXT NOT NULL,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      cantidad NUMERIC NOT NULL,
      fecha DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS partes_lineas (
      id SERIAL PRIMARY KEY,
      parte_id INTEGER REFERENCES partes_produccion(id) ON DELETE CASCADE,
      producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      cantidad NUMERIC DEFAULT 0
    );
    -- Historial de muros del calculador: se guarda el ESTADO completo (datos JSONB)
    -- para poder rescatar el muro tal cual se dejó (incluidos ajustes a mano).
    CREATE TABLE IF NOT EXISTS muros_guardados (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      obra TEXT, cliente TEXT,
      modo TEXT,
      resumen JSONB DEFAULT '{}'::jsonb,
      datos JSONB NOT NULL,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE muros_guardados ADD COLUMN IF NOT EXISTS notas TEXT;
    ALTER TABLE movimientos_stock ADD COLUMN IF NOT EXISTS referencia_doc TEXT;
    ALTER TABLE movimientos_stock ADD COLUMN IF NOT EXISTS fecha DATE DEFAULT CURRENT_DATE;

    -- Reparación: cargas antiguas guardaron el id de grupo en 'notas' por un desajuste de parámetros.
    -- Recuperamos el grupo donde notas tiene pinta de id de carga (G + base36) y el grupo está vacío.
    UPDATE entregas_parciales
       SET carga_grupo_id = notas, notas = NULL
     WHERE carga_grupo_id IS NULL AND notas ~ '^G[0-9A-Z]{6,}$';

    -- Índices en claves foráneas y columnas de filtrado frecuente (rendimiento)
    CREATE INDEX IF NOT EXISTS idx_stock_producto       ON stock(producto_id);
    CREATE INDEX IF NOT EXISTS idx_mov_producto          ON movimientos_stock(producto_id);
    CREATE INDEX IF NOT EXISTS idx_mov_fecha             ON movimientos_stock(fecha);
    CREATE INDEX IF NOT EXISTS idx_lineas_pedido         ON lineas_pedido(pedido_id);
    CREATE INDEX IF NOT EXISTS idx_lineas_producto       ON lineas_pedido(producto_id);
    CREATE INDEX IF NOT EXISTS idx_entregas_linea        ON entregas_parciales(linea_pedido_id);
    CREATE INDEX IF NOT EXISTS idx_entregas_grupo        ON entregas_parciales(carga_grupo_id);
    CREATE INDEX IF NOT EXISTS idx_entregas_fecha        ON entregas_parciales(fecha_carga);
    CREATE INDEX IF NOT EXISTS idx_pedidos_cliente       ON pedidos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_pedidos_estado        ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_partes_lineas_parte   ON partes_lineas(parte_id);
    CREATE INDEX IF NOT EXISTS idx_mprod_fecha           ON movimientos_produccion(fecha);

    INSERT INTO productos (tipo,referencia,largo,ancho,alto,descripcion,unidad)
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

    INSERT INTO stock (producto_id, cantidad)
    SELECT id, 0 FROM productos
    WHERE id NOT IN (SELECT producto_id FROM stock WHERE producto_id IS NOT NULL);
  `);
  console.log('DB ready');
}

module.exports = { pool, initDB };
