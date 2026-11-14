// One continuous surface drives the silhouette, silk filaments and drifting motes.
// Sampling across its normal keeps detail attached while the whole curl reshapes.
export type Point = readonly [number, number];
const TAU = Math.PI * 2;
export const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function flowState(time: number) {
  const growth = clamp(time / 4.8);
  return {
    extent: 0.045 + 0.955 * (1 - Math.pow(1 - growth, 2.1)),
    phase: time * 0.16 + 1.65 * (1 - Math.exp(-time / 2.4)),
    surge: Math.exp(-Math.pow((time - 2.9) / 1.15, 2)),
  };
}
type FlowState = ReturnType<typeof flowState>;

function center(u: number, { phase, surge }: FlowState): Point {
  const angle = 2.62 - u * 7.85 + 0.14 * Math.sin(u * TAU + phase);
  const radius = 264 * (1 - 0.79 * u) *
    (1 + 0.095 * Math.sin(u * 12 - phase) + surge * 0.09 * Math.sin(u * 8));
  return [
    414 + radius * 1.12 * Math.cos(angle) + 13 * Math.sin(u * 13 + phase),
    318 + radius * 0.91 * Math.sin(angle) + 16 * Math.sin(u * 9 - phase),
  ];
}
export const centerAt = (u: number, time: number): Point => center(u, flowState(time));

function crossSection(u: number, state: FlowState) {
  const { phase, surge, extent } = state;
  const [x, y] = center(u, state);
  const before = center(u - 0.001, state);
  const after = center(u + 0.001, state);
  const dx = after[0] - before[0];
  const dy = after[1] - before[1];
  const length = Math.hypot(dx, dy) || 1;
  const head = clamp((extent - u) / 0.11);
  const taper = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.72) * Math.sin(head * Math.PI / 2);
  const rawWidth = taper * (57 + 28 * Math.sin(u * 8.5 + phase * 0.7) + surge * 13);
  // Keep the inner edge inside its curvature radius; otherwise normals cross and
  // produce little white tears at the tightest fold.
  const bend = Math.abs(dx * (after[1] + before[1] - 2 * y) - dy * (after[0] + before[0] - 2 * x));
  const radius = Math.min(1000, length ** 3 / Math.max(4 * bend, 1e-8));
  const limit = radius * 0.7;
  const width = limit * Math.tanh(rawWidth / limit);
  const flutter = taper * (2.1 * Math.sin(u * 33 - phase * 2) + 1.1 * Math.sin(u * 53 + phase));
  return { x, y, nx: -dy / length, ny: dx / length, width, flutter, twist: u * 9 - phase * 1.3 };
}

function across(section: ReturnType<typeof crossSection>, v: number): Point {
  const { x, y, nx, ny, width, flutter, twist } = section;
  const fold = Math.sin(v * Math.PI + twist);
  const offset = width * (v + 0.16 * Math.sin(v * Math.PI) * fold) + flutter * Math.abs(v) ** 3;
  return [x + nx * offset, y + ny * offset];
}
export const surfaceAt = (u: number, v: number, time: number): Point => across(crossSection(u, flowState(time)), v);

export function pathThrough(points: readonly Point[], close = false) {
  const fmt = ([x, y]: Point) => `${x.toFixed(1)},${y.toFixed(1)}`;
  let d = `M${fmt(points[0])}`;
  // Quadratic midpoints remove faceted edges without a filter or large blur.
  for (let i = 1; i < points.length - 1; i++) {
    const next = points[i + 1];
    d += `Q${fmt(points[i])} ${fmt([(points[i][0] + next[0]) / 2, (points[i][1] + next[1]) / 2])}`;
  }
  return d + `L${fmt(points[points.length - 1])}` + (close ? 'Z' : '');
}

export function flowMesh(time: number, compact = false) {
  const state = flowState(time);
  const steps = compact ? 74 : 112;
  const count = compact ? 36 : 56;
  // Compute the shared frame once per longitudinal sample, not once per strand.
  const sections = Array.from({ length: steps + 1 }, (_, i) => crossSection(i / steps * state.extent, state));
  const rows = Array.from({ length: count + 1 }, (_, row) => sections.map(section => across(section, row / count * 2 - 1)));
  return {
    silhouette: pathThrough([...rows[0], ...[...rows[count]].reverse()], true),
    bands: rows.slice(0, -1).map((row, i) => pathThrough([...row, ...[...rows[i + 1]].reverse()], true)),
    threads: rows.map(row => pathThrough(row)),
    wisps: [-1, 1].flatMap(side => Array.from({ length: 5 }, (_, i) =>
      pathThrough(sections.map(section => across(section, side * (1.055 + i * 0.075)))),
    )),
  };
}
