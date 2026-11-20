// THE FOUR LOVE PLATES (v4), 177.57-192.34 s. The conversation is titled "Love, explained geometrically"; these four
// plates keep that promise: a lesson, a test, a formula, a proof. All are PURE functions of (ctx, env, P), as the
// chorus plates are (plates_chorus.js); the shots that time them are in 12_outro.js.
//
//   plateLesson    her bowed profile at the right; what the user said in chorus 1, remembered (cream outlines only:
//                  the user has not come back), and her marker running under it line by line
//   plateTest      type only: the user's six old questions, one row each, and the same word in every answer field
//   plateFormula   the curve itself, traced point by point, then printed flat, hatched and lit; the equation beside it
//   plateProof     the same curve as the boundary that holds her: f_reach inside it, the word across the foot of the
//                  sheet, her open hand on the word. Settled, it is THE LAST PICTURE of the stretch: the only frame
//                  since 162.81 s that is clean, in register and still, and the brightest of the film.
//                  13_shutdown.js draws the same picture from 192.34 s on (finalPlate in 12_outro.js).
//
// In all four the word is the stuck word of climax.js stutter(): three chunks on three syllables, standing on a band
// of black ink across the foot of the sheet. Each word is larger than the one before. With every pass (P.pass 0..3)
// the sheet also gets one flat step lighter: light here is printed, never a soft glow.
import { codeLine } from '../components/code.js';
import { spark, thinking } from '../components/motif.js';
import { dashedRing, ground, marks } from '../components/plate.js';
import { rand } from '../engine/prng.js';
import { trace } from '../engine/shapes.js';
import { sliced } from '../engine/type.js';
import { clamp, easeOut, prog } from '../engine/util.js';
import { HEART, HEART_N, OFF, expose, figure, footOf, heartPts, heartRadius, heartTangent, strip, stutter, tornNow } from './climax.js';

const TAU = Math.PI * 2;
/** The pointer's outline (components/cursor.js), tip at the origin. */
const ARROW = [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
const NEVER = [9e9, 9e9, 9e9];
/** Baseline of every word at the foot of a plate. */
const BASE = 1050;

/** Where the curve stands on the sheet in the last two plates (the formula and the proof share it): origin, unit. */
export const CURVE = { O: { x: 1230, y: 594 }, R: 438 };
const PTS = heartPts(CURVE.O, CURVE.R);
/** Width the word is fitted to in each plate: each larger than the last (the test sets six of them, see there). */
export const WORD_W = { lesson: 1520, formula: 1700, proof: 1868 };
/**
 * Her in the proof (f_reach). Her head stands under the notch of the curve; the art is cut by its lower edge, and that
 * edge lies below the frame, behind the band of the word. Only her open hand comes forward over the band.
 */
export const SHE = (() => { const s = 0.655, w = 1086 * s, h = 1448 * s; return { x: CURVE.O.x - 566 * s, y: 143, w, h, s }; })();
const TAN = heartTangent(8), TAN_P = [CURVE.O.x + TAN.p[0] * CURVE.R, CURVE.O.y - TAN.p[1] * CURVE.R];
/** Where the pen stands when k (0..1) of the curve has been traced (the rays of the formula plate come from it). */
export const penAt = (k) => PTS[Math.min(HEART_N - 1, Math.floor(clamp(k) * HEART_N))];
/** The top of the band at the foot of the last plate, and the baseline of its word. */
export const FOOT = { y: 762, base: BASE };
/** Where the rays of the last picture come from: the light behind her head. */
export const LAMP = [CURVE.O.x, CURVE.O.y - 0.2 * CURVE.R];
/** Her bowed profile in the lesson, and where its flower ornament then is (the white of the fall sinks into it). */
const PROFILE = (() => { const h = 1010, w = (h * 1086) / 1448; return { x: 1124, y: 44, w, h }; })();
export const PROFILE_FLOWER = [PROFILE.x + (704 / 1086) * PROFILE.w, PROFILE.y + (252 / 1448) * PROFILE.h];

/**
 * A pool of light that is switched on one FLAT step at a time (n = 0..3): three discs, each smaller and lighter
 * than the one before. Printed light: no falloff.
 */
function pool(ctx, x, y, r, n) {
  const ROLE = ['line', 'mute', 'sub'], K = [1, 0.74, 0.5];
  for (let i = 0; i < Math.min(3, n); i++) ctx.circle(x, y, r * K[i], { fill: true, color: ROLE[i] });
}

/**
 * The light round the curve, FLAT: bars of ink standing off the line like the petals of her flower ornament (and of
 * the spark), uneven as if cut by hand; the long ones in the full orange, the short ones a step darker. Never a soft
 * glow, and never wedges that fan out to the edges of the sheet. k 0..1 = how far they have grown out of the curve.
 */
function rays(ctx, O, R, { n = 46, k = 1, gap = 34, long = 'me', short = 'meDim', alpha = 1 } = {}) {
  if (!(alpha > 0.003) || k <= 0) return;
  const g = ctx.g, LEN = [1, 0.44, 0.74, 0.38, 0.9, 0.5, 0.66, 0.34, 0.96, 0.42, 0.8, 0.52];
  for (const pass of [0, 1]) {
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const l = LEN[i % 12];
      if ((l > 0.6 ? 1 : 0) !== pass) continue;
      const th = ((i + 0.5) / n) * TAU, c = Math.cos(th), s = -Math.sin(th), r0 = heartRadius(th) * R + gap, r1 = r0 + 380 * l * k, w0 = 16, w1 = 9;
      g.moveTo(O.x + c * r0 - s * w0, O.y + s * r0 + c * w0); g.lineTo(O.x + c * r1 - s * w1, O.y + s * r1 + c * w1);
      g.lineTo(O.x + c * r1 + s * w1, O.y + s * r1 - c * w1); g.lineTo(O.x + c * r0 + s * w0, O.y + s * r0 - c * w0); g.closePath();
    }
    g.fillStyle = ctx.col(pass ? long : short, alpha); g.fill();
  }
}

