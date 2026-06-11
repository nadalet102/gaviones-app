// ── SAVES ──────────────────────────────────────────────────────────────────────
async function savePedido(){
  const num=document.getElementById('f-num').value.trim();
  if(!num){log('Introduce el número de pedido','warn');return;}
  const lineas=getLineas();
  if(!lineas.length){log('Añade al menos una línea de producto','warn');return;}
  const cliSel=document.getElementById('f-cliente').value;
  const data={
    numero:num,cliente_id:cliSel||null,
    cliente_nombre:document.getElementById('f-cliente-nombre').value.trim()||(cliSel?clientes.find(c=>String(c.id)===cliSel)?.nombre:''),
    obra:document.getElementById('f-obra').value.trim(),
    tipo_fabricacion:document.getElementById('f-tipo-fab').value,
    fecha_pedido:document.getElementById('f-fecha-ped').value||null,
    fecha_entrega:document.getElementById('f-fecha-ent').value||null,
    estado:document.getElementById('f-estado').value,
    notas:document.getElementById('f-notas').value.trim(),
    maps_url:document.getElementById('f-maps-url')?.value.trim()||null,
    update_log:pedidoLogActual,
    lineas
  };
  try{
    if(editId){
      await api('PUT','/pedidos-gav/'+editId,data);
    }else{
      await api('POST','/pedidos-gav',data);
    }
    await loadAll();
    closeModal();
    log('Pedido guardado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

// ── ACTUALIZAR PEDIDO DESDE PDF ──────────────────────────────────────────────
function triggerActualizarPDF(){
  const inp=document.getElementById('pdf-update-input');
  if(inp) inp.click();
}

async function procesarActualizacionPDF(input){
  const file=input.files[0];
  if(!file) return;
  log('Leyendo PDF...','');
  let base64;
  try{
    base64=await new Promise(function(res,rej){
      const r=new FileReader();
      r.onload=function(){res(r.result.split(',')[1]);};
      r.onerror=function(){rej(new Error('Error leyendo archivo'));};
      r.readAsDataURL(file);
    });
  }catch(e){log('Error: '+e.message,'warn');input.value='';return;}
  try{
    const resp=await fetch('/api/importar-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64:base64,media_type:'application/pdf'})});
    const raw=await resp.text();
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    let pdf; try{pdf=JSON.parse(raw);}catch(pe){throw new Error('Respuesta no válida');}
    aplicarActualizacionPedido(pdf);
  }catch(e){
    log('No se pudo leer el PDF: '+e.message,'warn');
  }
  input.value='';
}

// Compara las líneas del PDF con las del formulario y actualiza cantidades,
// añade referencias nuevas y avisa de las que ya no aparecen (no las borra).
function aplicarActualizacionPedido(pdf){
  const pdfLineas=(pdf&&pdf.lineas)||[];
  if(!pdfLineas.length){log('El PDF no contiene líneas reconocibles','warn');return;}
  const cambios=[];
  const pdfRefs=new Set();
  pdfLineas.forEach(function(pl){
    const ref=pl.referencia;
    pdfRefs.add(ref);
    const prod=productos.find(function(p){return p.referencia===ref;});
    if(!prod){ cambios.push({t:'warn',txt:ref+' no está en el catálogo (línea ignorada)'}); return; }
    const nuevaCant=Math.round(+pl.cantidad||0);
    if(nuevaCant<=0) return;
    const rows=[...document.querySelectorAll('#lineas-container > div')];
    const row=rows.find(function(r){return r.querySelector('.linea-prod')?.value===String(prod.id);});
    if(row){
      const inp=row.querySelector('.linea-cant');
      const anterior=parseFloat(inp.value)||0;
      if(anterior!==nuevaCant){
        inp.value=nuevaCant;
        cambios.push({t:'mod',txt:ref+': '+fmtN(anterior)+' → '+fmtN(nuevaCant)+' ud'});
      }
    }else{
      const c=document.getElementById('lineas-container');
      c.insertAdjacentHTML('beforeend',lineaHTML('pdf'+Date.now()+Math.floor(Math.random()*1000),{producto_id:prod.id,cantidad:nuevaCant}));
      cambios.push({t:'add',txt:'+ '+ref+' ('+fmtN(nuevaCant)+' ud) nueva'});
    }
  });
  // Líneas actuales que ya no aparecen en el PDF: solo aviso, no se borran
  [...document.querySelectorAll('#lineas-container > div')].forEach(function(r){
    const pid=r.querySelector('.linea-prod')?.value;
    if(!pid) return;
    const prod=productos.find(function(p){return String(p.id)===pid;});
    if(prod&&!pdfRefs.has(prod.referencia)){
      cambios.push({t:'warn',txt:prod.referencia+' ya no aparece en el PDF (revísala)'});
    }
  });
  if(!cambios.length){log('El PDF coincide con las líneas actuales, sin cambios','ok');return;}
  pedidoLogActual.unshift({fecha:new Date().toISOString(),numero:pdf.numero||null,cambios:cambios});
  renderPedidoLog();
  const nMod=cambios.filter(function(c){return c.t!=='warn';}).length;
  const nWarn=cambios.filter(function(c){return c.t==='warn';}).length;
  log('Actualizado desde PDF: '+nMod+' cambio'+(nMod===1?'':'s')+(nWarn?', '+nWarn+' aviso'+(nWarn===1?'':'s'):'')+'. Revisa y pulsa Guardar.','ok');
}

function renderPedidoLog(){
  const el=document.getElementById('pedido-log-panel');
  if(!el) return;
  if(!pedidoLogActual.length){
    el.innerHTML='<div style="font-size:11px;color:var(--text2);background:var(--surface2);border-radius:var(--radius-sm);padding:8px 12px"><i class="ti ti-history"></i> Sin actualizaciones registradas. Usa «Actualizar desde PDF» para sincronizar las líneas con un PDF nuevo.</div>';
    return;
  }
  const colT={mod:'var(--blue)',add:'var(--green)',warn:'var(--amber)'};
  let html='<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden">'+
    '<div style="background:var(--surface2);padding:7px 12px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);display:flex;align-items:center;gap:6px"><i class="ti ti-history"></i> Historial de actualizaciones ('+pedidoLogActual.length+')</div>'+
    '<div style="max-height:170px;overflow-y:auto">';
  pedidoLogActual.forEach(function(e){
    html+='<div style="padding:8px 12px;border-bottom:1px solid var(--border)">'+
      '<div style="font-size:11px;color:var(--text2);margin-bottom:4px"><i class="ti ti-calendar" style="font-size:11px"></i> '+fmtFechaHora(e.fecha)+'</div>'+
      (e.cambios||[]).map(function(c){
        return '<div style="font-size:12px;color:'+(colT[c.t]||'var(--text)')+'">'+(c.t==='warn'?'<i class="ti ti-alert-triangle" style="font-size:11px"></i> ':'')+c.txt+'</div>';
      }).join('')+
    '</div>';
  });
  html+='</div></div>';
  el.innerHTML=html;
}

function fmtFechaHora(iso){
  if(!iso) return '';
  try{
    const d=new Date(iso);
    return d.toLocaleDateString('es-ES')+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return String(iso).substring(0,16); }
}

function renderLineasEntrega(){
  const pedidoId=document.getElementById('f-pedido')?.value;
  const container=document.getElementById('lineas-entrega-container');
  if(!container) return;
  if(!pedidoId){container.innerHTML='<div style="font-size:12px;color:var(--text2);padding:8px 0">Selecciona un pedido para ver sus líneas</div>';return;}
  const pedido=pedidos.find(p=>String(p.id)===String(pedidoId));
  if(!pedido||!pedido.lineas||!pedido.lineas.length){container.innerHTML='<div style="font-size:12px;color:var(--text2);padding:8px 0">Este pedido no tiene líneas</div>';return;}

  let html='<div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:6px">Unidades a cargar por producto</div>';
  html+='<table style="width:100%;border-collapse:collapse;font-size:12px">';
  html+='<thead><tr style="background:var(--surface2)">'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Producto</th>'+
    '<th style="padding:7px 10px;text-align:right;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Total pedido</th>'+
    '<th style="padding:7px 10px;text-align:right;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Entregado</th>'+
    '<th style="padding:7px 10px;text-align:right;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Programado</th>'+
    '<th style="padding:7px 10px;text-align:right;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Por programar</th>'+
    '<th style="padding:7px 10px;text-align:right;font-weight:500;color:var(--text2);border-bottom:1px solid var(--border)">Cargar ahora</th>'+
  '</tr></thead><tbody>';

  var totalPorProg=0;
  pedido.lineas.forEach(function(l){
    const entregado=(l.entregas||[]).filter(e=>e.estado==='confirmada').reduce(function(s,e){return s+(+e.cantidad||0);},0);
    const programado=(l.entregas||[]).filter(e=>e.estado==='pendiente').reduce(function(s,e){return s+(+e.cantidad||0);},0);
    const porProgramar=Math.max(0,(+l.cantidad||0)-entregado-programado);
    totalPorProg+=porProgramar;
    html+='<tr style="border-bottom:1px solid var(--border)">'+
      '<td style="padding:8px 10px">'+
        '<div style="font-weight:500">'+l.referencia+'</div>'+
        '<div style="font-size:10px;color:var(--text2)">'+dimStr(l)+'</div>'+
      '</td>'+
      '<td style="padding:8px 10px;text-align:right;font-family:monospace">'+fmtN(l.cantidad)+'</td>'+
      '<td style="padding:8px 10px;text-align:right;font-family:monospace;color:var(--green)">'+fmtN(entregado)+'</td>'+
      '<td style="padding:8px 10px;text-align:right;font-family:monospace;color:var(--amber)">'+fmtN(programado)+'</td>'+
      '<td style="padding:8px 10px;text-align:right;font-family:monospace;color:'+(porProgramar>0?'var(--red)':'var(--text2)')+'">'+fmtN(porProgramar)+'</td>'+
      '<td style="padding:8px 10px;text-align:right">'+
        '<input type="number" data-linea="'+l.id+'" min="0" max="'+porProgramar+'" placeholder="0" '+
          'style="width:80px;font-size:13px;font-family:monospace;text-align:right;padding:4px 7px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2)" '+
          (porProgramar===0?'disabled title="Todo programado o entregado"':'')+
          ' oninput="actualizarTotalEntrega()">'+
      '</td>'+
    '</tr>';
  });
  html+='</tbody></table>';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:10px">'+
    (totalPorProg>0
      ? '<button class="btn btn-outline btn-sm" onclick="cargarTodoEntrega()"><i class="ti ti-checks"></i> Cargar todo lo pendiente ('+fmtN(totalPorProg)+' ud)</button>'
      : '<span></span>')+
    '<div style="font-size:12px;color:var(--text2)">Total a cargar: <strong style="font-family:monospace;margin-left:6px;color:var(--blue)" id="total-entrega">0 ud</strong></div>'+
  '</div>';
  container.innerHTML=html;
}

function actualizarTotalEntrega(){
  var total=0;
  document.querySelectorAll('[data-linea]').forEach(function(inp){total+=parseInt(inp.value)||0;});
  var el=document.getElementById('total-entrega');
  if(el) el.textContent=fmtN(total)+' ud';
}
// Rellena cada línea con todo lo que le queda por programar (su máximo)
function cargarTodoEntrega(){
  document.querySelectorAll('#lineas-entrega-container [data-linea]').forEach(function(inp){
    if(!inp.disabled) inp.value=inp.max||0;
  });
  actualizarTotalEntrega();
}

async function saveEntrega(){
  var fecha=document.getElementById('f-fecha-carga').value;
  var notas=document.getElementById('f-enotas').value;
  if(!fecha){log('Selecciona la fecha de carga','warn');return;}

  var lineasACargar=[];
  document.querySelectorAll('[data-linea]').forEach(function(inp){
    var cant=parseInt(inp.value)||0;
    if(cant>0) lineasACargar.push({linea_pedido_id:+inp.dataset.linea, cantidad:cant});
  });
  if(!lineasACargar.length){log('Introduce al menos una cantidad para cargar','warn');return;}

  var trans=document.getElementById('f-trans')?.value.trim()||null;
  var matC=document.getElementById('f-matc')?.value.trim()||null;
  var matR=document.getElementById('f-matr')?.value.trim()||null;
  // Unique ID that groups all lines of this specific carga together
  var grupoId='G'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();

  try{
    for(var i=0;i<lineasACargar.length;i++){
      await api('POST','/entregas',{
        linea_pedido_id:lineasACargar[i].linea_pedido_id,
        fecha_carga:fecha,
        cantidad:lineasACargar[i].cantidad,
        notas:notas,
        transportista:trans,
        mat_camion:matC,
        mat_remolque:matR,
        carga_grupo_id:grupoId
      });
    }
    await loadAll();
    closeModal();
    log(lineasACargar.length+' linea(s) programada(s) — ID: '+grupoId,'ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function saveProducto(){
  const tipo=document.getElementById('f-ptipo').value;
  const ref=document.getElementById('f-pref').value.trim();
  if(!ref){log('Introduce la referencia','warn');return;}
  const data={tipo,referencia:ref,
    largo:parseFloat(document.getElementById('f-plargo')?.value)||null,
    ancho:parseFloat(document.getElementById('f-pancho')?.value)||null,
    alto:parseFloat(document.getElementById('f-palto')?.value)||null,
    descripcion:document.getElementById('f-pdesc').value.trim(),
    unidad:document.getElementById('f-punidad').value
  };
  try{
    if(editId){
      const updated=await api('PUT','/productos/'+editId,data);
      Object.assign(productos.find(x=>String(x.id)===String(editId)),updated);
    }else{
      const newP=await api('POST','/productos',data);
      productos.push(newP);
      stock.push({producto_id:newP.id,cantidad:0,...newP});
    }
    closeModal();renderProductos();renderStock();
    log('Producto guardado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function saveCliente(){
  const nombre=document.getElementById('f-cnombre').value.trim();
  if(!nombre){log('Introduce el nombre','warn');return;}
  const data={nombre,contacto:document.getElementById('f-ccontacto').value.trim(),telefono:document.getElementById('f-ctelefono').value.trim(),email:document.getElementById('f-cemail').value.trim(),direccion:document.getElementById('f-cdir').value.trim()};
  try{
    if(editId){
      const updated=await api('PUT','/clientes/'+editId,data);
      Object.assign(clientes.find(x=>String(x.id)===String(editId)),updated);
    }else{
      clientes.push(await api('POST','/clientes',data));
    }
    closeModal();renderClientes();
    log('Cliente guardado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

// ── DELETES ────────────────────────────────────────────────────────────────────
async function deletePedido(id){
  if(!confirm('¿Eliminar este pedido?')) return;
  try{
    await api('DELETE','/pedidos-gav/'+id);
    pedidos=pedidos.filter(p=>String(p.id)!==String(id));
    await loadAll();
    log('Pedido eliminado');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function deleteProducto(id,ref){
  const nombre=ref||productos.find(p=>String(p.id)===String(id))?.referencia||'este producto';
  if(!confirm('¿Eliminar '+nombre+'?')) return;
  try{
    await api('PUT','/productos/'+id,{...productos.find(p=>String(p.id)===String(id)),activo:false});
    productos=productos.filter(p=>String(p.id)!==String(id));
    stock=stock.filter(s=>String(s.producto_id)!==String(id));
    renderProductos();renderStock();
    await loadAll();
    log(nombre+' eliminado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function deleteCliente(id){
  if(!confirm('¿Eliminar este cliente?')) return;
  try{
    await api('DELETE','/clientes/'+id);
    clientes=clientes.filter(c=>String(c.id)!==String(id));
    renderClientes();
    log('Cliente eliminado');
  }catch(e){log('Error: '+e.message,'warn');}
}

// ── ANULAR / REABRIR ──────────────────────────────────────────────────────────
async function anularEntrega(id){
  if(!confirm('Anular esta entrega? El stock se devolvera.')) return;
  try{
    await api('PATCH','/entregas/'+id+'/anular',{});
    await loadAll();
    log('Entrega anulada - stock devuelto','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function anularGrupo(idsArr){
  var ids=Array.isArray(idsArr)?idsArr:String(idsArr).split(',').map(x=>x.trim()).filter(Boolean);
  if(!confirm('Anular todas las entregas de esta carga? El stock se devolvera.')) return;
  try{
    for(var i=0;i<ids.length;i++) await api('PATCH','/entregas/'+ids[i]+'/anular',{});
    await loadAll();
    log('Carga anulada - stock devuelto','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function reabrirParte(id){
  if(!confirm('Reabrir este parte? El stock fabricado ese dia se descontara.')) return;
  try{
    await api('PATCH','/partes/'+id+'/reabrir',{});
    await loadAll();
    if(parteHoy) renderParte(parteHoy);
    loadHistorialPartes();
    log('Parte reabierto - stock ajustado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function reactivarPedido(id){
  if(!confirm('Reactivar este pedido?')) return;
  try{
    await api('PATCH','/pedidos-gav/'+id+'/estado',{estado:'pendiente'});
    await loadAll();
    loadHistorial();
    log('Pedido reactivado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

