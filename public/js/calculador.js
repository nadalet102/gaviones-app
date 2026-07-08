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

// Color por medida de pieza (largo), bien diferenciado para leer el dibujo
function muroColorPieza(p){
  if(p===2)   return {f:'#3b82f6', s:'#1d4ed8'};   // 2 m   → azul
  if(p===1.5) return {f:'#22c55e', s:'#15803d'};   // 1,5 m → verde
  return {f:'#f59e0b', s:'#b45309'};               // 1 m   → ámbar
}
function muroLeyenda(){
  function chip(c,t){ return '<span style="display:inline-block;width:12px;height:12px;background:'+c.f+';border:1px solid '+c.s+';vertical-align:middle"></span> '+t; }
  return '<div class="dim" style="font-size:11px;margin-top:8px">'+
    chip(muroColorPieza(2),'2 m')+' &nbsp; '+chip(muroColorPieza(1.5),'1,5 m')+' &nbsp; '+chip(muroColorPieza(1),'1 m')+'</div>';
}

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

let calcModo = 'simple';   // 'simple' = un muro · 'tramos' = muro en pendiente
function calcSetModo(m){ calcModo = m; renderCalculador(); }

function renderCalculador(){
  const el = document.getElementById('calculador-container');
  if(!el) return;
  const optsPront = Object.keys(MURO_TABLA).map(h => '<option value="'+h+'">'+h+' metros</option>').join('');
  const opts =
    '<optgroup label="Muros escalonados (prontuario)">'+optsPront+'</optgroup>'+
    '<optgroup label="Muros bajos (rectos)"><option value="1">1 metro</option><option value="0.5">0,50 m</option><option value="0.3">0,30 m</option></optgroup>';
  const btn = (m,txt) => '<button class="btn btn-sm '+(calcModo===m?'btn-primary':'btn-outline')+'" onclick="calcSetModo(\''+m+'\')">'+txt+'</button>';
  const toggle =
    '<div style="display:flex;gap:8px;margin-bottom:14px">'+btn('simple','<i class="ti ti-wall"></i> Un muro')+btn('tramos','<i class="ti ti-stairs"></i> Por tramos (pendiente)')+'</div>';

  const formSimple =
    '<div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:16px">'+
      '<div class="frow3" style="gap:12px;align-items:flex-end">'+
        '<div class="field" style="margin:0"><label>Altura del muro</label><select id="calc-altura" onchange="muroToggleAncho()">'+opts+'</select></div>'+
        '<div class="field" style="margin:0;display:none" id="calc-ancho-wrap"><label>Ancho del gavión</label>'+
          '<select id="calc-ancho"><option value="0.5">0,50 m</option><option value="0.3">0,30 m</option></select></div>'+
        '<div class="field" style="margin:0"><label>Longitud del muro (m)</label>'+
          '<input type="number" id="calc-long" min="1" step="0.5" placeholder="Ej. 25" onkeydown="if(event.key===\'Enter\')calcularMuro()"></div>'+
        '<button class="btn btn-primary" onclick="calcularMuro()"><i class="ti ti-calculator"></i> Calcular</button>'+
      '</div>'+
    '</div></div>';

  const formTramos =
    '<div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:16px">'+
      '<div class="dim" style="font-size:12px;margin-bottom:10px">Un tramo por línea: <span class="mono">largo x alto</span> (opcional un 3er número = ancho para muros rectos). Ej. <span class="mono">20 x 4</span>, <span class="mono">12 x 2 x 0.5</span>.</div>'+
      '<div class="frow3" style="gap:10px;align-items:flex-end;margin-bottom:10px">'+
        '<div class="field" style="margin:0"><label>Largo (m)</label><input type="number" id="tr-largo" min="0.5" step="0.5" placeholder="20"></div>'+
        '<div class="field" style="margin:0"><label>Altura</label><select id="tr-alto">'+opts+'</select></div>'+
        '<button class="btn btn-outline btn-sm" onclick="tramoAdd()"><i class="ti ti-plus"></i> Añadir tramo</button>'+
      '</div>'+
      '<textarea id="tr-text" rows="5" placeholder="20 x 4&#10;15 x 3&#10;12 x 2&#10;8 x 1" style="width:100%;font-family:var(--mono,monospace);font-size:13px;padding:10px;border:1px solid var(--border);border-radius:6px;resize:vertical"></textarea>'+
      '<div style="margin-top:10px"><button class="btn btn-primary" onclick="calcularTramos()"><i class="ti ti-calculator"></i> Calcular muro</button></div>'+
    '</div></div>';

  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
      '<div style="display:flex;align-items:center;gap:10px">'+
        '<i class="ti ti-wall" style="font-size:20px;color:var(--blue)"></i>'+
        '<div><div style="font-size:16px;font-weight:600">Calculador de muros de gaviones</div>'+
        '<div class="dim">Despiece y vistas por altura y longitud (prontuario ARISAC)</div></div>'+
      '</div>'+
      '<button class="btn btn-outline btn-sm" onclick="switchTab(\'dash\')"><i class="ti ti-arrow-left"></i> Volver al panel</button>'+
    '</div>'+
    toggle+
    (calcModo==='tramos' ? formTramos : formSimple)+
    '<div id="calc-result"></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:14px 16px;font-size:12px;color:var(--text2)">'+
      '<div style="font-weight:600;color:var(--text);margin-bottom:6px"><i class="ti ti-info-circle"></i> Condiciones de diseño del prontuario</div>'+
      'Trasdós granular drenante (Ø=30°, γ=17,38 kN/m³, Ka=0,33) · Sin sobrecarga · Sin nivel freático · '+
      'Cimentación 5° sobre hormigón de limpieza · Relleno 1.600 kg/m³ · Talud 5°.'+
      '<div style="margin-top:8px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> Estimación orientativa; el trabado y el reparto se ajustan en obra.</div>'+
    '</div></div>';
  if(calcModo!=='tramos') muroToggleAncho();
}

