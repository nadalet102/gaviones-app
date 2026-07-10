// ════════════ VISOR 3D INTERACTIVO DEL MURO (Three.js vía CDN) ════════════
// 3D real navegable: cada gavión es una caja con su jaula, coloreada por medida.
// Órbita con ratón/táctil, pantalla completa y descarga de imagen (para cliente).

var _muro3d = { lib:null };

async function muro3dEnsure(){
  if(_muro3d.lib) return _muro3d.lib;
  const THREE = await import('https://esm.sh/three@0.160.0');
  const oc = await import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls');
  _muro3d.lib = { THREE:THREE, OrbitControls: oc.OrbitControls };
  return _muro3d.lib;
}

// Genera las cajas (gaviones) de un muro con origen en (0,0,0): x=largo, y=alto, z=profundidad
function genWallBoxes(H, L, anchoOverride){
  const boxes=[];
  const courses = muroCourses(H, anchoOverride!=null ? anchoOverride : (H<2 ? 0.5 : null));
  let yAcc=0;
  courses.forEach(function(c){
    let z=0;
    muroBandas(c.w).forEach(function(bw, bi){
      let x=0; const off=(c.offset!==(bi%2===1));   // trabado también en profundidad
      muroTramo(L, off).forEach(function(p){ boxes.push({x:x, y:yAcc, z:z, l:p, a:bw, h:c.h, largo:p}); x+=p; });
      z+=bw;
    });
    yAcc+=c.h;
  });
  return boxes;
}

function muro3dSingle(H, L, ancho){
  muro3dOpen(genWallBoxes(H, L, ancho), 'Muro '+String(H).replace('.',',')+' m × '+fmtN(L)+' m');
}

function muro3dTramos(){
  const data = window.__muroTramos; if(!data || !data.tramos.length) return;
  const tramos = data.tramos, perfil = data.perfil;
  const base=[0]; for(var i=1;i<tramos.length;i++) base[i]=base[i-1]-(tramos[i-1].desnivel||0);
  const minBase = perfil==='esc' ? Math.min.apply(null, base) : 0;
  let boxes=[], xoff=0;
  tramos.forEach(function(t, idx){
    const wb = genWallBoxes(t.H, t.L, t.ancho);
    const by = perfil==='esc' ? (base[idx]-minBase) : 0;
    wb.forEach(function(b){ boxes.push({x:b.x+xoff, y:b.y+by, z:b.z, l:b.l, a:b.a, h:b.h, largo:b.largo}); });
    xoff += t.L;
  });
  muro3dOpen(boxes, 'Muro por tramos · '+fmtN(xoff)+' m');
}

// Muro en L / U: cada tramo (piezas de su alzado) se coloca y gira 90° según la planta.
function muro3dEle(){
  const data = window.__muroEle; if(!data || !data.segs || !data.segs.length) return;
  const w=1, boxes=[];   // w = ancho/profundidad del muro en planta
  data.segs.forEach(function(s, si){ const st=data.estados[si]; if(!st) return;
    st.piezas.forEach(function(p){
      if(s.dx>0)      boxes.push({x:s.p0.x+p.x,           y:p.y, z:s.p0.y-w/2,          l:p.largo, a:w,       h:p.alto, largo:p.largo});
      else if(s.dx<0) boxes.push({x:s.p0.x-p.x-p.largo,   y:p.y, z:s.p0.y-w/2,          l:p.largo, a:w,       h:p.alto, largo:p.largo});
      else if(s.dy>0) boxes.push({x:s.p0.x-w/2,           y:p.y, z:s.p0.y+p.x,          l:w,       a:p.largo, h:p.alto, largo:p.largo});
      else            boxes.push({x:s.p0.x-w/2,           y:p.y, z:s.p0.y-p.x-p.largo,  l:w,       a:p.largo, h:p.alto, largo:p.largo});
    });
  });
  muro3dOpen(boxes, 'Muro en L/U · '+data.T.length+' tramos');
}

