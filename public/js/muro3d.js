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
// Encastre de esquina: por cada hilada, el header de un brazo CRUZA la esquina y el otro brazo
// se recorta, alternando de brazo hilada a hilada → encastra sin huecos ni solapes.
// Tabica [a,b] sobre una rejilla global de 2 m con fase p (0/1): cortes en x≡p (mod 2).
// Interior de 2 m; los extremos que no alcancen 2 m son remates enteros (1 / 1,5 m). Garantiza
// que hiladas de distinta paridad desfasen las juntas (trabado). a y b múltiplos de 0,5.
function eleTileGrid(a, b, p){
  const pieces=[]; const first = Math.min(b, a + (((p - a) % 2) + 2) % 2);   // primer corte ≥ a alineado a la fase
  let x=a;
  if(first > a + 1e-6){ pieces.push({x0:a, l:first-a}); x=first; }
  while(x + 2 <= b + 1e-6){ pieces.push({x0:x, l:2}); x+=2; }
  if(b - x > 1e-6) pieces.push({x0:x, l:b-x});
  // Sin piezas de 0,5 m de LARGO (aparecen cuando a/b caen en medio metro — anchos 0,5/0,3):
  // el resto de 0,5 se funde con la pieza contigua → 1 + 1,5. La junta interna cae en medio
  // metro, fuera de la rejilla entera → sigue matajuntas con las hiladas y bandas vecinas.
  if(pieces.length>1 && pieces[0].l<0.75){
    const s=pieces[0].l+pieces[1].l, x0=pieces[0].x0;
    const rep = s>2.25 ? [{x0:x0,l:1},{x0:x0+1,l:1.5}] : [{x0:x0,l:s}];
    pieces.splice(0,2); Array.prototype.unshift.apply(pieces,rep);
  }
  if(pieces.length>1 && pieces[pieces.length-1].l<0.75){
    const q=pieces[pieces.length-2], s=q.l+pieces[pieces.length-1].l, x0=q.x0;
    const rep = s>2.25 ? [{x0:x0,l:1.5},{x0:x0+1.5,l:1}] : [{x0:x0,l:s}];
    pieces.splice(pieces.length-2,2); Array.prototype.push.apply(pieces,rep);
  }
  return pieces;
}
// Coloca una pieza (arm-local x, largo pl, altura y..y+alto) en el mundo según brazo y huella.
function elePlace(s, r, x, pl, y, alto, w, arm){
  if(s.dx>0)      return {x:s.p0.x+x,        y:y, z:r.ry,          l:pl, a:w,  h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
  if(s.dx<0)      return {x:s.p0.x-x-pl,     y:y, z:r.ry,          l:pl, a:w,  h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
  if(s.dy>0)      return {x:r.rx,            y:y, z:s.p0.y+x,      l:w,  a:pl, h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
  return                 {x:r.rx,            y:y, z:s.p0.y-x-pl,   l:w,  a:pl, h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
}
// Como elePlace pero a una banda de profundidad (dOff..dOff+bw) hacia el INTERIOR (según normal de la huella).
function elePlaceD(s, r, x, pl, y, alto, dOff, bw, arm){
  if(s.dx!==0){ const xx = s.dx>0? s.p0.x+x : s.p0.x-x-pl;
    const z0 = (r.ny<0) ? (r.ry+r.rh - dOff - bw) : (r.ry + dOff);
    return {x:xx, y:y, z:z0, l:pl, a:bw, h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
  }
  const zz = s.dy>0? s.p0.y+x : s.p0.y-x-pl;
  const x0 = (r.nx<0) ? (r.rx+r.rw - dOff - bw) : (r.rx + dOff);
  return {x:x0, y:y, z:zz, l:bw, a:pl, h:alto, largo:pl, arm:arm, dx:s.dx, dy:s.dy};
}
function eleBoxes(){
  const data = window.__muroEle; if(!data || !data.segs || !data.segs.length) return [];
  const fix = data.ancho || null;                 // ancho fijo elegido (1 / 0,5 / 0,3) o null = prontuario
  const cara = data.cara || 'int';                // ensanche de la base: 'int' hacia dentro (cara lisa) · 'ext' hacia fuera (sobresale)
  const w = fix || 1, segs=data.segs, n=segs.length, boxes=[];
  // Recortes de esquina sobre la rejilla de 0,5 m: el brazo del header recede recBig (y el header,
  // de largo recBig, cruza la esquina); el otro brazo recede recSmall. Para 0,3 m el recorte se
  // redondea a 0,5 (queda 0,2 de holgura en el rincón; se cierra al atar en obra).
  const recBig = Math.max(1, 2*w), recSmall = Math.ceil(w*2 - 1e-9)/2;
  const R = (typeof eleFootprint==='function') ? eleFootprint(segs, w) : null;
  for(let i=0;i<n;i++){ const s=segs[i], st=data.estados[i]; if(!st) continue;
    const r = R ? R[i] : {rx:s.p0.x-w/2, ry:s.p0.y-w/2}, Lext=s.largo;
    const flat = st.base.every(b=>Math.abs(b-st.base[0])<1e-6) && st.crown.every(c=>Math.abs(c-st.crown[0])<1e-6);
    if(!flat){   // recta ESCALONADA (cotas/alturas variables): piezas del motor por cotas
      // (trabadas a través de las juntas de tramo) + profundidad del prontuario por columna.
      st.piezas.forEach(function(p){
        const xm=p.x+p.largo/2;
        let j;
        if(st.edges){ j=0; while(j<st.N-1 && xm>st.edges[j+1]) j++; }
        else j=Math.min(st.N-1, Math.max(0, Math.floor(xm/st.cell)));
        const Hj=st.crown[j]-st.base[j];
        const anchos=fix?[w]:((typeof seccionAnchos==='function')?seccionAnchos(Hj):[w]);
        const kIdx=Math.max(0, Math.floor(p.y - st.base[j] + 1e-6));
        const dep=anchos[Math.min(kIdx, anchos.length-1)];
        const bandas=(typeof muroBandas==='function')?muroBandas(dep):[w];
        // 'ext': el ensanche SALE del muro (trasera enrasada con la hilada de 1 m; el extra
        // sobresale de la línea dibujada). 'int' (defecto): cara lisa, el extra va hacia dentro.
        let dOff=(cara==='ext' && dep>1+1e-9) ? (1-dep) : 0;
        bandas.forEach(function(bw){ boxes.push(elePlaceD(s, r, p.x, p.largo, p.y, p.alto, dOff, bw, i)); dOff+=bw; });
      });
      continue;
    }
    // tramo PLANO: rejilla global (fase por paridad) para TRABAR todas las caras. En cada esquina,
    // el brazo del HEADER de esa hilada recede 2 m (le entra el header 1 m) y el otro recede 1 m.
    const H=st.crown[0]-st.base[0], full=Math.floor(H+1e-9), half=(H-full)>0.25;
    const hasStart=i>0, hasEnd=i<n-1;
    const courses=[]; for(let k=0;k<full;k++) courses.push({y:k, alto:1}); if(half) courses.push({y:full, alto:0.5});
    courses.forEach(function(c){ const yp=Math.floor(c.y+1e-6)%2, par=(yp===0);
      // header de la esquina de inicio (i-1,i): hi = par? i : i-1. Este brazo es hi en inicio si par.
      const rStart = hasStart ? (par ? recBig : recSmall) : 0;
      // header de la esquina de fin (i,i+1): hi = par? i+1 : i. Este brazo es hi en fin si !par.
      const rEnd   = hasEnd   ? (par ? recSmall : recBig) : 0;
      const a = rStart, b = Lext - rEnd;
      if(b-a < 0.99) return;
      // profundidad: ancho fijo elegido, o la sección del prontuario (base ancha que estrecha)
      const anchos = fix ? [w] : ((typeof seccionAnchos==='function') ? seccionAnchos(H) : [w]);
      const dep = anchos[Math.min(Math.floor(c.y+1e-6), anchos.length-1)];
      const bandas = (typeof muroBandas==='function') ? muroBandas(dep) : [w];
      // cada banda de profundidad se traba con la de al lado (fase alternada por banda) y con la
      // hilada de arriba/abajo (fase por paridad de y): trabado en las dos direcciones.
      let dOff=(cara==='ext' && dep>1+1e-9) ? (1-dep) : 0;   // 'ext': el ensanche sobresale de la línea
      bandas.forEach(function(bw, bi){ const fase=(yp+bi)%2;
        eleTileGrid(a, b, fase).forEach(function(pc){ boxes.push(elePlaceD(s, r, pc.x0, pc.l, c.y, c.alto, dOff, bw, i)); });
        dOff+=bw; });
    });
  }
  // HEADERS de esquina: por hilada, una pieza de 2 m que CRUZA la esquina y entra 1 m en un brazo,
  // alternando de brazo cada hilada → los brazos se meten unos dentro de otros (engranan).
  if(R) for(let ci=0; ci<n-1; ci++){ const rA=R[ci], rB=R[ci+1];
    const Sx0=Math.max(rA.rx,rB.rx), Sx1=Math.min(rA.rx+rA.rw, rB.rx+rB.rw);
    const Sz0=Math.max(rA.ry,rB.ry), Sz1=Math.min(rA.ry+rA.rh, rB.ry+rB.rh);
    if(!(Sx1>Sx0+1e-6 && Sz1>Sz0+1e-6)) continue;
    const stA=data.estados[ci], stB=data.estados[ci+1];
    const Hc=Math.min(stA.crown[0]-stA.base[0], stB.crown[0]-stB.base[0]);
    const full=Math.floor(Hc+1e-9), half=(Hc-full)>0.25;
    const cs=[]; for(let k=0;k<full;k++) cs.push({y:k,alto:1}); if(half) cs.push({y:full,alto:0.5});
    cs.forEach(function(c){ const par=(Math.floor(c.y+1e-6)%2===0);
      const hi=par? ci+1 : ci, hs=segs[hi], hr=R[hi];
      let hx0,hx1,hz0,hz1;
      if(hs.dx!==0){ hz0=Sz0; hz1=Sz1;                            // header a lo largo de X
        if(hr.rx+hr.rw>Sx1+1e-6){ hx0=Sx0; hx1=Sx1+(recBig-w); } else { hx0=Sx0-(recBig-w); hx1=Sx1; }
      } else { hx0=Sx0; hx1=Sx1;                                  // header a lo largo de Z
        if(hr.ry+hr.rh>Sz1+1e-6){ hz0=Sz0; hz1=Sz1+(recBig-w); } else { hz0=Sz0-(recBig-w); hz1=Sz1; }
      }
      const lx=hx1-hx0, lz=hz1-hz0;
      boxes.push({x:hx0, y:c.y, z:hz0, l:lx, a:lz, h:c.alto, largo:Math.max(lx,lz), arm:hi, dx:hs.dx, dy:hs.dy});
    });
  }
  // dedup: en las esquinas, las bandas profundas de dos brazos se solapan al ir hacia el interior;
  // se descarta la caja cuyo centro cae dentro de otra ya colocada (evita cajas montadas).
  const val = boxes.filter(function(b){ return b.l>1e-6 && b.a>1e-6 && b.h>1e-6; });
  const kept=[];
  val.forEach(function(b){ const vb=b.l*b.a*b.h;
    const solapa = kept.some(function(k){ const ox=Math.min(b.x+b.l,k.x+k.l)-Math.max(b.x,k.x), oy=Math.min(b.y+b.h,k.y+k.h)-Math.max(b.y,k.y), oz=Math.min(b.z+b.a,k.z+k.a)-Math.max(b.z,k.z);
      if(ox<=1e-6||oy<=1e-6||oz<=1e-6) return false; return (ox*oy*oz) > 0.4*vb; });   // >40% del volumen solapado → descartar
    if(!solapa) kept.push(b); });
  return kept;
}
function muro3dEle(){
  const data = window.__muroEle; if(!data || !data.segs || !data.segs.length) return;
  muro3dOpen(eleBoxes(), 'Muro en L/U · '+data.T.length+' recta(s)'+(data.ancho?(' · ancho '+fmtN(data.ancho)+' m'):''));
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
  // leyenda por TIPO de gavión (norma: tono = ancho×alto · intensidad = largo), con recuento
  const tm={};
  boxes.forEach(function(b){ const an=Math.round(((Math.abs(b.l-b.largo)<1e-6)?b.a:b.l)*100)/100;
    const k=b.largo+'|'+an+'|'+b.h; if(!tm[k]) tm[k]={largo:b.largo, ancho:an, alto:b.h, n:0}; tm[k].n++; });
  const legHtml=Object.keys(tm).map(function(k){ return tm[k]; })
    .sort(function(a,b){ return (b.alto-a.alto)||(b.ancho-a.ancho)||(b.largo-a.largo); })
    .map(function(t){ const c=(typeof colorGavion==='function')?colorGavion(t.largo,t.ancho,t.alto):{f:'#3b82f6'};
      return '<i style="background:'+c.f+'"></i>'+Math.round(t.largo*100)+'×'+Math.round(t.ancho*100)+'×'+Math.round(t.alto*100)+' <span style="color:#64748b">('+t.n+')</span>'; })
    .join('<br>');
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
      '<div class="m3d-legend">'+legHtml+'</div>'+
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
    // la cámara arranca del lado de la CARA VISTA (la cara va en z=0 y el trasdós hacia +z;
    // antes se abría desde el trasdós y el ensanche de la base parecía ir al revés)
    camera.position.set(cx + d*0.75, cy + Math.max(sizeY, d*0.5), cz - d*1.15);
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

  // gaviones: InstancedMesh por color (norma: tono = tipo ancho×alto · intensidad = largo)
  const groups = {};
  boxes.forEach(function(b){ const an=(Math.abs(b.l-b.largo)<1e-6)?b.a:b.l;
    const hex=(typeof colorGavion==='function')?colorGavion(b.largo, an, b.h).f:'#3b82f6';
    (groups[hex]=groups[hex]||[]).push(b); });
  const geo = new THREE.BoxGeometry(1,1,1);
  const mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  Object.keys(groups).forEach(function(key){
    const list = groups[key]; if(!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({color:new THREE.Color(key)}), list.length);
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
