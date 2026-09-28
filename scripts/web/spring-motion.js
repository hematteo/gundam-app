// Analytic damped spring with a fixed target over dt. Frequencies are radians
// per second; damping < 1 preserves a controlled amount of follow-through.
export function stepSpring(value, velocity, target, angularFrequency, dampingRatio, dt) {
  value = Number.isFinite(value) ? value : 0;
  velocity = Number.isFinite(velocity) ? velocity : 0;
  target = Number.isFinite(target) ? target : value;
  const omega = Number.isFinite(angularFrequency) ? Math.max(0, angularFrequency) : 0;
  const damping = Number.isFinite(dampingRatio) ? Math.max(0, dampingRatio) : 1;
  dt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (!dt) return {value, velocity};
  if (!omega) return {value: value + velocity * dt, velocity};

  const offset = value - target;
  if (Math.abs(damping - 1) < 1e-5) {
    const impulse = velocity + omega * offset;
    const decay = Math.exp(-omega * dt);
    return {
      value: target + (offset + impulse * dt) * decay,
      velocity: (velocity - omega * impulse * dt) * decay,
    };
  }
  if (damping < 1) {
    const drag = damping * omega;
    const frequency = omega * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-drag * dt);
    const cosine = Math.cos(frequency * dt), sine = Math.sin(frequency * dt);
    return {
      value: target + decay * (offset * cosine + (velocity + drag * offset) / frequency * sine),
      velocity: decay * (velocity * cosine - (drag * velocity + omega * omega * offset) / frequency * sine),
    };
  }

  const root = Math.sqrt(damping * damping - 1);
  const slow = -omega / (damping + root), fast = -omega * (damping + root);
  const slowWeight = (velocity - fast * offset) / (slow - fast);
  const fastWeight = offset - slowWeight;
  const a = slowWeight * Math.exp(slow * dt), b = fastWeight * Math.exp(fast * dt);
  return {value: target + a + b, velocity: slow * a + fast * b};
}