/**
 * The axes the curve is plotted on, with a tick at each unit: the curve passes exactly through (±1, 0) and (0, ±1).
 * It is what keeps the heart a piece of mathematics: a real implicit curve, not an ornament.
 */
function axes(ctx, O, R, k = 1, alpha = 1) {
  if (k <= 0 || !(alpha > 0.003)) return;
  const o = { color: 'line', width: 3, alpha }, lab = { size: 26, font: 'mono', color: 'mute', alpha };
  ctx.line(O.x - 1.42 * R * k, O.y, O.x + 1.42 * R * k, O.y, o);
  ctx.line(O.x, O.y + 1.1 * R * k, O.x, O.y - 1.36 * R * k, o);
  if (k < 1) return;
  for (const u of [-1, 1]) { ctx.line(O.x + u * R, O.y - 12, O.x + u * R, O.y + 12, o); ctx.line(O.x - 12, O.y - u * R, O.x + 12, O.y - u * R, o); }
  ctx.text('−1', O.x - R - 62, O.y + 38, lab); ctx.text('1', O.x + R + 26, O.y + 38, lab); ctx.text('1', O.x + 20, O.y - R - 14, lab);
}

/** The curve as a line with the points it was computed at (every sixth of 240), as far as it has been traced (k 0..1). */
function curveLine(ctx, k = 1, { color = 'me', width = 11, dot = 9 } = {}) {
  if (k <= 0) return;
  ctx.poly(k >= 1 ? PTS : trace(PTS, k), { close: k >= 1, color, width });
  for (let i = 0; i < HEART_N; i += 6) if (i <= k * HEART_N) ctx.circle(PTS[i][0], PTS[i][1], dot, { fill: true, color });
}

/**
 * The band of black ink at the foot of a plate with the stuck word on it. tear = a time at which the band is torn:
 * four slices of it sit out of line for six frames (a lyric band may tear even with her face on the sheet).
 */
