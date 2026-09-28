import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARTICULATION_LIMITS, createArticulationState, resetArticulation, stepArticulation} from './articulation-motion.js';

function advance(state, input, seconds, hz = 60) {
  for (let i = 0; i < Math.round(seconds * hz); i++) stepArticulation(state, {trim: false, ...input}, 1 / hz);
  return state.pose;
}
function assertZero(state) {
  for (const group of [state.pose, state.velocity]) {
    for (const value of Object.values(group)) for (const angle of Object.values(value)) assert.equal(angle, 0);
  }
  for (const value of Object.values(state.drivers)) assert.equal(value, 0);
  assert.equal(state.time, 0);
}

test('nominal hover relaxes the arms and knees and settles without ongoing oscillation', () => {
  const state = createArticulationState();
  const hover = advance(state, {airborne: 1}, 8);
  assert.ok(hover.kneeLeft.x > .2 && hover.elbowLeft.x < -.2);
  assert.ok(hover.shoulderLeft.z < -.1 && hover.shoulderRight.z > .1);
  const settled = structuredClone(hover);
  advance(state, {airborne: 1}, 10);
  for (const name in settled) for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(settled[name][axis] - state.pose[name][axis]) < 1e-8);
  }
});

test('boost trails the legs; braking counterposes instead of moving as a rigid body', () => {
  const state = createArticulationState();
  const boost = structuredClone(advance(state, {airborne: 1, forwardSpeed: 2.6, boost: true}, 3));
  const brake = advance(state, {airborne: 1, brake: 1}, 3);
  assert.ok(boost.hipLeft.x > .3 && boost.kneeLeft.x > .85);
  assert.ok(brake.hipLeft.x < -.3 && brake.shoulderLeft.x < -.3);
  assert.ok(brake.elbowLeft.x < boost.elbowLeft.x - .15);
  assert.ok(brake.kneeLeft.x > .5 && brake.ankleLeft.x < 0);
});

test('ordinary cruise visibly bends elbows and knees even without boost', () => {
  const state = createArticulationState();
  const hover = structuredClone(advance(state, {airborne: 1}, 3));
  const early = structuredClone(advance(state, {airborne: 1, forwardThrust: 1}, .35));
  assert.ok(early.kneeLeft.x > hover.kneeLeft.x + .23, 'intent anticipates speed');
  assert.ok(early.elbowLeft.x < hover.elbowLeft.x - .14, 'arms visibly change on ordinary thrust');
  const cruise = advance(state, {airborne: 1, forwardSpeed: 1}, 2);
  assert.ok(cruise.kneeLeft.x > .58 && cruise.kneeLeft.x < .60);
  assert.ok(cruise.elbowLeft.x < -.49 && cruise.elbowLeft.x > -.51);
  assert.ok(cruise.hipLeft.x > .15 && cruise.hipLeft.x < .18);
  assert.ok(cruise.kneeLeft.x - hover.kneeLeft.x > .34);
});

test('gentle steering and braking remain proportional without snapping to full poses', () => {
  const steady = input => advance(createArticulationState(), {airborne: 1, forwardSpeed: 1, ...input}, 4);
  const cruise = steady({});
  const halfBrake = steady({brake: .5});
  const fullBrake = steady({brake: 1});
  for (const joint of ['hipLeft', 'elbowLeft', 'shoulderLeft', 'kneeLeft']) {
    assert.ok(Math.abs(halfBrake[joint].x - (cruise[joint].x + fullBrake[joint].x) / 2) < 1e-8, joint);
  }
  const gentleTurn = steady({turn: .275});
  const hardTurn = steady({turn: 1.1});
  assert.ok(hardTurn.kneeLeft.x - hardTurn.kneeRight.x > .33);
  assert.ok(Math.abs((gentleTurn.kneeLeft.x - gentleTurn.kneeRight.x) * 4 -
    (hardTurn.kneeLeft.x - hardTurn.kneeRight.x)) < 1e-8);
});

test('climbing folds the knees and levels the hips instead of using the hover silhouette', () => {
  const hover = advance(createArticulationState(), {airborne: 1}, 4);
  const climb = advance(createArticulationState(), {airborne: 1, verticalSpeed: 1}, 4);
  assert.ok(climb.kneeLeft.x > hover.kneeLeft.x + .15);
  assert.ok(climb.hipLeft.x < hover.hipLeft.x - .09);
  assert.ok(climb.ankleLeft.x < hover.ankleLeft.x - .05);
});

