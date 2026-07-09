// ════════════ FICHA / MEMORIA TÉCNICA (entregable para cliente) ════════════
// Documento dinámico por muro: geometría, sección, mediciones/materiales y
// solicitaciones del prontuario (empuje activo, peso). Imprimible / guardable PDF.

const FICHA_PARAM = { Ka:0.33, gamma:17.38, densRelleno:1.60, talud:'5°' }; // prontuario ARISAC

function fnum(x, dec){ return (x||0).toLocaleString('es-ES', {minimumFractionDigits:dec||0, maximumFractionDigits:dec||0}); }

// Solicitaciones por ml y totales (Rankine activo + peso propio)
function fichaSolic(H, areaMl, L){
  const Ea = 0.5*FICHA_PARAM.Ka*FICHA_PARAM.gamma*H*H;   // kN/ml (empuje activo)
  const pesoMl = areaMl*FICHA_PARAM.densRelleno;          // t/ml
  return { Ea:Ea, EaTot:Ea*L, hAplic:H/3, pesoMl:pesoMl, pesoTot:pesoMl*L, volTot:areaMl*L, areaMl:areaMl };
}

function fichaInjectCSS(){
  if(document.getElementById('ficha-css')) return;
  const s=document.createElement('style'); s.id='ficha-css';
  s.textContent =
    '.fk-ov{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.55);overflow:auto;padding:24px;display:flex;flex-direction:column;align-items:center}'+
    '.fk-bar{position:sticky;top:0;align-self:stretch;display:flex;gap:8px;justify-content:center;margin:-24px -24px 18px;padding:12px;background:#111827}'+
    '.fk-bar button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;font-family:system-ui,sans-serif}'+
    '.fk-bar button:hover{background:#374151}'+
    '.fk-bar .p{background:#2563eb;border-color:#2563eb}'+
    '.fk-sheet{background:#fff;width:820px;max-width:100%;padding:0 0 40px;box-shadow:0 12px 40px rgba(0,0,0,.35);color:#1f2937;font-family:"DM Sans",system-ui,sans-serif;border-radius:4px;overflow:hidden}'+
    '.fk-head{background:linear-gradient(100deg,#1e3a5f,#2563eb);color:#fff;padding:26px 34px}'+
    '.fk-head .brand{font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.85}'+
    '.fk-head h1{margin:6px 0 2px;font-size:24px;font-weight:600}'+
    '.fk-head .sub{font-size:14px;opacity:.9}'+
    '.fk-meta{display:flex;gap:26px;padding:14px 34px;background:#f1f5f9;font-size:13px;color:#475569;flex-wrap:wrap}'+
    '.fk-meta b{color:#0f172a;font-weight:600}'+
    '.fk-body{padding:8px 34px}'+
    '.fk-sec{margin-top:24px}'+
    '.fk-sec h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px;display:flex;align-items:center;gap:7px}'+
    '.fk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}'+
    '.fk-kv{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px}'+
    '.fk-kv .k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}'+
    '.fk-kv .v{font-size:19px;font-weight:700;color:#0f172a;margin-top:3px}'+
    '.fk-kv .v small{font-size:12px;font-weight:500;color:#64748b}'+
    '.fk-hi{background:#eff6ff;border-color:#bfdbfe}'+
    '.fk-hi .v{color:#1d4ed8}'+
    '.fk-tbl{width:100%;border-collapse:collapse;font-size:13px}'+
    '.fk-tbl th,.fk-tbl td{text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb}'+
    '.fk-tbl th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}'+
    '.fk-tbl td.r,.fk-tbl th.r{text-align:right;font-variant-numeric:tabular-nums}'+
    '.fk-tbl tr.tot td{font-weight:700;border-top:2px solid #cbd5e1;background:#f8fafc}'+
    '.fk-draw{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end;justify-content:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#fbfdff}'+
    '.fk-note{margin-top:22px;padding:12px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11.5px;color:#92400e}'+
    '.fk-foot{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}'+
    '@media print{ body>*:not(.fk-ov){display:none!important} .fk-ov{position:static!important;background:#fff!important;padding:0!important;overflow:visible!important} .fk-bar{display:none!important} .fk-sheet{box-shadow:none!important;width:auto!important} .fk-sec{page-break-inside:avoid} }';
  document.head.appendChild(s);
}

function fichaOpen(sheetHtml, fileName){
  fichaInjectCSS();
  const ov=document.createElement('div'); ov.className='fk-ov';
  ov.innerHTML =
    '<div class="fk-bar">'+
      '<button class="p" data-a="print"><i class="ti ti-printer"></i> Imprimir / Guardar PDF</button>'+
      '<button data-a="close"><i class="ti ti-x"></i> Cerrar</button>'+
    '</div><div class="fk-sheet">'+sheetHtml+'</div>';
  document.body.appendChild(ov);
  ov.querySelector('[data-a="close"]').onclick = ()=>ov.remove();
  ov.querySelector('[data-a="print"]').onclick = ()=>window.print();
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.addEventListener('keydown', function esc(ev){ if(ev.key==='Escape' && document.body.contains(ov)){ ov.remove(); document.removeEventListener('keydown', esc); } });
}