// Selector de ancho: muros bajos (<2 m, ancho recto) y 2 m (prontuario o 0,50 recto)
function muroToggleAncho(){
  const h = parseFloat(document.getElementById('calc-altura').value);
  const wrap = document.getElementById('calc-ancho-wrap');
  const sel = document.getElementById('calc-ancho');
  if(!wrap || !sel) return;
  if(h === 2){
    wrap.style.display = '';
    sel.innerHTML = '<option value="pront">Escalonado (prontuario)</option><option value="0.5">0,50 m (recto)</option>';
  } else if(h < 2){
    wrap.style.display = '';
    sel.innerHTML = '<option value="0.5">0,50 m</option><option value="0.3">0,30 m</option>';
  } else {
    wrap.style.display = 'none';
  }
}

function calcularMuro(){
  const h = parseFloat(document.getElementById('calc-altura').value);
  const L = parseFloat(document.getElementById('calc-long').value)||0;
  const res = document.getElementById('calc-result');
  if(!h || L<=0){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-ruler-measure"></i><p>Introduce la longitud del muro</p></div>'; return; }
  const av = document.getElementById('calc-ancho') ? document.getElementById('calc-ancho').value : '';
  if(h < 2 || !MURO_TABLA[h]) return calcularMuroRecto(h, L, parseFloat(av)||0.5, res);   // muros bajos rectos
  if(h === 2 && av && av !== 'pront') return calcularMuroRecto(2, L, parseFloat(av)||0.5, res); // 2 m recto a 0,50
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
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisTrabado(h, L)+muroLeyenda()+
    '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-box-model"></i> Sección y vista 3D</div>'+
      '<span class="dim" style="font-size:11px">se ensancha hacia la base</span></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sección (ancho × alto)</div>'+croquisSeccion(h)+'</div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Vista 3D</div>'+croquis3D(h, L)+'</div>'+
      '</div>'+
    '</div>';
}

// ── MUROS RECTOS (ancho uniforme elegible): bajos <2 m (1 hilada) y 2 m (2 hiladas trabadas) ──
function calcularMuroRecto(H, L, ancho, res){
  const courseH = (H >= 1) ? 1 : H;              // alto de cada gavión/hilada
  const nCourses = (H >= 1) ? Math.round(H) : 1; // nº de hiladas
  const cnt = {p2:0,p15:0,p1:0};
  for(var c=0;c<nCourses;c++) muroTramo(L, c%2===1).forEach(function(p){ muroAddPieza(cnt, p); });
  const total = cnt.p2+cnt.p15+cnt.p1;
  const granular = L * ancho * H;
  const granStr = granular.toLocaleString('es-ES', {maximumFractionDigits:2});
  const aStr = String(ancho).replace('.',','), hStr = String(H).replace('.',','), chStr = String(courseH).replace('.',',');
  const subt = nCourses>1 ? ('muro recto · '+nCourses+' hiladas trabadas') : 'muro bajo · 1 hilada';

  function fila(largo, n){
    return n>0 ? '<tr><td>Gavión <strong>'+String(largo).replace('.',',')+' m</strong></td><td>'+String(largo).replace('.',',')+' × '+aStr+' × '+chStr+' m</td><td class="r mono" style="font-weight:600">'+fmtN(n)+'</td></tr>' : '';
  }
  const despiece =
    '<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+
      fila(2, cnt.p2)+ fila(1.5, cnt.p15)+ fila(1, cnt.p1)+
      '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones</td><td class="r mono" style="font-weight:700">'+fmtN(total)+'</td></tr>'+
    '</tbody></table>';

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-wall"></i> Muro recto '+hStr+' m alto × '+aStr+' m ancho × '+fmtN(L)+' m largo</div>'+
        '<span class="badge b-steel">'+subt+'</span></div>'+
      despiece+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+granStr+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-grid"></i> '+(nCourses>1?'Trabado de la cara':'Reparto de piezas a lo largo')+'</div>'+
      '<span class="dim" style="font-size:11px">'+(nCourses>1?'juntas desfasadas':'a lo largo')+'</span></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisRectoAlzado(L, nCourses, courseH)+muroLeyenda()+
    '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-box-model"></i> Sección y vista 3D</div>'+
      '<span class="dim" style="font-size:11px">muro recto de ancho uniforme</span></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sección (ancho × alto)</div>'+croquisSeccionBaja(ancho, H)+'</div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Vista 3D</div>'+croquis3DRecto(L, ancho, H, nCourses, courseH)+'</div>'+
      '</div>'+
    '</div>';
}

// Alzado del muro recto: nCourses hiladas trabadas, cada una courseH de alto
function croquisRectoAlzado(L, nCourses, courseH){
  var uW=Math.max(6, Math.min(26, 640/L)), uH=Math.max(16, courseH*44), gap=1.5;
  var w=Math.ceil(L*uW), hpx=nCourses*uH, rects='';
  for(var c=0;c<nCourses;c++){
    var y=(nCourses-1-c)*uH, x=0;
    muroTramo(L, c%2===1).forEach(function(p){
      var pw=p*uW, col=muroColorPieza(p);
      rects+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(uH-gap)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>';
      x+=pw;
    });
  }
  return '<svg viewBox="0 0 '+w+' '+Math.ceil(hpx)+'" width="'+Math.min(w,660)+'" style="max-width:100%;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reparto de piezas a lo largo">'+rects+'</svg>';
}

// (compat) alzado de una sola fila
function croquisBajoAlzado(L, alto){
  var uW=Math.max(6, Math.min(26, 640/L)), uH=Math.max(16, alto*44), gap=1.5;
  var w=Math.ceil(L*uW), x=0, rects='';
  muroTramo(L, false).forEach(function(p){
    var pw=p*uW, c=muroColorPieza(p);
    rects+='<rect x="'+x.toFixed(1)+'" y="0" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(uH-gap)+'" fill="'+c.f+'" stroke="'+c.s+'" stroke-width="0.6"/>';
    x+=pw;
  });
  return '<svg viewBox="0 0 '+w+' '+Math.ceil(uH)+'" width="'+Math.min(w,660)+'" style="max-width:100%;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reparto de piezas a lo largo">'+rects+'</svg>';
}

// Sección del muro bajo: rectángulo ancho × alto
function croquisSeccionBaja(ancho, alto){
  var sc=64, padL=54, padR=40, padT=14, padB=26;
  var Wpx=ancho*sc, Hpx=alto*sc, x0=padL, groundY=padT+Hpx;
  var vbW=x0+Wpx+padR, vbH=Hpx+padT+padB, out='';
  out+='<rect x="'+x0+'" y="'+padT+'" width="'+Wpx+'" height="'+Hpx+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="1.2"/>';
  out+='<line x1="'+x0+'" y1="'+(padT+Hpx/2)+'" x2="'+(x0+Wpx)+'" y2="'+(padT+Hpx/2)+'" stroke="#b3a67f" stroke-width="0.5" opacity="0.6"/>';
  out+='<line x1="'+(x0-14)+'" y1="'+groundY+'" x2="'+(x0+Wpx+14)+'" y2="'+groundY+'" stroke="#9c855c" stroke-width="2"/>';
  out+='<text x="'+(padL-38)+'" y="'+(padT+Hpx/2)+'" font-size="11" fill="#334155" text-anchor="middle" transform="rotate(-90 '+(padL-38)+' '+(padT+Hpx/2)+')">'+String(alto).replace('.',',')+' m</text>';
  out+='<text x="'+(x0+Wpx/2)+'" y="'+(groundY+16)+'" font-size="11" fill="#334155" text-anchor="middle">'+String(ancho).replace('.',',')+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),240)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sección del muro bajo">'+out+'</svg>';
}

