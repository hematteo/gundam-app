import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {OutlineEffect} from 'three/addons/effects/OutlineEffect.js';
import {finishArmor,finishHangar,createHangarReflections,addBootContacts,illumination} from './anime-look.js';
import {ARRIVAL_SECONDS,DEPLOYMENT_SECONDS,clamp01,phase,arrivalState,wingState} from './experience-timing.js';
import {createDockingRig} from './docking.js';
import {setupImmersiveUI} from './immersive-ui.js';
import {renderResolution,improveTextureFiltering} from './render-quality.js';
import {createFlight} from './flight.js?v=carrier-view-6';
import {createSpaceEnvironment} from './space-environment.js?v=carrier-view-6';

const canvas=document.querySelector('#hangar');
const hud=setupImmersiveUI(canvas);
const loading=document.querySelector('#loading');
const progress=document.querySelector('#load-progress');
const live=document.querySelector('#announcement');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x10141d);
scene.fog=new THREE.FogExp2(0x26324b,.028);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
const gl=renderer.getContext();
const maxRenderDimension=Math.min(renderer.capabilities.maxTextureSize,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
const coarsePointer=matchMedia('(pointer: coarse)');
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// The static bay only needs new shadow maps while wings or lights are moving.
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
const ink=new OutlineEffect(renderer,{defaultThickness:.00115,defaultColor:[.009,.016,.035],defaultKeepAlive:true});
ink.autoClear=true;
const camera=new THREE.PerspectiveCamera(35,1,.025,1400);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.enablePan=false;controls.minDistance=1.0;controls.maxDistance=9;
controls.minPolarAngle=.48;controls.maxPolarAngle=1.63;
controls.minAzimuthAngle=-1.18;controls.maxAzimuthAngle=1.18;
controls.rotateSpeed=.42;controls.zoomSpeed=.62;
controls.listenToKeyEvents(canvas);
const env=createHangarReflections(renderer);
scene.environment=env.texture;
scene.environmentIntensity=.45;

const hemi=new THREE.HemisphereLight(0x90a8e9,0x161a2f,.32);scene.add(hemi);
const serviceLights=[],workEmissives=new Set(),sensorMaterials=new Set();
function spot(color,intensity,position,target,angle=.70,shadow=false,bank='work'){
  const light=new THREE.SpotLight(color,intensity,18,angle,.6,2);
  light.position.set(...position);light.target.position.set(...target);
  light.castShadow=shadow;
  if(shadow){light.shadow.mapSize.set(2048,2048);light.shadow.bias=-.00006;light.shadow.normalBias=.003;light.shadow.radius=2;light.shadow.camera.near=.2;light.shadow.camera.far=15;}
  light.userData.fullIntensity=intensity;light.userData.bank=bank;scene.add(light,light.target);serviceLights.push(light);return light;
}
const keyLight=spot(0xffefd8,76,[1.48,4.64,.30],[0,1.15,0],.68,true);
spot(0x9cb4ff,12,[-2.58,4.64,.30],[0,1.55,0],.76);
spot(0x9bddff,52,[0,4.3,-2.2],[0,1.6,0],.65,false,'rear');
spot(0xffcc8e,8,[-2.5,2.1,3.2],[0,1.6,0],.8);
for(const x of [-3.95,3.95])for(const z of [-2.1,.3,2.7,5.1]){
  const light=new THREE.PointLight(0xaac3ff,3.5,4.2,2);light.position.set(x,3.72,z);
  light.userData.fullIntensity=3.5;light.userData.bank=z>2?'approach':z<0?'rear':'work';scene.add(light);serviceLights.push(light);
}
const passageLight=new THREE.PointLight(0xffcf95,1.5,3.4,2);passageLight.position.set(3.72,.6,-4.6);scene.add(passageLight);
const neighborLight=new THREE.PointLight(0x899dd1,5,5.5,2);neighborLight.position.set(-6.15,3,-.2);scene.add(neighborLight);
const fill=new THREE.DirectionalLight(0xb5cbff,.30);fill.position.set(-3,2,6);scene.add(fill);

const presets={
  overview:{position:[2.85,1.58,6.65],target:[0,1.48,0]},
  cockpit:{position:[1.10,2.22,2.15],target:[0,1.94,0]},
  walkway:{position:[-2.85,1.82,2.5],target:[0,1.70,0]},
};
let currentView='overview',transition=null,loaded=false,flight=null,space=null;
const bayColor=new THREE.Color(0x10141d),spaceColor=new THREE.Color(0x02050d);
let wings=[],deployed=false,wingProgress=0,workLights=true,lightLevel=1,docking=null;
let arrivalActive=false,arrivalElapsed=0,arrivalPath=null,arrivalLook=null;
const arrivalOverlay=document.querySelector('#arrival');
const arrivalCaption=document.querySelector('#arrival-caption');
function setSceneState(text){
  const label=document.querySelector('#scene-state');
  if(label.textContent!==text){label.textContent=text;live.textContent=text.toLowerCase().replaceAll('_',' ');}
}
function view(name,instant=false){
  if(arrivalActive)finishArrival(false);
  currentView=name;
  document.body.classList.toggle('detail-view',name!=='overview');
  const p=presets[name];
  const position=new THREE.Vector3(...p.position),target=new THREE.Vector3(...p.target);
  if(innerWidth<700&&name==='overview'){position.set(2.25,2.05,9.0);target.set(0,1.53,0);}
  if(instant||reduced.matches){camera.position.copy(position);controls.target.copy(target);transition=null;}
  else transition={start:performance.now(),duration:1600,from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),toTarget:target};
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
  controls.update();
}
view('overview',true);
let compact=innerWidth<700;
function resize(){
  const phone=innerWidth<700||coarsePointer.matches;
  const size=renderResolution({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,compact:phone,maxDimension:maxRenderDimension});
  renderer.setDrawingBufferSize(size.width,size.height,size.ratio);
  const shadowSize=Math.min(phone?2048:4096,2**Math.floor(Math.log2(maxRenderDimension)));
  if(keyLight.shadow.mapSize.x!==shadowSize){
    keyLight.shadow.map?.dispose();keyLight.shadow.map=null;
    keyLight.shadow.mapSize.set(shadowSize,shadowSize);renderer.shadowMap.needsUpdate=true;
  }
  camera.aspect=size.width/size.height;
  if(!flight?.active){camera.fov=innerWidth<700?45:35;camera.updateProjectionMatrix();}
  if(compact!==(innerWidth<700)){compact=innerWidth<700;if(arrivalActive)buildArrivalPaths();else if(!flight?.active)view(currentView,true);}
}
addEventListener('resize',resize);resize();
// A monitor or browser-zoom change can alter density without changing CSS size.
function watchDisplayDensity(){
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change',()=>{resize();watchDisplayDensity();},{once:true});
}
watchDisplayDensity();coarsePointer.addEventListener('change',resize);
controls.addEventListener('start',()=>{transition=null;document.body.classList.add('detail-view');});