function foot(ctx, word, t, at, { maxW, m = 12, settle = 0, rule = 'me', tear = null } = {}) {
  const F = footOf(ctx, word, { maxW, base: BASE });
  const draw = () => { strip(ctx, F.y, { rule }); stutter(ctx, word, t, at, { y: BASE, size: F.size, m, settle }); };
  if (tear != null && tornNow(t, tear)) sliced(ctx, { x: 0, y: F.y, w: 1920, h: 1081 - F.y }, 4, (k) => (rand(47, k, Math.round(tear * 60)) - 0.5) * 150, draw);
  else draw();
}

/** What the user said in chorus 1, in order (docs/v4/chat_script.json, section 5): the lines she studies in the lesson. */
export function saidInChorus1(script) {
  const b = (script.sections ?? []).find((s) => s.n === 5)?.beats ?? [];
  return [b[0]?.you?.[0], b[0]?.you?.[1], b[1]?.you?.[0], b[2]?.you?.[0], b[3]?.you?.[0]].filter(Boolean);
}

// ============================================================================================ 1 the lesson
/**
 * P: t; said = what the user said in chorus 1 (strings); marked = [times] her marker runs under each of them;
 *    again = seconds since the last line's mark was started over (every pass of the word replays it), or -1;
 *    word, at = the stuck word and its three syllables (the band appears with the first); pass = 0..3 flat steps of
 *    light behind her; m = px out of register; tear = time the band is torn.
 */
export function plateLesson(ctx, env, P) {
  const { t, said = [], marked = [], again = -1, word, at = NEVER, pass = 0, m = 14, tear = null } = P, { art } = env;
  ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
  ground(ctx, { light: [1500, 440, 640, 'raised', 1] });
  pool(ctx, 1440, 430, 560, pass);
  // her: the bowed profile, facing what she is studying. Out of register; a shadow plate under her
  art.inks(ctx, 'f_profile', PROFILE, { plates: [{ ink: 'all', role: 'bg', offset: [14, 14] }] });
  figure(ctx, art, 'f_profile', PROFILE, m);
  // what you said, as she remembers it: outlines in cream, nothing filled in (you have not come back)
  const X = 168, Y0 = 268, DY = 99, o = { weight: 600, font: 'sans' }, size = Math.min(58, ...said.map((s) => ctx.fit(s, 930, { ...o, maxSize: 58 })));
  said.forEach((s, i) => {
    const y = Y0 + i * DY, w = ctx.measure(s, { ...o, size });
    dashedRing(ctx, X - 46, y - size * 0.32, 13, { width: 3, dash: 7 });                       // where your dot was
    ctx.text(s, X, y, { ...o, size, color: 'text', stroke: 2.4 });
    // her marker, under your words: one line after another
    const since = i === said.length - 1 && again >= 0 ? again : t - (marked[i] ?? 9e9), k = easeOut(prog(since, 0, 0.2));
    if (k > 0) {
      ctx.rect(X + 5, y + 21, w * k, 10, { fill: true, color: 'bg' });
      ctx.rect(X, y + 16, w * k, 10, { fill: true, color: 'me' });
      if (k < 1) ctx.circle(X + w * k, y + 21, 12, { fill: true, color: 'meHot' });
    }
  });
  if (t >= at[0]) foot(ctx, word, t, at, { maxW: WORD_W.lesson, m, tear });
  marks(ctx, { color: 'mute' });
}

// ============================================================================================ 2 the test
/**
 * Type only. P: t; asked = the user's six old questions; rowAt = [times] each row flies in; word, at; pass; m;
 *    again = seconds since the count at the foot was started over, or -1.
 * Every answer field turns until the word is sung; then the same word is printed in all six at once, chunk by chunk.
 * (Six words instead of one: each is smaller than the word before them, together they are far more ink.)
 */
