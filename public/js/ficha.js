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

function fichaSetMeta(){
  window.__fichaMeta = {
    obra: ((document.getElementById('fk-obra')||{}).value||'').trim(),
    cliente: ((document.getElementById('fk-cliente')||{}).value||'').trim()
  };
}
function fkEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// Logo ARISAC (marca tipográfica provisional; sustituible por el logo real)
function fichaLogoArisac(){
  return '<svg width="132" height="40" viewBox="0 0 132 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ARISAC">'+
    '<rect x="1" y="7" width="26" height="26" rx="3" fill="#1e3a5f"/>'+
    '<g stroke="#7f96b3" stroke-width="1">'+
      '<line x1="1" y1="15.7" x2="27" y2="15.7"/><line x1="1" y1="24.3" x2="27" y2="24.3"/>'+
      '<line x1="9.7" y1="7" x2="9.7" y2="33"/><line x1="18.3" y1="7" x2="18.3" y2="33"/></g>'+
    '<text x="34" y="27" font-family="Arial, system-ui, sans-serif" font-weight="800" font-size="21" letter-spacing="1" fill="#1e3a5f">ARISAC</text>'+
    '<rect x="34" y="31" width="93" height="3" fill="#f59e0b"/>'+
  '</svg>';
}
function fichaHead(titulo, sub){
  const hoy = new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'long', year:'numeric'});
  const m = window.__fichaMeta||{};
  return '<div class="fk-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">'+
      '<div><div class="brand">GavControl · Muros de gaviones</div><h1>'+titulo+'</h1><div class="sub">'+sub+'</div></div>'+
      '<div style="flex-shrink:0;background:#fff;border-radius:6px;padding:6px 9px;align-self:center">'+fichaLogoArisac()+'</div>'+
    '</div>'+
    '<div class="fk-meta">'+
      (m.obra?'<div>Obra: <b>'+fkEsc(m.obra)+'</b></div>':'')+
      (m.cliente?'<div>Cliente: <b>'+fkEsc(m.cliente)+'</b></div>':'')+
      '<div>Fecha: <b>'+hoy+'</b></div><div>Prontuario: <b>ARISAC</b></div><div>Documento: <b>Ficha técnica orientativa</b></div></div>';
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
    '<div class="fk-foot"><span>GavControl — Cálculo de muros de gaviones</span><span>Prontuario ARISAC</span></div>';
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

