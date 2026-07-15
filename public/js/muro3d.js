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

// Genera las cajas (gaviones) de un muro con origen en (0,0,0): x=largo, y=alto, z=profundidad.
// La CARA VISTA queda en z=0 mirando a +z (la cámara por defecto); las bandas de profundidad
// crecen hacia −z (el terreno queda detrás).
function genWallBoxes(H, L, anchoOverride){
  const boxes=[];
  const courses = muroCourses(H, anchoOverride!=null ? anchoOverride : (H<2 ? 0.5 : null));
  let yAcc=0;
  courses.forEach(function(c){
    let z=0;
    muroBandas(c.w).forEach(function(bw, bi){
      let x=0; const off=(c.offset!==(bi%2===1));   // trabado también en profundidad
      muroTramo(L, off).forEach(function(p){ boxes.push({x:x, y:yAcc, z:-(z+bw), l:p, a:bw, h:c.h, largo:p}); x+=p; });
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
  // Sin piezas de 0,5 m de LARGO (aparecen cuando a/b caen en medio metro): el resto de 0,5 se
  // funde con la pieza contigua → 1 + 1,5. El corte del par se elige para que la junta interna
  // caiga SIEMPRE a medio metro de la rejilla ENTERA (arranque entero → 1,5 primero; a medio →
  // 1 primero): así nunca calca las juntas de las caras (que van en rejilla entera).
  const corte=x0=>(Math.abs(x0-Math.round(x0))<1e-9)? 1.5 : 1;
  if(pieces.length>1 && pieces[0].l<0.75){
    const s=pieces[0].l+pieces[1].l, x0=pieces[0].x0, f=corte(x0);
    const rep = s>2.25 ? [{x0:x0,l:f},{x0:x0+f,l:s-f}] : [{x0:x0,l:s}];
    pieces.splice(0,2); Array.prototype.unshift.apply(pieces,rep);
  }
  if(pieces.length>1 && pieces[pieces.length-1].l<0.75){
    const q=pieces[pieces.length-2], s=q.l+pieces[pieces.length-1].l, x0=q.x0, f=corte(x0);
    const rep = s>2.25 ? [{x0:x0,l:f},{x0:x0+f,l:s-f}] : [{x0:x0,l:s}];
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
  // Orden de las bandas de una hilada ancha, del frente hacia el terreno:
  // · 'int' (cara lisa): el de 50/30 DELANTE y los de 100 detrás → la junta entre bandas cae a
  //   media losa bajo la hilada superior (traba).
  // · 'ext' (la base sobresale): SOBRESALE EL DE 100 y el de 50/30 queda detrás, enrasado con la
  //   trasera → la junta cae a media losa bajo la hilada superior (traba). Si sobresaliera el de
  //   50, la junta caería justo en el plano de la cara (junta seguida vertical).
  const bandasDe = function(dep){
    const b = (typeof muroBandas==='function') ? muroBandas(dep) : [w];
    return (cara==='ext' && dep>1+1e-9) ? b.slice().reverse() : b;
  };
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
      // La banda FRONTAL (la primera de bandasDe: 50/30 en 'int', 100 en 'ext') usa las piezas
      // de cara tal cual; las TRASERAS se re-tabican con fase alternada → TRABADO DOBLE: cada
      // banda traba con la de delante y con las hiladas de arriba/abajo (como en las planas).
      const colOf=function(xm){ let j;
        if(st.edges){ j=0; while(j<st.N-1 && xm>st.edges[j+1]) j++; }
        else j=Math.min(st.N-1, Math.max(0, Math.floor(xm/st.cell)));
        return j; };
      const depOf=function(xm, y){ const j=colOf(xm); const Hj=st.crown[j]-st.base[j];
        const anchos=fix?[w]:((typeof seccionAnchos==='function')?seccionAnchos(Hj):[w]);
        const kIdx=Math.max(0, Math.floor(y - st.base[j] + 1e-6));
        return anchos[Math.min(kIdx, anchos.length-1)]; };
      const colEnd=function(xm){ const j=colOf(xm); return st.edges? st.edges[j+1] : Math.min(st.L,(j+1)*st.cell); };
      const porY={};   // agrupado por (nivel, alto): las medias hiladas van aparte de las enteras
      st.piezas.forEach(function(p){ const k=p.y+'|'+p.alto; (porY[k]=porY[k]||[]).push(p); });
      Object.keys(porY).forEach(function(yk){
        const list0=porY[yk].sort(function(a,b){ return a.x-b.x; });
        const y=list0[0].y, alto=list0[0].alto, yp=Math.floor(y+1e-6)%2;
        const fronteraEn=function(p){   // 1ª frontera de dep estrictamente dentro de la pieza
          let x=p.x, d0=depOf(x+0.005, y);
          while(true){ const e=colEnd(x+0.005); if(e>=p.x+p.largo-1e-9) return null;
            const d1=depOf(e+0.005, y); if(Math.abs(d1-d0)>1e-9) return e; d0=d1; x=e; }
        };
        let list;
        if(cara==='ext'){
          // Base hacia FUERA: el carril saliente cambia de plano en la junta, así que la pieza
          // que cruza un cambio de sección se PARTE en la junta con largos ENTEROS (un resto de
          // 0,5 se funde con la vecina → 1,5 + …). Solo pasa en esa hilada; el resto cruzan.
          const arr=list0.map(function(p){ return {x:p.x, y:p.y, largo:p.largo, alto:p.alto}; });
          for(let idx=0; idx<arr.length; idx++){
            const p=arr[idx]; if(!p) continue;
            const B=fronteraEn(p); if(B==null) continue;
            const lL=Math.round((B-p.x)*100)/100, lR=Math.round((p.x+p.largo-B)*100)/100;
            let izq, der;
            // el primer trozo se elige para que la junta interna caiga a MEDIO metro de la
            // rejilla entera (arranque entero → 1,5; arranque a medio → 1): así nunca coincide
            // con los cortes de las bandas traseras ni con las hiladas vecinas
            const primero=x0=>(Math.abs(x0-Math.round(x0))<1e-9)? 1.5 : 1;
            if(lL>=0.99) izq=[{x:p.x, largo:lL}];
            else { const q=arr[idx-1];
              if(q && Math.abs(q.x+q.largo-p.x)<1e-6 && fronteraEn(q)==null){
                const s=q.largo+lL, f=primero(q.x); arr[idx-1]=null;
                izq=(s>2.25)? [{x:q.x, largo:f},{x:q.x+f, largo:s-f}] : [{x:q.x, largo:s}];
              } else izq=[{x:p.x, largo:lL}];
            }
            if(lR>=0.99) der=[{x:B, largo:lR}];
            else { const q=arr[idx+1];
              if(q && Math.abs(p.x+p.largo-q.x)<1e-6 && fronteraEn(q)==null){
                const s=lR+q.largo, f=primero(B); arr[idx+1]=null;
                der=(s>2.25)? [{x:B, largo:f},{x:B+f, largo:s-f}] : [{x:B, largo:s}];
              } else der=[{x:B, largo:lR}];
            }
            arr[idx]=null;
            izq.concat(der).forEach(function(t){ arr.push({x:t.x, y:p.y, largo:t.largo, alto:p.alto}); });
          }
          list=arr.filter(Boolean).sort(function(a,b){ return a.x-b.x; });
        } else list=list0;
        // INTERCAMBIO EN LAS TRANSICIONES (cara lisa): junto a cada frontera de sección, en la
        // zona honda se invierte la banda (el 100 pasa DELANTE y el 50 se esconde detrás) desde
        // la junta hasta el primer final de pieza a ≥1 m → la cara sigue en gaviones de 100,
        // ESTÉTICA y trabada cruzando la junta también en esta hilada; el retranqueo del 50
        // queda detrás, contra el terreno. Lejos de las juntas se mantiene el 50 delante.
        const swaps=[];
        if(cara!=='ext'){
          let j0=0;
          while(j0<list.length){
            let j1=j0, fin=list[j0].x+list[j0].largo;
            while(j1+1<list.length && Math.abs(list[j1+1].x-fin)<1e-6){ j1++; fin=list[j1].x+list[j1].largo; }
            const X0=list[j0].x, X1=fin, tira=list.slice(j0, j1+1);
            // zonas de fondo uniforme dentro de la tira, con su ancho de banda frontal clásico
            const zonas=[]; let zx=X0;
            while(zx<X1-1e-9){
              const dz=depOf(zx+0.005,y); let ze=Math.min(X1, colEnd(zx+0.005));
              while(ze<X1-1e-9 && Math.abs(depOf(ze+0.005,y)-dz)<1e-9) ze=Math.min(X1, colEnd(ze+0.005));
              zonas.push({a:zx, b:ze, w:((typeof muroBandas==='function')?muroBandas(dz)[0]:dz)});
              zx=ze;
            }
            zonas.forEach(function(z, zi){
              if(z.w>=1-1e-9) return;   // solo zonas HONDAS (banda frontal estrecha)
              const sw=[];
              if(zi>0 && zonas[zi-1].w>=1-1e-9){          // junta con cambio de ancho a la IZQUIERDA
                const e=z.a; let smin=e+1;
                tira.forEach(function(p){ if(p.x<e-1e-9 && p.x+p.largo>e+1e-9) smin=Math.max(smin, p.x+p.largo); });
                let S=z.b; tira.forEach(function(p){ const pe=p.x+p.largo; if(pe>=smin-1e-9 && pe<S) S=pe; });
                sw.push({a:e, b:S});
              }
              if(zi<zonas.length-1 && zonas[zi+1].w>=1-1e-9){   // junta a la DERECHA
                const e=z.b; let amax=e-1;
                tira.forEach(function(p){ if(p.x<e-1e-9 && p.x+p.largo>e+1e-9) amax=Math.min(amax, p.x); });
                let A=z.a; tira.forEach(function(p){ if(p.x<=amax+1e-9 && p.x>A) A=p.x; });
                sw.push({a:A, b:e});
              }
              if(!sw.length) return;
              sw.sort(function(u,v){ return u.a-v.a; });
              // funde solapes y ABSORBE huecos clásicos de <1 m (no cabe tabicado detrás)
              if(sw.length===2 && sw[1].a-sw[0].b<0.99){ sw[0].b=Math.max(sw[0].b, sw[1].b); sw.pop(); }
              if(sw[0].a-z.a<0.99 && sw[0].a>z.a+1e-9) sw[0].a=z.a;
              const ult=sw[sw.length-1];
              if(z.b-ult.b<0.99 && ult.b<z.b-1e-9) ult.b=z.b;
              sw.forEach(function(v){ swaps.push(v); });
            });
            j0=j1+1;
          }
          swaps.sort(function(u,v){ return u.a-v.a; });
        }
        const enSwap=function(p){ return swaps.some(function(sv){ return p.x<sv.b-1e-9 && p.x+p.largo>sv.a+1e-9; }); };
        // banda frontal: pieza a pieza (conserva remates y rincones de la cara)
        const frentes=[];
        list.forEach(function(p){
          const dep=depOf(p.x+p.largo/2, y);
          let bw0, off0;
          if(cara!=='ext' && enSwap(p)){ bw0=1; off0=0; }   // transición: el 100 delante
          else { bw0=bandasDe(dep)[0]; off0=(cara==='ext' && dep>1+1e-9) ? (1-dep) : 0; }
          frentes.push({x0:p.x, x1:p.x+p.largo, d0:off0, d1:off0+bw0});
          boxes.push(elePlaceD(s, r, p.x, p.largo, p.y, p.alto, off0, bw0, i));
        });
        // bandas traseras: por TIRAS contiguas del nivel, troceadas donde cambia la sección y
        // por los tramos de intercambio. Si una pieza frontal cruza con más fondo que el
        // arranque de la banda, la banda se recorta (la cruzante ya ocupa ese fondo).
        let i0=0;
        while(i0<list.length){
          let i1=i0, end=list[i0].x+list[i0].largo;
          while(i1+1<list.length && Math.abs(list[i1+1].x-end)<1e-6){ i1++; end=list[i1].x+list[i1].largo; }
          const X1=end; let sx=list[i0].x;
          while(sx<X1-1e-9){
            const dep=depOf(sx+0.01, y);
            let ex=Math.min(X1, colEnd(sx+0.01));
            while(ex<X1-1e-9 && Math.abs(depOf(ex+0.01, y)-dep)<1e-9) ex=Math.min(X1, colEnd(ex+0.01));
            // partes intercambiadas / clásicas dentro de [sx,ex]
            const partes=[];
            if(cara!=='ext' && dep>1+1e-9 && swaps.length){
              let cx=sx;
              swaps.filter(function(sv){ return sv.b>sx+1e-9 && sv.a<ex-1e-9; }).forEach(function(sv){
                const a=Math.max(sx,sv.a), b=Math.min(ex,sv.b);
                if(a>cx+1e-9) partes.push({a:cx, b:a, swap:false});
                partes.push({a:a, b:b, swap:true}); cx=b;
              });
              if(cx<ex-1e-9) partes.push({a:cx, b:ex, swap:false});
            } else partes.push({a:sx, b:ex, swap:false});
            partes.forEach(function(pt){
              const seq = pt.swap ? ((typeof muroBandas==='function')?muroBandas(dep).slice().reverse():[w]) : bandasDe(dep);
              let dOff=(cara==='ext' && dep>1+1e-9) ? (1-dep) : 0;
              seq.forEach(function(bw, bi){
                if(bi>0){
                  let s2=pt.a, e2=pt.b;
                  frentes.forEach(function(c){
                    if(c.d1>dOff+1e-9 && c.d0<dOff+bw-1e-9){   // solapa en profundidad con esta banda
                      if(c.x0<s2+1e-9 && c.x1>s2+1e-9) s2=Math.min(pt.b, Math.max(s2, c.x1));
                      if(c.x0<e2-1e-9 && c.x1>e2-1e-9) e2=Math.max(pt.a, Math.min(e2, c.x0));
                    }
                  });
                  // bandas traseras a rejilla de MEDIO metro (cortes en x,5): no pueden calcar
                  // ni la cara de su nivel ni la del nivel vecino (que van en rejilla entera)
                  if(e2-s2>0.99) eleTileGrid(s2, e2, ((yp+bi)%2)+0.5).forEach(function(pc){ boxes.push(elePlaceD(s, r, pc.x0, pc.l, y, alto, dOff, bw, i)); });
                }
                dOff+=bw;
              });
            });
            sx=ex;
          }
          i0=i1+1;
        }
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
      const bandas = bandasDe(dep);
      // La banda FRONTAL va en rejilla entera con fase por paridad del nivel; las TRASERAS, a
      // rejilla de MEDIO metro (cortes en x,5): así no calcan ni la cara de su nivel, ni la del
      // nivel vecino, ni entre ellas → trabado en las dos direcciones garantizado.
      let dOff=(cara==='ext' && dep>1+1e-9) ? (1-dep) : 0;   // 'ext': el ensanche sobresale de la línea
      bandas.forEach(function(bw, bi){ const fase=(bi===0)? (yp%2) : (((yp+bi)%2)+0.5);
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
    // Vista por defecto en +z: respeta el SENTIDO DEL DIBUJO (izquierda→derecha, como la
    // cuadrícula y los alzados). La cara vista se orienta hacia esta cámara colocando el
    // cuerpo del muro al otro lado de la línea (eleFootprint/genWallBoxes), no girando la
    // vista (girarla deja el muro en espejo).
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
