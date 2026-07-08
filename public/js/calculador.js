// ════════════ CALCULADOR DE MUROS (pestaña oculta, experimental) ════════════
// Prontuario ARISAC (A. Bedia), muros 2–10 m. Muro escalonado; gaviones SIEMPRE
// con el largo a lo largo del muro y trabados (juntas desfasadas). El perfil de
// anchos por hilada (fórmula abajo) cuadra EXACTO con el volumen del prontuario.
const MURO_TABLA = {
  2:  { granular: 2.0,  base: 1.0 },
  3:  { granular: 3.0,  base: 1.0 },
  4:  { granular: 4.5,  base: 1.5 },
  5:  { granular: 6.5,  base: 2.0 },
  6:  { granular: 9.0,  base: 2.5 },
  7:  { granular: 12.0, base: 3.0 },
  8:  { granular: 15.5, base: 3.5 },
  9:  { granular: 19.5, base: 4.0 },
  10: { granular: 24.0, base: 4.5 },
};

// Ancho de cada hilada (de abajo a arriba): baja 0,5 m por hilada desde la base
// hasta llegar a 1 m. La suma de anchos = volumen/ml del prontuario (verificado).
function muroPerfilAnchos(H){
  var base = MURO_TABLA[H].base, extra = base - 1, w = [];
  for(var k=1;k<=H;k++) w.push(1 + Math.max(0, extra - 0.5*(k-1)));
  return w; // bottom→top
}
// Tabica una hilada de longitud L con piezas de 2/1,5/1 m; offset la desfasa (trabado).
function muroTramo(L, offset){
  var p=[], rem=L;
  if(offset && rem>=2){ p.push(1); rem-=1; }
  while(rem>=2){ p.push(2); rem-=2; }
  if(rem>=1.5){ p.push(1.5); rem-=1.5; }
  else if(rem>0.01){ p.push(1); }
  return p;
}
function muroAddPieza(acc, p){ if(p===2) acc.p2++; else if(p===1.5) acc.p15++; else acc.p1++; }

// Modelo del muro: filas por hilada (con sus bandas de ancho) + totales de piezas.
function muroCalculo(H, L){
  var perfil = muroPerfilAnchos(H);
  var tot = { a1:{p2:0,p15:0,p1:0}, a05:{p2:0,p15:0,p1:0} };
  var filas = [];
  perfil.forEach(function(w, idx){
    var course = idx+1, offset = (course % 2 === 0);
    var nFull = Math.floor(w + 1e-9), hasHalf = (w - nFull) > 0.4;
    var pat = muroTramo(L, offset);
    for(var b=0;b<nFull;b++) pat.forEach(function(p){ muroAddPieza(tot.a1, p); });
    if(hasHalf) pat.forEach(function(p){ muroAddPieza(tot.a05, p); });
    filas.push({ course:course, ancho:w, nFull:nFull, hasHalf:hasHalf, pat:pat });
  });
  tot.a1.total = tot.a1.p2+tot.a1.p15+tot.a1.p1;
  tot.a05.total = tot.a05.p2+tot.a05.p15+tot.a05.p1;
  return { perfil:perfil, filas:filas, tot:tot };
}

function renderCalculador(){
  const el = document.getElementById('calculador-container');
  if(!el) return;
  const opts = Object.keys(MURO_TABLA).map(h => '<option value="'+h+'">'+h+' metros</option>').join('');
  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
      '<div style="display:flex;align-items:center;gap:10px">'+
        '<i class="ti ti-wall" style="font-size:20px;color:var(--blue)"></i>'+
        '<div><div style="font-size:16px;font-weight:600">Calculador de muros de gaviones</div>'+
        '<div class="dim">Despiece y vistas por altura y longitud (prontuario ARISAC)</div></div>'+
      '</div>'+
      '<button class="btn btn-outline btn-sm" onclick="switchTab(\'dash\')"><i class="ti ti-arrow-left"></i> Volver al panel</button>'+
    '</div>'+
    '<div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:16px">'+
      '<div class="frow3" style="gap:12px;align-items:flex-end">'+
        '<div class="field" style="margin:0"><label>Altura del muro</label><select id="calc-altura">'+opts+'</select></div>'+
        '<div class="field" style="margin:0"><label>Longitud del muro (m)</label>'+
          '<input type="number" id="calc-long" min="1" step="0.5" placeholder="Ej. 25" onkeydown="if(event.key===\'Enter\')calcularMuro()"></div>'+
        '<button class="btn btn-primary" onclick="calcularMuro()"><i class="ti ti-calculator"></i> Calcular</button>'+
      '</div>'+
    '</div></div>'+
    '<div id="calc-result"></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:14px 16px;font-size:12px;color:var(--text2)">'+
      '<div style="font-weight:600;color:var(--text);margin-bottom:6px"><i class="ti ti-info-circle"></i> Condiciones de diseño del prontuario</div>'+
      'Trasdós granular drenante (Ø=30°, γ=17,38 kN/m³, Ka=0,33) · Sin sobrecarga · Sin nivel freático · '+
      'Cimentación 5° sobre hormigón de limpieza · Relleno 1.600 kg/m³ · Talud 5°.'+
      '<div style="margin-top:8px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> Estimación orientativa; el trabado y el reparto se ajustan en obra.</div>'+
    '</div></div>';
}

