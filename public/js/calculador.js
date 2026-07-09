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
// Tabica una hilada de longitud L con piezas COMPLETAS de 2/1,5/1 m que suman EXACTO L.
// Prioriza piezas de 2 m; el medio metro (L acabado en ,5) lo aporta una pieza de 1,5 m.
// offset=true desfasa las juntas (trabado): la hilada se coloca "al revés" y, si es todo
// de 2 m, se rematan los extremos con 1 m (empieza abajo en 1,5 y acaba en 1; arriba al revés).
function muroTramo(L, offset){
  var u = Math.round(L*2);                 // longitud en medios metros
  if(u < 2) return [];                     // < 1 m no admite pieza válida
  var med=0, uno=0, uu=u;
  if(uu % 2 === 1){ med=1; uu-=3; }        // un 1,5 m (3 medios) para el medio metro
  var dos=Math.floor(uu/4), rem=uu-dos*4;  // rem 0 o 2
  if(rem===2) uno=1;                        // un 1 m
  var p=[];
  if(med) p.push(1.5);
  for(var i=0;i<dos;i++) p.push(2);
  if(uno) p.push(1);
  if(!offset) return p;
  if(med || uno) return p.slice().reverse();          // hilada impar: al revés (trabado)
  var r=[1]; for(var j=0;j<dos-1;j++) r.push(2); r.push(1); return r; // todo 2 m: 1 m en extremos
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

// Hiladas del muro (abajo→arriba): ancho (w), alto (h) y offset de trabado de cada una.
// Escalonado (ancho=null): usa el perfil del prontuario del entero SUPERIOR (ceil) y
//   remata el 0,5 sobrante con una hilada de 0,5 m de alto (gaviones 200×100×50 y comb.).
// Recto (ancho dado): hiladas de ancho uniforme.
function muroCourses(H, ancho){
  var courses=[], recto=(ancho!=null);
  if(H < 1){ courses.push({w: recto?ancho:1, h:H}); }
  else {
    var full=Math.floor(H+1e-9), half=(H-full)>0.25;
    var widths = recto ? null : muroPerfilAnchos(Math.ceil(H-1e-9));
    for(var k=0;k<full;k++) courses.push({w: recto?ancho:widths[k], h:1});
    if(half) courses.push({w: recto?ancho:widths[full], h:0.5});
  }
  courses.forEach(function(c,i){ c.offset=(i%2===1); });
  return courses;
}
// Bandas de ancho de una hilada (en profundidad): 1 m + resto (0,5/0,3)
function muroBandas(w){
  if(w <= 0.55) return [w];
  var n=Math.floor(w+1e-9), rem=w-n, b=[];
  for(var i=0;i<n;i++) b.push(1);
  if(rem>0.05) b.push(Math.round(rem*100)/100);
  return b;
}
// Despiece unificado: piezas por (largo,ancho,alto), filas por hilada, granular, base.
function muroDespiece(H, L, ancho){
  var courses = muroCourses(H, ancho), map={}, filas=[], granular=0;
  courses.forEach(function(c, idx){
    var bandas = muroBandas(c.w), pat = muroTramo(L, c.offset);
    bandas.forEach(function(bw){ pat.forEach(function(p){
      var key=p+'|'+bw+'|'+c.h;
      if(!map[key]) map[key]={largo:p, ancho:bw, alto:c.h, n:0};
      map[key].n++;
    }); });
    granular += c.w * c.h;
    filas.push({course:idx+1, w:c.w, h:c.h, offset:c.offset, pat:pat, bandas:bandas});
  });
  granular *= L;
  var piezas = Object.keys(map).map(function(k){return map[k];})
    .sort(function(a,b){ return (b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo); });
  return { courses:courses, filas:filas, piezas:piezas, granular:granular,
    base: courses.length?courses[0].w:0, total: piezas.reduce(function(s,p){return s+p.n;},0),
    tipo: (ancho!=null||H<2)?'recto':'escalonado', designH: (ancho!=null||H<2)?null:Math.ceil(H-1e-9) };
}

let calcModo = 'simple';   // 'simple' = un muro · 'tramos' = muro en pendiente
function calcSetModo(m){ calcModo = m; renderCalculador(); }

function renderCalculador(){
  const el = document.getElementById('calculador-container');
  if(!el) return;
  let optsPront=''; for(let k=4;k<=20;k++){ const H=k/2; optsPront+='<option value="'+H+'">'+String(H).replace('.',',')+' m</option>'; }
  const opts =
    '<optgroup label="Muros escalonados (prontuario)">'+optsPront+'</optgroup>'+
    '<optgroup label="Muros bajos (rectos)"><option value="1.5">1,5 m</option><option value="1">1 metro</option><option value="0.5">0,50 m</option><option value="0.3">0,30 m</option></optgroup>';
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
      '<div style="border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px;background:var(--bg2,#f8fafc)">'+
        '<div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="ti ti-mountain"></i> Generar escalonado por cotas</div>'+
        '<div class="dim" style="font-size:11.5px;margin-bottom:10px">Cimentación entre dos cotas de terreno; altura de muro constante. Calculo los peldaños y relleno los tramos.</div>'+
        '<div class="frow3" style="gap:10px;align-items:flex-end;flex-wrap:wrap">'+
          '<div class="field" style="margin:0"><label>Cota mín. (m)</label><input type="number" id="ct-min" step="0.1" placeholder="Ej. 100"></div>'+
          '<div class="field" style="margin:0"><label>Cota máx. (m)</label><input type="number" id="ct-max" step="0.1" placeholder="Ej. 106"></div>'+
          '<div class="field" style="margin:0"><label>Longitud (m)</label><input type="number" id="ct-long" min="1" step="0.5" placeholder="Ej. 80"></div>'+
          '<div class="field" style="margin:0"><label>Altura muro (m)</label><input type="number" id="ct-alt" min="0.5" step="0.5" placeholder="Ej. 3"></div>'+
          '<div class="field" style="margin:0"><label>Escalón</label><select id="ct-esc"><option value="0.5" selected>0,5 m</option><option value="auto">Auto (peldaños largos)</option><option value="1">1 m</option><option value="1.5">1,5 m</option><option value="2">2 m</option><option value="3">3 m</option></select></div>'+
          '<div class="field" style="margin:0"><label>Sentido</label><select id="ct-sent"><option value="baja">Solo baja</option><option value="sube">Solo sube</option><option value="valle">Baja y sube (valle)</option><option value="monte">Sube y baja (monte)</option></select></div>'+
          '<button class="btn btn-primary btn-sm" onclick="generarPorCotas()"><i class="ti ti-wand"></i> Generar</button>'+
        '</div>'+
      '</div>'+
      '<div class="dim" style="font-size:12px;margin-bottom:10px">O un tramo por línea: <span class="mono">largo x alto</span> (opcional 3er nº = ancho recto; y <span class="mono">/ desnivel</span> = lo que baja al siguiente). Ej. <span class="mono">20 x 4</span>, <span class="mono">16 x 3 / 1</span>, <span class="mono">12 x 2 x 0.5 / 1</span>.</div>'+
      '<div class="frow3" style="gap:10px;align-items:flex-end;margin-bottom:10px">'+
        '<div class="field" style="margin:0"><label>Perfil</label><select id="tr-perfil" onchange="tramoTogglePerfil()"><option value="base">Base corrida</option><option value="esc">Todo escalonado</option></select></div>'+
        '<div class="field" style="margin:0;display:none" id="tr-esc-wrap"><label>Escalón por defecto (m)</label><input type="number" id="tr-esc" min="0" step="0.5" value="1"></div>'+
      '</div>'+
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
  if(calcModo==='tramos') tramoTogglePerfil(); else muroToggleAncho();
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
  if(h < 2) return renderMuroResult(h, L, parseFloat(av)||0.5, res);                          // muros bajos rectos
  if(h === 2 && av && av !== 'pront') return renderMuroResult(2, L, parseFloat(av)||0.5, res); // 2 m recto a 0,50
  return renderMuroResult(h, L, null, res);                                                    // escalonado (incl. ½ m)
}
// Compat: otros caminos aún llaman calcularMuroRecto
function calcularMuroRecto(H, L, ancho, res){ return renderMuroResult(H, L, ancho, res); }

// Render unificado de un muro (escalonado o recto), alturas en pasos de 0,5 m
function renderMuroResult(H, L, ancho, res){
  const d = muroDespiece(H, L, ancho);
  const esc = (d.tipo==='escalonado');
  const fmtm = x=>String(x).replace('.',',');
  const hStr=fmtm(H), aStr=(ancho!=null?fmtm(ancho):null), anchoArg=(ancho!=null?ancho:'null');
  const nH = d.courses.length;

  const despiece = '<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+
    d.piezas.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('')+
    '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones</td><td class="r mono" style="font-weight:700">'+fmtN(d.total)+'</td></tr></tbody></table>';

  const porFila = d.filas.slice().reverse().map(function(f){
    const bandas = f.bandas.map(b=>fmtm(b)).join(' + ')+' m';
    const patStr = f.pat.map(p=>fmtm(p)).join(' · ');
    return '<tr><td class="mono">'+f.course+(f.course===1?' (base)':'')+'</td><td>'+fmtm(f.w)+' m'+(f.h!==1?(' <span class="dim">(h '+fmtm(f.h)+')</span>'):'')+'</td><td class="mono">'+patStr+'</td><td class="dim">'+bandas+'</td></tr>';
  }).join('');

  const titulo = esc ? ('Muro '+hStr+' m alto × '+fmtN(L)+' m largo') : ('Muro recto '+hStr+' m alto × '+aStr+' m ancho × '+fmtN(L)+' m largo');
  const badge = esc ? ('base ≈ '+fmtm(d.base)+' m · talud 5°') : (nH>1?('recto · '+nH+' hiladas'):'muro bajo · 1 hilada');
  const notaRedondeo = (esc && d.designH && Math.abs(H-d.designH)>1e-9)
    ? '<div class="card-body" style="padding:8px 16px 12px;font-size:11.5px;color:var(--amber)"><i class="ti ti-info-circle"></i> Altura '+hStr+' m: se aplica la sección del prontuario de '+d.designH+' m (redondeo al alza) rematada con una hilada de 0,5 m.</div>' : '';

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti '+(esc?'ti-building-bridge':'ti-wall')+'"></i> '+titulo+'</div>'+
        '<div style="display:flex;gap:8px;align-items:center"><span class="badge b-steel">'+badge+'</span>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaSingle('+H+','+L+','+anchoArg+')"><i class="ti ti-file-description"></i> Ficha técnica</button></div></div>'+
      despiece+ notaRedondeo+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+d.granular.toLocaleString('es-ES',{maximumFractionDigits:2})+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-list-numbers"></i> Despiece por hilada</div>'+
      '<span class="dim" style="font-size:11px">de arriba abajo · patrón a lo largo</span></div>'+
      '<table class="tbl"><thead><tr><th>Hilada</th><th>Ancho</th><th>Trabado (a lo largo)</th><th>Bandas (profundidad)</th></tr></thead><tbody>'+porFila+'</tbody></table>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-grid"></i> Trabado de la cara</div>'+
      '<span class="dim" style="font-size:11px">juntas desfasadas</span></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisCaraC(d.courses, L)+muroLeyenda()+
    '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-box-model"></i> Sección y vista 3D</div>'+
      '<button class="btn btn-primary btn-sm" onclick="muro3dSingle('+H+','+L+','+anchoArg+')"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D real</button></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sección (ancho × alto)</div>'+croquisSeccionC(d.courses)+'</div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Vista 3D</div>'+croquis3DC(d.courses, L)+'</div>'+
      '</div>'+
    '</div>';
}

// ── CROQUIS UNIFICADOS (aceptan hiladas: ancho y alto variables) ──
// Alzado de la cara (trabado): largo × alto, cada hilada con su alto (0,5 el remate)
function croquisCaraC(courses, L){
  var uW=Math.max(6, Math.min(26, 640/L)), pxM=22, gap=1.5;
  var H=courses.reduce(function(s,c){return s+c.h;},0);
  var w=Math.ceil(L*uW), hpx=H*pxM, rects='', yAcc=0;
  courses.forEach(function(c){
    var chh=c.h*pxM, y=hpx-(yAcc+c.h)*pxM, x=0;
    muroTramo(L, c.offset).forEach(function(p){ var pw=p*uW, col=muroColorPieza(p);
      rects+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(chh-gap).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>'; x+=pw; });
    yAcc+=c.h;
  });
  return '<svg viewBox="0 0 '+w+' '+Math.ceil(hpx)+'" width="'+Math.min(w,660)+'" style="max-width:100%;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trabado de la cara">'+rects+'</svg>';
}
// Sección transversal (ancho × alto): frente a la izquierda, escalones al terreno
function croquisSeccionC(courses){
  var sc=34, padL=64, padR=64, padT=14, padB=26;
  var base=Math.max.apply(null, courses.map(function(c){return c.w;}));
  var H=courses.reduce(function(s,c){return s+c.h;},0);
  var Wpx=base*sc, Hpx=H*sc, x0=padL, groundY=padT+Hpx, vbW=x0+Wpx+padR, vbH=Hpx+padT+padB, out='', yAcc=0;
  courses.forEach(function(c){
    var y=groundY-(yAcc+c.h)*sc, ww=c.w*sc, hh=c.h*sc;
    out+='<rect x="'+x0+'" y="'+y.toFixed(1)+'" width="'+ww+'" height="'+(hh-1).toFixed(1)+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="1"/>';
    out+='<line x1="'+x0+'" y1="'+(y+hh/2).toFixed(1)+'" x2="'+(x0+ww)+'" y2="'+(y+hh/2).toFixed(1)+'" stroke="#b3a67f" stroke-width="0.5" opacity="0.6"/>';
    if(c.w>1){ out+='<rect x="'+(x0+sc)+'" y="'+y.toFixed(1)+'" width="'+((c.w-1)*sc)+'" height="'+(hh-1).toFixed(1)+'" fill="#fcd34d" opacity="0.35"/>'; }
    yAcc+=c.h;
  });
  out+='<line x1="'+(x0-16)+'" y1="'+groundY+'" x2="'+(x0+Wpx+16)+'" y2="'+groundY+'" stroke="#9c855c" stroke-width="2"/>';
  out+='<text x="'+(padL-42)+'" y="'+(padT+Hpx/2)+'" font-size="11" fill="#334155" text-anchor="middle" transform="rotate(-90 '+(padL-42)+' '+(padT+Hpx/2)+')">FRENTE · '+String(H).replace('.',',')+' m</text>';
  out+='<text x="'+(x0+Wpx+6)+'" y="'+(padT+12)+'" font-size="10" fill="#7c6a45">terreno</text>';
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="11" fill="#334155">base '+String(base).replace('.',',')+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),360)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sección del ancho del muro">'+out+'</svg>';
}
// Vista 3D isométrica del muro (hiladas con ancho/alto variables)
function croquis3DC(courses, L){
  var dcos=0.58, dsin=0.32, padT=14, padR=26, padL=16, padB=24;
  var maxW=Math.max.apply(null, courses.map(function(c){return c.w;}));
  var H=courses.reduce(function(s,c){return s+c.h;},0);
  var scW=(640-padL-padR)/(L+maxW*dcos), scH=(300-padT-padB)/(H+maxW*dsin);
  var sc=Math.max(4, Math.min(48, scW, scH));
  var Lpx=L*sc, depthMax=maxW*sc;
  var vbW=padL+Lpx+depthMax*dcos+padR, vbH=padT+H*sc+depthMax*dsin+padB;
  var x0=padL, groundY=padT+H*sc+depthMax*dsin, out='';
  var bw=courses[0].w*sc, bdx=bw*dcos, bdy=-bw*dsin;
  out+='<polygon points="'+x0+','+groundY+' '+(x0+Lpx)+','+groundY+' '+(x0+Lpx+bdx)+','+(groundY+bdy)+' '+(x0+bdx)+','+(groundY+bdy)+'" fill="#e2d3b3" opacity="0.5"/>';
  var yAcc=0;
  courses.forEach(function(c){
    var ww=c.w*sc, chpx=c.h*sc, dx=ww*dcos, dy=-ww*dsin, topY=groundY-(yAcc+c.h)*sc;
    out+='<polygon points="'+x0+','+topY+' '+(x0+Lpx)+','+topY+' '+(x0+Lpx+dx)+','+(topY+dy)+' '+(x0+dx)+','+(topY+dy)+'" fill="#cabf9d" stroke="#8a7a5c" stroke-width="0.6"/>';
    out+='<polygon points="'+(x0+Lpx)+','+topY+' '+(x0+Lpx)+','+(topY+chpx)+' '+(x0+Lpx+dx)+','+(topY+chpx+dy)+' '+(x0+Lpx+dx)+','+(topY+dy)+'" fill="#b3a67f" stroke="#8a7a5c" stroke-width="0.6"/>';
    var px=x0; muroTramo(L, c.offset).forEach(function(p){ var pw=p*sc, col=muroColorPieza(p); out+='<rect x="'+px.toFixed(1)+'" y="'+topY.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+chpx.toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.7"/>'; px+=pw; });
    yAcc+=c.h;
  });
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="10" fill="#7c6a45">'+fmtN(L)+' m largo · '+String(H).replace('.',',')+' m alto</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),640)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del muro">'+out+'</svg>';
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

function muroAlturaValida(H){ return H===0.3 || (H>=0.5 && H<=10 && Math.abs(H*2 - Math.round(H*2))<1e-9); }
function parseTramos(text, defDrop){
  const tramos=[], errores=[];
  const dd = (defDrop>=0) ? defDrop : 1;
  (text||'').split(/\n/).forEach(function(line, i){
    const s=line.trim(); if(!s) return;
    const parts=s.replace(/,/g,'.').split('/');           // "/ desnivel" al final (opcional)
    const nums=(parts[0].match(/\d+(\.\d+)?/g)||[]).map(Number);
    const dropNums=parts.length>1 ? (parts[1].match(/-?\d+(\.\d+)?/g)||[]).map(Number) : [];  // desnivel puede ser negativo (sube)
    if(nums.length<2){ errores.push('Línea '+(i+1)+' ("'+s+'"): falta largo o alto'); return; }
    const L=nums[0], H=nums[1], ancho=nums.length>=3?nums[2]:null;
    const desnivel=dropNums.length ? dropNums[0] : dd;
    if(!(L>0)){ errores.push('Línea '+(i+1)+': largo inválido'); return; }
    if(!muroAlturaValida(H)){ errores.push('Línea '+(i+1)+': altura '+String(H).replace('.',',')+' no válida (0,3 o de 0,5 en 0,5 hasta 10)'); return; }
    if(ancho!=null && !(ancho===0.3||ancho===0.5||ancho===1)){ errores.push('Línea '+(i+1)+': ancho '+String(ancho).replace('.',',')+' no válido (0,3 / 0,5 / 1)'); return; }
    tramos.push({L:L, H:H, ancho:ancho, desnivel:desnivel, raw:s});
  });
  return {tramos:tramos, errores:errores};
}

// Muestra/oculta el escalón por defecto según el perfil elegido
function tramoTogglePerfil(){
  const sel=document.getElementById('tr-perfil'), w=document.getElementById('tr-esc-wrap');
  if(sel && w) w.style.display = (sel.value==='esc') ? '' : 'none';
}

// Escalonado por cotas: muro CONTINUO. Soleras (hiladas) largas y continuas; el muro
// baja de 0,5 en 0,5 y los gaviones de 0,5 m encajan (traban) un peldaño con el siguiente.
function generarPorCotas(){
  const res=document.getElementById('calc-result');
  const cMin=parseFloat(document.getElementById('ct-min').value);
  const cMax=parseFloat(document.getElementById('ct-max').value);
  const L=parseFloat(document.getElementById('ct-long').value);
  const H=parseFloat(document.getElementById('ct-alt').value);
  const sent=document.getElementById('ct-sent').value;
  if(!(L>0)||!(H>0)||isNaN(cMin)||isNaN(cMax)){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-mountain"></i><p>Rellena cota mín/máx, longitud y altura de muro</p></div>'; return; }
  const esc=0.5, cell=2, N=Math.max(1, Math.round(L/cell));
  const desnivel=Math.abs(cMax-cMin);
  const drop=f=>{ if(sent==='sube')return desnivel*(1-f); if(sent==='valle')return desnivel*(1-Math.abs(2*f-1)); if(sent==='monte')return desnivel*Math.abs(2*f-1); return desnivel*f; };
  // cota de cimentación por columna (cada 2 m), cuantizada a 0,5 → soleras largas
  let base=[]; for(let j=0;j<N;j++) base.push(-Math.round(drop((j+0.5)/N)/esc)*esc);
  const minB=Math.min.apply(null,base); base=base.map(b=>b-minB);
  const fb=base.map(b=>Math.ceil(b-1e-6)), ft=base.map(b=>Math.floor(b+H+1e-6));
  const maxTop=Math.max.apply(null, base.map(b=>b+H));
  // despiece cara frontal: hiladas completas (2×1×1) + medios de encaje (2×1×0,5)
  let cB=0,cH=0;
  for(let y=0;y<Math.round(maxTop);y++) for(let j=0;j<N;j++) if(fb[j]<=y&&y<ft[j]) cB++;
  for(let j=0;j<N;j++){ if(base[j]<fb[j]-1e-6) cH++; if(ft[j]<base[j]+H-1e-6) cH++; }
  const total=cB+cH, granular=cB*2+cH*1;
  // tramos (runs de igual cota) para 3D y ficha
  const tramos=[]; let j=0;
  while(j<N){ let k=j; while(k<N && Math.abs(base[k]-base[j])<1e-9) k++; const nb=(k<N)?base[k]:base[j]; tramos.push({L:(k-j)*cell, H:H, ancho:null, desnivel:base[j]-nb}); j=k; }
  window.__muroTramos={tramos:tramos, perfil:'esc'};
  const fmtm=x=>String(x).replace('.',',');

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-mountain"></i> Muro continuo por cotas · '+fmtN(L)+' m · escalón 0,5 m</div>'+
        '<div style="display:flex;gap:8px;align-items:center"><span class="badge b-steel">desnivel '+fmtm(desnivel)+' m · '+tramos.length+' soleras</span>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaTramos()"><i class="ti ti-file-description"></i> Ficha técnica</button></div></div>'+
      '<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+
        '<tr><td>Gavión <strong>2 m</strong></td><td>2 × 1 × 1 m</td><td class="r mono" style="font-weight:600">'+fmtN(cB)+'</td></tr>'+
        (cH?'<tr><td>Gavión <strong>2 m (½)</strong></td><td>2 × 1 × 0,5 m</td><td class="r mono" style="font-weight:600">'+fmtN(cH)+'</td></tr>':'')+
        '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones (cara frontal)</td><td class="r mono" style="font-weight:700">'+fmtN(total)+'</td></tr>'+
      '</tbody></table>'+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular (cara 1 m ancho)</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+fmtN(granular)+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Alzado continuo (trabado)</div>'+
      '<button class="btn btn-primary btn-sm" onclick="muro3dTramos()"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D real</button></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisPorCotas(base, H, cell)+
      '<div class="dim" style="font-size:11px;margin-top:8px"><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border:1px solid #1d4ed8;vertical-align:middle"></span> 2×1×1 (1 m alto) &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border:1px solid #b45309;vertical-align:middle"></span> 2×1×0,5 (encaje/traba)</div>'+
    '</div></div>';
}

// Alzado continuo por cotas: hiladas continuas (soleras) trabadas; los 0,5 también traban
function croquisPorCotas(base, H, cell){
  const N=base.length;
  const fb=base.map(b=>Math.ceil(b-1e-6)), ft=base.map(b=>Math.floor(b+H+1e-6));
  const maxTop=Math.max.apply(null, base.map(b=>b+H)), Lm=N*cell;
  const xs=Math.max(2, Math.min(14, 900/Lm)), ys=Math.max(8, Math.min(26, 200/maxTop));
  const padL=16,padR=16,padT=14,padB=28, vbW=padL+Lm*xs+padR, vbH=padT+maxTop*ys+padB, groundY=padT+maxTop*ys;
  const X=xm=>padL+xm*xs, Y=ym=>groundY-ym*ys; let out='';
  const piece=(xm,ym,wm,hm,f,s)=>'<rect x="'+X(xm).toFixed(1)+'" y="'+Y(ym+hm).toFixed(1)+'" width="'+(wm*xs).toFixed(1)+'" height="'+(hm*ys).toFixed(1)+'" fill="'+f+'" stroke="'+s+'" stroke-width="0.5"/>';
  function band(x0,x1,ym,hm,f,s){ const off=(Math.floor(ym+1e-6)%2===1); let x=x0; if(off&&x1-x0>=1){ out+=piece(x,ym,1,hm,f,s); x+=1; } while(x+2<=x1+1e-6){ out+=piece(x,ym,2,hm,f,s); x+=2; } if(x<x1-1e-6) out+=piece(x,ym,x1-x,hm,f,s); }
  // hiladas completas de 1 m como bandas continuas (trabadas)
  for(let y=0;y<Math.round(maxTop);y++){ let j=0; while(j<N){ if(fb[j]<=y&&y<ft[j]){ let k=j; while(k<N&&fb[k]<=y&&y<ft[k])k++; band(j*cell,k*cell,y,1,'#3b82f6','#1d4ed8'); j=k; } else j++; } }
  // medios (0,5) de encaje, también como bandas continuas trabadas (abajo y arriba)
  const halfBands=(lvl,has)=>{ let j=0; while(j<N){ if(has(j)){ const v=lvl(j); let k=j; while(k<N&&has(k)&&Math.abs(lvl(k)-v)<1e-6)k++; band(j*cell,k*cell,v,0.5,'#f59e0b','#b45309'); j=k; } else j++; } };
  halfBands(j=>base[j], j=>base[j]<fb[j]-1e-6);
  halfBands(j=>ft[j],   j=>ft[j]<base[j]+H-1e-6);
  // terreno
  let gp=''; for(let j=0;j<N;j++){ gp+=(j?'L':'M')+X(j*cell).toFixed(1)+' '+Y(base[j]).toFixed(1)+' L'+X((j+1)*cell).toFixed(1)+' '+Y(base[j]).toFixed(1)+' '; }
  out+='<path d="'+gp+'" fill="none" stroke="#8a6d3b" stroke-width="1.4"/>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),900)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alzado continuo del muro por cotas">'+out+'</svg>';
}

// Piezas de un tramo (reutiliza el motor: prontuario si ≥2 m y sin ancho; recto en caso contrario)
function muroPiezasTramo(t){
  const d = muroDespiece(t.H, t.L, (t.ancho!=null ? t.ancho : (t.H<2 ? 0.5 : null)));
  return {tipo:d.tipo, piezas:d.piezas, granular:d.granular};
}

function calcularTramos(){
  const res=document.getElementById('calc-result');
  const perfil = (document.getElementById('tr-perfil')||{}).value || 'base';
  const defDrop = parseFloat((document.getElementById('tr-esc')||{}).value);
  const parsed=parseTramos(document.getElementById('tr-text').value, defDrop);
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
  window.__muroTramos = { tramos: parsed.tramos, perfil: perfil };
  const piezasOrden = Object.keys(agg).map(k=>agg[k]).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  const despiece='<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+
    piezasOrden.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('')+
    '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones</td><td class="r mono" style="font-weight:700">'+fmtN(totalGav)+'</td></tr></tbody></table>';
  const porTramo='<table class="tbl"><thead><tr><th>Tramo</th><th>Largo</th><th>Alto</th><th>Tipo</th><th class="r">Gaviones</th><th class="r">Granular</th></tr></thead><tbody>'+
    filasTramo.map(f=>'<tr><td class="mono">'+f.idx+'</td><td>'+fmtN(f.t.L)+' m</td><td>'+fmtm(f.t.H)+' m'+(f.t.ancho!=null?(' · '+fmtm(f.t.ancho)+' ancho'):'')+'</td><td class="dim">'+f.tipo+'</td><td class="r mono">'+fmtN(f.nGav)+'</td><td class="r mono">'+f.granular.toLocaleString('es-ES',{maximumFractionDigits:2})+' m³</td></tr>').join('')+'</tbody></table>';

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-stairs"></i> Muro por tramos · '+fmtN(largoTotal)+' m totales · '+parsed.tramos.length+' tramos</div>'+
        '<div style="display:flex;gap:8px;align-items:center"><span class="badge b-steel">altura máx '+fmtm(hMax)+' m</span>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaTramos()"><i class="ti ti-file-description"></i> Ficha técnica</button></div></div>'+
      despiece+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular total</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+granTotal.toLocaleString('es-ES',{maximumFractionDigits:2})+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-list-numbers"></i> Desglose por tramo</div></div>'+porTramo+'</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Perfil longitudinal (alzado)</div>'+
      '<button class="btn btn-primary btn-sm" onclick="muro3dTramos()"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D real</button></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+(perfil==='esc'?croquisPerfilEscalonado(parsed.tramos):croquisPerfilLongitudinal(parsed.tramos))+'</div></div>'+
    errBlock+
    '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:12px 16px;font-size:12px;color:var(--text2)"><i class="ti ti-info-circle"></i> El despiece es el mismo en ambos perfiles (los tramos van uno al lado de otro y solo traban en la junta). El <strong>ajuste fino del solape</strong> lo puliremos si hace falta.</div></div>';
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

// Alzado "todo escalonado": base y remate bajan; los tramos contiguos se solapan y traban
function croquisPerfilEscalonado(tramos){
  const totalL=tramos.reduce((s,t)=>s+t.L,0);
  // cotas de base acumuladas (cada tramo baja su desnivel hacia el siguiente)
  const base=[0]; for(let i=1;i<tramos.length;i++) base[i]=base[i-1]-(tramos[i-1].desnivel||0);
  let maxE=-1e9, minE=1e9;
  tramos.forEach((t,i)=>{ maxE=Math.max(maxE, base[i]+t.H); minE=Math.min(minE, base[i]); });
  const span=maxE-minE;
  const xs=Math.max(2, Math.min(16, 840/totalL)), ys=Math.max(10, Math.min(24, 200/span));
  const padL=18,padR=18,padT=16,padB=32;
  const Wpx=totalL*xs, vbW=padL+Wpx+padR, vbH=padT+span*ys+padB;
  const Y=e=>padT+(maxE-e)*ys;
  const x0=padL; let out='', x=x0; const xend=[];
  // gaviones por tramo (piezas 2/1,5/1 m coloreadas, trabadas por hilada)
  tramos.forEach(function(t,i){
    const w=t.L*xs; let yc=0;
    // el desfase medio metro entre peldaños (escalón) ya traba las hiladas con el vecino
    muroCourses(t.H, t.ancho).forEach(function(c){
      const yTop=Y(base[i]+yc+c.h); let px=x;
      muroTramo(t.L, c.offset).forEach(function(p){ const pw=p*xs, col=muroColorPieza(p); out+='<rect x="'+px.toFixed(1)+'" y="'+yTop.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+(c.h*ys).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>'; px+=pw; });
      yc+=c.h;
    });
    out+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(Y(base[i]+t.H)-5).toFixed(1)+'" font-size="10" fill="#111827" text-anchor="middle">'+String(t.H).replace('.',',')+' m</text>';
    out+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(Y(minE)+14).toFixed(1)+'" font-size="9" fill="#64748b" text-anchor="middle">'+fmtN(t.L)+' m</text>';
    xend.push(x+w); x+=w;
  });
  // solape entre tramos contiguos (banda compartida de cotas) + terreno escalonado
  for(let i=0;i<tramos.length-1;i++){
    const bx=xend[i], top1=base[i]+tramos[i].H, top2=base[i+1]+tramos[i+1].H;
    const shTop=Math.min(top1, top2), shBot=Math.max(base[i], base[i+1]);
    if(shTop>shBot){ out+='<rect x="'+(bx-6).toFixed(1)+'" y="'+Y(shTop).toFixed(1)+'" width="12" height="'+((shTop-shBot)*ys).toFixed(1)+'" fill="none" stroke="#dc2626" stroke-width="1.3" stroke-dasharray="4 3"/>'; }
    // riser del terreno
    out+='<line x1="'+bx.toFixed(1)+'" y1="'+Y(base[i]).toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+Y(base[i+1]).toFixed(1)+'" stroke="#8a6d3b" stroke-width="1.4" stroke-dasharray="3 2"/>';
  }
  // línea de terreno bajo cada tramo
  let gx=x0; tramos.forEach(function(t,i){ const w=t.L*xs, by=Y(base[i]); out+='<line x1="'+gx.toFixed(1)+'" y1="'+by.toFixed(1)+'" x2="'+(gx+w).toFixed(1)+'" y2="'+by.toFixed(1)+'" stroke="#8a6d3b" stroke-width="1.4"/>'; gx+=w; });
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),860)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Perfil longitudinal escalonado del muro">'+out+'</svg>';
}

// (croquisTrabado/croquisSeccion/croquis3D antiguos sustituidos por croquisCaraC/croquisSeccionC/croquis3DC)