function fichaHead(titulo, sub){
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'});
  return '<div class="fk-head"><div class="brand">GavControl · Muros de gaviones</div><h1>'+titulo+'</h1><div class="sub">'+sub+'</div></div>'+
    '<div class="fk-meta"><div>Fecha: <b>'+hoy+'</b></div><div>Prontuario: <b>ARISAC (A. Bedia)</b></div><div>Documento: <b>Ficha técnica orientativa</b></div></div>';
}

function fichaDespieceTabla(piezas, totalGav){
  const fmtm = x=>String(x).replace('.',',');
  return '<table class="fk-tbl"><thead><tr><th>Pieza</th><th>Medidas (l × a × h)</th><th class="r">Uds.</th></tr></thead><tbody>'+
    piezas.map(p=>'<tr><td>Gavión '+fmtm(p.largo)+' m</td><td>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</td><td class="r">'+fnum(p.n)+'</td></tr>').join('')+
    '<tr class="tot"><td colspan="2">Total gaviones</td><td class="r">'+fnum(totalGav)+'</td></tr></tbody></table>';
}

function fichaCondiciones(){
  return '<div class="fk-sec"><h2><i class="ti ti-clipboard-text"></i> Bases de cálculo (prontuario ARISAC)</h2>'+
    '<table class="fk-tbl"><tbody>'+
      '<tr><td>Ángulo de rozamiento interno del trasdós (Ø)</td><td class="r">30°</td></tr>'+
      '<tr><td>Peso específico del trasdós (γ)</td><td class="r">17,38 kN/m³</td></tr>'+
      '<tr><td>Coeficiente de empuje activo (Ka)</td><td class="r">0,33</td></tr>'+
      '<tr><td>Densidad de relleno del gavión</td><td class="r">1.600 kg/m³</td></tr>'+
      '<tr><td>Sobrecarga / nivel freático</td><td class="r">No considerados</td></tr>'+
      '<tr><td>Cimentación</td><td class="r">5° sobre hormigón de limpieza</td></tr>'+
      '<tr><td>Talud del paramento</td><td class="r">'+FICHA_PARAM.talud+'</td></tr>'+
    '</tbody></table></div>';
}

function fichaNota(){
  return '<div class="fk-note"><strong>Nota:</strong> Documento orientativo para presupuesto y composición del muro, basado en el prontuario ARISAC para las condiciones indicadas. El empuje y el peso se calculan según dichos parámetros (empuje activo de Rankine). No sustituye al proyecto de ejecución ni al cálculo geotécnico firmado; el trabado y el reparto de piezas se ajustan en obra.</div>'+
    '<div class="fk-foot"><span>GavControl — Cálculo de muros de gaviones</span><span>Prontuario ARISAC · A. Bedia</span></div>';
}

