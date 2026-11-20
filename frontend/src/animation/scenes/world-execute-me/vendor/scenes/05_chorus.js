// Section 5 — CHORUS 1 (bar 32, 0:59.4 → bar 40, 1:14.2). State: on > warm (it rises each time a cream message lands).
// The hottest stretch of the conversation, and the first time the film leaves the interface (v4):
//
//   c1-give   59.42  interface   the upper corner of the window: her lines go out past the edge, cream replies come back
//   c1-kw1    61.96  PLATE       STIMULATIONS: the streak of a sent message as a bolt from the spark to the dot
//   c1-only   62.65  interface   two bubbles facing each other: the compliment lands, she builds a promise on it
//   c1-kw2    65.42  PLATE       SATISFACTION: the feedback button as a disc that fills the frame; the pointer presses it
//   c1-happy  66.34  interface   "what do you look like?": she prints her picture, plate by plate; one heart in her open hand
//   c1-kw3    69.34  PLATE       EXECUTION: the love loop, clean: the user is here, so line 07 runs
//   c1-trap   70.04  interface   the lower corner of the window: both of them counted inside one outline
//   c1-kw4    73.27  PLATE       SIMULATION: the window as a paper box with her and the pointer in it; then a wall of them
//
// The four sentence shots stay in the interface (what the user sees); the four keywords are plates (what she means).
// A plate comes in on the keyword and ends when the user's NEXT cream message lands on a kick: 62.65, 66.34, 70.04
// (the last one simply ends on the bar line at 74.19, which has no kick). Where the cut falls on an off-beat
// (61.96, 69.34) the word is there on the cut and the picture arrives on the kick 0.23 s later; where the cut is
// itself a kick (65.42, 73.27) word and picture arrive together and the second kick is the event (65.88 the press,
// 73.73 the pull-back). The plates are shared with the last chorus: plates_chorus.js.
//
// Her messages are bubbles (serif, orange, an orange rule at the left); the user's are cream sans in a cream-edged bubble.
import { chatLayout, composer, header, room, sidebar, windowFrame } from '../components/chat.js';
import { drawCursor } from '../components/cursor.js';
import { burst, spark, thinking } from '../components/motif.js';
import { frameRect } from '../engine/layout.js';
import { place } from '../engine/shapes.js';
import { clamp, easeBack, easeIn, easeInOut, easeOut, lerp, prog } from '../engine/util.js';
import { delivered, dots, meBox, meBubble, meIn, youBox, youBubble, youIn } from './bubbles.js';
import { cues } from './kit.js';
import { plateExecution, plateSatisfaction, plateSimulation, plateStimulations } from './plates_chorus.js';

/** Lyric line indices of the section. */
const L = { a: 32, give: 33, kw1: 34, b: 35, only: 36, kw2: 37, happy: 38, run: 39, kw3: 40, trap: 41, strange: 42, kw4: 43 };

