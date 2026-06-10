# Gaviones App

Aplicación de gestión de producción, stock, pedidos y cargas de gaviones, colchonetas y accesorios.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Frontend:** SPA en JavaScript vanilla (sin paso de build), servida estáticamente desde `public/`
- **Despliegue:** Railway

## Puesta en marcha

```bash
npm install
npm start            # arranca en el puerto $PORT (por defecto 3000)
```

Requiere la variable de entorno `DATABASE_URL` con la cadena de conexión de PostgreSQL.
Si la URL contiene `railway` se activa SSL automáticamente. Al arrancar, `initDB()`
crea las tablas, índices y datos semilla si no existen.

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
public/
  index.html       Frontend completo (markup + CSS + JS)
```

## API

Todos los endpoints cuelgan de `/api`. Ejemplo de comprobación:

```
GET /api/version   →  { "version": "...", "ok": true }
```