function buildArrivalPaths(){
  const points=innerWidth<700 ? [[-.9,1.80,8.8],[-.7,1.8,8.2],[.4,1.9,8.5],[2.25,2.05,9.0]] :
    [[-2.5,1.86,7.3],[-2.65,1.80,4.9],[-.8,1.7,5.4],[1.8,1.62,6.25],[2.85,1.58,6.65]];
  const targets=innerWidth<700 ? [[0,1.54,0],[0,1.58,0],[0,1.6,0],[0,1.53,0]] :
    [[0,1.65,0],[0,1.73,0],[0,1.84,0],[0,1.60,0],[0,1.48,0]];
  arrivalPath=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  arrivalLook=new THREE.CatmullRomCurve3(targets.map(p=>new THREE.Vector3(...p)));
}
function finishArrival(snap=true){
  arrivalActive=false;arrivalElapsed=ARRIVAL_SECONDS;controls.enabled=true;
  arrivalOverlay.hidden=true;document.body.classList.remove('arriving');
  document.querySelectorAll('[data-needs-model]').forEach(b=>b.disabled=false);
  lightLevel=1;setSceneState('DOCKED');
  live.textContent='Welcome to your hangar. Drag to explore or deploy the wings.';
  if(snap)view('overview',true);
  hud.ready();
}
function startArrival(){
  if(!loaded)return;
  flight?.forceDock();
  hud.arrive();
  deployed=false;wingProgress=0;workLights=true;transition=null;
  const wingButton=document.querySelector('#wings');wingButton.querySelector('[data-label]').textContent='Deploy';wingButton.setAttribute('aria-label','Deploy wings');wingButton.setAttribute('aria-pressed','false');
  document.querySelector('#lights').setAttribute('aria-pressed','true');
  view('overview',true);
  if(reduced.matches){finishArrival();renderer.shadowMap.needsUpdate=true;return;}
  buildArrivalPaths();arrivalActive=true;arrivalElapsed=0;lightLevel=.03;
  controls.enabled=false;arrivalOverlay.hidden=false;document.body.classList.add('arriving');
  document.querySelectorAll('[data-needs-model]').forEach(b=>b.disabled=true);
  camera.position.copy(arrivalPath.getPoint(0));controls.target.copy(arrivalLook.getPoint(0));
  renderer.shadowMap.needsUpdate=true;live.textContent='Arrival sequence. Press Escape or Skip to explore immediately.';
}
document.querySelector('#skip-arrival').addEventListener('click',()=>finishArrival());
document.querySelector('#replay-arrival').addEventListener('click',startArrival);
reduced.addEventListener('change',()=>{if(reduced.matches&&arrivalActive)finishArrival();});

