// ASCII elements: a shaded character-grid sphere, onset-driven character bursts, and (v4) the GLYPH PLATE:
// a picture printed in code characters, cell by cell, from a field of inks.
// Brightness -> glyph via the density ramp in config (" .:o0#"): more energy = denser glyphs.
import { noise3, rand } from './prng.js';
import { clamp } from './util.js';
import { rot } from './geom.js';

const TIERS = [['dim', 0.95], ['mid', 0.95], ['fg', 1]];     // three brightness tiers = three fillText passes per row
const DRIFT = 520;                                           // px a dissolving sphere cell has flown at k = 1

/**
 * Character-grid sphere ("the world"): lit, with noise continents and a lat/long graticule.
 * o: { cx, cy, r, size (20), rotY, tilt, energy 0..1, alpha, reveal 0..1 (printed top-down), dissolve 0..1, high 0..1, t, seed }
 */
export function asciiSphere(ctx, o) {
  const { cx, cy, r, alpha = 1 } = o;
  if (!(alpha > 0.003) || r < 4) return;
  const ramp = ctx.cfg.particles.ramp, size = o.size ?? 20;
  const cw = ctx.cw(size), ch = size, tilt = o.tilt ?? 0.4, energy = o.energy ?? 0.5;
  // even counts keep the grid anchored to the centre, so a pulsing radius doesn't make cells jump
  const cols = 2 * Math.ceil(r / cw) + 2, rows = 2 * Math.ceil(r / ch) + 2;
  const reveal = o.reveal ?? 1, dissolve = o.dissolve ?? 0, seed = o.seed ?? 5;
  const flick = Math.floor((o.t ?? 0) * 20), high = o.high ?? 0;
  const lastRow = Math.floor(reveal * rows);
  // Glyphs are clipped to the sphere's own circle so edge characters never stick out past the silhouette.
  // While it dissolves the cells fly out, so the circle runs ahead of the fastest of them (drift below, with
  // k at most 1.6 * dissolve); the room for a whole glyph opens over the first 8 % rather than in one frame,
  // so the rim characters that were cut do not pop back whole.
  const clipR = r + (1.6 * dissolve) ** 2 * DRIFT + ch * clamp(dissolve / 0.08);
  ctx.g.save(); ctx.g.beginPath(); ctx.g.arc(cx, cy, clipR, 0, Math.PI * 2); ctx.g.clip();
  ctx.font(size, 400, 'mono');
  ctx.g.textAlign = 'left';

  for (let j = 0; j < Math.min(rows, lastRow + 1); j++) {
    const y = (j - rows / 2 + 0.5) * ch, ny = y / r;
    const strs = ['', '', ''];
    for (let i = 0; i < cols; i++) {
      const x = (i - cols / 2 + 0.5) * cw, nx = x / r, d2 = nx * nx + ny * ny;
      let c = ' ', tier = 0;
      if (d2 < 1) {
        const nz = Math.sqrt(1 - d2);
        const p = rot(rot([nx, -ny, nz], -tilt, 0), 0, -o.rotY);        // view normal -> surface point
        const lon = Math.atan2(p[0], p[2]), lat = Math.asin(clamp(p[1], -1, 1));
        const land = clamp((noise3(p[0] * 2.1 + 7, p[1] * 2.1, p[2] * 2.1, seed) - 0.46) * 7);
        const gx = Math.abs(((lon * 12) / (Math.PI * 2) + 100) % 1 - 0.5), gy = Math.abs(((lat * 8) / Math.PI + 100) % 1 - 0.5);
        const grid = gx > 0.43 || gy > 0.44 ? 1 : 0;
        const light = clamp(0.42 + 0.58 * (nx * -0.48 + -ny * 0.58 + nz * 0.66), 0.2, 1);
        let b = light * (0.2 + 0.48 * land + 0.34 * grid) + 0.5 * Math.pow(1 - nz, 2.2);   // + rim so the silhouette always reads
        b = b * (0.5 + 0.9 * energy) + (rand(seed, i, j) - 0.5) * 0.07;
        if (j === lastRow && reveal < 1) b = 0.95;                       // the row being printed is hot
        let idx = clamp(Math.floor(b * ramp.length), 0, ramp.length - 1);
        if (high > 0 && rand(seed, i, j, flick) < high * 0.07) idx = 1 + Math.floor(rand(seed, j, i, flick) * (ramp.length - 1));  // highs sparkle
        c = ramp[idx];
        tier = idx >= ramp.length - 2 ? 2 : idx >= 2 ? 1 : 0;
      }
      if (dissolve > 0 && c !== ' ') {                                   // cells fly apart individually
        const k = dissolve * (0.4 + 1.2 * rand(seed, i, j, 9));
        if (rand(seed, i, j, 8) > dissolve * 1.15) {
          const a = alpha * TIERS[tier][1] * clamp(1.2 - dissolve);
          ctx.g.fillStyle = ctx.col(TIERS[tier][0], a);
          const l = Math.hypot(x, y) || 1, drift = k * k * DRIFT;
          ctx.g.fillText(c, cx + x + (x / l) * drift - cw / 2, cy + y + (y / l) * drift + ch * 0.35);
        }
        c = ' ';
      }
      for (let k = 0; k < 3; k++) strs[k] += k === tier ? c : ' ';
    }
    const x0 = cx - (cols * cw) / 2, yy = cy + y + ch * 0.35;
    for (let k = 0; k < 3; k++) {
      if (!strs[k].trim()) continue;
      ctx.g.fillStyle = ctx.col(TIERS[k][0], alpha * TIERS[k][1]);
      ctx.g.fillText(strs[k], x0, yy);
    }
  }
  ctx.g.restore(); ctx._font = '';
}