function muro3dInjectCSS(){
  if(document.getElementById('muro3d-css')) return;
  const s=document.createElement('style'); s.id='muro3d-css';
  s.textContent =
    '.m3d-ov{position:fixed;inset:0;z-index:9999;background:#e8edf3;display:flex;flex-direction:column}'+
    '.m3d-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#111827;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:14px}'+
    '.m3d-bar .sp{flex:1}'+
    '.m3d-bar button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:7px 11px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:5px}'+
    '.m3d-bar button:hover{background:#374151}'+
    '.m3d-canvas{flex:1;position:relative;overflow:hidden}'+
    '.m3d-canvas canvas{display:block}'+
    '.m3d-hint{position:absolute;left:12px;bottom:12px;color:#334155;background:rgba(255,255,255,.82);padding:6px 10px;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif}'+
    '.m3d-legend{position:absolute;right:12px;top:12px;color:#1f2937;background:rgba(255,255,255,.86);padding:8px 11px;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;line-height:1.7}'+
    '.m3d-legend i{display:inline-block;width:12px;height:12px;vertical-align:middle;margin-right:5px;border:1px solid rgba(0,0,0,.25);border-radius:2px}'+
    '.m3d-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#475569;font-family:system-ui,sans-serif;font-size:15px}';
  document.head.appendChild(s);
}