const decoder=new DRACOLoader();decoder.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
decoder.setWorkerLimit(2);
const loader=new GLTFLoader();loader.setDRACOLoader(decoder);
const downloadProgress=new Map();
function loadAsset(url,weight){
  const update=value=>{downloadProgress.set(url,value);progress.value=Math.min(95,[...downloadProgress.values()].reduce((a,b)=>a+b,0));};
  return loader.loadAsync(url,event=>{if(event.total)update((event.loaded/event.total)*weight);}).then(gltf=>{update(weight);return gltf;});
}
try{
  const [bay,gundam]=await Promise.all([
    loadAsset('models/hangar/seed-inspired-hangar.glb?v=cinematic-1',15),
    loadAsset('models/strike-freedom/articulated/strike-freedom-articulated-hq.glb',80),
  ]);
  bay.scene.traverse(o=>{
    if(!o.isMesh)return;
    o.receiveShadow=true;o.castShadow=true;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const m of materials){
      finishHangar(m);m.userData.originalEmission=m.emissiveIntensity;
      if(m.name.includes('cold white')){m.userData.bank=m.name.includes('approach')?'approach':m.name.includes('rear')?'rear':'work';workEmissives.add(m);}
    }
  });
  // Settle the boots on the top of the service pad, using actual leg geometry.
  gundam.scene.updateMatrixWorld(true);
  const legRoots=[];
  gundam.scene.traverse(o=>{if(o.userData.articulationRole==='hip')legRoots.push(o);});
  if(!legRoots.length)gundam.scene.traverse(o=>{if(/^Armor_and_frame.*leg/i.test(o.name)||/^Armor and frame.*leg/i.test(o.name))legRoots.push(o);});
  const padHeight=.0375;
  const lowest=legRoots.length?Math.min(...legRoots.map(o=>new THREE.Box3().setFromObject(o,true).min.y)):0;
  gundam.scene.position.y=padHeight-lowest;
  const finishedMaterials=new Set();
  gundam.scene.traverse(o=>{
    if(o.userData.animationRole){
      wings.push({object:o,open:o.quaternion.clone(),role:o.userData.animationRole,pair:o.userData.wingPair,side:o.name.includes('right')?'right':'left'});
      o.quaternion.identity();
    }
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!finishedMaterials.has(m)){
        finishArmor(m);finishedMaterials.add(m);
        if(m.name.includes('emerald sensor'))sensorMaterials.add(m);
      }
    }
  });
  scene.add(bay.scene,gundam.scene);
  space=createSpaceEnvironment(scene);
  gundam.scene.updateMatrixWorld(true);
  const legBounds=legRoots.map(o=>new THREE.Box3().setFromObject(o,true));
  const contacts=addBootContacts(scene,legBounds,padHeight);
  let dockingBody=gundam.scene;
  gundam.scene.traverse(o=>{if(o.userData.articulationRole==='chest')dockingBody=o;});
  docking=createDockingRig(scene,gundam.scene.position.y,dockingBody);
  flight=createFlight({scene,model:gundam.scene,wings,legRoots,legBounds,contacts,camera,controls,canvas,reduced,
    canStart:()=>loaded,setWings,announce:setSceneState,
    onStart(){
      if(arrivalActive)finishArrival();
      transition=null;controls.enabled=false;controls.stopListenToKeyEvents();hud.setFlight(true);
    },
    onEnd(){
      controls.enabled=true;controls.listenToKeyEvents(canvas);hud.setFlight(false);view('overview');
      renderer.shadowMap.needsUpdate=true;
    },
  });
  improveTextureFiltering(scene,Math.min(16,renderer.capabilities.getMaxAnisotropy()));
  renderer.shadowMap.needsUpdate=true;
  loaded=true;progress.value=100;loading.classList.add('complete');
  document.body.classList.add('ready');
  document.querySelectorAll('[data-needs-model]').forEach(b=>b.disabled=false);
  live.textContent='Hangar ready. Drag to look around, scroll to move closer, or choose a camera view.';
  document.querySelector('#scene-state').textContent='DOCKED';
  startArrival();
  setTimeout(()=>{loading.hidden=true;},700);
}catch(error){
  console.error('Unable to load hangar',error);
  loading.innerHTML='<p class="eyebrow">PREVIEW UNAVAILABLE</p><h2>The hangar could not load.</h2><p>Check your connection and reload, or open the studio preview.</p><a href="strike-freedom-studio.html">Open studio preview</a>';
  live.textContent='The hangar could not load. The studio preview is available.';
}

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{if(!flight?.active)view(button.dataset.view);}));
function setWings(open){
  deployed=open;
  const button=document.querySelector('#wings');
  button.setAttribute('aria-pressed',String(deployed));
  button.querySelector('[data-label]').textContent=deployed?'Fold':'Deploy';
  button.setAttribute('aria-label',deployed?'Fold wings':'Deploy wings');
  button.disabled=!reduced.matches;
}
document.querySelector('#wings').addEventListener('click',()=>{
  if(flight?.active)return;
  setWings(!deployed);
  live.textContent=deployed?'Releasing dock supports, then deploying the wing assemblies.':'Folding pod linkages and returning to the dock.';
  if(currentView!=='overview')view('overview');
});
document.querySelector('#lights').addEventListener('click',event=>{
  workLights=!workLights;
  event.currentTarget.setAttribute('aria-pressed',String(workLights));
});