// ── Ficha del muro por perfil (respeta los gaviones quitados a mano) ──
function fichaPerfil(){
  const st=window.__perfil; if(!st){ return; }
  const fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const cnt={}; let vol=0, total=0;
  st.piezas.forEach(function(p,i){ if(st.removed.has(i)) return; const k=p.largo+'|'+p.alto; cnt[k]=(cnt[k]||0)+1; vol+=p.largo*p.alto; total++; });
  const piezas=Object.keys(cnt).map(k=>{ const pp=k.split('|'); return {largo:+pp[0], ancho:1, alto:+pp[1], n:cnt[k]}; }).sort((a,b)=>(b.alto-a.alto)||(b.largo-a.largo));
  const peso=vol*FICHA_PARAM.densRelleno;
  let hMax=0, hMin=1e9; for(let j=0;j<st.N;j++){ const h=st.crown[j]-st.base[j]; hMax=Math.max(hMax,h); hMin=Math.min(hMin,h); }
  const desnivel=st.tt? Math.abs(st.tt[st.N-1]-st.tt[0]) : 0;
  const Ea=0.5*FICHA_PARAM.Ka*FICHA_PARAM.gamma*hMax*hMax;
  const kv=(k,v,hi)=>'<div class="fk-kv'+(hi?' fk-hi':'')+'"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  const leyenda='<div style="font-size:11.5px;color:#475569;margin-top:8px">'+
    '<span style="display:inline-block;width:16px;height:0;border-top:2px solid #dc2626;vertical-align:middle"></span> rasante (calle) &nbsp; '+
    '<span style="display:inline-block;width:16px;height:0;border-top:2px solid #8a6d3b;vertical-align:middle"></span> terreno</div>'+fichaLeyendaNorma();
  const sheet=
    fichaHead('Muro de gaviones · alzado por perfil', 'Relleno entre rasante y terreno · '+fnum(st.L)+' m de longitud'+(st.removed.size?(' · '+st.removed.size+' gaviones ajustados a mano'):''))+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-ruler-2"></i> Datos del muro</h2><div class="fk-grid">'+
        kv('Longitud', fnum(st.L)+' <small>m</small>')+ kv('Altura mín.', fmtm(hMin)+' <small>m</small>')+
        kv('Altura máx.', fmtm(hMax)+' <small>m</small>')+ kv('Desnivel del terreno', fmtm(desnivel)+' <small>m</small>')+
      '</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-chart-bar"></i> Alzado del muro (plano completo)</h2><div class="fk-draw" style="display:block">'+croquisPorCotasInter(st, true)+leyenda+'</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-stack-2"></i> Mediciones y materiales</h2>'+
        '<div class="fk-grid" style="margin-bottom:12px">'+
          kv('Total gaviones', fnum(total), true)+ kv('Relleno granular', fnum(vol,1)+' <small>m³</small>', true)+ kv('Peso aprox. del muro', fnum(peso,1)+' <small>t</small>', true)+
        '</div>'+ fichaDespieceTabla(piezas, total)+
        (st.removed.size?'<div class="dim" style="font-size:11.5px;margin-top:6px;color:#92400e">Se han ajustado (retirado) '+st.removed.size+' gaviones respecto al relleno automático.</div>':'')+'</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-arrow-bar-to-left"></i> Solicitaciones (en la altura máxima)</h2><div class="fk-grid">'+
        kv('Empuje activo del terreno', fnum(Ea,1)+' <small>kN/m</small>')+ kv('Punto de aplicación', fnum(hMax/3,2)+' <small>m sobre base</small>')+
        kv('Coef. empuje activo (Ka)', fmtm(FICHA_PARAM.Ka))+
      '</div></div>'+
      fichaCondiciones()+ fichaNota()+
    '</div>';
  fichaOpen(sheet, 'ficha-muro-perfil');
}

