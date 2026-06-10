// ── CALENDARIO ─────────────────────────────────────────────────────────────────
// Clave de carga = el id de la carga programada (carga_grupo_id). Cada carga es
// independiente, aunque sea del mismo pedido y el mismo día. Las líneas antiguas
// sin grupo se quedan como su propia carga (SOLO_{id}).
function claveCarga(e){ return e.carga_grupo_id ? String(e.carga_grupo_id) : 'SOLO_'+e.id; }
function lineasDeCarga(grupoId){ return entregas.filter(function(e){ return claveCarga(e)===grupoId; }); }

// Agrupa una lista de entregas por carga. Mantiene el orden.
function agruparCargas(lista){
  var grupos={}, orden=[];
  lista.forEach(function(e){
    var key=claveCarga(e);
    if(!grupos[key]){
      grupos[key]={
        grupo_id:key,
        fecha:String(e.fecha_carga).substring(0,10),
        pedido_numero:e.pedido_numero,
        cliente_nombre:e.cliente_nombre,
        obra:e.obra,
        transportista:e.transportista,
        mat_camion:e.mat_camion,
        mat_remolque:e.mat_remolque,
        lineas:[]
      };
      orden.push(key);
    }
    grupos[key].lineas.push(e);
  });
  return orden.map(function(k){return grupos[k];});
}