async function muro3dOpen(boxes, title){
  muro3dInjectCSS();
  const ov=document.createElement('div'); ov.className='m3d-ov';
  ov.innerHTML =
    '<div class="m3d-bar"><i class="ti ti-3d-cube-sphere"></i> <strong>'+title+'</strong> · '+fmtN(boxes.length)+' gaviones'+
      '<span class="sp"></span>'+
      '<button data-a="reset"><i class="ti ti-focus-2"></i> Encuadrar</button>'+
      '<button data-a="img"><i class="ti ti-download"></i> Imagen</button>'+
      '<button data-a="fs"><i class="ti ti-maximize"></i> Pantalla completa</button>'+
      '<button data-a="close"><i class="ti ti-x"></i> Cerrar</button>'+
    '</div>'+
    '<div class="m3d-canvas"><div class="m3d-load">Cargando 3D…</div>'+
      '<div class="m3d-legend"><i style="background:#3b82f6"></i>2 m<br><i style="background:#22c55e"></i>1,5 m<br><i style="background:#f59e0b"></i>1 m</div>'+
      '<div class="m3d-hint">Arrastra para girar · rueda para zoom · botón derecho para desplazar</div>'+
    '</div>';
  document.body.appendChild(ov);
  const wrap = ov.querySelector('.m3d-canvas');

  let lib;
  try { lib = await muro3dEnsure(); }
  catch(e){ wrap.querySelector('.m3d-load').innerHTML = 'No se pudo cargar el 3D (¿sin conexión?).<br>'+e.message; return; }
  const THREE = lib.THREE, OrbitControls = lib.OrbitControls;
  const loadEl = wrap.querySelector('.m3d-load'); if(loadEl) loadEl.remove();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8edf3');

  // bounding box del muro
  let minX=1e9,minY=1e9,minZ=1e9,maxX=-1e9,maxY=-1e9,maxZ=-1e9;
  boxes.forEach(function(b){
    minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); minZ=Math.min(minZ,b.z);
    maxX=Math.max(maxX,b.x+b.l); maxY=Math.max(maxY,b.y+b.h); maxZ=Math.max(maxZ,b.z+b.a);
  });
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2, cz=(minZ+maxZ)/2;
  const sizeX=maxX-minX, sizeY=maxY-minY, sizeZ=maxZ-minZ;
  const maxDim=Math.max(sizeX,sizeY,sizeZ);

  // cámara
  const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth/wrap.clientHeight, 0.1, maxDim*40+200);
  function encuadrar(){
    const d = maxDim*1.5 + 6;
    camera.position.set(cx + d*0.75, cy + Math.max(sizeY, d*0.5), cz + d*1.15);
    camera.lookAt(cx, cy, cz);
  }
  encuadrar();

  const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.set(cx, cy, cz); controls.update();

  // luces
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c0cc, 1.0));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(maxDim, maxDim*1.4, maxDim*0.8); scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.25);
  dir2.position.set(-maxDim, maxDim*0.6, -maxDim*0.5); scene.add(dir2);

  // suelo + rejilla
  const groundSize = Math.max(sizeX, sizeZ)*3 + 20;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), new THREE.MeshLambertMaterial({color:0xd7dee8}));
  ground.rotation.x = -Math.PI/2; ground.position.set(cx, minY-0.01, cz); scene.add(ground);
  const grid = new THREE.GridHelper(groundSize, Math.round(groundSize), 0xb3bccb, 0xc6cdd8);
  grid.position.set(cx, minY, cz); scene.add(grid);

  // gaviones: InstancedMesh por color + jaula (aristas) fusionada
  const COLORS = { '2':0x3b82f6, '1.5':0x22c55e, '1':0xf59e0b };
  const groups = { '2':[], '1.5':[], '1':[] };
  boxes.forEach(function(b){ const key = b.largo===2?'2':b.largo===1.5?'1.5':'1'; groups[key].push(b); });
  const geo = new THREE.BoxGeometry(1,1,1);
  const mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  Object.keys(groups).forEach(function(key){
    const list = groups[key]; if(!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({color:COLORS[key]}), list.length);
    list.forEach(function(b, i){
      pos.set(b.x+b.l/2, b.y+b.h/2, b.z+b.a/2); scl.set(b.l*0.985, b.h*0.985, b.a*0.985);
      mtx.compose(pos, quat, scl); mesh.setMatrixAt(i, mtx);
    });
    mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
  });
  // jaulas (aristas de cada gavión) en una sola geometría
  const edgePos = [];
  const E=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
  boxes.forEach(function(b){
    const xs=[b.x,b.x+b.l], ys=[b.y,b.y+b.h], zs=[b.z,b.z+b.a], c=[];
    for(var X=0;X<2;X++)for(var Y=0;Y<2;Y++)for(var Z=0;Z<2;Z++) c.push([xs[X],ys[Y],zs[Z]]);
    E.forEach(function(e){ edgePos.push(c[e[0]][0],c[e[0]][1],c[e[0]][2], c[e[1]][0],c[e[1]][1],c[e[1]][2]); });
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  scene.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({color:0x334155, transparent:true, opacity:0.55})));

  // render loop
  let raf;
  function animate(){ raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
  animate();

  function onResize(){ camera.aspect = wrap.clientWidth/wrap.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(wrap.clientWidth, wrap.clientHeight); }
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);

  function cerrar(){
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onResize);
    renderer.dispose(); geo.dispose(); edgeGeo.dispose();
    ov.remove();
  }
  ov.querySelector('[data-a="close"]').onclick = cerrar;
  ov.querySelector('[data-a="reset"]').onclick = function(){ encuadrar(); controls.target.set(cx,cy,cz); controls.update(); };
  ov.querySelector('[data-a="fs"]').onclick = function(){ if(!document.fullscreenElement) ov.requestFullscreen(); else document.exitFullscreen(); };
  ov.querySelector('[data-a="img"]').onclick = function(){
    renderer.render(scene, camera);
    const a=document.createElement('a'); a.download = title.replace(/[^\wáéíóúñ .-]/gi,'').trim()+'.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click();
  };
  document.addEventListener('keydown', function esc(ev){ if(ev.key==='Escape' && document.body.contains(ov) && !document.fullscreenElement){ cerrar(); document.removeEventListener('keydown', esc); } });
}