// ── PLANO POR HILADAS (cómo va cada fila por dentro, con las bandas de profundidad) ──
// Vista en planta (desde arriba) de una hilada: largo → , profundidad ↓; bandas trabadas.
function croquisPlantaHilada(c, L){
  const sc=Math.max(4, Math.min(26, 640/L)), xs=sc, ys=sc, gap=1;   // MISMA escala X/Y (proporción real)
  const w=c.w, Wpx=L*xs, Dpx=w*ys;
  const padL=58, padT=16, padR=16, padB=30, x0=padL, y0=padT;
  const vbW=x0+Wpx+padR, vbH=y0+Dpx+padB; let out='';
  const bandas=muroBandas(w); let z=0;
  bandas.forEach(function(bw,bi){
    const off=(c.offset!==(bi%2===1)); let x=0; const yb=y0+z*ys;
    muroTramo(L,off).forEach(function(p){ const pw=p*xs, col=colorGavion(p, bw, c.h);
      out+='<rect x="'+(x0+x*xs).toFixed(1)+'" y="'+yb.toFixed(1)+'" width="'+Math.max(1,pw-gap).toFixed(1)+'" height="'+(bw*ys-gap).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.7"/>';
      if(pw>=13) out+='<text x="'+(x0+x*xs+pw/2).toFixed(1)+'" y="'+(yb+bw*ys/2+3.5).toFixed(1)+'" font-size="9.5" fill="#0f172a" text-anchor="middle" font-family="system-ui">'+String(p).replace('.',',')+'</text>';
      x+=p;
    });
    out+='<text x="'+(x0-8)+'" y="'+(yb+bw*ys/2+3).toFixed(1)+'" font-size="9" fill="#475569" text-anchor="end" font-family="system-ui">'+String(bw).replace('.',',')+' m</text>';
    z+=bw;
  });
  // cota de ancho total (izquierda)
  const dx=x0-34;
  out+='<line x1="'+dx+'" y1="'+y0+'" x2="'+dx+'" y2="'+(y0+Dpx)+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<line x1="'+(dx-3)+'" y1="'+y0+'" x2="'+(dx+3)+'" y2="'+y0+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<line x1="'+(dx-3)+'" y1="'+(y0+Dpx)+'" x2="'+(dx+3)+'" y2="'+(y0+Dpx)+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<text x="'+(dx-5)+'" y="'+(y0+Dpx/2)+'" font-size="10" fill="#334155" text-anchor="middle" transform="rotate(-90 '+(dx-5)+' '+(y0+Dpx/2)+')" font-family="system-ui">ancho '+String(w).replace('.',',')+' m</text>';
  // cota de largo total (abajo) con marcas en las juntas de la banda frontal
  const ly=y0+Dpx+14;
  out+='<line x1="'+x0+'" y1="'+ly+'" x2="'+(x0+Wpx)+'" y2="'+ly+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<line x1="'+x0+'" y1="'+(ly-3)+'" x2="'+x0+'" y2="'+(ly+3)+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<line x1="'+(x0+Wpx)+'" y1="'+(ly-3)+'" x2="'+(x0+Wpx)+'" y2="'+(ly+3)+'" stroke="#94a3b8" stroke-width="1"/>';
  var acc=0; muroTramo(L, c.offset).forEach(function(p){ acc+=p; if(acc<L-1e-6){ const tx=x0+acc*xs; out+='<line x1="'+tx.toFixed(1)+'" y1="'+(ly-2)+'" x2="'+tx.toFixed(1)+'" y2="'+(ly+2)+'" stroke="#cbd5e1" stroke-width="0.8"/>'; } });
  out+='<text x="'+(x0+Wpx/2)+'" y="'+(ly+13)+'" font-size="10" fill="#334155" text-anchor="middle" font-family="system-ui">largo '+fmtN(L)+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),740)+'" style="max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planta acotada de la hilada">'+out+'</svg>';
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
      '<div class="fk-sec"><h2><i class="ti ti-info-circle"></i> Cómo leerlo</h2><div style="font-size:12.5px;color:#334155">Una lámina por hilada, de la más alta a la base. Cada lámina es la <strong>vista en planta</strong> (desde arriba) de esa fila: el largo del muro en horizontal y la profundidad (ancho) en vertical, con las <strong>bandas interiores</strong> que no se ven en alzado. '+fichaLeyendaNorma()+'</div></div>'+
      secs+ fichaNota()+
    '</div>';
  fichaOpen(sheet, 'plano-hiladas-'+fmtm(H)+'m');
}

// ════════════ MURO EN L / U: ficha técnica y plano por hiladas ════════════
// Todo sale de las cajas del modelo 3D (eleBoxes): esquinas engranadas, bandas
// de profundidad y sección del prontuario incluidas → las cuentas siempre cuadran.
function eleDespieceBoxes(boxes){
  const map={}; let vol=0;
  boxes.forEach(function(b){ const an=Math.round(((Math.abs(b.l-b.largo)<1e-6)?b.a:b.l)*100)/100;
    const k=b.largo+'|'+an+'|'+b.h;
    if(!map[k]) map[k]={largo:b.largo, ancho:an, alto:b.h, n:0};
    map[k].n++; vol+=b.l*b.a*b.h; });
  const piezas=Object.keys(map).map(k=>map[k]).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  return {piezas:piezas, vol:vol, total:boxes.length};
}