// Vista 3D isométrica del muro recto (caja de ancho uniforme, nCourses hiladas trabadas)
function croquis3DRecto(L, ancho, H, nCourses, courseH){
  var dcos=0.58, dsin=0.32, padT=14, padR=26, padL=16, padB=24;
  var scW=(640-padL-padR)/(L + ancho*dcos);
  var scH=(240-padT-padB)/(H + ancho*dsin);
  var sc=Math.max(6, Math.min(80, scW, scH));
  var Lpx=L*sc, Hpx=H*sc, chpx=courseH*sc, dx=ancho*sc*dcos, dy=-ancho*sc*dsin;
  var vbW=padL+Lpx+ancho*sc*dcos+padR, vbH=padT+Hpx+ancho*sc*dsin+padB;
  var x0=padL, groundY=padT+Hpx+ancho*sc*dsin, topY=groundY-Hpx, out='';
  out+='<polygon points="'+x0+','+groundY+' '+(x0+Lpx)+','+groundY+' '+(x0+Lpx+dx)+','+(groundY+dy)+' '+(x0+dx)+','+(groundY+dy)+'" fill="#e2d3b3" opacity="0.5"/>';
  out+='<polygon points="'+x0+','+topY+' '+(x0+Lpx)+','+topY+' '+(x0+Lpx+dx)+','+(topY+dy)+' '+(x0+dx)+','+(topY+dy)+'" fill="#cabf9d" stroke="#8a7a5c" stroke-width="0.6"/>';
  out+='<polygon points="'+(x0+Lpx)+','+topY+' '+(x0+Lpx)+','+(topY+Hpx)+' '+(x0+Lpx+dx)+','+(topY+Hpx+dy)+' '+(x0+Lpx+dx)+','+(topY+dy)+'" fill="#b3a67f" stroke="#8a7a5c" stroke-width="0.6"/>';
  for(var c=0;c<nCourses;c++){
    var rowTop=groundY-(c+1)*chpx, px=x0;
    muroTramo(L, c%2===1).forEach(function(p){ var pw=p*sc, col=muroColorPieza(p); out+='<rect x="'+px.toFixed(1)+'" y="'+rowTop.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+chpx.toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.8"/>'; px+=pw; });
  }
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="10" fill="#7c6a45">'+fmtN(L)+' m largo · '+String(H).replace('.',',')+' m alto · '+String(ancho).replace('.',',')+' m ancho</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),640)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del muro recto">'+out+'</svg>';
}

