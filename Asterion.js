// Asterion.js — single-file JavaScript engine skeleton (WebGL2)
// Drop this file next to index.html and import it as a module.

/////////////////////////////////////////////////////
// Platform
/////////////////////////////////////////////////////
const Platform = (function(){
  class Window {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
      if (!gl) throw new Error('WebGL2 not available');
      this.gl = gl;
      this.width = 0; this.height = 0; this.dpr = 1;
      this.keys = new Set();
      this.pointer = { x:0, y:0, dx:0, dy:0, down:false };
      this.time = { nowMs: 0, dtMs: 16.6, frame: 0 };
      this.rafHandle = 0;
      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());
      window.addEventListener('keydown', e => this.keys.add(e.key));
      window.addEventListener('keyup', e => this.keys.delete(e.key));
      canvas.addEventListener('pointerdown', () => (this.pointer.down = true));
      window.addEventListener('pointerup', () => (this.pointer.down = false));
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        const nx = (e.clientX - r.left) * this.dpr;
        const ny = (e.clientY - r.top) * this.dpr;
        this.pointer.dx = nx - this.pointer.x;
        this.pointer.dy = ny - this.pointer.y;
        this.pointer.x = nx; this.pointer.y = ny;
      });
    }
    handleResize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(this.canvas.clientWidth * this.dpr) || Math.floor(window.innerWidth * this.dpr);
      const h = Math.floor(this.canvas.clientHeight * this.dpr) || Math.floor(window.innerHeight * this.dpr);
      if (w !== this.width || h !== this.height) {
        this.width = w; this.height = h;
        this.canvas.width = w; this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    }
    frameLoop(cb) {
      const step = (ts) => {
        const dt = this.time.nowMs === 0 ? 16.6 : Math.min(50, ts - this.time.nowMs);
        this.time = { nowMs: ts, dtMs: dt, frame: this.time.frame + 1 };
        cb(this.time);
        this.rafHandle = requestAnimationFrame(step);
      };
      this.rafHandle = requestAnimationFrame(step);
    }
    stopLoop() { cancelAnimationFrame(this.rafHandle); }
  }

  class VFS {
    constructor() { this.files = new Map(); this.onChange = []; }
    write(path, bytes) { this.files.set(path, { path, bytes, mtime: performance.now() }); this.onChange.forEach(f => f(path)); }
    writeText(path, text) { this.write(path, new TextEncoder().encode(text)); }
    read(path) { return this.files.get(path) ? this.files.get(path).bytes : undefined; }
    readText(path) { const b = this.read(path); return b ? new TextDecoder().decode(b) : undefined; }
    exists(path) { return this.files.has(path); }
    list(prefix = '') { return [...this.files.keys()].filter(k => k.startsWith(prefix)); }
  }

  class Timers { constructor(){ this.map = new Map(); } start(k){ this.map.set(k, performance.now()); } end(k){ const t = this.map.get(k) ?? performance.now(); return performance.now() - t; } }

  return { Window, VFS, Timers };
})();