// ── Ficha del muro en L/U (planta + sección + alzados + despiece del 3D) ──
function fichaEle(){
  const data=window.__muroEle; if(!data||!data.segs||!data.segs.length) return;
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[]; if(!boxes.length) return;
  const d=eleDespieceBoxes(boxes), fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const T=data.T, segs=data.segs, fix=data.ancho||null;
  const largoTot=segs.reduce(function(s,x){return s+x.largo;},0), nEsq=Math.max(0,segs.length-1);
  const Hmax=Math.max.apply(null,T.map(function(t){return t.H;}));
  const peso=d.vol*FICHA_PARAM.densRelleno;
  const Ea=0.5*FICHA_PARAM.Ka*FICHA_PARAM.gamma*Hmax*Hmax;
  const kv=(k,v,hi)=>'<div class="fk-kv'+(hi?' fk-hi':'')+'"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  const alzados=data.estados.map(function(st,i){ return '<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:600;margin-bottom:4px;color:#334155">Recta '+(i+1)+' · '+fnum(T[i].largo)+' m · alt máx '+fmtm(T[i].H)+' m'+(T[i].tr&&T[i].tr.length>1?(' · '+T[i].tr.length+' tramos'):'')+'</div>'+croquisPorCotasInter(st,true)+'</div>'; }).join('');
  const sheet=
    fichaHead('Muro de gaviones en L/U', segs.length+' recta(s) · '+nEsq+' esquina(s) · '+fnum(largoTot)+' m exteriores'+(fix?(' · ancho '+fmtm(fix)+' m'):' · sección prontuario'))+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-ruler-2"></i> Datos del muro</h2><div class="fk-grid">'+
        kv('Longitud total (ext.)', fnum(largoTot)+' <small>m</small>')+ kv('Altura máx.', fmtm(Hmax)+' <small>m</small>')+
        kv('Esquinas', fnum(nEsq))+ kv('Ancho', fix?(fmtm(fix)+' <small>m</small>'):'<span style="font-size:15px">Prontuario</span>')+
      '</div></div>'+
      '<div class="fk-sec"><h2><i class="ti ti-map-2"></i> Planta (medidas exteriores)</h2><div class="fk-draw">'+croquisPlantaLU(segs, fix||1)+'</div>'+
        '<div style="font-size:11.5px;color:#475569;margin-top:6px">Las esquinas van <strong>engranadas</strong>: en cada hilada un gavión cruza el rincón alternando de brazo (matajunta también en el giro).</div></div>'+
      (!fix?('<div class="fk-sec"><h2><i class="ti ti-layout-distribute-horizontal"></i> Sección (prontuario ARISAC)</h2><div class="fk-draw">'+croquisSeccionPront(Hmax, data.cara||'int')+'</div>'+
        '<div style="font-size:11.5px;color:#475569;margin-top:6px">Ensanche de la base: <strong>'+((data.cara==='ext')?'hacia FUERA (la base sobresale de la línea; escalones por delante)':'hacia DENTRO (cara vista lisa; el ensanche va al terreno)')+'</strong>.</div></div>'):'')+
      '<div class="fk-sec"><h2><i class="ti ti-chart-bar"></i> Alzados por tramo</h2>'+alzados+'</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-stack-2"></i> Mediciones y materiales</h2>'+
        '<div class="fk-grid" style="margin-bottom:12px">'+
          kv('Total gaviones', fnum(d.total), true)+ kv('Relleno granular', fnum(d.vol,1)+' <small>m³</small>', true)+ kv('Peso aprox. del muro', fnum(peso,1)+' <small>t</small>', true)+
        '</div>'+ fichaDespieceTabla(d.piezas, d.total)+'</div>'+
      '<div class="fk-sec"><h2><i class="ti ti-arrow-bar-to-left"></i> Solicitaciones (en la altura máxima)</h2><div class="fk-grid">'+
        kv('Empuje activo del terreno', fnum(Ea,1)+' <small>kN/m</small>')+ kv('Punto de aplicación', fnum(Hmax/3,2)+' <small>m sobre base</small>')+
        kv('Coef. empuje activo (Ka)', String(FICHA_PARAM.Ka).replace('.',','))+
      '</div></div>'+
      fichaCondiciones()+ fichaNota()+
    '</div>';
  fichaOpen(sheet, 'ficha-muro-LU');
}

