import type { VectorKeyframe } from './BundleTypes';
export function ease(u: number, easing: VectorKeyframe['easing'] = 'smoothstep') {
  switch (easing) {
    case 'linear': return u;
    case 'ease-in-cubic': return u * u * u;
    case 'ease-out-cubic': return 1 - (1 - u) ** 3;
    case 'ease-in-out-cubic': return u < .5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
    default: return u * u * (3 - 2 * u);
  }
}
export function interpolate(frames: VectorKeyframe[], ms: number) {
  const right = frames.findIndex(frame => frame.time_ms > ms);
  const a = frames[right === -1 ? frames.length - 1 : Math.max(0, right - 1)];
  const b = frames[right === -1 ? frames.length - 1 : right];
  const u = Math.max(0, Math.min(1, (ms - a.time_ms) / Math.max(1, b.time_ms - a.time_ms)));
  const eased = ease(u, a.easing);
  const get = (key: 'x' | 'y' | 'opacity' | 'scale' | 'rotation' | 'drawProgress') => (a[key] ?? 1) + ((b[key] ?? 1) - (a[key] ?? 1)) * eased;
  return { x: get('x'), y: get('y'), opacity: get('opacity'), scale: get('scale'), rotation: get('rotation'), drawProgress: get('drawProgress') };
}