/**
 * Small character bursts on strong onsets (stateless: every onset inside the last `life`
 * seconds is re-simulated from its own timestamp). Mono, on the character grid of `size` (default 20).
 */
export function asciiBursts(ctx, features, t, { cx, cy, r0 = 0, size = 20, minS, life = 0.7, alpha = 1, count } = {}) {
  if (!(alpha > 0.003)) return;
  const ramp = ctx.cfg.particles.ramp.trim(), n0 = count ?? ctx.cfg.particles.burstCount;
  const cw = ctx.cw(size), ch = size;
  ctx.font(size, 400, 'mono');
  ctx.g.textAlign = 'center';
  for (const on of features.onsetsIn(t - life, t, minS ?? ctx.cfg.reactive.strongOnset)) {
    const k = (t - on.t) / life, n = Math.round(n0 * on.s), fade = Math.pow(1 - k, 1.6);
    const sector = rand(31, on.i) * Math.PI * 2;                         // each burst leaves in its own direction
    for (let p = 0; p < n; p++) {
      const ang = sector + (rand(32, on.i, p) - 0.5) * 1.5, spd = 120 + 300 * rand(33, on.i, p);
      const dist = r0 + spd * (1 - (1 - k) * (1 - k));
      // snap to the character grid so particles feel like terminal cells
      const x = Math.round((Math.cos(ang) * dist) / cw) * cw, y = Math.round((Math.sin(ang) * dist) / ch) * ch;
      const idx = clamp(Math.floor((1 - k) * ramp.length * (0.5 + 0.5 * rand(34, on.i, p))), 0, ramp.length - 1);
      ctx.g.fillStyle = ctx.col(idx >= 3 ? 'fg' : 'mid', alpha * fade * on.s);
      ctx.g.fillText(ramp[idx], cx + x, cy + y);
    }
  }
}

// ------------------------------------------------------------------------------------------------ glyph plate (v4)

const plateCache = new Map();
/** Characters that follow an outline: by the direction the edge runs in the cell. */
const EDGE = { v: '|', h: '-', up: '/', down: '\\' };

/**
 * GLYPH PLATE: a picture printed in code characters on the mono grid.
 *
 * `field(u, v)` says which INK lies at a point of the picture (u, v = 0..1 across dst): 0 = nothing, 1..n = an ink of
 * your own numbering. Every cell samples it sub[0] x sub[1] times: a cell that is wholly one ink prints that ink's
 * next character; a cell the outline runs through prints a character that follows the outline (| / - \), so the
 * contour is drawn by the glyphs themselves. Each ink has its own characters, role and weight: the separation of the
 * inks carries the picture, exactly as in the flat print.
 *
 *   inks   { 1: { role, weight, text, ramp, shade, alpha, bg }, ... }
 *            text   a string the ink is set in, running on from cell to cell in reading order (real tokens: data, code);
 *                   or ramp + shade(u, v) -> 0..1: a density ramp, as in the other glyph screens
 *            bg     a role: the cells of this ink are first filled flat in it (a block of light or shade, cut to the grid)
 *   edge   { role, weight, alpha } outline cells in this role (default: the ink's own); false = no outline characters
 *   size   glyph size, virtual px (cell = 0.6 size wide, size * lineH high). 14 and up stays legible in an encoded 1080p frame.
 *   key    cache key: give one whenever the field does not change from frame to frame (the cell map is then built once)
 *   decode { k: 0..1, t, seed }: cells not yet reached by k print a stand-in glyph, re-rolled 12 times a second (never per frame)
 *   reveal 0..1 rows printed, top-down
 *   shift  (row) => px: every row of characters is printed that far to the right of its place (rows sliding off a shape)
 *
 * The grid is NOT clipped here. Clip it to the picture's own outline (ctx.clipPath, art.inkClip) so that no character
 * sticks out past the contour, and print a flat under-colour first: the silhouette must read before the characters do.
 */
