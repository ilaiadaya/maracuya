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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5b3556, 2.7));
    const key = new THREE.DirectionalLight(0xfff4dc, 3.2); key.position.set(-3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xd2ddff, 2.5); rim.position.set(3, 1, -1); scene.add(rim);
    let state = 42;
    const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 512;
    const ctx = textureCanvas.getContext('2d');
    ctx.fillStyle = '#692e5e'; ctx.fillRect(0,0,512,512);
    for(let i=0;i<11000;i++) { ctx.fillStyle = `rgba(${90+random()*90},${20+random()*42},${55+random()*55},${.12+random()*.3})`; ctx.beginPath();ctx.ellipse(random()*512,random()*512,random()*3+.2,random()*2+.2,0,0,Math.PI*2);ctx.fill(); }
    const skinMap = new THREE.CanvasTexture(textureCanvas); skinMap.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({map:skinMap,bumpMap:skinMap,bumpScale:.045,roughness:.72});
    const pith = new THREE.MeshStandardMaterial({color:0xffead0,roughness:.75,side:THREE.DoubleSide});
    const pulp = new THREE.MeshStandardMaterial({color:0xf2a52f,roughness:.32,metalness:.03});
    const jelly = new THREE.MeshPhysicalMaterial({color:0xffc72f,roughness:.2,clearcoat:1,clearcoatRoughness:.18});
    const seedMaterial = new THREE.MeshStandardMaterial({color:0x302526,roughness:.25});
    const fruit = new THREE.Group(); scene.add(fruit);
    const whole = new THREE.Group(); whole.position.set(-.53,.12,-.34); whole.rotation.set(.2,-.4,-.3); fruit.add(whole);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(.91,48,32),skin); shell.scale.set(.97,1.08,1);whole.add(shell);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.13,10),new THREE.MeshStandardMaterial({color:0x6b6243,roughness:.9}));stem.position.y=.98;whole.add(stem);
    const half = new THREE.Group();half.position.set(.5,-.14,.37);half.rotation.set(-.17,-.26,.2);fruit.add(half);
    const bowlGeometry = new THREE.SphereGeometry(.88,48,32,0,Math.PI*2,0,Math.PI/2);bowlGeometry.rotateX(-Math.PI/2);
    const bowl = new THREE.Mesh(bowlGeometry,skin);half.add(bowl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.71,.875,64),pith);ring.position.z=.008;half.add(ring);
    const center = new THREE.Mesh(new THREE.CircleGeometry(.715,64),pulp);center.position.z=.015;half.add(center);
    const seeds = new THREE.Group();half.add(seeds);
    const jellyGeometry = new THREE.SphereGeometry(1,10,7);
    const seedGeometry = new THREE.SphereGeometry(1,8,6);
    // A deterministic spiral keeps the juicy cells distinct across the cut face.
    for(let i=0;i<96;i++) {
      const angle=i*2.39996;const radius=.645*Math.sqrt((i+.5)/96);
      const cell=new THREE.Group();cell.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.038+random()*.028);cell.rotation.z=angle;
      const sac=new THREE.Mesh(jellyGeometry,jelly);sac.scale.set(.065+random()*.013,.09+random()*.012,.054);cell.add(sac);
      const seed=new THREE.Mesh(seedGeometry,seedMaterial);seed.scale.set(.024,.04,.019);seed.position.z=.051;cell.add(seed);seeds.add(cell);
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
      seeds.children.forEach((c,i)=>{c.position.copy(base[i]);c.position.z+=(1-ease)*(.5+i%5*.08);c.scale.setScalar(.5+.5*ease);});
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