// ── Planta de UNA hilada del L/U (todas las cajas de esa cota, pieza a pieza) ──
function eleCroquisHilada(bs){
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
  bs.forEach(function(b){ minX=Math.min(minX,b.x); maxX=Math.max(maxX,b.x+b.l); minZ=Math.min(minZ,b.z); maxZ=Math.max(maxZ,b.z+b.a); });
  const Wm=Math.max(0.5,maxX-minX), Hm=Math.max(0.5,maxZ-minZ);
  const sc=Math.max(4, Math.min(24, Math.min(620/Wm, 460/Hm)));
  const padL=34, padT=16, padR=16, padB=34;
  const vbW=padL+Wm*sc+padR, vbH=padT+Hm*sc+padB;
  const X=x=>padL+(x-minX)*sc, Y=z=>padT+(maxZ-z)*sc;
  let out='';
  bs.forEach(function(b){
    const col=colorGavion(b.largo, (Math.abs(b.l-b.largo)<1e-6)?b.a:b.l, b.h), rw=b.l*sc, rh=b.a*sc;
    out+='<rect x="'+X(b.x).toFixed(1)+'" y="'+Y(b.z+b.a).toFixed(1)+'" width="'+Math.max(1,rw-1).toFixed(1)+'" height="'+Math.max(1,rh-1).toFixed(1)+'" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="0.7"><title>'+String(b.l).replace('.',',')+' × '+String(b.a).replace('.',',')+' × '+String(b.h).replace('.',',')+' m</title></rect>';
    const cxp=X(b.x)+rw/2, cyp=Y(b.z+b.a)+rh/2, lbl=String(b.largo).replace('.',',');
    if(rw>=17 && rh>=9) out+='<text x="'+cxp.toFixed(1)+'" y="'+(cyp+3.2).toFixed(1)+'" font-size="9" fill="#0f172a" text-anchor="middle" font-family="system-ui">'+lbl+'</text>';
    else if(rh>=17 && rw>=9) out+='<text x="'+cxp.toFixed(1)+'" y="'+cyp.toFixed(1)+'" font-size="9" fill="#0f172a" text-anchor="middle" font-family="system-ui" transform="rotate(-90 '+cxp.toFixed(1)+' '+cyp.toFixed(1)+')" dominant-baseline="middle">'+lbl+'</text>';
  });
  // cotas exteriores del conjunto
  const ly=padT+Hm*sc+14;
  out+='<line x1="'+padL+'" y1="'+ly+'" x2="'+(padL+Wm*sc).toFixed(1)+'" y2="'+ly+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<text x="'+(padL+Wm*sc/2).toFixed(1)+'" y="'+(ly+12)+'" font-size="10" fill="#334155" text-anchor="middle" font-family="system-ui">'+fmtN(Wm)+' m</text>';
  const lx=padL-12;
  out+='<line x1="'+lx+'" y1="'+padT+'" x2="'+lx+'" y2="'+(padT+Hm*sc).toFixed(1)+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<text x="'+(lx-5)+'" y="'+(padT+Hm*sc/2).toFixed(1)+'" font-size="10" fill="#334155" text-anchor="middle" font-family="system-ui" transform="rotate(-90 '+(lx-5)+' '+(padT+Hm*sc/2).toFixed(1)+')">'+fmtN(Hm)+' m</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),720)+'" style="max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Planta de la hilada">'+out+'</svg>';
}

