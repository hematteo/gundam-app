import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flightState,stepFlight,FLIGHT_SPEED} from './flight-motion.js';
const room={x:[-1.2,1.2],y:[.18,.8],z:[2.4,5.1]};
const open={x:[-50,50],y:[-50,50],z:[-50,50]};
function advance(state,input,seconds,bounds=open,step=1/60,options={}){
  for(let i=0;i<Math.round(seconds/step);i++)stepFlight(state,input,step,bounds,options);
  return state;
}

test('thrust accelerates smoothly and releasing the controls brakes to a hover',()=>{
  const s=flightState({x:0,y:.5,z:0});
  stepFlight(s,{forward:1},1/60,open);
  assert.ok(s.vz>0&&s.vz<FLIGHT_SPEED);
  advance(s,{forward:1},2);
  assert.ok(s.z>FLIGHT_SPEED*1.5&&s.vz>FLIGHT_SPEED*.98);
  const before=s.z;advance(s,{},2);
  assert.ok(Math.abs(s.vz)<.001);assert.ok(s.z-before<FLIGHT_SPEED*.22);
});

test('diagonal thrust has the same top horizontal speed and respects heading',()=>{
  const straight=advance(flightState(),{forward:1},3);
  const diagonal=advance(flightState(),{forward:1,strafe:1},3);
  assert.ok(Math.abs(Math.hypot(diagonal.vx,diagonal.vz)-straight.vz)<.00001);
  const turned=flightState();turned.yaw=Math.PI/2;advance(turned,{forward:1},3);
  assert.ok(turned.vx>FLIGHT_SPEED*.99);assert.ok(Math.abs(turned.vz)<.00001);
});

test('boosted motion and turning stay inside the configured flight envelope',()=>{
  for(const sign of [-1,1]){
    const s=advance(flightState(),{forward:sign,strafe:sign,rise:sign,yaw:sign,boost:true},30,room);
    for(const axis of ['x','y','z'])assert.ok(s[axis]>=room[axis][0]&&s[axis]<=room[axis][1]);
    assert.ok(Number.isFinite(s.yaw)&&Math.abs(s.yaw)<=Math.PI);
    assert.equal(s.vy,0);
  }
});

test('movement is stable across frame rates; reduced motion suppresses banking only',()=>{
  const low=advance(flightState(),{forward:1,strafe:.4},3,open,1/30);
  const high=advance(flightState(),{forward:1,strafe:.4},3,open,1/120);
  assert.ok(Math.abs(low.x-high.x)<.07&&Math.abs(low.z-high.z)<.07);
  const reduced=advance(flightState(),{forward:1,strafe:1},2,open,1/60,{reduced:true});
  assert.equal(reduced.pitch,0);assert.equal(reduced.roll,0);assert.ok(Math.hypot(reduced.vx,reduced.vz)>FLIGHT_SPEED*.98);
});


test('steering curves the flight path and banking follows the turn',()=>{
  const s=advance(flightState({x:0,y:0,z:0}),{forward:1,yaw:1},1);
  assert.ok(s.x>0&&s.z>0);assert.ok(s.yaw>.7);assert.ok(s.roll<0);
});

test('brake arrests travel faster than passive hover and stops vertical drift',()=>{
  const cruising=advance(flightState(),{forward:1,rise:1,boost:true},2);
  const coasting=advance({...cruising},{},.3);
  const braking=advance({...cruising},{brake:1},.3);
  assert.ok(Math.hypot(braking.vx,braking.vy,braking.vz)<Math.hypot(coasting.vx,coasting.vy,coasting.vz)*.15);
});

test('banking carries momentum through release and settles without snapping',()=>{
  const s=advance(flightState({x:0,y:0,z:0}),{yaw:1},2);
  const bank=s.roll;
  stepFlight(s,{},1/60,open);
  assert.ok(Math.abs(s.roll-bank)<.003,'releasing steering keeps the current bank continuous');
  let recovery=0;
  for(let i=0;i<180;i++){
    stepFlight(s,{},1/60,open);
    recovery=Math.max(recovery,s.roll);
    assert.ok(Math.abs(s.roll)<=.36&&Math.abs(s.pitch)<=.46);
  }
  assert.ok(recovery>0&&recovery<.025,'a small counter-roll provides follow-through');
  assert.ok(Math.abs(s.roll)<.0001&&Math.abs(s.rollVelocity)<.001);
});

test('reduced motion clears accumulated angular momentum immediately',()=>{
  const s=advance(flightState(),{forward:1,yaw:1,boost:true},.3);
  assert.ok(Math.abs(s.pitchVelocity)+Math.abs(s.rollVelocity)>0);
  stepFlight(s,{},1/60,open,{reduced:true});
  for(const key of ['pitch','roll','pitchVelocity','rollVelocity'])assert.equal(s[key],0);
});
