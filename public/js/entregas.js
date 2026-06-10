// ── QR GENERATOR ────────────────────────────────────────────────────────────
function makeQRDataUri(text,size){
  try{
    var div=document.createElement('div');
    div.style.cssText='position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(div);
    new QRCode(div,{text:text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M});
    var canvas=div.querySelector('canvas');
    var img=div.querySelector('img');
    var uri=canvas?canvas.toDataURL('image/png'):(img?img.src:'');
    document.body.removeChild(div);
    return uri;
  }catch(e){return '';}
}
async function ensureQR(){
  if(window.QRCode)return;
  await new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload=res;s.onerror=rej;
    document.head.appendChild(s);
  });
}

function imprimirEntregaUnicaObj(e){
  var conf=e.estado==='confirmada';
  var inner='';

  // Header band
  inner+='<div class="hdr-band">'+
    '<div class="hdr-left">'+
      '<div class="label">Hoja de Carga</div>'+
      '<div class="pedido">'+e.referencia+'</div>'+
      '<div class="sub">'+(dimStr(e)||e.descripcion||'')+'</div>'+
    '</div>'+
    '<div class="hdr-right">'+
      '<div class="fecha">'+fmtD(e.fecha_carga)+'</div>'+
      '<div class="cliente">'+e.pedido_numero+(e.cliente_nombre?' — '+e.cliente_nombre:'')+'</div>'+
      (e.obra?'<div style="font-size:11px;opacity:.7;margin-top:2px">'+e.obra+'</div>':'')+
      '<div style="margin-top:8px"><span style="background:'+(conf?'rgba(255,255,255,.25)':'rgba(255,255,255,.15)')+';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">'+(conf?'✓ Confirmada':'Pendiente')+'</span></div>'+
    '</div>'+
  '</div>';

  // Transport bar
  if(e.transportista||e.mat_camion||e.mat_remolque){
    inner+='<div class="trans-bar">';
    if(e.transportista) inner+='<div class="trans-item"><div class="tl">Transportista</div><div class="tv">'+e.transportista+'</div></div>';
    if(e.mat_camion) inner+='<div class="trans-item"><div class="tl">Matricula camion</div><div class="tv">'+e.mat_camion+'</div></div>';
    if(e.mat_remolque) inner+='<div class="trans-item"><div class="tl">Matricula remolque</div><div class="tv">'+e.mat_remolque+'</div></div>';
    inner+='</div>';
  }

  // Big quantity block
  inner+='<div class="single-qty" style="margin-top:20px">'+
    '<div class="sq-label">Unidades a cargar</div>'+
    '<div class="sq-num">'+fmtN(e.cantidad)+'</div>'+
    '<div class="sq-ref">'+e.referencia+'</div>'+
    (dimStr(e)?'<div class="sq-dim">'+dimStr(e)+'</div>':'')+
  '</div>';

  // Checklist row (single item)
  inner+='<table class="chk-table">'+
    '<thead><tr>'+
      '<th>Referencia / Dimensiones</th>'+
      '<th class="r">Uds.</th>'+
      '<th class="c">Cargado ✓</th>'+
    '</tr></thead>'+
    '<tbody>'+
      '<tr>'+
        '<td class="ref-cell"><div class="ref-big">'+e.referencia+'</div><div class="ref-dim">'+(dimStr(e)||e.descripcion||'')+'</div>'+(e.linea_notas?'<div style="font-size:12px;color:#b45309;margin-top:4px;font-weight:600">⚠ '+e.linea_notas+'</div>':'')+'</td>'+
        '<td class="qty-cell">'+fmtN(e.cantidad)+'</td>'+
        '<td class="chk-cell"><div class="chk-box'+(conf?' done':'')+'"></div></td>'+
      '</tr>'+
      '<tr class="total-row">'+
        '<td class="ref-cell" style="font-size:12px">TOTAL</td>'+
        '<td class="qty-cell">'+fmtN(e.cantidad)+'</td>'+
        '<td></td>'+
      '</tr>'+
    '</tbody></table>';

  if(e.notas) inner+='<div class="notes-box"><strong>Notas:</strong> '+e.notas+'</div>';

  inner+='<div class="sig-row">'+
    '<div class="sig-box"><div class="sig-label">Firma carretillero</div><div class="sig-name"></div></div>'+
    '<div class="sig-box"><div class="sig-label">Firma transportista</div><div class="sig-name"></div></div>'+
  '</div>';

  inner+='<div class="doc-footer">'+e.pedido_numero+' · '+fmtD(e.fecha_carga)+' · GavControl · '+new Date().toLocaleString('es-ES')+'</div>';

  var css='*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a2e;font-size:13px}@media print{@page{margin:1.2cm;size:A4}body{padding:0}}.page{max-width:720px;margin:0 auto;padding:28px 24px}.hdr-band{background:#0d4f7a;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:flex-start}.hdr-left .label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;margin-bottom:4px}.hdr-left .pedido{font-size:22px;font-weight:700;letter-spacing:.02em}.hdr-left .sub{font-size:12px;opacity:.8;margin-top:3px}.hdr-right{text-align:right}.hdr-right .fecha{font-size:26px;font-weight:700}.hdr-right .cliente{font-size:12px;opacity:.8;margin-top:3px}.trans-bar{background:#1e3a5f;color:#fff;padding:10px 20px;display:flex;gap:24px;margin-bottom:0}.trans-item .tl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-bottom:2px}.trans-item .tv{font-size:13px;font-weight:600;font-family:monospace;letter-spacing:.05em}.chk-table{width:100%;border-collapse:collapse;margin-bottom:16px}.chk-table thead tr{background:#0d4f7a}.chk-table th{padding:10px 14px;text-align:left;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.chk-table th.r{text-align:right}.chk-table th.c{text-align:center}.chk-table td{padding:0;border-bottom:1px solid #e5e7eb;vertical-align:middle}.chk-table tbody tr:nth-child(even) td{background:#f8fafc}.ref-cell{padding:12px 14px}.ref-big{font-size:16px;font-weight:700;font-family:monospace;color:#0d4f7a}.ref-dim{font-size:11px;color:#6b7280;margin-top:2px}.qty-cell{padding:12px 14px;text-align:right;font-size:22px;font-weight:700;font-family:monospace;color:#1a1a2e;width:80px}.chk-cell{padding:12px 14px;text-align:center;width:56px}.chk-box{width:28px;height:28px;border:2.5px solid #0d4f7a;border-radius:5px;margin:0 auto;display:flex;align-items:center;justify-content:center}.chk-box.done{background:#e6f5ea;border-color:#2d7a3a}.chk-box.done::after{content:"checkmark";font-size:18px;font-weight:700;color:#2d7a3a}.total-row td{background:#1e3a5f!important;color:#fff;padding:10px 14px;font-weight:700}.total-row .qty-cell{font-size:24px;color:#fff}.notes-box{background:#fff8e6;border-left:4px solid #f59e0b;padding:10px 14px;font-size:12px;color:#78350f;margin-bottom:16px;border-radius:0 6px 6px 0}.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px}.sig-box{border-top:2px solid #334155;padding-top:10px}.sig-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:36px;text-align:center}.sig-name{border-bottom:1px solid #94a3b8;margin-top:8px;height:24px}.doc-footer{margin-top:18px;font-size:9px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}.single-qty{text-align:center;padding:24px;border:3px solid #0d4f7a;border-radius:12px;margin:20px 0}.single-qty .sq-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:10px}.single-qty .sq-num{font-size:80px;font-weight:900;font-family:monospace;color:#0d4f7a;line-height:1}.single-qty .sq-ref{font-size:20px;font-weight:700;color:#334155;margin-top:8px}.single-qty .sq-dim{font-size:14px;color:#6b7280;margin-top:4px}';

  var blob=new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+e.referencia+' — '+fmtD(e.fecha_carga)+'</title><style>'+css+'</style></head><body><div class="page">'+inner+'</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script></body></html>'],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},10000);
}


