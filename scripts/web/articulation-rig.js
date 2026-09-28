import * as THREE from 'three';
import {createArticulationState,stepArticulation,resetArticulation} from './articulation-motion.js?v=flight-feel-3';

// Rigid pivot animation: plates, joint covers and weapons keep their shape.
export function createArticulationRig(model,wings){
  const state=createArticulationState(),joints=[];
  const point=new THREE.Vector3(),delta=new THREE.Quaternion(),euler=new THREE.Euler();
  model.updateWorldMatrix(true,true);
  model.traverse(object=>{
    const role=object.userData.articulationRole;
    if(!role)return;
    const side=object.userData.articulationSign||Math.sign(model.worldToLocal(object.getWorldPosition(point)).x);
    // Pose channels use screen-space rest sides (-X left, +X right).
    const key=role==='chest'||role==='neck'?role:`${role}${side<0?'Left':'Right'}`;
    joints.push({object,role,key,rest:object.quaternion.clone(),previous:new THREE.Quaternion()});
  });
  const flex=wings.filter(wing=>wing.role==='primary').map(wing=>({object:wing.object,key:wing.object.position.x<0?'wingLeft':'wingRight'}));
  function reset(){
    resetArticulation(state);
    for(const joint of joints){joint.object.quaternion.copy(joint.rest);joint.previous.copy(joint.rest);}
  }
  return {
    get enabled(){return joints.length>0;},
    get pose(){return state.pose;},
    reset,
    update(inputs,dt){
      if(!joints.length)return false;
      const poses=stepArticulation(state,inputs,dt);let changed=false;
      for(const joint of joints){
        const pose=poses[joint.key];if(!pose)continue;
        // Rear/side skirts must not copy the front panel's forward swing.
        const panel=joint.object.userData.articulationPanel;
        const x=joint.role==='skirt'&&panel==='rear'?-pose.x:joint.role==='skirt'&&panel==='side'?0:pose.x;
        const z=joint.role==='skirt'&&panel!=='side'?0:pose.z;
        delta.setFromEuler(euler.set(x,pose.y,z));
        joint.object.quaternion.copy(joint.rest).multiply(delta);
        if(1-Math.abs(joint.previous.dot(joint.object.quaternion))>1e-9)changed=true;
        joint.previous.copy(joint.object.quaternion);
      }
      // Hangar.js reapplies the deployment pose before this small flight deflection.
      for(const wing of flex){
        const pose=poses[wing.key];if(!pose)continue;
        delta.setFromEuler(euler.set(pose.x,pose.y,pose.z));wing.object.quaternion.multiply(delta);
      }
      return changed;
    },
  };
}