// A quiet local ventilation hum. Audio is created only after an explicit click.
let audioContext=null,audioGain=null,soundOn=false;
document.querySelector('#sound').addEventListener('click',async event=>{
  if(!audioContext){
    audioContext=new (window.AudioContext||window.webkitAudioContext)();
    audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
    for(const [freq,gain] of [[48,.21],[72,.045],[120,.015]]){
      const oscillator=audioContext.createOscillator(),volume=audioContext.createGain();
      oscillator.type='sine';oscillator.frequency.value=freq;volume.gain.value=gain;
      oscillator.connect(volume);volume.connect(audioGain);oscillator.start();
    }
    const noise=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate);
    const channel=noise.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=(Math.random()-.5)*.09;
    const source=audioContext.createBufferSource();source.buffer=noise;source.loop=true;
    const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=230;
    source.connect(filter);filter.connect(audioGain);source.start();
  }
  await audioContext.resume();soundOn=!soundOn;
  audioGain.gain.setTargetAtTime(soundOn ? .14 : 0,audioContext.currentTime,.22);
  event.currentTarget.setAttribute('aria-pressed',String(soundOn));
  event.currentTarget.setAttribute('aria-label',soundOn?'Mute hangar ambience':'Enable hangar ambience');
});
const references=document.querySelector('#references');
document.querySelector('#show-references').addEventListener('click',()=>references.showModal());
document.querySelector('#close-references').addEventListener('click',()=>references.close());
references.addEventListener('click',e=>{if(e.target===references){const r=references.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)references.close();}});
addEventListener('keydown',event=>{
  if(event.key==='Escape'&&arrivalActive){finishArrival();return;}
  if(event.key.toLowerCase()==='r'&&!references.open&&!flight?.active)view('overview');
});
document.addEventListener('visibilitychange',()=>{if(audioGain)audioGain.gain.setTargetAtTime(document.hidden ? 0 : (soundOn ? .14 : 0),audioContext.currentTime,.15);});

