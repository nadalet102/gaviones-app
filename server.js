const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:true,limit:'20mb'}));
app.use(express.static(path.join(__dirname, 'public')));

// ── VERSIÓN (para confirmar qué backend está desplegado) ───────────────────────
app.get('/api/version', (req, res) => {
  res.json({ version: '2026-06-import-mixto', parser: 'GVIBR + GPRE + catalogo', ok: true });
});

// ── RUTAS (cada dominio en su propio módulo: routes/*.js) ──────────────────────
app.use(require('./routes/productos'));
app.use(require('./routes/stock'));
app.use(require('./routes/carado'));
app.use(require('./routes/clientes'));
app.use(require('./routes/pedidos'));
app.use(require('./routes/entregas'));
app.use(require('./routes/partes'));
app.use(require('./routes/necesidades'));
app.use(require('./routes/historial'));
app.use(require('./routes/import'));

// ── SPA + 404 de API ───────────────────────────────────────────────────────────
app.get('*', (req,res)=>{
  // Las rutas /api/* que no existan deben devolver un 404 JSON, no el index.html
  // (de lo contrario el cliente recibe HTML donde espera JSON y falla de forma confusa).
  if(req.path.startsWith('/api/')) return res.status(404).json({error:'Endpoint no encontrado: '+req.path});
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const PORT = process.env.PORT||3000;
initDB().then(()=>app.listen(PORT,()=>console.log(`Server on port ${PORT}`)));
