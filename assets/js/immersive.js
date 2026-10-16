/* Spatial layer for THE_RAGHAV_RAMAN.
 * Browser-only; no build, backend, personal data, or project links invented.
 * Production HTTPS opportunistically upgrades to Three.js r170; a self-contained
 * WebGL renderer provides genuine 3D even when the CDN cannot be reached.
 * If WebGL fails entirely, the original decorative SVG remains visible.
 */
const documentBody = document.body;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hoverFine = window.matchMedia('(hover:hover) and (pointer:fine)');
const $ = (query, root = document) => root.querySelector(query);
const $$ = (query, root = document) => [...root.querySelectorAll(query)];
const hasMotion = () => !reducedMotion.matches && !documentBody.classList.contains('is-paused') && !document.hidden;
const TWO_PI = Math.PI * 2;

// Deliberately subtle reveals. Nothing depends on the JavaScript for visibility.
function activateSpatialDetails() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
  const elements = $$('.section-heading, .journey-item, .about-art, .process-layout, .contact-layout, .cert-search-row');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      target.classList.add('is-revealed');
      observer.unobserve(target);
    });
  }, {rootMargin:'0px 0px -5% 0px',threshold:.055});
  elements.forEach((el, index) => {
    // Avoid processing content off screen until intersection and avoid huge delays.
    el.classList.add('depth-init');
    observer.observe(el);
  });
}

