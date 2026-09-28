import {stepSpring} from './spring-motion.js?v=flight-feel-3';

// Local Euler angles in radians. The suit faces +Z; its left side is at -X.
// Each limit includes the authored, docked pose at zero.
export const ARTICULATION_LIMITS = {
  chest: {x: [-.12, .14], y: [-.14, .14], z: [-.10, .10]},
  neck: {x: [-.12, .12], y: [-.28, .28], z: [-.08, .08]},
  shoulderLeft: {x: [-.46, .32], y: [-.14, .14], z: [-.27, .08]},
  shoulderRight: {x: [-.46, .32], y: [-.14, .14], z: [-.08, .27]},
  elbowLeft: {x: [-1, 0], y: [-.08, .08], z: [-.07, .07]},
  elbowRight: {x: [-1, 0], y: [-.08, .08], z: [-.07, .07]},
  wristLeft: {x: [-.12, .12], y: [-.10, .10], z: [-.10, .10]},
  wristRight: {x: [-.12, .12], y: [-.10, .10], z: [-.10, .10]},
  hipLeft: {x: [-.42, .46], y: [-.14, .14], z: [-.13, .09]},
  hipRight: {x: [-.42, .46], y: [-.14, .14], z: [-.09, .13]},
  kneeLeft: {x: [0, 1.12], y: [0, 0], z: [0, 0]},
  kneeRight: {x: [0, 1.12], y: [0, 0], z: [0, 0]},
  ankleLeft: {x: [-.35, .20], y: [-.06, .06], z: [-.08, .08]},
  ankleRight: {x: [-.35, .20], y: [-.06, .06], z: [-.08, .08]},
  skirtLeft: {x: [-.23, .23], y: [-.06, .06], z: [-.18, .03]},
  skirtRight: {x: [-.23, .23], y: [-.06, .06], z: [-.03, .18]},
  wingLeft: {x: [-.055, .055], y: [-.055, .055], z: [-.055, .055]},
  wingRight: {x: [-.055, .055], y: [-.055, .055], z: [-.055, .055]},
};

const RESPONSE = {
  chest: 7.5, neck: 13,
  shoulderLeft: 7.5, shoulderRight: 7.5,
  elbowLeft: 6, elbowRight: 6,
  wristLeft: 4, wristRight: 4,
  hipLeft: 7.5, hipRight: 7.5,
  kneeLeft: 6.5, kneeRight: 6.5,
  ankleLeft: 4.2, ankleRight: 4.2,
  skirtLeft: 5.2, skirtRight: 5.2,
  wingLeft: 4.6, wingRight: 4.6,
};
const DAMPING = {
  chest: .88, neck: .93,
  shoulderLeft: .76, shoulderRight: .76,
  elbowLeft: .70, elbowRight: .70,
  wristLeft: .60, wristRight: .60,
  hipLeft: .78, hipRight: .78,
  kneeLeft: .70, kneeRight: .70,
  ankleLeft: .62, ankleRight: .62,
  skirtLeft: .66, skirtRight: .66,
  wingLeft: .72, wingRight: .72,
};
const AXES = ['x', 'y', 'z'];
const JOINTS = Object.keys(ARTICULATION_LIMITS);
const vector = () => ({x: 0, y: 0, z: 0});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => Number.isFinite(value) ? value : 0;
const mix = (from, to, amount) => from + (to - from) * amount;

export function createArticulationState() {
  return {
    pose: Object.fromEntries(JOINTS.map(name => [name, vector()])),
    velocity: Object.fromEntries(JOINTS.map(name => [name, vector()])),
    drivers: {forward: 0, lateral: 0, vertical: 0, turn: 0},
    time: 0,
  };
}

export function resetArticulation(state) {
  for (const name of JOINTS) {
    for (const axis of AXES) state.pose[name][axis] = state.velocity[name][axis] = 0;
  }
  for (const name in state.drivers) state.drivers[name] = 0;
  state.time = 0;
  return state.pose;
}

// Speeds are normalized to ordinary cruising speed. A boosted value can reach
// about 2.6. Forward thrust (0..1) anticipates acceleration; actual speed keeps
// the cruising posture until momentum subsides. Brake and boost accept 0..1.
export function stepArticulation(state, input = {}, dt = 0) {
  const airborne = clamp(finite(input.airborne), 0, 1);
  if (!airborne) return resetArticulation(state);
  dt = clamp(finite(dt), 0, .1);
  // Bound integration intervals for time-varying loads. The spring itself is
  // analytic; these small steps also align trim and acceleration at 30–120 FPS.
  const steps = Math.max(1, Math.ceil(dt * 120 - 1e-9));
  for (let i = 0; i < steps; i++) advanceArticulation(state, input, dt / steps, airborne);
  return state.pose;
}

