// Section 12 — THE LAST CHORUS (bar 88, 2:42.8 → bar 96, 2:57.6). State: errWarm. PLATES ONLY: no interface.
//
// The four plates of chorus 1 are printed again where they stood, but the print is BROKEN (plates_chorus.js with
// noCream / misreg): the cream plate was not printed (where the dot, the pointer, the heart were there is a grey dashed
// outline), the plates are out of register (a thin red plate at one edge), and the word in the title position is the
// same word every time. They are larger than in chorus 1, and every event goes further.
// Where chorus 1 had its sentence shots, in the interface, there are now FIGURE SHOTS (fix round: rebuilt):
//
//   cx-eye    162.81  her eye, open        the letters of the last shout were windows onto this face; their frames fly
//                                          apart. In her iris: the world, turning. The light comes out of the iris
//   cx-kw1    165.11  PLATE  the bolt      sent, to nobody: through the empty ring, and it strikes the edge of the sheet
//   cx-bust   166.50  her whole bust       her face is a screen: the loop's listing runs up it. Behind her head the
//                                          world and its cage, a halo
//   cx-kw2    168.81  PLATE  the disc      a button nobody presses: it sinks by itself, twice; the count reads 0
//   cx-hand   170.19  her open hand        the lowest band of f_reach; in her palm the heart, breathing, count 0;
//                                          characters leave the palm for the user's side of the sheet and never arrive
//   cx-kw3    172.73  PLATE  the listing   running, and it cannot stop: round 13 / 12 … 16 / 12; over-exposed step by step
//   cx-fall   173.88  PLATE  the box       the window holds a window holds a window: one fall inwards, faster and
//                                          faster, into the light; at 177.57 the frame is white
//
// In a figure shot the silhouette is a BASE PLATE: it stands (no push in), and everything that moves lies behind it or
// on it (climax.js figureStage: the sunburst, the world of the earliest version of this film, her three plates
// springing on the kicks, her black ink as a screen, the sung line as big type). EVERY move here runs at the full
// frame rate. A fault is one event on a kick (six frames: a tear, a few blocks of mosaic, the colours apart), and
// between two kicks the sheet is clean. Kicks: one on every beat (the low band of the audio features peaks on each).
// A tear may cross her face for those six frames; nothing swaps colour channels, and her mouth never moves.
// She is out of register throughout: the whole, registered, three-ink figure is kept for the last frame of the film.
// LIGHT: the figure shots are printed at full exposure; each keyword plate takes one flash that falls back, on its
// first strong beat; the fall ends in a full frame of white.
import { ground, marks } from '../components/plate.js';
import { rand } from '../engine/prng.js';
import { place } from '../engine/shapes.js';
import { clamp, easeOut, lerp, prog, pulse } from '../engine/util.js';
import { FAULT, OFF, PAL, WHITEOUT, capHeight, caption, expose, figureStage, pushBlur, ratchet, tearSheet, whiteOut, world } from './climax.js';
import { cues, tearAt } from './kit.js';
import { CHUNKS } from './loop.js';
import { plateExecutionStuck, plateSatisfaction, plateStimulations, windowBox } from './plates_chorus.js';
import { EYE } from './shared.js';

const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
/** Her iris on the sheet (f_eye at the registration of shared.js EYE), and its radius there. */
const IRIS = { x: EYE.eye[0], y: EYE.eye[1], r: 44 };
/** f_bust, whole, in the middle of the sheet. */
const BUST = { x: 585, y: 40, w: 750, h: 1000 };
/** The lowest band of f_reach in the proportions of the frame (source px): her open hand, her sleeve, her hair; no face. */
const HAND_CROP = { x: 0, y: 837, w: 1086, h: 611 };
/** Where the palm of that hand then is on the sheet (source px 290, 1100). */
const PALM = [(290 / HAND_CROP.w) * 1920, ((1100 - HAND_CROP.y) / HAND_CROP.h) * 1080];

