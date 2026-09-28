import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stepSpring} from './spring-motion.js';

test('underdamped response follows through once and recovers without runaway oscillation', () => {
  let state = {value: 0, velocity: 0}, maximum = 0;
  for (let frame = 0; frame < 600; frame++) {
    state = stepSpring(state.value, state.velocity, 1, 6.5, .7, 1 / 120);
    maximum = Math.max(maximum, state.value);
  }
  assert.ok(maximum > 1.04 && maximum < 1.05);
  assert.ok(Math.abs(state.value - 1) < 1e-8);
  assert.ok(Math.abs(state.velocity) < 1e-8);
});

test('analytic solution is invariant to frame subdivision in all damping regimes', () => {
  for (const damping of [.58, .9, 1, 1.4]) {
    const whole = stepSpring(.2, -.4, .8, 7, damping, 1);
    for (const hz of [30, 60, 120]) {
      let state = {value: .2, velocity: -.4};
      for (let i = 0; i < hz; i++) state = stepSpring(state.value, state.velocity, .8, 7, damping, 1 / hz);
      assert.ok(Math.abs(state.value - whole.value) < 1e-12);
      assert.ok(Math.abs(state.velocity - whole.velocity) < 1e-12);
    }
  }
});

test('target reversal preserves momentum instead of teleporting position or velocity', () => {
  const moving = stepSpring(0, 0, 1, 6, .7, .15);
  const reversed = stepSpring(moving.value, moving.velocity, -1, 6, .7, .001);
  assert.ok(reversed.value > moving.value, 'existing momentum survives reversal');
  assert.ok(Math.abs(reversed.value - moving.value) < .01);
  assert.ok(Math.abs(reversed.velocity - moving.velocity) < .1);
});

test('paused, unforced and invalid inputs remain defined', () => {
  assert.deepEqual(stepSpring(.3, .1, 1, 6, .7, 0), {value: .3, velocity: .1});
  assert.deepEqual(stepSpring(.3, .1, 1, 0, .7, 1), {value: .4, velocity: .1});
  assert.deepEqual(stepSpring(NaN, Infinity, NaN, 6, .7, NaN), {value: 0, velocity: 0});
});