// ── Ficha de un muro simple (escalonado prontuario o recto) ──
function fichaSingle(H, L, ancho){
  const d = muroDespiece(H, L, (ancho!=null ? ancho : (H<2 ? 0.5 : null)));
  const r = {tipo:d.tipo, piezas:d.piezas, granular:d.granular};
  const totalGav = d.total;
  const areaMl = r.granular/L;
  const s = fichaSolic(H, areaMl, L);
  const esc = (r.tipo==='escalonado');
  const hStr=String(H).replace('.',','), aBase = d.base;

  const filasPerfil = d.courses.map((c,i)=>({c:c,i:i})).reverse()
    .map(o=>'<tr><td>'+(o.i+1)+(o.i===0?' (base)':'')+'</td><td class="r">'+String(o.c.w).replace('.',',')+' m</td><td class="r">'+String(o.c.h).replace('.',',')+' m</td></tr>').join('');
  const seccionBloque = '<div class="fk-draw">'+croquisSeccionC(d.courses)+croquis3DC(d.courses, Math.min(L,8))+'</div>'+
    '<table class="fk-tbl" style="margin-top:12px"><thead><tr><th>Hilada</th><th class="r">Ancho</th><th class="r">Alto</th></tr></thead><tbody>'+filasPerfil+'</tbody></table>';

  const sheet =
    fichaHead('Muro de gaviones · '+hStr+' m de altura', (esc?'Sección escalonada según prontuario':'Muro recto de ancho uniforme')+' · longitud '+fnum(L)+' m')+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-ruler-2"></i> Datos del muro</h2><div class="fk-grid">'+
        '<div class="fk-kv"><div class="k">Altura</div><div class="v">'+hStr+' <small>m</small></div></div>'+
        '<div class="fk-kv"><div class="k">Longitud</div><div class="v">'+fnum(L)+' <small>m</small></div></div>'+
        '<div class="fk-kv"><div class="k">Ancho en base</div><div class="v">'+String(aBase).replace('.',',')+' <small>m</small></div></div>'+
        '<div class="fk-kv"><div class="k">Tipo</div><div class="v" style="font-size:15px">'+(esc?'Escalonado':'Recto')+'</div></div>'+
      '</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-box-model"></i> Sección transversal</h2>'+seccionBloque+'</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-stack-2"></i> Mediciones y materiales</h2>'+
        '<div class="fk-grid" style="margin-bottom:12px">'+
          '<div class="fk-kv fk-hi"><div class="k">Total gaviones</div><div class="v">'+fnum(totalGav)+'</div></div>'+
          '<div class="fk-kv fk-hi"><div class="k">Relleno granular</div><div class="v">'+fnum(s.volTot,1)+' <small>m³</small></div></div>'+
          '<div class="fk-kv fk-hi"><div class="k">Peso aprox. del muro</div><div class="v">'+fnum(s.pesoTot,1)+' <small>t</small></div></div>'+
        '</div>'+ fichaDespieceTabla(r.piezas, totalGav)+
      '</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-arrow-bar-to-left"></i> Solicitaciones</h2><div class="fk-grid">'+
        '<div class="fk-kv"><div class="k">Empuje activo del terreno</div><div class="v">'+fnum(s.Ea,1)+' <small>kN/m</small></div></div>'+
        '<div class="fk-kv"><div class="k">Empuje total</div><div class="v">'+fnum(s.EaTot,0)+' <small>kN</small></div></div>'+
        '<div class="fk-kv"><div class="k">Punto de aplicación</div><div class="v">'+fnum(s.hAplic,2)+' <small>m sobre base</small></div></div>'+
        '<div class="fk-kv"><div class="k">Peso propio</div><div class="v">'+fnum(s.pesoMl,2)+' <small>t/m</small></div></div>'+
      '</div></div>'+
      fichaCondiciones()+
      fichaNota()+
    '</div>';
  fichaOpen(sheet, 'ficha-muro-'+hStr+'m');
}

// ── Ficha de un muro por tramos (calle en pendiente) ──
function fichaTramos(){
  const data = window.__muroTramos; if(!data || !data.tramos.length) return;
  const tramos = data.tramos, perfil = data.perfil, fmtm = x=>String(x).replace('.',',');
  const agg={}; let granTot=0, gavTot=0, largoTot=0, hMax=0, EaMax=0;
  const filas = tramos.map(function(t, i){
    const r = muroPiezasTramo(t); let n=0;
    r.piezas.forEach(p=>{ const k=p.largo+'|'+p.ancho+'|'+p.alto; if(!agg[k])agg[k]={largo:p.largo,ancho:p.ancho,alto:p.alto,n:0}; agg[k].n+=p.n; n+=p.n; });
    const Ea = 0.5*FICHA_PARAM.Ka*FICHA_PARAM.gamma*t.H*t.H;
    granTot+=r.granular; gavTot+=n; largoTot+=t.L; hMax=Math.max(hMax,t.H); EaMax=Math.max(EaMax,Ea);
    return {i:i+1, t:t, tipo:r.tipo, n:n, gran:r.granular, Ea:Ea};
  });
  const pesoTot = granTot*FICHA_PARAM.densRelleno;
  const piezas = Object.keys(agg).map(k=>agg[k]).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  const dibujo = perfil==='esc' ? croquisPerfilEscalonado(tramos) : croquisPerfilLongitudinal(tramos);

  const porTramo = '<table class="fk-tbl"><thead><tr><th>Tramo</th><th class="r">Largo</th><th class="r">Alto</th><th>Tipo</th><th class="r">Gaviones</th><th class="r">Granular</th><th class="r">Empuje</th></tr></thead><tbody>'+
    filas.map(f=>'<tr><td>'+f.i+'</td><td class="r">'+fnum(f.t.L)+' m</td><td class="r">'+fmtm(f.t.H)+' m</td><td>'+f.tipo+'</td><td class="r">'+fnum(f.n)+'</td><td class="r">'+fnum(f.gran,1)+' m³</td><td class="r">'+fnum(f.Ea,1)+' kN/m</td></tr>').join('')+
    '<tr class="tot"><td colspan="4">Totales</td><td class="r">'+fnum(gavTot)+'</td><td class="r">'+fnum(granTot,1)+' m³</td><td class="r">—</td></tr></tbody></table>';

  const sheet =
    fichaHead('Muro de gaviones por tramos', 'Calle en pendiente · '+tramos.length+' tramos · '+fnum(largoTot)+' m · perfil '+(perfil==='esc'?'todo escalonado':'base corrida'))+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-ruler-2"></i> Resumen</h2><div class="fk-grid">'+
        '<div class="fk-kv fk-hi"><div class="k">Total gaviones</div><div class="v">'+fnum(gavTot)+'</div></div>'+
        '<div class="fk-kv fk-hi"><div class="k">Relleno granular</div><div class="v">'+fnum(granTot,1)+' <small>m³</small></div></div>'+
        '<div class="fk-kv fk-hi"><div class="k">Peso aprox.</div><div class="v">'+fnum(pesoTot,1)+' <small>t</small></div></div>'+
        '<div class="fk-kv"><div class="k">Altura máx.</div><div class="v">'+fmtm(hMax)+' <small>m</small></div></div>'+
      '</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-chart-bar"></i> Perfil longitudinal</h2><div class="fk-draw">'+dibujo+'</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-list-numbers"></i> Desglose por tramo</h2>'+porTramo+'</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-stack-2"></i> Materiales (total)</h2>'+fichaDespieceTabla(piezas, gavTot)+'</div>'+
      fichaCondiciones()+
      fichaNota()+
    '</div>';
  fichaOpen(sheet, 'ficha-muro-tramos');
}