test('opposite turns and lateral thrust produce mirrored articulated poses', () => {
  const left = advance(createArticulationState(), {airborne: 1, forwardSpeed: 1, lateralSpeed: .6, turn: .8}, 2);
  const right = advance(createArticulationState(), {airborne: 1, forwardSpeed: 1, lateralSpeed: -.6, turn: -.8}, 2);
  for (const name in left) {
    const mirror = name.includes('Left') ? name.replace('Left', 'Right') : name.includes('Right') ? name.replace('Right', 'Left') : name;
    assert.ok(Math.abs(left[name].x - right[mirror].x) < 1e-12, `${name}.x`);
    assert.ok(Math.abs(left[name].y + right[mirror].y) < 1e-12, `${name}.y`);
    assert.ok(Math.abs(left[name].z + right[mirror].z) < 1e-12, `${name}.z`);
  }
});

test('head leads the torso while extremities lag with distinct response times', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1}, 3);
  const before = structuredClone(state.pose);
  const pose = advance(state, {airborne: 1, forwardSpeed: 1, turn: 1.1}, .1);
  const headResponse = pose.neck.y / .23;
  const chestResponse = pose.chest.y / -.09;
  assert.ok(headResponse > chestResponse * 1.7);
  assert.ok(pose.shoulderLeft.x !== before.shoulderLeft.x);
  assert.ok(Math.abs(pose.wristLeft.x - before.wristLeft.x) < .03);
  assert.ok(Math.abs(pose.hipLeft.x - pose.kneeLeft.x) > .1);
});

test('thrust travels from shoulders and hips toward the slower elbows and ankles', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1}, 5);
  const before = structuredClone(state.pose);
  const pose = advance(state, {airborne: 1, forwardThrust: 1}, .12, 100);
  const shoulder = (pose.shoulderLeft.x - before.shoulderLeft.x) / .11;
  const elbow = (before.elbowLeft.x - pose.elbowLeft.x) / .22;
  const knee = (pose.kneeLeft.x - before.kneeLeft.x) / .35;
  const ankle = (before.ankleLeft.x - pose.ankleLeft.x) / .12;
  assert.ok(shoulder > elbow * 1.25);
  assert.ok(knee > ankle * 1.5);
});

test('limbs pass the requested pose slightly then recover without losing the mechanical limits', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1}, 5);
  let maximum = 0;
  for (let i = 0; i < 480; i++) {
    stepArticulation(state, {airborne: 1, forwardThrust: 1, trim: false}, 1 / 120);
    maximum = Math.max(maximum, state.pose.kneeLeft.x);
  }
  assert.ok(maximum > .60 && maximum < .62, 'controlled knee follow-through');
  assert.ok(Math.abs(state.pose.kneeLeft.x - .59) < 1e-7);
  assert.ok(Math.abs(state.velocity.kneeLeft.x) < 1e-7);
});

test('input reversal preserves limb momentum and does not snap between target poses', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1}, 4);
  advance(state, {airborne: 1, forwardThrust: 1, turn: 1.1}, .15);
  const before = structuredClone(state.pose), previousVelocity = state.velocity.elbowLeft.x;
  stepArticulation(state, {airborne: 1, brake: 1, turn: -1.1, trim: false}, 1 / 120);
  assert.ok(previousVelocity < 0 && state.velocity.elbowLeft.x < 0);
  for (const name in state.pose) for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(state.pose[name][axis] - before[name][axis]) < .04, `${name}.${axis}`);
  }
  advance(state, {airborne: 1, brake: 1, turn: -1.1}, 5);
  assert.ok(Math.abs(state.pose.kneeLeft.x - .35) < 1e-6);
});

