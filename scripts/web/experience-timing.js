export const ARRIVAL_SECONDS = 8;
export const DEPLOYMENT_SECONDS = 5.2;
export const clamp01 = value => Math.max(0, Math.min(1, value));
export function phase(value, start, end) {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export function arrivalState(seconds) {
  return {
    approach: phase(seconds, .65, 1.4),
    rear: phase(seconds, 2.0, 2.8),
    work: phase(seconds, 3.45, 4.35),
    sensors: phase(seconds, 5.15, 5.8),
    caption: seconds < 2 ? 'Hangar 01' : seconds > 6.3 ? 'Strike Freedom' : '',
  };
}
export function wingState(progress, pair = 'front inner', side = 'left') {
  const order = {'rear outer': 0, 'rear inner': 1, 'front outer': 2, 'front inner': 3};
  const delay = (order[pair] ?? 3) * .055 + (side === 'right' ? .018 : 0);
  return {
    primary: phase(progress, .18 + delay, .59 + delay),
    secondary: phase(progress, .52 + delay, .80 + delay),
    release: phase(progress, .015, .17),
  };
}