/////////////////////////////////////////////////////
// Core
/////////////////////////////////////////////////////
const Core = (function(){
  const EPS = 1e-6;

  class Arena {
    constructor(bytes = 1<<20) { this.buffer = new ArrayBuffer(bytes); this.view = new DataView(this.buffer); this.offset = 0; }
    alloc(size) { const o = this.offset; this.offset = (this.offset + size + 7) & ~7; if(this.offset > this.buffer.byteLength) throw new Error('Arena OOM'); return o; }
    u8(){ return new Uint8Array(this.buffer); }
    reset(){ this.offset = 0; }
  }

  class Pool {
    constructor(){ this.store = []; this.free = []; }
    create(make){ const idx = this.free.pop(); if(idx !== undefined){ this.store[idx] = make(); return idx; } const i = this.store.length; this.store.push(make()); return i; }
    get(i){ return this.store[i]; }
    destroy(i){ this.store[i] = null; this.free.push(i); }
    *entries(){ for(let i=0;i<this.store.length;i++){ const v=this.store[i]; if(v!=null) yield [i,v]; } }
  }

  // Math helpers
  const v3 = (x=0,y=0,z=0) => [x,y,z];
  const qIdentity = () => [0,0,0,1];
  const m4Identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

  function m4Mul(a,b){ const o=new Float32Array(16); for(let r=0;r<4;r++) for(let c=0;c<4;c++){ o[r*4+c]=a[r*4+0]*b[0*4+c]+a[r*4+1]*b[1*4+c]+a[r*4+2]*b[2*4+c]+a[r*4+3]*b[3*4+c]; } return o; }
  function m4FromTRS(t,r,s){ const [x,y,z,w]=r; const [sx,sy,sz]=s; const x2=x+x, y2=y+y, z2=z+z; const xx=x*x2, yy=y*y2, zz=z*z2; const xy=x*y2, xz=x*z2, yz=y*z2; const wx=w*x2, wy=w*y2, wz=w*z2; const out=m4Identity(); out[0]=(1-(yy+zz))*sx; out[1]=(xy+wz)*sx; out[2]=(xz-wy)*sx; out[4]=(xy-wz)*sy; out[5]=(1-(xx+zz))*sy; out[6]=(yz+wx)*sy; out[8]=(xz+wy)*sz; out[9]=(yz-wx)*sz; out[10]=(1-(xx+yy))*sz; out[12]=t[0]; out[13]=t[1]; out[14]=t[2]; return out; }
  function qMul(a,b){ const [ax,ay,az,aw]=a,[bx,by,bz,bw]=b; return [aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz]; }
  function qFromAxisAngle(axis,ang){ const s=Math.sin(ang/2); return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(ang/2)]; }
  function m4Perspective(fovY,aspect,near,far){ const f=1/Math.tan(fovY/2); const nf=1/(near-far); const o=new Float32Array(16); o[0]=f/aspect; o[5]=f; o[10]=(far+near)*nf; o[11]=-1; o[14]=2*far*near*nf; return o; }
  function m4LookAt(eye,center,up){ let [ex,ey,ez]=eye,[cx,cy,cz]=center,[ux,uy,uz]=up; let zx=ex-cx, zy=ey-cy, zz=ez-cz; const zl=1/Math.hypot(zx,zy,zz); zx*=zl; zy*=zl; zz*=zl; let xx=uy*zz-uz*zy, xy=uz*zx-ux*zz, xz=ux*zy-uy*zx; const xl=1/Math.hypot(xx,xy,xz); xx*=xl; xy*=xl; xz*=xl; const yx=zy*xz-zz*xx, yy=zz*xy-zx*xz, yz=zx*xx-zy*xy; const o=m4Identity(); o[0]=xx; o[1]=yx; o[2]=zx; o[4]=xy; o[5]=yy; o[6]=zy; o[8]=xz; o[9]=yz; o[10]=zz; o[12]=-(xx*ex+xy*ey+xz*ez); o[13]=-(yx*ex+yy*ey+yz*ez); o[14]=-(zx*ex+zy*ey+zz*ez); return o; }

  // Job system (simple)
  class JobSystem {
    constructor(){ this.queue = []; this.running = new Set(); this.done = new Set(); }
    add(job){ this.queue.push(job); }
    async runAll(){
      const outstanding = new Map(this.queue.map(j => [j.name, j]));
      const tryRun = async () => {
        for(const [name, job] of Array.from(outstanding)) {
          if (this.running.has(name) || this.done.has(name)) continue;
          if (job.deps && job.deps.some(d => !this.done.has(d))) continue;
          this.running.add(name);
          await job.run();
          this.done.add(name); this.running.delete(name); outstanding.delete(name);
        }
      };
      while(outstanding.size) await tryRun();
    }
  }

  const JSONSerialize = (o)=>JSON.stringify(o);
  const JSONDeserialize = (s)=>JSON.parse(s);

  const Log = (...a)=>console.log('[Asterion]',...a);
  class Profiler { constructor(){ this.marks = new Map(); } begin(x){ this.marks.set(x, performance.now()); } end(x){ const t=this.marks.get(x); if(t!=null){ const d=performance.now()-t; Log(`⏱ ${x}: ${d.toFixed(2)}ms`); this.marks.delete(x);} } }

  return { Arena, Pool, v3, qIdentity, m4Identity, m4Mul, m4FromTRS, qMul, qFromAxisAngle, m4Perspective, m4LookAt, JobSystem, JSONSerialize, JSONDeserialize, Log, Profiler, EPS };
})();

