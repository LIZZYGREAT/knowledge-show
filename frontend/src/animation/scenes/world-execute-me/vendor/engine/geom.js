// Wireframe geometry: unit polyhedra as "edge soups" (lists of 3D segments) that can be
// rotated, exploded, morphed into each other and drawn as glowing lines.
import { rand } from './prng.js';
import { lerp } from './util.js';

const PHI = (1 + Math.sqrt(5)) / 2;
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Rotate p around X, then Y, then Z (radians). */
export function rot(p, rx, ry, rz = 0) {
  let [x, y, z] = p, c, s, t;
  c = Math.cos(rx); s = Math.sin(rx); t = y * c - z * s; z = y * s + z * c; y = t;
  c = Math.cos(ry); s = Math.sin(ry); t = x * c + z * s; z = -x * s + z * c; x = t;
  if (rz) { c = Math.cos(rz); s = Math.sin(rz); t = x * c - y * s; y = x * s + y * c; x = t; }
  return [x, y, z];
}

/** Perspective projection. cam = { cx, cy, scale (px per unit), dist }. Returns [x, y, depthFactor]. */
export function project(p, cam) {
  const d = cam.dist ?? 4, k = d / (d + p[2]);
  return [cam.cx + p[0] * k * cam.scale, cam.cy + p[1] * k * cam.scale, k];
}

/** Build a mesh from vertices: all are pushed onto the unit sphere, edges = closest vertex pairs. */
function mesh(raw) {
  const verts = raw.map(norm);
  let min = Infinity;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) min = Math.min(min, dist(verts[i], verts[j]));
  const edges = [];
  for (let i = 0; i < verts.length; i++) for (let j = i + 1; j < verts.length; j++) if (dist(verts[i], verts[j]) < min * 1.01) edges.push([i, j]);
  return { verts, edges, segs: edges.map(([i, j]) => [verts[i], verts[j]]) };
}

const signs = (v) => {            // all sign combinations of the non-zero components
  let out = [[]];
  for (const c of v) out = c === 0 ? out.map((o) => [...o, 0]) : out.flatMap((o) => [[...o, c], [...o, -c]]);
  return out;
};
const cyc = (v) => [v, [v[2], v[0], v[1]], [v[1], v[2], v[0]]];

export const MESH = {
  tetra: mesh([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]),
  cube: mesh(signs([1, 1, 1])),
  octa: mesh(cyc([1, 0, 0]).flatMap(signs)),
  icosa: mesh(cyc([0, 1, PHI]).flatMap(signs)),
  dodeca: mesh([...signs([1, 1, 1]), ...cyc([0, 1 / PHI, PHI]).flatMap(signs)]),
};

/** Repeat/cycle a segment list to exactly n segments (so different meshes can be morphed 1:1). */
export function matchSegs(segs, n) {
  return Array.from({ length: n }, (_, i) => segs[i % segs.length]);
}

/** Per-segment linear morph. k may be a number or a function (i) => 0..1 for staggered motion. */
export function lerpSegs(A, B, k) {
  return A.map((a, i) => {
    const kk = typeof k === 'function' ? k(i) : k, b = B[i];
    return [0, 1].map((e) => [0, 1, 2].map((c) => lerp(a[e][c], b[e][c], kk)));
  });
}

/**
 * Exploded view: push every segment outwards along its midpoint direction and tilt it a little.
 * amount 0 = intact. `unique` = number of distinct edges (duplicates from matchSegs stay together).
 */
export function explodeSegs(segs, amount, seed = 0, unique = segs.length) {
  if (amount <= 0.0005) return segs;
  return segs.map(([a, b], n) => {
    const i = n % unique;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const push = amount * (0.6 + 0.8 * rand(seed, i, 1));
    const spin = amount * (rand(seed, i, 2) - 0.5) * 0.9;
    return [a, b].map((p) => {
      const r = rot([p[0] - m[0], p[1] - m[1], p[2] - m[2]], spin, spin * 0.7);
      return [r[0] + m[0] * (1 + push), r[1] + m[1] * (1 + push), r[2] + m[2] * (1 + push)];
    });
  });
}

/** n loose segments lying flat on a floor plane (y = floorY), seeded positions and headings. */
export function floorPieces(n, seed, { floorY = 0.85, spread = 1.35, len = 0.5 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const x = (rand(seed, i, 1) - 0.5) * 2 * spread, z = (rand(seed, i, 2) - 0.5) * 2 * spread * 0.8;
    const a = rand(seed, i, 3) * Math.PI, dx = Math.cos(a) * len / 2, dz = Math.sin(a) * len / 2;
    return [[x - dx, floorY, z - dz], [x + dx, floorY, z + dz]];
  });
}

/**
 * Draw segments as glowing lines.
 * opts: rot [rx, ry, rz], color, alpha, width, alphaFn(i) per-segment multiplier, grow(i) 0..1 draw-in from end a.
 */
export function drawSegs(ctx, segs, cam, { rot: r = [0, 0, 0], color = 'fg', alpha = 1, width = ctx.cfg.wireframe.lineWidth, alphaFn = null, grow = null } = {}) {
  if (alpha <= 0.003) return;
  for (let i = 0; i < segs.length; i++) {
    let a = rot(segs[i][0], r[0], r[1], r[2]), b = rot(segs[i][1], r[0], r[1], r[2]);
    const g = grow ? grow(i) : 1;
    if (g <= 0) continue;
    if (g < 1) b = [lerp(a[0], b[0], g), lerp(a[1], b[1], g), lerp(a[2], b[2], g)];
    const pa = project(a, cam), pb = project(b, cam);
    const d = cam.dist ?? 4, kFar = d / (d + 1), kNear = d / (d - 1);                 // depth factor range of a unit object
    const depth = 0.3 + 0.7 * Math.min(1, Math.max(0, ((pa[2] + pb[2]) / 2 - kFar) / (kNear - kFar)));   // far edges are dimmer
    ctx.line(pa[0], pa[1], pb[0], pb[1], { color, alpha: alpha * depth * (alphaFn ? alphaFn(i) : 1), width });
  }
}
