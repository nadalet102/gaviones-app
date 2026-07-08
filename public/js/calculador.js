// ════════════ CALCULADOR DE MUROS (pestaña oculta, experimental) ════════════
// Basado en el "Prontuario para Muros de Gaviones de Malla Electrosoldada"
// (ARISAC · A. Bedia, Ing. Civil), alturas 2–10 m. Muro escalonado; gaviones
// SIEMPRE con el largo a lo largo del muro (nunca de punta) y trabados (juntas
// desfasadas). Cantidades por metro lineal (el volumen granular por ml = volumen
// de gaviones, verificado). g100=gaviones 1 m ancho de 1 m largo; g200=1 m ancho
// de 2 m largo; g50=gaviones de 0,5 m de ancho (escalones).
const MURO_TABLA = {
  2:  { g100: 2, g200: 0, g50: 0, granular: 2.0,  base: 1.0 },
  3:  { g100: 3, g200: 0, g50: 0, granular: 3.0,  base: 1.0 },
  4:  { g100: 4, g200: 0, g50: 1, granular: 4.5,  base: 1.5 },
  5:  { g100: 4, g200: 1, g50: 1, granular: 6.5,  base: 2.0 },
  6:  { g100: 4, g200: 2, g50: 2, granular: 9.0,  base: 2.5 },
  7:  { g100: 5, g200: 3, g50: 2, granular: 12.0, base: 3.0 },
  8:  { g100: 6, g200: 4, g50: 3, granular: 15.5, base: 3.5 },
  9:  { g100: 6, g200: 6, g50: 3, granular: 19.5, base: 4.0 },
  10: { g100: 6, g200: 8, g50: 4, granular: 24.0, base: 4.5 },
};

// Reparte 'metros' lineales de gavión en piezas de 2 / 1,5 / 1 m priorizando 2 m.
function muroRepartir(metros){
  var u = Math.round(metros*2);              // en medios metros
  var p2 = Math.floor(u/4); u -= p2*4;       // 2 m = 4 medios
  var p15 = Math.floor(u/3); u -= p15*3;     // 1,5 m = 3 medios
  var p1 = Math.floor(u/2); u -= p1*2;       // 1 m = 2 medios
  if(u>0) p1 += 1;                            // 0,5 m sobrante → redondea a 1 m
  return { p2:p2, p15:p15, p1:p1, total:p2+p15+p1 };
}
// Tabica una hilada de longitud L; offset=true la desfasa (empieza con 1 m) para trabar.
function muroTramo(L, offset){
  var p=[], rem=L;
  if(offset && rem>=2){ p.push(1); rem-=1; }
  while(rem>=2){ p.push(2); rem-=2; }
  if(rem>=1.5){ p.push(1.5); rem-=1.5; }
  else if(rem>0.01){ p.push(1); }
  return p;
}
// Cuenta las piezas de N filas de longitud L, alternando el desfase (trabado).
function muroTilarFilas(nFilas, L){
  var a={p2:0,p15:0,p1:0};
  for(var i=0;i<nFilas;i++){
    muroTramo(L, i%2===1).forEach(function(p){ if(p===2)a.p2++; else if(p===1.5)a.p15++; else a.p1++; });
  }
  a.total=a.p2+a.p15+a.p1;
  return a;
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
        '<div class="dim">Materiales por altura y longitud, con trabado (prontuario ARISAC)</div></div>'+
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
      '<div style="margin-top:8px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> Estimación orientativa. '+
      'El reparto de piezas y el trabado se ajustan en obra; casos fuera de estas condiciones requieren cálculo específico.</div>'+
    '</div></div>';
}