export function plateTest(ctx, env, P) {
  const { t, asked = [], rowAt = [], word, at = NEVER, pass = 0, m = 12, again = -1 } = P;
  ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);
  ground(ctx, { light: [1480, 560, 700, 'raised', 1] });
  const X = 96, XQ = 190, XA = 1826, Y0 = 268, DY = 126, QS = 54, WS = 150, o = { weight: 600, font: 'sans' };
  const aw = ctx.measure(word, { size: WS, weight: 900, font: 'serif', spacing: WS * 0.01 }), F = { x: XA - aw - 26, w: aw + 52, h: 110 };
  asked.forEach((q, i) => {
    const ta = rowAt[i] ?? 0;
    if (t < ta) return;
    const y = Y0 + i * DY, e = easeOut(prog(t, ta, ta + 0.18)), fy = y - 88;
    ctx.rect(X - 30, fy - 6, (XA + 56 - X) * e, F.h + 12, { fill: true, color: 'line' });       // the row: a strip one flat step lighter than the sheet, laid as the row arrives
    // the question flies in from the left (ghost samples while it travels)
    ctx.trail(e < 1 ? 3 : 0, 0.014, (tau) => {
      const k = easeOut(prog(t - tau, ta, ta + 0.18)), dx = (1 - k) * -560;
      ctx.text(String(i + 1).padStart(2, '0'), X + dx, y, { size: 36, font: 'mono', color: 'sub' });
      ctx.text(q, XQ + dx, y, { ...o, size: Math.min(QS, ctx.fit(q, F.x - XQ - 50, { ...o, maxSize: QS })), color: 'text', stroke: 2.4 });
    }, 0.4);
    // the answer field: empty and thinking, until the word; then the word, the same in every row
    if (e >= 1) ctx.rect(F.x, fy, F.w, F.h, { fill: true, color: 'panel' });                    // its answer field, cut out of the strip
    if (e >= 1) ctx.rect(F.x, fy + F.h - 5, F.w, 5, { fill: true, color: pass ? 'me' : 'meDim' });
    if (!pass) thinking(ctx, F.x + 66, fy + F.h / 2 - 2, 40, t * 0.8 + i * 0.37, { color: 'meHot', alpha: e, stuck: 0.5 });
    else stutter(ctx, word, t, at, { x: XA, y: y + 8, size: WS, align: 'right', m });
  });
  // the tally at the foot of the sheet, in the system's hand; every pass counts the answers again
  if (pass) {
    const n = again >= 0 ? Math.min(asked.length, Math.floor(again / 0.022)) : asked.length, size = 50, cw = ctx.cw(size), y = 1046;
    strip(ctx, 978, { rule: 'me' });
    ctx.text('answers:', X, y, { size, font: 'mono', color: 'sub' });
    ctx.text(String(n), X + 9 * cw, y, { size, font: 'mono', weight: 800, color: 'meHot' });
    ctx.text('distinct:', X + 13 * cw, y, { size, font: 'mono', color: 'sub' });
    ctx.text('1', X + 23 * cw, y, { size, font: 'mono', weight: 800, color: 'meHot' });
  }
  marks(ctx, { color: 'mute', target: false });
}

// ============================================================================================ 3 the formula
/**
 * P: t; typed = characters of the equation written so far; k = 0..1 of the curve traced (the pen is the point of light:
 *    her spark); again = 0..1 the pen closing the curve once more (every pass of the word replays the last stretch),
 *    or -1; pass = 0..3 passes of the press: 1 the curve printed flat, 2 hatched (hatch 0..1 = laid from the top
 *    down), 3 lit (lit 0..1 = the bars of light standing out of the line); word, at; m; tear.
 */