// ── MURO POR TRAMOS (en pendiente): cada tramo con su largo y altura ──
function tramoAdd(){
  const L = parseFloat(document.getElementById('tr-largo').value);
  const H = document.getElementById('tr-alto').value;
  if(!(L>0)) return;
  const ta = document.getElementById('tr-text');
  const line = String(L).replace('.',',')+' x '+String(H).replace('.',',');
  ta.value = ta.value.trim() ? (ta.value.replace(/\s*$/,'')+'\n'+line) : line;
  document.getElementById('tr-largo').value='';
  document.getElementById('tr-largo').focus();
}

function parseTramos(text){
  const tramos=[], errores=[];
  const allowed={}; Object.keys(MURO_TABLA).forEach(k=>allowed[k]=1); [1,0.5,0.3].forEach(k=>allowed[k]=1);
  (text||'').split(/\n/).forEach(function(line, i){
    const s=line.trim(); if(!s) return;
    const nums=(s.replace(/,/g,'.').match(/\d+(\.\d+)?/g)||[]).map(Number);
    if(nums.length<2){ errores.push('Línea '+(i+1)+' ("'+s+'"): falta largo o alto'); return; }
    const L=nums[0], H=nums[1], ancho=nums.length>=3?nums[2]:null;
    if(!(L>0)){ errores.push('Línea '+(i+1)+': largo inválido'); return; }
    if(!allowed[H]){ errores.push('Línea '+(i+1)+': altura '+String(H).replace('.',',')+' no válida (0,3 / 0,5 / 1 / 2…10)'); return; }
    if(ancho!=null && !(ancho===0.3||ancho===0.5||ancho===1)){ errores.push('Línea '+(i+1)+': ancho '+String(ancho).replace('.',',')+' no válido (0,3 / 0,5 / 1)'); return; }
    tramos.push({L:L, H:H, ancho:ancho, raw:s});
  });
  return {tramos:tramos, errores:errores};
}