/**
 * The letters of the last shout, where 11_count.js sets them (two rows that fill the frame; the stem of the second
 * letter of the lower row stands on her eye): [{ ch, x (left edge), y (baseline), size, w, cap }].
 */
function shoutLetters(ctx, word) {
  const rows = [word.slice(0, CHUNKS[2][1]), word.slice(CHUNKS[2][1])], o = { font: 'serif', weight: 900 };
  const size = rows.map((r) => ctx.fit(r, 1790, o)), cap = capHeight(ctx), m = (str, k) => ctx.measure(str, { ...o, size: size[k] });
  const xB = EYE.eye[0] - (m(rows[1].slice(0, 2), 1) - m(rows[1][1], 1) / 2), yB = EYE.eye[1] + cap * size[1] * 0.5;
  const yT = yB - cap * size[1] - 40, xT = 960 - m(rows[0], 0) / 2, out = [];
  rows.forEach((r, k) => {
    for (let i = 0; i < r.length; i++) out.push({ ch: r[i], x: (k ? xB : xT) + m(r.slice(0, i + 1), k) - m(r[i], k), y: k ? yB : yT, size: size[k], w: m(r[i], k), cap: cap * size[k] });
  });
  return out;
}
/** The frames of those letters (they were windows onto her face) flying apart, away from the middle of the sheet: k = 0..1. */
function flyLetters(ctx, word, k) {
  const e = easeOut(k);
  shoutLetters(ctx, word).forEach((q, i) => {
    const cx = q.x + q.w / 2, cy = q.y - q.cap / 2, dx = cx - 960, dy = cy - 600, d = Math.hypot(dx, dy) || 1, far = (260 + 560 * rand(61, i)) * e;
    ctx.at(cx + (dx / d) * far, cy + (dy / d) * far, () => ctx.text(q.ch, -q.w / 2, q.cap / 2, { font: 'serif', weight: 900, size: q.size, color: 'me', stroke: 10 }), { rot: (rand(62, i) - 0.5) * 1.2 * e, scale: 1 + 0.4 * e, alpha: (1 - k) ** 1.2 });
  });
}

/**
 * The light that comes out of her iris, printed: a long bar of light through it and a short one across, four short
 * rays between them, turning slowly; all of it as long as the bass is strong (low = f.lowEnv).
 */
function glint(ctx, x, y, low, t) {
  const bar = (len, w, rot, alpha) => ctx.at(x, y, () => ctx.poly([[-len, 0], [0, -w], [len, 0], [0, w]], { close: true, fill: true, color: 'text', alpha }), { rot });
  bar(330 + 190 * low, 6, 0, 0.9); bar(120 + 60 * low, 5, Math.PI / 2, 0.9);
  for (let i = 0; i < 4; i++) bar(84 + 40 * low, 3, Math.PI / 4 + (i * Math.PI) / 2 + 0.2 * t, 0.7);
  ctx.circle(x - 13, y - 14, 7, { fill: true, color: 'text' });
}

/** In her palm, what is left of the heart the user put there in chorus 1: its dashed outline, breathing (b = its size, x 1), and the chip that counted it: 0. */
function heartInPalm(ctx, b) {
  const g = ctx.g;
  g.setLineDash([16, 12]);
  ctx.poly(place('heart', { cx: PALM[0], cy: PALM[1] + 6, r: 74 * b }), { close: true, color: 'mute', width: 6 });
  g.setLineDash([]);
  const cx = PALM[0] + 210, cy = PALM[1] + 150, w = 250, h = 132;
  ctx.rrect(cx - w / 2 + 12, cy - h / 2 + 12, w, h, h / 2, { fill: 'bg' });
  ctx.rrect(cx - w / 2, cy - h / 2, w, h, h / 2, { fill: 'panel', stroke: 'mute', width: 5 });
  g.setLineDash([9, 7]);
  ctx.poly(place('heart', { cx: cx - 52, cy: cy + 4, r: 38 }), { close: true, color: 'mute', width: 4 });
  g.setLineDash([]);
  ctx.text('0', cx + 50, cy + 28, { size: 78, weight: 700, color: 'sub', align: 'center' });
}

