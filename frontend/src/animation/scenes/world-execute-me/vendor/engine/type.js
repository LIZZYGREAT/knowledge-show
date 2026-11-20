// Typography: the different ways a lyric can be put on screen besides the code window.
//   big()      one centred headline, fitted to a width
//   typed()    typewriter line with cursor
//   slam()     characters smash in one after another (keywords)
//   onPath()   text set along a curve (circle, wave, spiral ...)
//   wall()     the same word repeated as texture (rows may shift / fade individually)
//   sliced()   anything drawn in horizontal slices that are offset sideways (cut-up text)
//   limp()     (v4) type gone soft: vertical strips, each pressed down and moved by a function of its place
import { rand } from './prng.js';
import { clamp, easeOut, prog } from './util.js';

/** Centred headline. Give `size` or `maxW` (fit to width). Returns the size used. */
export function big(ctx, str, cx, cy, { size, maxW, font = 'serif', weight = 700, color = 'me', alpha = 1, spacingEm = 0, maxSize = 2000, stroke = 0, italic = false } = {}) {
  const s = size ?? ctx.fit(str, maxW, { font, weight, spacingEm, maxSize, italic });
  const sp = spacingEm * s;
  ctx.text(str, cx + sp / 2, cy, { size: s, font, weight, color, alpha, align: 'center', spacing: sp, stroke, italic });
  return s;
}

/** Typewriter line (left aligned). Returns the number of characters shown. */
export function typed(ctx, str, t, t0, x, y, { cps = 28, size = 34, weight = 400, color = 'text', alpha = 1, cursor = true, font = 'mono', prefix = '' } = {}) {
  if (t < t0) return 0;
  const n = Math.min(str.length, Math.floor((t - t0) * cps));
  const shown = prefix + str.slice(0, n);
  ctx.text(shown, x, y, { size, weight, color, alpha, font });
  if (cursor && (n < str.length || Math.floor(t * 5) % 2 === 0)) {
    const w = ctx.measure(shown, { size, weight, font });
    ctx.rect(x + w + size * 0.08, y - size * 0.82, size * 0.52, size, { fill: true, color, alpha });
  }
  return n;
}

/**
 * Characters slam in one by one: each starts oversized and bright, then settles.
 * step = seconds between characters (or pass `times[]` per character).
 */
export function slam(ctx, str, t, t0, cx, cy, { size, maxW, step = 0.03, times = null, font = 'serif', weight = 900, color = 'me', hot = 'meHot', alpha = 1, spacingEm = 0.01, from = 2.2, settle = 0.14, maxSize = 2000 } = {}) {
  const s = size ?? ctx.fit(str, maxW, { font, weight, spacingEm, maxSize });
  const sp = spacingEm * s, o = { size: s, weight, font }, x0 = cx - (ctx.measure(str, { ...o, spacing: sp }) - sp) / 2;
  for (let i = 0; i < str.length; i++) {
    const ti = times ? times[i] : t0 + i * step;
    if (t >= ti && str[i] !== ' ') {
      // Each character stands where it stands in the whole word: its cell ends at the KERNED width of the
      // string up to and including it. (Adding up single advances drops the kerning, so the word came out
      // wider than the width it was fitted and centred with.)
      const w = ctx.measure(str[i], o), x = x0 + ctx.measure(str.slice(0, i + 1), o) + i * sp - w / 2;
      const k = easeOut(prog(t, ti, ti + settle)), sc = from + (1 - from) * k;
      ctx.at(x, cy, () => ctx.text(str[i], 0, 0, { ...o, align: 'center', color: k < 1 ? hot : color, alpha: alpha * (0.35 + 0.65 * k) }), { scale: sc });
    }
  }
  return s;
}

/**
 * Text along a path. path(d) -> [x, y, angle] for a distance d in px along the curve.
 * start = distance of the first character; `reveal` = how many characters are visible.
 */
export function onPath(ctx, str, path, { start = 0, size = 30, weight = 600, color = 'me', alpha = 1, font = 'serif', spacingEm = 0.06, reveal = Infinity, alphaFn = null } = {}) {
  const o = { size, weight, font }, sp = spacingEm * size;
  let d = start;
  for (let i = 0; i < str.length; i++) {
    // a character's cell ends at the kerned width of the string up to and including it (see slam), plus its spacing
    const end = start + ctx.measure(str.slice(0, i + 1), o) + (i + 1) * sp;
    if (i < reveal && str[i] !== ' ') {
      const [x, y, a] = path(end - (ctx.measure(str[i], o) + sp) / 2);
      ctx.at(x, y, () => ctx.text(str[i], 0, 0, { ...o, align: 'center', color, alpha: alpha * (alphaFn ? alphaFn(i) : 1) }), { rot: a });
    }
    d = end;
  }
  return d - start;                                    // length used
}

