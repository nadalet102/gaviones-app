// ── STATS ──────────────────────────────────────────────────────────────────────
function updateStats(){
  const activos=pedidos.filter(p=>!['entregado','cancelado'].includes(p.estado));
  const aFabricar=necesidades.reduce((s,n)=>s+(+n.necesidad_neta||0),0);
  const stockTotal=stock.reduce((s,st)=>s+(+st.cantidad||0),0);
  const hoy=new Date().toISOString().slice(0,10);
  const cargasHoy=entregas.filter(e=>e.fecha_carga&&String(e.fecha_carga).substring(0,10)===hoy&&e.estado==='pendiente').length;
  const proximas=entregas.filter(e=>e.estado==='pendiente'&&e.fecha_carga&&String(e.fecha_carga).substring(0,10)>=hoy).sort((a,b)=>a.fecha_carga>b.fecha_carga?1:-1);
  const proxFecha=proximas.length?fmtD(proximas[0].fecha_carga):'—';
  const pendientesTotal=entregas.filter(e=>e.estado==='pendiente').length;
  document.getElementById('st-pedidos').textContent=activos.length;
  document.getElementById('st-fabricar').textContent=fmtN(aFabricar);
  document.getElementById('st-stock').textContent=fmtN(stockTotal);
  document.getElementById('st-proxima').textContent=proxFecha;
  document.getElementById('st-hoy').textContent=cargasHoy;
  document.getElementById('st-pend-ent').textContent=pendientesTotal;
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function renderDash(){
  const activos=pedidos.filter(p=>!['entregado','cancelado'].includes(p.estado));
  const aFabricar=necesidades.reduce((s,n)=>s+(+n.necesidad_neta||0),0);
  const stockTotal=stock.reduce((s,st)=>s+(+st.cantidad||0),0);
  const alertas=necesidades.filter(n=>+n.necesidad_neta>0);
  const hoy=new Date().toISOString().slice(0,10);
  const en7=new Date(); en7.setDate(en7.getDate()+7);
  const fecha7=en7.toISOString().slice(0,10);
  const proxCargas=entregas.filter(e=>e.estado==='pendiente'&&e.fecha_carga&&String(e.fecha_carga).substring(0,10)>=hoy&&String(e.fecha_carga).substring(0,10)<=fecha7).sort((a,b)=>a.fecha_carga>b.fecha_carga?1:-1);

  document.getElementById('kpis').innerHTML=
    '<div class="kpi"><div class="kpi-label">Pedidos activos</div><div class="kpi-value">'+activos.length+'</div><div class="kpi-sub">'+activos.filter(p=>p.estado==='en_produccion').length+' en producción</div></div>'+
    '<div class="kpi"><div class="kpi-label">A fabricar</div><div class="kpi-value" style="color:'+(aFabricar>0?'var(--red)':'var(--green)')+'">'+fmtN(aFabricar)+'</div><div class="kpi-sub">'+alertas.length+' referencias con déficit</div></div>'+
    '<div class="kpi"><div class="kpi-label">Stock total</div><div class="kpi-value" style="color:var(--green)">'+fmtN(stockTotal)+'</div><div class="kpi-sub">unidades disponibles</div></div>'+
    '<div class="kpi"><div class="kpi-label">Cargas próx. 7d</div><div class="kpi-value">'+proxCargas.length+'</div><div class="kpi-sub">entregas programadas</div></div>';

  // Cargas próximas
  const cp=document.getElementById('dash-cargas-proximas');
  if(!proxCargas.length){
    cp.innerHTML='<div class="empty"><i class="ti ti-calendar"></i><p>Sin cargas programadas esta semana</p></div>';
  }else{
    cp.innerHTML='<table class="tbl"><thead><tr><th>Fecha</th><th>Pedido</th><th>Producto</th><th class="r">Uds.</th><th class="c">Estado</th><th></th></tr></thead><tbody>'+
    proxCargas.map(e=>'<tr>'+
      '<td class="mono" style="font-weight:500;color:var(--blue)">'+fmtD(e.fecha_carga)+'</td>'+
      '<td><div style="font-weight:500">'+e.pedido_numero+'</div><div class="dim">'+(e.cliente_nombre||'')+(e.obra?' · '+e.obra:'')+'</div></td>'+
      '<td><div style="font-weight:500">'+e.referencia+'</div><div class="dim">'+dimStr(e)+'</div></td>'+
      '<td class="r mono">'+fmtN(e.cantidad)+'</td>'+
      '<td class="c"><span class="badge '+(e.estado==='confirmada'?'b-green':'b-amber')+'">'+( e.estado==='confirmada'?'Confirmada':'Pendiente')+'</span></td>'+
      '<td style="display:flex;gap:5px;align-items:center">'+
        (e.estado==='pendiente'?'<input type="date" value="'+String(e.fecha_carga).substring(0,10)+'" title="Cambiar fecha" style="font-size:11px;padding:2px 5px;border:1px solid var(--border2);border-radius:4px;background:var(--surface2)" onchange="cambiarFechaEntrega('+e.id+',this.value)">':'<span class="dim">'+fmtD(e.fecha_carga)+'</span>')+
        (e.estado==='pendiente'?'<button class="btn btn-green btn-sm" onclick="confirmarEntrega('+e.id+')"><i class="ti ti-check"></i> Confirmar</button>':'')+
        (e.estado==='confirmada'?'<button class="btn btn-outline btn-sm" style="color:var(--amber);border-color:var(--amber);font-size:10px" onclick="anularEntrega('+e.id+')"><i class="ti ti-arrow-back-up"></i> Anular</button>':'')+
      '</td>'+
    '</tr>').join('')+'</tbody></table>';
  }

  // Necesidades urgentes
  const necEl=document.getElementById('dash-nec');
  if(!alertas.length){
    necEl.innerHTML='<div class="empty"><i class="ti ti-circle-check" style="color:var(--green)"></i><p style="color:var(--green)">Stock suficiente</p></div>';
  }else{
    necEl.innerHTML='<table class="tbl"><thead><tr><th>Producto</th><th class="r">Pedido</th><th class="r">Stock</th><th class="r">Fabricar</th></tr></thead><tbody>'+
    alertas.slice(0,5).map(n=>'<tr>'+
      '<td><div style="font-weight:500">'+n.referencia+'</div><div class="dim">'+dimStr(n)+'</div></td>'+
      '<td class="r mono">'+fmtN(n.pedido_total)+'</td>'+
      '<td class="r"><span class="stock-chip sc-'+(+n.stock_actual>0?'warn':'bad')+'">'+fmtN(n.stock_actual)+'</span></td>'+
      '<td class="r"><span class="badge b-red">'+fmtN(n.necesidad_neta)+'</span></td>'+
    '</tr>').join('')+'</tbody></table>';
  }

  // Pedidos activos
  const pa=document.getElementById('dash-pedidos-activos');
  if(!activos.length){pa.innerHTML='<div class="empty"><i class="ti ti-file-text"></i><p>Sin pedidos activos</p></div>';return;}
  pa.innerHTML='<table class="tbl"><thead><tr><th>Nº</th><th>Cliente / Obra</th><th>Entrega</th><th>Estado</th><th class="r">Pendiente entregar</th><th></th></tr></thead><tbody>'+
  activos.slice(0,8).map(p=>{
    const sc=ESTADOS_PED[p.estado]||ESTADOS_PED.pendiente;
    const pendiente=(p.lineas||[]).reduce((s,l)=>{
      const entregado=(l.entregas||[]).filter(e=>e.estado==='confirmada').reduce((ss,e)=>ss+(+e.cantidad||0),0);
      return s+Math.max(0,(+l.cantidad||0)-entregado);
    },0);
    return '<tr>'+
      '<td class="mono" style="font-weight:500;color:var(--blue)">'+p.numero+'</td>'+
      '<td><div style="font-weight:500">'+(p.cliente_nombre||p.cliente_nombre_rel||'—')+'</div>'+(p.obra?'<div class="dim">'+p.obra+'</div>':'')+'</td>'+
      '<td class="dim">'+fmtD(p.fecha_entrega)+'</td>'+
      '<td><span class="badge '+sc.badge+'">'+sc.label+'</span></td>'+
      '<td class="r mono">'+fmtN(pendiente)+' ud</td>'+
      '<td><button class="btn-icon" onclick="verPedido(\''+p.id+'\')"><i class="ti ti-eye"></i></button></td>'+
    '</tr>';
  }).join('')+'</tbody></table>';
}

