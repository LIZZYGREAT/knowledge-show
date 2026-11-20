// Contour tracing for the ink plates (art.js): a coverage map (one byte per source pixel) -> closed outlines
// with sub-pixel vertices, lightly simplified, so a plate can be drawn as a PATH at any magnification
// (close-ups never enlarge the bitmap). Pure functions, no DOM: also runs under Node.
//
//   traceLoops(field, W, H)   marching squares at the 50 % level, linear interpolation along each grid edge
//   simplify(loop, eps)       Ramer-Douglas-Peucker on a closed loop
//   loopArea(loop)            signed area (px²)
//   smoothPath(loops, P)      -> one path (P = a Path2D-like object): gentle bends become quadratic curves through the
//                             edge midpoints, real corners stay corners (cut paper has both)

const ISO = 127.5;

/**
 * Outlines of the region where field > 127.5. `field` is a Uint8Array of W * H coverage values (sample (i, j) sits at
 * the pixel centre (i + 0.5, j + 0.5)); everything outside the map counts as empty, so a figure that is cut by the
 * canvas edge is closed along that edge. Returns an array of loops, each a Float32Array [x0, y0, x1, y1, ...].
 */
export function traceLoops(field, W, H) {
  // crossing points live on grid edges: horizontal edge (i, j)-(i + 1, j) for i = -1..W-1, j = 0..H-1;
  // vertical edge (i, j)-(i, j + 1) for i = 0..W-1, j = -1..H-1
  const HW = W + 1, NH = H * HW, VH = H + 1, next = new Int32Array(NH + W * VH).fill(-1);
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : field[j * W + i]);
  const hId = (i, j) => j * HW + (i + 1), vId = (i, j) => NH + i * VH + (j + 1);
  for (let cy = -1; cy < H; cy++) {
    for (let cx = -1; cx < W; cx++) {
      const tl = at(cx, cy) > ISO, tr = at(cx + 1, cy) > ISO, br = at(cx + 1, cy + 1) > ISO, bl = at(cx, cy + 1) > ISO;
      const k = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const T = hId(cx, cy), B = hId(cx, cy + 1), L = vId(cx, cy), R = vId(cx + 1, cy);
      switch (k) {                                    // one orientation throughout, so every crossing has one way in and one way out
        case 1: next[L] = B; break;
        case 2: next[B] = R; break;
        case 3: next[L] = R; break;
        case 4: next[R] = T; break;
        case 5: next[L] = T; next[R] = B; break;
        case 6: next[B] = T; break;
        case 7: next[L] = T; break;
        case 8: next[T] = L; break;
        case 9: next[T] = B; break;
        case 10: next[T] = R; next[B] = L; break;
        case 11: next[T] = R; break;
        case 12: next[R] = L; break;
        case 13: next[R] = B; break;
        default: next[B] = L; break;                  // 14
      }
    }
  }
  const point = (id, out) => {                        // where the 50 % level crosses that edge
    if (id < NH) {
      const j = Math.floor(id / HW), i = (id % HW) - 1, a = at(i, j), b = at(i + 1, j);
      out.push(i + 0.5 + (ISO - a) / (b - a), j + 0.5);
    } else {
      const q = id - NH, i = Math.floor(q / VH), j = (q % VH) - 1, a = at(i, j), b = at(i, j + 1);
      out.push(i + 0.5, j + 0.5 + (ISO - a) / (b - a));
    }
  };
  const loops = [];
  for (let s = 0; s < next.length; s++) {
    if (next[s] < 0) continue;
    const pts = [];
    let e = s, guard = 0;
    while (e >= 0 && next[e] >= 0 && guard++ < 4e6) { point(e, pts); const n = next[e]; next[e] = -1; e = n; }
    if (pts.length >= 6) loops.push(Float32Array.from(pts));
  }
  return loops;
}

/** Signed area of a closed loop [x0, y0, x1, y1, ...]. */
export function loopArea(p) {
  let a = 0;
  for (let i = 0, n = p.length / 2; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
  return a / 2;
}

/** Ramer-Douglas-Peucker on a closed loop: drops every vertex that lies within eps px of the simplified outline. */
export function simplify(p, eps = 0.3) {
  const n = p.length / 2;
  if (n < 8) return p;
  // split the loop at two far-apart vertices and simplify the two open chains
  let far = 0, d0 = -1;
  for (let i = 1; i < n; i++) { const d = (p[2 * i] - p[0]) ** 2 + (p[2 * i + 1] - p[1]) ** 2; if (d > d0) { d0 = d; far = i; } }
  const keep = new Uint8Array(n); keep[0] = keep[far] = 1;
  const stack = [[0, far], [far, n]];                 // [a, b] with b possibly = n (wraps to vertex 0)
  const e2 = eps * eps;
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const ax = p[2 * a], ay = p[2 * a + 1], bi = b % n, bx = p[2 * bi], by = p[2 * bi + 1], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let worst = -1, wi = -1;
    for (let i = a + 1; i < b; i++) {
      const px = p[2 * i] - ax, py = p[2 * i + 1] - ay;
      let d;
      if (len2 < 1e-9) d = px * px + py * py;
      else { const u = Math.max(0, Math.min(1, (px * dx + py * dy) / len2)), qx = px - u * dx, qy = py - u * dy; d = qx * qx + qy * qy; }
      if (d > worst) { worst = d; wi = i; }
    }
    if (worst > e2) { keep[wi] = 1; stack.push([a, wi], [wi, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(p[2 * i], p[2 * i + 1]);
  return out.length >= 6 ? Float32Array.from(out) : p;
}

/**
 * Append the loops to a path. P needs moveTo / lineTo / quadraticCurveTo / closePath (a Path2D, or a canvas context).
 * A vertex whose outline turns by more than `corner` radians stays a hard corner; the others become the control
 * points of quadratic curves that run through the midpoints of their two edges.
 */
export function smoothPath(loops, P, corner = 0.6) {
  for (const p of loops) {
    const n = p.length / 2;
    if (n < 3) continue;
    const X = (i) => p[2 * (((i % n) + n) % n)], Y = (i) => p[2 * (((i % n) + n) % n) + 1];
    const hard = (i) => {
      const ax = X(i) - X(i - 1), ay = Y(i) - Y(i - 1), bx = X(i + 1) - X(i), by = Y(i + 1) - Y(i);
      return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) > corner;
    };
    P.moveTo((X(-1) + X(0)) / 2, (Y(-1) + Y(0)) / 2);
    for (let i = 0; i < n; i++) {
      const mx = (X(i) + X(i + 1)) / 2, my = (Y(i) + Y(i + 1)) / 2;
      if (hard(i)) { P.lineTo(X(i), Y(i)); P.lineTo(mx, my); } else P.quadraticCurveTo(X(i), Y(i), mx, my);
    }
    P.closePath();
  }
  return P;
}

/** Everything in one go: coverage map -> simplified loops (specks under minArea px² are dropped). */
export function outline(field, W, H, { eps = 0.3, minArea = 10 } = {}) {
  return traceLoops(field, W, H).filter((l) => Math.abs(loopArea(l)) >= minArea).map((l) => simplify(l, eps));
}
