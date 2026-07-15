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
// Sección del prontuario: anchos (profundidad) por hilada, de abajo a arriba, para una altura H.
// Muros <2 m: profundidad 1 m. H≥2: usa MURO_TABLA (base más ancha), la copa siempre 1 m.
function seccionAnchos(H){
  if(H>=2-1e-9){ var dH=Math.min(10, Math.max(2, Math.ceil(H-1e-6))); return muroPerfilAnchos(dH); }
  return [1];
}
// Despiece CON PROFUNDIDAD según el prontuario: recorre cada columna (2 m) del muro por perfil,
// aplica la sección del prontuario según su altura y suma piezas por (largo×ancho×alto) + volumen.
function perfilProntuario(base, crown, cell, N){
  var granular=0, cnt={};
  for(var j=0;j<N;j++){ var Hj=crown[j]-base[j]; if(Hj<=1e-6) continue;
    var anchos=seccionAnchos(Hj), full=Math.floor(Hj+1e-9), half=(Hj-full)>0.25;
    var addCourse=function(k, alto){ var wk=anchos[Math.min(k, anchos.length-1)];
      granular += wk*alto*cell;
      muroBandas(wk).forEach(function(bw){ var key='2|'+bw+'|'+alto; cnt[key]=(cnt[key]||0)+Math.round(cell/2); });
    };
    for(var k=0;k<full;k++) addCourse(k,1);
    if(half) addCourse(full,0.5);
  }
  var piezas=Object.keys(cnt).map(function(key){ var p=key.split('|'); return {largo:+p[0], ancho:+p[1], alto:+p[2], n:cnt[key]}; })
    .sort(function(a,b){ return (b.alto-a.alto)||(b.ancho-a.ancho); });
  return { granular:granular, piezas:piezas, total:piezas.reduce(function(s,p){return s+p.n;},0) };
}
// Tabica una hilada de longitud L con piezas COMPLETAS que suman EXACTO L, MAXIMIZANDO los
// 2 m: el sobrante se resuelve con UNO o DOS remates pequeños (1,5 y/o 1 m) SOLO en las
// puntas (pequeños en las esquinas, centro grande y simétrico). Nunca piezas de 0,5 m.
//   sobra 0   → [2×k]         · desfasada: [1, 2×(k−1), 1]
//   sobra 1   → [2×k, 1]      · desfasada: [1, 2×k]
//   sobra 1,5 → [2×k, 1.5]    · desfasada: [1.5, 2×k]
//   sobra 0,5 → un 1 y un 1,5 repartidos en las puntas: [1, 2×(k−1), 1.5] · desfasada al revés
// El desfase (offset=true) alterna el lado del remate → juntas a matajunta siempre.
function muroTramo(L, offset){
  var u = Math.round(L*2);                 // longitud en medios metros
  if(u < 2) return [];                     // < 1 m no admite pieza válida
  var k = Math.floor(u/4), r = u - k*4;    // k piezas de 2 m; resto en medios (0/1/2/3)
  var p=[], i;
  if(r===0){
    for(i=0;i<k;i++) p.push(2);
    if(!offset) return p;
    if(k===1) return [1,1];                // 2 m justos: el desfase son dos de 1 m
    var q=[1]; for(i=0;i<k-1;i++) q.push(2); q.push(1); return q;
  }
  if(r===2){                               // sobra 1 m → remate de 1 m en la punta
    for(i=0;i<k;i++) p.push(2);
    return offset? [1].concat(p) : p.concat([1]);
  }
  if(r===3){                               // sobra 1,5 m → remate de 1,5 m en la punta
    for(i=0;i<k;i++) p.push(2);
    return offset? [1.5].concat(p) : p.concat([1.5]);
  }
  // r===1: sobra 0,5 → un 1 m y un 1,5 m, uno en cada punta (k−1 de 2 m en medio)
  var mid=[]; for(i=0;i<k-1;i++) mid.push(2);
  return offset? [1.5].concat(mid).concat([1]) : [1].concat(mid).concat([1.5]);
}
function muroAddPieza(acc, p){ if(p===2) acc.p2++; else if(p===1.5) acc.p15++; else acc.p1++; }