/////////////////////////////////////////////////////
// Resource
/////////////////////////////////////////////////////
const Resource = (function(){
  const { Log } = Core;
  class HandleTable {
    constructor(){ this.pool = new Core.Pool(); }
    create(v){ return this.pool.create(()=>({ref:1,value:v})); }
    addRef(h){ this.pool.get(h).ref++; }
    release(h){ const e=this.pool.get(h); if(--e.ref<=0) this.pool.destroy(h); }
    get(h){ return this.pool.get(h).value; }
  }
  class Assets {
    constructor(vfs){ this.vfs = vfs; }
    async importText(path, fetcher){ const t = await fetcher(); this.vfs.writeText(path, t); return path; }
    async importBinary(path, fetcher){ const b = new Uint8Array(await fetcher()); this.vfs.write(path, b); return path; }
  }
  class HotReload { constructor(vfs){ vfs.onChange.push((p)=>Log('HotReload:',p)); } }

  return { HandleTable, Assets, HotReload };
})();

/////////////////////////////////////////////////////
// Scene (ECS)
/////////////////////////////////////////////////////
const Scene = (function(){
  const { v3, qIdentity, m4Identity, m4FromTRS } = Core;
  class ECS {
    constructor(){ this.next = 1; this.alive = new Set(); this.transforms = new Map(); this.cameras = new Map(); this.renderables = new Map(); this.lights = new Map(); this.rigidbodies = new Map(); }
    create(){ const e=this.next++; this.alive.add(e); return e; }
    destroy(e){ this.alive.delete(e); this.transforms.delete(e); this.cameras.delete(e); this.renderables.delete(e); this.lights.delete(e); this.rigidbodies.delete(e); }
    *entities(){ for(const e of this.alive) yield e; }
  }
  function Systems_updateTransforms(ecs) {
    for(const [e,t] of ecs.transforms){ t.world = m4FromTRS(t.position, t.rotation, t.scale); }
  }

  return { ECS, Systems_updateTransforms };
})();

