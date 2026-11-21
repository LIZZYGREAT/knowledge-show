// Seeded, stateless randomness. Everything is a pure function of (seed, integer keys),
// so a frame never depends on which frames were rendered before it.

let SEED = 1;
export function setSeed(s) { SEED = s >>> 0; }

function mix(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Integer hash of any number of integer keys (floats are floored). */
export function hashU32(...keys) {
  let h = SEED ^ 0x9e3779b9;
  for (const k of keys) h = mix((h + Math.imul(Math.floor(k) + 0x7f4a7c15, 0x85ebca6b)) | 0);
  return h;
}

/** Uniform float in [0,1) from integer keys. */
export function rand(...keys) { return hashU32(...keys) / 4294967296; }

/** Uniform float in [a,b). */
export function randRange(a, b, ...keys) { return a + (b - a) * rand(...keys); }

/** Sequential generator for when a short deterministic stream is handier than keys. */
export function mulberry32(seed) {
  let a = (seed ^ SEED) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in [0,1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return rand(seed, i) * (1 - u) + rand(seed, i + 1) * u;
}

/** Smooth 3D value noise in [0,1]. */
export function noise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const c = (a, b, d) => rand(seed, ix + a, iy + b, iz + d);
  const x00 = c(0, 0, 0) * (1 - ux) + c(1, 0, 0) * ux, x10 = c(0, 1, 0) * (1 - ux) + c(1, 1, 0) * ux;
  const x01 = c(0, 0, 1) * (1 - ux) + c(1, 0, 1) * ux, x11 = c(0, 1, 1) * (1 - ux) + c(1, 1, 1) * ux;
  return (x00 * (1 - uy) + x10 * uy) * (1 - uz) + (x01 * (1 - uy) + x11 * uy) * uz;
}
