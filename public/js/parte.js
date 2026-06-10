// ── PARTE DIARIO ───────────────────────────────────────────────────────────────
async function loadParteHoy(){
  const el=document.getElementById('parte-container');
  el.innerHTML='<div style="text-align:center;padding:30px;color:var(--text2)"><i class="ti ti-loader" style="font-size:24px"></i><div style="margin-top:8px">Cargando parte...</div></div>';
  try{
    parteHoy=await api('GET','/partes/hoy');
    renderParte(parteHoy);
  }catch(e){el.innerHTML='<div class="empty"><i class="ti ti-x-circle"></i><p>Error al cargar el parte</p></div>';}
}

function renderParte(parte){
  const el=document.getElementById('parte-container');
  const cerrado=parte.estado==='cerrado';
  const total=(parte.lineas||[]).reduce(function(s,l){return s+(+l.cantidad||0);},0);
  const TIPO_LABELS={gavion:'Gaviones',colchoneta:'Colchonetas Reno',malla:'Malla',panel:'Paneles',accesorio:'Accesorios',otro:'Otros'};
  const tiposPresentes=[...new Set((parte.lineas||[]).map(function(l){return l.tipo;}))];

  // Recomendaciones: productos con pedidos pendientes y sin stock suficiente
  const recomendados=necesidades.filter(function(n){
    return +n.necesidad_neta>0 && !parte.lineas.find(function(l){return String(l.producto_id)===String(n.producto_id);});
  });

  let html='<div>';

  // Main parte card
  html+='<div class="card">'+
    '<div class="card-hdr">'+
      '<div class="card-title"><i class="ti ti-clipboard-list"></i> Parte — '+fmtD(parte.fecha)+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span class="badge '+(cerrado?'b-green':'b-amber')+'">'+(cerrado?'Cerrado':'Abierto')+'</span>'+
        (cerrado?'':'<button class="btn btn-green" onclick="cerrarParte('+parte.id+')"><i class="ti ti-lock"></i> Cerrar y actualizar stock</button>')+
      '</div>'+
    '</div>';

  if(cerrado){
    html+='<div style="background:var(--green-l);border-radius:var(--radius-sm);padding:10px 14px;margin:12px 16px;font-size:12px;color:var(--green);display:flex;align-items:center;gap:8px"><i class="ti ti-check-circle" style="font-size:16px"></i>Parte cerrado — stock actualizado.</div>';
  } else {
    // Add product selector
    const prododsEnParte=new Set((parte.lineas||[]).map(function(l){return String(l.producto_id);}));
    const prodsDisponibles=productos.filter(function(p){return p.tipo!=='accesorio'&&!prododsEnParte.has(String(p.id));});
    html+='<div style="padding:10px 16px;border-bottom:1px solid var(--border)">'+
      '<div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);margin-bottom:6px">Añadir producto</div>'+
      '<div style="display:flex;gap:8px;margin-bottom:6px">'+
        '<input type="text" id="parte-prod-search" placeholder="Buscar por referencia o descripción..." oninput="filtrarProdsParaAnadir()" autocomplete="off" '+
          'style="flex:1;font-size:12px;padding:6px 10px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface);color:var(--text)">'+
        '<button class="btn btn-primary btn-sm" onclick="addProductoAParte('+parte.id+')"><i class="ti ti-plus"></i> Añadir</button>'+
      '</div>'+
      '<div id="parte-prod-lista" style="display:none;max-height:180px;overflow-y:auto;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface)">'+
        prodsDisponibles.map(function(p){
          return '<div class="parte-prod-opcion" data-id="'+p.id+'" onclick="seleccionarProdParte(this)" '+
            'style="padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'+
            '<div>'+
              '<span style="font-weight:600;font-family:monospace;color:var(--blue-d)">'+p.referencia+'</span>'+
              (p.descripcion?'<span class="dim" style="margin-left:8px">'+p.descripcion+'</span>':'')+
            '</div>'+
            (dimStr(p)?'<span class="dim" style="font-family:monospace;font-size:11px;flex-shrink:0;margin-left:8px">'+dimStr(p)+'</span>':'')+
          '</div>';
        }).join('')+
      '</div>'+
      '<input type="hidden" id="sel-add-prod" value="">'+
      '<div id="parte-prod-seleccionado" style="display:none;margin-top:6px;background:var(--blue-l);border-radius:var(--radius-sm);padding:6px 10px;font-size:12px;display:flex;align-items:center;justify-content:space-between">'+
        '<span id="parte-prod-sel-label"></span>'+
        '<button onclick="limpiarSelProdParte()" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--text2)"><i class="ti ti-x"></i></button>'+
      '</div>'+
    '</div>';
  }

  var sortArrow=sortDir==='desc'?' ↓':' ↑';
  html+='<div class="sort-btns">'+
    '<span style="font-size:11px;color:var(--text2)">Ordenar:</span>'+
    '<button class="sort-btn'+(sortField==='largo'?' active':'')+'" data-f="largo" onclick="setSortField(this.dataset.f)">Largo'+(sortField==='largo'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='ancho'?' active':'')+'" data-f="ancho" onclick="setSortField(this.dataset.f)">Ancho'+(sortField==='ancho'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='alto'?' active':'')+'" data-f="alto" onclick="setSortField(this.dataset.f)">Alto'+(sortField==='alto'?sortArrow:'')+'</button>'+
    '<button class="sort-btn'+(sortField==='referencia'?' active':'')+'" data-f="referencia" onclick="setSortField(this.dataset.f)">Ref.'+(sortField==='referencia'?sortArrow:'')+'</button>'+
  '</div>';

  if(!(parte.lineas||[]).length){
    html+='<div style="padding:30px;text-align:center;color:var(--text2)"><i class="ti ti-playlist-add" style="font-size:28px;opacity:.3;display:block;margin-bottom:8px"></i>Añade productos con el selector de arriba</div>';
  } else if(!cerrado) {
    html+='<div style="padding:8px 16px;border-bottom:1px solid var(--border)">'+
      '<input type="text" id="parte-filter-search" placeholder="Filtrar por referencia..." oninput="filtrarParteTarjetas()" '+
        'style="font-size:12px;padding:5px 10px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);width:240px">'+
    '</div>';
  }

  tiposPresentes.forEach(function(tipo){
    if(tipo==='accesorio') return;
    const lineasTipo=sortedProductos((parte.lineas||[]).filter(function(l){return l.tipo===tipo;}));
    if(!lineasTipo.length) return;
    html+='<div style="padding:7px 16px 3px;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--text2);background:var(--surface2);border-top:1px solid var(--border)">'+(TIPO_LABELS[tipo]||tipo)+'</div>';
    html+='<div class="parte-grid">';
    lineasTipo.forEach(function(l){
      const val=+l.cantidad||0;
      const nec=necesidades.find(function(n){return String(n.producto_id)===String(l.producto_id);});
      const necNeta=nec?+nec.necesidad_neta:0;
      // Card border/background based on urgency
      var cardBorder='var(--border)';
      var cardBg='var(--surface2)';
      var urgLabel='';
      if(!cerrado && nec){
        if(necNeta>0){
          cardBorder='var(--red)';
          cardBg='var(--red-l)';
          urgLabel='<div style="font-size:9px;font-weight:700;color:var(--red);margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em"><i class="ti ti-alert-triangle" style="font-size:9px"></i> Fabricar '+fmtN(necNeta)+' ud</div>';
        } else if(+nec.programado_pendiente>0){
          cardBorder='var(--amber)';
          cardBg='var(--amber-l)';
          urgLabel='<div style="font-size:9px;font-weight:600;color:var(--amber);margin-bottom:3px"><i class="ti ti-clock" style="font-size:9px"></i> Carga programada</div>';
        }
      }
      html+='<div class="parte-item parte-card-'+l.producto_id+'" style="position:relative;border-color:'+cardBorder+';background:'+cardBg+'">'+
        urgLabel+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1px">'+
          '<div class="parte-ref">'+l.referencia+'</div>'+
          (!cerrado?'<button onclick="quitarDeParteLinea('+parte.id+','+l.producto_id+')" style="background:rgba(0,0,0,.06);border:none;cursor:pointer;font-size:10px;color:var(--text2);padding:1px 4px;border-radius:3px;line-height:1.4;flex-shrink:0;margin-left:4px" title="Quitar del parte"><i class="ti ti-x"></i></button>':'')+
        '</div>'+
        '<div class="parte-dim">'+dimStr(l)+'</div>'+
        (l.descripcion?'<div style="font-size:9px;color:var(--text2);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+l.descripcion+'</div>':'')+
        (nec&&+nec.stock_actual>0?'<div style="font-size:9px;color:var(--green);margin-bottom:3px">Stock: '+fmtN(nec.stock_actual)+'</div>':'')+
        '<input type="number" class="parte-input'+(val>0?' has-value':'')+'" '+
          'value="'+(val||'')+'" placeholder="0" min="0" '+
          (cerrado?'disabled':'')+
          ' onchange="updateParteLinea('+parte.id+','+l.producto_id+',this.value,this)">'+
        (val>0&&!cerrado?'<div style="position:absolute;bottom:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--green)"></div>':'')+
      '</div>';
    });
    html+='</div>';
  });

  html+='<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'+
    '<div style="font-size:13px;color:var(--text2)">Total fabricado hoy: <strong class="mono" id="parte-total-hoy">'+fmtN(total)+' uds</strong></div>'+
  '</div></div>';


  // Historial
  html+='<div class="card" style="margin-top:14px"><div class="card-hdr"><div class="card-title"><i class="ti ti-history"></i> Historial de producción</div>'+
    '<button class="btn btn-outline btn-sm" onclick="exportarHistorialPartes()" style="color:var(--green);border-color:var(--green)"><i class="ti ti-file-spreadsheet"></i> Exportar Excel</button>'+
    '</div>'+
    '<table class="tbl"><thead><tr><th>Fecha</th><th class="r">Total fabricado</th><th>Estado</th><th>Detalle</th><th></th></tr></thead><tbody id="historial-partes"></tbody></table></div>';

  el.innerHTML=html;
  loadHistorialPartes();
}

async function exportarHistorialPartes(){
  try{
    const partes=await api('GET','/partes');
    if(!partes.length){log('Sin datos para exportar','warn');return;}

    // Build rows: one row per product line per day
    const rows=[];
    partes.forEach(function(p){
      var lineasConCant=(p.lineas||[]).filter(function(l){return +l.cantidad>0;});
      if(!lineasConCant.length){
        rows.push({
          Fecha:fmtD(p.fecha),
          Estado:p.estado==='cerrado'?'Cerrado':'Abierto',
          Referencia:'—',
          Descripcion:'—',
          Dimensiones:'—',
          Cantidad:0
        });
      } else {
        lineasConCant.forEach(function(l){
          rows.push({
            Fecha:fmtD(p.fecha),
            Estado:p.estado==='cerrado'?'Cerrado':'Abierto',
            Referencia:l.referencia||'',
            Descripcion:l.descripcion||'',
            Dimensiones:dimStr(l)||'',
            Cantidad:+l.cantidad||0
          });
        });
      }
    });

    // Add summary row per day at the end
    const resumen=[];
    partes.forEach(function(p){
      var total=(p.lineas||[]).reduce(function(s,l){return s+(+l.cantidad||0);},0);
      resumen.push({
        Fecha:fmtD(p.fecha),
        Estado:p.estado==='cerrado'?'Cerrado':'Abierto',
        Referencia:'TOTAL DÍA',
        Descripcion:'',
        Dimensiones:'',
        Cantidad:total
      });
    });

    // Load SheetJS from CDN and generate
    if(!window.XLSX){
      await new Promise(function(res,rej){
        var s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
    }
    var wb=XLSX.utils.book_new();

    // Sheet 1: detail
    var ws1=XLSX.utils.json_to_sheet(rows);
    ws1['!cols']=[{wch:12},{wch:10},{wch:14},{wch:35},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws1,'Detalle');

    // Sheet 2: resumen diario
    var ws2=XLSX.utils.json_to_sheet(resumen);
    ws2['!cols']=[{wch:12},{wch:10},{wch:14},{wch:10},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws2,'Resumen diario');

    // Sheet 3: totals by reference
    var byRef={};
    rows.forEach(function(r){
      if(r.Referencia==='—') return;
      if(!byRef[r.Referencia]) byRef[r.Referencia]={Referencia:r.Referencia,Descripcion:r.Descripcion,Dimensiones:r.Dimensiones,Total:0};
      byRef[r.Referencia].Total+=r.Cantidad;
    });
    var ws3=XLSX.utils.json_to_sheet(Object.values(byRef).sort(function(a,b){return b.Total-a.Total;}));
    ws3['!cols']=[{wch:14},{wch:35},{wch:14},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws3,'Por referencia');

    var fecha=new Date().toISOString().substring(0,10);
    XLSX.writeFile(wb,'produccion_'+fecha+'.xlsx');
    log('Excel exportado','ok');
  }catch(e){log('Error exportando: '+e.message,'warn');}
}

async function loadHistorialPartes(){
  try{
    const partes=await api('GET','/partes');
    const el=document.getElementById('historial-partes');
    if(!el) return;
    if(!partes.length){el.innerHTML='<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text2)">Sin historial aún</td></tr>';return;}
    el.innerHTML=partes.map(p=>{
      const total=(p.lineas||[]).reduce((s,l)=>s+(+l.cantidad||0),0);
      const resumen=(p.lineas||[]).filter(l=>+l.cantidad>0).map(l=>l.referencia+': '+fmtN(l.cantidad)).join(', ')||'—';
      return '<tr>'+
        '<td class="mono" style="font-weight:500">'+fmtD(p.fecha)+'</td>'+
        '<td class="r mono" style="font-weight:500;color:var(--green)">'+fmtN(total)+' ud</td>'+
        '<td><span class="badge '+(p.estado==='cerrado'?'b-green':'b-amber')+'">'+(p.estado==='cerrado'?'Cerrado':'Abierto')+'</span></td>'+
        '<td class="dim" style="font-size:11px">'+resumen+'</td>'+
        '<td>'+(p.estado==='cerrado'?'<button class="btn btn-outline btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="reabrirParte('+p.id+')"><i class="ti ti-lock-open"></i> Reabrir</button>':'')+'</td>'+
      '</tr>';
    }).join('');
  }catch(e){}
}

function filtrarProdsParaAnadir(){
  var q=(document.getElementById('parte-prod-search')?.value||'').toLowerCase().trim();
  var lista=document.getElementById('parte-prod-lista');
  if(!lista) return;
  if(!q){lista.style.display='none';return;}
  lista.style.display='block';
  var opciones=lista.querySelectorAll('.parte-prod-opcion');
  var visible=0;
  opciones.forEach(function(op){
    var txt=op.textContent.toLowerCase();
    var show=txt.includes(q);
    op.style.display=show?'flex':'none';
    if(show) visible++;
  });
  lista.style.display=visible?'block':'none';
}

function seleccionarProdParte(el){
  var id=el.dataset.id;
  var label=el.querySelector('span[style*="font-weight"]')?.textContent||'';
  var dim=el.querySelector('span.dim:last-child')?.textContent||'';
  document.getElementById('sel-add-prod').value=id;
  document.getElementById('parte-prod-search').value='';
  document.getElementById('parte-prod-lista').style.display='none';
  var selEl=document.getElementById('parte-prod-seleccionado');
  var selLabel=document.getElementById('parte-prod-sel-label');
  if(selEl&&selLabel){
    selLabel.innerHTML='<strong>'+label+'</strong>'+(dim?' <span style="color:var(--text2);margin-left:6px">'+dim+'</span>':'');
    selEl.style.display='flex';
  }
}

function limpiarSelProdParte(){
  document.getElementById('sel-add-prod').value='';
  document.getElementById('parte-prod-search').value='';
  var selEl=document.getElementById('parte-prod-seleccionado');
  if(selEl) selEl.style.display='none';
}

function filtrarParteTarjetas(){
  var q=(document.getElementById('parte-filter-search')?.value||'').toLowerCase().trim();
  document.querySelectorAll('[class^="parte-card-"]').forEach(function(card){
    if(!q){card.style.display='';return;}
    var ref=card.querySelector('.parte-ref')?.textContent||'';
    var dim=card.querySelector('.parte-dim')?.textContent||'';
    card.style.display=(ref.toLowerCase().includes(q)||dim.toLowerCase().includes(q))?'':'none';
  });
  // Hide/show section headers if all cards hidden
  document.querySelectorAll('.parte-grid').forEach(function(grid){
    var visible=[...grid.children].some(function(c){return c.style.display!=='none';});
    var prev=grid.previousElementSibling;
    if(prev&&prev.style.textTransform==='uppercase') prev.style.display=visible?'':'none';
  });
}

async function addProductoAParte(parteId){
  var sel=document.getElementById('sel-add-prod');
  if(!sel||!sel.value){log('Selecciona un producto','warn');return;}
  await addProductoAParteById(parteId,+sel.value);
}

async function addProductoAParteById(parteId, productoId){
  try{
    await api('POST','/partes/'+parteId+'/add-producto',{producto_id:productoId});
    parteHoy=await api('GET','/partes/hoy');
    renderParte(parteHoy);
  }catch(e){log('Error: '+e.message,'warn');}
}

async function quitarDeParteLinea(parteId, productoId){
  try{
    await api('DELETE','/partes/'+parteId+'/linea/'+productoId);
    parteHoy=await api('GET','/partes/hoy');
    renderParte(parteHoy);
  }catch(e){log('Error: '+e.message,'warn');}
}

async function updateParteLinea(parteId, productoId, valor, inputEl){
  const v=Math.max(0,parseInt(valor)||0);
  inputEl.value=v;
  inputEl.className='parte-input'+(v>0?' has-value':'');
  try{
    await api('PATCH','/partes/'+parteId+'/linea',{producto_id:productoId,cantidad:v});
    // Update local total
    if(parteHoy){
      const l=parteHoy.lineas.find(x=>String(x.producto_id)===String(productoId));
      if(l) l.cantidad=v;
      const total=(parteHoy.lineas||[]).reduce((s,l)=>s+(+l.cantidad||0),0);
      const totEl=document.getElementById('parte-total-hoy');
      if(totEl) totEl.textContent=fmtN(total)+' uds';
    }
  }catch(e){log('Error al guardar','warn');}
}

async function cerrarParte(id){
  if(!confirm('¿Cerrar el parte de hoy? El stock se actualizará con las cantidades introducidas.')) return;
  try{
    await api('POST','/partes/'+id+'/cerrar',{});
    await loadAll();
    loadParteHoy();
    log('Parte cerrado — stock actualizado','ok');
  }catch(e){log('Error: '+e.message,'warn');}
}

