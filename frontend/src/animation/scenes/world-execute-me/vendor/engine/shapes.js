// Outline shapes as point lists that can be traced, filled with ASCII and MORPHED into each
// other. Every outline has the same number of points, starts at 12 o'clock and runs
// clockwise, so morph(a, b, k) gives a clean shape-to-shape MATCH CUT: the outgoing shot
// ends on an outline, the incoming shot starts on the same outline and relaxes it into its
// own subject.
import { lerp } from './util.js';

export const N = 180;
const TAU = Math.PI * 2;

/** Resample a closed polygon to n points evenly spaced along its perimeter. */
function resample(verts, n = N) {
  const seg = verts.map((v, i) => { const w = verts[(i + 1) % verts.length]; return Math.hypot(w[0] - v[0], w[1] - v[1]); });
  const total = seg.reduce((a, b) => a + b, 0), out = [];
  let i = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (acc + seg[i] < d) { acc += seg[i]; i++; }
    const u = (d - acc) / seg[i], a = verts[i], b = verts[(i + 1) % verts.length];
    out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
  }
  return out;
}

/** Closed Catmull-Rom spline through control points, then evenly resampled. */
function spline(ctrl, n = N) {
  const dense = [], m = ctrl.length;
  for (let i = 0; i < m; i++) {
    const p0 = ctrl[(i - 1 + m) % m], p1 = ctrl[i], p2 = ctrl[(i + 1) % m], p3 = ctrl[(i + 2) % m];
    for (let s = 0; s < 12; s++) {
      const t = s / 12, t2 = t * t, t3 = t2 * t;
      dense.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return resample(dense, n);
}

const param = (fn, n = N) => Array.from({ length: n }, (_, i) => fn(i / n));
const ngon = (k, r = 1, phase = -Math.PI / 2) => resample(Array.from({ length: k }, (_, i) => [Math.cos(phase + (i / k) * TAU) * r, Math.sin(phase + (i / k) * TAU) * r]));

/** Unit shapes (roughly inside radius 1, y down). */
export const SHAPE = {
  circle: param((u) => [Math.sin(u * TAU), -Math.cos(u * TAU)]),
  square: resample([[0, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8], [-0.8, -0.8]]),
  triangle: resample([[0, -0.95], [0.95, 0.72], [-0.95, 0.72]]),
  hexagon: ngon(6),
  diamond: ngon(4),
  flat: param((u) => [Math.sin(u * TAU), 0]),                                    // a circle squashed into a line
  heart: param((u) => {
    const a = u * TAU;
    return [(16 * Math.sin(a) ** 3) / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17 - 0.12];
  }),
  eye: param((u) => { const a = u * TAU, s = Math.cos(a); return [Math.sin(a), -0.52 * s * Math.pow(Math.abs(s), 0.35)]; }),
  star: resample(Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + (i / 10) * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; })),
  eggplant: spline([[0.02, -0.8], [0.26, -0.6], [0.46, -0.12], [0.58, 0.36], [0.42, 0.8], [0.0, 0.96], [-0.42, 0.8], [-0.58, 0.36], [-0.44, -0.12], [-0.22, -0.6]]),
  tomato: param((u) => { const a = u * TAU, dip = Math.exp(-Math.pow(Math.min(u, 1 - u) * 9, 2)); return [Math.sin(a) * 1.0, -Math.cos(a) * 0.86 + dip * 0.14]; }),
  cat: spline([[0, -0.5], [0.3, -0.6], [0.66, -1.0], [0.84, -0.4], [0.96, 0.1], [0.62, 0.62], [0, 0.82], [-0.62, 0.62], [-0.96, 0.1], [-0.84, -0.4], [-0.66, -1.0], [-0.3, -0.6]]),
};

/**
 * Silhouette (convex hull) of a set of screen points as a standard outline: used to hand a
 * 3D wireframe over to a 2D shape in a match cut.
 */
export function hullOutline(points, n = N) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => { const h = []; for (const q of list) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); } h.pop(); return h; };
  let hull = [...half(p), ...half([...p].reverse())];          // clockwise on screen (y down)
  let top = 0;
  hull.forEach((q, i) => { if (q[1] < hull[top][1]) top = i; });
  hull = [...hull.slice(top), ...hull.slice(0, top)];          // start at the topmost vertex
  return resample(hull, n);
}