export function glyphPlate(ctx, field, dst, { inks, edge = null, size = 14, lineH = 1, sub = [3, 3], key = null, decode = null, reveal = 1, shift = null, alpha = 1 } = {}) {
  if (!(alpha > 0.003)) return;
  const g = ctx.g, cw = ctx.cw(size), ch = size * lineH, cols = Math.ceil(dst.w / cw), rows = Math.ceil(dst.h / ch);
  const ck = key == null ? null : `${key}|${cols}x${rows}|${sub[0]}x${sub[1]}|${dst.w.toFixed(1)}x${dst.h.toFixed(1)}`;
  let map = ck ? plateCache.get(ck) : null;
  if (!map) {
    // per cell: the ink (0 = empty) and, for outline cells, which way the outline runs (1 | 2 - 3 / 4 \)
    const ink = new Uint8Array(cols * rows), dir = new Uint8Array(cols * rows), [sx, sy] = sub, cnt = new Uint8Array(32);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      cnt.fill(0);
      let n = 0, left = 0, right = 0, top = 0, bot = 0;
      for (let b = 0; b < sy; b++) for (let a = 0; a < sx; a++) {
        const k = field(((i + (a + 0.5) / sx) * cw) / dst.w, ((j + (b + 0.5) / sy) * ch) / dst.h) | 0;
        if (!k) continue;
        cnt[k & 31]++; n++;
        if (a === 0) left++; if (a === sx - 1) right++; if (b === 0) top++; if (b === sy - 1) bot++;
      }
      if (n * 3 < sx * sy) continue;                                  // under a third of the cell: left empty (the clip trims the rest)
      let best = 0;
      for (let k = 1; k < 32; k++) if (cnt[k] > cnt[best]) best = k;
      ink[j * cols + i] = best;
      if (n < sx * sy) {
        const gx = right - left, gy = bot - top;
        dir[j * cols + i] = Math.abs(gx) > 2 * Math.abs(gy) ? 1 : Math.abs(gy) > 2 * Math.abs(gx) ? 2 : gx * gy > 0 ? 3 : 4;
      }
    }
    map = { ink, dir };
    if (ck) { if (plateCache.size > 64) plateCache.clear(); plateCache.set(ck, map); }
  }
  const last = Math.min(rows, Math.ceil(clamp(reveal) * rows));
  const tiers = Object.entries(inks).map(([k, o]) => ({ k: +k, ...o }));
  const outlined = edge !== false, er = edge || null;                // edge: false = no outline characters; { role } = in that role; else the ink's own
  const dq = decode ? Math.floor((decode.t ?? 0) * 12) : 0;
  g.textAlign = 'left';
  for (let j = 0; j < last; j++) {
    const y = dst.y + (j + 0.5) * ch + size * 0.35, x0 = dst.x + (shift ? shift(j) : 0);
    // one string per ink (+ one for the outline): a single fillText each
    const strs = tiers.map(() => []), es = [];
    let any = false, anyE = false;
    for (let i = 0; i < cols; i++) {
      const c = j * cols + i, k = map.ink[c];
      let glyph = ' ', onEdge = false, ti = -1;
      if (k) {
        ti = tiers.findIndex((q) => q.k === k);
        const q = tiers[ti];
        if (q) {
          if (map.dir[c] && outlined) { glyph = [EDGE.v, EDGE.h, EDGE.up, EDGE.down][map.dir[c] - 1]; onEdge = !!er; }
          else if (q.text) glyph = q.text[c % q.text.length];
          else if (q.ramp) { const b = q.shade ? q.shade(((i + 0.5) * cw) / dst.w, ((j + 0.5) * ch) / dst.h) : 0.6; glyph = q.ramp[clamp(Math.floor(b * q.ramp.length), 0, q.ramp.length - 1)]; }
          if (decode && rand(decode.seed ?? 5, i, j) > decode.k) glyph = '01<>/=+*#%'[Math.floor(rand(decode.seed ?? 5, i, j, dq) * 10)];
        }
      }
      for (let q = 0; q < strs.length; q++) strs[q].push(q === ti && !onEdge ? glyph : ' ');
      es.push(onEdge ? glyph : ' ');
      if (glyph !== ' ') { if (onEdge) anyE = true; else any = true; }
    }
    tiers.forEach((q, n) => {                                         // flat cell backgrounds, one rect per run of cells
      if (!q.bg) return;
      g.fillStyle = ctx.col(q.bg, alpha);
      for (let i = 0; i < cols; i++) {
        if (map.ink[j * cols + i] !== q.k) continue;
        let z = i;
        while (z + 1 < cols && map.ink[j * cols + z + 1] === q.k) z++;
        g.fillRect(x0 + i * cw, dst.y + j * ch, (z - i + 1) * cw + 0.5, ch + 0.5);
        i = z;
      }
    });
    if (any) tiers.forEach((q, n) => {
      const str = strs[n].join('');
      if (!str.trim()) return;
      ctx.font(size, q.weight ?? 400, 'mono');
      g.fillStyle = ctx.col(q.role, alpha * (q.alpha ?? 1));
      g.fillText(str, x0, y);
    });
    if (anyE) {
      ctx.font(size, er.weight ?? 700, 'mono');
      g.fillStyle = ctx.col(er.role, alpha * (er.alpha ?? 1));
      g.fillText(es.join(''), x0, y);
    }
  }
  ctx._font = '';
}