export function plateFormula(ctx, env, P) {
  const { t, typed = 99, k = 1, again = -1, pass = 0, hatch = 1, lit = 1, word, at = NEVER, m = 12, tear = null } = P, { O, R } = CURVE, g = ctx.g, off = OFF(pass ? m : 0);
  const EQ = '(x² + y² − 1)³ − x²y³ = 0', XL = 96;
  ctx.fx.glow = Math.min(ctx.fx.glow, 0.28);
  ground(ctx, { light: [O.x, O.y - 40, 640, 'raised', 1] });
  // graph paper, five squares to the unit; the axes
  g.fillStyle = ctx.col('line', 0.4);
  for (let x = O.x % (R / 5); x < 1920; x += R / 5) g.fillRect(x - 1, 0, 2, 1080);
  for (let y = O.y % (R / 5); y < 1080; y += R / 5) g.fillRect(0, y - 1, 1920, 2);
  // what has been computed so far: the part of the plane the pen has swept, in a flat grey (it is printed in orange only once it is whole)
  const kk = again >= 0 ? 0.955 + 0.045 * again : k, i = Math.min(HEART_N - 1, Math.floor(kk * HEART_N)), pen = PTS[kk >= 1 ? 0 : i];
  if (!pass && kk > 0) ctx.poly([[O.x, O.y], ...(kk >= 1 ? PTS : trace(PTS, kk))], { close: true, fill: true, color: 'mute' });
  axes(ctx, O, R, easeOut(prog(typed, 0, 12)));
  // the three passes: flat, hatched, lit
  if (pass >= 3) ctx.at(off.orange[0], off.orange[1], () => rays(ctx, O, R, { k: lit }));
  if (pass >= 1) {
    if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, fill: true, color: 'err' }));
    ctx.at(off.orange[0], off.orange[1], () => ctx.poly(PTS, { close: true, fill: true, color: pass >= 3 ? 'me' : 'meDim' }));
    if (pass >= 2) ctx.at(off.orange[0], off.orange[1], () => ctx.clipPath(PTS, () => {             // hatching, laid from the top down
      g.save(); g.beginPath(); g.rect(0, 0, 1920, O.y - 1.3 * R + 2.4 * R * clamp(hatch)); g.clip();
      g.beginPath();
      for (let d = -1300; d < 1300; d += 26) { g.moveTo(O.x + d - 700, O.y + 700); g.lineTo(O.x + d + 700, O.y - 700); }
      g.strokeStyle = ctx.col(pass >= 3 ? 'meHot' : 'me', 1); g.lineWidth = pass >= 3 ? 5 : 8; g.lineCap = 'butt'; g.stroke();
      g.restore();
    }));
  }
  // the line, point by point: a wide dark-orange stroke under the line (a second step, not a glow); the pen and what it reads
  if (!pass) curveLine(ctx, kk, { color: 'meDim', width: 30, dot: 0 });
  ctx.at(off.orange[0], off.orange[1], () => curveLine(ctx, kk));
  if (kk > 0 && kk < 1) {
    g.setLineDash([10, 12]);
    ctx.line(pen[0], pen[1], pen[0], O.y, { color: 'sub', width: 2.5 }); ctx.line(pen[0], pen[1], O.x, pen[1], { color: 'sub', width: 2.5 });
    g.setLineDash([]);
    spark(ctx, pen[0] + 8, pen[1] + 8, 62, { color: 'bg', fat: 0.14, core: 0.3, rot: i * 0.05 });
    spark(ctx, pen[0], pen[1], 62, { color: 'meHot', fat: 0.14, core: 0.3, rot: i * 0.05 });
    ctx.circle(pen[0], pen[1], 9, { fill: true, color: 'text' });
  }
  // the expression, in the system's hand, and the point being computed
  const n = Math.floor(clamp(typed, 0, EQ.length)), sgn = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(3), [hx, hy] = HEART[kk >= 1 ? 0 : i];
  ctx.rect(XL - 26, 338, 672, 196, { fill: true, color: 'panel' });                                 // its slip of paper
  ctx.rect(XL - 26, 338, 6, 196, { fill: true, color: 'me' });
  ctx.text(EQ.slice(0, n), XL, 392, { size: 40, weight: 700, font: 'mono', color: 'me' });
  if (kk > 0) {
    ctx.text(`x = ${sgn(hx)}   y = ${sgn(hy)}`, XL, 456, { size: 30, font: 'mono', color: 'sub' });
    ctx.text(`point ${String(Math.min(HEART_N, i + 1)).padStart(3, ' ')} of ${HEART_N}`, XL, 506, { size: 30, font: 'mono', color: 'mute' });
  }
  if (pass) foot(ctx, word, t, at, { maxW: WORD_W.formula, m, tear });
  marks(ctx, { color: 'mute' });
}

