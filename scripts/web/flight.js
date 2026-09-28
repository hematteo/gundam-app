import * as THREE from 'three';
import {flightState,stepFlight,smooth,angleDelta,FLIGHT_SPEED} from './flight-motion.js?v=flight-feel-3';
import {flightInput} from './flight-input.js?v=carrier-view-6';
import {createArticulationRig} from './articulation-rig.js?v=flight-feel-3';
import {stepSpring} from './spring-motion.js?v=flight-feel-3';

export function createFlight({scene,model,wings,legRoots,legBounds,contacts,camera,controls,canvas,reduced,canStart,setWings,onStart,onEnd,announce}) {
  const button=document.querySelector('#pilot-toggle');
  const panel=document.querySelector('#flight-controls');
  const readout=document.querySelector('#flight-status');
  const altitude=document.querySelector('#flight-altitude');
  const viewButton=document.querySelector('#flight-view');
  // Measure the deployed silhouette, including rifles, to frame the full wing span.
  for(const wing of wings)wing.object.quaternion.copy(wing.open);
  model.updateWorldMatrix(true,true);
  const fullBounds=new THREE.Box3().setFromObject(model,true);
  for(const wing of wings)wing.object.quaternion.identity();

  const frameWidth=fullBounds.getSize(new THREE.Vector3()).x*1.12;
  const bounds={x:[-70,70],y:[-16,45],z:[20,95]};
  const gate={x:0,y:.38,z:14};
  const home={x:0,y:1.5,z:24};
  const carrier=new THREE.Group();carrier.name='Pilot / flight position';scene.add(carrier);
  const lean=new THREE.Group();lean.name='Pilot / bank and pitch';lean.position.y=1.18;carrier.add(lean);
  scene.updateMatrixWorld(true);lean.attach(model);
  const articulation=createArticulationRig(model,wings);
  const jets=new THREE.Group();jets.name='Pilot / thrusters';lean.add(jets);jets.visible=false;
  const flames=[],nozzles=[];
  const vertex=new THREE.Vector3();
  for(const [index,bound] of legBounds.entries()){
    // Use the sole vertices: a whole-leg bounding box puts the jet inside the heel.
    const sole=new THREE.Box3();
    legRoots[index].traverse(part=>{
      if(!part.isMesh)return;
      const positions=part.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++){
        vertex.fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld);
        if(vertex.y<bound.min.y+.07)sole.expandByPoint(vertex);
      }
    });
    const center=(sole.isEmpty()?bound:sole).getCenter(new THREE.Vector3());
    const nozzle=new THREE.Group();jets.add(nozzle);
    nozzle.position.copy(lean.worldToLocal(new THREE.Vector3(center.x,bound.min.y+.012,center.z)));
    for(const [radius,color,opacity] of [[.065,'#438cff',.65],[.029,'#c1f3ff',1]]){
      const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
      material.userData.outlineParameters={visible:false};
      const flame=new THREE.Mesh(new THREE.ConeGeometry(radius,1,12,1,true),material);
      flame.rotation.z=Math.PI;nozzle.add(flame);flames.push(flame);
    }
    const glow=new THREE.PointLight('#59baff',.45,.9,2);glow.position.y=-.08;nozzle.add(glow);
    let ankle=null;
    legRoots[index].traverse(part=>{if(part.userData.articulationRole==='ankle')ankle=part;});
    if(ankle){scene.updateMatrixWorld(true);ankle.attach(nozzle);}
    nozzle.visible=false;nozzles.push(nozzle);
  }
  function showThrusters(visible){jets.visible=visible;for(const nozzle of nozzles)nozzle.visible=visible;}
  // Soft rear fill preserves the blue armor in the chase view, outside the dock lights.
  const flightFill=new THREE.DirectionalLight('#c4d9ff',0);
  flightFill.position.set(-2,3.5,-4);flightFill.target.position.set(0,1.4,0);
  carrier.add(flightFill,flightFill.target);
  let mode='docked',elapsed=0,flight=flightState(home),from=null,clock=0,lastReadout=0,exposure=0;
  const look=new THREE.Vector3(),desired=new THREE.Vector3(),followOffset=new THREE.Vector3();
  const shadowPosition=new THREE.Vector3(Infinity,Infinity,Infinity),shadowRotation=new THREE.Vector3();
  let cameraYaw=0,cameraOrbit=0,cameraOrbitVelocity=0,cameraDistance=5.2,cameraView='rear';
  function setMode(next,text){
    mode=next;elapsed=0;document.body.dataset.flight=next;
    if(text){readout.textContent=text.toUpperCase();announce(text);}
    button.disabled=next==='returning'||next==='folding';
    viewButton.disabled=next!=='flying';
    button.querySelector('[data-label]').textContent=next==='docked'?'Pilot':next==='returning'||next==='folding'?'Docking':'Dock';
    button.setAttribute('aria-pressed',String(next!=='docked'));
    button.setAttribute('aria-label',next==='docked'?'Enter flight mode':'Return to the dock');
  }
  function begin(){
    if(!canStart()||mode!=='docked')return;
    input.clear();articulation.reset();flight=flightState(home);carrier.position.set(0,0,0);carrier.rotation.set(0,0,0);lean.rotation.set(0,0,0);
    cameraYaw=Math.atan2(-camera.position.x,-camera.position.z);
    cameraOrbit=cameraOrbitVelocity=0;cameraDistance=camera.position.distanceTo(controls.target);
    onStart();setWings(true);contacts.visible=false;
    document.body.classList.add('flight-mode');panel.hidden=false;
    setMode('launching','Undocking');canvas.focus({preventScroll:true});
  }
  function dock(){
    if(mode==='docked'||mode==='returning'||mode==='folding')return;
    input.clear();from={position:carrier.position.clone(),yaw:carrier.rotation.y,outer:carrier.position.z>14};
    from.duration=from.outer?Math.max(2,carrier.position.distanceTo(new THREE.Vector3(0,gate.y,gate.z))/12):0;
    setMode('returning','Returning to dock');
    canvas.focus({preventScroll:true});
  }
  function reset(){
    if(mode!=='flying')return;
    input.clear();articulation.reset();flight=flightState(home);applyFlight();announce('Flight position reset.');
  }
  function finish(){
    input.clear();carrier.position.set(0,0,0);carrier.rotation.set(0,0,0);lean.rotation.set(0,0,0);
    articulation.reset();showThrusters(false);flightFill.intensity=0;exposure=0;contacts.visible=true;panel.hidden=true;document.body.classList.remove('flight-mode');
    setMode('docked','Docked');onEnd();
  }
  function toggle(){mode==='docked'?begin():dock();}
  function changeView(){
    if(mode!=='flying')return;
    cameraView=cameraView==='rear'?'front':'rear';
    const next=cameraView==='rear'?'Front':'Rear';
    viewButton.querySelector('[data-label]').textContent=next;
    viewButton.setAttribute('aria-label',`Switch to ${next.toLowerCase()} view`);
    viewButton.dataset.tooltip=`${next} view · V`;
    announce(`${cameraView==='front'?'Front':'Rear'} flight view`);
  }
  const input=flightInput({canvas,active:()=>mode==='flying',toggle,dock,reset,changeView});
  button.addEventListener('click',toggle);
  viewButton.addEventListener('click',changeView);
  function applyFlight(){
    carrier.position.set(flight.x,flight.y,flight.z);carrier.rotation.y=flight.yaw;
    lean.rotation.set(flight.pitch,0,flight.roll);
  }
  function followCamera(dt){
    const rate=reduced.matches?1:1-Math.exp(-4*dt);
    const returning=mode==='returning'||mode==='folding';
    const closeDock=returning&&carrier.position.z<14;
    const heading=closeDock?-2.8:carrier.rotation.y;
    cameraYaw+=angleDelta(cameraYaw,heading)*(reduced.matches?1:1-Math.exp(-(mode==='launching'||closeDock?1.25:4.5)*dt));
    const front=mode==='flying'&&cameraView==='front';
    const orbit=stepSpring(cameraOrbit,cameraOrbitVelocity,front?Math.PI:0,3.6,1,dt);
    cameraOrbit=reduced.matches?(front?Math.PI:0):orbit.value;
    cameraOrbitVelocity=reduced.matches?0:orbit.velocity;
    const mobile=innerWidth<700;
    const speed=Math.hypot(flight.vx,flight.vy,flight.vz);
    const distance=closeDock?5.6:THREE.MathUtils.lerp(mobile?4.65:4.5,mobile?5.4:5.2,exposure)+(reduced.matches?0:Math.min(.5,speed*.04));
    cameraDistance=THREE.MathUtils.lerp(cameraDistance,distance,rate);
    const orbitYaw=cameraYaw+cameraOrbit;
    followOffset.set(-Math.sin(orbitYaw)*cameraDistance,mobile ? .5 : .72,-Math.cos(orbitYaw)*cameraDistance);
    // Keep the aim body-relative when the camera swings around to the face.
    look.copy(carrier.position).add(new THREE.Vector3(Math.sin(carrier.rotation.y)*.35,1.5,Math.cos(carrier.rotation.y)*.35));
    // A lagging center steals the front camera's distance during fast forward
    // flight. Keep its orbit centered on the suit; heading and radius still ease.
    if(carrier.position.z>=14)controls.target.copy(look);else controls.target.lerp(look,rate);
    desired.copy(controls.target).add(followOffset);
    if(carrier.position.z<12){
      desired.x=THREE.MathUtils.clamp(desired.x,-4.05,4.05);
      desired.y=THREE.MathUtils.clamp(desired.y,.55,4.65);
      desired.z=THREE.MathUtils.clamp(desired.z,-1.5,8.15);
    }
    // Orbit on a full-radius arc; a Cartesian lerp across 180° cuts through the suit.
    if(carrier.position.z>=14)camera.position.copy(desired);else camera.position.lerp(desired,rate);
    camera.lookAt(controls.target);
    const fov=mobile?Math.max(66,THREE.MathUtils.radToDeg(2*Math.atan(frameWidth/(2*cameraDistance*camera.aspect)))):51+(reduced.matches?0:Math.min(4,speed*.3));
    camera.fov=THREE.MathUtils.lerp(camera.fov,fov,rate);camera.updateProjectionMatrix();
  }
  return {
    get active(){return mode!=='docked';},
    get exposure(){return exposure;},
    get flying(){return mode==='flying';},
    forceDock(){if(mode!=='docked'){setWings(false);finish();}},
    update(dt,{release,wingProgress}){
      if(mode==='docked')return false;
      clock+=dt;let inputValue={};
      if(mode==='launching'){
        if(release>.995){
          elapsed+=dt;
          const t=reduced.matches?6:elapsed;
          const departure=smooth(t/3.1),launch=smooth((t-3.1)/2.6);
          carrier.position.set(0,gate.y*smooth(t/.7)+(home.y-gate.y)*launch,gate.z*departure+(home.z-gate.z)*launch);
          lean.rotation.x=reduced.matches?0:Math.sin(Math.min(1,t/5.7)*Math.PI)*.16;
          if(t>=5.7&&wingProgress>=.999){flight=flightState(home);applyFlight();setMode('flying','Free flight');}
        }
      }else if(mode==='flying'){
        inputValue=input.sample();stepFlight(flight,inputValue,dt,bounds,{reduced:reduced.matches});applyFlight();
      }else if(mode==='returning'){
        elapsed+=dt;const time=reduced.matches?from.duration+4:elapsed;
        if(from.outer&&time<from.duration){
          const t=smooth(time/from.duration);
          carrier.position.lerpVectors(from.position,new THREE.Vector3(0,gate.y,gate.z),t);
          carrier.rotation.y=from.yaw+angleDelta(from.yaw,0)*smooth(Math.min(1,t*3));
        }else{
          const t=Math.min(1,(time-from.duration)/4),start=from.outer?new THREE.Vector3(0,gate.y,gate.z):from.position;
          carrier.position.x=THREE.MathUtils.lerp(start.x,0,smooth(t/.3));
          carrier.position.z=THREE.MathUtils.lerp(start.z,0,smooth(t/.9));
          carrier.position.y=THREE.MathUtils.lerp(start.y,0,smooth((t-.82)/.18));
          carrier.rotation.y*=Math.exp(-8*dt);
          if(t===1){carrier.position.set(0,0,0);carrier.rotation.y=0;setWings(false);setMode('folding','Securing dock');}
        }
        lean.rotation.x*=Math.exp(-8*dt);lean.rotation.z*=Math.exp(-8*dt);
      }else if(mode==='folding'&&wingProgress<=.001){finish();return true;}
      exposure=THREE.MathUtils.smoothstep(carrier.position.z,8,18);
      const manual=mode==='flying',sin=Math.sin(flight.yaw),cos=Math.cos(flight.yaw);
      const articulated=articulation.update({
        forwardSpeed:manual?(flight.vx*sin+flight.vz*cos)/FLIGHT_SPEED:mode==='launching'?.35:0,
        lateralSpeed:manual?(-flight.vx*cos+flight.vz*sin)/FLIGHT_SPEED:0,
        verticalSpeed:manual?flight.vy/FLIGHT_SPEED:0,
        forwardThrust:manual?(inputValue.forward||0):0,
        turn:manual?flight.turn:0,boost:inputValue.boost||0,brake:inputValue.brake||0,
        airborne:manual?1:smooth((carrier.position.z-7)/11),
        docking:mode==='returning'||mode==='folding',reduced:reduced.matches,
      },dt);
      showThrusters(mode==='flying'||carrier.position.y>.06||carrier.position.z>10);
      flightFill.intensity=THREE.MathUtils.smoothstep(carrier.position.z,0,2)*(1.1-exposure*.2);
      const speed=Math.hypot(flight.vx,flight.vy,flight.vz);
      const strength=mode==='flying' ? .25+Math.min(.55,speed*.06):Math.min(Math.max(0,carrier.position.y)*.85,.4);
      const nozzlePitch=manual?THREE.MathUtils.clamp((flight.vx*sin+flight.vz*cos)/FLIGHT_SPEED*.12,-.12,.28):0;
      for(let i=0;i<flames.length;i++){
        const length=strength*(i%2 ? .68 : 1)*(reduced.matches?1:1+.035*Math.sin(clock*21+i));
        if(i%2===0)flames[i].parent.rotation.x=THREE.MathUtils.damp(flames[i].parent.rotation.x,nozzlePitch,5,dt);
        flames[i].scale.y=length;flames[i].position.y=-length/2;
      }
      if(clock-lastReadout>.1){
        lastReadout=clock;
        readout.dataset.x=carrier.position.x.toFixed(3);readout.dataset.y=carrier.position.y.toFixed(3);readout.dataset.z=carrier.position.z.toFixed(3);readout.dataset.yaw=carrier.rotation.y.toFixed(3);
        readout.dataset.articulated=String(articulation.enabled);
        readout.dataset.motionRevision='flight-feel-3';
        readout.dataset.motionTime=clock.toFixed(3);
        readout.dataset.motionPreference=reduced.matches?'reduced':'full';
        readout.dataset.hip=articulation.pose.hipLeft?.x.toFixed(3)||'0';
        readout.dataset.kneeRight=articulation.pose.kneeRight?.x.toFixed(3)||'0';
        readout.dataset.knee=articulation.pose.kneeLeft?.x.toFixed(3)||'0';
        readout.dataset.elbow=articulation.pose.elbowLeft?.x.toFixed(3)||'0';
        readout.dataset.wrist=articulation.pose.wristLeft?.x.toFixed(3)||'0';
        readout.dataset.pitch=lean.rotation.x.toFixed(3);
        readout.dataset.bank=lean.rotation.z.toFixed(3);
        readout.dataset.cameraView=mode==='flying'?cameraView:'automatic';
        readout.dataset.cameraOrbit=cameraOrbit.toFixed(3);
        readout.dataset.cameraDistance=cameraDistance.toFixed(3);
        if(mode==='flying'){
          const status=flight.boundary?'FLIGHT LIMIT':inputValue.brake?'BRAKING':inputValue.boost?'BOOST':Math.hypot(flight.vx,flight.vy,flight.vz)>.08?'THRUST':'HOVER';
          if(readout.textContent!==status)readout.textContent=status;
        }
        const level=Math.round(THREE.MathUtils.clamp((carrier.position.y-bounds.y[0])/(bounds.y[1]-bounds.y[0]),0,1)*100);
        altitude.value=level;altitude.setAttribute('aria-valuetext',`${level} percent of flight height`);
      }
      followCamera(dt);
      // Flame flicker and camera motion do not require another expensive shadow pass.
      const rotation=vertex.set(lean.rotation.x,carrier.rotation.y,lean.rotation.z);
      const moved=shadowPosition.distanceToSquared(carrier.position)>1e-9||shadowRotation.distanceToSquared(rotation)>1e-9;
      if(moved){shadowPosition.copy(carrier.position);shadowRotation.copy(rotation);}
      // The only shadow caster is the bay spotlight (15-unit far plane).
      // Outside the entrance, continuous joint trim must not redraw its 4K map.
      return carrier.position.z<20&&(moved||articulated);
    },
  };
}