function advanceArticulation(state, input, dt, airborne) {
  const reduced = Boolean(input.reduced);
  const forward = reduced ? 0 : clamp(finite(input.forwardSpeed), -2.6, 2.6);
  const lateral = reduced ? 0 : clamp(finite(input.lateralSpeed), -2.6, 2.6);
  const vertical = reduced ? 0 : clamp(finite(input.verticalSpeed), -2.6, 2.6);
  const turn = reduced ? 0 : clamp(finite(input.turn) / 1.1, -1, 1);
  const boost = reduced ? 0 : clamp(Number(input.boost) || 0, 0, 1);
  const brake = reduced ? 0 : clamp(Number(input.brake) || 0, 0, 1);
  const thrust = reduced ? 0 : clamp(finite(input.forwardThrust), 0, 1);

  // Acceleration and yaw changes load the joints briefly; distal parts retain
  // that momentum longer than the chest and hips as the force settles.
  const follow = 1 - Math.exp(-5 * dt);
  for (const [name, value] of Object.entries({forward, lateral, vertical, turn})) {
    state.drivers[name] += (value - state.drivers[name]) * follow;
  }
  const forwardLag = reduced ? 0 : clamp(forward - state.drivers.forward, -1, 1);
  const lateralLag = reduced ? 0 : clamp(lateral - state.drivers.lateral, -1, 1);
  const verticalLag = reduced ? 0 : clamp(vertical - state.drivers.vertical, -1, 1);
  const turnLag = reduced ? 0 : clamp(turn - state.drivers.turn, -1, 1);
  const ascent = clamp(vertical, -1, 1);
  const cruise = Math.max(clamp(forward, 0, 1), thrust);
  const rush = clamp(Math.max(0, forward - 1) / 1.6, 0, 1);
  const strafe = clamp(lateral, -1, 1);
  const power = Math.max(rush * (.7 + boost * .3), boost * cruise * .7);
  state.time += reduced ? 0 : dt;
  // Small, slow corrections read as powered balance rather than a frozen pose.
  // They never drive the wrists/head and are removed by docking/reduced motion.
  // `trim: false` lets offline pose inspectors sample the nominal authored load.
  const trim = reduced || input.docking || input.trim === false ? 0 :
    (1 - Math.exp(-state.time * .9)) * (1 - brake * .6);
  const load = .6 + .4 * Math.max(cruise, power);
  const targets = {
    chest: {x: mix(.025 + cruise * .055 + power * .035, -.065, brake),
      y: -turn * .09, z: strafe * .045 + lateralLag * .025},
    neck: {x: -.025 - ascent * .04 - power * .025 + brake * .02,
      y: turn * .23, z: -strafe * .025},
  };

  for (const [name, side] of [['Left', -1], ['Right', 1]]) {
    targets[`shoulder${name}`] = {
      x: mix(-.055 + cruise * .11 + power * .10, -.32, brake) + side * turn * .12 + forwardLag * .035 + side * turnLag * .025,
      y: side * -.035 + turn * .065,
      z: side * (.115 + power * .035 + brake * .06) + strafe * .03 + lateralLag * .025,
    };
    targets[`elbow${name}`] = {x: mix(-.28 - cruise * .22 - power * .15, -.85, brake) - ascent * .07 + side * turn * .07 - side * turnLag * .045,
      y: side * .025 + strafe * .02, z: -side * .012 + lateralLag * .025};
    targets[`wrist${name}`] = {x: .025 + forwardLag * .07 - brake * .045,
      y: side * .018, z: -side * .018 - lateralLag * .05 - turnLag * .04};
    targets[`hip${name}`] = {x: mix(.045 + cruise * .12 + power * .20, -.31, brake) - ascent * .10 + side * turn * .08,
      y: side * .025 + turn * .075,
      z: side * (.035 + power * .015) + strafe * .03};
    targets[`knee${name}`] = {x: mix(.24 + cruise * .35 + power * .29, .52, brake) + ascent * .16 - side * turn * .17 + forwardLag * .055 - side * turnLag * .045,
      y: 0, z: 0};
    targets[`ankle${name}`] = {x: mix(-.075 - cruise * .12 - power * .08, -.14, brake) - ascent * .06 + forwardLag * .04 - verticalLag * .035,
      y: -turn * .025, z: -strafe * .035};
    targets[`skirt${name}`] = {x: mix(cruise * .09 + power * .055, -.15, brake) + forwardLag * .035 - ascent * .03,
      y: -turn * .02, z: side * (.055 + power * .05 + brake * .035) + lateralLag * .025};
    targets[`wing${name}`] = {x: power * .022 + forwardLag * .025 + side * turn * .012,
      y: side * power * .02 + lateralLag * .02,
      z: -side * power * .015 + turn * .02};
    const phase = state.time * .82 + side * .72;
    const balance = Math.sin(phase) * .72 + Math.sin(state.time * .47 + side * 1.4) * .28;
    const correction = Math.sin(phase - .65);
    targets[`hip${name}`].x += trim * load * .014 * balance;
    targets[`knee${name}`].x += trim * load * .028 * correction;
    targets[`ankle${name}`].x -= trim * load * .014 * correction;
    targets[`shoulder${name}`].x -= trim * load * .012 * balance;
    targets[`elbow${name}`].x += trim * load * .016 * Math.sin(phase - 1.1);
  }

  // The return-to-dock sequence progressively removes the flight posture.
  // Zero airborne (and explicit reset) always restores the exact authored pose.
  const weight = airborne * (input.docking ? .25 : 1) * (reduced ? .4 : 1);
  for (const name of JOINTS) {
    const omega = RESPONSE[name] * (input.docking ? 1.65 : 1);
    for (const axis of AXES) {
      const [min, max] = ARTICULATION_LIMITS[name][axis];
      const target = clamp(targets[name][axis] * weight, min, max);
      if (reduced) {
        state.pose[name][axis] = target;
        state.velocity[name][axis] = 0;
        continue;
      }
      const next = stepSpring(state.pose[name][axis], state.velocity[name][axis], target,
        omega, input.docking ? 1 : DAMPING[name], dt);
      state.pose[name][axis] = clamp(next.value, min, max);
      state.velocity[name][axis] = next.velocity;
      if ((next.value < min && next.velocity < 0) || (next.value > max && next.velocity > 0)) {
        state.velocity[name][axis] = 0;
      }
    }
  }
  return state.pose;
}