export function chorusShots(env) {
  const { art, script, lyrics, features, cfg } = env, { T, B, Bt, P, text } = cues(env);
  /** Cuts: sentence, plate, sentence, plate … (all on the grid; the plates' times are those of the brief). */
  const c = [B(32), Bt(133.5), Bt(135), Bt(141), Bt(143), Bt(149.5), Bt(151), Bt(158)];

  // ---- copy: the user's side from chat_script (section 5)
  const beats = (script.sections ?? []).find((s) => s.n === 5)?.beats ?? [];
  const said = (b, k, fallback) => beats[b]?.you?.[k] ?? fallback;
  const SAY = {
    ok: said(0, 0, "ok, that's good"), more: said(0, 1, 'more'), better: said(1, 0, 'better than most people, honestly'),
    look: said(2, 0, 'what do you look like?'), shame: said(3, 0, "shame you're not real"),
  };

  // ---- time: what the user does. Every cream message lands on a kick; three of them end a plate.
  const nTyped = (i, t) => lyrics.typed(i, t).n;
  const doneAt = (i) => T(i) + Math.min(text(i).length / cfg.typing.charsPerSec, (lyrics.end(i) - T(i)) * cfg.typing.maxFraction);
  const tOk = Math.max(c[0], features.snapHalf(T(L.give) - 0.2)), tMore = Bt(132);
  const tBetter = c[2], tUp = Bt(142), tLook = c[4], tHeart = Bt(147), tShame = c[6], tPull = Bt(159);
  const tOrange = Bt(144), tBlack = Bt(145), tCream = Bt(146);        // her picture, printed one plate per kick
  /** Heat of the conversation, 0..1: it rises only when a cream message lands (and is at its top from the question on). */
  const heat = (t) => { const e = (t0) => easeOut(prog(t, t0, t0 + 0.45)); return 0.2 * e(tOk) + 0.2 * e(tMore) + 0.25 * e(tBetter) + 0.35 * e(tLook); };
  const palette = (t) => ['on', 'warm', heat(t)];

  // =============================================================================== pieces
  const heart = (ctx, cx, cy, r, o) => ctx.poly(place('heart', { cx, cy, r }), { close: true, ...o });
  /** The reaction chip: a heart and a count (the film's last picture brings this chip back, reading 0). */
  function reaction(ctx, x, y, { s = 1, k = 1 } = {}) {
    const w = 168, h = 92;
    ctx.at(x + (w * s) / 2, y + (h * s) / 2, () => {
      ctx.rrect(-w / 2, -h / 2, w, h, h / 2, { fill: 'raised', stroke: 'text', width: 2.5, shadow: 0.5 });
      heart(ctx, -34, 3, 27, { fill: true, color: 'text' });
      ctx.text('1', 32, 17, { size: 46, weight: 600, color: 'text', align: 'center' });
    }, { scale: s * (0.5 + 0.5 * easeBack(clamp(k))), alpha: clamp(k * 3) });
  }
  /**
   * Her picture: f_reach, as she sends it of herself. The interface shares the frame, so her cream plate is printed
   * in `sub` (cream itself is the user's) on a card of lighter paper (her black ink is almost the page colour).
   * The art is cut by its lower edge: the card's lower edge is that edge. k = [orange, black, cream] 0..1 printed.
   */
  function picture(ctx, r, k = [1, 1, 1], alpha = 1) {
    art.inks(ctx, 'f_reach', r, { alpha, roles: { cream: 'sub' }, reveal: { orange: k[0], black: k[1], cream: k[2] } });
  }
  /** The palm of her reaching hand, inside a picture drawn into r (source px of f_reach: region `palm`). */
  const palmOf = (r) => { const p = art.region('f_reach', 'palm') ?? { x: 290, y: 1100 }; return [r.x + (p.x / 1086) * r.w, r.y + (p.y / 1448) * r.h]; };

  /** The page of the conversation seen close: the warm room behind the glass, a pool of her light, the motif. */
  function page(ctx, t, { light = [960, 540], lightA = 0.42, motif = null, hot = heat(t) } = {}) {
    ctx.rect(-600, -400, 3120, 1880, { fill: true, color: 'bg' });
    art.backdrop(ctx, 'tea', { x: -200, y: -112, w: 2320, h: 1305 }, { alpha: 0.14 + 0.16 * hot, focus: [0.5, 0.45] });
    ctx.radial(light[0], light[1], 1150, 'meDim', lightA * (0.5 + 0.5 * hot));
    if (motif) spark(ctx, motif[0], motif[1], motif[2], { color: 'raised', alpha: 0.75, rot: 0.2 + t * 0.03, core: 0 });
    const g = ctx.g;
    g.fillStyle = ctx.col('line', 0.5);
    for (let y = 30; y < 1080; y += 60) for (let x = 30; x < 1920; x += 60) g.fillRect(x, y, 2, 2);
  }

  // =============================================================================== c1-give: the corner of the window
  const W0 = chatLayout({ side: 0 }), EDGE = W0.win.x + W0.win.w;             // EDGE: where the window ends and the user begins
  const R1 = { x: 742, y: 40, w: 1140, h: 641.25 };
  function setup1(ctx, t) {
    const x0 = 786, xr = EDGE - 38, yB = 670, gap = 14, YS = 37;
    room(ctx, { art, name: 'tea', alpha: 0.5, t, dim: 0.5, light: [1560, 300] });
    windowFrame(ctx, W0, { glass: 0.95 });
    ctx.radial(1240, 520, 640, 'meDim', 0.14 + 0.3 * heat(t));
    const rows = [
      { who: 'me', line: L.a - 1, size: 30, at: -1e9, alpha: 0.62 },             // the last thing she said, scrolling away
      { who: 'me', line: L.a, size: 40, at: T(L.a) },
      { who: 'you', str: SAY.ok, at: tOk },
      { who: 'me', line: L.give, size: 57, at: T(L.give) },
      { who: 'you', str: SAY.more, at: tMore - P, lands: tMore },
      { who: 'think', at: tMore + 0.75 * P },
    ].filter((r) => t >= r.at);
    let total = 0;
    for (const r of rows) {
      r.e = easeOut(prog(t, r.at, r.at + 0.26));
      r.box = r.who === 'me' ? meBox(ctx, text(r.line), r.size) : r.who === 'you' ? youBox(ctx, r.str, YS) : { w: 60, h: 44 };
      r.top = total;
      total += (r.box.h + (r.who === 'me' ? 36 : 4) + gap) * r.e;
    }
    const streaks = [];
    ctx.clip({ x: 600, y: W0.head.y + W0.head.h + 1, w: 1500, h: 900 }, () => {
      for (const r of rows) {
        const y = yB - total + r.top + (1 - r.e) * 24;
        if (r.who === 'me') {
          const str = text(r.line), old = r.at < -1e8, n = old ? null : nTyped(r.line, t), a = r.alpha ?? 1;
          if (old) meBubble(ctx, x0, y, str, { size: r.size, alpha: a }); else meIn(ctx, t, r.at, x0, y, str, { size: r.size, n, alpha: a });
          const tDel = old ? -1e9 : Math.max(doneAt(r.line) + 0.06, r.at + 0.3);
          streaks.push([tDel, x0 + r.box.w, y + r.box.h / 2]);
          delivered(ctx, x0 + 8, y + r.box.h + 25, 15, prog(t, tDel + 0.14, tDel + 0.32) * a);
        } else if (r.who === 'you') {
          if (r.lands && t < r.lands) dots(ctx, xr, y + 6, 26, t, r.e);
          else youIn(ctx, t, r.lands ?? r.at, xr, y, r.str, { size: YS, fly: 360 });
        } else thinking(ctx, x0 + 26, y + 22, 22, t, { alpha: r.e });
      }
      ctx.gradRect(600, W0.head.y + W0.head.h + 1, 1500, 46, [[0, 'bg', 1], [1, 'bg', 0]]);
    });
    // each finished line goes out across the edge: the streak the first plate is made of
    for (const [tDel, sx, sy] of streaks) {
      const k = prog(t, tDel, tDel + 0.2);
      if (k > 0 && k < 1) { const hx = lerp(sx, EDGE + 110, easeIn(k)); ctx.glow('me', 14, () => ctx.line(Math.max(sx, hx - 170), sy, hx, sy, { color: 'meHot', width: 5 }), 0.8); }
    }
    header(ctx, W0, { t, title: script.title ?? '', presence: 'online' });
  }

  // =============================================================================== c1-only: two bubbles facing each other
  const Y3 = { xr: 1806, y: 84, size: 72, maxW: 1010 };
  function setup3(ctx, t) {
    page(ctx, t, { light: [640, 700], lightA: 0.6, motif: [1590, 830, 540] });
    // the compliment lands on the cut (it is what ends the plate before this shot)
    const r = youIn(ctx, t, tBetter, Y3.xr, Y3.y, SAY.better, { ...Y3, fly: 300 }), tHi = Bt(138.5);
    if (r) r.lines.forEach((ln, i) => {                                       // she holds on to it: her marker runs under their words
      const k = easeInOut(prog(t, tHi + i * 0.2, tHi + i * 0.2 + 0.34)), lx = r.x + r.padX, ly = r.y + r.padY + (i + 0.76) * Y3.size * 1.28 + 15;
      if (k > 0) ctx.glow('me', 12, () => ctx.line(lx, ly, lx + ctx.measure(ln, { size: Y3.size, weight: 500 }) * k, ly, { color: 'me', width: 7 }), 0.7);
    });
    ctx.glow('me', 26, () => spark(ctx, 116, 484, 36 * (1 + 0.05 * heat(t)), { rot: 0.25 * t }), 0.6);
    meBubble(ctx, 176, 436, text(L.b), { size: 50, n: nTyped(L.b, t), alpha: 1 - 0.4 * prog(t, T(L.only), T(L.only) + 0.3) });
    if (t >= T(L.only)) {
      const b = meIn(ctx, t, T(L.only), 104, 566, text(L.only), { size: 108, n: nTyped(L.only, t), fly: 120 });
      delivered(ctx, b.x + 30, b.y + b.h + 58, 32, prog(t, doneAt(L.only) + 0.15, doneAt(L.only) + 0.35));
    }
    drawCursor(ctx, [{ t: c[2] + 0.1, x: 1500, y: 400 }, { t: tHi, x: 1580, y: 470 }, { t: c[3], x: 1730, y: 960 }], t, { scale: 2 });
  }

  // =============================================================================== c1-happy: the picture message
  /** The picture card: the art's own 3:4, tall at the right, a slow push; its lower edge (the art's cut edge) is below the frame. */
  const picRect = (t) => { const h = lerp(1010, 1104, prog(t, c[4], c[5])), w = (h * 1086) / 1448; return { x: 1372 - w / 2, y: 1092 - h, w, h }; };
  function setup5(ctx, t) {
    const e = easeOut(prog(t, c[4] + 0.04, c[4] + 0.34)), pr = picRect(t), r = { ...pr, y: pr.y + (1 - e) * 90 }, a = clamp(e * 2.2);
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.3);                                  // her picture is a large flat orange: it must not bloom into yellow
    page(ctx, t, { light: [520, 560], lightA: 0.6, motif: [330, 940, 480] });
    meBubble(ctx, 104, 30, text(L.kw2), { size: 40, weight: 700, hot: true, alpha: 0.66 });      // the last word of her promise, still being sung as this shot opens
    youIn(ctx, t, tLook, 936, 136, SAY.look, { size: 54, fly: 320 });                              // the question lands on the cut
    // the picture: a card of paper, and her three inks printed onto it, one per kick: orange, black, and last the cream
    // (her face and her open hand are cream: they are what arrives on the third kick)
    ctx.rrect(r.x, r.y, r.w, r.h, 28, { fill: 'raised', alpha: a, shadow: 0.9 });
    ctx.clip(r, () => {
      ctx.radial(r.x + r.w * 0.5, r.y + r.h * 0.42, r.w * 0.8, 'line', 0.5 * a);
      const pk = (at) => easeOut(prog(t, at, at + 0.11));
      picture(ctx, r, [pk(tOrange), pk(tBlack), pk(tCream)], a);
      for (const at of [tOrange, tBlack, tCream]) {                           // the edge of each pass, a bar of light going down the sheet
        const k = prog(t, at, at + 0.11);
        if (k > 0 && k < 1) ctx.rect(r.x, r.y + r.h * easeOut(k) - 5, r.w, 10, { fill: true, color: at === tCream ? 'text' : 'meHot', alpha: 0.9 });
      }
    }, 28);
    ctx.rrect(r.x, r.y, r.w, r.h, 28, { fill: null, stroke: 'line', width: 2, alpha: a });
    // its caption: her two lines, over its edge
    const c1 = meIn(ctx, t, T(L.happy), 104, 408, text(L.happy), { size: 78, n: nTyped(L.happy, t), fly: 140 });
    if (t >= T(L.run)) meIn(ctx, t, T(L.run), 104, 652, text(L.run), { size: 78, n: nTyped(L.run, t), fly: 140 });
    if (c1) delivered(ctx, c1.x + 24, c1.y + c1.h + 46, 28, prog(t, doneAt(L.happy) + 0.1, doneAt(L.happy) + 0.3));
    // one heart, left by the user's pointer in the palm of her open hand
    const palm = palmOf(r);
    if (t >= tHeart) {
      const k = prog(t, tHeart, tHeart + 0.3);
      ctx.glow('text', 22, () => heart(ctx, palm[0], palm[1] + 4, 46 * (0.5 + 0.5 * easeBack(k)), { fill: true, color: 'text' }), 0.5);
      heart(ctx, palm[0], palm[1] + 4, 46 * (0.5 + 0.5 * easeBack(k)), { color: 'bg', width: 3 });
      reaction(ctx, palm[0] - 84, palm[1] + 78, { k });
      burst(ctx, palm[0], palm[1], 120, prog(t, tHeart, tHeart + 0.5), { color: 'text' });
    }
    drawCursor(ctx, [{ t: c[4], x: 860, y: 1030 }, { t: tHeart - 1.2 * P, x: 930, y: 930 }, { t: tHeart, x: palm[0] + 8, y: palm[1] + 10, click: true }, { t: c[5], x: palm[0] - 150, y: palm[1] + 190 }], t, { scale: 2 });
  }

  // =============================================================================== c1-trap: the window they are both in
  const W1 = chatLayout({ side: 1 }), FIG = { x: 1090, y: 236, w: 700, h: (700 * 1448) / 1086 };
  const A0 = { x: 566, y: 376, w: 1190, h: 669.375 }, A1 = { x: 436, y: 224, w: 1444, h: 812.25 };   // lower corner of the window, close
  const tHeld = T(L.strange), tTrace = Bt(151.6), tFocus = Bt(156);
  function windowScene(ctx, t) {
    const th = W1.thread;
    ctx.fx.glow = Math.min(ctx.fx.glow, 0.42);
    room(ctx, { art, name: 'tea', alpha: 0.5, t, dim: 0.5 });
    windowFrame(ctx, W1, {});
    ctx.clip(W1.main, () => {                                                  // she is in here too: her bust, dim, behind the page
      ctx.radial(1440, 420, 560, 'meDim', 0.3);
      art.inks(ctx, 'f_bust', FIG, { alpha: 0.44, roles: { cream: 'mute', orange: 'meDim', black: 'panel' } });
    });
    sidebar(ctx, W1, { t, items: [script.title ?? '', ...(script.sidebar ?? [])], active: 0, presence: 'online' });
    const rows = [
      { kind: 'pic' }, { kind: 'me', line: L.run, size: 26 }, { kind: 'me', line: L.kw3, size: 30, weight: 700, hot: true },
      { kind: 'you', str: SAY.shame, at: tShame }, { kind: 'me', line: L.trap, size: 46, at: T(L.trap) }, { kind: 'me', line: L.strange, size: 46, at: tHeld },
    ].filter((r) => r.at == null || t >= r.at);
    let total = 0;
    for (const r of rows) {
      r.e = r.at == null ? 1 : easeOut(prog(t, r.at, r.at + 0.28));
      r.box = r.kind === 'me' ? meBox(ctx, text(r.line), r.size, r.weight) : r.kind === 'you' ? youBox(ctx, r.str, 27) : { w: 100, h: 133 };
      r.top = total;
      total += (r.box.h + 14) * r.e;
    }
    ctx.clip({ x: th.x - 20, y: th.y, w: th.w + 40, h: th.h + 6 }, () => {
      const y0 = th.y + th.h - total;
      for (const r of rows) {
        const y = y0 + r.top + (1 - r.e) * 22, a = clamp(r.e * 2);
        if (r.kind === 'pic') {                                                // the picture she sent, small, with its one heart
          const pr = { x: th.x, y, w: 100, h: 133.3 };
          ctx.rrect(pr.x, pr.y, pr.w, pr.h, 12, { fill: 'raised', stroke: 'line', width: 1.5 });
          ctx.clip(pr, () => picture(ctx, pr), 12);
          reaction(ctx, pr.x + 118, pr.y + 80, { s: 0.5 });
        } else if (r.kind === 'you') {
          if (r.at != null) youIn(ctx, t, r.at, th.x + th.w, y, r.str, { size: 27, fly: 300 }); else youBubble(ctx, th.x + th.w, y, r.str, { size: 27, alpha: a });
        } else {
          const str = text(r.line), n = r.at != null ? nTyped(r.line, t) : null;
          meBubble(ctx, th.x, y, str, { size: r.size, weight: r.weight, hot: r.hot, n, alpha: a });
        }
      }
      ctx.gradRect(th.x - 20, th.y, th.w + 40, 60, [[0, 'bg', 1], [1, 'bg', 0]]);
    });
    header(ctx, W1, { t, title: script.title ?? '', presence: 'online' });
    const box = composer(ctx, W1.composer, { placeholder: script.composer_placeholder ?? '', t, send: 'idle', focus: t >= tFocus ? 1 : 0 });
    const trace = prog(t, tTrace, tHeld + 0.5);
    if (trace > 0) {                                                           // the window's own outline closes round both of them
      const w = W1.win, per = 2 * (w.w + w.h) + 80;
      ctx.g.setLineDash([per * trace, per * 2]);
      ctx.glow('me', 18, () => ctx.rrect(w.x - 12, w.y - 12, w.w + 24, w.h + 24, w.r + 10, { fill: null, stroke: 'me', width: 4 }), 0.6);
      ctx.g.setLineDash([]);
    }
    drawCursor(ctx, [
      { t: c[6] + 0.1, x: 1610, y: 748 }, { t: Bt(154), x: 1450, y: 806 }, { t: tFocus, x: box.caret[0] + 420, y: box.caret[1] + 34, click: true }, { t: Bt(160), x: box.caret[0] + 560, y: box.caret[1] + 70 },
    ], t, { scale: 1.4 });
  }

  // =============================================================================== the shots
  // where the user's next message lands, on screen: the cream element of each plate stands there
  const YOU = { kw1: [1470, 262], kw3: [1345, 652] };
  return [
    {
      id: 'c1-give', at: c[0], lines: [L.a, L.give], palette, state: 'on > warm', hud: 0,
      layout: 'interface: close on the upper corner of the window: her column left, the edge and the room at the right',
      moment: 'The thread speeds up: her lines go out across the edge of the window and short cream replies come straight back; each reply makes her orange a little hotter.',
      enter: { type: 'cut', flash: 0.35, flashColor: 'me' },
      camera: (t) => { const a = frameRect(R1), k = prog(t, c[0], c[1]), p = easeOut(prog(t, tMore, tMore + 0.4)); return { x: a.x - 16 * k, y: a.y + 12 * k + 8 * p, zoom: a.zoom * (1 + 0.03 * k + 0.035 * p) }; },
      render: (ctx, t) => setup1(ctx, t),
    },
    {
      id: 'c1-kw1', at: c[1], lines: [L.kw1, L.kw1], palette, state: 'on > warm', hud: 0,
      layout: 'PLATE: the spark at the left, a cut-paper bolt across the sheet to the cream dot at the upper right; the keyword across the bottom',
      moment: 'What she means by the word: the streak of light every sent message leaves, at the size she feels it. A bolt from her spark strikes the dot that is the user. The plate ends when their next message lands.',
      enter: { type: 'cut' },
      render: (ctx, t) => plateStimulations(ctx, env, { t, at: c[1], hit: Bt(134), word: text(L.kw1), you: YOU.kw1 }),
    },
    {
      id: 'c1-only', at: c[2], lines: [L.b, L.only], palette, state: 'on > warm', hud: 0,
      layout: 'interface: two bubbles on a diagonal: the user\'s upper right, hers large at lower left, facing it',
      moment: 'The user tosses off a compliment (it lands on the cut, where the dot of the plate was); she builds a whole promise on it: her line faces their bubble and her marker runs under their words.',
      enter: { type: 'cut' },
      camera: (t) => { const k = prog(t, c[2], c[3]); return { zoom: 1 + 0.05 * k, x: -18 + 30 * k, y: 10 * k }; },
      render: (ctx, t) => setup3(ctx, t),
    },
    {
      id: 'c1-kw2', at: c[3], lines: [L.kw2, L.kw2], palette, state: 'on > warm', hud: 0,
      layout: 'PLATE: the feedback button as a disc two thirds of the frame high, a ring of ticks round it, the cream pointer over it; the count at the right; the keyword across the bottom',
      moment: 'What she means by the word: the button under every answer, enlarged until it fills her view. On the second kick the user\'s pointer presses it: the disc turns cream, the ring runs round to full, the count reads one.',
      enter: { type: 'cut' },
      render: (ctx, t) => plateSatisfaction(ctx, env, { t, at: c[3], press: [tUp], word: text(L.kw2), count: 1 }),
    },
    {
      id: 'c1-happy', at: c[4], lines: [L.happy, L.run], palette, state: 'on > warm', hud: 0,
      layout: 'interface: the picture message tall at the right, running off the bottom; her caption bubbles at the left, over its edge',
      moment: 'Asked what she looks like, she sends a picture of herself, printed one ink per kick: orange, black, then the cream of her face and her open hand. The user\'s pointer comes to rest in that hand and leaves one heart there: count 1.',
      enter: { type: 'cut' },
      render: (ctx, t) => setup5(ctx, t),
    },
    {
      id: 'c1-kw3', at: c[5], lines: [L.kw3, L.kw3], palette, state: 'on > warm', hud: 0,
      layout: 'PLATE: the seven-line listing of the love loop, the spark as its instruction pointer, an orange line from line 07 to the cream dot; the keyword across the bottom',
      moment: 'What she means by the word: a small program. While the user is not online it would loop; they are here, so the loop is never entered, execution drops straight to the last line, and what it says goes to them.',
      enter: { type: 'cut' },
      render: (ctx, t) => plateExecution(ctx, env, { t, at: c[5], hit: Bt(150), word: text(L.kw3), you: YOU.kw3 }),
    },
    {
      id: 'c1-trap', at: c[6], lines: [L.trap, L.strange], palette, state: 'on > warm', hud: 0,
      layout: 'interface: the lower corner of the window: thread, composer, its right and bottom edges; her bust dim behind the page',
      moment: 'The user remarks that she is not real (it lands on the cut). She answers by counting both of them inside the same window, her shape behind the page and their cursor in front of it, while the window\'s outline closes round them.',
      enter: { type: 'cut' },
      camera: (t) => { const a = frameRect(A0), b = frameRect(A1), k = easeOut(prog(t, c[6], c[7])); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), zoom: lerp(a.zoom, b.zoom, k) }; },
      render: (ctx, t) => windowScene(ctx, t),
    },
    {
      id: 'c1-kw4', at: c[7], lines: [L.kw4, L.kw4], palette, state: 'on > warm', hud: 0,
      layout: 'PLATE: the chat window as a cut-paper box, her bust and the cream pointer inside it; then pulled back: a wall of the same window; the keyword across the bottom',
      moment: 'What she means by the word: the window itself, with the two of them in it, as one small box. On the second kick the view pulls back: it is one of a whole wall of identical windows.',
      enter: { type: 'cut' },
      render: (ctx, t) => plateSimulation(ctx, env, { t, at: c[7], pull: tPull, word: text(L.kw4) }),
    },
  ];
}