test('powered trim stays small and slow, and is absent during docking or reduced motion', () => {
  const live = createArticulationState(), nominal = createArticulationState();
  advance(live, {airborne: 1, forwardSpeed: 1, trim: true}, 5);
  advance(nominal, {airborne: 1, forwardSpeed: 1}, 5);
  let minimumKnee = Infinity, maximumKnee = -Infinity, fastestFrame = 0;
  for (let i = 0; i < 1200; i++) {
    const previous = live.pose.kneeLeft.x;
    stepArticulation(live, {airborne: 1, forwardSpeed: 1}, 1 / 120);
    minimumKnee = Math.min(minimumKnee, live.pose.kneeLeft.x);
    maximumKnee = Math.max(maximumKnee, live.pose.kneeLeft.x);
    fastestFrame = Math.max(fastestFrame, Math.abs(live.pose.kneeLeft.x - previous));
    for (const name in live.pose) for (const axis of ['x', 'y', 'z']) {
      assert.ok(Math.abs(live.pose[name][axis] - nominal.pose[name][axis]) < .032, `${name}.${axis}`);
    }
  }
  assert.ok(maximumKnee - minimumKnee > .04 && maximumKnee - minimumKnee < .06);
  assert.ok(fastestFrame < .0003, 'slow trim, not high-frequency flutter');
  for (const mode of [{docking: true}, {reduced: true}]) {
    const a = createArticulationState(), b = createArticulationState();
    const input = {airborne: 1, forwardSpeed: 1, ...mode};
    advance(a, {...input, trim: true}, 6);
    advance(b, input, 6);
    assert.deepEqual(a.pose, b.pose);
  }
});

test('30, 60 and 120 FPS agree through live trim, thrust, turns, and braking', () => {
  const poses = [30, 60, 120].map(hz => {
    const state = createArticulationState();
    advance(state, {airborne: 1, trim: true}, 1, hz);
    advance(state, {airborne: 1, forwardSpeed: 2.6, turn: .9, lateralSpeed: .4, boost: 1, trim: true}, .4, hz);
    return advance(state, {airborne: 1, brake: 1, turn: -.6, trim: true}, .2, hz);
  });
  for (const pose of poses.slice(1)) for (const name in pose) for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(pose[name][axis] - poses[0][name][axis]) < 1e-10, `${name}.${axis}`);
  }
});

test('abrupt and extreme input never exceeds mechanical limits or becomes nonfinite', () => {
  const state = createArticulationState();
  for (let i = 0; i < 1800; i++) {
    const sign = i % 31 < 15 ? 1 : -1;
    stepArticulation(state, {airborne: 1, forwardSpeed: sign * 200, lateralSpeed: sign * 200,
      verticalSpeed: -sign * 200, turn: sign * 200, boost: i % 2, brake: i % 3 === 0}, i % 4 ? 1 / 120 : .4);
    for (const name in state.pose) for (const axis of ['x', 'y', 'z']) {
      const value = state.pose[name][axis], [min, max] = ARTICULATION_LIMITS[name][axis];
      assert.ok(Number.isFinite(value) && value >= min && value <= max, `${name}.${axis}`);
      assert.ok(Number.isFinite(state.velocity[name][axis]));
    }
  }
});

test('docking neutralizes the pose and zero airborne or explicit reset clears all inertia', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1, forwardSpeed: 2.6, boost: 1, turn: 1}, 1);
  const flyingKnee = state.pose.kneeLeft.x;
  advance(state, {airborne: .2, docking: true}, .6);
  assert.ok(state.pose.kneeLeft.x < flyingKnee * .2);
  stepArticulation(state, {airborne: 0, docking: true}, 0);
  assertZero(state);
  advance(state, {airborne: 1, forwardSpeed: 1}, .2);
  resetArticulation(state);
  assertZero(state);
});

test('reduced motion uses a modest static airborne pose without secondary inertia', () => {
  const state = createArticulationState();
  advance(state, {airborne: 1, turn: 1, forwardSpeed: 2.6, boost: 1}, .3);
  const pose = structuredClone(stepArticulation(state, {airborne: 1, reduced: true}, 1 / 60));
  assert.ok(pose.kneeLeft.x > 0 && pose.kneeLeft.x < .1);
  advance(state, {airborne: 1, reduced: true, turn: -1, forwardSpeed: 2.6, brake: 1}, 2);
  assert.deepEqual(state.pose, pose);
  for (const value of Object.values(state.velocity)) for (const axis of Object.values(value)) assert.equal(axis, 0);
  stepArticulation(state, {airborne: 0, reduced: true}, 1 / 60);
  assertZero(state);
});
