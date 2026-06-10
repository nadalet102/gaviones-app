// ── HISTORIAL ──────────────────────────────────────────────────────────────────
var histData={pedidos:[],entregas:[]};

async function loadHistorial(){
  try{
    histData=await api('GET','/historial');
    renderHistorial();
  }catch(e){log('Error cargando historial','warn');}
}

function renderHistorial(){
  var estadoF=document.getElementById('hist-estado-filter')?.value||'';
  var pedidosFilt=histData.pedidos.filter(function(p){return !estadoF||p.estado===estadoF;});

  // KPIs
  var totalEntregados=histData.pedidos.filter(function(p){return p.estado==='entregado';}).length;
  var totalCancelados=histData.pedidos.filter(function(p){return p.estado==='cancelado';}).length;
  var totalUdsEntregadas=histData.entregas.reduce(function(s,e){return s+(+e.cantidad||0);},0);
  var kpis=document.getElementById('hist-kpis');
  if(kpis){
    kpis.innerHTML=
      '<div class="kpi"><div class="kpi-label">Pedidos entregados</div><div class="kpi-value" style="color:var(--green)">'+totalEntregados+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Pedidos cancelados</div><div class="kpi-value" style="color:var(--red)">'+totalCancelados+'</div>'+
      '<div style="margin-top:6px;font-size:11px;color:var(--text2)">'+fmtN(totalUdsEntregadas)+' uds entregadas en total</div></div>';
  }

  // Pedidos
  var pedEl=document.getElementById('hist-pedidos');
  if(!pedEl) return;
  if(!pedidosFilt.length){
    pedEl.innerHTML='<div class="empty"><i class="ti ti-file-check"></i><p>Sin pedidos completados aun</p></div>';
  }else{
    pedEl.innerHTML='<table class="tbl"><thead><tr><th>N</th><th>Cliente</th><th>Estado</th><th>F. entrega</th><th></th></tr></thead><tbody>'+
    pedidosFilt.map(function(p){
      var sc=p.estado==='entregado'?'b-green':'b-gray';
      var totalUds=(p.lineas||[]).reduce(function(s,l){return s+(+l.cantidad||0);},0);
      return '<tr>'+
        '<td class="mono" style="font-weight:500;color:var(--blue)">'+p.numero+'</td>'+
        '<td><div style="font-weight:500">'+(p.cliente_nombre||p.cliente_nombre_rel||'—')+'</div>'+(p.obra?'<div class="dim">'+p.obra+'</div>':'')+'</td>'+
        '<td><span class="badge '+sc+'">'+( p.estado==='entregado'?'Entregado':'Cancelado')+'</span></td>'+
        '<td class="dim">'+fmtD(p.fecha_entrega)+'<div>'+fmtN(totalUds)+' ud</div></td>'+
        '<td><button class="btn btn-outline btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="reactivarPedido('+p.id+')"><i class="ti ti-arrow-back-up"></i> Reactivar</button></td>'+
      '</tr>';
    }).join('')+'</tbody></table>';
  }

  // Entregas confirmadas
  var entEl=document.getElementById('hist-entregas');
  if(!entEl) return;
  if(!histData.entregas.length){
    entEl.innerHTML='<div class="empty"><i class="ti ti-truck"></i><p>Sin entregas confirmadas aun</p></div>';
  }else{
    entEl.innerHTML='<table class="tbl"><thead><tr><th>Fecha</th><th>Pedido</th><th>Producto</th><th class="r">Uds.</th><th></th></tr></thead><tbody>'+
    histData.entregas.map(function(e){
      return '<tr>'+
        '<td class="mono" style="font-size:11px">'+fmtD(e.fecha_carga)+'</td>'+
        '<td><div style="font-weight:500;font-size:12px">'+e.pedido_numero+'</div><div class="dim">'+(e.cliente_nombre||'')+'</div></td>'+
        '<td><div style="font-weight:500;font-size:12px">'+e.referencia+'</div><div class="dim">'+dimStr(e)+'</div></td>'+
        '<td class="r mono" style="font-weight:500">'+fmtN(e.cantidad)+'</td>'+
        '<td><button class="btn-icon" style="color:var(--amber)" onclick="anularEntrega('+e.id+')" title="Anular entrega"><i class="ti ti-arrow-back-up"></i></button></td>'+
      '</tr>';
    }).join('')+'</tbody></table>';
  }
}

function triggerPDFImportEnModal(){
  var inp=document.getElementById('pdf-modal-input');
  if(inp){inp.value='';inp.click();}
}

// Extrae medidas de una descripción tipo "100x30x50cm" (cm → m)
function parseDimsDesc(desc){
  var m=(desc||'').match(/(\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)[xX×](\d+(?:[.,]\d+)?)/);
  if(!m) return {largo:null,ancho:null,alto:null};
  var f=function(s){return parseFloat(s.replace(',','.'))/100;};
  return {largo:f(m[1]),ancho:f(m[2]),alto:f(m[3])};
}
// Devuelve el producto del catálogo para una línea del PDF; si no existe, lo crea.
async function asegurarProducto(l){
  if(!l||!l.referencia) return null;
  var prod=productos.find(function(p){return p.referencia===l.referencia;})
        || productos.find(function(p){return p.referencia&&p.referencia.toUpperCase()===String(l.referencia).toUpperCase();});
  if(prod) return prod;
  var d=parseDimsDesc(l.descripcion);
  try{
    var nuevo=await api('POST','/productos',{tipo:'gavion',referencia:l.referencia,descripcion:l.descripcion||l.referencia,largo:d.largo,ancho:d.ancho,alto:d.alto,unidad:'ud'});
    if(nuevo&&nuevo.id){ productos.push(nuevo); return nuevo; }
  }catch(e){ /* si falla la creación, devolvemos null y la línea se omite */ }
  return null;
}