function imprimirCargaGrupoDesdeModal(grupoId){
  var trans=document.getElementById('eg-trans')?.value.trim()||null;
  var matC=document.getElementById('eg-matc')?.value.trim()||null;
  var matR=document.getElementById('eg-matr')?.value.trim()||null;
  var fecha=document.getElementById('eg-fecha')?.value||null;
  var notas=document.getElementById('eg-notas')?.value.trim()||null;
  var lineas=lineasDeCarga(grupoId);
  if(!lineas.length){log('No hay lineas','warn');return;}
  // Override transport fields from the form
  var lineasConDatos=lineas.map(function(e){
    return Object.assign({},e,{
      transportista: trans!==null ? trans : e.transportista,
      mat_camion:    matC!==null  ? matC  : e.mat_camion,
      mat_remolque:  matR!==null  ? matR  : e.mat_remolque,
      fecha_carga:   fecha        ? fecha : e.fecha_carga,
      notas:         notas!==null ? notas : e.notas
    });
  });
  var f=String(lineasConDatos[0].fecha_carga).substring(0,10);
  var ped=lineasConDatos[0].pedido_numero;
  imprimirCargaGrupo(f, ped, lineasConDatos);
}

function imprimirCargaGrupoById(grupoId){
  var lineas=lineasDeCarga(grupoId);
  if(!lineas.length){log('No hay lineas en esta carga','warn');return;}
  var fecha=String(lineas[0].fecha_carga).substring(0,10);
  var pedidoNum=lineas[0].pedido_numero;
  imprimirCargaGrupo(fecha, pedidoNum, lineas);
}

