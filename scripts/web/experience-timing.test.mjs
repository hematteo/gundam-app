import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalState,wingState,ARRIVAL_SECONDS} from './experience-timing.js';

test('arrival lights precede sensor activation and finish fully on',()=>{
  assert.equal(arrivalState(0).work,0);
  assert.ok(arrivalState(1.5).approach>0);
  assert.equal(arrivalState(1.5).work,0);
  assert.equal(arrivalState(4.5).work,1);
  assert.equal(arrivalState(4.5).sensors,0);
  for(const field of ['approach','rear','work','sensors'])assert.equal(arrivalState(ARRIVAL_SECONDS)[field],1);
});

test('support pads fully retract before any primary or secondary wing moves',()=>{
  for(const pair of ['front inner','front outer','rear inner','rear outer']){
    for(const side of ['left','right']){
      for(let step=0;step<=1000;step++){
        const state=wingState(step/1000,pair,side);
        if(state.primary>0||state.secondary>0)assert.equal(state.release,1);
        for(const value of Object.values(state))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
      }
      assert.deepEqual(wingState(0,pair,side),{primary:0,secondary:0,release:0});
      assert.deepEqual(wingState(1,pair,side),{primary:1,secondary:1,release:1});
    }
  }
});

test('outer rear wings lead the front wings and supports fold before re-docking',()=>{
  assert.ok(wingState(.35,'rear outer').primary>wingState(.35,'front inner').primary);
  for(let step=170;step>=0;step--){
    const state=wingState(step/1000,'rear outer');
    assert.equal(state.primary,0);assert.equal(state.secondary,0);
  }
});
