// PLATES (v4): the second kind of picture in the film. The interface is what the user sees; a plate is what the
// AI means and feels: a full-frame print on dark, warm, textured paper, built only from three flat inks
// (orange = me, cream = you, near-black) as shapes, code-symbol pictures, the silhouettes and big type.
// No gradients inside a shape: depth comes from a second ink or from a shadow plate printed out of register.
//
//   ground()      the paper: warm near-black, grain, a dot screen, one pool of light, crop marks in the corners
//   marks()       the crop / registration marks alone
//   shadow()      draw something twice: once as its shadow plate, offset, in one flat ink, then itself
//   band()        the caption band: a sung line in the AI's serif at a fixed place and size for the whole section
//   keyword()     an ALL-CAPS keyword as big type locked into the picture (letters land with the syllables or at once)
//   dashedRing()  the grey dashed outline left where a cream element was NOT printed (the broken reprints)
//
// Everything is a pure function of its arguments; nothing here touches the DOM at import time.
import { rand } from '../engine/prng.js';
import { clamp, easeOut, prog } from '../engine/util.js';

const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
let grainTile = null;

/** Paper grain: a tile of light and dark fibres (alpha only), built once, at 2 device px per virtual px. */
function grain() {
  if (grainTile) return grainTile;
  const S = 384, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, v = rand(611, x, y), fibre = rand(613, x >> 3, y) > 0.86 ? 0.5 : 0;      // a few short horizontal fibres
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v > 0.5 ? 255 : 0;
    d[i * 4 + 3] = Math.round(255 * clamp(Math.abs(v - 0.5) * 1.5 + fibre * rand(617, x, y)));
  }
  g.putImageData(im, 0, 0);
  return (grainTile = c);
}

/** Corner crop marks and one registration target: the frame is a sheet in a press. k = 0..1 draw-in. */
export function marks(ctx, { r = FULL, inset = 34, len = 30, color = 'mute', alpha = 0.7, width = 2, k = 1, target = true } = {}) {
  if (!(alpha > 0.003) || k <= 0) return;
  const x0 = r.x + inset, y0 = r.y + inset, x1 = r.x + r.w - inset, y1 = r.y + r.h - inset, l = len * clamp(k), o = { color, alpha, width };
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1]]) {
    ctx.line(x, y + sy * 8, x, y + sy * (8 + l), o); ctx.line(x + sx * 8, y, x + sx * (8 + l), y, o);
  }
  if (target) {                                                     // registration target, bottom centre
    const cx = r.x + r.w / 2, cy = y1 - 4;
    ctx.circle(cx, cy, 9, { color, alpha, width: 1.5 });
    ctx.line(cx - 16, cy, cx + 16, cy, { color, alpha, width: 1.5 }); ctx.line(cx, cy - 16, cx, cy + 16, { color, alpha, width: 1.5 });
  }
}

/**
 * The paper of a plate, full frame (call it first; it replaces ctx.clear()).
 *   tone     role of the paper (default 'panel': darker and warmer than the page)
 *   light    [x, y, radius, role, alpha] one flat-edged pool of light behind the subject (two steps, no soft falloff
 *            beyond what the grain gives); null = none
 *   dots     0..1 strength of the dot screen;  grain 0..1;  marks: crop marks (pass an object for options, false = none)
 */
export function ground(ctx, { tone = 'panel', light = [960, 520, 620, 'raised', 1], dots = 1, grain: gr = 1, marks: mk = true, r = FULL } = {}) {
  const g = ctx.g;
  ctx.rect(r.x - 400, r.y - 400, r.w + 800, r.h + 800, { fill: true, color: tone });
  if (light) {
    const [x, y, rad, role = 'raised', a = 1] = light;
    ctx.circle(x, y, rad, { fill: true, color: role, alpha: 0.5 * a });      // two flat steps of light: a print, not a glow
    ctx.circle(x, y, rad * 0.62, { fill: true, color: role, alpha: 0.5 * a });
  }
  if (dots > 0) {                                                   // dot screen, 45 degrees, denser towards the bottom of the sheet
    g.fillStyle = ctx.col('line', 0.5 * dots);
    g.beginPath();
    for (let j = 0, y = r.y + 12; y < r.y + r.h; y += 24, j++) {
      const rad = 1.1 + 1.5 * ((y - r.y) / r.h);
      for (let x = r.x + 12 + (j % 2) * 12; x < r.x + r.w; x += 24) { g.moveTo(x + rad, y); g.arc(x, y, rad, 0, 6.2832); }
    }
    g.fill();
  }
  if (gr > 0) {
    const pat = g.createPattern(grain(), 'repeat'), a0 = g.globalAlpha;
    pat.setTransform(new DOMMatrix().scale(0.5));
    g.globalAlpha = a0 * 0.085 * gr; g.fillStyle = pat; g.fillRect(r.x, r.y, r.w, r.h); g.globalAlpha = a0;
  }
  if (mk) marks(ctx, { r, ...(typeof mk === 'object' ? mk : null) });
}