async function imprimirCargaGrupo(fecha, pedidoNum, lineasParam){
  var lineas=lineasParam||entregas.filter(function(e){return String(e.fecha_carga).substring(0,10)===fecha&&e.pedido_numero===pedidoNum;});
  if(!lineas.length){log('No hay lineas en esta carga','warn');return;}
  // Load QR lib for maps links
  var hasQR=lineas.some(function(e){ return e.maps_url; });
  if(hasQR) await ensureQR();
  var ref=lineas[0];
  var totalUds=lineas.reduce(function(s,e){return s+(+e.cantidad||0);},0);
  var conf=lineas.every(function(e){return e.estado==='confirmada';});
  var inner='';

  // Header band
  inner+='<div class="hdr-band">'+
    '<div class="hdr-left">'+
      '<div class="label">Orden de Carga</div>'+
      '<div class="pedido">'+pedidoNum+'</div>'+
      (ref.obra?'<div class="sub">'+ref.obra+'</div>':'')+
    '</div>'+
    '<div class="hdr-right">'+
      '<div class="fecha">'+fmtD(fecha)+'</div>'+
      (ref.cliente_nombre?'<div class="cliente">'+ref.cliente_nombre+'</div>':'')+
      '<div style="margin-top:8px"><span style="background:'+(conf?'rgba(255,255,255,.25)':'rgba(255,255,255,.15)')+';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">'+(conf?'✓ Confirmada':'Pendiente')+'</span></div>'+
    '</div>'+
  '</div>';

  // Transport bar
  if(ref.transportista||ref.mat_camion||ref.mat_remolque){
    inner+='<div class="trans-bar">';
    if(ref.transportista) inner+='<div class="trans-item"><div class="tl">Transportista</div><div class="tv">'+ref.transportista+'</div></div>';
    if(ref.mat_camion) inner+='<div class="trans-item"><div class="tl">Matricula camion</div><div class="tv">'+ref.mat_camion+'</div></div>';
    if(ref.mat_remolque) inner+='<div class="trans-item"><div class="tl">Matricula remolque</div><div class="tv">'+ref.mat_remolque+'</div></div>';
    inner+='</div>';
  }

  // KPI row
  inner+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e5e7eb;margin:18px 0">'+
    '<div style="background:#f8fafc;padding:12px 14px;text-align:center"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:4px">Referencias</div><div style="font-size:20px;font-weight:700;font-family:monospace;color:#0d4f7a">'+lineas.length+'</div></div>'+
    '<div style="background:#f8fafc;padding:12px 14px;text-align:center"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:4px">Total unidades</div><div style="font-size:28px;font-weight:900;font-family:monospace;color:#0d4f7a">'+fmtN(totalUds)+'</div></div>'+
    '<div style="background:#f8fafc;padding:12px 14px;text-align:center"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:4px">Fecha</div><div style="font-size:20px;font-weight:700;font-family:monospace;color:#0d4f7a">'+fmtD(fecha)+'</div></div>'+
  '</div>';

  // QR block above table — centered, one per unique pedido with maps_url
  var qrBlock='';
  var pedidosConQR=[];
  lineas.forEach(function(e){
    if(e.maps_url&&!pedidosConQR.find(function(x){return x.url===e.maps_url;})){
      pedidosConQR.push({url:e.maps_url,pedido:e.pedido_numero});
    }
  });
  if(window.QRCode&&pedidosConQR.length){
    qrBlock='<div style="text-align:center;margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc">';
    qrBlock+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;margin-bottom:12px">Dirección de descarga</div>';
    qrBlock+='<div style="display:flex;justify-content:center;gap:24px">';
    pedidosConQR.forEach(function(x){
      var qrUri=makeQRDataUri(x.url,110);
      if(qrUri){
        qrBlock+='<div style="text-align:center">';
        qrBlock+='<img src="'+qrUri+'" width="100" height="100" style="display:block;margin:0 auto">';
        if(pedidosConQR.length>1) qrBlock+='<div style="font-size:10px;color:#6b7280;margin-top:4px;font-family:monospace">'+x.pedido+'</div>';
        qrBlock+='</div>';
      }
    });
    qrBlock+='</div></div>';
    inner+=qrBlock;
  }

  // Checklist table
  inner+='<table class="chk-table">'+
    '<thead><tr>'+
      '<th style="width:40px;text-align:center">#</th>'+
      '<th>Referencia</th>'+
      '<th>Dimensiones</th>'+
      '<th class="r">Uds.</th>'+
      '<th class="c">Cargado ✓</th>'+
    '</tr></thead><tbody>';

  lineas.forEach(function(e,i){
    var isConf=e.estado==='confirmada';
    inner+='<tr>'+
      '<td style="padding:10px 14px;text-align:center;font-size:12px;color:#6b7280;font-weight:600">'+(i+1)+'</td>'+
      '<td class="ref-cell"><div class="ref-big">'+e.referencia+'</div></td>'+
      '<td class="ref-cell"><div class="ref-dim" style="font-size:12px">'+(dimStr(e)||'—')+'</div>'+(e.linea_notas?'<div style="font-size:11px;color:#b45309;margin-top:3px;font-weight:600">⚠ '+e.linea_notas+'</div>':'')+'</td>'+
      '<td class="qty-cell" style="font-size:26px">'+fmtN(e.cantidad)+'</td>'+
      '<td class="chk-cell"><div class="chk-box'+(isConf?' done':'')+'"></div></td>'+
    '</tr>';
  });

  inner+='<tr class="total-row">'+
    '<td style="padding:10px 14px"></td>'+
    '<td class="ref-cell" colspan="2" style="font-size:13px;letter-spacing:.05em">TOTAL</td>'+
    '<td class="qty-cell" style="font-size:28px;color:#fff">'+fmtN(totalUds)+'</td>'+
    '<td></td>'+
  '</tr></tbody></table>';

  if(ref.notas) inner+='<div class="notes-box"><strong>Notas:</strong> '+ref.notas+'</div>';

  inner+='<div class="sig-row">'+
    '<div class="sig-box"><div class="sig-label">Firma carretillero</div><div class="sig-name"></div></div>'+
    '<div class="sig-box"><div class="sig-label">Firma transportista</div><div class="sig-name"></div></div>'+
  '</div>';

  inner+='<div class="doc-footer">'+pedidoNum+' · '+fmtD(fecha)+' · GavControl · '+new Date().toLocaleString('es-ES')+'</div>';

  var css='*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a2e;font-size:13px}@media print{@page{margin:1.2cm;size:A4}body{padding:0}}.page{max-width:720px;margin:0 auto;padding:28px 24px}.hdr-band{background:#0d4f7a;color:#fff;padding:14px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:flex-start}.hdr-left .label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;opacity:.7;margin-bottom:4px}.hdr-left .pedido{font-size:22px;font-weight:700;letter-spacing:.02em}.hdr-left .sub{font-size:12px;opacity:.8;margin-top:3px}.hdr-right{text-align:right}.hdr-right .fecha{font-size:26px;font-weight:700}.hdr-right .cliente{font-size:12px;opacity:.8;margin-top:3px}.trans-bar{background:#1e3a5f;color:#fff;padding:10px 20px;display:flex;gap:24px;margin-bottom:0}.trans-item .tl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;opacity:.6;margin-bottom:2px}.trans-item .tv{font-size:13px;font-weight:600;font-family:monospace;letter-spacing:.05em}.chk-table{width:100%;border-collapse:collapse;margin-bottom:16px}.chk-table thead tr{background:#0d4f7a}.chk-table th{padding:10px 14px;text-align:left;color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}.chk-table th.r{text-align:right}.chk-table th.c{text-align:center}.chk-table td{padding:0;border-bottom:1px solid #e5e7eb;vertical-align:middle}.chk-table tbody tr:nth-child(even) td{background:#f8fafc}.ref-cell{padding:12px 14px}.ref-big{font-size:16px;font-weight:700;font-family:monospace;color:#0d4f7a}.ref-dim{font-size:11px;color:#6b7280;margin-top:2px}.qty-cell{padding:12px 14px;text-align:right;font-size:22px;font-weight:700;font-family:monospace;color:#1a1a2e;width:90px}.chk-cell{padding:12px 14px;text-align:center;width:60px}.chk-box{width:28px;height:28px;border:2.5px solid #0d4f7a;border-radius:5px;margin:0 auto}.chk-box.done{background:#e6f5ea;border-color:#2d7a3a;position:relative}.chk-box.done::after{content:"V";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:16px;font-weight:900;color:#2d7a3a}.total-row td{background:#1e3a5f!important;color:#fff;padding:10px 14px;font-weight:700}.notes-box{background:#fff8e6;border-left:4px solid #f59e0b;padding:10px 14px;font-size:12px;color:#78350f;margin-bottom:16px;border-radius:0 6px 6px 0}.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px}.sig-box{border-top:2px solid #334155;padding-top:10px}.sig-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:36px;text-align:center}.sig-name{border-bottom:1px solid #94a3b8;margin-top:8px;height:24px}.doc-footer{margin-top:18px;font-size:9px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}';

  var blob=new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orden Carga — '+pedidoNum+' '+fmtD(fecha)+'</title><style>'+css+'</style></head><body><div class="page">'+inner+'</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script></body></html>'],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},10000);
}