// ── NORMA DE COLORES DE GAVIONES ──────────────────────────────────────────────
// El TONO lo da el TIPO (ancho × alto, en cm) y la INTENSIDAD el LARGO
// (200 oscuro · 150 medio · 100 claro):
//   ×100×100 AZUL · ×100×50 VERDE · ×50×100 MARRÓN · ×50×50 AMARILLO ·
//   ×30×100 morado · ×30×50 rosa · cualquier otro, gris.
function colorGavion(largo, ancho, alto){
  const an=Math.round((ancho||1)*100), al=Math.round((alto||1)*100);
  const FAM={
    '100x100':{t:['#1e40af','#3b82f6','#93c5fd'], s:'#1e3a8a'},   // azul
    '100x50' :{t:['#15803d','#22c55e','#86efac'], s:'#14532d'},   // verde
    '50x100' :{t:['#5f3a1c','#96613a','#c99e77'], s:'#3f2512'},   // marrón
    '50x50'  :{t:['#ca8a04','#eab308','#fde047'], s:'#854d0e'},   // amarillo
    '30x100' :{t:['#6d28d9','#8b5cf6','#c4b5fd'], s:'#4c1d95'},   // morado
    '30x50'  :{t:['#be185d','#ec4899','#f9a8d4'], s:'#831843'}    // rosa
  };
  const fam=FAM[an+'x'+al]||{t:['#374151','#6b7280','#d1d5db'], s:'#1f2937'};
  const i=(largo>=2-1e-6)?0:(largo>=1.5-1e-6)?1:2;
  return {f:fam.t[i], s:fam.s};
}
function colorGavionNombre(ancho, alto){
  const an=Math.round((ancho||1)*100), al=Math.round((alto||1)*100);
  return ({'100x100':'azul','100x50':'verde','50x100':'marrón','50x50':'amarillo','30x100':'morado','30x50':'rosa'})[an+'x'+al]||'gris';
}
// (compat) color solo por largo → familia ×100×100
function muroColorPieza(p){ return colorGavion(p, 1, 1); }
function muroLeyenda(){
  const chip=(c,t)=>'<span style="display:inline-block;width:12px;height:12px;background:'+c.f+';border:1px solid '+c.s+';vertical-align:middle"></span> '+t;
  return '<div class="dim" style="font-size:11px;margin-top:8px">Tono = tipo: '+
    chip(colorGavion(1.5,1,1),'×100×100')+' &nbsp; '+chip(colorGavion(1.5,1,0.5),'×100×50')+' &nbsp; '+
    chip(colorGavion(1.5,0.5,1),'×50×100')+' &nbsp; '+chip(colorGavion(1.5,0.5,0.5),'×50×50')+
    ' &nbsp;·&nbsp; Intensidad = largo: '+chip(colorGavion(2,1,1),'200 oscuro')+' '+chip(colorGavion(1.5,1,1),'150 medio')+' '+chip(colorGavion(1,1,1),'100 claro')+'</div>';
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
  if(rem>0.05) b.push(Math.round(rem*100)/100);   // banda estrecha (0,5/0,3) DELANTE
  for(var i=0;i<n;i++) b.push(1);                   // gaviones de 1 m DETRÁS (traban con ella)
  return b;
}
// Despiece unificado: piezas por (largo,ancho,alto), filas por hilada, granular, base.
function muroDespiece(H, L, ancho){
  var courses = muroCourses(H, ancho), map={}, filas=[], granular=0;
  courses.forEach(function(c, idx){
    var bandas = muroBandas(c.w), pats = [];
    bandas.forEach(function(bw, bi){
      // cada banda de profundidad se trabа con la contigua (desfase alterno)
      var off = (c.offset !== (bi%2===1)), pat = muroTramo(L, off);
      pats.push(pat);
      pat.forEach(function(p){
        var key=p+'|'+bw+'|'+c.h;
        if(!map[key]) map[key]={largo:p, ancho:bw, alto:c.h, n:0};
        map[key].n++;
      });
    });
    granular += c.w * c.h;
    filas.push({course:idx+1, w:c.w, h:c.h, offset:c.offset, pat:pats[0], pats:pats, bandas:bandas});
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
    '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+btn('simple','<i class="ti ti-wall"></i> Un muro')+btn('tramos','<i class="ti ti-stairs"></i> Por tramos (pendiente)')+btn('ele','<i class="ti ti-vector-triangle"></i> En L / U (esquinas)')+'</div>';

  const formEle =
    '<div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:16px">'+
      '<div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="ti ti-vector-triangle"></i> Muro en L / U — dibuja el recorrido</div>'+
      '<div class="dim" style="font-size:11.5px;margin-bottom:10px">Haz <strong>clic en la cuadrícula</strong> para ir extendiendo el muro (las esquinas salen a 90° solas). Fija la altura por defecto y se aplica a todo lo que dibujes (luego puedes afinar cada tramo en la tabla).</div>'+
      '<div class="frow3" style="gap:12px;align-items:flex-end;margin-bottom:10px;flex-wrap:wrap">'+
        '<div class="field" style="margin:0"><label>Altura por defecto (m)</label><input type="number" id="el-alt-def" min="0.5" step="0.5" value="'+((window.__eleH)||3)+'" style="width:110px" oninput="eleSetH(this.value)"></div>'+
        '<div class="field" style="margin:0"><label>Ancho del gavión</label><select id="el-ancho" style="width:210px" onchange="eleSetAncho(this.value)">'+
          '<option value=""'+(!window.__eleAncho?' selected':'')+'>Prontuario (auto según altura)</option>'+
          '<option value="1"'+(window.__eleAncho===1?' selected':'')+'>1 m (recto)</option>'+
          '<option value="0.5"'+(window.__eleAncho===0.5?' selected':'')+'>0,50 m</option>'+
          '<option value="0.3"'+(window.__eleAncho===0.3?' selected':'')+'>0,30 m</option>'+
        '</select></div>'+
        '<div class="field" style="margin:0"><label>Ensanche de la base</label><select id="el-cara" style="width:250px" onchange="eleSetCara(this.value)" title="Solo afecta cuando la base es más ancha que 1 m (sección del prontuario)">'+
          '<option value="int"'+(window.__eleCara!=='ext'?' selected':'')+'>Hacia dentro (cara vista lisa)</option>'+
          '<option value="ext"'+(window.__eleCara==='ext'?' selected':'')+'>Hacia fuera (la base sobresale)</option>'+
        '</select></div>'+
      '</div>'+
      '<div id="ele-grid"></div>'+
      '<div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-outline btn-sm" onclick="eleUndo()"><i class="ti ti-arrow-back-up"></i> Deshacer</button>'+
        '<button class="btn btn-outline btn-sm" onclick="eleClear()"><i class="ti ti-eraser"></i> Vaciar</button>'+
        '<button class="btn btn-outline btn-sm" onclick="eleEjemploL()">Ejemplo L</button>'+
        '<button class="btn btn-outline btn-sm" onclick="eleEjemploU()">Ejemplo U</button>'+
      '</div>'+
      '<div id="ele-seg"></div>'+
      '<div style="margin-top:12px"><button class="btn btn-primary" onclick="eleCalcular()"><i class="ti ti-calculator"></i> Calcular muro en L/U</button></div>'+
    '</div></div>';

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
        '<div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="ti ti-mountain"></i> Generar muro escalonado</div>'+
        '<div class="dim" style="font-size:11.5px;margin-bottom:10px">Da la cota del terreno al inicio y al final, el largo y la altura del muro. Yo trazo las líneas y relleno el hueco con gaviones (0,5 m, trabados).</div>'+
        '<div class="frow3" style="gap:10px;align-items:flex-end;flex-wrap:wrap">'+
          '<div class="field" style="margin:0"><label>Cota inicio (m)</label><input type="number" id="cs-ini" step="0.1" placeholder="0"></div>'+
          '<div class="field" style="margin:0"><label>Cota fin (m)</label><input type="number" id="cs-fin" step="0.1" placeholder="10"></div>'+
          '<div class="field" style="margin:0"><label>Longitud (m)</label><input type="number" id="cs-long" min="1" step="0.5" placeholder="88"></div>'+
          '<div class="field" style="margin:0"><label>Altura muro (m)</label><input type="number" id="cs-alt" min="0.5" step="0.5" placeholder="3"></div>'+
          '<button class="btn btn-primary btn-sm" onclick="generarPorCotasSimple()"><i class="ti ti-wand"></i> Generar</button>'+
        '</div>'+
        '<details style="margin-top:10px"><summary style="font-size:11.5px;cursor:pointer;color:var(--text2)">Perfil personalizado (terreno con vaguadas/montículos)</summary>'+
          '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-top:8px">'+
            '<div class="field" style="margin:0;flex:1;min-width:170px"><label>Rasante (calle) · dist cota</label><textarea id="tp-rasante" rows="3" placeholder="0 3&#10;88 13" style="width:100%;font-family:var(--mono,monospace);font-size:13px;padding:8px;border:1px solid var(--border);border-radius:6px;resize:vertical"></textarea></div>'+
            '<div class="field" style="margin:0;flex:1;min-width:170px"><label>Terreno (cimentación) · dist cota</label><textarea id="tp-terreno" rows="3" placeholder="0 0&#10;44 -3&#10;88 10" style="width:100%;font-family:var(--mono,monospace);font-size:13px;padding:8px;border:1px solid var(--border);border-radius:6px;resize:vertical"></textarea></div>'+
            '<button class="btn btn-outline btn-sm" onclick="generarPorPerfil()"><i class="ti ti-wand"></i> Generar perfil</button>'+
          '</div>'+
        '</details>'+
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
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-outline btn-sm" onclick="muroHistToggle()"><i class="ti ti-history"></i> Historial (<span id="hist-n">'+((window.__histN!=null)?window.__histN:'…')+'</span>)</button>'+
        '<button class="btn btn-outline btn-sm" onclick="switchTab(\'dash\')"><i class="ti ti-arrow-left"></i> Volver al panel</button>'+
      '</div>'+
    '</div>'+
    '<div class="frow3" style="gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:flex-end">'+
      '<div class="field" style="margin:0;flex:1;min-width:180px"><label>Obra (para la ficha)</label><input id="fk-obra" value="'+((window.__fichaMeta&&window.__fichaMeta.obra)||'')+'" oninput="fichaSetMeta()" placeholder="Ej. Mancomunidad Alto Henares"></div>'+
      '<div class="field" style="margin:0;flex:1;min-width:180px"><label>Cliente (para la ficha)</label><input id="fk-cliente" value="'+((window.__fichaMeta&&window.__fichaMeta.cliente)||'')+'" oninput="fichaSetMeta()" placeholder="Nombre del cliente"></div>'+
      '<div id="calc-save-bar" style="display:flex;gap:6px;flex-wrap:wrap">'+saveBarHTML()+'</div>'+
    '</div>'+
    '<div id="calc-hist"></div>'+
    toggle+
    (calcModo==='ele' ? formEle : calcModo==='tramos' ? formTramos : formSimple)+
    '<div id="calc-result"></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-body" style="padding:14px 16px;font-size:12px;color:var(--text2)">'+
      '<div style="font-weight:600;color:var(--text);margin-bottom:6px"><i class="ti ti-info-circle"></i> Condiciones de diseño del prontuario</div>'+
      'Trasdós granular drenante (Ø=30°, γ=17,38 kN/m³, Ka=0,33) · Sin sobrecarga · Sin nivel freático · '+
      'Cimentación 5° sobre hormigón de limpieza · Relleno 1.600 kg/m³ · Talud 5°.'+
      '<div style="margin-top:8px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> Estimación orientativa; el trabado y el reparto se ajustan en obra.</div>'+
    '</div></div>';
  if(calcModo==='tramos') tramoTogglePerfil(); else if(calcModo==='ele') eleGridRedraw(); else muroToggleAncho();
  muroHistCount();
  if(window.__histAbierto) renderHistorialMuros();
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
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge b-steel">'+badge+'</span>'+
        '<button class="btn btn-outline btn-sm" onclick="planoFilas('+H+','+L+','+anchoArg+')"><i class="ti ti-stack-2"></i> Plano por hiladas</button>'+
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
  var H=courses.reduce(function(s,c){return s+c.h;},0);
  var sc=Math.max(12, Math.min(30, 220/H)), gap=1.5;   // MISMA escala X/Y (proporción real)
  var w=Math.ceil(L*sc), hpx=H*sc, rects='', yAcc=0;
  courses.forEach(function(c){
    var chh=c.h*sc, y=hpx-(yAcc+c.h)*sc, x=0, fb=muroBandas(c.w)[0];   // la cara muestra la banda FRONTAL
    muroTramo(L, c.offset).forEach(function(p){ var pw=p*sc, col=colorGavion(p, fb, c.h);
      rects+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(chh-gap).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>'; x+=pw; });
    yAcc+=c.h;
  });
  return '<svg viewBox="0 0 '+w+' '+Math.ceil(hpx)+'" width="'+w+'" height="'+Math.ceil(hpx)+'" style="display:block;border:1px solid var(--border);border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trabado de la cara">'+rects+'</svg>';
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
    var px=x0, fb=muroBandas(c.w)[0]; muroTramo(L, c.offset).forEach(function(p){ var pw=p*sc, col=colorGavion(p, fb, c.h); out+='<rect x="'+px.toFixed(1)+'" y="'+topY.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+chpx.toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.7"/>'; px+=pw; });
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

// ── POR PERFIL: rasante (arriba) + terreno (abajo) por puntos "distancia cota" ──
function parsePerfil(text){
  const pts=[];
  (text||'').split(/\n/).forEach(function(l){ const s=l.trim(); if(!s) return; const n=(s.replace(/,/g,'.').match(/-?\d+(\.\d+)?/g)||[]).map(Number); if(n.length>=2) pts.push({d:n[0], c:n[1]}); });
  pts.sort(function(a,b){return a.d-b.d;});
  return pts;
}
function interpPerfil(pts, x){
  if(!pts.length) return 0;
  if(x<=pts[0].d) return pts[0].c;
  if(x>=pts[pts.length-1].d) return pts[pts.length-1].c;
  for(var i=1;i<pts.length;i++){ if(x<=pts[i].d){ const a=pts[i-1],b=pts[i]; return a.c+(b.c-a.c)*(x-a.d)/(b.d-a.d); } }
  return pts[pts.length-1].c;
}
// Forma sencilla: cota inicio, cota fin, longitud, altura → crea las dos líneas rectas
function generarPorCotasSimple(){
  const res=document.getElementById('calc-result');
  const ci=parseFloat(document.getElementById('cs-ini').value);
  const cf=parseFloat(document.getElementById('cs-fin').value);
  const L=parseFloat(document.getElementById('cs-long').value);
  const H=parseFloat(document.getElementById('cs-alt').value);
  if(isNaN(ci)||isNaN(cf)||!(L>0)||!(H>0)){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-mountain"></i><p>Rellena cota inicio, cota fin, longitud y altura</p></div>'; return; }
  const ter=[{d:0,c:ci},{d:L,c:cf}];              // terreno recto inicio→fin
  const ras=[{d:0,c:ci+H},{d:L,c:cf+H}];          // rasante = terreno + altura
  muroPorPerfil(ras, ter, res);
}
// Forma avanzada: perfil por puntos (rasante y terreno)
function generarPorPerfil(){
  const res=document.getElementById('calc-result');
  const ras=parsePerfil(document.getElementById('tp-rasante').value);
  const ter=parsePerfil(document.getElementById('tp-terreno').value);
  if(ras.length<2 || ter.length<2){ if(res) res.innerHTML='<div class="empty"><i class="ti ti-mountain"></i><p>Da al menos 2 puntos "distancia cota" en la rasante y en el terreno</p></div>'; return; }
  muroPorPerfil(ras, ter, res);
}
// Núcleo: interpola las dos líneas, rellena el hueco con gaviones (con estado editable)
// Motor puro: de las dos líneas (rasante/terreno) devuelve el estado del muro (sin tocar globals)
// edges (opcional): bordes de columna en metros [0,...,L]. Sin él, columnas de 2 m (la última
// absorbe la fracción, como siempre). Con él (rectas L/U de varios tramos), las columnas se
// CORTAN EXACTO en cada junta de tramo → los medios metros (6,5 · 9,5…) no se redondean.
function perfilCalc(ras, ter, edges, hardX){
  const cell=2, L=Math.max(ras[ras.length-1].d, ter[ter.length-1].d);
  if(!edges){ const n=Math.max(1, Math.round(L/cell)); edges=[]; for(let k=0;k<n;k++) edges.push(k*cell); edges.push(L); }
  const N=edges.length-1;
  let rasReal=[], terReal=[], base=[], crown=[];
  for(let j=0;j<N;j++){ const x=(edges[j]+edges[j+1])/2; const r=interpPerfil(ras,x), t=interpPerfil(ter,x);
    rasReal.push(r); terReal.push(t);
    // Pass de 7 cm: si por ≤7 cm no se llega al siguiente medio metro, NO se sube de hilada.
    let b=Math.floor(t/0.5+1e-6)*0.5, cr=Math.ceil((r-0.07)/0.5-1e-6)*0.5; if(cr<b+0.5) cr=b+0.5;
    base.push(b); crown.push(cr);
  }
  const minB=Math.min.apply(null,base);
  base=base.map(b=>b-minB); crown=crown.map(c=>c-minB);
  const rr=rasReal.map(v=>v-minB), tt=terReal.map(v=>v-minB);
  const piezas=porCotasPiezas(base, crown, edges, hardX);
  return {base:base, crown:crown, cell:cell, N:N, L:L, edges:edges, rr:rr, tt:tt, piezas:piezas, removed:new Set()};
}
function muroPorPerfil(ras, ter, res){
  window.__perfil=perfilCalc(ras, ter);
  window.__perfilSel=null;
  window.__perfilRes=res;
  window.__perfilInput={ras:ras, ter:ter, res:res};   // para recalcular al cambiar de modo
  renderPerfilResult();
}
// Lista de piezas del relleno: tabicado EXACTO (sin solapes). Running bond: las hiladas
// alternan el desfase; el 1 m sale solo de remate en los extremos de cada hilada. Nunca
// se monta una pieza encima de otra.
function porCotasPiezas(base, crown, edges, hardX){
  const trabar = true;   // el muro va SIEMPRE trabado (matajunta); rincones de escalón en 2 m y 1 m solo en las puntas
  const N=edges.length-1, L=edges[N];
  // hardX: juntas de TRAMO (rectas L/U). El plano del cambio de altura debe caer EXACTO en la
  // junta: la conversión de rincón a pieza de 2 m no puede cruzarla (ni subir por encima de la
  // coronación del tramo vecino ni profundizar su base). Ahí el remate se queda en 1 m.
  const cruzaJunta = x0 => !!(hardX && hardX.some(J => x0 < J-1e-6 && x0+2 > J+1e-6));
  const fb=base.map(b=>Math.ceil(b-1e-6)), ct=crown.map(c=>Math.floor(c+1e-6));
  const maxTop=Math.max.apply(null,crown), piezas=[];
  // Trabado (trabar=true): hiladas de 1 m con fase global por paridad de y (pares alineadas,
  // impares desfasadas 1 m) → matajunta; los únicos 1 m son las medias-piezas del borde.
  // Todo 2 m (trabar=false): todas las hiladas alineadas → CERO piezas de 1 m (pero juntas
  // verticales seguidas). Franjas medias (0,5): siempre alineadas de 2 m.
  const addBand=(x0,x1,ym,alto,off)=>{ let x=x0; muroTramo(x1-x0, off).forEach(p=>{ piezas.push({x:x, y:ym, largo:p, alto:alto}); x+=p; }); };
  // TODAS las bandas (hiladas enteras Y franjas de 0,5) sobre REJILLA GLOBAL de 2 m con fase
  // por paridad del nivel (cortes en x ≡ paridad mod 2): las juntas de niveles contiguos —y
  // las de las bandas de profundidad, que van a fase+1— NUNCA coinciden, arranque donde
  // arranque cada banda. Remates de 1/1,5 m solo en los extremos.
  const addBandGrid=(x0,x1,ym,alto)=>{
    if(typeof eleTileGrid==='function' && x1-x0>0.99)
      eleTileGrid(x0, x1, (Math.floor(ym+1e-6)%2===1)?1:0).forEach(pc=>{ piezas.push({x:pc.x0, y:ym, largo:pc.l, alto:alto}); });
    else addBand(x0,x1,ym,alto,(trabar&&Math.floor(ym+1e-6)%2===1));
  };
  for(let y=0;y<Math.round(maxTop);y++){ let j=0; while(j<N){ if(fb[j]<=y&&y<ct[j]){ let k=j; while(k<N&&fb[k]<=y&&y<ct[k])k++; addBandGrid(edges[j],edges[k],y,1); j=k; } else j++; } }
  const halfRun=(lvl,has)=>{ let j=0; while(j<N){ if(has(j)){ const v=lvl(j); let k=j; while(k<N&&has(k)&&Math.abs(lvl(k)-v)<1e-6)k++; addBandGrid(edges[j],edges[k],v,0.5); j=k; } else j++; } };
  halfRun(j=>base[j], j=>base[j]<fb[j]-1e-6);
  halfRun(j=>ct[j], j=>ct[j]<crown[j]-1e-6);
  // Rincón de escalón con gavión ENTERO (modo trabado): el remate de 1 m (1×1) que cierra una
  // hilada en un escalón —de base (abajo) o de coronación (arriba)— se convierte en 2×1 y los
  // medios (0,5) de ese escalón se re-tabican desplazados. En base se profundiza 0,5 m la
  // cimentación; en coronación se sube 0,5 m por encima de la rasante. Los remates de las
  // PUNTAS del muro (inicio/final) se dejan en 1 m (el 2 m se saldría del muro). Sin huecos ni
  // solapes (verificado). No baja el nº de piezas, pero deja los rincones con pieza entera.
  const Lw=L;
  const vec=(x,y,d)=>piezas.some(q=>q&&q.alto===1&&Math.abs(q.y-y)<1e-6&&(d>0?Math.abs(q.x-(x+1))<1e-6:Math.abs((q.x+q.largo)-x)<1e-6));
  if(trabar) piezas.filter(p=>p&&p.largo===1&&p.alto===1).forEach(P=>{
    const x=P.x, y=P.y, izq=vec(x,y,-1), der=vec(x,y,1);
    let dir=0; if(izq&&!der) dir=1; else if(der&&!izq) dir=-1; else return;   // remate de un solo lado
    if(dir<0 && x-1<-1e-6) return;            // remate de INICIO del muro → se deja en 1 m
    if(dir>0 && x+2>Lw+1e-6) return;          // remate de FINAL del muro → se deja en 1 m
    if(cruzaJunta(dir>0 ? x : x-1)) return;   // el 2 m cruzaría una junta de TRAMO → se deja en 1 m
    // run de medios contiguos en el lado abierto, a nivel y+0,5 (escalón de base) o y (coronación).
    // El re-tabicado de los medios va EN LA REJILLA GLOBAL del nivel (fase por paridad), no a
    // saltos desde el rincón: si no, sus juntas podían calcar las de la hilada vecina.
    const faseNivel=lvl=>((Math.floor(lvl+1e-6)%2===1)?1:0);
    const retilea=(a,b,lvl)=>{
      if(b-a<=1e-6) return [];
      if(typeof eleTileGrid==='function' && b-a>0.99)
        return eleTileGrid(a, b, faseNivel(lvl)).map(pc=>({x:pc.x0, y:lvl, largo:pc.l, alto:0.5}));
      return null;   // región de 0,5 m (o sin rejilla): no se puede re-tabicar limpio
    };
    for(const lvl of [y+0.5, y]){
      const medios=piezas.filter(q=>q&&q.alto===0.5&&Math.abs(q.y-lvl)<1e-6);
      const chain=[];
      if(dir>0){ let e=x+1; medios.filter(q=>q.x>=x+1-1e-6).sort((a,b)=>a.x-b.x).forEach(q=>{ if(Math.abs(q.x-e)<1e-6){ chain.push(q); e=q.x+q.largo; } });
        if(!chain.length) continue; const end=e;
        const nuevas=retilea(x+2, end, lvl); if(nuevas===null) continue;   // no convertible limpio
        piezas[piezas.indexOf(P)]={x:x, y:y, largo:2, alto:1};
        chain.forEach(q=>{ piezas[piezas.indexOf(q)]=null; });
        nuevas.forEach(t=>piezas.push(t));
        return;
      } else { let s=x; medios.filter(q=>q.x+q.largo<=x+1e-6).sort((a,b)=>b.x-a.x).forEach(q=>{ if(Math.abs((q.x+q.largo)-s)<1e-6){ chain.push(q); s=q.x; } });
        if(!chain.length) continue; const st=s;
        const nuevas=retilea(st, x-1, lvl); if(nuevas===null) continue;
        piezas[piezas.indexOf(P)]={x:x-1, y:y, largo:2, alto:1};
        chain.forEach(q=>{ piezas[piezas.indexOf(q)]=null; });
        nuevas.forEach(t=>piezas.push(t));
        return;
      }
    }
  });
  return piezas.filter(Boolean);
}
// Sección del muro (profundidad × altura) según el prontuario: base ancha que estrecha hacia
// arriba. cara='int' (defecto): cara vista lisa a la izquierda y ensanche hacia dentro.
// cara='ext': trasera enrasada; el ensanche SOBRESALE → la cara (izquierda) va escalonada.
function croquisSeccionPront(H, cara){
  const anchos=seccionAnchos(H), nH=anchos.length, maxW=Math.max.apply(null,anchos);
  const fm=x=>String(Math.round(x*100)/100).replace('.',',');   // fmtN redondea a entero y convertía el 1,5 en «2»
  const ext=(cara==='ext');
  const sc=Math.max(12, Math.min(26, 150/Math.max(nH,maxW)));
  const pad=18, vbW=pad*2+maxW*sc+28, vbH=pad*2+nH*sc;
  const X=x=>pad+x*sc, Y=k=>pad+(nH-k)*sc;   // k desde abajo
  let out='';
  for(let k=0;k<nH;k++){ const w=anchos[k], x0=ext?(maxW-w):0;
    out+='<rect x="'+X(x0).toFixed(1)+'" y="'+Y(k+1).toFixed(1)+'" width="'+(w*sc).toFixed(1)+'" height="'+sc.toFixed(1)+'" fill="#3b82f6" fill-opacity="0.4" stroke="#1d4ed8" stroke-width="1"/>';
    out+='<text x="'+(X(x0+w)+4).toFixed(1)+'" y="'+(Y(k)-sc/2+3).toFixed(1)+'" font-size="9" fill="#0f172a" style="paint-order:stroke;stroke:#fff;stroke-width:2px">'+fm(w)+' m</text>';
  }
  if(ext){   // cara escalonada: baja por el frente de cada hilada, de arriba a la base
    let d='M'+X(maxW-anchos[nH-1]).toFixed(1)+' '+Y(nH).toFixed(1)+' ';
    for(let k=nH-1;k>=0;k--){ const xk=X(maxW-anchos[k]);
      d+='L'+xk.toFixed(1)+' '+Y(k).toFixed(1)+' ';
      if(k>0) d+='L'+X(maxW-anchos[k-1]).toFixed(1)+' '+Y(k).toFixed(1)+' ';
    }
    out+='<path d="'+d+'" fill="none" stroke="#dc2626" stroke-width="2.2"/>';
    out+='<text x="'+X(maxW-anchos[nH-1]).toFixed(1)+'" y="'+(Y(nH)-4).toFixed(1)+'" font-size="9" fill="#dc2626" text-anchor="middle">cara</text>';
  } else {
    out+='<line x1="'+X(0).toFixed(1)+'" y1="'+Y(0).toFixed(1)+'" x2="'+X(0).toFixed(1)+'" y2="'+Y(nH).toFixed(1)+'" stroke="#dc2626" stroke-width="2.2"/>';
    out+='<text x="'+X(0).toFixed(1)+'" y="'+(Y(nH)-4).toFixed(1)+'" font-size="9" fill="#dc2626" text-anchor="middle">cara</text>';
  }
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sección del muro (prontuario)">'+out+'</svg>';
}
function renderPerfilResult(){
  const st=window.__perfil, res=window.__perfilRes; if(!st||!res) return;
  const tramos=[]; let j=0;
  while(j<st.N){ let k=j; while(k<st.N && Math.abs(st.base[k]-st.base[j])<1e-9 && Math.abs(st.crown[k]-st.crown[j])<1e-9) k++; tramos.push({L:(k-j)*st.cell, H:st.crown[j]-st.base[j], ancho:null, desnivel:st.base[j]-((k<st.N)?st.base[k]:st.base[j])}); j=k; }
  window.__muroTramos={tramos:tramos, perfil:'esc'};
  const pr=perfilProntuario(st.base, st.crown, st.cell, st.N), Hmax=Math.max.apply(null,st.crown);
  const fmtm2=x=>String(Math.round(x*100)/100).replace('.',',');
  const prFilas=pr.piezas.map(p=>'<tr><td>Gavión <strong>'+fmtm2(p.largo)+'×'+fmtm2(p.ancho)+'×'+fmtm2(p.alto)+' m</strong></td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('');
  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-mountain"></i> Muro por perfil · '+fmtN(st.L)+' m</div>'+
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge b-amber" id="perfil-quitados">0 quitados</span>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaPerfil()"><i class="ti ti-file-description"></i> Ficha técnica</button></div></div>'+
      '<div id="perfil-desp"></div>'+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Gaviones cara frontal · granular (cara 1 m)</span> '+
        '<strong id="perfil-gran" style="font-size:18px;color:var(--blue);margin-left:6px">—</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-distribute-horizontal"></i> Sección y material real (prontuario ARISAC)</div>'+
      '<span class="dim">'+fmtN(pr.granular)+' m³ · '+fmtN(pr.total)+' gaviones</span></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">'+
        '<div><div class="dim" style="font-size:11px;margin-bottom:4px">Sección a la altura máx. ('+fmtN(Hmax)+' m)</div>'+croquisSeccionPront(Hmax)+'</div>'+
        '<div style="flex:1;min-width:240px"><table class="tbl"><thead><tr><th>Pieza (largo×ancho×alto)</th><th class="r">Uds</th></tr></thead><tbody>'+prFilas+
          '<tr style="border-top:2px solid var(--border)"><td style="font-weight:600">Total (con profundidad)</td><td class="r mono" style="font-weight:700">'+fmtN(pr.total)+'</td></tr></tbody></table>'+
          '<div class="dim" style="font-size:11px;margin-top:6px">A más altura, la base ensancha (prontuario): añade bandas de profundidad detrás de la cara. Volumen granular real = <strong>'+fmtN(pr.granular)+' m³</strong>.</div></div>'+
      '</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Alzado · toca un gavión para editarlo o eliminarlo</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<button class="btn btn-outline btn-sm" onclick="perfilRestablecerTodo()"><i class="ti ti-refresh"></i> Restablecer</button>'+
      '<button class="btn btn-primary btn-sm" onclick="muro3dTramos()"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D real</button></div></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisPorCotasInter(st)+
      '<div id="perfil-edit"></div>'+
      '<div class="dim" style="font-size:11px;margin-top:8px"><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border:1px solid #1d4ed8;vertical-align:middle"></span> 1 m alto &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border:1px solid #b45309;vertical-align:middle"></span> 0,5 m &nbsp; '+
      '<span style="display:inline-block;width:16px;height:0;border-top:2px solid #dc2626;vertical-align:middle"></span> rasante &nbsp; '+
      '<span style="display:inline-block;width:16px;height:0;border-top:2px solid #8a6d3b;vertical-align:middle"></span> terreno &nbsp;·&nbsp; toca un gavión para editar largo/alto o eliminarlo</div>'+
    '</div></div>';
  perfilActualizarTotales();
  perfilRenderEdit();
}
// Panel de edición del gavión seleccionado (largo/alto, eliminar/restaurar)
function perfilRenderEdit(){
  const st=window.__perfil, box=document.getElementById('perfil-edit'); if(!box) return;
  const i=window.__perfilSel;
  if(i==null || !st || !st.piezas[i]){ box.innerHTML=''; return; }
  const p=st.piezas[i], rem=st.removed.has(i), fmtm=x=>String(x).replace('.',',');
  box.innerHTML='<div style="margin-top:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2,#f8fafc);display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">'+
    '<div style="font-weight:600;font-size:12px;align-self:center">Gavión: <span class="mono">'+fmtm(p.largo)+'×1×'+fmtm(p.alto)+' m</span></div>'+
    '<div class="field" style="margin:0"><label style="font-size:11px">Largo (m)</label><input type="number" id="ed-largo" min="0.5" step="0.5" value="'+p.largo+'" style="width:84px" onkeydown="if(event.key===\'Enter\')perfilEditAplicar()"></div>'+
    '<div class="field" style="margin:0"><label style="font-size:11px">Alto (m)</label><select id="ed-alto"><option value="1"'+(p.alto===1?' selected':'')+'>1</option><option value="0.5"'+(p.alto===0.5?' selected':'')+'>0,5</option></select></div>'+
    '<button class="btn btn-primary btn-sm" onclick="perfilEditAplicar()"><i class="ti ti-check"></i> Aplicar</button>'+
    '<button class="btn btn-outline btn-sm" onclick="perfilEditEliminar()">'+(rem?'<i class="ti ti-arrow-back-up"></i> Restaurar':'<i class="ti ti-trash"></i> Eliminar')+'</button>'+
    '<button class="btn btn-outline btn-sm" onclick="perfilEditCerrar()">Cerrar</button>'+
  '</div>';
}
function perfilSelect(i){ window.__perfilSel=i; renderPerfilResult(); }
function perfilEditCerrar(){ window.__perfilSel=null; renderPerfilResult(); }
function perfilRestablecerTodo(){ const st=window.__perfil; if(!st) return; st.removed.clear(); window.__perfilSel=null; renderPerfilResult(); }
function perfilEditEliminar(){ const st=window.__perfil, i=window.__perfilSel; if(!st||i==null) return; if(st.removed.has(i)) st.removed.delete(i); else st.removed.add(i); renderPerfilResult(); }
function perfilEditAplicar(){ const st=window.__perfil, i=window.__perfilSel; if(!st||i==null||!st.piezas[i]) return;
  const p=st.piezas[i];
  let l=parseFloat(document.getElementById('ed-largo').value), a=parseFloat(document.getElementById('ed-alto').value);
  if(Math.abs(a-1)<1e-6||Math.abs(a-0.5)<1e-6) p.alto=a;
  if(l>0){ l=Math.round(l*2)/2; const delta=l-p.largo;
    if(delta>1e-6){   // al crecer se extiende hacia el LADO LIBRE (sin pisar al vecino)
      const ov=(r,q)=>Math.min(r.x+r.largo,q.x+q.largo)-Math.max(r.x,q.x)>1e-6 && Math.min(r.y+r.alto,q.y+q.alto)-Math.max(r.y,q.y)>1e-6;
      const libre=r=>!st.piezas.some((q,qi)=>qi!==i&&q&&!st.removed.has(qi)&&ov(r,q));
      const dcha={x:p.x+p.largo, y:p.y, largo:delta, alto:p.alto};   // hueco a la derecha
      const izda={x:p.x-delta,   y:p.y, largo:delta, alto:p.alto};   // hueco a la izquierda
      if(libre(dcha)) p.largo=l;                                     // derecha libre → crece a la derecha
      else if(p.x-delta>=-1e-6 && libre(izda)){ p.x=p.x-delta; p.largo=l; }   // si no, izquierda libre → crece a la izquierda
      else p.largo=l;                                               // ambos ocupados → crece a la derecha
    } else p.largo=l;   // al encoger mantiene el borde izquierdo
  }
  renderPerfilResult();
}
function perfilActualizarTotales(){
  const st=window.__perfil; if(!st) return;
  const cnt={}; let vol=0, total=0;
  st.piezas.forEach(function(p,i){ if(st.removed.has(i)) return; const k=p.largo+'|'+p.alto; cnt[k]=(cnt[k]||0)+1; vol+=p.largo*p.alto; total++; });
  const fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const lista=Object.keys(cnt).map(k=>{const pp=k.split('|'); return {largo:+pp[0],alto:+pp[1],n:cnt[k]};}).sort((a,b)=>(b.alto-a.alto)||(b.largo-a.largo));
  const filas=lista.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × 1 × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('');
  const desp=document.getElementById('perfil-desp');
  if(desp) desp.innerHTML='<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+filas+'<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones (cara frontal)</td><td class="r mono" style="font-weight:700">'+fmtN(total)+'</td></tr></tbody></table>';
  const g=document.getElementById('perfil-gran'); if(g) g.textContent=fmtN(vol)+' m³';
  const q=document.getElementById('perfil-quitados'); if(q) q.textContent=st.removed.size+' quitados';
}
function perfilToggle(i){
  const st=window.__perfil; if(!st) return;
  if(st.removed.has(i)) st.removed.delete(i); else st.removed.add(i);
  const el=document.getElementById('pz'+i);
  if(el){ const p=st.piezas[i], rem=st.removed.has(i), col=colorGavion(p.largo, 1, p.alto);
    el.setAttribute('fill', rem?'#e5e7eb':col.f); el.setAttribute('stroke', rem?'#cbd5e1':col.s);
    if(rem) el.setAttribute('stroke-dasharray','2 2'); else el.removeAttribute('stroke-dasharray'); }
  perfilActualizarTotales();
}
// ---------- Muro en L / U — dibujo sobre cuadrícula ----------
// Estado: window.__eleDraw={seg:[{dx,dy,largo,ci,cf,H}]}. Cada clic añade un tramo ortogonal
// (esquina 90° automática); la tabla ajusta largo/cotas/altura; la planta se recalcula sola.
function eleVertices(){ const D=window.__eleDraw||(window.__eleDraw={seg:[]}); let x=0,y=0; const v=[{x:0,y:0}]; D.seg.forEach(s=>{ x+=s.dx*s.largo; y+=s.dy*s.largo; v.push({x:x,y:y}); }); return v; }
// Vista DINÁMICA: el encuadre se auto-ajusta al muro dibujado (crece solo, sin límite de metros),
// centrado; window.__eleZoom (por defecto 1) permite acercar/alejar. Devuelve la transformación.
function eleView(){
  const V=eleVertices(); const xs=V.map(p=>p.x), ys=V.map(p=>p.y);
  let minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs), minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
  const margin=6; minX-=margin; maxX+=margin; minY-=margin; maxY+=margin;
  const minSpan=20, cX=(minX+maxX)/2, cY=(minY+maxY)/2;
  const spanX=Math.max(maxX-minX, minSpan), spanY=Math.max(maxY-minY, minSpan);
  const vbW=560, vbH=440, pad=10, zoom=window.__eleZoom||1;
  const sc=Math.min((vbW-2*pad)/spanX, (vbH-2*pad)/spanY)*zoom;
  const wMinX=cX-(vbW-2*pad)/(2*sc), wMaxY=cY+(vbH-2*pad)/(2*sc);
  return {minX:wMinX, maxY:wMaxY, sc:sc, ox:pad, oy:pad, vbW:vbW, vbH:vbH};
}
function eleZoom(f){ window.__eleZoom=Math.max(0.3, Math.min(4, (window.__eleZoom||1)*f)); eleGridRedraw(); }
function eleZoomReset(){ window.__eleZoom=1; eleGridRedraw(); }
// Altura por defecto: se aplica a TODO lo dibujado (tramos existentes) y a los nuevos.
function eleSetH(v){ const h=parseFloat(v); if(!(h>0)) return; window.__eleH=Math.max(0.5, Math.round(h*2)/2);
  const D=window.__eleDraw; if(D) D.seg.forEach(function(s){ s.H=window.__eleH; }); eleGridRedraw(); }
// Ancho del gavión en L/U: vacío = prontuario (auto); 1 / 0,5 / 0,3 = ancho fijo para todo el muro.
function eleSetAncho(v){ window.__eleAncho = v ? parseFloat(v) : null; }
// Ensanche de la base (cuando la sección del prontuario supera 1 m):
// 'int' hacia dentro (cara vista lisa, defecto) · 'ext' hacia fuera (la base sobresale de la línea).
function eleSetCara(v){ window.__eleCara = (v==='ext') ? 'ext' : 'int'; }
function eleGridClick(evt){
  const svg=evt.currentTarget, rect=svg.getBoundingClientRect(), G=eleView();
  const vx=(evt.clientX-rect.left)*(G.vbW/rect.width), vy=(evt.clientY-rect.top)*(G.vbH/rect.height);
  const wx=Math.round((vx-G.ox)/G.sc + G.minX), wy=Math.round(G.maxY - (vy-G.oy)/G.sc);
  const D=window.__eleDraw||(window.__eleDraw={seg:[]});
  const last=eleVertices().slice(-1)[0];
  let dx0=wx-last.x, dy0=wy-last.y; if(Math.abs(dx0)<1&&Math.abs(dy0)<1) return;
  let dx,dy,largo; if(Math.abs(dx0)>=Math.abs(dy0)){ dx=dx0>0?1:-1; dy=0; largo=Math.abs(dx0); } else { dx=0; dy=dy0>0?1:-1; largo=Math.abs(dy0); }
  const prev=D.seg[D.seg.length-1];
  D.seg.push({dx:dx, dy:dy, largo:largo, ci:(prev?prev.cf:0), cf:(prev?prev.cf:0), H:(window.__eleH||(prev?prev.H:3))});
  eleGridRedraw();
}
function eleGridRedraw(){
  const g=document.getElementById('ele-grid'); if(!g) return;
  const D=window.__eleDraw||(window.__eleDraw={seg:[]}); const G=eleView();
  const SX=wx=>G.ox+(wx-G.minX)*G.sc, SY=wy=>G.oy+(G.maxY-wy)*G.sc;
  const wMinX=G.minX, wMaxX=G.minX+(G.vbW-2*G.ox)/G.sc, wMaxY=G.maxY, wMinY=G.maxY-(G.vbH-2*G.oy)/G.sc;
  const step=(G.sc<6)?4:2;   // si está muy alejado, líneas cada 4 m
  let grid='';
  for(let x=Math.ceil(wMinX/step)*step; x<=wMaxX; x+=step){ const m=(Math.abs(x%10)<1e-6); grid+='<line x1="'+SX(x).toFixed(1)+'" y1="0" x2="'+SX(x).toFixed(1)+'" y2="'+G.vbH+'" stroke="'+(m?'#cbd5e1':'#eef2f7')+'" stroke-width="'+(m?1:0.7)+'"/>'; }
  for(let y=Math.ceil(wMinY/step)*step; y<=wMaxY; y+=step){ const m=(Math.abs(y%10)<1e-6); grid+='<line x1="0" y1="'+SY(y).toFixed(1)+'" x2="'+G.vbW+'" y2="'+SY(y).toFixed(1)+'" stroke="'+(m?'#cbd5e1':'#eef2f7')+'" stroke-width="'+(m?1:0.7)+'"/>'; }
  grid+='<line x1="0" y1="'+SY(0).toFixed(1)+'" x2="'+G.vbW+'" y2="'+SY(0).toFixed(1)+'" stroke="#94a3b8"/><line x1="'+SX(0).toFixed(1)+'" y1="0" x2="'+SX(0).toFixed(1)+'" y2="'+G.vbH+'" stroke="#94a3b8"/>';
  const V=eleVertices(); let path='M'+SX(0).toFixed(1)+' '+SY(0).toFixed(1)+' ', verts='<circle cx="'+SX(0).toFixed(1)+'" cy="'+SY(0).toFixed(1)+'" r="4.5" fill="#16a34a"/>', labels='';
  D.seg.forEach((s,i)=>{ const a=V[i], b=V[i+1]; path+='L'+SX(b.x).toFixed(1)+' '+SY(b.y).toFixed(1)+' ';
    labels+='<text x="'+((SX(a.x)+SX(b.x))/2).toFixed(1)+'" y="'+((SY(a.y)+SY(b.y))/2-5).toFixed(1)+'" font-size="10.5" font-weight="600" text-anchor="middle" fill="#1d4ed8" style="paint-order:stroke;stroke:#fff;stroke-width:3px">T'+(i+1)+' '+fmtN(s.largo)+'m</text>';
    verts+='<circle cx="'+SX(b.x).toFixed(1)+'" cy="'+SY(b.y).toFixed(1)+'" r="4" fill="#1d4ed8"/>'; });
  const wall=D.seg.length?'<path d="'+path+'" fill="none" stroke="#3b82f6" stroke-width="'+Math.max(3,Math.min(9,G.sc*0.9)).toFixed(1)+'" stroke-linejoin="round" stroke-linecap="round" opacity="0.8" pointer-events="none"/>':'';
  g.innerHTML='<div style="position:relative">'+
    '<svg viewBox="0 0 '+G.vbW+' '+G.vbH+'" width="100%" style="display:block;max-width:'+G.vbW+'px;border:1px solid var(--border);border-radius:8px;background:#fff;cursor:crosshair;touch-action:manipulation" onclick="eleGridClick(event)" xmlns="http://www.w3.org/2000/svg">'+grid+wall+labels+verts+'</svg>'+
    '<div style="position:absolute;top:6px;right:6px;display:flex;gap:4px">'+
      '<button class="btn btn-outline btn-sm" style="padding:2px 8px" onclick="eleZoom(1.3)" title="Acercar">+</button>'+
      '<button class="btn btn-outline btn-sm" style="padding:2px 8px" onclick="eleZoom(1/1.3)" title="Alejar">−</button>'+
      '<button class="btn btn-outline btn-sm" style="padding:2px 8px" onclick="eleZoomReset()" title="Ajustar al muro"><i class="ti ti-focus-2"></i></button>'+
    '</div></div>'+
    '<div class="dim" style="font-size:11px;margin-top:4px">'+(D.seg.length? D.seg.length+' tramo(s) · clic para añadir otro. Se auto-ajusta; usa +/− para acercar/alejar.' : 'Punto verde = inicio (centro). Haz clic para dibujar. La cuadrícula crece sola sin límite.')+'</div>';
  eleSegTable();
}
function eleSegTable(){
  const box=document.getElementById('ele-seg'); if(!box) return;
  const D=window.__eleDraw||{seg:[]};
  if(!D.seg.length){ box.innerHTML=''; return; }
  const dtxt=s=>s.dx>0?'→':s.dx<0?'←':s.dy>0?'↑':'↓';
  box.innerHTML='<div style="font-size:12px;font-weight:600;margin-bottom:4px">Tramos</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Dir</th><th>Largo (m)</th><th>Cota ini</th><th>Cota fin</th><th>Altura</th><th></th></tr></thead><tbody>'+
    D.seg.map((s,i)=>'<tr><td>'+(i+1)+'</td><td style="font-size:15px">'+dtxt(s)+'</td>'+
      '<td><input type="number" value="'+s.largo+'" min="0.5" step="0.5" style="width:72px" onchange="eleSegSet('+i+',\'largo\',this.value)"></td>'+
      '<td><input type="number" value="'+s.ci+'" step="0.1" style="width:66px" onchange="eleSegSet('+i+',\'ci\',this.value)"></td>'+
      '<td><input type="number" value="'+s.cf+'" step="0.1" style="width:66px" onchange="eleSegSet('+i+',\'cf\',this.value)"></td>'+
      '<td><input type="number" value="'+s.H+'" min="0.5" step="0.5" style="width:66px" onchange="eleSegSet('+i+',\'H\',this.value)"></td>'+
      '<td class="r"><button class="btn btn-outline btn-sm" onclick="eleSegDel('+i+')"><i class="ti ti-trash"></i></button></td></tr>').join('')+
    '</tbody></table></div>';
}
function eleSegSet(i,f,v){ const D=window.__eleDraw; if(!D||!D.seg[i])return; const n=parseFloat(v); if(isNaN(n))return; D.seg[i][f]=(f==='largo'?Math.max(0.5,Math.round(n*2)/2):(f==='H'?Math.max(0.5,Math.round(n*2)/2):n)); eleGridRedraw(); }
function eleSegDel(i){ const D=window.__eleDraw; if(!D)return; D.seg.splice(i,1); eleGridRedraw(); }
function eleUndo(){ const D=window.__eleDraw; if(D&&D.seg.length){ D.seg.pop(); eleGridRedraw(); } }
function eleClear(){ window.__eleDraw={seg:[]}; eleGridRedraw(); }
function eleEjemploL(){ window.__eleDraw={seg:[{dx:1,dy:0,largo:20,ci:0,cf:2,H:3},{dx:0,dy:-1,largo:12,ci:2,cf:2,H:3}]}; eleGridRedraw(); }
function eleEjemploU(){ window.__eleDraw={seg:[{dx:1,dy:0,largo:16,ci:0,cf:1,H:3},{dx:0,dy:-1,largo:10,ci:1,cf:1,H:3},{dx:-1,dy:0,largo:16,ci:1,cf:0,H:3}]}; eleGridRedraw(); }
function eleCalcular(){
  const res=document.getElementById('calc-result'); if(!res) return;
  const seg=(window.__eleDraw&&window.__eleDraw.seg)||[];
  if(!seg.length){ res.innerHTML='<div class="empty"><i class="ti ti-vector-triangle"></i><p>Dibuja el recorrido en la cuadrícula</p></div>'; return; }
  // AGRUPAR en RECTAS: tramos consecutivos con la MISMA dirección NO son esquinas — son un
  // muro CONTINUO que sigue recto (cambia la cota/altura). Se funden en una sola recta y el
  // motor por cotas los traba a través de la junta (escalones con pieza entera incluidos).
  // La esquina (giro 90° con encastre) solo aparece cuando de verdad cambia la dirección.
  const runs=[]; seg.forEach(function(s){
    const r=runs[runs.length-1];
    if(r && r.dx===s.dx && r.dy===s.dy) r.tr.push(s); else runs.push({dx:s.dx, dy:s.dy, tr:[s]});
  });
  const T=runs.map(function(r){
    const L=r.tr.reduce(function(a,t){ return a+t.largo; },0);
    return {dx:r.dx, dy:r.dy, largo:L, H:Math.max.apply(null,r.tr.map(function(t){return t.H;})),
      ci:r.tr[0].ci, cf:r.tr[r.tr.length-1].cf, tr:r.tr};
  });
  const estados=T.map(function(t){
    const ras=[], ter=[], edges=[0], juntas=[]; let d=0;
    t.tr.forEach(function(s,k){ const d0=k? d+1e-4 : 0;   // salto de cota en la junta (sin d duplicada)
      if(k) juntas.push(d);                               // junta de tramo = plano de cambio EXACTO
      ter.push({d:d0,c:s.ci},{d:d+s.largo,c:s.cf});
      ras.push({d:d0,c:s.ci+s.H},{d:d+s.largo,c:s.cf+s.H});
      // columnas CORTADAS en cada junta de tramo: 2 m dentro del tramo y la última absorbe la
      // fracción → los largos con medio metro (6,5 · 9,5 · 12,5…) salen EXACTOS, no redondeados
      const n=Math.max(1, Math.round(s.largo/2));
      for(let q=1;q<n;q++) edges.push(d+q*2);
      edges.push(d+s.largo);
      d+=s.largo; });
    return perfilCalc(ras,ter,edges,juntas);
  });
  let x=0,y=0; const segs=T.map(function(t,i){ const p0={x:x,y:y}, p1={x:x+t.dx*t.largo,y:y+t.dy*t.largo}; x=p1.x; y=p1.y; return {p0:p0,p1:p1,dx:t.dx,dy:t.dy,largo:t.largo,H:t.H,i:i}; });
  const fix=window.__eleAncho||null;   // ancho fijo (1 / 0,5 / 0,3) o null = prontuario
  const cara=window.__eleCara||'int';  // ensanche de la base: hacia dentro (cara lisa) o hacia fuera
  window.__muroEle={T:T, estados:estados, segs:segs, ancho:fix, cara:cara};
  // DESPIECE REAL pieza a pieza: las MISMAS cajas que la vista 3D (esquinas engranadas con
  // headers, bandas de profundidad y sección del prontuario incluidas) → las cuentas cuadran.
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[];
  const cnt={}; let vol=0; const total=boxes.length;
  boxes.forEach(function(b){ const an=Math.round(((Math.abs(b.l-b.largo)<1e-6)?b.a:b.l)*100)/100;
    const k=b.largo+'|'+an+'|'+b.h; cnt[k]=(cnt[k]||0)+1; vol+=b.l*b.a*b.h; });
  const fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const lista=Object.keys(cnt).map(k=>{const pp=k.split('|');return{largo:+pp[0],ancho:+pp[1],alto:+pp[2],n:cnt[k]};}).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  const filas=lista.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('');
  const nEsq=Math.max(0,T.length-1);
  const Hmax=Math.max.apply(null, T.map(t=>t.H));
  // tarjeta de sección: prontuario (auto) o aviso si el ancho fijo se queda corto en altura
  let secCard='';
  if(!fix){
    // Sección según la ALTURA DEL MURO (no la cota máxima del terreno): un muro de 4 m es
    // 1,5·1·1·1 aunque su coronación llegue a cota 8 por ir subiendo el terreno.
    secCard='<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-layout-distribute-horizontal"></i> Sección (prontuario ARISAC)</div></div>'+
      '<div class="card-body" style="padding:14px 16px;display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">'+
        '<div><div class="dim" style="font-size:11px;margin-bottom:4px">Sección del muro a la altura máx. ('+fmtm(Hmax)+' m)</div>'+croquisSeccionPront(Hmax, cara)+'</div>'+
        '<div class="dim" style="flex:1;min-width:220px;font-size:12px">A más altura, la base ensancha según el prontuario y añade bandas de profundidad. El despiece de arriba <strong>ya lo incluye</strong> (sale del modelo 3D pieza a pieza).'+
        (cara==='ext'?' <strong>Base hacia FUERA</strong>: el ensanche sobresale de la línea dibujada (escalones por delante); la trasera queda enrasada.':' <strong>Base hacia DENTRO</strong>: cara vista lisa; el ensanche se entierra hacia el terreno.')+'</div>'+
      '</div></div>';
  } else if(Hmax>=2){
    secCard='<div class="card" style="margin-top:14px"><div class="card-body" style="padding:10px 16px;font-size:12px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> Ancho fijo de '+fmtm(fix)+' m con altura de '+fmtm(Hmax)+' m: no se aplica el ensanche de base del prontuario (recomendado a partir de 2 m). Revisa la estabilidad.</div></div>';
  }
  const holgura03=(fix===0.3&&nEsq>0)?'<div class="dim" style="font-size:11px;margin-top:6px">Ancho 0,30 m: el recorte de esquina va a la rejilla de 0,5 → queda una holgura de 20 cm en el rincón, que se cierra al atar en obra.</div>':'';
  res.innerHTML=
    '<div class="card"><div class="card-hdr"><div class="card-title"><i class="ti ti-map-2"></i> Planta · muro en L/U · '+seg.length+' tramo(s) · '+T.length+' recta(s) · '+nEsq+' esquina(s)'+(fix?(' · ancho '+fmtm(fix)+' m'):'')+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-outline btn-sm" onclick="elePlano()"><i class="ti ti-ruler-measure"></i> Plano 2D (perfiles)</button>'+
        '<button class="btn btn-outline btn-sm" onclick="elePlanoHiladas()"><i class="ti ti-stack-2"></i> Plano por hiladas</button>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaEle()"><i class="ti ti-file-description"></i> Ficha técnica</button>'+
        '<button class="btn btn-outline btn-sm" onclick="eleA3()"><i class="ti ti-printer"></i> Imprimir A3</button>'+
        '<button class="btn btn-primary btn-sm" onclick="muro3dEle()"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D</button>'+
      '</div></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisPlantaLU(segs, fix||1)+
      '<div class="dim" style="font-size:11px;margin-top:6px"><span style="display:inline-block;width:12px;height:12px;border:1.5px dashed #dc2626;vertical-align:middle"></span> esquina trabada — los gaviones alternan de brazo en cada hilada (matajunta también en el giro). Los tramos seguidos <strong>en la misma dirección</strong> se funden en una recta continua, trabada a través de la junta.</div>'+holgura03+'</div></div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-list-details"></i> Despiece total (según 3D)</div>'+
      '<span class="dim">'+fmtN(vol)+' m³ · '+fmtN(total)+' gaviones</span></div>'+
      '<div class="card-body" style="padding:8px 16px 12px"><table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Uds</th></tr></thead><tbody>'+filas+
      '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total</td><td class="r mono" style="font-weight:700">'+fmtN(total)+'</td></tr></tbody></table>'+
      '<div class="dim" style="font-size:11px;margin-top:6px">Cuenta pieza a pieza del modelo 3D: esquinas engranadas (headers que cruzan alternando de brazo)'+(fix?'':' y bandas de profundidad del prontuario')+' incluidas.</div></div></div>'+
    secCard+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Alzados por recta</div></div>'+
      '<div class="card-body" style="padding:14px 16px">'+
        estados.map((st,i)=>'<div style="margin-bottom:14px"><div style="font-weight:600;font-size:12px;margin-bottom:4px">Recta '+(i+1)+' · '+fmtN(T[i].largo)+' m · cotas '+fmtN(T[i].ci)+'→'+fmtN(T[i].cf)+' m · alt máx '+fmtN(T[i].H)+' m'+(T[i].tr&&T[i].tr.length>1?(' · '+T[i].tr.length+' tramos fundidos'):'')+'</div><div style="overflow-x:auto">'+croquisPorCotasInter(st,true)+'</div></div>').join('')+
      '</div></div>';
}
// Huella del muro en planta con MEDIDAS EXTERIORES: la polilínea que dibuja el usuario es la
// CARA EXTERIOR; el muro (ancho w) se pega hacia DENTRO. Así el largo de cada tramo y la
// envolvente son exteriores exactos. Devuelve un rect por tramo {rx,ry,rw,rh,nx,ny,s}.
function eleFootprint(segs, w){
  const pts=[]; segs.forEach((s,i)=>{ if(i===0)pts.push(s.p0); pts.push(s.p1); });
  const cx=pts.reduce((a,p)=>a+p.x,0)/pts.length, cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;
  return segs.map(s=>{ const midx=(s.p0.x+s.p1.x)/2, midy=(s.p0.y+s.p1.y)/2;
    let nx=-s.dy, ny=s.dx;
    const dot=(cx-midx)*nx+(cy-midy)*ny;
    // Muro RECTO puro (el centroide cae sobre la línea): el interior/terreno va a la DERECHA
    // del sentido de dibujo → la CARA VISTA queda mirando a la cámara por defecto del 3D
    // (que respeta el sentido izquierda→derecha del dibujo). Con giros manda el centroide.
    if(Math.abs(dot)<1e-9){ nx=s.dy; ny=-s.dx; }
    else if(dot<0){ nx=-nx; ny=-ny; }   // normal hacia el interior
    let rx,ry,rw,rh;
    if(s.dx!==0){ rx=Math.min(s.p0.x,s.p1.x); rw=s.largo; ry=(ny<0)?s.p0.y-w:s.p0.y; rh=w; }
    else { ry=Math.min(s.p0.y,s.p1.y); rh=s.largo; rx=(nx<0)?s.p0.x-w:s.p0.x; rw=w; }
    return {rx:rx, ry:ry, rw:rw, rh:rh, nx:nx, ny:ny, s:s}; });
}
function croquisPlantaLU(segs, w, wMax){
  w=w||((window.__muroEle&&window.__muroEle.ancho)||1);
  const R=eleFootprint(segs, w);
  // envolvente EXTERIOR = polilínea del recorrido (bordes de fuera)
  let vx=[], vy=[]; segs.forEach((s,i)=>{ if(i===0){vx.push(s.p0.x);vy.push(s.p0.y);} vx.push(s.p1.x); vy.push(s.p1.y); });
  const exMinX=Math.min.apply(null,vx), exMaxX=Math.max.apply(null,vx), exMinY=Math.min.apply(null,vy), exMaxY=Math.max.apply(null,vy);
  const extW=exMaxX-exMinX, extH=exMaxY-exMinY;
  const minX=exMinX-3, maxX=exMaxX+3, minY=exMinY-3, maxY=exMaxY+3;
  const Wm=maxX-minX, Hm=maxY-minY, sc=Math.max(3, Math.min(11, (wMax||520)/Math.max(Wm,Hm)));
  const pad=24, vbW=pad*2+Wm*sc, vbH=pad*2+Hm*sc;
  const X=xm=>pad+(xm-minX)*sc, Y=ym=>pad+(maxY-ym)*sc; let out='';
  R.forEach(function(r){ const s=r.s;
    out+='<rect x="'+X(r.rx).toFixed(1)+'" y="'+Y(r.ry+r.rh).toFixed(1)+'" width="'+(r.rw*sc).toFixed(1)+'" height="'+(r.rh*sc).toFixed(1)+'" fill="#3b82f6" fill-opacity="0.45" stroke="#1d4ed8" stroke-width="1.2"/>';
    const mx=r.rx+r.rw/2, my=r.ry+r.rh/2;
    out+='<text x="'+X(mx).toFixed(1)+'" y="'+Y(my).toFixed(1)+'" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="middle" fill="#0f172a" style="paint-order:stroke;stroke:#fff;stroke-width:3px">T'+(s.i+1)+' · '+fmtN(s.largo)+'m</text>';
  });
  // esquinas: intersección de rects contiguos
  for(let i=0;i<R.length-1;i++){ const a=R[i], b=R[i+1];
    const ix0=Math.max(a.rx,b.rx), ix1=Math.min(a.rx+a.rw,b.rx+b.rw), iy0=Math.max(a.ry,b.ry), iy1=Math.min(a.ry+a.rh,b.ry+b.rh);
    if(ix1>ix0+1e-6&&iy1>iy0+1e-6) out+='<rect x="'+X(ix0).toFixed(1)+'" y="'+Y(iy1).toFixed(1)+'" width="'+((ix1-ix0)*sc).toFixed(1)+'" height="'+((iy1-iy0)*sc).toFixed(1)+'" fill="none" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="3 2"/>'; }
  // cotas exteriores (arriba = ancho, izquierda = alto)
  const dy=Y(exMaxY)-14, dx=X(exMinX)-14;
  out+='<line x1="'+X(exMinX)+'" y1="'+dy+'" x2="'+X(exMaxX)+'" y2="'+dy+'" stroke="#64748b" stroke-width="1"/><text x="'+((X(exMinX)+X(exMaxX))/2)+'" y="'+(dy-3)+'" font-size="10.5" font-weight="600" text-anchor="middle" fill="#334155">'+fmtN(extW)+' m ext.</text>';
  out+='<line x1="'+dx+'" y1="'+Y(exMinY)+'" x2="'+dx+'" y2="'+Y(exMaxY)+'" stroke="#64748b" stroke-width="1"/><text x="'+dx+'" y="'+((Y(exMinY)+Y(exMaxY))/2)+'" font-size="10.5" font-weight="600" text-anchor="middle" fill="#334155" transform="rotate(-90 '+dx+' '+((Y(exMinY)+Y(exMaxY))/2)+')">'+fmtN(extH)+' m ext.</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="display:block;max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planta del muro en L/U (medidas exteriores)">'+out+'</svg>';
}
function croquisPorCotasInter(st, ficha){
  const crown=st.crown, N=st.N, cell=st.cell, rr=st.rr, tt=st.tt, piezas=st.piezas, removed=st.removed;
  const maxTop=Math.max.apply(null,crown), Lm=st.L||N*cell;
  const sc=Math.max(10, Math.min(22, 200/maxTop));
  const padL=16,padR=16,padT=14,padB=28, vbW=padL+Lm*sc+padR, vbH=padT+maxTop*sc+padB, groundY=padT+maxTop*sc;
  const X=xm=>padL+xm*sc, Y=ym=>groundY-ym*sc; let out='';
  const fmtm=x=>String(x).replace('.',',');
  piezas.forEach(function(p,i){ const rem=removed.has(i); if(ficha&&rem) return;   // en ficha se omiten los quitados
    const col=colorGavion(p.largo, 1, p.alto);
    const sel=(!ficha && window.__perfilSel===i);   // gavión seleccionado → borde resaltado
    const act = ficha ? '' : ' style="cursor:pointer" onclick="perfilSelect('+i+')"';
    out+='<rect id="pz'+i+'" x="'+X(p.x).toFixed(1)+'" y="'+Y(p.y+p.alto).toFixed(1)+'" width="'+(p.largo*sc).toFixed(1)+'" height="'+(p.alto*sc).toFixed(1)+'" fill="'+(rem?'#e5e7eb':col.f)+'" stroke="'+(sel?'#111827':(rem?'#cbd5e1':col.s))+'" stroke-width="'+(sel?'2.5':'0.6')+'"'+(rem?' stroke-dasharray="2 2"':'')+act+'><title>'+fmtm(p.largo)+'×1×'+fmtm(p.alto)+' m</title></rect>';
  });
  const cxj=j=>st.edges?((st.edges[j]+st.edges[j+1])/2):((j+0.5)*cell);
  if(tt){ let tp=''; for(let j=0;j<N;j++){ tp+=(j?'L':'M')+X(cxj(j)).toFixed(1)+' '+Y(tt[j]).toFixed(1)+' '; } tp+='L'+X(Lm).toFixed(1)+' '+Y(tt[N-1]).toFixed(1); out+='<path d="'+tp+'" fill="none" stroke="#8a6d3b" stroke-width="1.8" pointer-events="none"/>'; }
  if(rr){ let rp=''; for(let j=0;j<N;j++){ rp+=(j?'L':'M')+X(cxj(j)).toFixed(1)+' '+Y(rr[j]).toFixed(1)+' '; } rp+='L'+X(Lm).toFixed(1)+' '+Y(rr[N-1]).toFixed(1); out+='<path d="'+rp+'" fill="none" stroke="#dc2626" stroke-width="2" pointer-events="none"/>'; }
  const est = ficha ? 'display:block;max-width:100%;height:auto' : 'display:block';   // en ficha, plano completo ajustado a la página
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="'+est+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alzado del muro por perfil">'+out+'</svg>';
}

// Escalonado por cotas: muro CONTINUO trabado. Cimentación (base) con floor y coronación
// con ceil sobre la rejilla de 0,5 → la altura oscila 3/3,5 y sólo hace falta un 0,5 por
// transición. Se cuenta pieza a pieza como se traba (aparecen 1 m de remate = 1×1×1).
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
  const terr=f=>{ if(sent==='sube')return desnivel*f; if(sent==='valle')return desnivel*(1-Math.abs(2*f-1)); if(sent==='monte')return desnivel*Math.abs(2*f-1); return desnivel*(1-f); };
  let base=[], crown=[];
  // Pass de 7 cm: si por ≤7 cm no se alcanza el siguiente medio metro, no se añade hilada.
  for(let j=0;j<N;j++){ const t=terr((j+0.5)/N); const b=Math.floor(t/esc+1e-6)*esc; let cr=Math.ceil((t+H-0.07)/esc-1e-6)*esc; if(cr<b+esc)cr=b+esc; base.push(b); crown.push(cr); }
  const minB=Math.min.apply(null,base); base=base.map(b=>b-minB); crown=crown.map(c=>c-minB);
  const m=porCotasModelo(base, crown, cell, N);   // conteo pieza a pieza + volumen
  const fmtm=x=>String(x).replace('.',',');
  // tramos (runs de igual base) para 3D y ficha
  const tramos=[]; let j=0;
  while(j<N){ let k=j; while(k<N && Math.abs(base[k]-base[j])<1e-9) k++; const nb=(k<N)?base[k]:base[j]; tramos.push({L:(k-j)*cell, H:crown[j]-base[j], ancho:null, desnivel:base[j]-nb}); j=k; }
  window.__muroTramos={tramos:tramos, perfil:'esc'};

  const filaDesp = m.piezas.map(p=>'<tr><td>Gavión <strong>'+fmtm(p.largo)+' m</strong></td><td>'+fmtm(p.largo)+' × 1 × '+fmtm(p.alto)+' m</td><td class="r mono" style="font-weight:600">'+fmtN(p.n)+'</td></tr>').join('');
  res.innerHTML =
    '<div class="card">'+
      '<div class="card-hdr"><div class="card-title"><i class="ti ti-mountain"></i> Muro continuo por cotas · '+fmtN(L)+' m · altura '+fmtm(H)+' m (encaje 0,5)</div>'+
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="badge b-steel">desnivel '+fmtm(desnivel)+' m · escalón 0,5 m</span>'+
        '<button class="btn btn-outline btn-sm" onclick="fichaTramos()"><i class="ti ti-file-description"></i> Ficha técnica</button></div></div>'+
      '<table class="tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Unidades</th></tr></thead><tbody>'+filaDesp+
        '<tr style="border-top:2px solid var(--border)"><td colspan="2" style="font-weight:600">Total gaviones (cara frontal)</td><td class="r mono" style="font-weight:700">'+fmtN(m.total)+'</td></tr>'+
      '</tbody></table>'+
      '<div class="card-body" style="padding:12px 16px"><span class="dim" style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">Material granular (cara 1 m ancho)</span> '+
        '<strong style="font-size:18px;color:var(--blue);margin-left:6px">'+fmtN(m.granular)+' m³</strong></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-chart-bar"></i> Alzado continuo (trabado)</div>'+
      '<button class="btn btn-primary btn-sm" onclick="muro3dTramos()"><i class="ti ti-3d-cube-sphere"></i> Ver en 3D real</button></div>'+
      '<div class="card-body" style="padding:14px 16px;overflow-x:auto">'+croquisPorCotas(base, crown, cell)+
      '<div class="dim" style="font-size:11px;margin-top:8px"><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border:1px solid #1d4ed8;vertical-align:middle"></span> 1 m alto (2/1 m) &nbsp; '+
      '<span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border:1px solid #b45309;vertical-align:middle"></span> 0,5 m alto (encaje/traba)</div>'+
    '</div></div>';
}

// Recorre el muro por hiladas (fulls a la rejilla entera + medios de encaje) y cuenta las
// piezas EXACTAS como se traban (2 m y 1 m de remate, en alto 1 m y 0,5 m).
function porCotasModelo(base, crown, cell, N){
  const fb=base.map(b=>Math.ceil(b-1e-6)), ct=crown.map(c=>Math.floor(c+1e-6));
  const maxTop=Math.max.apply(null,crown);
  const cnt={};
  const add=(x0,x1,alto,off)=>{ muroTramo(x1-x0, off).forEach(p=>{ const k=p+'|'+alto; cnt[k]=(cnt[k]||0)+1; }); };
  for(let y=0;y<Math.round(maxTop);y++){ let j=0; while(j<N){ if(fb[j]<=y&&y<ct[j]){ let k=j; while(k<N&&fb[k]<=y&&y<ct[k])k++; add(j*cell,k*cell,1,(Math.floor(y+1e-6)%2===1)); j=k; } else j++; } }
  // los medios (0,5) traban en vertical por el propio medio metro → se tabican con 2 m (sin desfase, sin piezas de 1 m)
  const halfRun=(lvl,has)=>{ let j=0; while(j<N){ if(has(j)){ const v=lvl(j); let k=j; while(k<N&&has(k)&&Math.abs(lvl(k)-v)<1e-6)k++; add(j*cell,k*cell,0.5,false); j=k; } else j++; } };
  halfRun(j=>base[j], j=>base[j]<fb[j]-1e-6);
  halfRun(j=>ct[j], j=>ct[j]<crown[j]-1e-6);
  const piezas=Object.keys(cnt).map(k=>{ const p=k.split('|'); return {largo:+p[0], alto:+p[1], n:cnt[k]}; })
    .sort((a,b)=>(b.alto-a.alto)||(b.largo-a.largo));
  let vol=0, hMin=1e9, hMax=0; for(let j=0;j<N;j++){ const h=crown[j]-base[j]; vol+=h*cell; hMin=Math.min(hMin,h); hMax=Math.max(hMax,h); }
  return { piezas:piezas, total:piezas.reduce((s,p)=>s+p.n,0), granular:vol, hMin:hMin, hMax:hMax };
}

// Alzado continuo por cotas: hiladas continuas trabadas; base (floor) y coronación (ceil)
function croquisPorCotas(base, crown, cell, rasReal, terReal){
  const N=base.length;
  const fb=base.map(b=>Math.ceil(b-1e-6)), ct=crown.map(c=>Math.floor(c+1e-6));
  const maxTop=Math.max.apply(null,crown), Lm=N*cell;
  const sc=Math.max(10, Math.min(22, 200/maxTop)), xs=sc, ys=sc;   // MISMA escala X/Y (proporción real)
  const padL=16,padR=16,padT=14,padB=28, vbW=padL+Lm*xs+padR, vbH=padT+maxTop*ys+padB, groundY=padT+maxTop*ys;
  const X=xm=>padL+xm*xs, Y=ym=>groundY-ym*ys; let out='';
  const piece=(xm,ym,wm,hm,f,s)=>'<rect x="'+X(xm).toFixed(1)+'" y="'+Y(ym+hm).toFixed(1)+'" width="'+(wm*xs).toFixed(1)+'" height="'+(hm*ys).toFixed(1)+'" fill="'+f+'" stroke="'+s+'" stroke-width="0.5"/>';
  function band(x0,x1,ym,hm,f,s,offArg){ const off=(offArg!==undefined)?offArg:(Math.floor(ym+1e-6)%2===1); let x=x0; if(off&&x1-x0>=1){ out+=piece(x,ym,1,hm,f,s); x+=1; } while(x+2<=x1+1e-6){ out+=piece(x,ym,2,hm,f,s); x+=2; } if(x<x1-1e-6) out+=piece(x,ym,x1-x,hm,f,s); }
  for(let y=0;y<Math.round(maxTop);y++){ let j=0; while(j<N){ if(fb[j]<=y&&y<ct[j]){ let k=j; while(k<N&&fb[k]<=y&&y<ct[k])k++; band(j*cell,k*cell,y,1,'#3b82f6','#1d4ed8'); j=k; } else j++; } }
  const halfBands=(lvl,has)=>{ let j=0; while(j<N){ if(has(j)){ const v=lvl(j); let k=j; while(k<N&&has(k)&&Math.abs(lvl(k)-v)<1e-6)k++; band(j*cell,k*cell,v,0.5,'#f59e0b','#b45309',false); j=k; } else j++; } };
  halfBands(j=>base[j], j=>base[j]<fb[j]-1e-6);
  halfBands(j=>ct[j],   j=>ct[j]<crown[j]-1e-6);
  // línea de terreno (marrón): real (por puntos) si se da, si no la base escalonada
  const cx=j=>(j+0.5)*cell;
  if(terReal){
    let tp=''; for(let j=0;j<N;j++){ tp+=(j?'L':'M')+X(cx(j)).toFixed(1)+' '+Y(terReal[j]).toFixed(1)+' '; }
    out+='<path d="'+tp+'" fill="none" stroke="#8a6d3b" stroke-width="1.8"/>';
  } else {
    let gp=''; for(let j=0;j<N;j++){ gp+=(j?'L':'M')+X(j*cell).toFixed(1)+' '+Y(base[j]).toFixed(1)+' L'+X((j+1)*cell).toFixed(1)+' '+Y(base[j]).toFixed(1)+' '; }
    out+='<path d="'+gp+'" fill="none" stroke="#8a6d3b" stroke-width="1.4"/>';
  }
  // rasante (calle, roja): real (por puntos) si se da, si no recta de punta a punta
  if(rasReal){
    let rp=''; for(let j=0;j<N;j++){ rp+=(j?'L':'M')+X(cx(j)).toFixed(1)+' '+Y(rasReal[j]).toFixed(1)+' '; }
    out+='<path d="'+rp+'" fill="none" stroke="#dc2626" stroke-width="2"/>';
  } else {
    out+='<line x1="'+X(0).toFixed(1)+'" y1="'+Y(crown[0]).toFixed(1)+'" x2="'+X(Lm).toFixed(1)+'" y2="'+Y(crown[N-1]).toFixed(1)+'" stroke="#dc2626" stroke-width="2"/>';
  }
  const rMid = rasReal ? rasReal[Math.floor(N/2)] : (crown[0]+crown[N-1])/2;
  out+='<text x="'+X(Lm/2).toFixed(1)+'" y="'+(Y(rMid)-4).toFixed(1)+'" font-size="10" fill="#dc2626" text-anchor="middle" font-family="system-ui">rasante (calle)</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alzado continuo del muro por cotas">'+out+'</svg>';
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
  const sc=Math.max(6, Math.min(20, 200/hMax)), xs=sc, ys=sc;   // MISMA escala X/Y
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
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Perfil longitudinal del muro">'+out+'</svg>';
}

// Alzado "todo escalonado": base y remate bajan; los tramos contiguos se solapan y traban
function croquisPerfilEscalonado(tramos){
  const totalL=tramos.reduce((s,t)=>s+t.L,0);
  // cotas de base acumuladas (cada tramo baja su desnivel hacia el siguiente)
  const base=[0]; for(let i=1;i<tramos.length;i++) base[i]=base[i-1]-(tramos[i-1].desnivel||0);
  let maxE=-1e9, minE=1e9;
  tramos.forEach((t,i)=>{ maxE=Math.max(maxE, base[i]+t.H); minE=Math.min(minE, base[i]); });
  const span=maxE-minE;
  const sc=Math.max(6, Math.min(20, 200/span)), xs=sc, ys=sc;   // MISMA escala X/Y
  const padL=18,padR=18,padT=16,padB=32;
  const Wpx=totalL*xs, vbW=padL+Wpx+padR, vbH=padT+span*ys+padB;
  const Y=e=>padT+(maxE-e)*ys;
  const x0=padL; let out='', x=x0; const xend=[];
  // gaviones por tramo (piezas 2/1,5/1 m coloreadas, trabadas por hilada)
  tramos.forEach(function(t,i){
    const w=t.L*xs; let yc=0;
    // el desfase medio metro entre peldaños (escalón) ya traba las hiladas con el vecino
    muroCourses(t.H, t.ancho).forEach(function(c){
      const yTop=Y(base[i]+yc+c.h); let px=x; const fb=muroBandas(c.w)[0];
      muroTramo(t.L, c.offset).forEach(function(p){ const pw=p*xs, col=colorGavion(p, fb, c.h); out+='<rect x="'+px.toFixed(1)+'" y="'+yTop.toFixed(1)+'" width="'+pw.toFixed(1)+'" height="'+(c.h*ys).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>'; px+=pw; });
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
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.ceil(vbW)+'" height="'+Math.ceil(vbH)+'" style="display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Perfil longitudinal escalonado del muro">'+out+'</svg>';
}

// (croquisTrabado/croquisSeccion/croquis3D antiguos sustituidos por croquisCaraC/croquisSeccionC/croquis3DC)

// ════════════ HISTORIAL DE MUROS (guardar / rescatar) ════════════
// Cada muro se guarda en el servidor (tabla muros_guardados) con su obra/cliente,
// un resumen (gaviones, m³, alturas) y el ESTADO completo del calculador (datos),
// para poder rescatarlo tal cual se dejó — incluidos los ajustes a mano del perfil.
function saveBarHTML(){
  if(window.__muroGuardadoId){
    return '<button class="btn btn-primary btn-sm" onclick="muroGuardar(true)" title="Sobrescribe el muro guardado con lo que hay ahora en pantalla"><i class="ti ti-device-floppy"></i> Actualizar «'+fkEsc(window.__muroGuardadoNombre||'')+'»</button>'+
      '<button class="btn btn-outline btn-sm" onclick="muroGuardar(false)" title="Guarda una copia nueva sin tocar el original"><i class="ti ti-copy"></i> Guardar como nuevo</button>'+
      '<button class="btn btn-outline btn-sm" title="Dejar de editar este muro guardado" onclick="muroDejarEdicion()"><i class="ti ti-x"></i></button>';
  }
  return '<button class="btn btn-primary btn-sm" onclick="muroGuardar(false)"><i class="ti ti-device-floppy"></i> Guardar muro</button>';
}
function renderSaveBar(){ const e=document.getElementById('calc-save-bar'); if(e) e.innerHTML=saveBarHTML(); }
function muroDejarEdicion(){ window.__muroGuardadoId=null; window.__muroGuardadoNombre=null; renderSaveBar(); if(window.__histAbierto) renderHistorialMuros(); }

// Estado completo del modo activo (o null si no hay nada calculable que guardar)
function calcEstadoActual(){
  const fm=window.__fichaMeta||{};
  const V=id=>{ const e=document.getElementById(id); return e? e.value : ''; };
  if(calcModo==='simple'){
    const h=parseFloat(V('calc-altura')), L=parseFloat(V('calc-long'))||0;
    if(!h||L<=0) return null;
    const av=V('calc-ancho');
    let ancho=null;                                   // mismo criterio de ancho que calcularMuro
    if(h<2) ancho=parseFloat(av)||0.5; else if(h===2&&av&&av!=='pront') ancho=parseFloat(av)||0.5;
    const d=muroDespiece(h,L,ancho);
    return {modo:'simple', fichaMeta:fm, datos:{simple:{altura:V('calc-altura'), ancho:av, long:V('calc-long')}},
      resumen:{gaviones:d.total, m3:Math.round(d.granular*100)/100, hmax:h, largo:L}};
  }
  if(calcModo==='tramos'){
    const subPerfil=!!(document.getElementById('perfil-desp') && window.__perfil);   // lo que hay en pantalla
    const campos={perfil:V('tr-perfil'), esc:V('tr-esc'), text:V('tr-text'),
      cs:{ini:V('cs-ini'), fin:V('cs-fin'), long:V('cs-long'), alt:V('cs-alt')},
      tp:{ras:V('tp-rasante'), ter:V('tp-terreno')}, sub:(subPerfil?'perfil':'texto')};
    if(subPerfil){
      const st=window.__perfil;
      const activo=st.piezas.filter(function(p,i){ return p && !st.removed.has(i); });
      const vol=activo.reduce(function(s,p){ return s+p.largo*p.alto; },0);
      let hmax=0; for(let j=0;j<st.N;j++) hmax=Math.max(hmax, st.crown[j]-st.base[j]);
      return {modo:'tramos', fichaMeta:fm,
        datos:{tramos:campos, perfilState:{base:st.base, crown:st.crown, cell:st.cell, N:st.N, L:st.L, rr:st.rr, tt:st.tt, piezas:st.piezas, removed:Array.from(st.removed)}},
        resumen:{gaviones:activo.length, m3:Math.round(vol*100)/100, hmax:Math.round(hmax*100)/100, largo:st.L}};
    }
    const parsed=parseTramos(V('tr-text'), parseFloat(V('tr-esc')));
    if(!parsed.tramos.length) return null;
    let gav=0, m3=0, largo=0, hmax=0;
    parsed.tramos.forEach(function(t){ const r=muroPiezasTramo(t); r.piezas.forEach(function(p){ gav+=p.n; }); m3+=r.granular; largo+=t.L; hmax=Math.max(hmax,t.H); });
    return {modo:'tramos', fichaMeta:fm, datos:{tramos:campos},
      resumen:{gaviones:gav, m3:Math.round(m3*100)/100, hmax:hmax, largo:largo}};
  }
  // 'ele' — requiere haber calculado (muroGuardar lo lanza antes)
  const D=window.__eleDraw, data=window.__muroEle;
  if(!D||!D.seg.length||!data||!data.segs||!data.segs.length) return null;
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[];
  const vol=boxes.reduce(function(s,b){ return s+b.l*b.a*b.h; },0);
  const largo=data.segs.reduce(function(s,x){ return s+x.largo; },0);
  const hmax=Math.max.apply(null, data.T.map(function(t){ return t.H; }));
  return {modo:'ele', fichaMeta:fm,
    datos:{ele:{seg:D.seg, H:window.__eleH||null, ancho:data.ancho||null, cara:data.cara||'int'}},
    resumen:{gaviones:boxes.length, m3:Math.round(vol*100)/100, hmax:hmax, largo:largo}};
}

async function muroGuardar(actualizar){
  // recalcula el modo activo para que lo guardado sea EXACTAMENTE lo que hay en pantalla
  if(calcModo==='simple') calcularMuro();
  else if(calcModo==='tramos'){
    const enPerfil=!!(document.getElementById('perfil-desp') && window.__perfil);
    if(!enPerfil && ((document.getElementById('tr-text')||{}).value||'').trim()) calcularTramos();
  }
  else if(calcModo==='ele' && window.__eleDraw && window.__eleDraw.seg.length) eleCalcular();
  const est=calcEstadoActual();
  if(!est){ log('Rellena y calcula un muro antes de guardar','warn'); return; }
  const fm=est.fichaMeta||{};
  let nombre=window.__muroGuardadoNombre||'';
  if(!actualizar || !window.__muroGuardadoId){
    const def=window.__muroGuardadoId ? ((window.__muroGuardadoNombre||'Muro')+' (v2)')
      : (fm.obra || ('Muro '+(est.modo==='ele'?'L/U':est.modo==='tramos'?'por tramos':'')+' '+new Date().toLocaleDateString('es-ES')).replace('  ',' '));
    nombre=prompt('Nombre para guardar el muro:', def);
    if(nombre==null) return;
    nombre=nombre.trim();
    if(!nombre){ log('Sin nombre no se guarda','warn'); return; }
  }
  const body={nombre:nombre, obra:fm.obra||'', cliente:fm.cliente||'', modo:est.modo, resumen:est.resumen, datos:est.datos};
  try{
    let r;
    if(actualizar && window.__muroGuardadoId) r=await api('PUT','/muros/'+window.__muroGuardadoId, body);
    else r=await api('POST','/muros', body);
    window.__muroGuardadoId=r.id; window.__muroGuardadoNombre=r.nombre;
    renderSaveBar(); muroHistCount(); if(window.__histAbierto) renderHistorialMuros();
    log('Muro «'+r.nombre+'» '+(actualizar?'actualizado':'guardado en el historial'));
  }catch(e){ log('No se pudo guardar: '+e.message,'warn'); }
}

async function muroHistCount(){
  try{ const l=await api('GET','/muros'); window.__histLista=l; window.__histN=l.length; setHistCount(); }catch(e){}
}
function setHistCount(){ const e=document.getElementById('hist-n'); if(e) e.textContent=(window.__histN!=null?window.__histN:'…'); }
async function muroHistToggle(){
  window.__histAbierto=!window.__histAbierto;
  const c=document.getElementById('calc-hist');
  if(!window.__histAbierto){ if(c) c.innerHTML=''; return; }
  await renderHistorialMuros();
}
// Filtro del buscador (insensible a mayúsculas y tildes) sobre nombre/obra/cliente/nota/tipo
function histNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function histFiltrado(){
  const list=window.__histLista||[], q=histNorm(window.__histFiltro||'');
  if(!q) return list;
  const modoTxt={simple:'un muro', tramos:'tramos', ele:'l/u'};
  return list.filter(function(m){
    return histNorm(m.nombre).indexOf(q)>=0 || histNorm(m.obra).indexOf(q)>=0 ||
      histNorm(m.cliente).indexOf(q)>=0 || histNorm(m.notas).indexOf(q)>=0 ||
      histNorm(modoTxt[m.modo]||m.modo).indexOf(q)>=0;
  });
}
function histFiltrar(v){
  window.__histFiltro=v;
  const tb=document.getElementById('hist-tbody'); if(tb) tb.innerHTML=histRowsHTML(histFiltrado());
}
function histRowsHTML(list){
  const modoTxt={simple:'Un muro', tramos:'Tramos', ele:'L / U'};
  const fm=x=>String(x).replace('.',',');
  if(!list.length) return '<tr><td colspan="7" class="dim" style="padding:14px;text-align:center">Sin resultados'+(window.__histFiltro?(' para «'+fkEsc(window.__histFiltro)+'»'):'')+'</td></tr>';
  return list.map(function(m){
    const r=m.resumen||{};
    const res=[(r.gaviones!=null?fmtN(r.gaviones)+' gav.':null),(r.m3!=null?fm(r.m3)+' m³':null),
      (r.hmax!=null?'H '+fm(r.hmax)+' m':null),(r.largo!=null?fm(r.largo)+' m':null)].filter(Boolean).join(' · ');
    const editando=(window.__muroGuardadoId===m.id), tieneNota=!!(m.notas&&m.notas.trim());
    return '<tr'+(editando?' style="background:var(--bg2,#eff6ff)"':'')+'>'+
      '<td style="font-weight:600">'+fkEsc(m.nombre)+(editando?' <span class="badge b-steel" style="font-size:10px">editando</span>':'')+'</td>'+
      '<td class="dim">'+fkEsc(m.obra||'—')+'</td><td class="dim">'+fkEsc(m.cliente||'—')+'</td>'+
      '<td><span class="badge b-steel">'+(modoTxt[m.modo]||m.modo||'—')+'</span></td>'+
      '<td class="dim" style="font-size:11.5px">'+res+'</td>'+
      '<td class="dim" style="font-size:11.5px;white-space:nowrap">'+fmtD(m.updated_at)+'</td>'+
      '<td class="r" style="white-space:nowrap"><button class="btn btn-primary btn-sm" onclick="muroCargar('+m.id+')"><i class="ti ti-folder-open"></i> Cargar</button> '+
        '<button class="btn btn-outline btn-sm" title="Duplicar (guardar una copia)" onclick="muroDuplicar('+m.id+')"><i class="ti ti-copy"></i></button> '+
        '<button class="btn btn-outline btn-sm" title="'+(tieneNota?('Nota: '+fkEsc(m.notas)):'Añadir nota')+'" onclick="muroNotaToggle('+m.id+')"><i class="ti ti-note" style="'+(tieneNota?'color:var(--amber)':'')+'"></i></button> '+
        '<button class="btn btn-outline btn-sm" title="Borrar del historial" onclick="muroBorrar('+m.id+')"><i class="ti ti-trash"></i></button></td></tr>'+
      '<tr id="nota-row-'+m.id+'" style="display:none"><td colspan="7" style="background:var(--bg2,#f8fafc);padding:10px 14px">'+
        '<div style="font-size:11px;font-weight:600;margin-bottom:4px"><i class="ti ti-note"></i> Nota de «'+fkEsc(m.nombre)+'»</div>'+
        '<textarea id="nota-txt-'+m.id+'" rows="2" placeholder="Cambios pedidos, estado de la obra, precios…" style="width:100%;font-size:12.5px;padding:8px;border:1px solid var(--border);border-radius:6px;resize:vertical">'+fkEsc(m.notas||'')+'</textarea>'+
        '<div style="margin-top:6px;display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="muroNotaGuardar('+m.id+')"><i class="ti ti-device-floppy"></i> Guardar nota</button>'+
        '<button class="btn btn-outline btn-sm" onclick="muroNotaToggle('+m.id+')">Cerrar</button></div></td></tr>';
  }).join('');
}
async function renderHistorialMuros(){
  const c=document.getElementById('calc-hist'); if(!c) return;
  c.innerHTML='<div class="card" style="margin-bottom:14px"><div class="card-body dim" style="padding:12px 16px">Cargando historial…</div></div>';
  let list=[];
  try{ list=await api('GET','/muros'); }
  catch(e){ c.innerHTML='<div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:12px 16px;color:var(--amber)"><i class="ti ti-alert-triangle"></i> No se pudo cargar el historial: '+fkEsc(e.message)+'</div></div>'; return; }
  window.__histLista=list; window.__histN=list.length; setHistCount();
  if(!list.length){
    c.innerHTML='<div class="card" style="margin-bottom:14px"><div class="card-body dim" style="padding:12px 16px;font-size:12.5px"><i class="ti ti-history"></i> Aún no hay muros guardados. Calcula uno, pon obra y cliente, y dale a «Guardar muro».</div></div>';
    return;
  }
  c.innerHTML='<div class="card" style="margin-bottom:14px"><div class="card-hdr" style="flex-wrap:wrap;gap:8px"><div class="card-title"><i class="ti ti-history"></i> Historial de muros ('+list.length+')</div>'+
      '<input id="hist-buscar" value="'+fkEsc(window.__histFiltro||'')+'" oninput="histFiltrar(this.value)" placeholder="Buscar por nombre, obra, cliente o nota…" style="flex:1;min-width:200px;max-width:340px;font-size:12.5px;padding:6px 10px;border:1px solid var(--border);border-radius:6px"></div>'+
    '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Nombre</th><th>Obra</th><th>Cliente</th><th>Tipo</th><th>Resumen</th><th>Fecha</th><th></th></tr></thead><tbody id="hist-tbody">'+histRowsHTML(histFiltrado())+'</tbody></table></div>'+
    '<div class="card-body dim" style="padding:8px 16px;font-size:11px">Cargar deja el muro en pantalla tal cual se guardó · «Actualizar» lo sobrescribe · <i class="ti ti-copy"></i> duplica · <i class="ti ti-note"></i> nota (ámbar = tiene nota) · <i class="ti ti-trash"></i> borra.</div></div>';
}

async function muroDuplicar(id){
  let full;
  try{ full=await api('GET','/muros/'+id); }
  catch(e){ log('No se pudo leer el muro: '+e.message,'warn'); return; }
  let nombre=prompt('Nombre para la copia:', (full.nombre||'Muro')+' (copia)');
  if(nombre==null) return;
  nombre=nombre.trim();
  if(!nombre){ log('Sin nombre no se duplica','warn'); return; }
  try{
    await api('POST','/muros',{nombre:nombre, obra:full.obra||'', cliente:full.cliente||'', modo:full.modo,
      resumen:full.resumen||{}, datos:full.datos, notas:full.notas||''});
  }catch(e){ log('No se pudo duplicar: '+e.message,'warn'); return; }
  muroHistCount(); if(window.__histAbierto) renderHistorialMuros();
  log('Copia «'+nombre+'» creada en el historial');
}

function muroNotaToggle(id){
  const row=document.getElementById('nota-row-'+id); if(!row) return;
  const abrir=(row.style.display==='none');
  row.style.display=abrir?'':'none';
  if(abrir){ const t=document.getElementById('nota-txt-'+id); if(t){ t.focus(); t.selectionStart=t.value.length; } }
}
async function muroNotaGuardar(id){
  const t=document.getElementById('nota-txt-'+id); if(!t) return;
  let m;
  try{ m=await api('PUT','/muros/'+id+'/notas',{notas:t.value}); }
  catch(e){ log('No se pudo guardar la nota: '+e.message,'warn'); return; }
  const it=(window.__histLista||[]).find(function(x){ return x.id===id; });
  if(it){ it.notas=m.notas; it.updated_at=m.updated_at; }
  const tb=document.getElementById('hist-tbody'); if(tb) tb.innerHTML=histRowsHTML(histFiltrado());
  log(m.notas?'Nota guardada':'Nota borrada');
}

async function muroCargar(id){
  let m;
  try{ m=await api('GET','/muros/'+id); }
  catch(e){ log('No se pudo cargar el muro: '+e.message,'warn'); return; }
  const d=m.datos||{};
  window.__fichaMeta={obra:m.obra||'', cliente:m.cliente||''};
  window.__muroGuardadoId=m.id; window.__muroGuardadoNombre=m.nombre;
  if(m.modo==='ele' && d.ele){   // globales ANTES de renderizar: el formulario los lee
    window.__eleDraw={seg:(d.ele.seg||[]).map(function(s){ return Object.assign({},s); })};
    if(d.ele.H) window.__eleH=d.ele.H;
    window.__eleAncho=d.ele.ancho||null;
    window.__eleCara=d.ele.cara||'int';
  }
  calcModo=m.modo||'simple';
  renderCalculador();
  const S=(eid,v)=>{ const e=document.getElementById(eid); if(e&&v!=null&&v!=='') e.value=v; };
  if(m.modo==='simple' && d.simple){
    S('calc-altura',d.simple.altura); muroToggleAncho(); S('calc-ancho',d.simple.ancho); S('calc-long',d.simple.long);
    calcularMuro();
  } else if(m.modo==='tramos' && d.tramos){
    S('tr-perfil',d.tramos.perfil); tramoTogglePerfil(); S('tr-esc',d.tramos.esc); S('tr-text',d.tramos.text);
    if(d.tramos.cs){ S('cs-ini',d.tramos.cs.ini); S('cs-fin',d.tramos.cs.fin); S('cs-long',d.tramos.cs.long); S('cs-alt',d.tramos.cs.alt); }
    if(d.tramos.tp){ S('tp-rasante',d.tramos.tp.ras); S('tp-terreno',d.tramos.tp.ter); }
    if(d.tramos.sub==='perfil' && d.perfilState){   // rescata TAL CUAL: con los ajustes a mano
      const ps=d.perfilState;
      window.__perfil={base:ps.base, crown:ps.crown, cell:ps.cell, N:ps.N, L:ps.L, rr:ps.rr, tt:ps.tt,
        piezas:ps.piezas, removed:new Set(ps.removed||[])};
      window.__perfilSel=null; window.__perfilRes=document.getElementById('calc-result');
      renderPerfilResult();
    } else if((d.tramos.text||'').trim()) calcularTramos();
  } else if(m.modo==='ele'){
    eleCalcular();
  }
  log('Muro «'+m.nombre+'» cargado — modifícalo y dale a «Actualizar» para sobrescribirlo');
}

async function muroBorrar(id){
  const m=(window.__histLista||[]).find(function(x){ return x.id===id; });
  if(!confirm('¿Borrar del historial «'+(m?m.nombre:'este muro')+'»? No se puede deshacer.')) return;
  try{ await api('DELETE','/muros/'+id); }
  catch(e){ log('No se pudo borrar: '+e.message,'warn'); return; }
  if(window.__muroGuardadoId===id){ window.__muroGuardadoId=null; window.__muroGuardadoNombre=null; renderSaveBar(); }
  muroHistCount(); if(window.__histAbierto) renderHistorialMuros();
  log('Muro borrado del historial');
}