// ── PLANO POR HILADAS del muro en L/U: una lámina en planta por cota, de arriba abajo ──
function elePlanoHiladas(){
  const data=window.__muroEle; if(!data||!data.segs||!data.segs.length) return;
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[]; if(!boxes.length) return;
  const fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const lvls=[]; boxes.forEach(function(b){ if(!lvls.some(function(y){return Math.abs(y-b.y)<1e-6;})) lvls.push(b.y); }); lvls.sort(function(a,b){return a-b;});
  const secs=lvls.slice().reverse().map(function(y){
    const bs=boxes.filter(function(b){return Math.abs(b.y-y)<1e-6;});
    const alto=Math.max.apply(null, bs.map(function(b){return b.h;}));
    const idx=lvls.indexOf(y)+1;
    const cnt={}; bs.forEach(function(b){ const an=Math.round(((Math.abs(b.l-b.largo)<1e-6)?b.a:b.l)*100)/100; const k=b.largo+'|'+an; cnt[k]=(cnt[k]||0)+1; });
    const lista=Object.keys(cnt).sort().map(function(k){ const pp=k.split('|'); return fmtm(+pp[0])+'×'+fmtm(+pp[1])+'×'+fmtm(alto)+' m: <strong>'+cnt[k]+'</strong>'; }).join(' &nbsp;·&nbsp; ');
    return '<div class="fk-sec"><h2><i class="ti ti-layers-subtract"></i> Hilada '+idx+(idx===1?' (base)':'')+' · cota '+fmtm(y)+' m · '+bs.length+' gaviones</h2>'+
      '<div class="fk-draw">'+eleCroquisHilada(bs)+'</div>'+
      '<div style="font-size:12px;margin-top:6px;color:#334155">'+lista+'</div></div>';
  }).join('');
  const chip=(c,s,t)=>'<span style="display:inline-block;width:12px;height:12px;background:'+c+';border:1px solid '+s+';vertical-align:middle"></span> '+t;
  const sheet=fichaHead('Plano por hiladas · muro en L/U', data.T.length+' recta(s) · '+lvls.length+' hiladas · de arriba abajo'+(data.ancho?(' · ancho '+fmtm(data.ancho)+' m'):''))+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-info-circle"></i> Cómo leerlo</h2><div style="font-size:12.5px;color:#334155">Una lámina por hilada, de la más alta a la base. Cada lámina es la <strong>vista en planta</strong> (desde arriba) de esa fila con TODOS los gaviones ya colocados: brazos, esquinas engranadas (headers que cruzan el rincón) y bandas de profundidad. '+fichaLeyendaNorma()+'</div></div>'+
      secs+ fichaNota()+
    '</div>';
  fichaOpen(sheet, 'plano-hiladas-LU');
}

// Leyenda de la norma de colores (tono = tipo ancho×alto · intensidad = largo)
function fichaLeyendaNorma(){
  const chip=(c,t)=>'<span style="display:inline-block;width:12px;height:12px;background:'+c.f+';border:1px solid '+c.s+';vertical-align:middle;border-radius:2px"></span> '+t;
  return '<div style="font-size:11.5px;color:#475569;margin-top:6px"><strong>Norma de colores</strong> — tono = tipo (ancho×alto): '+
    chip(colorGavion(1.5,1,1),'×100×100 azul')+' &nbsp; '+chip(colorGavion(1.5,1,0.5),'×100×50 verde')+' &nbsp; '+
    chip(colorGavion(1.5,0.5,1),'×50×100 marrón')+' &nbsp; '+chip(colorGavion(1.5,0.5,0.5),'×50×50 amarillo')+' &nbsp; '+
    chip(colorGavion(1.5,0.3,1),'×30×100 morado')+' &nbsp; '+chip(colorGavion(1.5,0.3,0.5),'×30×50 rosa')+
    '<br>Intensidad = largo: '+chip(colorGavion(2,1,1),'200 oscuro')+' &nbsp; '+chip(colorGavion(1.5,1,1),'150 medio')+' &nbsp; '+chip(colorGavion(1,1,1),'100 claro')+'</div>';
}