/**
 * Print something with its shadow plate: fn(true) draws the shape in ONE flat ink (it must use `ink` for every
 * colour it would otherwise choose), offset by (dx, dy); then fn(false) draws the thing itself.
 *   shadow(ctx, 14, 14, (sh) => ctx.circle(x, y, r, { fill: true, color: sh ? 'bg' : 'me' }))
 */
export function shadow(ctx, dx, dy, fn) {
  if (dx || dy) ctx.at(dx, dy, () => fn(true));
  fn(false);
}

/**
 * The caption band of a plate section. Non-keyword lines are set here in the AI's serif (orange) from the moment they
 * are sung until the next line starts; place and size stay the same for the whole section (size >= 52).
 * lines: [{ text, at, until, n }] (n = characters shown so far, optional); returns nothing.
 */
export function band(ctx, lines, t, { x = 120, y = 1000, size = 56, color = 'me', align = 'left', plate = true, maxW = 1680 } = {}) {
  const ln = lines.find((l) => t >= l.at && t < l.until);
  if (!ln) return;
  const o = { size, weight: 400, font: 'serif' }, str = ln.n == null ? ln.text : ln.text.slice(0, ln.n);
  const s = Math.min(size, ctx.fit(ln.text, maxW, { font: 'serif', weight: 400, maxSize: size })), w = ctx.measure(ln.text, { ...o, size: s });
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  if (plate) ctx.rect(x0 - 26, y - s * 0.98, w + 52, s * 1.36, { fill: true, color: 'panel', alpha: 0.86 });      // a flat strip of paper under the line
  ctx.text(str, x0, y, { ...o, size: s, color });
}

/**
 * A keyword as big type locked into a plate: weight 900 serif, flat ink, an offset shadow plate.
 *   at / step   the letters land one after another from `at` (step = seconds per letter; 0 = the whole word at once)
 *   parts       instead: [[fromChar, toChar, time], ...] character ranges that land together (syllables)
 *   hollow      0..1: letters not yet landed are shown as outlines at this opacity (0 = not at all)
 * Returns { x, y, w, size } of the set word (x = left edge, y = baseline).
 */
export function keyword(ctx, str, t, { x = 960, y = 540, maxW = 1700, maxSize = 300, size = null, align = 'center', at = -1e9, step = 0, parts = null, color = 'me', shade = 'bg', off = [10, 10], hollow = 0, font = 'serif', weight = 900, spacingEm = 0.01, stroke = 0 } = {}) {
  const s = size ?? ctx.fit(str, maxW, { font, weight, spacingEm, maxSize }), sp = spacingEm * s, o = { size: s, weight, font };
  const w = ctx.measure(str, { ...o, spacing: sp }) - sp, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const landed = (i) => (parts ? (parts.find(([a, z]) => i >= a && i < z)?.[2] ?? at) : at + i * step);
  for (const pass of off && (off[0] || off[1]) ? [1, 0] : [0]) {
    for (let i = 0; i < str.length; i++) {
      if (str[i] === ' ') continue;
      const cx = x0 + ctx.measure(str.slice(0, i + 1), o) + i * sp - ctx.measure(str[i], o) / 2, on = t >= landed(i);
      const px = cx + (pass ? off[0] : 0), py = y + (pass ? off[1] : 0);
      if (on) {
        const k = easeOut(prog(t, landed(i), landed(i) + 0.07));      // a letter is pressed on: two frames from 108 %
        ctx.at(px, py, () => ctx.text(str[i], 0, 0, { ...o, align: 'center', color: pass ? shade : color, stroke }), { scale: 1.08 - 0.08 * k });
      } else if (hollow > 0 && !pass) ctx.text(str[i], px, py, { ...o, align: 'center', color, stroke: Math.max(2, s * 0.012), alpha: hollow });
    }
  }
  return { x: x0, y, w, size: s };
}

/** The grey dashed outline of an element that was not printed (a circle, or a rounded rect when w / h are given). */
export function dashedRing(ctx, x, y, r, { w = 0, h = 0, color = 'mute', width = 4, dash = 18, alpha = 1 } = {}) {
  const g = ctx.g;
  g.setLineDash([dash, dash * 0.8]);
  if (w && h) ctx.rrect(x - w / 2, y - h / 2, w, h, r, { fill: null, stroke: color, width, alpha });
  else ctx.circle(x, y, r, { color, width, alpha });
  g.setLineDash([]);
}
