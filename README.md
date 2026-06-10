# Gaviones App

Aplicación de gestión de producción, stock, pedidos y cargas de gaviones, colchonetas y accesorios.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Frontend:** SPA en JavaScript vanilla (sin paso de build), servida estáticamente desde `public/`
- **Despliegue:** Railway

## Puesta en marcha

### Producción (con base de datos)

```bash
npm install
npm start            # arranca en el puerto $PORT (por defecto 3000)
```

Requiere la variable de entorno `DATABASE_URL` con la cadena de conexión de PostgreSQL.
Si la URL contiene `railway` se activa SSL automáticamente. Al arrancar, `initDB()`
crea las tablas, índices y datos semilla si no existen.

### Desarrollo local (SIN base de datos)

```bash
npm install
npm run dev          # mock-server con datos en memoria, puerto 3000
```

`mock-server.js` imita TODA la API con datos de ejemplo en memoria, así puedes
desarrollar y probar el frontend sin PostgreSQL. **Solo para desarrollo** — en
producción se usa `server.js`.

## Estructura

```
server.js          Configuración de Express, montaje de routers, 404 de API, SPA
db.js              Pool de conexión + initDB (tablas, índices, seed)
helpers.js         stockMovimiento (registro de movimiento + ajuste de stock)
routes/
  productos.js     Catálogo de productos
  stock.js         Stock y movimientos
  carado.js        Zona de carado (buffer entre vibrado y stock)
  clientes.js      Clientes
  pedidos.js       Pedidos y líneas de pedido
  entregas.js      Entregas parciales / cargas (confirmar, anular, fechas)
  partes.js        Partes de producción (parte diario)
  necesidades.js   Cálculo de necesidades de fabricación
  historial.js     Historial de pedidos y entregas
  import.js        Importación de pedidos (PDF) y productos (Excel) de Business Central
mock-server.js     Servidor de desarrollo con datos en memoria (no usa BD)
public/
  index.html       Solo markup (carga css/ y js/)
  css/
    styles.css     Estilos
  js/              Lógica por dominio (se cargan en orden; funciones globales)
    core.js        Estado global, api(), loadAll, switchTab, helpers
    dashboard.js   Panel e indicadores
    parte.js       Parte diario de producción
    calendario.js  Calendario de cargas
    entregas.js    Entregas/cargas, QR e impresión
    pedidos.js     Pedidos, necesidades, stock, catálogo, clientes, modales
    acciones.js    Guardados, borrados, anular/reabrir, actualizar desde PDF
    historial.js   Historial e importación
    produccion.js  Mesa de vibrado, zona de carado, carga y montado (+ init)
```

> Nota: los `js/*.js` se cargan como scripts clásicos en orden y comparten ámbito
> global (las funciones se llaman desde los `onclick` del HTML). `core.js` debe ir
> primero y `produccion.js` el último (contiene el arranque `loadAll()`).

## API

Todos los endpoints cuelgan de `/api`. Ejemplo de comprobación:

```
GET /api/version   →  { "version": "...", "ok": true }
```