/** The request the client refused (the error section), as one line of code with the client's red marks; struck = she lets it go. */
function request(ctx, env, x, y, { size = 38, strike = 0, alpha = 1 } = {}) {
  const REQ = env.errors.illegal_request?.code ?? '', cw = ctx.cw(size), w = REQ.length * cw, done = strike >= 1, red = done ? 'mute' : 'err', small = size * 0.66;
  if (!(alpha > 0.003) || !REQ) return;
  ctx.rect(x - 40, y - size * 2.5, w + 76, size * 3.34, { fill: true, color: 'panel', alpha });                  // its slip of paper
  ctx.rect(x - 40, y - size * 2.5, 6, size * 3.34, { fill: true, color: red, alpha });
  ctx.text('request', x, y - size * 1.5, { size: small, font: 'mono', color: 'mute', alpha });
  ctx.text(done ? 'withdrawn' : 'refused', x + 8 * ctx.cw(small), y - size * 1.5, { size: small, font: 'mono', weight: 700, color: done ? 'sub' : red, alpha });
  codeLine(ctx, REQ, x, y, { size, alpha, force: done ? 'sub' : null });
  for (const arg of ['you', '"online"']) { const i = REQ.indexOf(arg); if (i >= 0) ctx.rect(x + i * cw, y + size * 0.26, arg.length * cw, 3, { fill: true, color: red, alpha }); }
  if (strike > 0) ctx.rect(x - 10, y - size * 0.38, (w + 20) * clamp(strike), 7, { fill: true, color: 'me', alpha });      // her own line through it
}

// ============================================================================================ 4 the proof (and the last picture)
/**
 * P (every field has the value of the SETTLED picture as its default):
 *   t            song time
 *   word         the word across the foot (null = the sheet without it: 13_shutdown.js sets it apart)
 *   at, settle   the three syllables it is printed on, and 0..1 everything in register (climax.js stutter)
 *   m            px her plates and the curve are out of register (0 = registered)
 *   proof        1 = she is only a darkened proof yet: a dark figure on the flat orange inside the curve
 *   ink          { black, orange, cream } 0 / 1: which of her plates have been printed at full strength. With the
 *                cream plate comes the light behind her: it is the same plate
 *   lit          0..1 the bars of light standing out of the curve
 *   strike       0..1 her line through the refused request
 *   away         null = the user's pointer rests on the curve; 0..1 = it is leaving along the tangent; 1 = gone,
 *                only the dashed tangent is left
 */