function addCapabilitiesFlow() {
  const map = $('#systemsMap');
  if (!map) return;
  const svg = $('.map-lines', map);
  const svgNS = 'http://www.w3.org/2000/svg';
  const packetGroup = document.createElementNS(svgNS,'g');
  packetGroup.setAttribute('class','map-packets');
  packetGroup.setAttribute('aria-hidden','true');
  $$('[data-edge]', svg).forEach((path,i) => {
    const circle = document.createElementNS(svgNS,'circle');
    circle.setAttribute('r', i === 0 ? '4' : '3');
    circle.setAttribute('class','signal-dot');
    circle.setAttribute('data-packet',path.dataset.edge);
    const moving = document.createElementNS(svgNS,'animateMotion');
    moving.setAttribute('path',path.getAttribute('d'));
    moving.setAttribute('dur',`${3.1+i*.47}s`);
    moving.setAttribute('repeatCount','indefinite');
    moving.setAttribute('calcMode','linear');
    circle.append(moving);
    packetGroup.append(circle);
  });
  svg.append(packetGroup);
  const data = {
    data:['01','DATA / ETL','Ingest, transform and validate data before it becomes useful.'],
    retrieval:['02','AI / RETRIEVAL','Chunk, embed and retrieve relevant context for grounded answers.'],
    automation:['03','AUTOMATION','Orchestrate repeatable background jobs and event-driven workflows.'],
    production:['04','PRODUCTION','Bring APIs and AI services into observable, dependable systems.']
  };
  const insight = $('#mapInsight');
  const index = $('.signal-index', insight);
  const title = $('strong',insight);
  const copy = $('.signal-copy',insight);
  function update() {
    const selected = $('.map-node[aria-pressed="true"]',map)?.dataset.capability;
    const entry = data[selected] || ['—','CONNECTED SYSTEMS','Select any node to explore the engineering layers.'];
    index.textContent = entry[0];
    title.textContent = entry[1];
    copy.textContent = entry[2];
    $$('.signal-dot',svg).forEach(dot => dot.classList.toggle('is-selected',dot.dataset.packet === selected));
    updatePacketMotion();
  }
  let seen = true;
  let paused = false;
  function updatePacketMotion() {
    const play = seen && hasMotion() && !window.matchMedia('(max-width:640px)').matches;
    svg.classList.toggle('signals-active',play);
    if (typeof svg.pauseAnimations === 'function' && typeof svg.unpauseAnimations === 'function') {
      if (play && paused) { svg.unpauseAnimations();paused=false; }
      else if (!play && !paused) { svg.pauseAnimations();paused=true; }
    }
  }
  const mutations = new MutationObserver(update);
  $$('.map-node',map).forEach(node => mutations.observe(node,{attributes:true,attributeFilter:['aria-pressed']}));
  if ('IntersectionObserver' in window) new IntersectionObserver(e => {seen = e[0].isIntersecting;updatePacketMotion();},{threshold:0}).observe(map);
  document.addEventListener('visibilitychange',updatePacketMotion);
  reducedMotion.addEventListener('change',updatePacketMotion);
  new MutationObserver(updatePacketMotion).observe(documentBody,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',updatePacketMotion,{passive:true});
  update();
}

// Add an identical copy of the *existing* concept preview to the project dialog;
// we never fabricate screenshots or external project URLs.
function enrichProjectDialogs() {
  const dialog = $('#projectDialog');
  const heading = $('#dialogProjectTitle',dialog);
  if (!dialog || !heading) return;
  const visual = document.createElement('figure');
  visual.className = 'dialog-project-art';
  visual.setAttribute('aria-label','Project concept preview');
  $('.dialog-summary',dialog).insertAdjacentElement('afterend',visual);
  const cards = $$('.project-card');
  function sync() {
    const title = heading.textContent.trim();
    const card = cards.find(c => $('h3',c)?.textContent.trim() === title);
    const image = card && $('.project-preview img',card);
    if (image) {
      const clone = image.cloneNode(true);
      clone.loading = 'eager';
      clone.removeAttribute('id');
      visual.replaceChildren(clone);
      visual.hidden = false;
    } else {
      visual.hidden = true;
      visual.replaceChildren();
    }
  }
  new MutationObserver(sync).observe(heading,{childList:true,characterData:true,subtree:true});
}

/* ---------- Tiny, fully local WebGL renderer used if Three.js cannot load. --- */
const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform float uYaw;
uniform float uPitch;
uniform float uLift;
varying vec3 vNormal;
varying vec3 vEye;
vec3 rotX(vec3 v,float a){return vec3(v.x,cos(a)*v.y-sin(a)*v.z,sin(a)*v.y+cos(a)*v.z);}
vec3 rotY(vec3 v,float a){return vec3(cos(a)*v.x+sin(a)*v.z,v.y,-sin(a)*v.x+cos(a)*v.z);}
void main(){
 vec3 p=rotY(rotX(aPosition,uPitch),uYaw);
 vec3 n=rotY(rotX(aNormal,uPitch),uYaw);
 p.y+=uLift;
 vNormal=normalize(n);
 vEye=vec3(-p.x,-p.y,7.4-p.z);
 gl_Position=uProjection*vec4(p.x,p.y,p.z-7.4,1.0);
}`;
const FRAGMENT = `
precision mediump float;
uniform vec3 uColor;
uniform float uFinish;
varying vec3 vNormal;
varying vec3 vEye;
void main(){
 vec3 n=normalize(vNormal),eye=normalize(vEye);
 vec3 key=normalize(vec3(-.7,1.15,1.8));
 vec3 fill=normalize(vec3(1.3,-.6,.6));
 float light=max(dot(n,key),0.0);
 float bounce=max(dot(n,fill),0.0);
 float fresnel=pow(1.0-max(dot(n,eye),0.0),2.2);
 float highlight=pow(max(dot(reflect(-key,n),eye),0.0),uFinish)*.66;
 float second=pow(max(dot(reflect(-fill,n),eye),0.0),24.0)*.16;
 vec3 shade=uColor*(.42+.67*light+.21*bounce)+vec3(1.0,.95,.79)*(highlight+second)+fresnel*uColor*.28;
 gl_FragColor=vec4(clamp(shade,0.0,1.0),1.0);
}`;
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=v=>{const len=Math.hypot(...v)||1;return v.map(a=>a/len);};
function tubeFromCurve(curve,count,radial,radius) {
  const vertices=[],normals=[],indices=[];
  for(let i=0;i<=count;i++){
    const t=i/count;
    const center=curve(t),before=curve(t-.0001),after=curve(t+.0001);
    const tangent=normalize(after.map((v,j)=>v-before[j]));
    const axis=Math.abs(tangent[2])<.89?[0,0,1]:[0,1,0];
    const side=normalize(cross(tangent,axis));
    const up=normalize(cross(side,tangent));
    for(let j=0;j<=radial;j++){
      const theta=j/radial*TWO_PI,cs=Math.cos(theta),sn=Math.sin(theta);
      const normal=[side[0]*cs+up[0]*sn,side[1]*cs+up[1]*sn,side[2]*cs+up[2]*sn];
      normals.push(...normal);
      vertices.push(center[0]+normal[0]*radius,center[1]+normal[1]*radius,center[2]+normal[2]*radius);
    }
  }
  for(let i=0;i<count;i++)for(let j=0;j<radial;j++){
    const a=i*(radial+1)+j,b=a+radial+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  return {vertices:new Float32Array(vertices),normals:new Float32Array(normals),indices:new Uint16Array(indices)};
}
function knot(t) {
  const u=t*TWO_PI*2; // p=2, q=3, closed after two turns.
  const minor=u*1.5;
  const r=1.3+.34*Math.cos(minor);
  return [r*Math.cos(u),r*Math.sin(u),.57*Math.sin(minor)];
}
function ring(t,tilt,twist,r=1.85) {
  const u=t*TWO_PI;
  const x=r*Math.cos(u),y=r*Math.sin(u),z=0;
  const ty=y*Math.cos(tilt)-z*Math.sin(tilt),tz=y*Math.sin(tilt)+z*Math.cos(tilt);
  return [x*Math.cos(twist)+tz*Math.sin(twist),ty,-x*Math.sin(twist)+tz*Math.cos(twist)];
}
function sphere(radius, count=24, bands=14,center=[0,0,0]) {
  const vertices=[],normals=[],indices=[];
  for(let i=0;i<=bands;i++)for(let j=0;j<=count;j++){
    const v=i/bands*Math.PI,u=j/count*TWO_PI;
    const n=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];
    normals.push(...n);
    vertices.push(center[0]+radius*n[0],center[1]+radius*n[1],center[2]+radius*n[2]);
  }
  for(let i=0;i<bands;i++)for(let j=0;j<count;j++){
    const a=i*(count+1)+j,b=a+count+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  return {vertices:new Float32Array(vertices),normals:new Float32Array(normals),indices:new Uint16Array(indices)};
}
function makeLocalRenderer(canvas) {
  const gl = canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false,depth:true}) ||
             canvas.getContext('experimental-webgl',{alpha:true,antialias:true,depth:true});
  if (!gl) return null;
  let program=null;
  const meshBuffers=[];
  function shader(kind,source) {
    const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('WebGL shader: '+message);}
    return s;
  }
  try {
    program=gl.createProgram();
    const vs=shader(gl.VERTEX_SHADER,VERTEX),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL program: '+gl.getProgramInfoLog(program));
    const attrPosition=gl.getAttribLocation(program,'aPosition');
    const attrNormal=gl.getAttribLocation(program,'aNormal');
    const projectionLoc=gl.getUniformLocation(program,'uProjection');
    const yawLoc=gl.getUniformLocation(program,'uYaw');
    const pitchLoc=gl.getUniformLocation(program,'uPitch');
    const liftLoc=gl.getUniformLocation(program,'uLift');
    const colorLoc=gl.getUniformLocation(program,'uColor');
    const finishLoc=gl.getUniformLocation(program,'uFinish');
    const mobile=window.matchMedia('(max-width:640px)').matches;
    const detail=mobile?132:210,radial=mobile?10:13;
    const meshes=[
      [tubeFromCurve(knot,detail,radial,.23),[.81,.80,.64],33],
      [tubeFromCurve(t=>ring(t,.66,.22),144,9,.068),[.46,.57,.32],45],
      [tubeFromCurve(t=>ring(t,-.64,-.76,1.98),150,9,.052),[.76,.39,.23],58],
      [tubeFromCurve(t=>ring(t,.13,1.13,1.59),126,8,.037),[.65,.79,.46],45],
      [sphere(.34,22,14),[.71,.37,.23],50],
      [sphere(.098,13,9,[1.78,-.30,.30]),[.90,.85,.63],45],
      [sphere(.078,13,9,[-1.25,.71,-.70]),[.70,.40,.26],50]
    ];
    for(const [geo,color,finish] of meshes) {
      const pos=gl.createBuffer(),norm=gl.createBuffer(),idx=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,geo.vertices,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,norm);gl.bufferData(gl.ARRAY_BUFFER,geo.normals,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geo.indices,gl.STATIC_DRAW);
      meshBuffers.push({pos,norm,idx,count:geo.indices.length,color,finish});
    }
    gl.clearColor(0,0,0,0);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    let aspect=1;
    const projection=new Float32Array(16);
    return {
      kind:'local WebGL',
      resize() {
        const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
        const dpr=Math.min(window.devicePixelRatio||1,mobile?1.2:1.65);
        const width=Math.max(2,Math.round(r.width*dpr));const height=Math.max(2,Math.round(r.height*dpr));
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
        gl.viewport(0,0,width,height);
        aspect=width/height;
        const f=1/Math.tan(42*Math.PI/360),near=.1,far=60;
        projection.set([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
      },
      render(state) {
        if(gl.isContextLost())return;
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniformMatrix4fv(projectionLoc,false,projection);
        gl.uniform1f(yawLoc,state.yaw);gl.uniform1f(pitchLoc,state.pitch);gl.uniform1f(liftLoc,state.lift);
        gl.enableVertexAttribArray(attrPosition);gl.enableVertexAttribArray(attrNormal);
        for(const mesh of meshBuffers) {
          gl.bindBuffer(gl.ARRAY_BUFFER,mesh.pos);gl.vertexAttribPointer(attrPosition,3,gl.FLOAT,false,0,0);
          gl.bindBuffer(gl.ARRAY_BUFFER,mesh.norm);gl.vertexAttribPointer(attrNormal,3,gl.FLOAT,false,0,0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.idx);
          gl.uniform3fv(colorLoc,mesh.color);gl.uniform1f(finishLoc,mesh.finish);
          gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
        }
      },
      dispose() {
        meshBuffers.forEach(m=>{gl.deleteBuffer(m.pos);gl.deleteBuffer(m.norm);gl.deleteBuffer(m.idx);});
        if(program)gl.deleteProgram(program);
      }
    };
  } catch(error) {
    meshBuffers.forEach(m=>{gl.deleteBuffer(m.pos);gl.deleteBuffer(m.norm);gl.deleteBuffer(m.idx);});
    if(program)gl.deleteProgram(program);
    throw error;
  }
}

function makeThreeRenderer(THREE,canvas) {
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,60);
  camera.position.set(0,0,7.4);
  const webgl=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
  webgl.setClearColor(0x000000,0);
  webgl.outputColorSpace=THREE.SRGBColorSpace;
  webgl.toneMapping=THREE.ACESFilmicToneMapping;
  webgl.toneMappingExposure=1.23;
  const sculpture=new THREE.Group();scene.add(sculpture);
  const ivory=new THREE.MeshPhysicalMaterial({color:0xdedbbd,metalness:.52,roughness:.31,clearcoat:.92,clearcoatRoughness:.24});
  const sage=new THREE.MeshPhysicalMaterial({color:0x738952,metalness:.5,roughness:.31,clearcoat:.7});
  const copper=new THREE.MeshPhysicalMaterial({color:0xc37650,metalness:.63,roughness:.27,clearcoat:.88});
  const lime=new THREE.MeshPhysicalMaterial({color:0xb4d37e,metalness:.4,roughness:.4,clearcoat:.54});
  const add=(g,m)=>{const mesh=new THREE.Mesh(g,m);sculpture.add(mesh);return mesh;};
  const mobile=matchMedia('(max-width:640px)').matches;
  add(new THREE.TorusKnotGeometry(1.3,.23,mobile?160:245,mobile?10:16,2,3),ivory);
  const ring1=add(new THREE.TorusGeometry(1.85,.068,10,140),sage);ring1.rotation.set(.66,.22,0);
  const ring2=add(new THREE.TorusGeometry(1.98,.052,10,155),copper);ring2.rotation.set(-.64,-.76,0);
  const ring3=add(new THREE.TorusGeometry(1.59,.037,8,127),lime);ring3.rotation.set(.13,1.13,0);
  add(new THREE.SphereGeometry(.34,24,16),copper);
  const bead=add(new THREE.SphereGeometry(.097,14,10),ivory);bead.position.set(1.78,-.30,.30);
  const bead2=add(new THREE.SphereGeometry(.078,14,10),copper);bead2.position.set(-1.25,.71,-.7);
  scene.add(new THREE.HemisphereLight(0xfbffeb,0x6b7851,2.2));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,4,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xf4c6a2,1.3);fill.position.set(4,-3,3);scene.add(fill);
  return {
    kind:'Three.js r170',
    resize() {
      const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;
      camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
      webgl.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.2:1.65));
      webgl.setSize(r.width,r.height,false);
    },
    render(state) {sculpture.rotation.set(state.pitch,state.yaw,0);sculpture.position.y=state.lift;webgl.render(scene,camera);},
    dispose() {
      sculpture.traverse(object => {if(object.isMesh)object.geometry.dispose();});
      [ivory,sage,copper,lime].forEach(material=>material.dispose());
      webgl.dispose();
    }
  };
}

function activateHero() {
  const banner=$('#heroArt'),canvas=$('#heroCanvas'),status=$('#webglStatus');
  if(!banner||!canvas)return;
  let renderer=null,activeCanvas=canvas,seen=false,frame=0,last=0,elapsed=0;
  let targetYaw=.33,targetPitch=-.15,yaw=.33,pitch=-.15;
  let dragId=null,previousX=0,previousY=0,scrollAmount=0,destroyed=false;
  const state=()=>({yaw:yaw+scrollAmount*.08,pitch,lift:Math.sin(elapsed*.75)*.10});
  function renderOne(){if(!renderer)return;renderer.resize();renderer.render(state());}
  function stop(){if(frame){cancelAnimationFrame(frame);frame=0;}last=0;}
  function tick(now) {
    frame=0;
    if(!renderer||!seen||!hasMotion()||destroyed)return;
    const dt=last?Math.min((now-last)/1000,.052):.016;last=now;elapsed+=dt;
    yaw+=(targetYaw-yaw)*.048;
    pitch+=(targetPitch-pitch)*.048;
    yaw+=dt*.17;
    targetYaw+=dt*.17;
    renderer.render(state());
    frame=requestAnimationFrame(tick);
  }
  function updateLoop() {
    if(!renderer||destroyed)return;
    if(seen&&hasMotion()) {if(!frame)frame=requestAnimationFrame(tick);}
    else {stop();renderOne();}
  }
  const fallbackDescription=banner.getAttribute('aria-label');
  function markSuccess(kind){
    banner.setAttribute('aria-label','Work in progress artwork featuring a live 3D geometric sculpture with a sage grid, animated floating rings and a large hi greeting. Use the motion control below to pause it.');
    banner.classList.add('has-webgl');
    status.textContent=kind==='Three.js r170'?'LIVE 3D / THREE.JS':'LIVE 3D / WEBGL';
    updateLoop();
  }
  function markFallback() {
    banner.setAttribute('aria-label',fallbackDescription);
    banner.classList.remove('has-webgl');
    status.textContent='SVG ARTWORK / 3D UNAVAILABLE';
  }
  try {
    renderer=makeLocalRenderer(canvas);
    if(renderer){renderer.resize();renderer.render(state());markSuccess(renderer.kind);}
    else markFallback();
  } catch(error){
    // Failing WebGL is an expected browser/platform condition; show original SVG.
    console.warn('3D renderer unavailable; retaining original artwork.',error.message);
    markFallback();
  }
  const observer='IntersectionObserver' in window?
    new IntersectionObserver(e=>{seen=e[0].isIntersecting;updateLoop();},{threshold:.02}):null;
  if(observer)observer.observe(banner);else {seen=true;updateLoop();}
  const resizeObserver='ResizeObserver' in window ? new ResizeObserver(()=>{if(renderer)renderOne();}):null;
  resizeObserver?.observe(banner);
  window.addEventListener('resize',()=>renderOne(),{passive:true});
  document.addEventListener('visibilitychange',updateLoop);
  reducedMotion.addEventListener('change',updateLoop);
  new MutationObserver(updateLoop).observe(documentBody,{attributes:true,attributeFilter:['class']});
  banner.addEventListener('pointermove',event=>{
    if(!renderer||!hasMotion())return;
    const rect=banner.getBoundingClientRect();
    if(event.pointerType==='touch'){
      if(dragId!==event.pointerId)return;
      const dx=(event.clientX-previousX)/rect.width,dy=(event.clientY-previousY)/rect.height;
      targetYaw+=dx*2.2;targetPitch=Math.max(-.64,Math.min(.64,targetPitch+dy*1.1));
      previousX=event.clientX;previousY=event.clientY;
    } else if(hoverFine.matches && dragId===null) {
      targetYaw=.33+((event.clientX-rect.left)/rect.width-.5)*.57+elapsed*.17;
      targetPitch=-.15+((event.clientY-rect.top)/rect.height-.5)*.35;
    }
  },{passive:true});
  banner.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'&&hasMotion()) {dragId=event.pointerId;previousX=event.clientX;previousY=event.clientY;}
  },{passive:true});
  const endDrag=event=>{if(event.pointerId===dragId)dragId=null;};
  banner.addEventListener('pointerup',endDrag);
  banner.addEventListener('pointercancel',endDrag);
  banner.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'&&dragId===null){targetPitch=-.15;}});
  let scrollFrame=0;
  window.addEventListener('scroll',()=>{
    if(!seen||scrollFrame||!renderer||!hasMotion())return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;const rect=banner.getBoundingClientRect();scrollAmount=Math.max(-1,Math.min(1,(rect.top-window.innerHeight*.3)/window.innerHeight));});
  },{passive:true});
  // Remote upgrade only on deployed HTTPS: local development has zero network
  // requirements and never relies on a reachable CDN.
  async function optionalThreeUpgrade() {
    if(!renderer||location.protocol!=='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')return;
    try {
      const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
      if(destroyed||!renderer)return;
      const replacement=document.createElement('canvas');
      replacement.id='heroCanvas';replacement.className='hero-canvas';
      replacement.setAttribute('aria-hidden','true');
      replacement.setAttribute('aria-label','');
      // A fresh canvas avoids sharing raw WebGL programs with THREE.WebGLRenderer.
      activeCanvas.insertAdjacentElement('afterend',replacement);
      let next;
      try {next=makeThreeRenderer(THREE,replacement);next.resize();next.render(state());}
      catch(error){replacement.remove();return;}
      stop();renderer.dispose();
      activeCanvas.remove();activeCanvas=replacement;renderer=next;
      markSuccess(renderer.kind);
    } catch {
      // The embedded local renderer is intentional, fully interactive fallback.
    }
  }
  optionalThreeUpgrade();
  const handleContextLost=e=>{
    if(e.target!==activeCanvas)return;
    e.preventDefault();stop();renderer=null;markFallback();
  };
  banner.addEventListener('webglcontextlost',handleContextLost);
  banner.addEventListener('webglcontextrestored',()=>{
    if(destroyed||renderer)return;
    try{renderer=makeLocalRenderer(activeCanvas);if(renderer){renderOne();markSuccess(renderer.kind);}}
    catch{markFallback();}
  });
  window.addEventListener('pagehide',()=>{destroyed=true;stop();renderer?.dispose();renderer=null;resizeObserver?.disconnect();observer?.disconnect();});
  window.addEventListener('pageshow',e=>{if(e.persisted){destroyed=false;try{renderer=makeLocalRenderer(activeCanvas);if(renderer){renderOne();markSuccess(renderer.kind);}}catch{markFallback();}}});
}

activateSpatialDetails();
addCapabilitiesFlow();
enrichProjectDialogs();
activateHero();

// Text scramble layer; loaded separately so a failure there never affects the 3D layer.
import('./scramble.js').catch(() => {});
