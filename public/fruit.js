import * as THREE from './vendor/three.module.min.js';
const holder = document.querySelector('[data-fruit]');
if (holder) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('[data-motion-toggle]');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { holder.classList.add('fruit-fallback'); toggle.hidden = true; }
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    holder.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, .1, 30);
    camera.position.set(0, .1, 6.4);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    scene.add(new THREE.HemisphereLight(0xfff9ee, 0x453149, 1.8));
    const key = new THREE.DirectionalLight(0xfff4e8, 2.2); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xe1e5ff, 1.4); rim.position.set(3, 1, -1); scene.add(rim);
    let state = 42;
    const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d');
    const noiseSize = 64;
    const noise = Float32Array.from({length: noiseSize * noiseSize}, random);
    const sample = (x, y) => {
      const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
      const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy);
      const n=(a,b)=>noise[((b+noiseSize)%noiseSize)*noiseSize+(a+noiseSize)%noiseSize];
      return (n(ix,iy)*(1-sx)+n(ix+1,iy)*sx)*(1-sy)+(n(ix,iy+1)*(1-sx)+n(ix+1,iy+1)*sx)*sy;
    };
    const pixels=ctx.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++) {
      const mottling=sample(x/32,y/32)*.6+sample(x/8,y/8)*.3+sample(x/2,y/2)*.1;
      const pore=random()>.992?12:0, i=(y*512+x)*4;
      pixels.data[i]=57+mottling*52+pore;
      pixels.data[i+1]=24+mottling*24+pore;
      pixels.data[i+2]=43+mottling*37+pore*.5;
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const skinMap = new THREE.CanvasTexture(textureCanvas); skinMap.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({map:skinMap,bumpMap:skinMap,bumpScale:.025,roughness:.6});
    const pith = new THREE.MeshStandardMaterial({color:0xf0dfb7,roughness:.85,side:THREE.DoubleSide});
    const pulp = new THREE.MeshPhysicalMaterial({color:0xdb9b20,roughness:.25,clearcoat:.9});
    const jelly = [0xdca32a,0xe0a632,0xd49a23,0xe9b339].map(color=>new THREE.MeshPhysicalMaterial({color,roughness:.35,clearcoat:.45,clearcoatRoughness:.25}));
    const seedMaterial = new THREE.MeshPhysicalMaterial({color:0x302619,roughness:.38,clearcoat:.3});
    const fruit = new THREE.Group(); scene.add(fruit);
    const whole = new THREE.Group(); whole.position.set(-.66,.12,-.43); whole.rotation.set(.2,-.4,-.2); fruit.add(whole);
    const wholeGeometry = new THREE.SphereGeometry(.86,64,48);
    const positions=wholeGeometry.attributes.position;
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const wrinkle=1+.006*Math.sin(x*29+y*15)*Math.sin(z*22-y*19)+.009*Math.sin(x*7+z*8)*Math.sin(y*9);
      positions.setXYZ(i,x*wrinkle,y*wrinkle,z*wrinkle);
    }
    wholeGeometry.computeVertexNormals();
    const shell = new THREE.Mesh(wholeGeometry,skin); shell.scale.set(1,1.08,1);whole.add(shell);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.085,10),new THREE.MeshStandardMaterial({color:0x69513b,roughness:.95}));stem.position.y=.94;stem.rotation.z=-.2;whole.add(stem);
    // Keep the cut face in front of the whole fruit instead of intersecting it.
    const half = new THREE.Group();half.position.set(.61,-.17,.77);half.rotation.set(-.2,.38,-.16);fruit.add(half);
    const bowlGeometry = new THREE.SphereGeometry(.83,64,40,0,Math.PI*2,0,Math.PI/2);bowlGeometry.rotateX(-Math.PI/2);
    const bowl = new THREE.Mesh(bowlGeometry,skin);bowl.scale.z=.78;half.add(bowl);
    const ringGeometry = new THREE.RingGeometry(.733,.824,96,4);
    const ringPositions=ringGeometry.attributes.position;
    for(let i=0;i<ringPositions.count;i++){
      const x=ringPositions.getX(i), y=ringPositions.getY(i), angle=Math.atan2(y,x);
      const irregular=1+.006*Math.sin(angle*11)+.004*Math.cos(angle*19);
      ringPositions.setXYZ(i,x*irregular,y*irregular,.006*Math.sin(angle*7));
    }
    ringGeometry.computeVertexNormals();
    const ring = new THREE.Mesh(ringGeometry,pith);half.add(ring);
    const liningGeometry=new THREE.CylinderGeometry(.735,.735,.045,96,1,true);liningGeometry.rotateX(Math.PI/2);
    const lining=new THREE.Mesh(liningGeometry,pith);lining.position.z=-.02;half.add(lining);
    const rindEdge = new THREE.Mesh(new THREE.TorusGeometry(.825,.009,8,96),skin);half.add(rindEdge);
    // A shallow concave bed puts the juice inside the rind, not on top of it.
    const bedPositions=[],bedUV=[],bedIndices=[];
    const rings=18,segments=96;
    for(let r=0;r<=rings;r++)for(let j=0;j<=segments;j++) {
      const radius=.738*r/rings, angle=j/segments*Math.PI*2;
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
      bedPositions.push(x,y,-.105+.08*Math.pow(radius/.738,2)+.004*Math.sin(x*30+y*17));bedUV.push(x/1.476+.5,y/1.476+.5);
      if(r<rings&&j<segments){const i=r*(segments+1)+j;bedIndices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
    }
    const bedGeometry=new THREE.BufferGeometry();bedGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bedPositions,3));bedGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(bedUV,2));bedGeometry.setIndex(bedIndices);bedGeometry.computeVertexNormals();
    const bed=new THREE.Mesh(bedGeometry,pulp);half.add(bed);
    const seeds = new THREE.Group();half.add(seeds);
    const jellyGeometry = new THREE.SphereGeometry(1,14,10);
    const seedGeometry = new THREE.SphereGeometry(1,12,8);
    const cells=[];
    for(let attempt=0;attempt<2500&&cells.length<76;attempt++) {
      const x=(random()*2-1)*.66,y=(random()*2-1)*.66;
      if(x*x+y*y>.66*.66||cells.some(p=>(p.x-x)**2+(p.y-y)**2<.105**2))continue;
      cells.push({x,y});
    }
    for(const {x,y} of cells) {
      const radius=Math.hypot(x,y),cell=new THREE.Group();
      cell.position.set(x,y,-.097+.08*Math.pow(radius/.738,2)+random()*.004);cell.rotation.z=random()*Math.PI*2;
      const size=.82+random()*.4;
      const sac=new THREE.Mesh(jellyGeometry,jelly[Math.floor(random()*jelly.length)]);sac.scale.set(.07*size,.092*size,.012);cell.add(sac);
      const seed=new THREE.Mesh(seedGeometry,seedMaterial);seed.scale.set(.027*size,.044*size,.005);seed.position.set((random()-.5)*.012,(random()-.5)*.015,.011);seed.rotation.z=(random()-.5)*.5;cell.add(seed);seeds.add(cell);
    }
    const base = seeds.children.map(c=>c.position.clone());
    let paused = reduced.matches, visible = true, frame = 0, elapsed = paused ? 5 : 0, last = performance.now();
    let pointerX=0,pointerY=0;
    const resize = () => {const w=holder.clientWidth,h=holder.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
    new ResizeObserver(resize).observe(holder);resize();
    const draw = now => {
      frame=0;const dt=Math.min((now-last)/1000,.05);last=now;
      if(!paused)elapsed+=dt;
      const assembly=reduced.matches?1:Math.min(1,elapsed/2.1);
      const ease=1-Math.pow(1-assembly,3);
      seeds.children.forEach((c,i)=>{c.position.copy(base[i]);c.position.z+=(1-ease)*(.035+i%5*.005);c.scale.setScalar(.9+.1*ease);});
      fruit.rotation.y=Math.sin(elapsed*.42)*.13+pointerX*.12;
      fruit.rotation.x=Math.sin(elapsed*.31)*.045+pointerY*.07;
      fruit.position.y=Math.sin(elapsed*.7)*.045;
      renderer.render(scene,camera);
      if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(draw);
    };
    const kick=()=>{if(!frame){last=performance.now();frame=requestAnimationFrame(draw);}};
    const updateButton=()=>{toggle.textContent=paused?'Play motion':'Pause motion';toggle.setAttribute('aria-pressed',String(!paused));};
    toggle.addEventListener('click',()=>{paused=!paused;updateButton();kick();});
    holder.addEventListener('pointermove',e=>{if(paused||reduced.matches)return;const r=holder.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;});
    holder.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
    reduced.addEventListener('change',()=>{paused=reduced.matches;updateButton();kick();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick();});
    new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)kick();}).observe(holder);
    updateButton();kick();
  }
}
