// ════════════ MESA DE VIBRADO (pantalla de producción) ════════════
var MESA_CATS=[
  {id:'forna', nombre:'GAVIÓN VIBRADO FORNA', kw:'FORNA'},
  {id:'rojo',  nombre:'GAVIÓN VIBRADO ROJO',  kw:'ROJO'},
  {id:'gris',  nombre:'GAVIÓN VIBRADO GRIS',  kw:'GRIS'},
  {id:'blanco',nombre:'GAVIÓN VIBRADO BLANCO',kw:'BLANCO'}
];
var MESA_ANCHOS=[20,30,50,100];
var mesaPaso='inicio', mesaCat=null, mesaAncho=null, mesaTipo='vibrado';
var kpProductoId=null, kpValor='', kpZona='vibrado', kpMax=null;

function mesaNorm(s){ return (s||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function mesaAnchoCm(p){ var a=+p.ancho||0; return a>0&&a<=5?Math.round(a*100):Math.round(a); }
function mesaProductosCat(cat){
  var kw=mesaNorm(cat.kw);
  return productos.filter(function(p){
    if(p.activo===false) return false;
    var d=mesaNorm((p.descripcion||'')+' '+(p.referencia||''));
    return d.includes('VIBRAD')&&d.includes(kw);
  });
}
function mesaEsAngulo(p){
  var d=(p.descripcion||'')+' '+(p.referencia||'');
  if(/45\s*[º°]/.test(d)) return true;          // "45º" / "45°"
  return mesaNorm(d).includes('ANGUL');          // "ángulo" / "angulo"
}
function mesaEs70(p){ return mesaAnchoCm({ancho:p.alto})===70; } // alto = 70 cm
// Bloque de orden: 0 normal · 1 ángulos · 2 alto 70 cm (al final del todo)
function mesaBloque(p){
  if(mesaEs70(p)) return 2;
  if(mesaEsAngulo(p)) return 1;
  return 0;
}
function mesaProductosCatAncho(cat,cm){
  return mesaProductosCat(cat).filter(function(p){return mesaAnchoCm(p)===cm;})
    .sort(function(a,b){
      var ba=mesaBloque(a), bb=mesaBloque(b);
      if(ba!==bb) return ba-bb;                        // normal → ángulos → 70cm
      var altoA=+a.alto||0, altoB=+b.alto||0;
      if(altoB!==altoA) return altoB-altoA;            // alto: mayor a menor
      var largoA=+a.largo||0, largoB=+b.largo||0;
      return largoB-largoA;                            // largo: mayor a menor
    });
}

// Actualiza los contadores del conmutador Montaje/Vibrado/Carado:
//  · Vibrado = unidades en montaje (vacíos pendientes de vibrar)
//  · Carado  = unidades en carado (vibrados pendientes de carar)
function updateFabricaBadge(){
  var totVibrado=(montaje||[]).reduce(function(s,c){return s+Math.round(+c.cantidad||0);},0);
  var totCarado=(carado||[]).reduce(function(s,c){return s+Math.round(+c.cantidad||0);},0);
  document.querySelectorAll('.ft-badge-vibrado').forEach(function(e){ e.textContent=fmtN(totVibrado); });
  document.querySelectorAll('.ft-badge-carado').forEach(function(e){ e.textContent=fmtN(totCarado); });
}
function renderMesa(){
  var el=document.getElementById('mesa-content');
  if(!el) return;
  updateFabricaBadge();
  el.classList.toggle('full', mesaPaso==='nuevo-art'||mesaPaso==='pre-art');
  if(mesaPaso==='inicio'){
    el.innerHTML='<div class="mesa-grid">'+
      '<button class="mesa-btn b-nuevo" onclick="mesaTipoSel(\'vibrado\')"><i class="ti ti-tools"></i> VIBRADO<small>Montar gavión para vibrar</small></button>'+
      '<button class="mesa-btn b-art" style="background:#16a34a;color:#fff;border-color:#15803d" onclick="mesaTipoSel(\'premontado\')"><i class="ti ti-box"></i> PREMONTADO<small>Montar y pasar a stock</small></button>'+
      '<button class="mesa-btn b-repetir" onclick="mesaIr(\'repetir\')"><i class="ti ti-repeat"></i> REPETIR<small>Volver a montar lo último</small></button>'+
    '</div>';
    return;
  }
  if(mesaPaso==='repetir'){ renderMesaRepetir(el); return; }
  if(mesaPaso==='pre-ancho'){
    el.innerHTML=mesaPreCrumbs()+
      '<div class="mesa-grid cols4">'+MESA_ANCHOS.map(function(cm){
        var n=montadoProductosAncho(cm).length;
        return '<button class="mesa-btn b-ancho" onclick="mesaPreSelAncho('+cm+')">'+cm+' CM<small>'+(n?n+' art.':'—')+'</small></button>';
      }).join('')+'</div>';
    return;
  }
  if(mesaPaso==='pre-art'){
    var pre=montadoProductosAncho(mesaAncho);
    el.innerHTML=mesaPreCrumbs()+
      (pre.length?'<div class="mesa-grid arts">'+pre.map(function(p){
        return '<button class="mesa-btn b-art" onclick="mesaPreAbrirCantidad('+p.id+')"><span class="desc">'+(p.descripcion||'(sin descripción)')+'</span><span class="ref">'+(p.referencia||'(sin ref)')+' · '+dimStr(p)+'</span></button>';
      }).join('')+'</div>'
      :'<div class="mesa-empty"><i class="ti ti-package-off" style="font-size:40px;display:block;margin-bottom:10px"></i>No hay premontados con ancho '+mesaAncho+' cm.</div>');
    return;
  }
  if(mesaPaso==='nuevo-cat'){
    el.innerHTML=mesaCrumbs()+
      '<div class="mesa-grid">'+MESA_CATS.map(function(c){
        var n=mesaProductosCat(c).length;
        return '<button class="mesa-btn b-cat cat-'+c.id+'" onclick="mesaSelCat(\''+c.id+'\')">'+c.nombre+'<small>'+(n?n+' artículo'+(n===1?'':'s'):'sin artículos')+'</small></button>';
      }).join('')+'</div>';
    return;
  }
  if(mesaPaso==='nuevo-ancho'){
    var cat=MESA_CATS.find(function(c){return c.id===mesaCat;});
    el.innerHTML=mesaCrumbs()+
      '<div class="mesa-grid cols4">'+MESA_ANCHOS.map(function(cm){
        var n=mesaProductosCatAncho(cat,cm).length;
        return '<button class="mesa-btn b-ancho" onclick="mesaSelAncho('+cm+')">'+cm+' CM<small>'+(n?n+' art.':'—')+'</small></button>';
      }).join('')+'</div>';
    return;
  }
  if(mesaPaso==='nuevo-art'){
    var cat2=MESA_CATS.find(function(c){return c.id===mesaCat;});
    var arts=mesaProductosCatAncho(cat2,mesaAncho);
    el.innerHTML=mesaCrumbs()+
      (arts.length?'<div class="mesa-grid arts">'+arts.map(function(p){
        return '<button class="mesa-btn b-art" onclick="mesaAbrirCantidad('+p.id+')"><span class="desc">'+(p.descripcion||'(sin descripción)')+'</span><span class="ref">'+(p.referencia||'(sin ref)')+' · '+dimStr(p)+'</span></button>';
      }).join('')+'</div>'
      :'<div class="mesa-empty"><i class="ti ti-package-off" style="font-size:40px;display:block;margin-bottom:10px"></i>No hay artículos de '+cat2.nombre+' con ancho '+mesaAncho+' cm.</div>');
    return;
  }
}

function mesaCrumbs(){
  var parts=['<span class="crumb" onclick="mesaIr(\'nuevo-cat\')">Nuevo</span>'];
  if(mesaCat){var c=MESA_CATS.find(function(x){return x.id===mesaCat;});parts.push(mesaPaso==='nuevo-ancho'?'<span>'+c.nombre+'</span>':'<span class="crumb" onclick="mesaSelCat(\''+mesaCat+'\')">'+c.nombre+'</span>');}
  if(mesaAncho&&mesaPaso==='nuevo-art'){parts.push('<span>'+mesaAncho+' cm</span>');}
  return '<button class="mesa-back" onclick="mesaAtras()"><i class="ti ti-arrow-left"></i> Atrás</button>'+
    '<div class="mesa-bc">'+parts.join('<i class="ti ti-chevron-right" style="font-size:14px;color:var(--text2)"></i>')+'</div>';
}

function mesaIr(paso){ mesaPaso=paso; if(paso==='inicio'||paso==='nuevo-cat'){mesaCat=null;mesaAncho=null;} renderMesa(); }
function mesaTipoSel(t){ mesaTipo=t; mesaCat=null; mesaAncho=null; mesaPaso=(t==='premontado')?'pre-ancho':'nuevo-cat'; renderMesa(); }
function mesaSelCat(id){ mesaCat=id; mesaAncho=null; mesaPaso='nuevo-ancho'; renderMesa(); }
function mesaSelAncho(cm){ mesaAncho=cm; mesaPaso='nuevo-art'; renderMesa(); }
function mesaPreSelAncho(cm){ mesaAncho=cm; mesaPaso='pre-art'; renderMesa(); }
function mesaPreAbrirCantidad(pid){ abrirKeypad(pid,'','montaje-premontado'); }
function mesaPreCrumbs(){
  var parts=['<span class="crumb" onclick="mesaTipoSel(\'premontado\')">Premontados</span>'];
  if(mesaAncho&&mesaPaso==='pre-art') parts.push('<span>'+mesaAncho+' cm</span>');
  return '<button class="mesa-back" onclick="mesaAtras()"><i class="ti ti-arrow-left"></i> Atrás</button>'+
    '<div class="mesa-bc">'+parts.join('<i class="ti ti-chevron-right" style="font-size:14px;color:var(--text2)"></i>')+'</div>';
}
function mesaAtras(){
  if(mesaPaso==='nuevo-art'){ mesaPaso='nuevo-ancho'; mesaAncho=null; }
  else if(mesaPaso==='nuevo-ancho'){ mesaPaso='nuevo-cat'; mesaCat=null; }
  else if(mesaPaso==='pre-art'){ mesaPaso='pre-ancho'; mesaAncho=null; }
  else { mesaPaso='inicio'; }
  renderMesa();
}

function guardarUltimoVibrado(pid,cant,tipo){
  try{
    var p=productos.find(function(x){return String(x.id)===String(pid);});
    localStorage.setItem('gav_ultimo_vibrado',JSON.stringify({
      producto_id:+pid, referencia:p?p.referencia:'', descripcion:p?p.descripcion:'',
      cantidad:+cant, tipo:tipo||'vibrado', created_at:new Date().toISOString()
    }));
  }catch(e){}
}
function mesaUltimaProduccion(){
  try{ var s=localStorage.getItem('gav_ultimo_vibrado'); if(s){ var o=JSON.parse(s); if(o&&o.producto_id) return o; } }catch(e){}
  // Compatibilidad: producciones antiguas que sí dejaban movimiento de stock
  var lista=movimientos.filter(function(m){return m.tipo==='entrada'&&mesaNorm(m.motivo).includes('MESA DE VIBRADO');});
  return lista.length?lista[0]:null;
}
function renderMesaRepetir(el){
  var ult=mesaUltimaProduccion();
  var back='<button class="mesa-back" onclick="mesaIr(\'inicio\')"><i class="ti ti-arrow-left"></i> Atrás</button>';
  if(!ult){
    el.innerHTML=back+'<div class="mesa-empty"><i class="ti ti-repeat-off" style="font-size:40px;display:block;margin-bottom:10px"></i>Todavía no hay ninguna producción registrada para repetir.</div>';
    return;
  }
  el.innerHTML=back+
    '<div class="mesa-bc"><span class="crumb" onclick="mesaIr(\'inicio\')"><i class="ti ti-home"></i> Inicio</span><i class="ti ti-chevron-right" style="font-size:14px;color:var(--text2)"></i><span>Repetir</span></div>'+
    '<div class="mesa-grid cols1">'+
      '<div class="mesa-btn b-art" style="cursor:default"><span class="ref">'+ult.referencia+'</span><span class="desc">'+(ult.descripcion||'')+'</span><span class="desc">Última: '+fmtN(ult.cantidad)+' ud · '+fmtFechaHora(ult.created_at)+'</span></div>'+
      '<button class="mesa-btn b-repetir" onclick="mesaRepetir('+ult.producto_id+','+(Math.round(+ult.cantidad)||0)+',\''+(ult.tipo||'vibrado')+'\')"><i class="ti ti-repeat"></i> REPETIR<small>'+ult.referencia+' — '+fmtN(ult.cantidad)+' ud'+(ult.tipo==='premontado'?' · premontado':'')+'</small></button>'+
    '</div>';
}
function mesaRepetir(pid,cant,tipo){ abrirKeypad(pid, String(cant||''), tipo==='premontado'?'montaje-premontado':'montaje'); }

function mesaAbrirCantidad(pid){ abrirKeypad(pid,'','montaje'); }
function abrirKeypad(pid,inicial,zona,max){
  kpProductoId=pid; kpValor=inicial||''; kpZona=zona||'montaje'; kpMax=(max&&max>0)?max:null;
  var p=productos.find(function(x){return String(x.id)===String(pid);});
  var maxTxt=kpMax?'<div class="desc" style="color:var(--amber);font-weight:600">Disponible: '+fmtN(kpMax)+'</div>':'';
  document.getElementById('kp-prod').innerHTML=p?('<div class="ref">'+(p.referencia||'')+'</div><div class="desc">'+(p.descripcion||'')+' · '+dimStr(p)+'</div>'+maxTxt):'';
  var lbl={montaje:'Montar (a vibrar)','montaje-premontado':'Montar premontado (a stock)',vibrado:'Vibrar (a carado)',carado:'Pasar a stock',montado:'Añadir a stock','montaje-del':'Borrar de montaje','carado-del':'Borrar de carado'}[kpZona]||'Añadir a stock';
  var lblEl=document.getElementById('kp-ok-label'); if(lblEl) lblEl.textContent=lbl;
  kpRender();
  document.getElementById('kp-overlay').classList.add('open');
}
function kpRender(){ document.getElementById('kp-display').textContent=(kpValor===''?'0':kpValor); }
function kpDigit(d){
  if(kpValor==='0') kpValor='';
  if(d==='00'&&kpValor==='') return;
  if((kpValor+d).length<=6) kpValor+=d;
  if(kpMax&&parseInt(kpValor)>kpMax) kpValor=String(kpMax);   // no superar lo apilado en carado
  kpRender();
}
function kpClear(){ kpValor=kpValor.slice(0,-1); kpRender(); }
function kpCancel(){ document.getElementById('kp-overlay').classList.remove('open'); kpProductoId=null; kpValor=''; kpMax=null; }
async function kpConfirm(){
  var cant=parseInt(kpValor)||0;
  if(!kpProductoId||cant<=0){ log('Introduce una cantidad','warn'); return; }
  if(kpMax&&cant>kpMax){ log('Máximo '+fmtN(kpMax)+' ud','warn'); return; }
  var p=productos.find(function(x){return String(x.id)===String(kpProductoId);});
  var refTxt=p?p.referencia:'producto';
  try{
    if(kpZona==='montaje'){
      // Montaje: deja gaviones vacíos montados (preparados para vibrar)
      await api('POST','/montaje/add',{producto_id:+kpProductoId,cantidad:cant});
      guardarUltimoVibrado(kpProductoId,cant,'vibrado');
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('✓ '+cant+' ud de '+refTxt+' montadas (preparadas para vibrar)','ok');
      mesaPaso='inicio'; mesaCat=null; mesaAncho=null; renderMesa();
    } else if(kpZona==='montaje-premontado'){
      // Premontado: se monta y va DIRECTO a stock
      await api('POST','/montaje/premontado',{producto_id:+kpProductoId,cantidad:cant});
      guardarUltimoVibrado(kpProductoId,cant,'premontado');
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('✓ '+cant+' ud de '+refTxt+' premontadas → stock','ok');
      mesaPaso='inicio'; mesaCat=null; mesaAncho=null; renderMesa();
    } else if(kpZona==='vibrado'){
      // Vibrar: pasa del montaje al carado
      await api('POST','/montaje/to-carado',{producto_id:+kpProductoId,cantidad:cant});
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('✓ '+cant+' ud de '+refTxt+' vibradas (pasan a carado)','ok');
      renderVibrado();
    } else if(kpZona==='montaje-del'){
      await api('POST','/montaje/remove',{producto_id:+kpProductoId,cantidad:cant});
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('🗑 '+cant+' ud de '+refTxt+' borradas de montaje','ok');
      renderVibrado();
    } else if(kpZona==='carado'){
      await api('POST','/carado/to-stock',{producto_id:+kpProductoId,cantidad:cant});
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('✓ '+cant+' ud de '+refTxt+' pasadas a stock','ok');
      renderCarado();
    } else if(kpZona==='carado-del'){
      await api('POST','/carado/remove',{producto_id:+kpProductoId,cantidad:cant});
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('🗑 '+cant+' ud de '+refTxt+' borradas de carado','ok');
      renderCarado();
    } else { // montado
      await api('POST','/stock/movimiento',{producto_id:+kpProductoId,tipo:'entrada',cantidad:cant,motivo:'Zona montado'});
      document.getElementById('kp-overlay').classList.remove('open'); kpMax=null;
      await loadAll();
      log('✓ '+cant+' ud de '+refTxt+' añadidas a stock','ok');
      montadoPaso='inicio'; montadoAncho=null; renderMontado();
    }
  }catch(e){ log('Error: '+e.message,'warn'); }
}

// ════════════ ZONA DE CARADO (paso intermedio vibrado → stock) ════════════
function gavionColor(p){
  var d=mesaNorm((p.descripcion||'')+' '+(p.referencia||''));
  if(d.includes('ROJO'))   return {wire:'#7c8a99', base:'#6e4636', pal:['#c97b5e','#b5634a','#a85540','#cc8a6e','#9e4d3a','#d29a82','#bb6f56','#8f4836']};
  if(d.includes('GRIS'))   return {wire:'#697079', base:'#5b626b', pal:['#c2c6cb','#a9adb3','#969ba1','#cdd1d5','#8e9398','#b4b9be','#a0a5ab','#787d83']};
  if(d.includes('BLANCO')) return {wire:'#9aa3ad', base:'#b9bec3', pal:['#f1f3f5','#e4e7ea','#f7f8fa','#d9dde0','#ebedee','#e8ebee','#dfe3e6','#cfd4d8']};
  // FORNA y por defecto: caliza crema (como las fotos)
  return {wire:'#8a93a0', base:'#9c8a66', pal:['#e9ddc2','#dccaa6','#d6c49c','#cdb88c','#e3d8be','#c9b487','#bca57a','#ded2b4','#f0e7d4','#b29a6a','#d2c096']};
}
// PRNG con semilla → patrón de piedras estable por producto
function gavRand(seed){ var s=(seed||1)%2147483647; if(s<=0)s+=2147483646; return function(){ s=s*16807%2147483647; return (s-1)/2147483646; }; }
// Relleno de piedras irregulares dentro de un rectángulo (se recorta a la cara)
function gavStones(bx,by,bw,bh,pal,rnd){
  var cell=Math.max(11,Math.min(16,bw/6.5)), out='';
  for(var y=by-cell; y<by+bh+cell; y+=cell*0.76){
    for(var x=bx-cell; x<bx+bw+cell; x+=cell*0.76){
      var cx=x+(rnd()-0.5)*cell*0.55, cy=y+(rnd()-0.5)*cell*0.55;
      var sides=5+((rnd()*2)|0), r=cell*(0.52+rnd()*0.26), pts='';
      for(var a=0;a<sides;a++){ var ang=a/sides*6.2832+rnd()*0.55, rr=r*(0.66+rnd()*0.46); pts+=(cx+Math.cos(ang)*rr).toFixed(1)+','+(cy+Math.sin(ang)*rr).toFixed(1)+' '; }
      out+='<polygon points="'+pts.trim()+'" fill="'+pal[(rnd()*pal.length)|0]+'" stroke="rgba(50,40,25,.18)" stroke-width="0.4"/>';
    }
  }
  return out;
}

// Ángulo (cuña) en 2D: planta con el corte a 45º + altura en grande debajo.
var _gavUid=0; // contador para ids de clipPath ÚNICOS por dibujo (evita colisiones entre pantallas)
function gavionAngulo2D(p,count,vacio){
  count=Math.max(1,Math.round(+count||1));
  var L=+p.largo||1, A=+p.ancho||0.5, H=+p.alto||0.5;
  var c=gavionColor(p);
  var uid='ga'+(++_gavUid);
  var s=64;                                       // px por metro (plano 2D)
  var Wp=Math.max(74, L*s);                        // largo  → arista delantera (abajo)
  var Hp=Math.max(36, A*s);                        // ancho  → profundidad
  var top=Math.max(0,(L-A))*s;                     // arista trasera = largo − ancho (corte 45º)
  var pad=16, gap=14, numH=46;
  var ox=pad, oy=pad;
  var vbW=Math.ceil(Wp+pad*2), vbH=Math.ceil(Hp+gap+numH+pad);
  var F=q=>q[0].toFixed(1)+','+q[1].toFixed(1);
  var TL=[ox,oy], TR=[ox+top,oy], BR=[ox+Wp,oy+Hp], BL=[ox,oy+Hp];
  // derecha = diagonal a la derecha (lado vertical a la izquierda); izquierda = espejo
  var dd=mesaNorm((p.descripcion||'')+' '+(p.referencia||''));
  var izq=dd.includes('IZQ')||dd.includes('IZDA');
  if(izq){ var mir=function(q){return [2*ox+Wp-q[0], q[1]];}; TL=mir(TL); TR=mir(TR); BR=mir(BR); BL=mir(BL); }
  var pts=[TL,TR,BR,BL].map(F).join(' ');
  var step=Math.max(13,Math.min(20,Wp/8)), grid='';
  for(var gx=ox+step; gx<ox+Wp; gx+=step) grid+='<line x1="'+gx.toFixed(1)+'" y1="'+oy+'" x2="'+gx.toFixed(1)+'" y2="'+(oy+Hp)+'"/>';
  for(var gy=oy+step; gy<oy+Hp; gy+=step) grid+='<line x1="'+ox+'" y1="'+gy.toFixed(1)+'" x2="'+(ox+Wp)+'" y2="'+gy.toFixed(1)+'"/>';
  var r=gavRand((p.producto_id||1)*11+2);
  var hcm=Math.round(H*100), cx=ox+Wp/2;
  var badge='';
  if(count>1){ var lab='×'+fmtN(count), bw=14+(''+lab).length*7.5;
    badge='<g><rect x="'+(vbW-bw-4)+'" y="4" rx="11" ry="11" width="'+bw+'" height="22" fill="#ea580c"/><text x="'+(vbW-4-bw/2)+'" y="19.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="ui-monospace,monospace">'+lab+'</text></g>';
  }
  return '<svg viewBox="0 0 '+vbW+' '+vbH+'" xmlns="http://www.w3.org/2000/svg">'+
    '<defs><clipPath id="'+uid+'"><polygon points="'+pts+'"/></clipPath></defs>'+
    '<polygon points="'+pts+'" fill="'+c.base+'"/>'+
    (vacio?'':'<g clip-path="url(#'+uid+')">'+gavStones(ox,oy,Wp,Hp,c.pal,r)+'</g>')+
    '<g clip-path="url(#'+uid+')" stroke="'+c.wire+'" stroke-width="0.9" opacity="0.5">'+grid+'</g>'+
    '<polygon points="'+pts+'" fill="none" stroke="#374151" stroke-width="2.6" stroke-linejoin="round"/>'+
    badge+
    '<text x="'+cx+'" y="'+(oy+Hp+gap+8)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1.5">ALTURA</text>'+
    '<text x="'+cx+'" y="'+(oy+Hp+gap+38)+'" text-anchor="middle" font-size="30" font-weight="900" fill="#334155" font-family="ui-monospace,monospace">'+hcm+'<tspan font-size="15" font-weight="700"> cm</tspan></text>'+
  '</svg>';
}

// Dibuja un gavión (malla 3D) escalado por sus medidas; los de ángulo van en 2D (plano).
function gavionSVG(p,count,vacio){
  count=Math.max(1,Math.round(+count||1));
  if(mesaEsAngulo(p)) return gavionAngulo2D(p,count,vacio);
  var L=+p.largo||1, A=+p.ancho||0.5, H=+p.alto||0.5;
  var ang=mesaEsAngulo(p);
  var c=gavionColor(p);
  var uid='gv'+(++_gavUid);
  var k=66;                                       // píxeles por metro (escala común → conserva proporciones)
  var W=Math.max(52, L*k);                        // largaria → ancho del dibujo
  var Hf=Math.max(30, H*k);                       // altura  → alto del dibujo
  var D=Math.max(10, A*k);                        // ancho → profundidad a escala real (sin tope)
  var dx=D*0.66, dy=D*0.38;                       // proyección isométrica suave; profundidad fiel a la medida
  var ratio=A/L;
  var taper=ang ? (ratio>=0.9 ? W*0.98 : Math.min(W*0.85, W*ratio*1.9)) : 0;  // ángulo exagerado para que se vea; 1×1×1 → triángulo
  var ghosts=count>1?Math.min(2,count-1):0;       // copias detrás para la pila
  var so=8, padL=12, padT=18, padR=18, padB=14;
  var ox=padL+ghosts*so, oy=padT+dy+ghosts*so;
  var bx=ox+dx+W-taper;                            // x de la arista trasera (acortada por el ángulo)
  var maxX=Math.max(ox+W, bx);
  var vbW=Math.ceil(maxX+padR), vbH=Math.ceil(oy+Hf+padB);
  var P=(x,y)=>x.toFixed(1)+','+y.toFixed(1);
  // Altura SIEMPRE completa. El ángulo solo acorta la cara trasera (planta = trapecio; triángulo si ancho=largo)
  var FTL=[ox,oy], FTR=[ox+W,oy], FBR=[ox+W,oy+Hf], FBL=[ox,oy+Hf];
  var BTL=[ox+dx,oy-dy], BTR=[bx,oy-dy], BBR=[bx,oy+Hf-dy];
  var poly=(arr)=>arr.map(q=>P(q[0],q[1])).join(' ');
  var frontPts=poly([FTL,FTR,FBR,FBL]), topPts=poly([FTL,FTR,BTR,BTL]), sidePts=poly([FTR,BTR,BBR,FBR]);
  // malla cara frontal (rectángulo completo)
  var step=Math.max(11,Math.min(19,W/6)), grid='';
  for(var gx=ox+step; gx<ox+W-1; gx+=step) grid+='<line x1="'+gx.toFixed(1)+'" y1="'+oy+'" x2="'+gx.toFixed(1)+'" y2="'+(oy+Hf)+'"/>';
  for(var gy=oy+step*0.5; gy<oy+Hf-1; gy+=step) grid+='<line x1="'+ox+'" y1="'+gy.toFixed(1)+'" x2="'+(ox+W)+'" y2="'+gy.toFixed(1)+'"/>';
  // malla cara superior (recede hacia la arista trasera acortada)
  var tgrid='';
  for(var tx=ox+step; tx<ox+W-1; tx+=step){ var f=(tx-ox)/W, bxr=ox+dx+f*(W-taper); tgrid+='<line x1="'+tx.toFixed(1)+'" y1="'+oy+'" x2="'+bxr.toFixed(1)+'" y2="'+(oy-dy)+'"/>'; }
  // malla cara diagonal (lateral)
  var sg='';
  for(var sy=oy+step*0.4; sy<oy+Hf-1; sy+=step) sg+='<line x1="'+(ox+W)+'" y1="'+sy.toFixed(1)+'" x2="'+bx.toFixed(1)+'" y2="'+(sy-dy).toFixed(1)+'"/>';
  var sbx=Math.min(ox+W,bx), sbw=Math.abs(bx-(ox+W))+1;   // bbox de la cara diagonal
  var seed=(p.producto_id||p.id||((L*100+A*10+H)|0))||1;
  var rT=gavRand(seed*7+1), rS=gavRand(seed*13+3), rF=gavRand(seed*17+5);
  // pila (copias detrás)
  var ghostSvg='';
  for(var k=ghosts;k>=1;k--){
    var s=k*so;
    ghostSvg+='<g transform="translate('+(-s)+','+(-s)+')" opacity="0.4">'+
      '<polygon points="'+topPts+'" fill="'+c.pal[4]+'" stroke="'+c.wire+'" stroke-width="1.1"/>'+
      '<polygon points="'+sidePts+'" fill="'+c.pal[6]+'" stroke="'+c.wire+'" stroke-width="1.1"/>'+
      '<polygon points="'+frontPts+'" fill="'+c.pal[3]+'" stroke="'+c.wire+'" stroke-width="1.3"/>'+
    '</g>';
  }
  var badge='';
  if(count>1){
    var lab='×'+fmtN(count), bw=14+(''+lab).length*7.5;
    badge='<g><rect x="'+(vbW-bw-4)+'" y="4" rx="11" ry="11" width="'+bw+'" height="22" fill="#ea580c"/>'+
      '<text x="'+(vbW-4-bw/2)+'" y="19.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="ui-monospace,monospace">'+lab+'</text></g>';
  }
  return '<svg viewBox="0 0 '+vbW+' '+vbH+'" xmlns="http://www.w3.org/2000/svg">'+
    '<defs>'+
      '<clipPath id="cf'+uid+'"><polygon points="'+frontPts+'"/></clipPath>'+
      '<clipPath id="ct'+uid+'"><polygon points="'+topPts+'"/></clipPath>'+
      '<clipPath id="cs'+uid+'"><polygon points="'+sidePts+'"/></clipPath>'+
    '</defs>'+
    '<ellipse cx="'+(ox+W/2+dx/2)+'" cy="'+(oy+Hf+5)+'" rx="'+(W*0.55).toFixed(1)+'" ry="5.5" fill="rgba(0,0,0,.10)"/>'+
    ghostSvg+
    '<polygon points="'+topPts+'" fill="'+c.base+'"/>'+
    (vacio?'':'<g clip-path="url(#ct'+uid+')">'+gavStones(ox,oy-dy,maxX-ox,dy+1,c.pal,rT)+'</g>')+
    '<g clip-path="url(#ct'+uid+')" stroke="'+c.wire+'" stroke-width="0.8" opacity="0.5">'+tgrid+'</g>'+
    '<polygon points="'+topPts+'" fill="none" stroke="'+c.wire+'" stroke-width="1.6"/>'+
    '<polygon points="'+sidePts+'" fill="'+c.base+'"/>'+
    (vacio?'':'<g clip-path="url(#cs'+uid+')">'+gavStones(sbx,oy-dy,sbw,Hf+dy,c.pal,rS)+'</g>')+
    '<g clip-path="url(#cs'+uid+')" stroke="'+c.wire+'" stroke-width="0.8" opacity="0.45">'+sg+'</g>'+
    '<polygon points="'+sidePts+'" fill="none" stroke="'+c.wire+'" stroke-width="1.6"/>'+
    '<polygon points="'+frontPts+'" fill="'+c.base+'"/>'+
    (vacio?'':'<g clip-path="url(#cf'+uid+')">'+gavStones(ox,oy,W,Hf,c.pal,rF)+'</g>')+
    '<g clip-path="url(#cf'+uid+')" stroke="'+c.wire+'" stroke-width="0.9" opacity="0.55">'+grid+'</g>'+
    '<polygon points="'+frontPts+'" fill="none" stroke="'+c.wire+'" stroke-width="2"/>'+
    badge+
  '</svg>';
}

// ════════════ CARGA (cargador: checklist línea a línea) ════════════
function cargaActivaGet(){ try{return localStorage.getItem('gav_carga_activa')||'';}catch(e){return '';} }
function cargaActivaSet(g){ try{ if(g) localStorage.setItem('gav_carga_activa',g); else localStorage.removeItem('gav_carga_activa'); }catch(e){} }
function cargaProgGet(g){ try{var s=localStorage.getItem('gav_carga_prog_'+g); return s?JSON.parse(s):{};}catch(e){return {};} }
function cargaProgSet(g,o){ try{localStorage.setItem('gav_carga_prog_'+g,JSON.stringify(o));}catch(e){} }

function enviarACarga(grupoId){
  cargaActivaSet(grupoId);
  switchTab('cargar');
  log('Carga enviada a la pestaña Carga','ok');
}
function quitarDeCarga(){ cargaActivaSet(''); renderCargar(); }
function cargarUnidad(eid){
  var g=cargaActivaGet(); if(!g) return;
  var e=entregas.find(function(x){return String(x.id)===String(eid);}); if(!e) return;
  var prog=cargaProgGet(g), cur=prog[eid]||0;
  if(cur < (+e.cantidad||0)){ prog[eid]=cur+1; cargaProgSet(g,prog); renderCargar(); }
}
function descargarUnidad(eid){
  var g=cargaActivaGet(); if(!g) return;
  var prog=cargaProgGet(g), cur=prog[eid]||0;
  if(cur>0){ prog[eid]=cur-1; cargaProgSet(g,prog); renderCargar(); }
}
async function confirmarCargaActiva(){
  var g=cargaActivaGet(); if(!g) return;
  var pend=lineasDeCarga(g).filter(function(e){return e.estado==='pendiente';});
  if(!pend.length){ log('No hay líneas pendientes de confirmar','warn'); return; }
  if(!confirm('¿Confirmar la carga completa? Se descontará el stock de todas las líneas.')) return;
  await confirmarGrupo(pend.map(function(e){return e.id;}));
  try{localStorage.removeItem('gav_carga_prog_'+g);}catch(e){}
  cargaActivaSet('');
  renderCargar();
}
function renderCargar(){
  var el=document.getElementById('cargar-content'); if(!el) return;
  var g=cargaActivaGet();
  var lineas = g ? lineasDeCarga(g) : [];
  if(!g || !lineas.length){
    if(g && !lineas.length) cargaActivaSet('');
    el.innerHTML='<div class="card" style="text-align:center;padding:42px 20px">'+
      '<i class="ti ti-clipboard-check" style="font-size:46px;color:var(--text2);display:block;margin-bottom:14px"></i>'+
      '<div style="font-weight:700;font-size:17px;margin-bottom:6px">No hay ninguna carga en preparación</div>'+
      '<div style="color:var(--text2);font-size:13px;max-width:480px;margin:0 auto">Ve a <b>Expedición → Cargas</b> y, en la carga que vayas a cargar, pulsa el botón <i class="ti ti-clipboard-check" style="color:var(--blue)"></i> <b>«Enviar a carga»</b>. Aquí podrás ir marcando línea a línea lo que vas cargando.</div></div>';
    return;
  }
  var first=lineas[0], prog=cargaProgGet(g);
  var totalU=lineas.reduce(function(s,e){return s+(+e.cantidad||0);},0);
  var hechasU=lineas.reduce(function(s,e){return s+Math.min(+e.cantidad||0, prog[e.id]||0);},0);
  var todasConfirmadas=lineas.every(function(e){return e.estado==='confirmada';});
  var completas=lineas.every(function(e){return (prog[e.id]||0) >= (+e.cantidad||0);});
  var pct=totalU?Math.round(hechasU/totalU*100):0;
  var html='<div class="card" style="margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">'+
      '<div><div style="font-weight:800;font-size:19px;color:var(--blue-d)">'+first.pedido_numero+' — '+(first.cliente_nombre||'')+'</div>'+
      '<div style="color:var(--text2);font-size:13px;margin-top:3px">'+(first.obra?first.obra+' · ':'')+'Carga: '+fmtD(first.fecha_carga)+(first.transportista?' · '+first.transportista:'')+(first.mat_camion?' · '+first.mat_camion:'')+'</div></div>'+
      '<div style="display:flex;gap:8px">'+
        '<button class="btn btn-outline btn-sm" data-gid="'+g+'" onclick="imprimirCargaGrupoById(this.dataset.gid)"><i class="ti ti-printer"></i> Imprimir hoja</button>'+
        '<button class="btn btn-outline btn-sm" onclick="quitarDeCarga()" title="Quitar de esta pantalla (no confirma)"><i class="ti ti-x"></i></button>'+
      '</div>'+
    '</div>'+
    '<div style="margin-top:14px"><div style="height:11px;background:var(--surface2);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--green);transition:width .2s"></div></div>'+
    '<div style="font-size:12px;color:var(--text2);margin-top:5px;font-weight:600">'+hechasU+' de '+totalU+' gaviones cargados</div></div>'+
  '</div>';
  html+='<div style="display:flex;flex-direction:column;gap:10px">'+lineas.map(function(e){
    var cant=+e.cantidad||0, loaded=Math.min(cant, prog[e.id]||0), rem=cant-loaded, done=rem<=0;
    return '<div class="carga-line'+(done?' done':'')+'">'+
      '<div class="carga-check">'+(done?'<i class="ti ti-check"></i>':'')+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:700;font-size:16px'+(done?';color:var(--green)':'')+'">'+(e.descripcion||e.referencia)+'</div>'+
        '<div style="font-size:12px;color:var(--text2)"><span style="font-family:monospace">'+e.referencia+'</span> · '+dimStr(e)+(e.linea_notas?' · <span style="color:#b45309;font-weight:600">⚠ '+e.linea_notas+'</span>':'')+'</div>'+
        '<div style="font-size:13px;margin-top:4px;font-weight:700"><span style="color:var(--green)">'+loaded+'</span> / '+cant+' cargados'+(rem>0?' · <span style="color:var(--blue-d)">quedan '+rem+'</span>':'')+'</div>'+
      '</div>'+
      '<button class="carga-minus" onclick="descargarUnidad('+e.id+')" '+(loaded<=0?'disabled':'')+' title="Corregir (−1)"><i class="ti ti-minus"></i></button>'+
      '<button class="carga-plus'+(done?' full':'')+'" onclick="cargarUnidad('+e.id+')" '+(done?'disabled':'')+'>'+(done?'<i class="ti ti-check"></i> Cargado':'<i class="ti ti-plus"></i><span>Cargar<br><b style="font-size:20px">1</b></span>')+'</button>'+
    '</div>';
  }).join('')+'</div>';
  if(todasConfirmadas){
    html+='<div style="margin-top:18px;text-align:center;color:var(--green);font-weight:700;font-size:15px"><i class="ti ti-circle-check"></i> Carga confirmada — stock descontado</div>';
  } else {
    html+='<div style="margin-top:18px;display:flex;justify-content:flex-end">'+
      '<button class="btn '+(completas?'btn-green':'btn-outline')+'" onclick="confirmarCargaActiva()" style="font-size:15px;padding:12px 24px'+(completas?'':';opacity:.55')+'"><i class="ti ti-check"></i> Confirmar carga completa</button>'+
    '</div>';
    if(!completas) html+='<div style="text-align:right;font-size:11px;color:var(--text2);margin-top:5px">Carga todas las unidades para confirmar (o confírmala igualmente si ya está toda en el camión)</div>';
  }
  el.innerHTML=html;
}

function renderCarado(){
  var el=document.getElementById('carado-content');
  if(!el) return;
  updateFabricaBadge();
  if(!carado || !carado.length){
    el.innerHTML='<div class="mesa-empty"><i class="ti ti-stack-2" style="font-size:42px;display:block;margin-bottom:12px"></i>No hay gaviones en la zona de carado.<small style="display:block;margin-top:6px;font-weight:400;color:var(--text2)">Lo que vibres en la zona de Vibrado caerá aquí. Desde aquí lo pasas a stock cuando esté carado.</small></div>';
    return;
  }
  var html='<div class="carado-head"><i class="ti ti-stack-2" style="color:#ea580c;font-size:16px"></i> Gaviones vibrados pendientes de carar — pulsa uno para pasar a stock, o la papelera para borrar</div>';
  html+='<div class="carado-grid">'+carado.map(function(it){
    var n=Math.round(+it.cantidad||0);
    return '<div class="carado-card" onclick="abrirKeypad('+it.producto_id+',\'\',\'carado\','+n+')">'+
      '<button class="carado-del" title="Borrar de carado" onclick="event.stopPropagation();abrirKeypad('+it.producto_id+',\''+n+'\',\'carado-del\','+n+')"><i class="ti ti-trash"></i></button>'+
      '<div class="carado-draw">'+gavionSVG(it,n)+'</div>'+
      '<div class="carado-desc">'+(it.descripcion||it.referencia||'(sin descripción)')+'</div>'+
      '<div class="carado-meta"><span class="carado-ref">'+(it.referencia||'')+'</span> · '+dimStr(it)+(mesaEsAngulo(it)?' · ángulo':'')+'</div>'+
      '<div class="carado-count">'+fmtN(n)+'<small>ud apiladas</small></div>'+
    '</div>';
  }).join('')+'</div>';
  el.innerHTML=html;
}

// ════════════ ZONA VIBRADO (buffer: vacíos montados pendientes de vibrar) ════════════
function renderVibrado(){
  var el=document.getElementById('vibrado-content');
  if(!el) return;
  updateFabricaBadge();
  if(!montaje || !montaje.length){
    el.innerHTML='<div class="mesa-empty"><i class="ti ti-tools" style="font-size:42px;display:block;margin-bottom:12px"></i>No hay gaviones montados pendientes de vibrar.<small style="display:block;margin-top:6px;font-weight:400;color:var(--text2)">Lo que montes en Montaje caerá aquí. Púlsalo para vibrarlo y que pase a Carado.</small></div>';
    return;
  }
  var html='<div class="carado-head"><i class="ti ti-tools" style="color:#ca8a04;font-size:16px"></i> Gaviones vacíos montados, pendientes de vibrar — pulsa uno para vibrarlo (pasa a carado), o la papelera para borrar</div>';
  html+='<div class="carado-grid">'+montaje.map(function(it){
    var n=Math.round(+it.cantidad||0);
    return '<div class="carado-card" onclick="abrirKeypad('+it.producto_id+',\'\',\'vibrado\','+n+')">'+
      '<button class="carado-del" title="Borrar de montaje" onclick="event.stopPropagation();abrirKeypad('+it.producto_id+',\''+n+'\',\'montaje-del\','+n+')"><i class="ti ti-trash"></i></button>'+
      '<div class="carado-draw">'+gavionSVG(it,n,true)+'</div>'+
      '<div class="carado-desc">'+(it.descripcion||it.referencia||'(sin descripción)')+'</div>'+
      '<div class="carado-meta"><span class="carado-ref">'+(it.referencia||'')+'</span> · '+dimStr(it)+(mesaEsAngulo(it)?' · ángulo':'')+'</div>'+
      '<div class="carado-count">'+fmtN(n)+'<small>ud montadas</small></div>'+
    '</div>';
  }).join('')+'</div>';
  el.innerHTML=html;
}

// ════════════ INFORME DIARIO DE PRODUCCIÓN (por sección) ════════════
var informeFecha=new Date().toISOString().slice(0,10);
var informeData=null;
const INFORME_SEC=[
  {key:'montaje',label:'Montaje',color:'#3b82f6',icon:'ti-hammer',sub:'gaviones montados (vacíos)'},
  {key:'vibrado',label:'Vibrado',color:'#ca8a04',icon:'ti-tools',sub:'gaviones vibrados'},
  {key:'carado',label:'Carado',color:'#ea580c',icon:'ti-stack-2',sub:'gaviones carados (a stock)'}
];
async function renderInforme(){
  var el=document.getElementById('informe-container');
  if(!el) return;
  el.innerHTML='<div class="card" style="padding:22px;text-align:center;color:var(--text2)"><i class="ti ti-loader"></i> Cargando informe…</div>';
  try{ informeData=await api('GET','/informe-produccion?fecha='+informeFecha); }catch(e){ informeData=null; }
  var d=informeData;
  if(!d){ el.innerHTML='<div class="empty"><i class="ti ti-report-off"></i><p>No se pudo cargar el informe</p></div>'; return; }
  function tabla(sec){
    var items=d.secciones[sec.key]||[];
    var filas=items.length
      ? items.map(function(it){return '<tr><td class="mono" style="font-weight:500">'+(it.referencia||'—')+'</td><td class="dim">'+(it.descripcion||'')+'</td><td class="dim">'+(dimStr(it)||'')+'</td><td class="r mono" style="font-weight:600">'+fmtN(it.total)+'</td></tr>';}).join('')
      : '<tr><td colspan="4" class="dim" style="text-align:center;padding:14px">Sin producción este día</td></tr>';
    return '<div class="card" style="margin-bottom:14px">'+
      '<div class="card-hdr" style="border-left:4px solid '+sec.color+';padding-left:12px">'+
        '<div class="card-title"><i class="ti '+sec.icon+'" style="color:'+sec.color+'"></i> '+sec.label+' <span class="dim" style="font-weight:400;font-size:11px">— '+sec.sub+'</span></div>'+
        '<span class="badge" style="background:'+sec.color+';color:#fff">'+fmtN(d.totales[sec.key]||0)+' ud</span>'+
      '</div>'+
      '<table class="tbl"><thead><tr><th>Referencia</th><th>Descripción</th><th>Dimensiones</th><th class="r">Unidades</th></tr></thead><tbody>'+filas+'</tbody></table>'+
    '</div>';
  }
  el.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'+
      '<div style="display:flex;align-items:center;gap:10px">'+
        '<i class="ti ti-report" style="font-size:20px;color:var(--blue)"></i>'+
        '<div><div style="font-size:16px;font-weight:600">Informe diario de producción</div><div class="dim">'+fmtD(d.fecha)+'</div></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;align-items:center">'+
        '<input type="date" value="'+informeFecha+'" onchange="informeSetFecha(this.value)" style="font-size:13px;padding:5px 9px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface);color:var(--text)">'+
        '<button class="btn btn-outline btn-sm" onclick="informePrint()"><i class="ti ti-printer"></i> Imprimir</button>'+
      '</div>'+
    '</div>'+
    INFORME_SEC.map(tabla).join('');
}
function informeSetFecha(f){ informeFecha=f||new Date().toISOString().slice(0,10); renderInforme(); }
function informePrint(){
  var d=informeData; if(!d) return;
  var cuerpo='<h2 style="margin:0 0 2px">Informe diario de producción</h2><div style="color:#666;margin-bottom:16px">'+fmtD(d.fecha)+'</div>';
  INFORME_SEC.forEach(function(sec){
    var items=d.secciones[sec.key]||[];
    cuerpo+='<h3 style="margin:14px 0 4px;border-left:4px solid '+sec.color+';padding-left:8px">'+sec.label+' — '+fmtN(d.totales[sec.key]||0)+' ud</h3>'+
      '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f1f5f9">'+
      '<th style="text-align:left;padding:6px 8px;border:1px solid #e2e8f0">Referencia</th>'+
      '<th style="text-align:left;padding:6px 8px;border:1px solid #e2e8f0">Descripción</th>'+
      '<th style="text-align:left;padding:6px 8px;border:1px solid #e2e8f0">Dimensiones</th>'+
      '<th style="text-align:right;padding:6px 8px;border:1px solid #e2e8f0">Unidades</th></tr></thead><tbody>'+
      (items.length?items.map(function(it){return '<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-family:monospace">'+(it.referencia||'')+'</td><td style="padding:6px 8px;border:1px solid #e2e8f0">'+(it.descripcion||'')+'</td><td style="padding:6px 8px;border:1px solid #e2e8f0">'+(dimStr(it)||'')+'</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-family:monospace">'+fmtN(it.total)+'</td></tr>';}).join(''):'<tr><td colspan="4" style="padding:6px 8px;border:1px solid #e2e8f0;color:#888">Sin producción</td></tr>')+
      '</tbody></table>';
  });
  var blob=new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe '+fmtD(d.fecha)+'</title><style>body{font-family:sans-serif;margin:24px;color:#1a1a1a}@media print{@page{margin:1.5cm}}</style></head><body>'+cuerpo+'<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script></body></html>'],{type:'text/html;charset=utf-8'});
  window.open(URL.createObjectURL(blob));
}

// ════════════ ZONA MONTADO (gaviones premontados) ════════════
var montadoPaso='inicio', montadoAncho=null;
function montadoEsPremontado(p){
  if(p.activo===false) return false;
  var d=mesaNorm((p.descripcion||'')+' '+(p.referencia||''));
  return d.includes('PREMONT')||d.includes('MONTAD');
}
function montadoProductos(){ return productos.filter(montadoEsPremontado); }
function montadoProductosAncho(cm){
  return montadoProductos().filter(function(p){return mesaAnchoCm(p)===cm;})
    .sort(function(a,b){
      var ba=mesaBloque(a), bb=mesaBloque(b);
      if(ba!==bb) return ba-bb;                        // normal → ángulos → 70cm
      var altoA=+a.alto||0, altoB=+b.alto||0;
      if(altoB!==altoA) return altoB-altoA;            // alto: mayor a menor
      return (+b.largo||0)-(+a.largo||0);              // largo: mayor a menor
    });
}
function renderMontado(){
  var el=document.getElementById('montado-content');
  if(!el) return;
  el.classList.toggle('full', montadoPaso==='nuevo-art');
  if(montadoPaso==='inicio'){
    el.innerHTML='<div class="mesa-grid">'+
      '<button class="mesa-btn b-nuevo" onclick="montadoIr(\'nuevo-ancho\')"><i class="ti ti-plus"></i> NUEVO<small>Elegir premontado por ancho</small></button>'+
      '<button class="mesa-btn b-repetir" onclick="montadoIr(\'repetir\')"><i class="ti ti-repeat"></i> REPETIR<small>Volver a producir lo último</small></button>'+
    '</div>';
    return;
  }
  if(montadoPaso==='repetir'){ renderMontadoRepetir(el); return; }
  if(montadoPaso==='nuevo-ancho'){
    el.innerHTML=montadoCrumbs()+
      '<div class="mesa-grid cols4">'+MESA_ANCHOS.map(function(cm){
        var n=montadoProductosAncho(cm).length;
        return '<button class="mesa-btn b-ancho" onclick="montadoSelAncho('+cm+')">'+cm+' CM<small>'+(n?n+' art.':'—')+'</small></button>';
      }).join('')+'</div>';
    return;
  }
  if(montadoPaso==='nuevo-art'){
    var arts=montadoProductosAncho(montadoAncho);
    el.innerHTML=montadoCrumbs()+
      (arts.length?'<div class="mesa-grid arts">'+arts.map(function(p){
        return '<button class="mesa-btn b-art" onclick="montadoAbrirCantidad('+p.id+')"><span class="desc">'+(p.descripcion||'(sin descripción)')+'</span><span class="ref">'+(p.referencia||'(sin ref)')+' · '+dimStr(p)+'</span></button>';
      }).join('')+'</div>'
      :'<div class="mesa-empty"><i class="ti ti-package-off" style="font-size:40px;display:block;margin-bottom:10px"></i>No hay premontados con ancho '+montadoAncho+' cm.</div>');
    return;
  }
}
function montadoCrumbs(){
  var parts=['<span class="crumb" onclick="montadoIr(\'nuevo-ancho\')">Premontados</span>'];
  if(montadoAncho&&montadoPaso==='nuevo-art') parts.push('<span>'+montadoAncho+' cm</span>');
  return '<button class="mesa-back" onclick="montadoAtras()"><i class="ti ti-arrow-left"></i> Atrás</button>'+
    '<div class="mesa-bc">'+parts.join('<i class="ti ti-chevron-right" style="font-size:14px;color:var(--text2)"></i>')+'</div>';
}
function montadoIr(paso){ montadoPaso=paso; if(paso==='inicio'||paso==='nuevo-ancho') montadoAncho=null; renderMontado(); }
function montadoSelAncho(cm){ montadoAncho=cm; montadoPaso='nuevo-art'; renderMontado(); }
function montadoAtras(){
  if(montadoPaso==='nuevo-art'){ montadoPaso='nuevo-ancho'; montadoAncho=null; }
  else { montadoPaso='inicio'; }
  renderMontado();
}
function montadoAbrirCantidad(pid){ abrirKeypad(pid,'','montado'); }
function renderMontadoRepetir(el){
  var lista=movimientos.filter(function(m){return m.tipo==='entrada'&&mesaNorm(m.motivo).includes('ZONA MONTADO');});
  if(!lista.length) lista=movimientos.filter(function(m){return m.tipo==='entrada'&&montadoEsPremontado({descripcion:m.descripcion,referencia:m.referencia});});
  var ult=lista.length?lista[0]:null;
  var back='<button class="mesa-back" onclick="montadoIr(\'inicio\')"><i class="ti ti-arrow-left"></i> Atrás</button>';
  if(!ult){
    el.innerHTML=back+'<div class="mesa-empty"><i class="ti ti-repeat-off" style="font-size:40px;display:block;margin-bottom:10px"></i>Todavía no hay ningún premontado registrado para repetir.</div>';
    return;
  }
  el.innerHTML=back+
    '<div class="mesa-bc"><span class="crumb" onclick="montadoIr(\'inicio\')"><i class="ti ti-home"></i> Inicio</span><i class="ti ti-chevron-right" style="font-size:14px;color:var(--text2)"></i><span>Repetir</span></div>'+
    '<div class="mesa-grid cols1">'+
      '<div class="mesa-btn b-art" style="cursor:default"><span class="desc">'+(ult.descripcion||'')+'</span><span class="ref">'+ult.referencia+' · Última: '+fmtN(ult.cantidad)+' ud · '+fmtFechaHora(ult.created_at)+'</span></div>'+
      '<button class="mesa-btn b-repetir" onclick="abrirKeypad('+ult.producto_id+',\''+(Math.round(+ult.cantidad)||0)+'\',\'montado\')"><i class="ti ti-repeat"></i> REPETIR<small>'+ult.referencia+' — '+fmtN(ult.cantidad)+' ud</small></button>'+
    '</div>';
}

function log(msg,type=''){
  const el=document.getElementById('sb-msg');
  const icon=type==='ok'?'ti-circle-check':type==='warn'?'ti-alert-triangle':'ti-info-circle';
  el.innerHTML='<i class="ti '+icon+'"></i> '+msg;
  el.className='sb-msg'+(type?' '+type:'');
}

setInterval(loadAll,60000);
loadAll();