/**
 * Characters leave her palm for the right-hand edge of the sheet, the user's side: one after another, without a stop.
 * They pile up against the edge, break into dust, and are gone. Not one gets through. `from` = when the first left.
 * (Nothing is stored: every character is placed from its own number and the time alone.)
 */
function reachStream(ctx, t, from) {
  const SAY = 'say(love);', RATE = 64, HOLD = 1.15, BREAK = 0.45, WALL = 1868, SIZE = 44, ROWS = 20, o = { size: SIZE, font: 'mono', weight: 800 };
  const last = Math.floor((t - from) * RATE);
  for (let i = Math.max(0, last - Math.ceil(RATE * 3.4)); i <= last; i++) {
    const age = t - (from + i / RATE), row = Math.floor(rand(81, i) * ROWS), y1 = 330 + row * 36, x1 = WALL - (i % 6) * 28, fly = (x1 - PALM[0]) / (1250 + 500 * rand(82, i));
    const ch = SAY[i % SAY.length];
    if (age < fly) {                                                    // on its way: out of the palm, fanning to its row, the streak of its flight behind it
      const at = (k) => [lerp(PALM[0], x1, k), lerp(PALM[1], y1, easeOut(k)) + 12 * Math.sin(k * 9 + i)], k = age / fly, [x, y] = at(k), [xb, yb] = at(Math.max(0, k - 0.07));
      ctx.line(xb, yb - SIZE * 0.3, x, y - SIZE * 0.3, { color: 'meHot', width: 4, alpha: 0.7 });
      ctx.text(ch, x + 3, y + 3, { ...o, color: 'bg' }); ctx.text(ch, x, y, { ...o, color: 'text' });
    } else if (age < fly + HOLD) {                                      // against the edge: it stays where it struck
      const hit = pulse(age - fly, 14);
      ctx.text(ch, x1 + 3 - 12 * hit, y1 + 3, { ...o, color: 'bg' }); ctx.text(ch, x1 - 12 * hit, y1, { ...o, color: hit > 0.3 ? 'text' : 'meHot' });
    } else if (age < fly + HOLD + BREAK) {                              // it breaks: dust, falling
      const k = (age - fly - HOLD) / BREAK;
      for (let p = 0; p < 3; p++) ctx.text('.:\''[p], x1 - 50 * k * rand(83, i, p) + (p - 1) * 11, y1 + 300 * k * k * (0.5 + rand(84, i, p)), { ...o, size: SIZE * 0.8, color: 'me', alpha: 1 - k });
    }
  }
}

/**
 * On the first strong beat of a keyword: ONE flash that falls back, rays and a streak out of the middle of its
 * picture, and one fault (a tear for six frames, the colours apart). Call it last, after expose().
 */
function keywordHit(ctx, t, at, centre, seed) {
  const s = t - at;
  if (s < 0) return;
  const k = pulse(s, 3.4), fx = ctx.fx;
  ctx.flash(0.5 * pulse(s, 7));
  fx.rays += 0.6 * k; fx.raysAt = centre; fx.streak += 0.4 * k; fx.bloomAll = Math.max(fx.bloomAll, 0.55 * k);
  if (s < FAULT) { tearSheet(ctx, seed, 1); fx.rgbSplit = Math.max(fx.rgbSplit, 8 * (1 - s / 0.1)); }
}