function imprimirCalendario(){
  // Build print-friendly HTML of all pending entregas grouped by date+pedido
  const pendientes=entregas.filter(e=>e.estado==='pendiente').sort((a,b)=>a.fecha_carga>b.fecha_carga?1:-1);
  if(!pendientes.length){log('No hay cargas pendientes para imprimir','warn');return;}

  const grupos={};
  pendientes.forEach(e=>{
    const key=String(e.fecha_carga).substring(0,10)+'__'+e.pedido_numero;
    if(!grupos[key]) grupos[key]={fecha:String(e.fecha_carga).substring(0,10),pedido_numero:e.pedido_numero,cliente_nombre:e.cliente_nombre,obra:e.obra,transportista:e.transportista,mat_camion:e.mat_camion,mat_remolque:e.mat_remolque,lineas:[]};
    grupos[key].lineas.push(e);
  });

  let html='<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#1a1a2e">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #334155;padding-bottom:12px;margin-bottom:16px">';
  html+='<div><div style="font-size:20px;font-weight:700">Plan de Cargas</div><div style="font-size:12px;color:#6b7280;margin-top:3px">Generado: '+new Date().toLocaleString('es-ES')+'</div></div>';
  html+='<div style="text-align:right"><div style="font-size:12px;color:#6b7280">'+Object.keys(grupos).length+' cargas programadas</div><div style="font-size:12px;color:#6b7280">'+fmtN(pendientes.reduce((s,e)=>s+(+e.cantidad||0),0))+' uds totales pendientes</div></div>';
  html+='</div>';

  Object.values(grupos).sort((a,b)=>a.fecha>b.fecha?1:-1).forEach(g=>{
    const totalUds=g.lineas.reduce((s,e)=>s+(+e.cantidad||0),0);
    html+='<div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">';
    html+='<div style="background:#334155;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">';
    html+='<div style="color:#fff"><span style="font-size:14px;font-weight:600">'+fmtD(g.fecha)+'</span>';
    html+=' <span style="font-size:13px;margin-left:10px">'+g.pedido_numero+'</span>';
    if(g.cliente_nombre) html+=' <span style="font-size:12px;color:#94a3b8">— '+g.cliente_nombre+'</span>';
    if(g.obra) html+=' <span style="font-size:11px;background:rgba(255,255,255,.15);padding:1px 7px;border-radius:10px;color:#e2e8f0">'+g.obra+'</span>';
    html+='</div>';
    html+='<div style="text-align:right;color:#fff;font-size:13px;font-weight:500">'+fmtN(totalUds)+' ud</div>';
    html+='</div>';
    if(g.transportista||g.mat_camion||g.mat_remolque){
      html+='<div style="background:#f8f9fb;padding:8px 14px;font-size:12px;color:#6b7280;display:flex;gap:20px;border-bottom:1px solid #e5e7eb">';
      if(g.transportista) html+='<span><i>🚛</i> '+g.transportista+'</span>';
      if(g.mat_camion) html+='<span>Camión: <strong style="font-family:monospace">'+g.mat_camion+'</strong></span>';
      if(g.mat_remolque) html+='<span>Remolque: <strong style="font-family:monospace">'+g.mat_remolque+'</strong></span>';
      html+='</div>';
    }
    html+='<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html+='<thead><tr style="background:#f1f5f9"><th style="padding:7px 14px;text-align:left;font-weight:500;color:#6b7280">Producto</th><th style="padding:7px 14px;text-align:left;font-weight:500;color:#6b7280">Dimensiones</th><th style="padding:7px 14px;text-align:right;font-weight:500;color:#6b7280">Uds. a cargar</th></tr></thead><tbody>';
    g.lineas.forEach(e=>{
      html+='<tr style="border-top:1px solid #e5e7eb"><td style="padding:8px 14px;font-weight:500">'+e.referencia+'</td><td style="padding:8px 14px;color:#6b7280">'+dimStr(e)+'</td><td style="padding:8px 14px;text-align:right;font-family:monospace;font-weight:700;font-size:14px">'+fmtN(e.cantidad)+'</td></tr>';
    });
    html+='</tbody></table>';
    html+='</div>';
  });
  html+='</div>';

  var blob=new Blob([
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Plan de Cargas</title>'+
    '<style>body{margin:0;padding:0;background:#fff}@media print{@page{margin:1.5cm;size:A4}}</style>'+
    '</head><body>'+html+
    '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>'+
    '</body></html>'
  ],{type:'text/html;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.target='_blank'; a.rel='noopener';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},10000);
}

async function confirmarGrupo(ids){
  var autoPedido=false, ok=0, fallos=0;
  for(var i=0;i<ids.length;i++){
    try{
      var r=await api('PATCH','/entregas/'+ids[i]+'/confirmar',{});
      if(r&&r.pedidoAutoEntregado) autoPedido=true;
      ok++;
    }catch(e){
      // Si ya estaba confirmada (p. ej. desde otra pestaña), no es un fallo
      // real: la contamos como hecha y seguimos con el resto del grupo.
      if(/ya confirmada/i.test(e.message)) ok++;
      else fallos++;
    }
  }
  await loadAll();
  if(fallos){
    log('Confirmadas '+ok+' entrega(s), '+fallos+' con error','warn');
  }else if(autoPedido){
    log('¡Pedido completamente entregado!','ok');
    mostrarToast('¡Pedido entregado al completo!','green');
  }else{
    log(ok+' entrega(s) confirmada(s) — stock actualizado','ok');
  }
}

async function cambiarFechaGrupo(ids, nuevaFecha){
  try{
    for(const id of ids){ await api('PATCH','/entregas/'+id+'/fecha',{fecha_carga:nuevaFecha}); }
    entregas.forEach(e=>{ if(ids.includes(e.id)||ids.includes(String(e.id))) e.fecha_carga=nuevaFecha; });
    renderCal();renderDash();
    log('Fecha actualizada para toda la carga','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function deleteGrupoById(idsStr){
  const ids=idsStr.split(',').map(x=>x.trim()).filter(Boolean);
  const lineas=entregas.filter(e=>ids.includes(String(e.id)));
  const confirmadas=lineas.filter(e=>e.estado==='confirmada');
  const pendientes=lineas.filter(e=>e.estado==='pendiente');
  let msg='¿Eliminar esta carga programada?';
  if(confirmadas.length>0){
    msg='Hay lineas ya confirmadas (stock descontado). Al eliminar, el stock se devolvera automaticamente. Continuar?';


  }
  if(!confirm(msg)) return;
  try{
    for(const id of ids){ await api('DELETE','/entregas/'+id); }
    await loadAll();
    const msg2='Carga eliminada'+(confirmadas.length>0?' — stock devuelto ('+fmtN(confirmadas.reduce((s,e)=>s+(+e.cantidad||0),0))+' ud)':'');
    log(msg2,'ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function deleteGrupo(ids){
  await deleteGrupoById(ids.join(','));
}

// Eliminar una sola línea de la carga (botón papelera del modal)
async function deleteEntregaById(id){
  var e=entregas.find(function(x){return String(x.id)===String(id);});
  var msg=(e&&e.estado==='confirmada')
    ? 'Esta línea está confirmada (stock descontado). Al eliminar se devolverá el stock. ¿Continuar?'
    : '¿Eliminar esta línea de la carga?';
  if(!confirm(msg)) return;
  try{
    await api('DELETE','/entregas/'+id);
    await loadAll();
    log('Línea eliminada'+(e&&e.estado==='confirmada'?' — stock devuelto':''),'ok');
    closeModal();
  }catch(err){ log('Error: '+err.message,'warn'); }
}

function verDetalleGrupo(grupoId){
  editarGrupo(grupoId);
}

async function confirmarEntrega(id){
  try{
    var res=await api('PATCH','/entregas/'+id+'/confirmar',{});
    await loadAll();
    if(res&&res.pedidoAutoEntregado){
      log('✓ Entrega confirmada — ¡Pedido completamente entregado!','ok');
      mostrarToast('¡Pedido entregado al completo!','green');
    }else{
      log('Entrega confirmada — stock actualizado','ok');
    }
  }catch(e){log('Error: '+e.message,'warn');}
}

async function cambiarFechaEntrega(id, nuevaFecha){
  try{
    await api('PATCH','/entregas/'+id+'/fecha',{fecha_carga:nuevaFecha});
    const e=entregas.find(x=>x.id===id||String(x.id)===String(id));
    if(e) e.fecha_carga=nuevaFecha;
    renderCal();renderDash();
    log('Fecha de carga actualizada','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

async function deleteEntrega(id){
  var e=entregas.find(function(x){return String(x.id)===String(id);});
  var msg=e&&e.estado==='confirmada'?'Entrega confirmada: el stock se devolvera al eliminar. Continuar?':'Eliminar esta carga programada?';
  if(!confirm(msg)) return;
  try{
    var res=await api('DELETE','/entregas/'+id);
    await loadAll();
    log('Carga eliminada'+(res&&res.stockRevertido?' - stock devuelto':''),'ok');
  }catch(err){log('Error: '+err.message,'warn');}
}