function calcularMuro(){
  const h = +document.getElementById('calc-altura').value;
  const L = parseFloat(document.getElementById('calc-long').value)||0;
  const res = document.getElementById('calc-result');
  if(!h || L<=0){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-ruler-measure"></i><p>Introduce la longitud del muro</p></div>'; return; }
  const t = MURO_TABLA[h];
  // Nº de filas (hojas) de gavión por ancho; cada fila se tabica a lo largo (L) con trabado
  const filas1 = t.g100 + 2*t.g200;           // filas de gavión de 1 m de ancho
  const filas05 = t.g50;                       // filas de gavión de 0,5 m de ancho (escalones)
  const metros1 = filas1 * L, metros05 = filas05 * L;
  const r1 = muroTilarFilas(filas1, L), r05 = muroTilarFilas(filas05, L);
  const granular = t.granular * L;

  function bloquePiezas(titulo, sub, r, metros){
    if(metros<=0) return '';
    function li(n, lab){ return n>0 ? '<span style="display:inline-block;margin-right:14px"><strong class="mono">'+fmtN(n)+'</strong> × '+lab+'</span>' : ''; }
    return '<div style="padding:10px 16px;border-bottom:1px solid var(--border)">'+
      '<div style="font-weight:600">'+titulo+' <span class="dim" style="font-weight:400;font-size:11px">— '+sub+' · '+fmtN(metros)+' m lineales</span></div>'+
      '<div style="margin-top:5px;font-size:13px">'+li(r.p2,'2 m')+li(r.p15,'1,5 m')+li(r.p1,'1 m')+
        '<span class="dim" style="font-size:12px">('+fmtN(r.total)+' piezas)</span></div>'+
    '</div>';
  }

  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-building-bridge"></i> Muro '+h+' m alto × '+fmtN(L)+' m largo</div>'+
        '<span class="badge b-steel">base ≈ '+String(t.base).replace('.',',')+' m · talud 5°</span></div>'+
      bloquePiezas('Gaviones de 1 m de ancho','cuerpo del muro (100×100 y 200×100)', r1, metros1)+
      bloquePiezas('Gaviones de 0,5 m de ancho','escalones / retranqueos (Xx50x100)', r05, metros05)+
      '<div class="card-body" style="padding:12px 16px;display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Total gaviones</div><div style="font-size:20px;font-weight:700">'+fmtN(r1.total+r05.total)+'</div></div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular</div><div style="font-size:20px;font-weight:700;color:var(--blue)">'+fmtN(granular)+' m³</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-grid"></i> Trabado de la cara (esquema)</div>'+
      '<span class="dim" style="font-size:11px">hiladas alternadas · juntas desfasadas</span></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisTrabado(h, L)+
      '<div class="dim" style="font-size:11px;margin-top:8px"><span style="display:inline-block;width:12px;height:12px;background:#d8ccb0;border:1px solid #8a7a5c;vertical-align:middle"></span> 2 m &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#e6dcc0;border:1px solid #8a7a5c;vertical-align:middle"></span> 1,5 m &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#fcd34d;border:1px solid #b45309;vertical-align:middle"></span> 1 m</div>'+
    '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-box-model"></i> Sección (ancho) y vista 3D</div>'+
      '<span class="dim" style="font-size:11px">el muro se ensancha hacia la base</span></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:24px;flex-wrap:wrap;align-items:flex-end">'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sección (ancho × alto)</div>'+croquisSeccion(h)+'</div>'+
        '<div><div class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Vista 3D</div>'+croquis3D(h, L)+'</div>'+
      '</div>'+
    '</div></div>';
}

// Perfil de anchos por hilada (de abajo a arriba), escalonado de la base hasta 1 m arriba
function muroPerfilAnchos(H){
  var t=MURO_TABLA[H], base=t.base, nSteps=Math.round((base-1)/0.5), w=[];
  for(var i=0;i<H;i++){
    var red = (H<=1)?0:Math.round(i/(H-1)*nSteps);
    w.push(Math.max(1, base - 0.5*red));
  }
  return w; // bottom→top
}
// Vista del ANCHO (sección transversal): frente a la izquierda, escalones hacia el terreno
function croquisSeccion(H){
  var w=muroPerfilAnchos(H), sc=34, padL=64, padR=70, padT=14, padB=26;
  var base=Math.max.apply(null,w), Wpx=base*sc, Hpx=H*sc;
  var x0=padL, groundY=padT+Hpx, vbW=x0+Wpx+padR, vbH=Hpx+padT+padB, out='';
  for(var i=0;i<H;i++){
    var y=groundY-(i+1)*sc, ww=w[i]*sc;
    out+='<rect x="'+x0+'" y="'+y+'" width="'+ww+'" height="'+(sc-1)+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="1"/>';
    if(w[i]>1){ out+='<rect x="'+(x0+sc)+'" y="'+y+'" width="'+((w[i]-1)*sc)+'" height="'+(sc-1)+'" fill="#fcd34d" opacity="0.4"/>'; }
  }
  out+='<line x1="'+(x0-16)+'" y1="'+groundY+'" x2="'+(x0+Wpx+16)+'" y2="'+groundY+'" stroke="#9c855c" stroke-width="2"/>';
  out+='<text x="'+(padL-40)+'" y="'+(padT+Hpx/2)+'" font-size="11" fill="#334155" text-anchor="middle" transform="rotate(-90 '+(padL-40)+' '+(padT+Hpx/2)+')">FRENTE · '+H+' m</text>';
  out+='<text x="'+(x0+Wpx+6)+'" y="'+(padT+14)+'" font-size="10" fill="#7c6a45">terreno</text>';
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="11" fill="#334155">base '+String(base).replace('.',',')+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),360)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sección del ancho del muro">'+out+'</svg>';
}
// Vista 3D (oblicua) de un tramo del muro escalonado
function croquis3D(H, L){
  var w=muroPerfilAnchos(H), sc=24, seg=Math.min(L,4), Lpx=seg*sc, dcos=0.55, dsin=0.30;
  var maxW=Math.max.apply(null,w), padT=14, padR=20, padL=16, padB=24;
  var vbW=padL+Lpx+maxW*sc*dcos+padR, vbH=padT+H*sc+maxW*sc*dsin+padB;
  var x0=padL, groundY=padT+H*sc+maxW*sc*dsin, out='';
  for(var i=0;i<H;i++){                 // abajo→arriba (painter)
    var ww=w[i]*sc, y=groundY-(i+1)*sc-maxW*sc*dsin+ (maxW*sc*dsin);
    var topY=groundY-(i+1)*sc, dx=ww*dcos, dy=-ww*dsin;
    // cara superior
    out+='<polygon points="'+x0+','+topY+' '+(x0+Lpx)+','+topY+' '+(x0+Lpx+dx)+','+(topY+dy)+' '+(x0+dx)+','+(topY+dy)+'" fill="#c7b998" stroke="#8a7a5c" stroke-width="0.7"/>';
    // cara lateral (extremo)
    out+='<polygon points="'+(x0+Lpx)+','+topY+' '+(x0+Lpx)+','+(topY+sc)+' '+(x0+Lpx+dx)+','+(topY+sc+dy)+' '+(x0+Lpx+dx)+','+(topY+dy)+'" fill="#b3a67f" stroke="#8a7a5c" stroke-width="0.7"/>';
    // cara frontal
    out+='<rect x="'+x0+'" y="'+topY+'" width="'+Lpx+'" height="'+sc+'" fill="#d8ccb0" stroke="#8a7a5c" stroke-width="0.7"/>';
  }
  out+='<text x="'+x0+'" y="'+(groundY+16)+'" font-size="10" fill="#7c6a45">tramo '+fmtN(seg)+' m (de '+fmtN(L)+' m)</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),380)+'" style="max-width:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista 3D del muro">'+out+'</svg>';
}
function croquisTrabado(H, L){
  const uW = Math.max(6, Math.min(26, 640/L)); // px por metro (cap)
  const uH = 20, gap = 1.5;
  const w = Math.ceil(L*uW), hpx = H*uH;
  let rects = '';
  for(let c=0;c<H;c++){                 // c=0 abajo
    const pieces = muroTramo(L, c%2===1);
    let x=0; const y=(H-1-c)*uH;
    pieces.forEach(function(p){
      const pw = p*uW;
      const fill = p===2 ? '#d8ccb0' : p===1.5 ? '#e6dcc0' : '#fcd34d';
      rects += '<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(uH-gap)+'" fill="'+fill+'" stroke="#8a7a5c" stroke-width="0.6"/>';
      x += pw;
    });
  }
  return '<svg viewBox="0 0 '+w+' '+hpx+'" width="'+Math.min(w,660)+'" style="max-width:100%;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Esquema de trabado de la cara del muro">'+rects+'</svg>';
}
