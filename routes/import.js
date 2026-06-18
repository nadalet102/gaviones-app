const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const XLSX = require('xlsx');
let PDFParser = null;
try { PDFParser = require('pdf2json'); } catch(e) { console.warn('pdf2json not available:', e.message); }

// ── IMPORTAR PDF BC ───────────────────────────────────────────────────────────
router.post('/api/importar-pdf', async (req, res) => {
  const { base64 } = req.body;
  if(!base64) return res.status(400).json({error:'No se recibio el PDF'});

  if(!PDFParser) return res.status(500).json({error:'pdf2json no disponible en este servidor'});
  const buf = Buffer.from(base64, 'base64');

  try {
    const text = await new Promise((resolve, reject) => {
      const parser = new PDFParser(null, 1);
      parser.on('pdfParser_dataError', e => reject(new Error(e.parserError)));
      parser.on('pdfParser_dataReady', data => {
        const t = data.Pages.map(page =>
          page.Texts.map(t => {
            try { return decodeURIComponent(t.R.map(r => r.T).join('')); }
            catch(e) { return t.R.map(r => r.T).join(''); }
          }).join(' ')
        ).join('\n');
        resolve(t);
      });
      parser.parseBuffer(buf);
    });

    // Extract fields with regex
    const numMatch = text.match(/N[oº°]\s*Pedido[^\n]*?\n[^\n]*(PV\d{2}\/\d{5})/i)
                  || text.match(/(PV\d{2}\/\d{5})/);
    const numero = numMatch ? numMatch[1] : null;

    const fechaMatch = text.match(/(\d{2}\/\d{2}\/\d{2,4})/);
    let fecha_pedido = null;
    if(fechaMatch) {
      const parts = fechaMatch[1].split('/');
      if(parts[2].length===2) parts[2]='20'+parts[2];
      fecha_pedido = parts[2]+'-'+parts[1].padStart(2,'0')+'-'+parts[0].padStart(2,'0');
    }

    // Cliente: just the company name (up to street address or CIF)
    const clienteMatch = text.match(/Cliente:\s*((?:(?!CIF:|Direcci|Calle|Avda|Plaza|Pza|\d{5}).)+ )/i);
    const cliente_nombre = clienteMatch
      ? clienteMatch[1].trim().replace(/\s+/g,' ').split(/\s{2,}/)[0].trim()
      : null;

    // Obra: "Nº documento externo" value — take first word/phrase before next keyword
    const obraMatch = text.match(/externo\s+([A-Z][^\n]{2,40}?)(?:\s{2,}|Direcci|Cliente)/i);
    const obra = obraMatch ? obraMatch[1].trim() : null;

    // Destino: company name + location from "Dirección de descarga:"
    const destiMatch = text.match(/Direcci[oó]n de descarga:\s*([^\n]+)/i);
    let destino = null;
    if(destiMatch) {
      // Take first meaningful segment (company name + city)
      const raw = destiMatch[1].replace(/https?:\/\/\S+/g,'').trim();
      destino = raw.split(/\s{3,}/)[0].trim().replace(/\s+/g,' ');
    }

    // Notas entre ** ** con su POSICIÓN (para atribuir cada texto a su línea).
    const notasMatches = [];
    { const reNota = /\*\*([\s\S]*?)\*\*/g; let mn;
      while((mn = reNota.exec(text)) !== null){
        const t = mn[1].replace(/\s+/g,' ').trim();
        if(t) notasMatches.push({ idx: mn.index, texto: t });
      } }
    // Quitar las notas del texto MANTENIENDO las posiciones (relleno con espacios
    // de la misma longitud), para poder comparar posición de nota vs. de línea.
    const textLineas = text.replace(/\*\*[\s\S]*?\*\*/g, s => ' '.repeat(s.length));

    // Lines: detect ALL product references (vibrado, premontado, etc.)
    const lineas = [];
    // Dedup por POSICIÓN en el texto, no por referencia: una misma referencia
    // puede aparecer en varias líneas del pedido (p. ej. dos líneas de letras
    // GDEC022, FUENTE MILANO y LA BARDERA). Deduplicar por ref las fusionaba.
    const usados = new Set();
    const pushLinea = (ref, desc, cant, idx) => {
      if(cant > 0 && !usados.has(idx)) {
        usados.add(idx);
        lineas.push({ referencia: ref, descripcion: (desc||'').trim(), cantidad: Math.round(cant), idx, notas: null });
      }
    };
    const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1) Match against the actual catalogue references (covers every product type)
    let catRefs = [];
    try {
      catRefs = (await pool.query("SELECT referencia FROM productos WHERE referencia IS NOT NULL AND referencia<>''")).rows
        .map(r => String(r.referencia).trim()).filter(Boolean);
    } catch(e) { catRefs = []; }
    if(catRefs.length) {
      const alt = [...new Set(catRefs)].sort((a,b)=>b.length-a.length).map(escapeRe).join('|');
      const reCat = new RegExp('\\b(' + alt + ')\\b\\s+([^\\n]*?)\\s+(\\d+)[,.]?(\\d{2})\\s+\\d', 'g');
      let m;
      while((m = reCat.exec(textLineas)) !== null) pushLinea(m[1], m[2], parseFloat(m[3] + '.' + (m[4]||'00')), m.index);
    }

    // 2) Supplement: gaviones vibrados (GVIBR…) y premontados (GPRE…), estén o no en catálogo
    const reGen = /\b(G(?:VIBR|PRE)\w+)\b\s+([^\n]+?)\s+(\d+)[,.]?(\d{2})\s+\d/g;
    let mg;
    while((mg = reGen.exec(textLineas)) !== null) pushLinea(mg[1], mg[2], parseFloat(mg[3] + '.' + (mg[4]||'00')), mg.index);

    // 3) Fallback if nothing matched: generic product-code pattern
    if(!lineas.length) {
      const simple = /\b([A-Z]{2,}\w*\d)\b[^\n]*?(\d{1,4})[,\.](\d{2})\s/g;
      let ms;
      while((ms = simple.exec(textLineas)) !== null) pushLinea(ms[1], '', parseInt(ms[2]), ms.index);
    }

    // Atribuir cada nota a su línea: la PRIMERA nota tras una línea es de esa
    // línea (p. ej. el texto de la letra). Notas adicionales, o las que no siguen
    // a ninguna línea, van a las notas generales del pedido.
    const lineasOrden = [...lineas].sort((a,b)=>a.idx-b.idx);
    const generales = [];
    notasMatches.sort((a,b)=>a.idx-b.idx).forEach(n=>{
      let target = null;
      for(const l of lineasOrden){ if(l.idx < n.idx) target = l; else break; }
      if(target && !target.notas) target.notas = n.texto;
      else generales.push(n.texto);
    });
    const notas = generales.join(' · ') || null;
    const lineasOut = lineas.map(({idx, ...rest}) => rest);

    res.json({ numero, cliente_nombre, obra, destino, fecha_pedido, lineas: lineasOut, notas });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── IMPORTAR PRODUCTOS DESDE EXCEL BC ─────────────────────────────────────────
router.post('/api/importar-productos', async (req, res) => {
  const { base64 } = req.body;
  if(!base64) return res.status(400).json({error:'No se recibio el archivo'});
  try {
    const buf = Buffer.from(base64, 'base64');
    const wb = XLSX.read(buf, {type:'buffer'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1});

    // Skip header row
    const productos = [];
    for(let i=1; i<rows.length; i++){
      const row = rows[i];
      if(!row||!row[0]) continue;
      const referencia = String(row[0]).trim();
      const descripcion = String(row[1]||'').trim();
      const unidad = String(row[9]||'ud').trim().toLowerCase()||'ud';

      // Extract dimensions from description e.g. "100x30x50cm" or "200x100x100"
      const dimMatch = descripcion.match(/(\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)\s*cm/i)
                    || descripcion.match(/(\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)/);
      let largo=null, ancho=null, alto=null;
      if(dimMatch){
        largo = parseFloat(dimMatch[1].replace(',','.'))/100;
        ancho = parseFloat(dimMatch[2].replace(',','.'))/100;
        alto  = parseFloat(dimMatch[3].replace(',','.'))/100;
      }

      // Determine tipo from referencia or grupo
      const grupo = String(row[2]||'').toUpperCase();
      let tipo = 'gavion';
      if(referencia.startsWith('COL')||referencia.startsWith('REN')) tipo='colchoneta';
      else if(referencia.startsWith('PROT')||referencia.startsWith('MAL')) tipo='malla';
      else if(referencia.startsWith('PORT')||referencia.startsWith('ACCE')) tipo='accesorio';
      else if(grupo.includes('COLCHON')||grupo.includes('RENO')) tipo='colchoneta';
      else if(grupo.includes('ACCESO')) tipo='accesorio';

      // Normalize unit
      let unidadNorm = 'ud';
      if(unidad==='uds'||unidad==='ud'||unidad==='unidades') unidadNorm='ud';
      else if(unidad==='kg') unidadNorm='kg';
      else if(unidad==='m2'||unidad==='m²') unidadNorm='m2';
      else if(unidad==='m') unidadNorm='m';

      productos.push({referencia, descripcion, tipo, largo, ancho, alto, unidad:unidadNorm});
    }

    // Check existing products to avoid duplicates
    const existing = (await pool.query('SELECT referencia FROM productos')).rows.map(r=>r.referencia);
    const nuevos = productos.filter(p=>!existing.includes(p.referencia));
    const duplicados = productos.filter(p=>existing.includes(p.referencia));

    // Insert new ones
    for(const p of nuevos){
      const r = await pool.query(
        `INSERT INTO productos (tipo,referencia,largo,ancho,alto,descripcion,unidad) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [p.tipo,p.referencia,p.largo,p.ancho,p.alto,p.descripcion,p.unidad]
      );
      await pool.query('INSERT INTO stock (producto_id,cantidad) VALUES ($1,0)',[r.rows[0].id]);
    }

    res.json({
      total: productos.length,
      importados: nuevos.length,
      duplicados: duplicados.length,
      refs_duplicadas: duplicados.map(p=>p.referencia)
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = router;