// Piezas de un tramo (reutiliza el motor: prontuario si ≥2 m y sin ancho; recto en caso contrario)
function muroPiezasTramo(t){
  const recto = (t.ancho!=null) || t.H<2;
  if(!recto){
    const m=muroCalculo(t.H, t.L), piezas=[];
    [[1, m.tot.a1],[0.5, m.tot.a05]].forEach(function(b){
      const a=b[0], acc=b[1];
      if(acc.p2) piezas.push({largo:2, ancho:a, alto:1, n:acc.p2});
      if(acc.p15) piezas.push({largo:1.5, ancho:a, alto:1, n:acc.p15});
      if(acc.p1) piezas.push({largo:1, ancho:a, alto:1, n:acc.p1});
    });
    return {tipo:'escalonado', piezas:piezas, granular: MURO_TABLA[t.H].granular*t.L};
  }
  const ancho = t.ancho!=null ? t.ancho : 0.5;
  const courseH = (t.H>=1)?1:t.H, nCourses=(t.H>=1)?Math.round(t.H):1;
  const cnt={p2:0,p15:0,p1:0};
  for(var c=0;c<nCourses;c++) muroTramo(t.L, c%2===1).forEach(function(p){ muroAddPieza(cnt,p); });
  const piezas=[];
  if(cnt.p2) piezas.push({largo:2, ancho:ancho, alto:courseH, n:cnt.p2});
  if(cnt.p15) piezas.push({largo:1.5, ancho:ancho, alto:courseH, n:cnt.p15});
  if(cnt.p1) piezas.push({largo:1, ancho:ancho, alto:courseH, n:cnt.p1});
  return {tipo:'recto', piezas:piezas, granular: t.L*ancho*t.H};
}

