import * as THREE from 'three';

// Presentation rig: visible support pads and service plugs contact dedicated
// sockets. Release travel is deliberately kept behind the wing plane.
export function createDockingRig(scene, verticalOffset = 0, model = null) {
  const group = new THREE.Group(); group.name = 'Animated docking equipment';scene.add(group);
  const steel = new THREE.MeshStandardMaterial({color:'#8196aa',metalness:.72,roughness:.35});
  const graphite = new THREE.MeshStandardMaterial({color:'#1f2b3a',metalness:.45,roughness:.48});
  const rubber = new THREE.MeshStandardMaterial({color:'#171e28',roughness:.78});
  const amber = new THREE.MeshStandardMaterial({color:'#d6aa52',metalness:.2,roughness:.45});
  for(const m of [steel,graphite,rubber,amber])m.userData.outlineParameters={visible:false};
  const rigs=[];
  function box(size,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  function segment(start,end,width,depth,material){
    const mesh=box([width,1,depth],material);
    return {mesh,set(a,b){const d=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=d.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}};
  }
  for(const side of [-1,1]){
    const socket=new THREE.Vector3(side*.19,1.72+verticalOffset,-.35);
    const anchor=new THREE.Vector3(side*.79,1.49,-.87);
    const housing=box([.105,.11,.08],graphite);housing.position.copy(socket);
    const contact=box([.072,.075,.035],rubber);contact.position.copy(socket).add(new THREE.Vector3(0,0,-.054));
    if(model){scene.updateMatrixWorld(true);model.attach(housing);model.attach(contact);}
    const pad=box([.095,.092,.045],steel);
    const outer=segment(anchor,socket,.052,.072,graphite);
    const piston=segment(anchor,socket,.022,.028,steel);
    const plug=box([.034,.036,.075],amber);
    const cable=new THREE.Mesh(new THREE.BufferGeometry(),rubber);cable.castShadow=true;group.add(cable);
    const foot=box([.12,.045,.13],graphite);
    rigs.push({side,socket,anchor,pad,outer,piston,plug,cable,foot});
  }
  let previous=-1;
  function update(release){
    if(Math.abs(release-previous)<.0001)return;previous=release;
    for(const r of rigs){
      const end=r.socket.clone().add(new THREE.Vector3(r.side*.35*release,0,-.11-.58*release));
      r.pad.position.copy(end);
      const elbow=r.anchor.clone().lerp(end,.50);elbow.y-=.04;
      r.outer.set(r.anchor,elbow);r.piston.set(elbow,end);
      r.plug.position.copy(end).add(new THREE.Vector3(-r.side*.02,.04,.018));
      const path=new THREE.CatmullRomCurve3([
        new THREE.Vector3(r.side*.79,2.01,-.98),
        new THREE.Vector3(r.side*.69,1.85,-1.11),
        new THREE.Vector3(r.side*(.50+.1*release),1.57,-.78-.2*release),
        r.plug.position.clone(),
      ]);
      const old=r.cable.geometry;r.cable.geometry=new THREE.TubeGeometry(path,24,.009,6,false);old.dispose();
      // Low toe chocks withdraw laterally, staying outside each foot's surface.
      r.foot.position.set(r.side*(.44+.20*release),.062,.22);
    }
  }
  update(0);
  return {update,group};
}
