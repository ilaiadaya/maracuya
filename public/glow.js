// Full-screen colour field that follows the pointer. Moving shifts the palette; standing still keeps
// spreading the same colours outward from where the pointer rests.
const canvas = document.createElement('canvas');
canvas.className = 'glow';
canvas.setAttribute('aria-hidden', 'true');
document.body.prepend(canvas);
const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
if (gl) {
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
uniform vec2 r;uniform vec2 m;uniform float t;uniform vec3 a;uniform vec3 b;uniform vec3 c;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,s=.5;for(int i=0;i<5;i++){v+=s*n(p);p=p*2.03+vec2(1.7,9.2);s*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r.y, mp=m/r.y;
  vec2 d=uv-mp; float dist=length(d);
  vec2 q=vec2(fbm(uv*1.6+t*.05),fbm(uv*1.6-t*.04+3.1));
  float warp=fbm(uv*1.2+q*2.2+t*.03);
  float wave=sin(dist*7.-t*1.1+warp*5.)*.5+.5;
  float w2=sin(dist*4.3-t*.7+q.x*6.)*.5+.5;
  vec3 col=mix(a,b,wave); col=mix(col,c,w2*.55);
  float glow=exp(-dist*1.15)*.75+.25;
  vec3 base=vec3(.969,.961,.937);
  gl_FragColor=vec4(mix(base,col,glow*(.55+.25*warp)),1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = k => gl.getUniformLocation(pr, k);
  const [ur, um, ut, ua, ub, uc] = ['r', 'm', 't', 'a', 'b', 'c'].map(U);
  const hsl = (h, s, l) => { const k = n => (n + h * 12) % 12, f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0), f(8), f(4)]; };
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; canvas.width = Math.round(W * dpr * .5); canvas.height = Math.round(H * dpr * .5); gl.viewport(0, 0, canvas.width, canvas.height); };
  addEventListener('resize', size); size();
  let tx = W / 2, ty = H * .45, x = tx, y = ty, hue = .82, moved = 0;
  const move = (cx, cy) => { moved += Math.hypot(cx - tx, cy - ty); tx = cx; ty = cy; };
  addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const p = e.touches[0]; if (p) move(p.clientX, p.clientY); }, { passive: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0, last = performance.now();
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    t += reduced ? 0 : dt;
    x += (tx - x) * Math.min(1, dt * 6); y += (ty - y) * Math.min(1, dt * 6);
    hue = (hue + moved * .00035) % 1; moved = 0;
    gl.uniform2f(ur, canvas.width, canvas.height);
    gl.uniform2f(um, x * canvas.width / W, (H - y) * canvas.height / H);
    gl.uniform1f(ut, t);
    gl.uniform3fv(ua, hsl(hue, .75, .72)); gl.uniform3fv(ub, hsl((hue + .12) % 1, .8, .66)); gl.uniform3fv(uc, hsl((hue + .55) % 1, .7, .78));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