function calcularMuro(){
  const h = +document.getElementById('calc-altura').value;
  const L = parseFloat(document.getElementById('calc-long').value)||0;
  const res = document.getElementById('calc-result');
  if(!h || L<=0){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-ruler-measure"></i><p>Introduce la longitud del muro</p></div>'; return; }
  const t = MURO_TABLA[h];
  const m = muroCalculo(h, L);
  const granular = t.granular * L;
  const totalGav = m.tot.a1.total + m.tot.a05.total;

  // ── Despiece resumen (tabla clara por pieza) ──
  function filaDespiece(ancho, largo, n){
    return n>0 ? '<tr><td>Gavión <strong>'+String(largo).replace('.',',')+' m</strong></td><td>'+ancho+' m de ancho</td><td class="r mono" style="font-weight:600">'+fmtN(n)+'</td></tr>' : '';
  }
  const despiece =
    '<table class="tbl"><thead><tr><th>Pieza</th><th>Tipo</th><th class="r">Unidades</th></tr></thead><tbody>'+
      filaDespiece('1', 2, m.tot.a1.p2)+ filaDespiece('1', 1.5, m.tot.a1.p15)+ filaDespiece('1', 1, m.tot.a1.p1)+
      filaDespiece('0,5', 2, m.tot.a05.p2)+ filaDespiece('0,5', 1.5, m.tot.a05.p15)+ filaDespiece('0,5', 1, m.tot.a05.p1)+
      '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones</td><td class="r mono" style="font-weight:700">'+fmtN(totalGav)+'</td></tr>'+
    '</tbody></table>';

  // ── Despiece por hilada (de arriba abajo, como se ve) ──
  function patStr(pat){ return pat.map(function(p){return String(p).replace('.',',');}).join(' · '); }
  const porFila = m.filas.slice().reverse().map(function(f){
    const bandas = f.nFull+' de 1 m'+(f.hasHalf?' + 1 de 0,5 m':'');
    return '<tr><td class="mono">'+f.course+(f.course===1?' (base)':'')+'</td><td>'+String(f.ancho).replace('.',',')+' m</td>'+
      '<td class="mono">'+patStr(f.pat)+'</td><td class="dim">'+bandas+'</td></tr>';
  }).join('');

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-building-bridge"></i> Muro '+h+' m alto × '+fmtN(L)+' m largo</div>'+
        '<span class="badge b-steel">base ≈ '+String(t.base).replace('.',',')+' m · talud 5°</span></div>'+
      despiece+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+fmtN(granular)+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-list-numbers"></i> Despiece por hilada</div>'+
      '<span class="dim" style="font-size:11px">de arriba abajo · patrón a lo largo</span></div>'+
      '<table class="tbl"><thead><tr><th>Hilada</th><th>Ancho</th><th>Trabado (a lo largo)</th><th>Bandas (profundidad)</th></tr></thead><tbody>'+porFila+'</tbody></table>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-grid"></i> Trabado de la cara</div>'+
      '<span class="dim" style="font-size:11px">juntas desfasadas</span></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisTrabado(h, L)+
      '<div class="dim" style="font-size:11px;margin-top:8px"><span style="display:inline-block;width:12px;height:12px;background:#d8ccb0;border:1px solid #8a7a5c;vertical-align:middle"></span> 2 m &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#e6dcc0;border:1px solid #8a7a5c;vertical-align:middle"></span> 1,5 m &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#fcd34d;border:1px solid #b45309;vertical-align:middle"></span> 1 m</div>'+
    '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-box-model"></i> Sección y vista 3D</div>'+
      '<span class="dim" style="font-size:11px">se ensancha hacia la base</span></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sección (ancho × alto)</div>'+croquisSeccion(h)+'</div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Vista 3D</div>'+croquis3D(h, L)+'</div>'+
      '</div>'+
    '</div>';
}

function croquisTrabado(H, L){
  const uW = Math.max(6, Math.min(26, 640/L)), uH = 20, gap = 1.5;
  const w = Math.ceil(L*uW), hpx = H*uH;
  let rects = '';
  for(let c=0;c<H;c++){
    const pieces = muroTramo(L, c%2===1);
    let x=0; const y=(H-1-c)*uH;
    pieces.forEach(function(p){
      const pw = p*uW, fill = p===2 ? '#d8ccb0' : p===1.5 ? '#e6dcc0' : '#fcd34d';
      rects += '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(uH-gap)+'" fill="'+fill+'" stroke="#8a7a5c" stroke-width="0.6"/>';
      x += pw;
    });
  }
  return '<svg viewBox="0 0 '+w+' '+hpx+'" width="'+Math.min(w,660)+'" style="max-width:100%;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trabado de la cara">'+rects+'</svg>';
}

// Sección transversal (ancho × alto): frente a la izquierda, escalones al terreno
function croquisSeccion(H){
  var w=muroPerfilAnchos(H), sc=34, padL=64, padR=64, padT=14, padB=26;
  var base=Math.max.apply(null,w), Wpx=base*sc, Hpx=H*sc;
  var x0=padL, groundY=padT+Hpx, vbW=x0+Wpx+padR, vbH=Hpx+padT+padB, out='';
  for(var i=0;i<H;i++){
    var y=groundY-(i+1)*sc, ww=w[i]*sc;
    out+='<rect x="'+x0+'" y="'+y+'" width="'+ww+'" height="'+(sc-1)+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="1"/>';
    out+='<line x1="'+x0+'" y1="'+(y+sc/2)+'" x2="'+(x0+ww)+'" y2="'+(y+sc/2)+'" stroke="#b3a67f" stroke-width="0.5" opacity="0.6"/>';
    if(w[i]>1){ out+='<rect x="'+(x0+sc)+'" y="'+y+'" width="'+((w[i]-1)*sc)+'" height="'+(sc-1)+'" fill="#fcd34d" opacity="0.35"/>'; }
  }
  out+='<line x1="'+(x0-16)+'" y1="'+groundY+'" x2="'+(x0+Wpx+16)+'" y2="'+groundY+'" stroke="#9c855c" stroke-width="2"/>';
  out+='<text x="'+(padL-42)+'" y="'+(padT+Hpx/2)+'" font-size="11" fill="#334155" text-anchor="middle" transform="rotate(-90 '+(padL-42)+' '+(padT+Hpx/2)+')">FRENTE · '+H+' m</text>';
  out+='<text x="'+(x0+Wpx+6)+'" y="'+(padT+12)+'" font-size="10" fill="#7c6a45">terreno</text>';
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="11" fill="#334155">base '+String(base).replace('.',',')+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),360)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sección del ancho del muro">'+out+'</svg>';
}

// Vista 3D isométrica de un tramo del muro escalonado (con malla y terreno)
function croquis3D(H, L){
  var w=muroPerfilAnchos(H), sc=26, seg=Math.min(L,4), Lpx=seg*sc;
  var dcos=0.58, dsin=0.32;
  var maxW=Math.max.apply(null,w), padT=14, padR=24, padL=16, padB=24;
  var depthMax=maxW*sc;
  var vbW=padL+Lpx+depthMax*dcos+padR, vbH=padT+H*sc+depthMax*dsin+padB;
  var x0=padL, groundY=padT+H*sc+depthMax*dsin, out='';
  var bw=w[0]*sc, bdx=bw*dcos, bdy=-bw*dsin;
  out+='<polygon points="'+x0+','+groundY+' '+(x0+Lpx)+','+groundY+' '+(x0+Lpx+bdx)+','+(groundY+bdy)+' '+(x0+bdx)+','+(groundY+bdy)+'" fill="#e2d3b3" opacity="0.5"/>';
  for(var i=0;i<H;i++){
    var ww=w[i]*sc, topY=groundY-(i+1)*sc, dx=ww*dcos, dy=-ww*dsin;
    out+='<polygon points="'+x0+','+topY+' '+(x0+Lpx)+','+topY+' '+(x0+Lpx+dx)+','+(topY+dy)+' '+(x0+dx)+','+(topY+dy)+'" fill="#cabf9d" stroke="#8a7a5c" stroke-width="0.7"/>';
    out+='<polygon points="'+(x0+Lpx)+','+topY+' '+(x0+Lpx)+','+(topY+sc)+' '+(x0+Lpx+dx)+','+(topY+sc+dy)+' '+(x0+Lpx+dx)+','+(topY+dy)+'" fill="#b3a67f" stroke="#8a7a5c" stroke-width="0.7"/>';
    out+='<rect x="'+x0+'" y="'+topY+'" width="'+Lpx+'" height="'+sc+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="0.9"/>';
    for(var gx=x0+sc; gx<x0+Lpx-1; gx+=sc) out+='<line x1="'+gx.toFixed(1)+'" y1="'+topY+'" x2="'+gx.toFixed(1)+'" y2="'+(topY+sc)+'" stroke="#b3a67f" stroke-width="0.5" opacity="0.6"/>';
    out+='<line x1="'+x0+'" y1="'+(topY+sc/2)+'" x2="'+(x0+Lpx)+'" y2="'+(topY+sc/2)+'" stroke="#b3a67f" stroke-width="0.5" opacity="0.6"/>';
  }
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="10" fill="#7c6a45">tramo '+fmtN(seg)+' m (de '+fmtN(L)+' m) · '+H+' m alto</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),400)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del muro">'+out+'</svg>';
}