const dustCount=90,dustPositions=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPositions[i*3]=(Math.random()-.5)*7;dustPositions[i*3+1]=.3+Math.random()*4.7;dustPositions[i*3+2]=-3+Math.random()*9;}
const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xc6ccda,size:.009,transparent:true,opacity:.19,depthWrite:false}));
scene.add(dust);
const identity=new THREE.Quaternion();
let lastTime=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(document.hidden)return;
  if(arrivalActive){
    arrivalElapsed=Math.min(ARRIVAL_SECONDS,arrivalElapsed+dt);
    const t=phase(arrivalElapsed,0,ARRIVAL_SECONDS);
    camera.position.copy(arrivalPath.getPoint(t));controls.target.copy(arrivalLook.getPoint(t));
    const caption=arrivalState(arrivalElapsed).caption;
    if(arrivalCaption.textContent!==caption)arrivalCaption.textContent=caption;
    if(arrivalElapsed>=ARRIVAL_SECONDS)finishArrival(false);
  }
  if(transition){
    const t=Math.min(1,(now-transition.start)/transition.duration),ease=t*t*(3-2*t);
    camera.position.lerpVectors(transition.from,transition.to,ease);
    controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);
    if(t===1)transition=null;
  }
  const target=deployed?1:0;
  const wingsMoving=Math.abs(wingProgress-target)>.0001;
  wingProgress=reduced.matches?target:clamp01(wingProgress+(deployed?1:-1)*dt/DEPLOYMENT_SECONDS);
  for(const wing of wings){
    const state=wingState(wingProgress,wing.pair,wing.side);
    wing.object.quaternion.slerpQuaternions(identity,wing.open,state[wing.role]);
  }
  docking?.update(wingState(wingProgress).release);
  if(flight?.update(dt,{release:wingState(wingProgress).release,wingProgress}))renderer.shadowMap.needsUpdate=true;
  const exposure=flight?.exposure||0;
  space?.update(exposure);
  scene.fog.density=.028*(1-exposure);
  scene.background.copy(bayColor).lerp(spaceColor,exposure);
  if(wingsMoving)renderer.shadowMap.needsUpdate=true;
  if(loaded&&!arrivalActive&&!flight?.active){
    const busy=Math.abs(wingProgress-target)>.0001;
    document.querySelector('#wings').disabled=busy;
    const state=busy?(deployed?(wingProgress<.18?'RELEASING DOCK':'DRAGOONS DEPLOYING'):(wingProgress<.18?'SECURING DOCK':'DRAGOONS FOLDING')):(deployed?'DRAGOONS DEPLOYED':'DOCKED');
    setSceneState(state);
  }
  const fieldOfView=innerWidth<700 ? (currentView==='overview' ? 45+6*wingProgress : 45) : 35;
  if(!flight?.active&&Math.abs(camera.fov-fieldOfView)>.001){camera.fov=fieldOfView;camera.updateProjectionMatrix();}
  const arrival=arrivalActive?arrivalState(arrivalElapsed):{approach:1,rear:1,work:1,sensors:1};
  lightLevel=arrivalActive ? .03+.97*arrival.work : THREE.MathUtils.damp(lightLevel,workLights?1:.16,3,dt);
  for(const light of serviceLights)light.intensity=light.userData.fullIntensity*(arrivalActive ? .03+.97*arrival[light.userData.bank] : lightLevel);
  for(const mat of workEmissives){
    const level=arrivalActive?arrival[mat.userData.bank]:lightLevel;
    mat.emissiveIntensity=mat.userData.originalEmission*(.02+.98*level);
  }
  for(const mat of sensorMaterials)mat.emissiveIntensity=1.6*arrival.sensors;
  hemi.intensity=.08+lightLevel*.24;fill.intensity=.07+lightLevel*.23;
  illumination.value=lightLevel;
  scene.environmentIntensity=.14+lightLevel*.31;
  // Keep orbiting viewpoints inside the modeled room, including while zoomed out.
  if(!flight?.active){
    const distance=Math.max(.01,camera.position.distanceTo(controls.target));
    controls.minAzimuthAngle=-Math.asin(THREE.MathUtils.clamp((4.0+controls.target.x)/distance,-1,1));
    controls.maxAzimuthAngle=Math.asin(THREE.MathUtils.clamp((4.0-controls.target.x)/distance,-1,1));
    controls.minPolarAngle=Math.max(.4,Math.acos(THREE.MathUtils.clamp((4.8-controls.target.y)/distance,-1,1)));
  }
  if(!reduced.matches){
    for(let i=0;i<dustCount;i++){dustPositions[i*3+1]+=dt*.006;if(dustPositions[i*3+1]>5)dustPositions[i*3+1]=.3;}
    dustGeometry.attributes.position.needsUpdate=true;
  }
  if(!flight?.active)controls.update();
  ink.render(scene,camera);
});