// ════════════ PLANO 2D DEL MURO EN L/U: planta + TODOS los perfiles (alzados) ════════════
// Cada alzado sale de las cajas REALES del modelo 3D (cara frontal de cada recta), con la
// norma de colores por tipo de gavión. Imprimible como plano de obra.
function eleAlzadoFrontal(i){
  const data=window.__muroEle; if(!data) return [];
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[];
  const segs=data.segs, s=segs[i], w=data.ancho||1;
  const R=(typeof eleFootprint==='function')?eleFootprint(segs, w):null; if(!R) return [];
  const r=R[i], arm=[];
  // profundidad respecto a la línea exterior dibujada (NEGATIVA si la base sobresale con
  // «ensanche hacia fuera») + coordenada local a lo largo del brazo
  boxes.forEach(function(b){ if(b.arm!==i) return;
    let depth, lx, len, anc;
    if(s.dx!==0){ const ext=(r.ny>0)? r.ry : (r.ry+r.rh);
      depth=(r.ny>0)? (b.z-ext) : (ext-(b.z+b.a));
      len=b.l; anc=b.a; lx=(s.dx>0)? (b.x-s.p0.x) : (s.p0.x-(b.x+b.l));
    } else { const ext=(r.nx>0)? r.rx : (r.rx+r.rw);
      depth=(r.nx>0)? (b.x-ext) : (ext-(b.x+b.l));
      len=b.a; anc=b.l; lx=(s.dy>0)? (b.z-s.p0.y) : (s.p0.y-(b.z+b.a));
    }
    arm.push({x:lx, y:b.y, largo:len, ancho:anc, alto:b.h, depth:depth});
  });
  // cara vista = cajas sin otra POR DELANTE (misma hilada, solape a lo largo, menor profundidad)
  return arm.filter(function(p){
    return !arm.some(function(q){ return q!==p && Math.abs(q.y-p.y)<1e-6 &&
      Math.min(q.x+q.largo, p.x+p.largo)-Math.max(q.x, p.x)>1e-6 && q.depth<p.depth-1e-6; });
  });
}
function croquisAlzadoPlano(i){
  const data=window.__muroEle, st=data.estados[i], T=data.T[i];
  const piezas=eleAlzadoFrontal(i), fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  const Lm=T.largo, maxTop=Math.max.apply(null, st.crown);
  const sc=Math.max(5.5, Math.min(16, 740/Lm));
  const padL=14, padR=14, padT=(T.tr&&T.tr.length>1)?22:12, padB=30;
  const vbW=padL+Lm*sc+padR, vbH=padT+maxTop*sc+padB, groundY=padT+maxTop*sc;
  const X=x=>padL+x*sc, Y=y=>groundY-y*sc; let out='';
  piezas.forEach(function(p){
    const c=colorGavion(p.largo, p.ancho, p.alto);
    out+='<rect x="'+X(p.x).toFixed(1)+'" y="'+Y(p.y+p.alto).toFixed(1)+'" width="'+Math.max(1,p.largo*sc-0.6).toFixed(1)+'" height="'+Math.max(1,p.alto*sc-0.6).toFixed(1)+'" fill="'+c.f+'" stroke="'+c.s+'" stroke-width="0.6"><title>'+fmtm(p.largo)+' × '+fmtm(p.ancho)+' × '+fmtm(p.alto)+' m</title></rect>';
  });
  // terreno (marrón) y rasante (roja) del motor por cotas
  if(st.tt){ let tp=''; for(let j=0;j<st.N;j++){ tp+=(j?'L':'M')+X((j+0.5)*st.cell).toFixed(1)+' '+Y(st.tt[j]).toFixed(1)+' '; } tp+='L'+X(Lm).toFixed(1)+' '+Y(st.tt[st.N-1]).toFixed(1); out+='<path d="'+tp+'" fill="none" stroke="#8a6d3b" stroke-width="1.6" pointer-events="none"/>'; }
  if(st.rr){ let rp=''; for(let j=0;j<st.N;j++){ rp+=(j?'L':'M')+X((j+0.5)*st.cell).toFixed(1)+' '+Y(st.rr[j]).toFixed(1)+' '; } rp+='L'+X(Lm).toFixed(1)+' '+Y(st.rr[st.N-1]).toFixed(1); out+='<path d="'+rp+'" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="6 3" pointer-events="none"/>'; }
  // juntas de tramo (la recta puede fundir varios tramos)
  if(T.tr && T.tr.length>1){ let d=0;
    T.tr.forEach(function(t,k){
      out+='<text x="'+X(d+t.largo/2).toFixed(1)+'" y="'+(padT-8)+'" font-size="9.5" fill="#64748b" text-anchor="middle">T'+(k+1)+' · '+String(t.largo).replace('.',',')+'</text>';
      d+=t.largo;
      if(k<T.tr.length-1) out+='<line x1="'+X(d).toFixed(1)+'" y1="'+(padT-4)+'" x2="'+X(d).toFixed(1)+'" y2="'+(groundY+6)+'" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="3 3"/>';
    });
  }
  // cota de largo total
  const ly=groundY+16;
  out+='<line x1="'+padL+'" y1="'+ly+'" x2="'+(padL+Lm*sc).toFixed(1)+'" y2="'+ly+'" stroke="#94a3b8" stroke-width="1"/>';
  out+='<text x="'+(padL+Lm*sc/2).toFixed(1)+'" y="'+(ly+11)+'" font-size="10" fill="#334155" text-anchor="middle">'+fnum(Lm)+' m (exterior)</text>';
  return '<svg viewBox="0 0 '+Math.ceil(vbW)+' '+Math.ceil(vbH)+'" width="'+Math.min(Math.ceil(vbW),750)+'" style="max-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:4px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alzado de la recta '+(i+1)+'">'+out+'</svg>';
}
function elePlano(){
  const data=window.__muroEle; if(!data||!data.segs||!data.segs.length) return;
  const boxes=(typeof eleBoxes==='function')?eleBoxes():[]; if(!boxes.length) return;
  const fmtm=x=>String(Math.round(x*100)/100).replace('.',',');
  // recuento por tipo (todas las cajas: cara + bandas + headers)
  const map={}; boxes.forEach(function(b){ const an=Math.round(((Math.abs(b.l-b.largo)<1e-6)?b.a:b.l)*100)/100;
    const k=b.largo+'|'+an+'|'+b.h; if(!map[k])map[k]={largo:b.largo,ancho:an,alto:b.h,n:0}; map[k].n++; });
  const tipos=Object.keys(map).map(k=>map[k]).sort((a,b)=>(b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo));
  const chips=tipos.map(function(t){ const c=colorGavion(t.largo,t.ancho,t.alto);
    return '<span style="display:inline-flex;align-items:center;gap:5px;margin:2px 12px 2px 0;font-size:12.5px"><span style="width:13px;height:13px;background:'+c.f+';border:1px solid '+c.s+';display:inline-block;border-radius:2px"></span>'+Math.round(t.largo*100)+'×'+Math.round(t.ancho*100)+'×'+Math.round(t.alto*100)+': <strong>'+fnum(t.n)+'</strong></span>'; }).join('');
  const T=data.T, nEsq=Math.max(0,data.segs.length-1);
  const largoTot=data.segs.reduce(function(s,x){return s+x.largo;},0);
  const alzados=data.segs.map(function(s,i){
    return '<div class="fk-sec"><h2><i class="ti ti-chart-bar"></i> Perfil · recta '+(i+1)+' · '+fnum(T[i].largo)+' m · alt máx '+fmtm(T[i].H)+' m'+(T[i].tr&&T[i].tr.length>1?(' · '+T[i].tr.length+' tramos fundidos'):'')+'</h2>'+
      '<div class="fk-draw" style="display:block;overflow-x:auto">'+croquisAlzadoPlano(i)+'</div></div>';
  }).join('');
  const sheet=
    fichaHead('Plano 2D · muro en L/U', data.segs.length+' recta(s) · '+nEsq+' esquina(s) · '+fnum(largoTot)+' m exteriores'+(data.ancho?(' · ancho '+fmtm(data.ancho)+' m'):' · sección prontuario')+((data.cara==='ext')?' · base hacia fuera':''))+
    '<div class="fk-body">'+
      '<div class="fk-sec"><h2><i class="ti ti-map-2"></i> Planta (medidas exteriores)</h2><div class="fk-draw">'+croquisPlantaLU(data.segs, data.ancho||1)+'</div></div>'+
      alzados+
      '<div class="fk-sec"><h2><i class="ti ti-palette"></i> Gaviones del muro (uds por tipo, en cm)</h2><div>'+chips+'</div>'+fichaLeyendaNorma()+
        '<div style="font-size:11.5px;color:#475569;margin-top:6px"><span style="display:inline-block;width:16px;border-top:2px solid #8a6d3b;vertical-align:middle"></span> terreno &nbsp; <span style="display:inline-block;width:16px;border-top:2px dashed #dc2626;vertical-align:middle"></span> rasante · Los alzados muestran la cara vista (banda frontal); las bandas de fondo y los headers de esquina están contados en la lista.</div></div>'+
      fichaNota()+
    '</div>';
  fichaOpen(sheet, 'plano-2d-LU');
}