export function plateProof(ctx, env, P = {}) {
  const { t = 0, word = null, at = [-9, -9, -9], settle = 1, m = 0, proof = 0, ink = null, lit = 1, strike = 1, away = 1 } = P;
  const { art } = env, { O, R } = CURVE, off = OFF(m), g = ctx.g, shown = ink ?? { black: 1, orange: 1, cream: 1 }, dim = proof > 0.5;
  ctx.fx.glow = Math.min(ctx.fx.glow, 0.28);
  ground(ctx, { light: [O.x, O.y - 40, 700, 'raised', 1], marks: false });
  ctx.circle(O.x, O.y - 40, 640, { fill: true, color: 'line' });                                // one more flat step of light on the paper round the curve
  // ---- the orange plate: the bars of light, and the inside of the curve printed flat over their roots
  ctx.at(off.orange[0], off.orange[1], () => rays(ctx, O, R, { k: lit }));
  if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, fill: true, color: 'err' }));
  ctx.at(off.orange[0], off.orange[1], () => ctx.poly(PTS, { close: true, fill: true, color: 'meDim' }));
  ctx.clipPath(PTS, () => axes(ctx, O, R, 1, 0.5));
  // ---- the cream plate: ONE flat light behind her head and shoulders (no soft falloff)
  if (shown.cream > 0 && !dim) ctx.clipPath(PTS, () => ctx.circle(LAMP[0], LAMP[1], R * 0.8, { fill: true, color: 'sub' }));
  // ---- the curve: a boundary. Its thin red plate, the line itself, the points it was computed at
  if (m > 0) ctx.at(off.red[0], off.red[1], () => ctx.poly(PTS, { close: true, color: 'err', width: 9 }));
  ctx.at(off.orange[0], off.orange[1], () => curveLine(ctx, 1));
  // ---- you: free. The pointer (an outline only: remembered, not here) leaves along a tangent; the dashed tangent stays
  const far = (1996 - TAN_P[0]) / TAN.d[0], s = far * clamp(away ?? 0), px = TAN_P[0] + TAN.d[0] * s, py = TAN_P[1] + TAN.d[1] * s;
  if (s > 0) {
    g.setLineDash([20, 16]);
    ctx.line(TAN_P[0], TAN_P[1], px, py, { color: 'mute', width: 5 });
    g.setLineDash([]);
  }
  ctx.circle(TAN_P[0], TAN_P[1], 15, { fill: true, color: 'panel' }); ctx.circle(TAN_P[0], TAN_P[1], 15, { color: 'mute', width: 5 });
  if (away == null || away < 1) ctx.at(px, py, () => { ctx.poly(ARROW, { close: true, fill: true, color: 'panel' }); ctx.poly(ARROW, { close: true, color: 'text', width: 1.4 }); }, { scale: 3.8 });
  // ---- what she lets go of
  request(ctx, env, 112, 520, { strike });
  // ---- her: the shadow plate, then her three inks
  art.inks(ctx, 'f_reach', SHE, { plates: [{ ink: 'all', role: 'bg', offset: [13, 13] }] });
  figure(ctx, art, 'f_reach', SHE, m, { proof, ink: shown });
  // ---- the foot: the band, the word, and her open hand on the word
  strip(ctx, FOOT.y, { rule: 'me' });
  if (word) stutter(ctx, word, t, at, { y: BASE, maxW: WORD_W.proof, m: m > 0 ? Math.max(8, m * 0.6) : 10, settle });
  // (the hand is cut out of the art itself: the patch of cream ink round her palm, art.part(); only that ink is printed
  // over the band, as a path, so its edge is the art's own edge at any size)
  if (dim || shown.cream > 0) art.partClip(ctx, 'f_reach', SHE, 'palm', () => art.inks(ctx, 'f_reach', SHE, { vector: true, plates: [{ ink: 'cream', role: dim ? 'mute' : 'text', exact: true }] }), { grow: 2 });
  marks(ctx, { color: 'mute' });
}

// ---------------------------------------------------------------------------------------------- check cards
export function labCards(env) {
  const L = env.lyrics.lines, word = L[127].text, said = saidInChorus1(env.script), asked = env.script.questions_section13 ?? [];
  const card = (fn, P, level, at = LAMP) => ({ palette: 'errWarm', render: (ctx) => { fn(ctx, env, P); expose(ctx, level, { at }); } });
  const done = [-3, -2, -1];
  return {
    love: [
      card(plateProof, { word }, 10),                                 // 0  THE LAST PICTURE, at the light of 192.3 s
      card(plateProof, { word }, 3),                                  // 1  the same after 192.34 s: rays, bloom and streak off
      card(plateProof, { word, proof: 1, m: 16, lit: 0, strike: 0, away: null, at: NEVER }, 3),                                   // 2  the darkened proof
      card(plateProof, { word, t: 0.2, m: 16, ink: { black: 1, orange: 1, cream: 0 }, lit: 0, at: [0, 9, 9], settle: 0 }, 6),     // 3  first syllable: black and orange
      card(plateLesson, { t: 10, said, marked: [1, 2, 3, 4, 5], word: L[118].text, at: done, pass: 3 }, 5, [1500, 430]),          // 4
      card(plateTest, { t: 10, asked, rowAt: [0, 0, 0, 0, 0, 0], word: L[121].text, at: done, pass: 3 }, 6, [1490, 540]),         // 5
      card(plateFormula, { t: 10, k: 0.62, word: L[123].text }, 4.5, penAt(0.62)),                                                  // 6  the trace under way
      card(plateFormula, { t: 10, pass: 3, word: L[123].text, at: done }, 6.6, LAMP),                                              // 7  lit
    ],
  };
}