function renderCal(){
  document.getElementById('cal-title').textContent=MESES[calM]+' '+calY;
  const first=new Date(calY,calM,1);
  const startDow=(first.getDay()+6)%7;
  const dim=new Date(calY,calM+1,0).getDate();
  const today=new Date();
  const mesStr=calY+'-'+String(calM+1).padStart(2,'0');

  let html=DOWS.map(d=>'<div class="cal-dow">'+d+'</div>').join('');
  for(let i=0;i<startDow;i++) html+='<div class="cal-day other"></div>';
  for(let d=1;d<=dim;d++){
    const ds=mesStr+'-'+String(d).padStart(2,'0');
    const isToday=today.getFullYear()===calY&&today.getMonth()===calM&&today.getDate()===d;
    const dayEntregas=entregas.filter(e=>e.fecha_carga&&String(e.fecha_carga).substring(0,10)===ds);
    const hasCargas=dayEntregas.length>0;
    html+='<div class="cal-day'+(isToday?' today':'')+(hasCargas?' has-cargas':'')+'"'+(hasCargas?' onclick="showDayCargas(\''+ds+'\')"':'')+'>'+
      '<div class="cal-dn">'+d+'</div>'+
      (function(){
        var gruposDia=agruparCargas(dayEntregas);
        return gruposDia.slice(0,3).map(function(g){
          var todasConf=g.lineas.every(function(e){return e.estado==='confirmada';});
          var totG=g.lineas.reduce(function(s,e){return s+(+e.cantidad||0);},0);
          var col=todasConf?'background:#e6f5ea;color:#2d7a3a':'background:#fff3e0;color:#8a5200';
          return '<span class="cal-chip" style="'+col+'">'+g.pedido_numero+' ('+fmtN(totG)+')</span>';
        }).join('')+
        (gruposDia.length>3?'<span class="cal-chip" style="background:var(--surface2);color:var(--text2)">+'+(gruposDia.length-3)+' más</span>':'');
      })()+
    '</div>';
  }
  document.getElementById('cal-grid').innerHTML=html;

  const mesCargas=entregas.filter(e=>e.fecha_carga&&String(e.fecha_carga).substring(0,7)===mesStr);
  document.getElementById('cal-count').textContent=mesCargas.length;
  const cl=document.getElementById('cal-list');
  if(!mesCargas.length){cl.innerHTML='<div class="empty"><i class="ti ti-calendar"></i><p>Sin cargas este mes</p></div>';return;}

  // Agrupa por pedido + fecha (misma lógica que el resto del calendario)
  const gruposOrdenados=agruparCargas(mesCargas).sort((a,b)=>a.fecha>b.fecha?1:-1);
  document.getElementById('cal-count').textContent=gruposOrdenados.length;

  cl.innerHTML=gruposOrdenados.map(g=>{
    const totalUds=g.lineas.reduce((s,e)=>s+(+e.cantidad||0),0);
    const todasConfirmadas=g.lineas.every(e=>e.estado==='confirmada');
    const algunaPendiente=g.lineas.some(e=>e.estado==='pendiente');
    const idsPendientes=g.lineas.filter(e=>e.estado==='pendiente').map(e=>e.id);
    // Summary of references
    const resumen=g.lineas.map(e=>e.referencia+(dimStr(e)?' ('+dimStr(e)+')':'')+': '+fmtN(e.cantidad)+' ud').join(' · ');
    const transInfo=(g.transportista||g.mat_camion)?
      '<div style="font-size:10px;color:var(--text2);margin-top:2px">'+
        (g.transportista?'<i class="ti ti-truck" style="font-size:10px"></i> '+g.transportista:'')+ 
        (g.mat_camion?' · <span style="font-family:monospace">'+g.mat_camion+'</span>':'')+
        (g.mat_remolque?' / <span style="font-family:monospace">'+g.mat_remolque+'</span>':'')+
      '</div>':'';
    // Fecha editable (only if any pending — change all lines of this group)
    const fechaInput=algunaPendiente
      ?'<input type="date" value="'+g.fecha+'" title="Cambiar fecha de toda la carga" style="font-size:11px;padding:2px 6px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2);color:var(--text)" onchange="cambiarFechaGrupo(['+idsPendientes.join(',')+'],this.value)">'
      :'<span class="dim mono" style="font-size:11px">'+fmtD(g.fecha)+'</span>';

    return '<div class="entrega-row" style="align-items:flex-start;padding:10px 16px">'+
      '<div style="flex:0 0 85px">'+fechaInput+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:500;font-size:13px">'+g.pedido_numero+
          (g.cliente_nombre?' <span class="dim">— '+g.cliente_nombre+'</span>':'')+
          (g.obra?' <span class="badge b-steel" style="font-size:9px">'+g.obra+'</span>':'')+
        '</div>'+
        '<div style="font-size:11px;color:var(--text2);margin-top:2px">'+resumen+'</div>'+transInfo+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">'+
        '<span style="font-family:monospace;font-weight:500;font-size:13px">'+fmtN(totalUds)+' ud</span>'+
        '<span class="badge '+(todasConfirmadas?'b-green':'b-amber')+'">'+( todasConfirmadas?'Confirmada':'Pendiente')+'</span>'+
        (algunaPendiente
          ?'<button class="btn btn-green btn-sm" onclick="confirmarGrupo(['+idsPendientes.join(',')+'])"><i class="ti ti-check"></i> Confirmar</button>'
          :'')+
        (todasConfirmadas
          ?'<button class="btn btn-outline btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="anularGrupo(['+g.lineas.map(function(e){return e.id;}).join(',')+'])"><i class="ti ti-arrow-back-up"></i> Anular</button>'
          :'')+
        '<button class="btn-icon" style="color:var(--blue)" data-gid="'+g.grupo_id+'" onclick="enviarACarga(this.dataset.gid)" title="Enviar a carga (cargador)"><i class="ti ti-clipboard-check"></i></button>'+
        '<button class="btn-icon" data-gid="'+g.grupo_id+'" onclick="verDetalleGrupo(this.dataset.gid)" title="Ver detalle / Editar"><i class="ti ti-eye"></i></button>'+
        '<button class="btn-icon" data-gid="'+g.grupo_id+'" onclick="imprimirCargaGrupoById(this.dataset.gid)" title="Imprimir esta carga"><i class="ti ti-printer"></i></button>'+
        (algunaPendiente?'<button class="btn-icon" data-gid="'+g.grupo_id+'" onclick="editarGrupo(this.dataset.gid)" title="Editar carga"><i class="ti ti-pencil"></i></button>':'')+ 
        '<button class="btn-icon danger" data-ids="'+g.lineas.map(e=>e.id).join(',')+'" onclick="deleteGrupoById(this.dataset.ids)" title="Eliminar carga"><i class="ti ti-trash"></i></button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function calMove(d){
  if(d<0){if(calM===0){calM=11;calY--;}else calM--;}
  else{if(calM===11){calM=0;calY++;}else calM++;}
  renderCal();
}

function showDayCargas(fecha){
  const dayEntregas=entregas.filter(e=>e.fecha_carga&&String(e.fecha_carga).substring(0,10)===fecha);
  const gruposDia=agruparCargas(dayEntregas);
  const box=document.getElementById('modal-box');
  box.className='modal';
  document.getElementById('modal-title').innerHTML='<i class="ti ti-calendar"></i> Cargas del '+fmtD(fecha);
  document.getElementById('modal-body').innerHTML=
    '<table class="tbl"><thead><tr><th>Pedido</th><th>Referencias</th><th class="r">Uds.</th><th>Estado</th><th></th></tr></thead><tbody>'+
    gruposDia.map(function(g){
      var totG=g.lineas.reduce(function(s,e){return s+(+e.cantidad||0);},0);
      var todasConf=g.lineas.every(function(e){return e.estado==='confirmada';});
      var algunaPend=g.lineas.some(function(e){return e.estado==='pendiente';});
      var idsPend=g.lineas.filter(function(e){return e.estado==='pendiente';}).map(function(e){return e.id;});
      var n=g.lineas.length;
      return '<tr>'+
        '<td><div style="font-weight:500">'+g.pedido_numero+'</div><div class="dim">'+(g.cliente_nombre||'')+(g.obra?' · '+g.obra:'')+'</div></td>'+
        '<td><span class="dim">'+n+' '+(n===1?'referencia':'referencias')+'</span></td>'+
        '<td class="r mono">'+fmtN(totG)+'</td>'+
        '<td><span class="badge '+(todasConf?'b-green':'b-amber')+'">'+(todasConf?'Confirmada':'Pendiente')+'</span></td>'+
        '<td style="display:flex;gap:4px;align-items:center">'+
          '<button class="btn-icon" data-gid="'+g.grupo_id+'" onclick="verDetalleGrupo(this.dataset.gid)" title="Ver detalle / líneas"><i class="ti ti-eye"></i></button>'+
          '<button class="btn-icon" data-gid="'+g.grupo_id+'" onclick="imprimirCargaGrupoById(this.dataset.gid)" title="Imprimir esta carga"><i class="ti ti-printer"></i></button>'+
          (algunaPend?'<button class="btn btn-green btn-sm" onclick="confirmarGrupo(['+idsPend.join(',')+']);closeModal()"><i class="ti ti-check"></i> Confirmar</button>':'')+
        '</td>'+
      '</tr>';
    }).join('')+'</tbody></table>';
  document.getElementById('modal-foot').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cerrar</button>';
  document.getElementById('overlay').classList.add('open');
}

function editarGrupo(grupoId){
  // Show ALL lineas (pending + confirmed) so user can see full picture and edit pending ones
  // Find by grupo_id, fallback to legacy fecha+pedido key
  // Todas las líneas de esta carga (mismo pedido + misma fecha)
  var todasLineas=lineasDeCarga(grupoId);
  const lineasPend=todasLineas.filter(e=>e.estado==='pendiente');
  const lineasConf=todasLineas.filter(e=>e.estado==='confirmada');
  if(!todasLineas.length){log('No hay líneas en esta carga','warn');return;}

  const box=document.getElementById('modal-box');
  box.className='modal wide';
  document.getElementById('overlay').classList.add('open');
  editId=null; modalType='editarGrupo';

  // Use data from first pending line if available, else confirmed
  const ref=lineasPend.length?lineasPend[0]:todasLineas[0];
  const trans=ref.transportista||'';
  const matC=ref.mat_camion||'';
  const matR=ref.mat_remolque||'';
  const hayPendientes=lineasPend.length>0;

  var fecha=todasLineas.length?String(todasLineas[0].fecha_carga).substring(0,10):'';
  var pedidoNum=todasLineas.length?todasLineas[0].pedido_numero:'';
  document.getElementById('modal-title').innerHTML=
    '<i class="ti ti-box"></i> '+pedidoNum+
    (ref.cliente_nombre?' — '+ref.cliente_nombre:'')+
    (ref.obra?' <span style="background:rgba(255,255,255,.15);padding:1px 8px;border-radius:10px;font-size:11px">'+ref.obra+'</span>':'')+
    ' · '+fmtD(fecha);

  var bodyHTML=
    '<div class="frow3">'+
      '<div class="field"><label>Transportista</label><input type="text" id="eg-trans" value="'+trans+'" placeholder="Nombre transportista" '+(hayPendientes?'':'readonly style="opacity:.6"')+'></div>'+
      '<div class="field"><label>Matrícula camión</label><input type="text" id="eg-matc" value="'+matC+'" placeholder="0000 AAA" style="font-family:monospace'+(hayPendientes?'':';opacity:.6')+'" '+(hayPendientes?'':'readonly')+'></div>'+
      '<div class="field"><label>Matrícula remolque</label><input type="text" id="eg-matr" value="'+matR+'" placeholder="0000 AAA" style="font-family:monospace'+(hayPendientes?'':';opacity:.6')+'" '+(hayPendientes?'':'readonly')+'></div>'+
    '</div>'+
    '<div class="frow">'+
      '<div class="field"><label>Fecha de carga</label><input type="date" id="eg-fecha" value="'+fecha+'" '+(hayPendientes?'':'readonly style="opacity:.6"')+'></div>'+
      '<div class="field"><label>Notas</label><input type="text" id="eg-notas" value="'+(ref.notas||'')+'" placeholder="Observaciones..." '+(hayPendientes?'':'readonly style="opacity:.6"')+'></div>'+
    '</div>'+
    '<div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:8px;padding-top:4px;border-top:1px solid var(--border)">Referencias de esta carga</div>'+
    '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px">'+
    '<thead><tr style="background:var(--surface2)">'+
      '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)">Producto</th>'+
      '<th style="padding:7px 10px;text-align:right;border-bottom:1px solid var(--border)">Pedido total</th>'+
      '<th style="padding:7px 10px;text-align:right;border-bottom:1px solid var(--border)">Entregado</th>'+
      '<th style="padding:7px 10px;text-align:right;border-bottom:1px solid var(--border)">Esta carga</th>'+
      '<th style="padding:7px 10px;text-align:center;border-bottom:1px solid var(--border)">Estado</th>'+
      '<th style="padding:7px 10px;text-align:center;border-bottom:1px solid var(--border)">Acciones</th>'+
    '</tr></thead><tbody>';

  todasLineas.forEach(function(e){
    var ped=pedidos.find(function(p){return p.numero===e.pedido_numero;});
    var lin=ped?(ped.lineas||[]).find(function(l){return String(l.id)===String(e.linea_pedido_id);}):null;
    var entregado=lin?(lin.entregas||[]).filter(function(ent){return ent.estado==='confirmada';}).reduce(function(s,ent){return s+(+ent.cantidad||0);},0):0;
    var totalPed=lin?+lin.cantidad:0;
    var isPend=e.estado==='pendiente';
    bodyHTML+=
      '<tr style="border-bottom:1px solid var(--border);background:'+(isPend?'var(--surface)':'var(--green-l)')+'">'+
        '<td style="padding:8px 10px;max-width:320px">'+
          '<div style="font-weight:500;color:var(--blue-d);font-family:monospace;font-size:12px">'+e.referencia+'</div>'+
          '<div style="font-size:12px;color:var(--text2);white-space:normal;line-height:1.3">'+(e.descripcion||dimStr(e))+'</div>'+
        '</td>'+
        '<td style="padding:8px 10px;text-align:right;font-family:monospace">'+fmtN(totalPed)+'</td>'+
        '<td style="padding:8px 10px;text-align:right;font-family:monospace;color:var(--green)">'+fmtN(entregado)+'</td>'+
        '<td style="padding:8px 10px;text-align:right">'+
          (isPend
            ?'<input type="number" data-entrega-id="'+e.id+'" value="'+e.cantidad+'" min="0" style="width:80px;font-size:13px;font-family:monospace;text-align:right;padding:4px 7px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2)">'
            :'<span style="font-family:monospace;font-weight:500;color:var(--green)">'+fmtN(e.cantidad)+'</span>')+
        '</td>'+
        '<td style="padding:8px 10px;text-align:center">'+
          '<span class="badge '+(isPend?'b-amber':'b-green')+'">'+(isPend?'Pendiente':'Confirmada')+'</span>'+
        '</td>'+
        '<td style="padding:8px 10px;text-align:center">'+
          '<div style="display:flex;gap:4px;justify-content:center">'+
            '<button class="btn-icon" data-eid="'+e.id+'" onclick="imprimirEntregaDesdeModal(this.dataset.eid)" title="Imprimir hoja"><i class="ti ti-printer"></i></button>'+
            (isPend
              ?'<button class="btn-icon" style="color:var(--green)" onclick="confirmarEntrega('+e.id+')" title="Confirmar"><i class="ti ti-check"></i></button>'+
               '<button class="btn-icon danger" onclick="deleteEntregaById('+e.id+')" title="Eliminar"><i class="ti ti-trash"></i></button>'
              :'<button class="btn-icon" style="color:var(--amber)" onclick="anularEntrega('+e.id+')" title="Anular"><i class="ti ti-arrow-back-up"></i></button>')+
          '</div>'+
        '</td>'+
      '</tr>';
  });

  bodyHTML+='</tbody></table>';
  document.getElementById('modal-body').innerHTML=bodyHTML;

  var footHTML='<button class="btn btn-outline btn-sm" data-gid="'+grupoId+'" onclick="imprimirCargaGrupoDesdeModal(this.dataset.gid)"><i class="ti ti-printer"></i> Imprimir todo</button>';
  if(hayPendientes){
    footHTML+='<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>'+
              '<button class="btn btn-primary" onclick="guardarEdicionGrupo()"><i class="ti ti-device-floppy"></i> Guardar cambios</button>';
  } else {
    footHTML+='<button class="btn btn-outline" onclick="closeModal()">Cerrar</button>';
  }
  document.getElementById('modal-foot').innerHTML=footHTML;
}

async function guardarEdicionGrupo(){
  const trans=document.getElementById('eg-trans').value.trim();
  const matC=document.getElementById('eg-matc').value.trim();
  const matR=document.getElementById('eg-matr').value.trim();
  const fecha=document.getElementById('eg-fecha').value;
  const notas=document.getElementById('eg-notas').value.trim();
  if(!fecha){log('La fecha es obligatoria','warn');return;}
  const inputs=document.querySelectorAll('[data-entrega-id]');
  try{
    for(const inp of inputs){
      const id=inp.dataset.entregaId;
      const cant=parseFloat(inp.value)||0;
      const e=entregas.find(x=>String(x.id)===String(id));
      if(!e) continue;
      const updated=await api('PUT','/entregas/'+id,{
        fecha_carga:fecha, cantidad:cant, estado:e.estado,
        transportista:trans, mat_camion:matC, mat_remolque:matR, notas,
        carga_grupo_id:e.carga_grupo_id
      });
      Object.assign(e,updated);
    }
    await loadAll();
    closeModal();
    log('Carga actualizada','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

function imprimirEntregaDesdeModal(entregaId){
  // Read transport fields from the modal form (user may have just typed them)
  var trans=document.getElementById('eg-trans')?.value.trim()||null;
  var matC=document.getElementById('eg-matc')?.value.trim()||null;
  var matR=document.getElementById('eg-matr')?.value.trim()||null;
  var fecha=document.getElementById('eg-fecha')?.value||null;
  var notas=document.getElementById('eg-notas')?.value.trim()||null;
  // Find entrega and override with form values
  var e=entregas.find(function(x){return String(x.id)===String(entregaId);});
  if(!e){log('Entrega no encontrada','warn');return;}
  // Build a copy with the form's current values taking priority
  var eCopy=Object.assign({},e,{
    transportista: trans!==null ? trans : e.transportista,
    mat_camion:    matC!==null  ? matC  : e.mat_camion,
    mat_remolque:  matR!==null  ? matR  : e.mat_remolque,
    fecha_carga:   fecha        ? fecha : e.fecha_carga,
    notas:         notas!==null ? notas : e.notas
  });
  imprimirEntregaUnicaObj(eCopy);
}

function imprimirEntregaUnica(entregaId){
  var e=entregas.find(function(x){return String(x.id)===String(entregaId);});
  if(!e){log('Entrega no encontrada','warn');return;}
  imprimirEntregaUnicaObj(e);
}

