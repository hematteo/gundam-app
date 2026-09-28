import {stepSpring} from './spring-motion.js?v=flight-feel-3';
export const FLIGHT_SPEED=4.8;
export const BOOST_MULTIPLIER=2.6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function flightState(position={x:0,y:2,z:24}) {
  return {...position,yaw:0,vx:0,vy:0,vz:0,turn:0,pitch:0,roll:0,pitchVelocity:0,rollVelocity:0,boundary:false};
}
export function stepFlight(state,input,dt,bounds,{reduced=false}={}) {
  dt=clamp(dt,0,.05);
  let forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),rise=clamp(input.rise||0,-1,1);
  const norm=Math.max(1,Math.hypot(forward,strafe));forward/=norm;strafe/=norm;
  const speed=FLIGHT_SPEED*(input.boost?BOOST_MULTIPLIER:1);
  state.turn=damp(state.turn,clamp(input.yaw||0,-1,1)*1.08,6,dt);
  state.yaw=angleDelta(0,state.yaw+state.turn*dt);
  const sin=Math.sin(state.yaw),cos=Math.cos(state.yaw),braking=input.brake>0;
  const response=braking?13:forward||strafe||rise?3.8:5;
  state.vx=damp(state.vx,braking?0:(sin*forward-cos*strafe)*speed,response,dt);
  state.vz=damp(state.vz,braking?0:(cos*forward+sin*strafe)*speed,response,dt);
  state.vy=damp(state.vy,braking?0:rise*speed*.65,response,dt);
  state.boundary=false;
  for(const [axis,velocity] of [['x','vx'],['y','vy'],['z','vz']]){
    const next=state[axis]+state[velocity]*dt;
    state[axis]=clamp(next,bounds[axis][0],bounds[axis][1]);
    if(Math.abs(next-state[axis])>.000001){state[velocity]=0;state.boundary=true;}
  }
  // Bank into a turn and lean in response to actual travel, not key-down alone.
  const ahead=(state.vx*sin+state.vz*cos)/FLIGHT_SPEED;
  if(reduced){
    state.pitch=state.roll=state.pitchVelocity=state.rollVelocity=0;
  }else{
    // The body carries angular momentum after a correction. Limbs settle at
    // their own rates, so the whole suit no longer changes pose in lockstep.
    for(const [axis,target,frequency,damping,limit] of [
      ['pitch',clamp(ahead*.15-state.vy*.02,-.2,.42),5.8,.78,[-.23,.46]],
      ['roll',clamp(-state.turn*.24+strafe*.10,-.32,.32),6.8,.72,[-.36,.36]],
    ]){
      const velocityKey=axis+'Velocity';
      const next=stepSpring(state[axis],state[velocityKey]||0,target,frequency,damping,dt);
      state[axis]=clamp(next.value,...limit);
      state[velocityKey]=state[axis]===next.value?next.velocity:0;
    }
  }
  return state;
}
