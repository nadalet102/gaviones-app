// ── NECESIDADES ────────────────────────────────────────────────────────────────
// Vista unificada: Stock + Necesidades. La consulta /necesidades ya trae todos
// los productos activos con su stock, así que es la única fuente de la tabla.
function renderNecesidades(){
  renderMovPanel(); // registro de movimientos + formulario (columna derecha)
  const el=document.getElementById('nec-table');
  if(!el) return;
  // Preservar el foco y la posición del cursor del buscador: el input se
  // regenera con innerHTML en cada pulsación y, si no, perdería el foco.
  const _act=document.activeElement;
  const _keepFocus=_act&&_act.id==='nec-search';
  const _selStart=_keepFocus?_act.selectionStart:null;
  const _selEnd=_keepFocus?_act.selectionEnd:null;
  if(!necesidades.length){el.innerHTML='<div class="empty"><i class="ti ti-package"></i><p>Sin datos</p></div>';return;}
  const TIPO_LABELS={gavion:'Gaviones',colchoneta:'Colchonetas Reno',malla:'Malla',panel:'Paneles',accesorio:'Accesorios',otro:'Otros'};
  var q=(document.getElementById('nec-search')?.value||'').toLowerCase().trim();
  var tipoF=document.getElementById('nec-tipo')?.value||'';
  var tiposPresentes=[...new Set(necesidades.map(n=>n.tipo))].sort();
  var lista=necesidades.filter(function(n){
    if(tipoF && n.tipo!==tipoF) return false;
    if(q && !((n.referencia||'').toLowerCase().includes(q)||(n.descripcion||'').toLowerCase().includes(q))) return false;
    return true;
  });
  var sortArrow=sortDir==='desc'?' ↓':' ↑';
  function sb(f,label){return '<button class="sort-btn'+(sortField===f?' active':'')+'" data-f="'+f+'" onclick="setSortField(this.dataset.f)">'+label+(sortField===f?sortArrow:'')+'</button>';}
  // Cabecera de columna pulsable para ordenar (clic en la propia palabra)
  function th(f,label,cls){var a=sortField===f;return '<th class="th-sort'+(cls?' '+cls:'')+(a?' active':'')+'" onclick="setSortField(\''+f+'\')" title="Ordenar por '+label+'">'+label+(a?sortArrow:'')+'</th>';}
  var bar='<div class="sort-btns" style="padding:8px 16px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--border)">'+
    '<span style="font-size:11px;color:var(--text2)">Ordenar:</span>'+
    sb('largo','Largo')+sb('ancho','Ancho')+sb('alto','Alto')+sb('referencia','Ref.')+sb('stock_actual','Stock')+sb('necesidad_neta','Necesidad')+
    '<select id="nec-tipo" onchange="renderNecesidades()" style="margin-left:auto;font-size:12px;padding:3px 8px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface);color:var(--text)">'+
      '<option value="">Todos los tipos</option>'+
      tiposPresentes.map(t=>'<option value="'+t+'"'+(tipoF===t?' selected':'')+'>'+(TIPO_LABELS[t]||t)+'</option>').join('')+
    '</select>'+
    '<input type="text" id="nec-search" value="'+q+'" placeholder="Buscar..." oninput="renderNecesidades()" style="font-size:12px;padding:3px 9px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);width:150px">'+
  '</div>';
  const sorted=sortedProductos(lista);
  el.innerHTML=bar+'<table class="tbl"><thead><tr>'+
    th('referencia','Referencia')+
    th('descripcion','Descripción')+
    th('largo','Dimensiones')+
    th('pedido_total','Pedido','r')+
    th('entregado_total','Entregado','r')+
    th('pendiente_entregar','Pendiente','r')+
    th('stock_actual','Stock','r')+
    th('necesidad_neta','Necesidad','r')+
  '</tr></thead><tbody>'+
  (sorted.length?sorted.map(n=>{
    const neta=+n.necesidad_neta||0;
    const rowBg=neta>0?'background:var(--red-l)':+n.stock_actual>0?'background:var(--green-l)':'';
    return '<tr style="cursor:pointer;'+rowBg+'" onclick="verProductoStock('+n.producto_id+')" title="Ver historial y fabricar">'+
      '<td class="mono" style="font-weight:500">'+n.referencia+' <i class="ti ti-history" style="font-size:11px;color:var(--text2)"></i></td>'+
      '<td class="dim">'+(n.descripcion||'—')+'</td>'+
      '<td class="dim">'+dimStr(n)+'</td>'+
      '<td class="r mono">'+fmtN(n.pedido_total)+'</td>'+
      '<td class="r mono" style="color:var(--green)">'+fmtN(n.entregado_total)+'</td>'+
      '<td class="r mono">'+fmtN(n.pendiente_entregar)+'</td>'+
      '<td class="r"><span class="stock-chip sc-'+(+n.stock_actual>10?'ok':+n.stock_actual>0?'warn':'bad')+'">'+fmtN(n.stock_actual)+'</span></td>'+
      '<td class="r">'+( neta>0?'<span class="badge b-red"><i class="ti ti-alert-triangle" style="font-size:10px"></i> FABRICAR '+fmtN(neta)+'</span>':'<span class="badge b-green"><i class="ti ti-check" style="font-size:10px"></i> OK</span>')+'</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="8" class="dim" style="text-align:center;padding:20px">Sin resultados</td></tr>')+'</tbody></table>';
  if(_keepFocus){
    const ns=document.getElementById('nec-search');
    if(ns){ ns.focus(); try{ ns.setSelectionRange(_selStart,_selEnd); }catch(e){} }
  }
}

// Ficha de un producto: historial de movimientos + añadir stock (fabricar)
async function verProductoStock(productoId){
  const p=productos.find(x=>String(x.id)===String(productoId));
  if(!p){log('Producto no encontrado','warn');return;}
  const box=document.getElementById('modal-box'); box.className='modal wide';
  document.getElementById('overlay').classList.add('open');
  editId=null; modalType='prodStock';
  document.getElementById('modal-title').innerHTML='<i class="ti ti-package"></i> '+(p.referencia||'')+(p.descripcion?' <span class="dim" style="font-weight:400">— '+p.descripcion+'</span>':'');
  document.getElementById('modal-foot').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cerrar</button>';
  document.getElementById('modal-body').innerHTML='<div style="padding:24px;text-align:center;color:var(--text2)"><i class="ti ti-loader"></i> Cargando historial…</div>';
  let movs=[];
  try{ movs=await api('GET','/stock/movimientos/'+productoId); }catch(e){ movs=[]; }
  // Si se cerró el modal mientras cargaba, no pintar
  if(modalType!=='prodStock') return;
  const stockActual=+p.stock_actual||0;
  const filas=movs.length?movs.map(function(m){
    var esEnt=m.tipo==='entrada';
    return '<tr>'+
      '<td class="mono" style="white-space:nowrap">'+fmtD(m.fecha)+'</td>'+
      '<td><span class="badge '+(esEnt?'b-green':'b-amber')+'">'+(esEnt?'Entrada':'Salida')+'</span></td>'+
      '<td class="r mono" style="font-weight:600;color:'+(esEnt?'var(--green)':'var(--red)')+'">'+(esEnt?'+':'−')+fmtN(m.cantidad)+'</td>'+
      '<td style="white-space:normal">'+(m.motivo||'—')+'</td>'+
      '<td class="dim mono" style="font-size:11px;white-space:nowrap">'+(m.referencia_doc||'')+'</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="5" class="dim" style="text-align:center;padding:18px">Sin movimientos registrados</td></tr>';
  document.getElementById('modal-body').innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">'+
      '<div style="font-size:13px;color:var(--text2)">'+(dimStr(p)||'')+(p.unidad?' · '+p.unidad:'')+'</div>'+
      '<div style="font-size:13px">Stock actual: <strong class="mono" style="font-size:18px;color:'+(stockActual>0?'var(--green)':stockActual<0?'var(--red)':'var(--text2)')+'">'+fmtN(stockActual)+'</strong> ud</div>'+
    '</div>'+
    '<div style="background:var(--surface2);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px">'+
      '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:8px"><i class="ti ti-plus"></i> Añadir stock (fabricación no anotada)</div>'+
      '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">'+
        '<div class="field" style="margin:0"><label>Cantidad</label><input type="number" id="ps-cant" min="1" placeholder="0" style="width:110px" onkeydown="if(event.key===\'Enter\')fabricarDesdeStock('+productoId+')"></div>'+
        '<div class="field" style="margin:0;flex:1;min-width:160px"><label>Motivo</label><input type="text" id="ps-motivo" value="Fabricación" placeholder="Motivo..."></div>'+
        '<button class="btn btn-green" onclick="fabricarDesdeStock('+productoId+')"><i class="ti ti-check"></i> Añadir a stock</button>'+
      '</div>'+
    '</div>'+
    '<div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:6px">Historial de movimientos ('+movs.length+')</div>'+
    '<div style="max-height:330px;overflow:auto"><table class="tbl"><thead><tr><th>Fecha</th><th>Mov.</th><th class="r">Uds.</th><th>Motivo / Para quién</th><th>Doc.</th></tr></thead><tbody>'+filas+'</tbody></table></div>';
}
async function fabricarDesdeStock(productoId){
  const cant=parseInt(document.getElementById('ps-cant')?.value)||0;
  const motivo=(document.getElementById('ps-motivo')?.value||'').trim()||'Fabricación';
  if(cant<=0){log('Introduce una cantidad','warn');return;}
  try{
    await api('POST','/stock/movimiento',{producto_id:+productoId,tipo:'entrada',cantidad:cant,motivo:motivo});
    await loadAll();
    renderNecesidades();
    verProductoStock(productoId); // refresca la ficha con el nuevo movimiento
    mostrarToast('✓ '+fmtN(cant)+' ud añadidas a stock','green');
  }catch(e){log('Error: '+e.message,'warn');}
}

// Panel de movimientos (lista + selector de producto del formulario)
async function recalcularStock(){
  try{
    const prev=await api('GET','/stock/recalcular-preview');
    if(!prev.descuadres){ mostrarToast('El stock ya está cuadrado ('+prev.total_productos+' productos)','green'); return; }
    const detalle=prev.items.slice(0,15).map(function(i){return i.referencia+': '+i.stock_actual+' → '+i.stock_calculado;}).join('\n');
    const mas=prev.items.length>15?('\n…y '+(prev.items.length-15)+' más'):'';
    if(!confirm('Se han detectado '+prev.descuadres+' producto(s) descuadrado(s):\n\n'+detalle+mas+'\n\n¿Recalcular el stock desde el histórico de movimientos?')) return;
    const r=await api('POST','/stock/recalcular');
    await loadAll();
    log('Stock recalculado: '+r.corregidos+' producto(s) corregido(s)','ok');
    mostrarToast('Stock recalculado: '+r.corregidos+' producto(s) corregido(s)','green');
  }catch(e){ log('Error al recalcular: '+e.message,'warn'); }
}
function renderMovPanel(){
  if(!document.getElementById('mov-list')) return;
  populateMovProducto();
  document.getElementById('mov-list').innerHTML=movimientos.slice(0,30).map(m=>{
    const isIn=m.tipo==='entrada';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border)">'+
      '<div style="width:7px;height:7px;border-radius:50%;background:'+(isIn?'var(--green)':m.tipo==='ajuste'?'var(--blue)':'var(--red)')+'" ></div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500">'+m.referencia+'</div><div class="dim">'+(m.motivo||m.tipo)+' · '+fmtD(m.fecha||m.created_at)+'</div></div>'+
      '<div style="font-family:monospace;font-size:13px;font-weight:500;color:'+(isIn?'var(--green)':'var(--red)')+'">'+(isIn?'+':'-')+fmtN(m.cantidad)+'</div>'+
    '</div>';
  }).join('')||'<div class="empty" style="padding:20px"><p>Sin movimientos</p></div>';
}

// ── PEDIDOS ────────────────────────────────────────────────────────────────────
// Clasifica un pedido por sus líneas: vibrado / premontado / mixto / otro
function pedidoTipoProduccion(p){
  var hasVib=false,hasPre=false,hasOtro=false;
  (p.lineas||[]).forEach(function(l){
    var d=mesaNorm((l.descripcion||'')+' '+(l.referencia||''));
    var vib=d.includes('VIBRAD');
    var pre=d.includes('PREMONT')||d.includes('MONTAD');
    if(vib) hasVib=true;
    if(pre) hasPre=true;
    if(!vib&&!pre) hasOtro=true;
  });
  if(hasVib&&hasPre) return 'mixto';
  if(hasVib) return 'vibrado';
  if(hasPre) return 'premontado';
  return hasOtro?'otro':'';
}
function badgePedidoProd(p){
  var t=pedidoTipoProduccion(p);
  if(t==='vibrado')    return '<span class="badge" style="background:#facc15;color:#1a1a1a;font-weight:700"><i class="ti ti-tools" style="font-size:10px"></i> Vibrado</span>';
  if(t==='premontado') return '<span class="badge" style="background:#16a34a;color:#fff;font-weight:700"><i class="ti ti-box" style="font-size:10px"></i> Premontado</span>';
  if(t==='mixto')      return '<span class="badge" style="background:#f97316;color:#fff;font-weight:700"><i class="ti ti-arrows-split-2" style="font-size:10px"></i> Mixto</span>';
  return '';
}

// Guarda la observación de una línea de pedido (edición rápida desde la lista)
async function guardarNotaLinea(lineaId, valor){
  var v=(valor||'').trim()||null;
  try{
    await api('PATCH','/lineas/'+lineaId+'/nota',{notas:v});
    pedidos.forEach(function(p){ (p.lineas||[]).forEach(function(l){ if(String(l.id)===String(lineaId)) l.notas=v; }); });
    entregas.forEach(function(e){ if(String(e.linea_pedido_id)===String(lineaId)) e.linea_notas=v; });
    log('Observación guardada','ok');
  }catch(e){ log('Error: '+e.message,'warn'); }
}

function renderPedidos(){
  const search=(document.getElementById('ped-search')?.value||'').toLowerCase();
  const estadoF=document.getElementById('ped-estado')?.value||'';
  const prodF=document.getElementById('ped-prod')?.value||'';
  let list=pedidos;
  // Los pedidos entregados/cancelados pasan al Historial: no se muestran aquí salvo que se filtre por ese estado a propósito
  if(!['entregado','cancelado'].includes(estadoF)) list=list.filter(p=>!['entregado','cancelado'].includes(p.estado));
  if(search) list=list.filter(p=>(p.numero||'').toLowerCase().includes(search)||(p.cliente_nombre||'').toLowerCase().includes(search)||(p.obra||'').toLowerCase().includes(search));
  if(estadoF) list=list.filter(p=>p.estado===estadoF);
  if(prodF) list=list.filter(p=>pedidoTipoProduccion(p)===prodF);
  const el=document.getElementById('pedidos-list');
  if(!list.length){el.innerHTML='<div class="card"><div class="empty"><i class="ti ti-file-text"></i><p>No hay pedidos</p></div></div>';return;}
  el.innerHTML=list.map(p=>{
    const sc=ESTADOS_PED[p.estado]||ESTADOS_PED.pendiente;
    const lineas=p.lineas||[];
    const totalUds=lineas.reduce((s,l)=>s+(+l.cantidad||0),0);
    const totalEntregado=lineas.reduce((s,l)=>{
      const ent=(l.entregas||[]).filter(e=>e.estado==='confirmada').reduce((ss,e)=>ss+(+e.cantidad||0),0);
      return s+ent;
    },0);
    const pct=totalUds>0?Math.min(100,Math.round(totalEntregado/totalUds*100)):0;
    const entregasPend=entregas.filter(e=>lineas.some(l=>String(l.id)===String(e.linea_pedido_id))&&e.estado==='pendiente');
    return '<div class="card">'+
      '<div class="card-hdr">'+
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
          '<span class="mono" style="font-size:15px;font-weight:600;color:var(--blue)">'+p.numero+'</span>'+
          '<span style="font-weight:500">'+(p.cliente_nombre||p.cliente_nombre_rel||'—')+'</span>'+
          (p.obra?'<span class="badge b-steel"><i class="ti ti-building" style="font-size:10px"></i> '+p.obra+'</span>':'')+
          '<span class="badge '+sc.badge+'">'+sc.label+'</span>'+
          (p.tipo_fabricacion==='stock'?'<span class="badge b-purple">Desde stock</span>':'')+
          badgePedidoProd(p)+
        '</div>'+
        '<div style="display:flex;gap:6px;align-items:center">'+
          '<span class="dim">Entrega: '+fmtD(p.fecha_entrega)+'</span>'+
          '<button class="btn-icon" onclick="openModal(\'pedido\',\''+p.id+'\')"><i class="ti ti-pencil"></i></button>'+
          '<button class="btn-icon danger" onclick="deletePedido(\''+p.id+'\')"><i class="ti ti-trash"></i></button>'+
        '</div>'+
      '</div>'+
      '<div class="card-body" style="padding:10px 16px">'+
        '<div style="display:flex;gap:4px;margin-bottom:8px;align-items:center">'+
          '<div class="prog" style="flex:1"><div class="prog-fill" style="width:'+pct+'%;background:'+(pct===100?'var(--green)':'var(--blue)')+'"></div></div>'+
          '<span class="dim">'+fmtN(totalEntregado)+' / '+fmtN(totalUds)+' ud entregadas ('+pct+'%)</span>'+
        '</div>'+
        '<table class="tbl" style="font-size:12px"><thead><tr>'+
          '<th>Producto</th><th class="r">Pedido</th><th class="r">Entregado</th><th class="r">Pendiente</th>'+
          '<th>Próx. carga</th><th></th>'+
        '</tr></thead><tbody>'+
        lineas.map(l=>{
          const ent=(l.entregas||[]).filter(e=>e.estado==='confirmada').reduce((s,e)=>s+(+e.cantidad||0),0);
          const prog=(l.entregas||[]).filter(e=>e.estado==='pendiente').reduce((s,e)=>s+(+e.cantidad||0),0);
          const pend=Math.max(0,(+l.cantidad||0)-ent);
          const porProgramar=Math.max(0,(+l.cantidad||0)-ent-prog);
          const entPend=(l.entregas||[]).filter(e=>e.estado==='pendiente').sort((a,b)=>a.fecha_carga>b.fecha_carga?1:-1);
          const proxCarga=entPend.length
            ? entPend.map(e=>'<div style="white-space:nowrap"><i class="ti ti-calendar" style="font-size:10px;color:var(--amber)"></i> '+fmtD(e.fecha_carga)+' <span class="dim">('+fmtN(e.cantidad)+' ud)</span></div>').join('')
            : '<span class="dim">—</span>';
          const btnProgramar=porProgramar>0
            ? '<button class="btn btn-outline btn-sm" onclick="openModal(\'entrega\',null,'+l.id+')"><i class="ti ti-calendar-plus"></i> Programar</button>'
            : '<span class="badge b-green" title="Toda la cantidad ya está programada o entregada"><i class="ti ti-check" style="font-size:10px"></i> Programado</span>';
          return '<tr>'+
            '<td style="max-width:340px"><div style="font-weight:500;font-family:monospace;font-size:11px">'+l.referencia+'</div><div class="dim" style="white-space:normal;line-height:1.3;font-size:12px">'+(l.descripcion||dimStr(l))+'</div></td>'+
            '<td class="r mono">'+fmtN(l.cantidad)+'</td>'+
            '<td class="r mono" style="color:var(--green)">'+fmtN(ent)+'</td>'+
            '<td class="r mono" style="color:'+(pend>0?'var(--red)':'var(--green)')+'">'+fmtN(pend)+'</td>'+
            '<td>'+proxCarga+'</td>'+
            '<td>'+btnProgramar+'</td>'+
          '</tr>'+
          '<tr style="background:var(--surface)"><td colspan="6" style="padding:0 10px 8px 10px;border-bottom:1px solid var(--border)">'+
            '<div style="display:flex;align-items:center;gap:6px">'+
              '<i class="ti ti-note" style="font-size:13px;color:var(--text2);flex-shrink:0"></i>'+
              '<input type="text" value="'+(l.notas?String(l.notas).replace(/"/g,'&quot;'):'')+'" placeholder="Observaciones de la línea (salen en la hoja de carga)..." onchange="guardarNotaLinea('+l.id+',this.value)" style="flex:1;font-size:11px;padding:4px 8px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2);color:var(--text)">'+
            '</div>'+
          '</td></tr>';
        }).join('')+
        '</tbody></table>'+
        (entregasPend.length||totalEntregado>0?
          '<div style="margin-top:8px;display:flex;gap:12px;font-size:11px">'+
            (entregasPend.length?'<span style="color:var(--amber)"><i class="ti ti-clock" style="font-size:11px"></i> '+entregasPend.length+' carga'+( entregasPend.length>1?'s':'')+' pendiente'+( entregasPend.length>1?'s':'')+' ('+fmtN(entregasPend.reduce((s,e)=>s+(+e.cantidad||0),0))+' ud)</span>':'')+
            (totalEntregado>0?'<span style="color:var(--green)"><i class="ti ti-check" style="font-size:11px"></i> '+fmtN(totalEntregado)+' ud ya entregadas</span>':'')+
          '</div>'
        :'')+
      '</div>'+
    '</div>';
  }).join('');
}

function verPedido(id){
  const p=pedidos.find(x=>String(x.id)===String(id));
  if(!p) return;
  openModal('pedido_ver',id);
}

// ── STOCK (unificado en la vista de Necesidades) ─────────────────────────────
function renderStock(){ renderNecesidades(); }

function populateMovProducto(){
  const sel=document.getElementById('mov-producto');
  if(!sel) return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Seleccionar...</option>'+productos.map(p=>'<option value="'+p.id+'" '+(String(p.id)===cur?'selected':'')+'>'+prodLabel(p)+'</option>').join('');
}

function filtrarMovProducto(){
  var q=(document.getElementById('mov-prod-search')?.value||'').toLowerCase().trim();
  var lista=document.getElementById('mov-prod-lista');
  if(!lista) return;
  if(!q){lista.style.display='none';return;}
  var filtered=productos.filter(function(p){
    return (p.referencia||'').toLowerCase().includes(q)||(p.descripcion||'').toLowerCase().includes(q);
  });
  if(!filtered.length){lista.style.display='none';return;}
  lista.innerHTML=filtered.map(function(p){
    var ref=p.referencia||'';
    var desc=p.descripcion||'';
    var dim=dimStr(p)||'';
    return '<div data-pid="'+p.id+'" onclick="seleccionarMovProd(this)" '+
      'style="padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'+
      '<div>'+
        '<span style="font-weight:600;font-family:monospace;color:var(--blue-d)">'+ref+'</span>'+
        (desc?'<span style="color:var(--text2);margin-left:8px;font-size:11px">'+desc+'</span>':'')+
      '</div>'+
      (dim?'<span style="font-family:monospace;font-size:11px;color:var(--text2);flex-shrink:0;margin-left:8px">'+dim+'</span>':'')+
    '</div>';
  }).join('');
  lista.style.display='block';
}

function seleccionarMovProd(el){
  var id=el.dataset.pid;
  var ref=el.querySelector('span[style*="font-weight"]')?.textContent||'';
  var dim=el.querySelector('span[style*="flex-shrink"]')?.textContent||'';
  document.getElementById('mov-producto').value=id;
  document.getElementById('mov-prod-search').value='';
  document.getElementById('mov-prod-lista').style.display='none';
  var sel=document.getElementById('mov-prod-sel');
  var label=document.getElementById('mov-prod-sel-label');
  if(sel&&label){
    label.innerHTML='<strong>'+ref+'</strong>'+(dim?' <span style="color:var(--text2);margin-left:6px">'+dim+'</span>':'');
    sel.style.display='flex';
  }
}

function limpiarMovProd(){
  document.getElementById('mov-producto').value='';
  document.getElementById('mov-prod-search').value='';
  var sel=document.getElementById('mov-prod-sel');
  if(sel) sel.style.display='none';
}

function onMovTipoChange(){
  const esAjuste=document.getElementById('mov-tipo').value==='ajuste';
  document.getElementById('mov-ajuste-hint').style.display=esAjuste?'block':'none';
  document.getElementById('mov-cantidad').placeholder=esAjuste?'+ suma / − resta':'0';
}
async function registrarMovimiento(){
  const prod=document.getElementById('mov-producto').value;
  const tipo=document.getElementById('mov-tipo').value;
  const cantidad=parseFloat(document.getElementById('mov-cantidad').value)||0;
  const motivo=document.getElementById('mov-motivo').value.trim();
  if(!prod||!cantidad){log('Selecciona producto y cantidad','warn');return;}
  try{
    await api('POST','/stock/movimiento',{producto_id:+prod,tipo,cantidad,motivo});
    await loadAll();
    document.getElementById('mov-cantidad').value='';
    document.getElementById('mov-motivo').value='';
    renderStock();
    log('Movimiento registrado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

// ── CATÁLOGO ───────────────────────────────────────────────────────────────────
function renderProductos(){
  const TIPO_LABELS={gavion:'Gaviones',colchoneta:'Colchonetas Reno',malla:'Malla',panel:'Paneles',accesorio:'Accesorios',otro:'Otros'};
  const tiposPresentes=[...new Set(productos.map(p=>p.tipo))].sort();
  var sortArrow=sortDir==='desc'?' ↓':' ↑';
  let html='<div class="sort-btns">'+
    '<span style="font-size:11px;color:var(--text2)">Ordenar por:</span>'+
    '<button class="sort-btn'+(sortField==='largo'?' active':'')+'" data-f="largo" onclick="setSortField(this.dataset.f)">Largo'+(sortField==='largo'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='ancho'?' active':'')+'" data-f="ancho" onclick="setSortField(this.dataset.f)">Ancho'+(sortField==='ancho'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='alto'?' active':'')+'" data-f="alto" onclick="setSortField(this.dataset.f)">Alto'+(sortField==='alto'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='referencia'?' active':'')+'" data-f="referencia" onclick="setSortField(this.dataset.f)">Ref.'+(sortField==='referencia'?sortArrow:'')+'</button>'+
  '</div>';
  tiposPresentes.forEach(tipo=>{
    const label=TIPO_LABELS[tipo]||(tipo.charAt(0).toUpperCase()+tipo.slice(1));
    const prods=sortedProductos(productos.filter(p=>p.tipo===tipo));
    if(!prods.length) return;
    html+='<div style="padding:10px 16px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2)">'+label+'</div>';
    html+='<table class="tbl"><tbody>';
    prods.forEach(p=>{
      const st=stock.find(s=>String(s.producto_id)===String(p.id));
      const stQ=st?+st.cantidad:0;
      html+='<tr>'+
        '<td style="width:140px" class="mono" ><span style="font-weight:500">'+p.referencia+'</span></td>'+
        '<td class="dim">'+( p.descripcion||'—')+'</td>'+
        '<td class="dim mono">'+(dimStr(p)||'—')+'</td>'+
        '<td><span class="badge '+(stQ>0?'b-green':'b-gray')+'">'+fmtN(stQ)+' '+(p.unidad||'ud')+'</span></td>'+
        '<td class="r">'+
          '<button class="btn-icon" onclick="openModal(\'producto\',\''+p.id+'\')" title="Editar"><i class="ti ti-pencil"></i></button>'+
          '<button class="btn-icon danger" onclick="deleteProducto(\''+p.id+'\',\''+p.referencia+'\')" title="Eliminar"><i class="ti ti-trash"></i></button>'+
        '</td>'+
      '</tr>';
    });
    html+='</tbody></table>';
  });
  document.getElementById('productos-list').innerHTML=html||'<div class="empty"><i class="ti ti-grid-dots"></i><p>Sin productos</p></div>';
}

// ── CLIENTES ───────────────────────────────────────────────────────────────────
function renderClientes(){
  const el=document.getElementById('clientes-list');
  if(!clientes.length){el.innerHTML='<div class="empty"><i class="ti ti-users"></i><p>Sin clientes</p></div>';return;}
  el.innerHTML='<table class="tbl"><thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th></th></tr></thead><tbody>'+
  clientes.map(c=>'<tr>'+
    '<td style="font-weight:500">'+c.nombre+'</td>'+
    '<td class="dim">'+(c.contacto||'—')+'</td>'+
    '<td class="dim">'+(c.telefono||'—')+'</td>'+
    '<td class="dim">'+(c.email||'—')+'</td>'+
    '<td class="r">'+
      '<button class="btn-icon" onclick="openModal(\'cliente\',\''+c.id+'\')"><i class="ti ti-pencil"></i></button>'+
      '<button class="btn-icon danger" onclick="deleteCliente(\''+c.id+'\')"><i class="ti ti-trash"></i></button>'+
    '</td>'+
  '</tr>').join('')+'</tbody></table>';
}

// ── MODALES ────────────────────────────────────────────────────────────────────
function openModal(type, id, extraId){
  editId=id; modalType=type;
  const box=document.getElementById('modal-box');
  box.className='modal';
  document.getElementById('overlay').classList.add('open');

  if(type==='pedido'){
    box.classList.add('wide');
    const p=id?pedidos.find(x=>String(x.id)===String(id)):null;
    const lineas=p?p.lineas||[]:[];
    pedidoLogActual=(p&&Array.isArray(p.update_log))?p.update_log.slice():[];
    document.getElementById('modal-title').innerHTML='<i class="ti ti-file-text"></i> '+(id?'Editar pedido':'Nuevo pedido')+(!id?' <button class="btn btn-outline btn-sm" onclick="triggerPDFImportEnModal()" style="margin-left:8px;font-size:11px"><i class="ti ti-file-import"></i> Importar PDF BC</button>':' <button class="btn btn-outline btn-sm" onclick="triggerActualizarPDF()" style="margin-left:8px;font-size:11px"><i class="ti ti-refresh"></i> Actualizar desde PDF</button>');
    document.getElementById('modal-body').innerHTML=
      (!id?'<input type="file" id="pdf-modal-input" accept=".pdf" style="display:none" onchange="procesarPDFEnModal(this)">':'<input type="file" id="pdf-update-input" accept=".pdf" style="display:none" onchange="procesarActualizacionPDF(this)">')+
      (id?'<div id="pedido-log-panel" style="margin-bottom:14px"></div>':'')+
      '<div class="frow"><div class="field"><label>Nº Pedido</label><input type="text" id="f-num" value="'+(p?p.numero:autoNumPedido())+'" placeholder="P-2024-001"></div>'+
      '<div class="field"><label>Cliente</label><select id="f-cliente"><option value="">Sin cliente</option>'+clientes.map(c=>'<option value="'+c.id+'" '+(p&&String(p.cliente_id)===String(c.id)?'selected':'')+'>'+c.nombre+'</option>').join('')+'</select></div></div>'+
      '<div class="field"><label>Nombre cliente (si no está en lista)</label><input type="text" id="f-cliente-nombre" value="'+(p?p.cliente_nombre||'':'')+'" placeholder="Nombre del cliente"></div>'+
      '<div class="frow"><div class="field"><label>Obra / Proyecto</label><input type="text" id="f-obra" value="'+(p?p.obra||'':'')+'" placeholder="Nombre de la obra"></div>'+
      '<div class="field"><label>Tipo fabricación</label><select id="f-tipo-fab"><option value="bajo_pedido" '+(!p||p.tipo_fabricacion==='bajo_pedido'?'selected':'')+'>Bajo pedido</option><option value="stock" '+(p&&p.tipo_fabricacion==='stock'?'selected':'')+'>Desde stock</option></select></div></div>'+
      '<div class="frow"><div class="field"><label>Fecha pedido</label><input type="date" id="f-fecha-ped" value="'+(p&&p.fecha_pedido?String(p.fecha_pedido).substring(0,10):'')+'"></div>'+
      '<div class="field"><label>Fecha entrega</label><input type="date" id="f-fecha-ent" value="'+(p&&p.fecha_entrega?String(p.fecha_entrega).substring(0,10):'')+'"></div></div>'+
      '<div class="field"><label>Estado</label><select id="f-estado">'+Object.entries(ESTADOS_PED).map(([k,v])=>'<option value="'+k+'" '+((p&&p.estado===k)||(k==='pendiente'&&!p)?'selected':'')+'>'+v.label+'</option>').join('')+'</select></div>'+
      '<div class="field"><label>Notas</label><textarea id="f-notas">'+(p?p.notas||'':'')+'</textarea></div>'+
      '<div class="field"><label>Link Google Maps <span style="font-size:10px;color:var(--text2);font-weight:400">(opcional — QR en impresión)</span></label>'+
        '<input type="url" id="f-maps-url" value="'+(p?p.maps_url||'':'')+'" placeholder="https://maps.app.goo.gl/..."></div>'+
      '<div class="sep"></div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
        '<div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2)">Líneas del pedido</div>'+
        '<button class="btn btn-outline btn-sm" onclick="addLineaPedido()"><i class="ti ti-plus"></i> Añadir línea</button>'+
      '</div>'+
      '<div style="font-size:10px;color:var(--text2);margin-bottom:6px;display:grid;grid-template-columns:1fr 80px;gap:6px"><span>Producto</span><span style="text-align:right">Cantidad</span></div>'+
      '<div id="lineas-container">'+lineas.map((l,i)=>lineaHTML(i,l)).join('')+'</div>';
    document.getElementById('modal-foot').innerHTML=
      (id?'<button class="btn btn-danger btn-sm" onclick="closeModal();deletePedido(\''+id+'\')"><i class="ti ti-trash"></i></button>':'')+
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" onclick="savePedido()"><i class="ti ti-device-floppy"></i> Guardar</button>';
    if(id) renderPedidoLog();

  } else if(type==='entrega'){
    box.classList.add('wide');
    // extraId = pedido_id (preferred) or linea_pedido_id
    const pedidosActivos=pedidos.filter(p=>!['entregado','cancelado'].includes(p.estado));
    document.getElementById('modal-title').innerHTML='<i class="ti ti-calendar-plus"></i> Programar carga';

    // Determine which pedido to pre-select
    let prePedidoId='';
    if(extraId){
      // extraId could be a linea_pedido_id — find its pedido
      pedidosActivos.forEach(p=>{
        (p.lineas||[]).forEach(l=>{ if(String(l.id)===String(extraId)) prePedidoId=String(p.id); });
      });
      if(!prePedidoId) prePedidoId=String(extraId); // treat as pedido_id directly
    }

    let pedidoOptions='<option value="">Seleccionar pedido...</option>';
    pedidosActivos.forEach(p=>{
      pedidoOptions+='<option value="'+p.id+'" '+(String(p.id)===prePedidoId?'selected':'')+'>'+p.numero+(p.cliente_nombre?' — '+p.cliente_nombre:'')+(p.obra?' ('+p.obra+')':'')+'</option>';
    });

    document.getElementById('modal-body').innerHTML=
      '<div class="frow">'+
        '<div class="field"><label>Pedido</label><select id="f-pedido" onchange="renderLineasEntrega()">'+pedidoOptions+'</select></div>'+
        '<div class="field"><label>Fecha de carga</label><input type="date" id="f-fecha-carga" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
      '</div>'+
      '<div class="frow3">'+
        '<div class="field"><label>Transportista</label><input type="text" id="f-trans" placeholder="Nombre transportista"></div>'+
        '<div class="field"><label>Matrícula camión</label><input type="text" id="f-matc" placeholder="0000 AAA" style="font-family:monospace"></div>'+
        '<div class="field"><label>Matrícula remolque</label><input type="text" id="f-matr" placeholder="0000 AAA" style="font-family:monospace"></div>'+
      '</div>'+
      '<div id="lineas-entrega-container" style="margin-top:4px"></div>'+
      '<div class="field" style="margin-top:8px"><label>Notas</label><input type="text" id="f-enotas" placeholder="Observaciones generales..."></div>';

    document.getElementById('modal-foot').innerHTML=
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveEntrega()"><i class="ti ti-calendar-plus"></i> Programar carga</button>';

    // Render lines for pre-selected pedido
    if(prePedidoId) renderLineasEntrega();

  } else if(type==='producto'){
    const p=id?productos.find(x=>String(x.id)===String(id)):null;
    document.getElementById('modal-title').innerHTML='<i class="ti ti-box"></i> '+(id?'Editar producto':'Nuevo producto');
    document.getElementById('modal-body').innerHTML=
      '<div class="frow"><div class="field"><label>Tipo / Categoría</label>'+
        '<select id="f-ptipo" onchange="toggleDims()">'+
          '<option value="gavion" '+(!p||p.tipo==='gavion'?'selected':'')+'>Gavión</option>'+
          '<option value="colchoneta" '+(p&&p.tipo==='colchoneta'?'selected':'')+'>Colchoneta Reno</option>'+
          '<option value="malla" '+(p&&p.tipo==='malla'?'selected':'')+'>Malla suelta</option>'+
          '<option value="panel" '+(p&&p.tipo==='panel'?'selected':'')+'>Panel / Jaula</option>'+
          '<option value="accesorio" '+(p&&p.tipo==='accesorio'?'selected':'')+'>Accesorio</option>'+
          '<option value="otro" '+(p&&!['gavion','colchoneta','malla','panel','accesorio'].includes(p.tipo)?'selected':'')+'>Otro</option>'+
        '</select></div>'+
      '<div class="field"><label>Referencia</label><input type="text" id="f-pref" value="'+(p?p.referencia||'':'')+'" placeholder="GAV-2x1x1"></div></div>'+
      '<div id="dims-row" class="frow3" style="'+(p&&(p.tipo==='accesorio'||p.tipo==='otro')?'display:none':'')+'">'+
        '<div class="field"><label>Largo (m)</label><input type="number" id="f-plargo" value="'+(p?p.largo||'':'')+'" placeholder="2.00" step="0.01"></div>'+
        '<div class="field"><label>Ancho (m)</label><input type="number" id="f-pancho" value="'+(p?p.ancho||'':'')+'" placeholder="1.00" step="0.01"></div>'+
        '<div class="field"><label>Alto (m)</label><input type="number" id="f-palto" value="'+(p?p.alto||'':'')+'" placeholder="1.00" step="0.01"></div>'+
      '</div>'+
      '<div class="field"><label>Descripción</label><input type="text" id="f-pdesc" value="'+(p?p.descripcion||'':'')+'" placeholder="Descripción"></div>'+
      '<div class="field"><label>Unidad</label><select id="f-punidad">'+
        ['ud','bolsa','rollo','kg','m'].map(u=>'<option value="'+u+'" '+(p&&p.unidad===u?'selected':'')+'>'+u+'</option>').join('')+
      '</select></div>';
    document.getElementById('modal-foot').innerHTML=
      (id?'<button class="btn btn-danger btn-sm" onclick="closeModal();deleteProducto(\''+id+'\',\'\')"><i class="ti ti-trash"></i></button>':'')+
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveProducto()"><i class="ti ti-device-floppy"></i> Guardar</button>';

  } else if(type==='cliente'){
    const c=id?clientes.find(x=>String(x.id)===String(id)):null;
    document.getElementById('modal-title').innerHTML='<i class="ti ti-user"></i> '+(id?'Editar cliente':'Nuevo cliente');
    document.getElementById('modal-body').innerHTML=
      '<div class="frow"><div class="field"><label>Nombre empresa</label><input type="text" id="f-cnombre" value="'+(c?c.nombre:'')+'" placeholder="Razón social"></div>'+
      '<div class="field"><label>Persona contacto</label><input type="text" id="f-ccontacto" value="'+(c?c.contacto||'':'')+'" placeholder="Nombre"></div></div>'+
      '<div class="frow"><div class="field"><label>Teléfono</label><input type="text" id="f-ctelefono" value="'+(c?c.telefono||'':'')+'" placeholder="666 000 000"></div>'+
      '<div class="field"><label>Email</label><input type="email" id="f-cemail" value="'+(c?c.email||'':'')+'" placeholder="correo@empresa.com"></div></div>'+
      '<div class="field"><label>Dirección</label><input type="text" id="f-cdir" value="'+(c?c.direccion||'':'')+'" placeholder="Calle, ciudad..."></div>';
    document.getElementById('modal-foot').innerHTML=
      (id?'<button class="btn btn-danger btn-sm" onclick="closeModal();deleteCliente(\''+id+'\')"><i class="ti ti-trash"></i></button>':'')+
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" onclick="saveCliente()"><i class="ti ti-device-floppy"></i> Guardar</button>';
  }
}

function toggleDims(){
  const tipo=document.getElementById('f-ptipo')?.value;
  const dr=document.getElementById('dims-row');
  if(dr) dr.style.display=(tipo==='accesorio'||tipo==='otro')?'none':'';
}

function lineaHTML(i,l){
  return '<div id="linea-'+i+'" data-lid="'+(l&&l.id?l.id:'')+'" data-pid="'+(l&&l.producto_id?l.producto_id:'')+'" style="margin-bottom:8px">'+
    '<div style="display:grid;grid-template-columns:1fr 80px 30px;gap:6px;align-items:center">'+
      '<select class="linea-prod" data-i="'+i+'" onchange="this.closest(\'[data-pid]\').dataset.pid=this.value" style="font-size:12px;padding:5px 7px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2)">'+
        '<option value="">Seleccionar producto...</option>'+
        productos.map(p=>'<option value="'+p.id+'" '+(l&&String(l.producto_id)===String(p.id)?'selected':'')+'>'+prodLabel(p)+'</option>').join('')+
      '</select>'+
      '<input type="number" class="linea-cant" data-i="'+i+'" placeholder="Cant." value="'+(l?l.cantidad:'')+'" min="1" style="font-size:12px;padding:5px 7px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2);font-family:monospace;text-align:right">'+
      '<button onclick="document.getElementById(\'linea-'+i+'\').remove()" style="background:none;border:1px solid var(--border2);border-radius:4px;padding:5px 6px;cursor:pointer;color:var(--text2)"><i class="ti ti-x" style="font-size:12px"></i></button>'+
    '</div>'+
    '<input type="text" class="linea-notas" placeholder="Nota de la línea (p. ej. texto de la letra; sale en la hoja de carga)..." value="'+(l&&l.notas?String(l.notas).replace(/"/g,'&quot;'):'')+'" style="margin-top:4px;width:100%;font-size:11px;padding:4px 8px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2);color:var(--text)">'+
  '</div>';
}

function addLineaPedido(){
  const c=document.getElementById('lineas-container');
  if(!c) return;
  c.insertAdjacentHTML('beforeend',lineaHTML(Date.now(),null));
}

function getLineas(){
  const lineas=[];
  document.querySelectorAll('#lineas-container > div').forEach(row=>{
    const sel=row.querySelector('.linea-prod')?.value;
    const prod=(sel&&sel!=='')?sel:(row.dataset.pid||'');   // si el desplegable está vacío, usa el id guardado en la fila
    const cant=parseFloat(row.querySelector('.linea-cant')?.value)||0;
    const notas=row.querySelector('.linea-notas')?.value.trim()||null;
    const lid=row.dataset.lid;
    if(prod&&cant>0) lineas.push({id:lid?+lid:undefined,producto_id:+prod,cantidad:cant,notas:notas});
  });
  return lineas;
}

function autoNumPedido(){
  const year=new Date().getFullYear();
  const re=new RegExp('^P-'+year+'-(\\d+)$');
  // Siguiente correlativo = mayor número existente de este año + 1.
  // (Antes usaba pedidos.length+1, que se repetía al borrar pedidos.)
  let max=0;
  pedidos.forEach(function(p){
    const m=re.exec(String(p.numero||''));
    if(m){ const n=parseInt(m[1],10); if(n>max) max=n; }
  });
  return 'P-'+year+'-'+String(max+1).padStart(3,'0');
}

function closeModal(){
  document.getElementById('overlay').classList.remove('open');
  editId=null;modalType=null;
}