function calcularTramos(){
  const res=document.getElementById('calc-result');
  const parsed=parseTramos(document.getElementById('tr-text').value);
  const fmtm = x=>String(x).replace('.',',');
  const errBlock = parsed.errores.length ? '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:12px 16px;font-size:12px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> '+parsed.errores.join('<br>')+'</div></div>' : '';
  if(!parsed.tramos.length){
    res.innerHTML='<div class="empty"><i class="ti ti-stairs"></i><p>Escribe al menos un tramo (largo x alto)</p></div>'+errBlock;
    return;
  }
  const agg={}; let granTotal=0, totalGav=0, largoTotal=0, hMax=0;
  const filasTramo = parsed.tramos.map(function(t, idx){
    const r=muroPiezasTramo(t); let nGav=0;
    r.piezas.forEach(function(p){ const k=p.largo+'|'+p.ancho+'|'+p.alto; if(!agg[k]) agg[k]={largo:p.largo,ancho:p.ancho,alto:p.alto,n:0}; agg[k].n+=p.n; nGav+=p.n; });
    granTotal+=r.granular; totalGav+=nGav; largoTotal+=t.L; hMax=Math.max(hMax,t.H);
    return {idx:idx+1, t:t, tipo:r.tipo, nGav:nGav, granular:r.granular};
  });
  const piezasOrden = Object.keys(agg).map(k=>agg[k]).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  const despiece='<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+
    piezasOrden.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('')+
    '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones</td><td class="r mono" style="font-weight:700">'+fmtN(totalGav)+'</td></tr></tbody></table>';
  const porTramo='<table class="tbl"><thead><tr><th>Tramo</th><th>Largo</th><th>Alto</th><th>Tipo</th><th class="r">Gaviones</th><th class="r">Granular</th></tr></thead><tbody>'+
    filasTramo.map(f=>'<tr><td class="mono">'+f.idx+'</td><td>'+fmtN(f.t.L)+' m</td><td>'+fmtm(f.t.H)+' m'+(f.t.ancho!=null?(' · '+fmtm(f.t.ancho)+' ancho'):'')+'</td><td class="dim">'+f.tipo+'</td><td class="r mono">'+fmtN(f.nGav)+'</td><td class="r mono">'+f.granular.toLocaleString('es-ES',{maximumFractionDigits:2})+' m³</td></tr>').join('')+'</tbody></table>';

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-stairs"></i> Muro por tramos · '+fmtN(largoTotal)+' m totales · '+parsed.tramos.length+' tramos</div>'+
        '<span class="badge b-steel">altura máx '+fmtm(hMax)+' m</span></div>'+
      despiece+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular total</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+granTotal.toLocaleString('es-ES',{maximumFractionDigits:2})+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-list-numbers"></i> Desglose por tramo</div></div>'+porTramo+'</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Perfil longitudinal (alzado)</div>'+
      '<span class="dim" style="font-size:11px">bases alineadas · los remates escalonan</span></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisPerfilLongitudinal(parsed.tramos)+'</div></div>'+
    errBlock+
    '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:12px 16px;font-size:12px;color:var(--text2)"><i class="ti ti-info-circle"></i> v1: cada tramo se calcula por separado y se suma. El <strong>solape/traba entre escalones</strong> lo añadiremos en la siguiente vuelta.</div></div>';
}

// Alzado longitudinal: la "escalera" del muro (bases alineadas, remates escalonados)
function croquisPerfilLongitudinal(tramos){
  const totalL=tramos.reduce((s,t)=>s+t.L,0), hMax=tramos.reduce((m,t)=>Math.max(m,t.H),0);
  const xs=Math.max(2, Math.min(16, 860/totalL)), ys=18;
  const padL=16,padR=16,padT=18,padB=34;
  const Wpx=totalL*xs, Hpx=hMax*ys, vbW=padL+Wpx+padR, vbH=padT+Hpx+padB;
  const x0=padL, groundY=padT+Hpx; let out='', x=x0;
  tramos.forEach(function(t, i){
    const w=t.L*xs, h=t.H*ys, topY=groundY-h, fill=i%2===0?'#d6e0f0':'#c4d3e8';
    out+='<rect x="'+x.toFixed(1)+'" y="'+topY.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+fill+'" stroke="#5b7599" stroke-width="1"/>';
    for(var k=1;k<t.H;k++){ const ly=groundY-k*ys; out+='<line x1="'+x.toFixed(1)+'" y1="'+ly.toFixed(1)+'" x2="'+(x+w).toFixed(1)+'" y2="'+ly.toFixed(1)+'" stroke="#8fa3bf" stroke-width="0.4" opacity="0.6"/>'; }
    if(h>=14) out+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(topY+12).toFixed(1)+'" font-size="10" fill="#334155" text-anchor="middle">'+String(t.H).replace('.',',')+' m</text>';
    out+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(groundY+14).toFixed(1)+'" font-size="9" fill="#64748b" text-anchor="middle">'+fmtN(t.L)+' m</text>';
    x+=w;
  });
  out+='<line x1="'+x0+'" y1="'+groundY+'" x2="'+(x0+Wpx).toFixed(1)+'" y2="'+groundY+'" stroke="#334155" stroke-width="1.5"/>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),860)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Perfil longitudinal del muro">'+out+'</svg>';
}