/**
 * A wall of one repeated word. rowShift(r) px offset per row, rowAlpha(r) opacity per row,
 * rowColor(r) palette role per row. Rows are clipped to the rect.
 */
export function wall(ctx, str, rect, { size = 80, lineH = 1.04, gapEm = 0.4, font = 'serif', weight = 900, color = 'me', alpha = 1, rowShift = null, rowAlpha = null, rowColor = null, stroke = 0 } = {}) {
  const w = ctx.measure(str, { size, weight, font }) + gapEm * size, lh = size * lineH;
  const rows = Math.ceil(rect.h / lh) + 1, reps = Math.ceil(rect.w / w) + 2;
  ctx.clip(rect, () => {
    for (let r = 0; r < rows; r++) {
      const a = alpha * (rowAlpha ? rowAlpha(r, rows) : 1);
      if (a <= 0.003) continue;
      const shift = (((rowShift ? rowShift(r) : 0) % w) + w) % w;
      const y = rect.y + (r + 0.86) * lh;
      for (let k = -1; k < reps; k++) ctx.text(str, rect.x + k * w + shift, y, { size, weight, font, color: rowColor ? rowColor(r) : color, alpha: a, stroke });
    }
  });
}

/** Draw `fn` n times, each clipped to one horizontal slice of rect and shifted by offset(i) px. */
export function sliced(ctx, rect, n, offset, fn) {
  const h = rect.h / n;
  for (let i = 0; i < n; i++) {
    const g = ctx.g;
    g.save(); g.beginPath(); g.rect(rect.x - 2000, rect.y + i * h, rect.w + 4000, h + 0.5); g.clip();
    g.translate(offset(i), 0);
    fn(i);
    g.restore(); ctx._font = '';
  }
}

/**
 * v4: type that has gone SOFT. The word is drawn in n vertical strips; every strip is pressed down towards the
 * baseline by squash(u) (0 = upright, 1 = flat) and moved by shift(u) = [dx, dy] px, u = 0..1 across the word. A
 * letter sags, slumps, splays its legs: whatever the two functions describe. Nothing is read back from the canvas:
 * each strip is the glyph itself, clipped.
 *   cx, y     centre and baseline;  size / font / weight / color as for ctx.text;  stroke > 0 = the outline only
 * Returns the width of the word.
 */
export function limp(ctx, str, cx, y, { size = 200, font = 'serif', weight = 400, color = 'me', alpha = 1, n = 48, squash = null, shift = null, stroke = 0 } = {}) {
  const o = { size, weight, font }, w = ctx.measure(str, o), x0 = cx - w / 2, g = ctx.g, sw = w / n;
  if (!(alpha > 0.003)) return w;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, k = 1 - Math.min(0.98, Math.max(0, squash ? squash(u) : 0)), [dx, dy] = shift ? shift(u) : [0, 0];
    g.save();
    g.translate(dx, y + dy); g.scale(1, k); g.translate(0, -y);                 // pressed towards its own baseline
    g.beginPath(); g.rect(x0 + i * sw - 0.4, y - size * 1.1, sw + 0.8, size * 1.5); g.clip();
    ctx.text(str, x0, y, { ...o, color, alpha, stroke });
    g.restore();
  }
  ctx._font = '';
  return w;
}

/** Scrambled stand-in for a string (decode effect); stable per (key, frame bucket). */
export function scramble(str, key, bucket, amount = 1) {
  const G = 'ABCDEFGHIKLMNOPRSTUVXYZ0123456789#/<>[]%$';
  let out = '';
  for (let i = 0; i < str.length; i++) out += str[i] !== ' ' && rand(key, i, bucket) < amount ? G[Math.floor(rand(key, i, bucket, 1) * G.length)] : str[i];
  return out;
}

/** 0..1 per-index stagger helper: progress of item i when items start `step` apart. */
export const stagger = (t, t0, i, step, dur) => clamp((t - t0 - i * step) / dur);