// ── PLANO POR HILADAS (cómo va cada fila por dentro, con las bandas de profundidad) ──
// Vista en planta (desde arriba) de una hilada: largo → , profundidad ↓; bandas trabadas.
function croquisPlantaHilada(c, L){
  const xs=Math.max(4, Math.min(18, 720/L)), ys=24, gap=1;
  const w=c.w, Wpx=L*xs, Dpx=w*ys, padL=8,padT=8,padR=8,padB=6;
  const vbW=padL+Wpx+padR, vbH=padT+Dpx+padB; let out='';
  const bandas=muroBandas(w); let z=0;
  bandas.forEach(function(bw,bi){
    const off=(c.offset!==(bi%2===1)); let x=0; const y=padT+z*ys;
    muroTramo(L,off).forEach(function(p){ const pw=p*xs, col=muroColorPieza(p);
      out+='<rect x="'+(padL+x*xs).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(bw*ys-gap).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.6"/>';
      x+=p;
    });
    z+=bw;
  });
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),740)+'" style="max-width:100%;background:#fff" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planta de la hilada">'+out+'</svg>';
}
function planoFilas(H, L, ancho){
  const d=muroDespiece(H, L, (ancho!=null?ancho:(H<2?0.5:null)));
  const fmtm=x=>String(x).replace('.',',');
  const secs=d.filas.slice().reverse().map(function(f){
    const cnt={}; f.bandas.forEach(function(bw,bi){ const off=(f.offset!==(bi%2===1)); muroTramo(L,off).forEach(function(p){ const k=p+'|'+bw; cnt[k]=(cnt[k]||0)+1; }); });
    const lista=Object.keys(cnt).sort().map(function(k){ const pp=k.split('|'); return fmtm(+pp[0])+'×'+fmtm(+pp[1])+'×'+fmtm(f.h)+' m: <strong>'+cnt[k]+'</strong>'; }).join(' &nbsp;·&nbsp; ');
    return '<div class="fk-sec"><h2><i class="ti ti-layers-subtract"></i> Hilada '+f.course+(f.course===1?' (base)':'')+' · ancho '+fmtm(f.w)+' m · alto '+fmtm(f.h)+' m</h2>'+
      '<div class="dim" style="font-size:11px;margin-bottom:6px;color:#64748b">Planta (desde arriba): largo →, profundidad ↓. Bandas trabadas entre sí.</div>'+
      '<div class="fk-draw">'+croquisPlantaHilada({w:f.w,h:f.h,offset:f.offset}, L)+'</div>'+
      '<div style="font-size:12px;margin-top:6px;color:#334155">'+lista+'</div></div>';
  }).join('');
  const sheet=fichaHead('Plano por hiladas · muro '+fmtm(H)+' m × '+fnum(L)+' m',
      'Cómo va cada fila por dentro (bandas de profundidad incluidas) · de arriba abajo')+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-info-circle"></i> Cómo leerlo</h2><div style="font-size:12.5px;color:#334155">Una lámina por hilada, de la más alta a la base. Cada lámina es la <strong>vista en planta</strong> (desde arriba) de esa fila: el largo del muro en horizontal y la profundidad (ancho) en vertical, con las <strong>bandas interiores</strong> que no se ven en alzado. Los colores son la medida de la pieza (azul 2 m · verde 1,5 m · ámbar 1 m).</div></div>'+
      secs+ fichaNota()+
    '</div>';
  fichaOpen(sheet, 'plano-hiladas-'+fmtm(H)+'m');
}