function croquisTrabado(H, L){
  const uW = Math.max(6, Math.min(26, 640/L)), uH = 20, gap = 1.5;
  const w = Math.ceil(L*uW), hpx = H*uH;
  let rects = '';
  for(let c=0;c<H;c++){
    const pieces = muroTramo(L, c%2===1);
    let x=0; const y=(H-1-c)*uH;
    pieces.forEach(function(p){
      const pw = p*uW, c = muroColorPieza(p);
      rects += '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(uH-gap)+'" fill="'+c.f+'" stroke="'+c.s+'" stroke-width="0.6"/>';
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

// Vista 3D isométrica del muro completo escalonado (con malla, juntas y terreno)
function croquis3D(H, L){
  var w=muroPerfilAnchos(H), dcos=0.58, dsin=0.32;
  var maxW=Math.max.apply(null,w), padT=14, padR=26, padL=16, padB=24;
  // escala dinámica: encaja el muro completo (largo + profundidad) en el lienzo
  var scW=(640-padL-padR)/(L + maxW*dcos);
  var scH=(300-padT-padB)/(H + maxW*dsin);
  var sc=Math.max(4, Math.min(26, scW, scH));
  var Lpx=L*sc, depthMax=maxW*sc;
  var vbW=padL+Lpx+depthMax*dcos+padR, vbH=padT+H*sc+depthMax*dsin+padB;
  var x0=padL, groundY=padT+H*sc+depthMax*dsin, out='';
  var bw=w[0]*sc, bdx=bw*dcos, bdy=-bw*dsin;
  out+='<polygon points="'+x0+','+groundY+' '+(x0+Lpx)+','+groundY+' '+(x0+Lpx+bdx)+','+(groundY+bdy)+' '+(x0+bdx)+','+(groundY+bdy)+'" fill="#e2d3b3" opacity="0.5"/>';
  for(var i=0;i<H;i++){
    var ww=w[i]*sc, topY=groundY-(i+1)*sc, dx=ww*dcos, dy=-ww*dsin;
    out+='<polygon points="'+x0+','+topY+' '+(x0+Lpx)+','+topY+' '+(x0+Lpx+dx)+','+(topY+dy)+' '+(x0+dx)+','+(topY+dy)+'" fill="#cabf9d" stroke="#8a7a5c" stroke-width="0.6"/>';
    out+='<polygon points="'+(x0+Lpx)+','+topY+' '+(x0+Lpx)+','+(topY+sc)+' '+(x0+Lpx+dx)+','+(topY+sc+dy)+' '+(x0+Lpx+dx)+','+(topY+dy)+'" fill="#b3a67f" stroke="#8a7a5c" stroke-width="0.6"/>';
    // cara frontal: una pieza por color de medida (2/1,5/1 m), según el trabado
    var pat=muroTramo(L, (i+1)%2===0), px=x0;
    pat.forEach(function(p){ var pw=p*sc, c=muroColorPieza(p); out+='<rect x="'+px.toFixed(1)+'" y="'+topY+'" width="'+pw.toFixed(1)+'" height="'+sc+'" fill="'+c.f+'" stroke="'+c.s+'" stroke-width="0.8"/>'; px+=pw; });
  }
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="10" fill="#7c6a45">muro completo · '+fmtN(L)+' m largo · '+H+' m alto</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),640)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del muro completo">'+out+'</svg>';
}
