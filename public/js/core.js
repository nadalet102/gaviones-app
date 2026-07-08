// ── DATA ───────────────────────────────────────────────────────────────────────
let productos=[], stock=[], clientes=[], pedidos=[], necesidades=[], movimientos=[], entregas=[], parteHoy=null, carado=[], montaje=[];
let editId=null, modalType=null;
let pedidoLogActual=[]; // log de actualizaciones del pedido en edición
let sortField='largo', sortDir='desc';
let calY=new Date().getFullYear(), calM=new Date().getMonth();

const ESTADOS_PED={
  pendiente:{label:'Pendiente',badge:'b-blue'},
  en_produccion:{label:'En producción',badge:'b-amber'},
  listo:{label:'Listo',badge:'b-purple'},
  entregado:{label:'Entregado',badge:'b-green'},
  cancelado:{label:'Cancelado',badge:'b-gray'}
};
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOWS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const fmtN = n => Math.round(n||0).toLocaleString('es-ES');

function sortedProductos(list){
  return [...list].sort(function(a,b){
    if(sortField==='referencia'||sortField==='descripcion'){
      var av=String(a[sortField]||''), bv=String(b[sortField]||'');
      return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av);
    }
    var av=parseFloat(a[sortField])||0, bv=parseFloat(b[sortField])||0;
    return sortDir==='asc'?av-bv:bv-av;
  });
}
function setSortField(f){
  if(sortField===f) sortDir=sortDir==='desc'?'asc':'desc';
  else { sortField=f; sortDir='desc'; }
  renderProductos(); renderStock(); renderNecesidades();
  if(parteHoy) renderParte(parteHoy);
}
const fmtD = d => { if(!d) return '—'; const s=String(d).substring(0,10); const[y,m,dd]=s.split('-'); return dd+'/'+m+'/'+y; };
const dimStr = p => p.largo ? p.largo+'×'+p.ancho+'×'+p.alto+' m' : '';
const prodLabel = p => p.referencia+(dimStr(p)?' · '+dimStr(p):'')+(p.descripcion?' · '+p.descripcion:'');

function setSyncStatus(s){
  document.getElementById('sync-dot').className='sync-dot'+(s==='ok'?'':s==='err'?' error':' syncing');
  document.getElementById('tb-sub').textContent=s==='ok'?'Sincronizado':s==='err'?'Error':'Cargando...';
}
async function api(method,path,body){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(body) opts.body=JSON.stringify(body);
  const r=await fetch('/api'+path,opts);
  if(!r.ok){
    const txt=await r.text();
    let msg=txt;
    try{ msg=JSON.parse(txt).error||txt; }catch(e){}
    throw new Error(msg);
  }
  return r.json();
}
async function loadAll(){
  setSyncStatus('loading');
  try{
    [productos,stock,clientes,pedidos,necesidades,movimientos,entregas]=await Promise.all([
      api('GET','/productos'),api('GET','/stock'),api('GET','/clientes'),
      api('GET','/pedidos-gav'),api('GET','/necesidades'),
      api('GET','/stock/movimientos'),api('GET','/entregas')
    ]);
    try{ carado=await api('GET','/carado'); }catch(e){ carado=[]; }
    try{ montaje=await api('GET','/montaje'); }catch(e){ montaje=[]; }
    setSyncStatus('ok');
    const t=document.querySelector('.tab.active')?.id?.replace('tab-','');
    renderAll(t);
  }catch(e){setSyncStatus('err');log('Error: '+e.message,'warn');}
}
function renderAll(t){
  updateStats();
  renderDash();
  if(t==='pedidos') renderPedidos();
  else if(t==='nec') renderNecesidades();
  else if(t==='stock') renderStock();
  else if(t==='productos') renderProductos();
  else if(t==='clientes') renderClientes();
  else if(t==='cal') renderCal();
  else if(t==='parte') loadParteHoy();
  else if(t==='informe') renderInforme();
  else if(t==='calculador') renderCalculador();
  else if(t==='mesa') renderMesa();
  else if(t==='vibrado') renderVibrado();
  else if(t==='montado') renderMontado();
  else if(t==='carado') renderCarado();
  else if(t==='cargar') renderCargar();
}
function switchTab(t){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.id==='tab-'+t));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+t));
  cerrarAreas();
  updateAreaActive();
  if(t==='dash') renderDash();
  else if(t==='parte') loadParteHoy();
  else if(t==='cal') renderCal();
  else if(t==='cargar') renderCargar();
  else if(t==='nec') renderNecesidades();
  else if(t==='pedidos') renderPedidos();
  else if(t==='stock') renderStock();
  else if(t==='productos') renderProductos();
  else if(t==='clientes') renderClientes();
  else if(t==='hist') loadHistorial();
  else if(t==='informe') renderInforme();
  else if(t==='calculador') renderCalculador();
  else if(t==='mesa') renderMesa();
  else if(t==='vibrado') renderVibrado();
  else if(t==='montado') renderMontado();
  else if(t==='carado') renderCarado();
}

// ── Áreas desplegables de la barra ──────────────────────────────────────────
function toggleArea(name){
  var el=document.getElementById('area-'+name);
  if(!el) return;
  var abrir=!el.classList.contains('open');
  cerrarAreas();
  if(abrir) el.classList.add('open');
}
function cerrarAreas(){
  document.querySelectorAll('.area.open').forEach(function(a){a.classList.remove('open');});
}
// Resalta el área que contiene la vista activa
function updateAreaActive(){
  document.querySelectorAll('.area').forEach(function(a){
    a.classList.toggle('active-area', !!a.querySelector('.tab.active'));
  });
}
// Cerrar el desplegable al pulsar fuera de cualquier área
document.addEventListener('click',function(e){
  if(!e.target.closest('.area')) cerrarAreas();
});