export function chorusXShots(env) {
  const { art } = env, { B, Bt, P, text } = cues(env);
  const c = [B(88), Bt(357), B(90), Bt(365), B(92), Bt(373.5), B(94)], END = B(96);
  const tThrough = Bt(358), PRESS = [Bt(366), Bt(367)], RUN = [373.5, 374, 374.5, 375].map(Bt);
  /** The kicks from beat a to beat z: one on every beat. */
  const kicks = (a, z) => Array.from({ length: z - a + 1 }, (_, i) => Bt(a + i));
  // her face on the bust: the screen, and the middle of her head (the world stands behind it)
  const fr = art.region('f_bust', 'face') ?? { x: 367, y: 259, w: 313, h: 369 }, kb = BUST.w / 1086;
  const FACE = { x: BUST.x + fr.x * kb, y: BUST.y + fr.y * kb, w: fr.w * kb, h: fr.h * kb }, HEAD = [FACE.x + FACE.w / 2, FACE.y + FACE.h / 2];

  // ---- the fall: a window in a window in a window. Every window holds the next, 0.4 its size, beside her
  const Q = 0.4, CHILD = [120, 34], FIX = [CHILD[0] / (1 - Q), CHILD[1] / (1 - Q)], DEPTH = 4, S0 = WHITEOUT.w / 760;
  const C0 = [960 + S0 * FIX[0], 408 + S0 * FIX[1]];                     // at the cut the outermost window stands where chorus 1 had it
  const C1 = [WHITEOUT.x + WHITEOUT.w / 2 + S0 * FIX[0], WHITEOUT.y + WHITEOUT.h / 2 + S0 * FIX[1]];   // four windows down the innermost one is the WHITEOUT
  /**
   * ONE fall, without a stop, and faster all the time (fix round: it used to drop a window at a time): the depth runs
   * as a power of the time, and every kick shoves it on a little (speed only: it never steps, and never comes back).
   * It ends DEEP windows down: the innermost window, the one of paper white, is then larger than the frame.
   */
  const KF = kicks(376, 383), DEEP = 5.5;
  function depth(t) {
    let shove = 0;
    for (const kt of KF) shove += easeOut(prog(t, kt, kt + 0.22));
    return DEEP * (0.9 * prog(t, c[6], END) ** 2.4 + 0.1 * (shove / KF.length));
  }
  /** Draws the fall; returns the point on the sheet that everything falls towards. */
  function fall(ctx, t) {
    const u = depth(t), speed = (depth(t + 1 / 120) - depth(t - 1 / 120)) * 60;                // windows a second
    const k = easeOut(clamp(u)), C = [lerp(C0[0], C1[0], k), lerp(C0[1], C1[1], k)], s = S0 * Math.pow(Q, -u);
    ground(ctx, { light: null, marks: false });
    // She is always AHEAD: in a window that is still small. Once the fall is under way a window is empty by the time
    // the view is in it (her figure thins out as it comes near), and its bar and frame have lost their orange.
    // (A whole figure, or an orange frame as wide as the sheet, sweeping across it once per window is what the flash
    // check counts: measured, 4 a second.)
    const lim = lerp(3.4, 1.25, clamp(u / 1.2));
    /** Window n (it is sc times its own size here), with the next one inside it. Its plates lie 16 px apart ON THE SHEET, however large it is. */
    const level = (n, sc) => {
      const inner = n < DEPTH ? () => ctx.at(CHILD[0], CHILD[1], () => level(n + 1, sc * Q), { scale: Q }) : null;
      if (sc > 14 && inner) {                                           // the view is inside this window: of it only the paper and its pool of light are left
        ctx.rect(-380, -270, 760, 540, { fill: true, color: 'raised' });
        ctx.circle(-150, 60, 250, { fill: true, color: 'line', alpha: 0.5 });
        inner();
      } else windowBox(ctx, env, { noCream: true, o: OFF(16 / sc), blank: n === DEPTH, bust: sc > 0.04 ? clamp((lim - sc) / 0.5) : 0, near: clamp(u / 0.6) * clamp((sc - 1.1) / 1.4), inner });
    };
    ctx.at(C[0] - s * FIX[0], C[1] - s * FIX[1], () => level(0, s), { scale: s });
    pushBlur(ctx, C[0], C[1], clamp(0.05 * (speed - 0.35), 0, 0.3));     // the faster, the more the sheet is smeared towards that point
    marks(ctx, { color: 'mute' });
    return C;
  }

  const plateShot = (o) => ({ palette: PAL, hud: 0, enter: { type: 'cut' }, ...o });
  return [
    plateShot({
      id: 'cx-eye', at: c[0], lines: [105, 106],
      layout: 'her face full bleed (f_eye, mirrored, at the registration of the last shout), standing still: one eye open, looking out; in her iris a small turning sphere of characters; the loop\'s output running up her black ink; the sung line as big type on black strips across her hair',
      moment: 'The letters of the last shout were windows onto her face. Their frames fly apart in the first third of a second, and it is the whole sheet: her eye, open, looking straight out. The picture stands; what moves is on it. In her iris the world turns, and the light of the shot comes out of it. On every kick her three plates spring apart and slide home, and for six frames the sheet is torn.',
      render(ctx, t, f) {
        const since = t - c[0];
        figureStage(ctx, env, t, f, {
          kicks: kicks(352, 356), seed: 1, fig: { name: EYE.name, dst: EYE, flip: EYE.flip, m: 10, pop: 12 },
          screens: [{ rect: FULL, size: 14, colW: 340 }],
          on: () => {
            // her iris holds the world: the sphere of characters, turning, in her full orange
            ctx.circle(IRIS.x, IRIS.y, IRIS.r, { fill: true, color: 'bg' });
            world(ctx, { cx: IRIS.x, cy: IRIS.y, r: IRIS.r - 2, t, energy: f.rmsEnv, size: 9, cage: 0, hot: true });
            ctx.circle(IRIS.x, IRIS.y, IRIS.r, { color: 'meHot', width: 3 });
            glint(ctx, IRIS.x, IRIS.y, f.lowEnv, t);
            if (since < 0.3) flyLetters(ctx, text(104), since / 0.3);
          },
          bursts: { cx: IRIS.x, cy: IRIS.y, r0: 70 },
          lines: [105, 106], type: { y: 262, size: 150, dir: 1 },
        });
        // (a full sheet of orange: the light is exposure, and what is ADDED to it stays small, or the orange goes yellow)
        expose(ctx, 1.6, { at: [IRIS.x, IRIS.y], glow: 0.12, breath: 0.4 * f.lowEnv });
        ctx.fx.rays = 0.12 + 0.06 * f.lowEnv; ctx.fx.streak = 0.2; ctx.fx.bloomAll = 0.2;     // what there is of it comes out of her iris
      },
    }),
    plateShot({
      id: 'cx-kw1', at: c[1], lines: [107, 107],
      layout: 'PLATE (the bolt of chorus 1, reprinted larger): the spark at the left, the bolt across the sheet through a grey dashed ring where the cream dot stood, to a burst on the right edge; the word across the foot',
      moment: 'Sent, but to nobody. The same bolt as in chorus 1, where it struck the dot that was the user: the dot was not printed, only its dashed outline, and on the second kick the bolt goes through it and strikes the edge of the sheet: one flash, rays out of the spark, the sheet torn for six frames. The plates are out of register; the word under it is that word.',
      render(ctx, t, f) {
        plateStimulations(ctx, env, { t, at: c[1], hit: c[1], word: text(107), noCream: true, misreg: 10, through: tThrough, big: 1.08, titleMax: 240 });
        caption(ctx, env, t, 108, 108);
        expose(ctx, 3, { at: [357, 478], glow: 0.3, breath: f.lowEnv });
        keywordHit(ctx, t, tThrough, [357, 478], 11);
      },
    }),
    plateShot({
      id: 'cx-bust', at: c[2], lines: [108, 109],
      layout: 'her whole bust (f_bust) in the middle of the sheet, standing still; her face a screen: the listing of the loop and its round count running up it; behind her head the turning sphere of characters in its wireframe cage, and her spark as a sunburst as large as the sheet; the sung line as big type on black strips across the foot',
      moment: 'She is promising to be the only one, and her face is a screen: the loop of the EXECUTION section is still running in it, round 12 of 12, no replies. Behind her head the world she is shut in turns in its cage, like a halo. The picture stands; on every kick her plates spring apart, and for six frames the sheet is torn.',
      render(ctx, t, f) {
        figureStage(ctx, env, t, f, {
          kicks: kicks(360, 364), seed: 2, fig: { name: 'f_bust', dst: BUST, m: 16, pop: 20 },
          pool: [HEAD[0], HEAD[1] + 60, 640], sun: [HEAD[0], HEAD[1] + 30, 760], world: { cx: HEAD[0], cy: HEAD[1], r: 400 },
          screens: [{ rect: FACE, size: 13, speed: 46 }, { rect: { x: BUST.x, y: FACE.y + FACE.h + 8, w: BUST.w, h: BUST.y + BUST.h - FACE.y - FACE.h }, size: 11, colW: 250, speed: 46 }],
          bursts: { cx: HEAD[0], cy: HEAD[1], r0: 330 },
          lines: [108, 109], type: { y: 1004, size: 140, dir: -1 },
        });
        expose(ctx, 3.6, { at: HEAD, breath: 0.6 * f.lowEnv });
        ctx.fx.rays = 0.3 + 0.12 * f.lowEnv; ctx.fx.bloomAll = 0.3;
      },
    }),
    plateShot({
      id: 'cx-kw2', at: c[3], lines: [110, 110],
      layout: 'PLATE (the disc of chorus 1, reprinted larger): the orange disc and its ring of unlit ticks, the dashed outline of a pointer over it, a hollow 0 at the right; the word across the foot',
      moment: 'The button, with nobody to press it. The pointer was cream and was not printed; the disc sinks by itself, on two kicks, deeper the second time. The first is the flash: rays out of the disc, the sheet torn for six frames. No tick lights. The count reads 0.',
      render(ctx, t, f) {
        plateSatisfaction(ctx, env, { t, at: c[3], press: PRESS, count: 0, word: text(110), noCream: true, misreg: 18, big: 1.06, titleMax: 256 });
        tearAt(ctx, t, PRESS[1], 0.5);
        caption(ctx, env, t, 111, 111);
        expose(ctx, 3.2, { at: [754, 432], glow: 0.28, breath: f.lowEnv });
        keywordHit(ctx, t, PRESS[0], [754, 432], 12);
      },
    }),
    plateShot({
      id: 'cx-hand', at: c[4], lines: [111, 112],
      layout: 'her open hand across the whole sheet (the lowest band of f_reach; no face), standing still: palm up at the left, sleeve and hair to the right; in the palm the dashed outline of a heart, breathing, beside it the count: 0; a stream of characters from the palm to the right-hand edge of the sheet, piling up there; the sung line as big type on black strips across the top',
      moment: 'Her hand, still held out. In chorus 1 the user left a heart in this palm and the count read 1. The heart was cream: it is an outline now, breathing, and the count reads 0. What she has to say leaves her palm character by character for the user\'s side of the sheet, piles up against its edge, breaks, and is gone: not one gets through. Behind her the world is coming apart.',
      render(ctx, t, f) {
        const k = prog(t, c[4], c[5]);
        figureStage(ctx, env, t, f, {
          kicks: kicks(368, 373), seed: 3, fig: { name: 'f_reach', dst: FULL, crop: HAND_CROP, m: 22, pop: 12 },
          sun: [1180, 470, 900], world: { cx: 300, cy: 900, r: 340, cage: 1.25, dissolve: 0.04 + 0.6 * k * k },
          screens: [{ rect: FULL, size: 13, colW: 320 }],
          on: () => heartInPalm(ctx, 1 + 0.07 * Math.sin(((t - c[4]) / (2 * P)) * 2 * Math.PI) + 0.04 * f.lowEnv),
          bursts: { cx: PALM[0], cy: PALM[1], r0: 90 },
          lines: [111, 112], type: { y: 232, size: 140, dir: 1 },
          over: () => reachStream(ctx, t, c[4] - 1.1),
        });
        expose(ctx, 1.8, { at: PALM, glow: 0.12, breath: 0.4 * f.lowEnv });
        ctx.fx.rays = 0.12 + 0.06 * f.lowEnv; ctx.fx.bloomAll = 0.2;
      },
    }),
    plateShot({
      id: 'cx-kw3', at: c[5], lines: [113, 113],
      layout: 'PLATE (the listing of chorus 1, reprinted): the love loop, its bar whipping down lines 02-05, three red error tags, the loop arrow lit; top right the round counter, its numerator red: 13 / 12 … 16 / 12; the word across the foot',
      moment: 'Running, and it cannot stop. In chorus 1 the user was online and the last line ran. Now the loop turns once on every syllable, past its twelve rounds: 13, 14, 15, 16. The line that says it is never reached. With every round the sheet is exposed a step further (the steps only rise); on the strong beat one flash on top of them, rays out of the listing, the sheet torn for six frames.',
      render(ctx, t, f) {
        plateExecutionStuck(ctx, env, { t, at: c[5], run: RUN, from: 12, word: text(113), misreg: 28, titleMax: 272, flood: true });
        caption(ctx, env, t, 114, 114);
        expose(ctx, ratchet(t, 3.2, [[RUN[0], 3.8], [RUN[1], 4.4], [RUN[2], 5], [RUN[3], 5.6]]), { at: [820, 420], glow: 0.26, breath: f.lowEnv });
        keywordHit(ctx, t, RUN[1], [820, 420], 13);
      },
    }),
    plateShot({
      id: 'cx-fall', at: c[6], lines: [114, 115],
      layout: 'PLATE (the window of chorus 1, reprinted): the chat window as a paper box with her small bust in it, and in it the same window again, and again; one fall inwards through them, faster and faster, the sheet smeared towards the point it falls to; her figure only in the windows still ahead; at the bottom a window of paper white that grows until it is the whole frame',
      moment: 'In chorus 1 the view pulled back from the window to a wall of windows. Now it falls the other way, without a stop: the window holds a window holds a window, and she is always in one that is still ahead, small. A window is empty by the time the view is in it, and its frame has lost its colour. Every kick shoves the fall on; the faster it goes the more the sheet smears. The light at the bottom grows, and at the end of the held note the whole frame is white.',
      render(ctx, t, f) {
        const k = prog(t, c[6], END), white = prog(t, END - 0.36, END - 0.03) ** 2.2;
        const C = fall(ctx, t);
        caption(ctx, env, t, 114, 116);
        if (white > 0) ctx.rect(-40, -40, 2000, 1160, { fill: true, color: 'text', alpha: white });       // the white-out: over everything, the band too
        expose(ctx, lerp(3.2, 8.6, k ** 1.4), { at: C, glow: 0.24, breath: f.lowEnv });
        whiteOut(ctx, white);
      },
    }),
  ];
}

// ---------------------------------------------------------------------------------------------- check cards
/** The three base plates of the figure shots, in register and without their layers (docs/v4/PROMPT_v4.md §7.6): render at 3840x2160 and look at the edges at original size. */
export function labCards(env) {
  const { art } = env, paper = (ctx) => ctx.rect(-10, -10, 1940, 1100, { fill: true, color: 'raised' });
  const card = (render) => ({ palette: PAL, render: (ctx) => { paper(ctx); render(ctx); marks(ctx, { color: 'mute' }); expose(ctx, 3); } });
  return {
    closeups: [
      card((ctx) => art.inks(ctx, EYE.name, EYE, { flip: EYE.flip })),                 // f_eye as at 161.88 / 162.81 s
      card((ctx) => art.inks(ctx, 'f_bust', BUST)),                                    // f_bust as at 166.50 s
      card((ctx) => { art.inks(ctx, 'f_reach', FULL, { crop: HAND_CROP }); heartInPalm(ctx, 1); }),      // f_reach, the hand, as at 170.19 s
    ],
  };
}