async function procesarPDFEnModal(input){
  var file=input.files[0];
  if(!file) return;
  // Show loading state in title
  var titleEl=document.getElementById('modal-title');
  if(titleEl) titleEl.innerHTML='<i class="ti ti-loader"></i> Leyendo PDF...';

  var base64=await new Promise(function(res,rej){
    var r=new FileReader();
    r.onload=function(){res(r.result.split(',')[1]);};
    r.onerror=function(){rej(new Error('Error leyendo archivo'));};
    r.readAsDataURL(file);
  });

  try{
    var response=await fetch('/api/importar-pdf',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({base64:base64,media_type:'application/pdf'})
    });
    var rawText=await response.text();
    if(!response.ok) throw new Error('HTTP '+response.status+': '+rawText.substring(0,200));
    var pedido;
    try{pedido=JSON.parse(rawText);}
    catch(pe){throw new Error('Respuesta no valida: '+rawText.substring(0,100));}

    // Fill the form fields
    if(pedido.numero) document.getElementById('f-num').value=pedido.numero;
    if(pedido.cliente_nombre) document.getElementById('f-cliente-nombre').value=pedido.cliente_nombre;
    if(pedido.obra) document.getElementById('f-obra').value=pedido.obra;
    if(pedido.fecha_pedido) document.getElementById('f-fecha-ped').value=pedido.fecha_pedido;

    // Fill lines (creando en el catálogo las referencias que no existan)
    if(pedido.lineas&&pedido.lineas.length){
      var container=document.getElementById('lineas-container');
      if(container){
        container.innerHTML='';
        var creados=0, omitidos=0, idx=0;
        for(const l of pedido.lineas){
          var existia=!!(productos.find(function(p){return p.referencia===l.referencia;})
                       || productos.find(function(p){return p.referencia&&p.referencia.toUpperCase()===String(l.referencia||'').toUpperCase();}));
          var prod=await asegurarProducto(l);
          if(prod){
            if(!existia) creados++;
            container.insertAdjacentHTML('beforeend', lineaHTML(Date.now()+idx,{producto_id:prod.id,cantidad:l.cantidad}));
          } else { omitidos++; }
          idx++;
        }
        var msg='PDF importado: '+(pedido.lineas.length-omitidos)+' línea(s)';
        if(creados>0) msg+=' · '+creados+' producto(s) nuevo(s) creado(s) en catálogo';
        if(omitidos>0) msg+=' · '+omitidos+' sin referencia, omitida(s)';
        log(msg, omitidos>0?'warn':'ok');
      }
    }

    // Restore title
    document.getElementById('modal-title').innerHTML='<i class="ti ti-file-text"></i> Nuevo pedido <button class="btn btn-outline btn-sm" onclick="triggerPDFImportEnModal()" style="margin-left:8px;font-size:11px"><i class="ti ti-file-import"></i> Importar PDF BC</button>';

  }catch(e){
    document.getElementById('modal-title').innerHTML='<i class="ti ti-file-text"></i> Nuevo pedido <button class="btn btn-outline btn-sm" onclick="triggerPDFImportEnModal()" style="margin-left:8px;font-size:11px"><i class="ti ti-file-import"></i> Importar PDF BC</button>';
    log('Error leyendo PDF: '+e.message,'warn');
  }
}

function triggerExcelImport(){
  var inp=document.getElementById('excel-import-input');
  if(inp){inp.value='';inp.click();}
}

async function procesarExcelProductos(input){
  var file=input.files[0];
  if(!file) return;
  log('Leyendo Excel...','');

  var base64=await new Promise(function(res,rej){
    var r=new FileReader();
    r.onload=function(){res(r.result.split(',')[1]);};
    r.onerror=function(){rej(new Error('Error leyendo archivo'));};
    r.readAsDataURL(file);
  });

  try{
    var response=await fetch('/api/importar-productos',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({base64:base64})
    });
    var data=await response.json();
    if(!response.ok) throw new Error(data.error||'Error del servidor');

    await loadAll();
    renderProductos();

    var msg='Importados '+data.importados+' productos de '+data.total+' totales';
    if(data.duplicados>0) msg+=' ('+data.duplicados+' ya existían, no duplicados)';
    log(msg,'ok');
    mostrarToast(msg,'green');

    if(data.refs_duplicadas&&data.refs_duplicadas.length>0){
      console.log('Ya existían:', data.refs_duplicadas.join(', '));
    }
  }catch(e){
    log('Error importando Excel: '+e.message,'warn');
  }
}

function mostrarToast(msg, tipo){
  var existing=document.getElementById('toast-notif');
  if(existing) existing.remove();
  var t=document.createElement('div');
  t.id='toast-notif';
  t.style.cssText='position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:9999;'+
    'background:'+(tipo==='green'?'#2d7a3a':'#1d6fa4')+';color:#fff;'+
    'padding:14px 24px;border-radius:10px;font-size:14px;font-weight:500;'+
    'box-shadow:0 4px 20px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;'+
    'animation:slideUp .3s ease';
  t.innerHTML='<i class="ti ti-circle-check" style="font-size:20px"></i> '+msg;
  var style=document.createElement('style');
  style.textContent='@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(function(){if(t.parentNode){t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(function(){t.remove();},300);}},4000);
}