/** Place a unit shape on screen: centre, radius, rotation, optional anisotropic scale. */
export function place(shape, { cx = 0, cy = 0, r = 1, rot = 0, sx = 1, sy = 1 } = {}) {
  const pts = typeof shape === 'string' ? SHAPE[shape] : shape, c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([x, y]) => { x *= sx; y *= sy; return [cx + (x * c - y * s) * r, cy + (x * s + y * c) * r]; });
}

/** Point-wise blend of two outlines (same point count). */
export function morph(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]);
}

/** First k (0..1) of an outline, for "drawing" it. */
export function trace(pts, k) {
  if (k >= 1) return pts;
  const x = Math.max(0, k) * pts.length, n = Math.floor(x), out = pts.slice(0, n + 1);
  if (n + 1 < pts.length && out.length) { const a = pts[n], b = pts[n + 1], u = x - n; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); }
  return out;
}

/** Even-odd point-in-polygon test. */
export function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Fill an outline with ASCII glyphs on the character grid (one fillText per row and tier).
 * shade(nx, ny, col, row) -> brightness 0..1 for a cell at normalised position (nx, ny) = offset from
 * (cx, cy) in units of r (-1..1 inside the shape's bounding circle); col / row = the cell's grid index
 * (a stable key for per-cell noise). Glyph density follows brightness, as everywhere else in the film.
 * The grid is anchored on (cx, cy) and reaches as far as the outline does. reveal 0..1 prints it top-down.
 */
export function asciiFill(ctx, pts, { cx, cy, r, size = 20, shade, colors = ['meDim', 'me', 'meHot'], alpha = 1, ramp = ' .:o0#', reveal = 1 }) {
  if (!(alpha > 0.003) || pts.length < 3) return;
  const cw = ctx.cw(size), ch = size;
  // half extent of the grid: 1.1 r as a rule, more when the outline (mid-morph, stretched, off centre) reaches further
  let hw = r * 1.1, hh = r * 1.1;
  for (const p of pts) { hw = Math.max(hw, Math.abs(p[0] - cx)); hh = Math.max(hh, Math.abs(p[1] - cy)); }
  const cols = 2 * Math.ceil(hw / cw) + 2, rows = 2 * Math.ceil(hh / ch) + 2;
  const last = Math.floor(reveal * rows);
  // The glyph grid is CLIPPED to the outline. A cell is filled when it touches the shape at all
  // (centre or any corner inside), and the clip then trims whatever sticks out, so the fill reaches
  // the edge everywhere and nothing is ever drawn outside the line. Clip and cell test use the same
  // (even-odd) rule, so they also agree where an outline crosses itself in the middle of a morph.
  ctx.clipPath(pts, () => {
    ctx.font(size, 400, 'mono'); ctx.g.textAlign = 'left';
    for (let j = 0; j < Math.min(rows, last + 1); j++) {
      const y = cy + (j - rows / 2 + 0.5) * ch, strs = ['', '', ''];
      for (let i = 0; i < cols; i++) {
        const x = cx + (i - cols / 2 + 0.5) * cw;
        let c = ' ', tier = 0;
        const hx = cw / 2, hy = ch / 2;
        if (inPoly(pts, x, y) || inPoly(pts, x - hx, y - hy) || inPoly(pts, x + hx, y - hy) || inPoly(pts, x - hx, y + hy) || inPoly(pts, x + hx, y + hy)) {
          let b = shade ? shade((x - cx) / r, (y - cy) / r, i, j) : 0.6;
          if (j === last && reveal < 1) b = 1;
          const idx = Math.max(1, Math.min(ramp.length - 1, Math.floor(b * ramp.length)));
          c = ramp[idx]; tier = idx >= ramp.length - 2 ? 2 : idx >= 2 ? 1 : 0;
        }
        for (let k = 0; k < 3; k++) strs[k] += k === tier ? c : ' ';
      }
      for (let k = 0; k < 3; k++) {
        if (!strs[k].trim()) continue;
        ctx.g.fillStyle = ctx.col(colors[k], alpha);
        ctx.g.fillText(strs[k], cx - (cols * cw) / 2, y + ch * 0.35);
      }
    }
  }, 'evenodd');
}