/////////////////////////////////////////////////////
// Render
/////////////////////////////////////////////////////
const Render = (function(){
  function makeShader(gl, type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error');
    return s;
  }

  class WebGL2Backend {
    constructor(gl){ this.gl = gl; }
    resize(w,h){ this.gl.viewport(0,0,w,h); }
    beginFrame(clear){ const g=this.gl; g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.clearDepth(1.0); g.disable(g.CULL_FACE); g.clearColor(clear[0],clear[1],clear[2],clear[3]); g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT); }
    endFrame(){}
    createMesh(verts, indices){
      const g=this.gl; const vao=g.createVertexArray(); g.bindVertexArray(vao);
      const vbo=g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vbo); g.bufferData(g.ARRAY_BUFFER, verts, g.STATIC_DRAW);
      const ibo=g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo); g.bufferData(g.ELEMENT_ARRAY_BUFFER, indices, g.STATIC_DRAW);
      const stride = 8*4;
      g.enableVertexAttribArray(0); g.vertexAttribPointer(0,3,g.FLOAT,false,stride,0);
      g.enableVertexAttribArray(1); g.vertexAttribPointer(1,3,g.FLOAT,false,stride,3*4);
      g.enableVertexAttribArray(2); g.vertexAttribPointer(2,2,g.FLOAT,false,stride,6*4);
      g.bindVertexArray(null);
      return { vao, vbo, ibo, count: indices.length };
    }
    createProgram(vs, fs){
      const g=this.gl;
      const prog = g.createProgram();
      g.attachShader(prog, makeShader(g, g.VERTEX_SHADER, vs));
      g.attachShader(prog, makeShader(g, g.FRAGMENT_SHADER, fs));
      // NOTE: Removed bindAttribLocation calls because shaders use layout(location=...) — binding manually here can cause attribute mismatch.
      g.linkProgram(prog);
      if(!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog)||'link error');
      const uniforms = {};
      ['u_view','u_proj','u_model','u_color','u_lightDir','u_camPos'].forEach(n=> uniforms[n] = g.getUniformLocation(prog, n));
      return { prog, uniforms };
    }
    draw(mesh, program, uniforms){
      const g=this.gl; g.useProgram(program.prog); g.bindVertexArray(mesh.vao);
      const setMat4=(loc, m)=>{ if(loc !== null) g.uniformMatrix4fv(loc,false,m); };
      const setVec3=(loc, v)=>{ if(loc !== null) g.uniform3fv(loc, v); };
      const setVec4=(loc, v)=>{ if(loc !== null) g.uniform4fv(loc, v); };
      setMat4(program.uniforms['u_view'], uniforms['u_view']);
      setMat4(program.uniforms['u_proj'], uniforms['u_proj']);
      setMat4(program.uniforms['u_model'], uniforms['u_model']);
      setVec4(program.uniforms['u_color'], uniforms['u_color'] ?? [1,1,1,1]);
      setVec3(program.uniforms['u_lightDir'], uniforms['u_lightDir'] ?? [0.5,1,0.3]);
      setVec3(program.uniforms['u_camPos'], uniforms['u_camPos'] ?? [0,0,5]);
      g.drawElements(g.TRIANGLES, mesh.count, g.UNSIGNED_SHORT, 0);
      g.bindVertexArray(null);
    }
  }

  class FrameGraph {
    constructor(){ this.passes = []; }
    add(p){ this.passes.push(p); }
    run(){ for(const p of this.passes) p.execute(); this.passes.length=0; }
  }

  const LitVS = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nrm; layout(location=2) in vec2 a_uv;
    uniform mat4 u_view, u_proj, u_model; out vec3 vN; out vec3 vWPos; out vec2 vUv;
    void main(){ vec4 wpos = u_model * vec4(a_pos,1.0); vWPos = wpos.xyz; vN = mat3(u_model) * a_nrm; vUv = a_uv; gl_Position = u_proj * u_view * wpos; }
  `;

  const LitFS = `#version 300 es
    precision highp float; in vec3 vN; in vec3 vWPos; in vec2 vUv; out vec4 o;
    uniform vec4 u_color; uniform vec3 u_lightDir; uniform vec3 u_camPos;
    void main(){
      vec3 N = normalize(vN); vec3 L = normalize(u_lightDir); vec3 V = normalize(u_camPos - vWPos); vec3 H = normalize(L+V);
      float ndl = max(dot(N,L), 0.0); float ndh = max(dot(N,H), 0.0);
      float spec = pow(ndh, 32.0);
      vec3 base = u_color.rgb; vec3 col = base*(0.1 + 0.9*ndl) + spec*0.25;
      o = vec4(col, u_color.a);
    }
  `;

  function makeCube(size=1){
    const s=size/2;
    const P = [
      -s,-s, s, 0,0,1, 0,0,  s,-s, s, 0,0,1, 1,0,  s, s, s, 0,0,1, 1,1,  -s, s, s, 0,0,1, 0,1,
      -s,-s,-s, 0,0,-1, 1,0, -s, s,-s, 0,0,-1, 1,1,  s, s,-s, 0,0,-1, 0,1,  s,-s,-s, 0,0,-1, 0,0,
      -s,-s,-s, -1,0,0, 0,0, -s,-s, s, -1,0,0, 1,0, -s, s, s, -1,0,0, 1,1, -s, s,-s, -1,0,0, 0,1,
       s,-s,-s, 1,0,0, 1,0,  s, s,-s, 1,0,0, 1,1,  s, s, s, 1,0,0, 0,1,  s,-s, s, 1,0,0, 0,0,
      -s, s,-s, 0,1,0, 0,0, -s, s, s, 0,1,0, 0,1,  s, s, s, 0,1,0, 1,1,  s, s,-s, 0,1,0, 1,0,
      -s,-s,-s, 0,-1,0, 1,1,  s,-s,-s, 0,-1,0, 0,1,  s,-s, s, 0,-1,0, 0,0,  -s,-s, s, 0,-1,0, 1,0
    ];
    const I = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23];
    return { verts: new Float32Array(P), indices: new Uint16Array(I) };
  }

  return { WebGL2Backend, FrameGraph, LitVS, LitFS, makeCube };
})();

/////////////////////////////////////////////////////
// Physics (simple 3D spheres)
/////////////////////////////////////////////////////
const Physics = (function(){
  function v3(x=0,y=0,z=0){ return [x,y,z]; }
  class World {
    constructor(){ this.bodies = []; this.gravity = [0,-9.8,0]; }
    add(b){ this.bodies.push(b); }
    step(dt){
      for(const b of this.bodies){ if(b.invMass>0){ b.vel[0]+=this.gravity[0]*dt/1000; b.vel[1]+=this.gravity[1]*dt/1000; b.vel[2]+=this.gravity[2]*dt/1000; b.pos[0]+=b.vel[0]*dt/1000; b.pos[1]+=b.vel[1]*dt/1000; b.pos[2]+=b.vel[2]*dt/1000; } }
      for(let i=0;i<this.bodies.length;i++) for(let j=i+1;j<this.bodies.length;j++){
        const a=this.bodies[i], b=this.bodies[j];
        const dx=b.pos[0]-a.pos[0], dy=b.pos[1]-a.pos[1], dz=b.pos[2]-a.pos[2];
        const d=Math.hypot(dx,dy,dz), r=a.radius+b.radius; if(d<r && d>1e-5){
          const nx=dx/d, ny=dy/d, nz=dz/d; const pen=r-d; const totalInv=a.invMass+b.invMass; if(totalInv>0){
            const corr=pen/totalInv; a.pos[0]-=nx*corr*a.invMass; a.pos[1]-=ny*corr*a.invMass; a.pos[2]-=nz*corr*a.invMass; b.pos[0]+=nx*corr*b.invMass; b.pos[1]+=ny*corr*b.invMass; b.pos[2]+=nz*corr*b.invMass;
            const rel=(a.vel[0]-b.vel[0])*nx+(a.vel[1]-b.vel[1])*ny+(a.vel[2]-b.vel[2])*nz; const impulse=-(1.2)*rel/(totalInv);
            a.vel[0]+=impulse*nx*a.invMass; a.vel[1]+=impulse*ny*a.invMass; a.vel[2]+=impulse*nz*a.invMass;
            b.vel[0]-=impulse*nx*b.invMass; b.vel[1]-=impulse*ny*b.invMass; b.vel[2]-=impulse*nz*b.invMass;
          }
        }
      }
    }
  }
  return { World };
})();

/////////////////////////////////////////////////////
// Audio (tiny)
/////////////////////////////////////////////////////
const AudioSys = (function(){
  class Mixer {
    constructor(){ this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination); }
    tone(freq=440, time=0.2){ const o=this.ctx.createOscillator(); const g=this.ctx.createGain(); o.frequency.value=freq; o.connect(g); g.connect(this.master); g.gain.setValueAtTime(0.2, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime+time); o.start(); o.stop(this.ctx.currentTime+time); }
  }
  return { Mixer };
})();

/////////////////////////////////////////////////////
// Scripting (JS hooks)
/////////////////////////////////////////////////////
const Scripting = (function(){ class VM { constructor(){ this.scripts = []; } add(s){ this.scripts.push(s); } start(){ for(const s of this.scripts) s.onStart && s.onStart(); } update(dt){ for(const s of this.scripts) s.onUpdate && s.onUpdate(dt); } } return { VM }; })();

/////////////////////////////////////////////////////
// Tools (dev console)
/////////////////////////////////////////////////////
const Tools = (function(){
  class DevConsole {
    constructor(){ this.visible=false; this.el=document.createElement('div'); Object.assign(this.el.style,{ position:'fixed', bottom:'8px', left:'8px', background:'#111', color:'#0f0', padding:'8px', font:'12px/1.4 monospace', borderRadius:'8px', maxWidth:'40vw', maxHeight:'30vh', overflow:'auto', opacity:'0.9' }); this.el.textContent='DevConsole — press ` to toggle'; document.body.appendChild(this.el); window.addEventListener('keydown', e=>{ if(e.key==='`'){ this.visible=!this.visible; this.el.style.display=this.visible?'block':'none'; }}); this.el.style.display='none'; }
    log(...a){ this.el.appendChild(document.createElement('div')).textContent=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(...a); }
  }
  return { DevConsole };
})();

/////////////////////////////////////////////////////
// Tests
/////////////////////////////////////////////////////
const Tests = (function(){ function sanity(){ if(!(window).WebGL2RenderingContext) throw new Error('WebGL2 not supported'); } return { sanity }; })();

/////////////////////////////////////////////////////
// Engine bootstrap
/////////////////////////////////////////////////////
const EngineApp = (function(){
  const { Window, VFS } = Platform;
  const { Assets, HotReload } = Resource;
  const { ECS, Systems_updateTransforms } = Scene;
  const { WebGL2Backend, FrameGraph, LitVS, LitFS, makeCube } = Render;
  const { m4Perspective, m4LookAt, v3, qFromAxisAngle, m4FromTRS } = Core;

  class Engine {
    constructor(canvas){
      this.win = new Window(canvas);
      this.vfs = new VFS();
      this.assets = new Assets(this.vfs);
      this.hot = new HotReload(this.vfs);
      this.ecs = new ECS();
      this.renderer = new WebGL2Backend(this.win.gl);
      this.fg = new FrameGraph();
      this.programs = null;
      this.mesh = null;
      this.material = { color: [0.9,0.4,0.3,1] };
      this.physics = new Physics.World();
      this.audio = new AudioSys.Mixer();
      this.vm = new Scripting.VM();
      this.console = new Tools.DevConsole();
    }
    async init(){
      Tests.sanity();
      this.programs = this.renderer.createProgram(LitVS, LitFS);
      const { verts, indices } = makeCube(1);
      this.mesh = this.renderer.createMesh(verts, indices);

      const eCam = this.ecs.create();
      this.ecs.transforms.set(eCam, { position:v3(0,1.2,3), rotation:qFromAxisAngle([0,1,0],0), scale:v3(1,1,1), world:m4FromTRS([0,0,0],qFromAxisAngle([0,0,1],0),[1,1,1]) });
      this.ecs.cameras.set(eCam, { fovY: Math.PI/3, near: 0.1, far: 100, aspect: 1, view: m4FromTRS([0,0,0],qFromAxisAngle([0,0,0],0),[1,1,1]), proj: m4FromTRS([0,0,0],qFromAxisAngle([0,0,0],0),[1,1,1]) });

      const eCube = this.ecs.create();
      this.ecs.transforms.set(eCube, { position:v3(0,0,0), rotation:qFromAxisAngle([0,1,0],0), scale:v3(1,1,1), world:m4Identity() });
      this.ecs.renderables.set(eCube, { mesh: this.mesh, material: this.material, bounds: { min: v3(-0.5,-0.5,-0.5), max: v3(0.5,0.5,0.5) } });

      this.physics.add({ pos: v3(0,2,0), vel: v3(0,0,0), invMass: 1, radius: 0.5 });

      this.vm.add({ onUpdate: (dt)=>{ const t = this.ecs.transforms.get(eCube); if(t){ const ang = this.win.time.nowMs/1000; t.rotation = qFromAxisAngle([0,1,0], ang); } } });
      this.vm.start();

      await this.assets.importText('shaders/lit.fs', async()=>LitFS);
    }

    update(dtMs){
      const camEnt = [...this.ecs.cameras.keys()][0];
      const cam = this.ecs.cameras.get(camEnt);
      const tcam = this.ecs.transforms.get(camEnt);
      if(cam && tcam){
        cam.aspect = this.win.width / Math.max(1, this.win.height); cam.proj = m4Perspective(cam.fovY, cam.aspect, cam.near, cam.far);
        cam.view = m4LookAt(tcam.position, [0,0,0], [0,1,0]);
      }

      Systems_updateTransforms(this.ecs);
      this.vm.update(dtMs);
      this.physics.step(dtMs);

      const body = this.physics.bodies[0];
      const cube = [...this.ecs.renderables.keys()][0];
      const tc = this.ecs.transforms.get(cube);
      if(tc && body) tc.position[1] = body.pos[1];

      this.fg.add({ name: 'forward', execute: ()=>{
        this.renderer.beginFrame([0.05,0.06,0.08,1]);
        for(const [e, r] of this.ecs.renderables){
          const t = this.ecs.transforms.get(e);
          this.renderer.draw(r.mesh, this.programs, { u_view: cam.view, u_proj: cam.proj, u_model: m4FromTRS(t.position, t.rotation, t.scale), u_color: r.material.color, u_camPos: tcam.position, u_lightDir: [0.4,1,0.2] });
        }
        this.renderer.endFrame();
      }});
      this.fg.run();
    }

    run(){
      this.win.frameLoop((t)=>{ this.update(t.dtMs); });
    }
  }

  // basic identity for m4FromTRS fallback
  function m4Identity(){ return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }

  return { Engine };
})();

/////////////////////////////////////////////////////
// Entry
/////////////////////////////////////////////////////
export async function startAsterion(){
  let canvas = document.getElementById('game');
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.id='game';
    canvas.style.position='fixed';
    canvas.style.inset='0';
    canvas.style.width='100vw';
    canvas.style.height='100vh';
    document.body.appendChild(canvas);
  }
  const engine = new EngineApp.Engine(document.getElementById('game'));
  await engine.init();
  engine.run();
  window.engine = engine;
}

// Auto-boot if loaded in a page
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // do NOT auto-start if user will import manually; but if loaded directly, boot
    // only auto-start if this module is directly referenced; safe to call:
    // startAsterion(); (we won't auto-call to avoid double-run when imported)
  });
}