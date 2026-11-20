// Section 7 — PRE-CHORUS 2 (bar 48, 1:29.0 → bar 56, 1:43.7). State: warm. New in v4.
// The settings again. In pre-chorus 1 the user played with the switches of the interface; now each control is as
// large as the frame and stands in her plate, and what it changes is her (plates_pre2.js):
//
//   pre2-settings  88.96  interface   the pointer (already on the Settings button) clicks; the drawer opens further
//                                     down its list; the view closes in on the first row
//   pre2-gender    90.80  PLATE       the control F | M as the whole sheet; when the second letter is SUNG the bust
//                                     is the boy's
//   pre2-day       92.65  PLATE       the On-call slider as an arc, its knob the sun; dragged over the top to dusk
//   pre2-role      96.34  PLATE       two letters and a switch; the light letter goes soft and slumps
//   pre2-loop     100.04  interface   Loop: on; Done (two hits a quarter second apart)
//   pre2-trance   100.50  PLATE       no drums: three single plates of three busts drift, step twice, register
//   pre2-loop-b   103.27  interface   the pointer clicks into the composer; the view closes in to the foot of the
//                                     thread: the first frame of chorus 2
//
// The drums of this stretch are not on every beat: ten single hits (cues.js drumD1 … drumD10), then none until the
// chorus. Every event inside a shot sits on one of those hits or on a sung letter, never on the beat pulse. In the two
// lines that name letters (57, 61) the SUNG LETTER is the event: the drum before it is the hand getting ready, the
// drum after it the aftershock (fix round). Cuts are on the grid; the hits D5, D9 fall on cuts.
import { chatLayout, composer, header, iconButton, room, sidebar, toggle, windowFrame } from '../components/chat.js';
import { cursorAt, pointer, sinceClick } from '../components/cursor.js';
import { burst, spark } from '../components/motif.js';
import { frameRect } from '../engine/layout.js';
import { easeInOut, easeOut, lerp, prog, pulse } from '../engine/util.js';
import { PRE2_POINTER } from './06_verse2.js';
import { meBubble, youBubble } from './bubbles.js';
import { cue } from './cues.js';
import { cues, sungChars, withInserts, wordIndex } from './kit.js';
import { dayGrip, plateDay, plateGender, plateRole, plateTrance } from './plates_pre2.js';
import { enter } from './shot.js';

const WIDE = 1.4;                                            // the drawer opens to 616 px, as in pre-chorus 1
const FALLBACK_ROWS = [
  { label: 'Gender', control: 'segmented', values: ['F', 'M'], line: 57 }, { label: 'On call', control: 'slider', values: ['AM', 'PM'], line: 59 },
  { label: 'Role', control: 'segmented', values: ['S', 'M'], line: 61 }, { label: 'Loop', control: 'toggle', values: ['off', 'on'], line: 63 },
];

export function pre2Shots(env) {
  const { art, script, lyrics } = env, { T, B, Bt, text } = cues(env);
  const beat = (id) => ((script.sections ?? []).find((s) => s.n === 7)?.beats ?? []).find((x) => x.id === id) ?? {};
  const ROWS = (script.settings_rows?.section7 ?? []).length >= 4 ? script.settings_rows.section7 : FALLBACK_ROWS;
  const UI = { settings: beat('drawer-again').ui?.[0] ?? 'Settings', done: beat('loop-on').ui?.[0] ?? 'Done', log: beat('loop-on').system?.[0] ?? 'loop: on' };
  const TITLE = script.title ?? '', HOLD = script.composer_placeholder ?? '';
  // cuts (grid) and the hits and letters inside the shots (cues.js)
  const START = B(48), cF = B(49), cDay = B(50), cRole = B(52), cLoop = B(54), cTrance = Bt(217), cBack = Bt(223), END = B(56);
  const D = (n) => cue(`drumD${n}`);
  /** A line whose named letters appear as they are sung: marks for band() / sungChars(). a, b = the two values of a settings row. */
  const marked = (i, [a, b], ta, tb) => ({ i, marks: { [wordIndex(text(i), a)]: ta, [wordIndex(text(i), b, true)]: tb } });
  const L57 = marked(57, ROWS[0].values, Math.max(cF, cue('letterF')), cue('letterM57')), L59 = marked(59, ROWS[1].values, cue('letterAM'), cue('letterPM')), L61 = marked(61, ROWS[2].values, cue('letterS'), cue('letterM61'));
  const last = text(63).split(' ').pop().replace(/[^\p{L}]/gu, ''), L63 = { i: 63, marks: { [wordIndex(text(63), last)]: cue('tranceWordA'), [wordIndex(text(63), last, true)]: cue('tranceWordB') } };

  // =============================================================================== the interface: the drawer
  const L0 = chatLayout({ side: 0 }), LO = chatLayout({ side: 0, drawer: WIDE }), DW = LO.drawer.w;
  const ROW_Y = [170, 292, 464, 586], ROW_H = [122, 172, 122, 122];
  const rowAt = (i, dx = LO.drawer.x) => ({ x: dx + 34, y: ROW_Y[i], w: DW - 68, h: ROW_H[i] });
  const A = {                                                                      // where the pointer has to be (drawer fully open)
    f: [rowAt(0).x + rowAt(0).w - 172, ROW_Y[0] + 61], loop: [rowAt(3).x + rowAt(3).w - 52, ROW_Y[3] + 61], done: [LO.drawer.x + DW - 34 - 75, 938],
  };
  const drawerK = (t) => easeOut(prog(t, START + 0.02, START + 0.4)) * (1 - easeInOut(prog(t, D(10) + 0.06, D(10) + 0.5)));
  /** The values the rows stand at, at time t: nothing chosen yet when the drawer opens; as the user left them after the plates. */
  const state = (t) => (t < cF ? { gender: -1, call: 0, role: -1, loop: 0 } : { gender: 1, call: 1, role: 1, loop: easeOut(prog(t, D(9), D(9) + 0.14)) });

  function cur(ctx, way, t, { scale = 1.5 } = {}) {
    const now = cursorAt(way, t), was = cursorAt(way, t - 0.03), sc = sinceClick(way, t);
    if (sc < 0.45) { const at = way.filter((w) => w.click && t >= w.t).pop(); burst(ctx, at.x, at.y, 34 * scale, sc / 0.45, { color: 'text' }); }
    ctx.trail(Math.hypot(now[0] - was[0], now[1] - was[1]) / 0.03 > 700 ? 6 : 0, 0.011, (tau) => { const p = cursorAt(way, t - tau); pointer(ctx, p[0], p[1], { scale, down: sc < 0.12 ? 1 : 0 }); }, 0.45);
  }
  /** One of her lines as the annotation under a row (serif, orange). q = a line index, or { i, marks } for a line that appears as it is sung. */
  function hint(ctx, q, t, x, y, size = 24) {
    const i = q.i ?? q;
    if (t < T(i)) return;
    const str = text(i), n = q.marks ? sungChars(str, t, T(i), q.marks) : lyrics.typed(i, t).n;
    ctx.text(str.slice(0, n), x, y, { size, font: 'serif', color: 'me' });
  }
  function seg(ctx, r, opts, sel) {
    const w = r.w / 2;
    ctx.rrect(r.x, r.y, r.w, r.h, r.h / 2, { fill: 'bg', stroke: 'line' });
    if (sel >= 0) ctx.rrect(r.x + sel * w + 5, r.y + 5, w - 10, r.h - 10, r.h / 2, { fill: 'me', shadow: 0.3 });
    opts.forEach((o, i) => ctx.text(o, r.x + (i + 0.5) * w, r.y + r.h / 2 + 9, { size: 26, weight: 700, align: 'center', color: sel === i ? 'bg' : 'sub' }));
  }
  /** The drawer, further down its list than in pre-chorus 1: the four rows of this section, and Done. hints: row -> line(s) under it. */
  function drawerPanel(ctx, L, t, hints) {
    const d = L.drawer, S = state(t);
    if (d.w < 4) return;
    ctx.clip(d, () => {
      const dx = d.x, x0 = dx + 34, x1 = dx + DW - 34, h = enter(t, START + 0.08, 0, { dur: 0.3, rise: 14 });
      ctx.text(UI.settings, x0, d.y + 66 + h.dy, { size: 32, weight: 600, color: 'text', alpha: h.a });
      iconButton(ctx, x1 - 19, d.y + 54, 'close', { r: 19, alpha: h.a });
      ctx.line(dx, d.y + 104, dx + DW, d.y + 104, { color: 'line', width: 1.5, alpha: h.a });
      ctx.rrect(dx + DW - 12, d.y + 420, 5, 300, 2.5, { fill: 'line', alpha: h.a });                 // the list has been scrolled: these are its last rows
      ROWS.slice(0, 4).forEach((row, i) => {
        const r = rowAt(i, dx), e = enter(t, START + 0.14, i, { step: 0.07, dur: 0.36 });
        if (e.a <= 0) return;
        ctx.at((1 - e.k) * 70, 0, () => {
          ctx.text(row.label, r.x, r.y + 52, { size: 30, weight: 500, color: 'text' });
          for (const q of hints[i] ?? []) if (t >= T(q.i ?? q) && t < T((q.i ?? q) + 1)) hint(ctx, q, t, r.x, r.y + 92);
          ctx.line(r.x, r.y + r.h, r.x + r.w, r.y + r.h, { color: 'line', alpha: 0.7, width: 1 });
          if (i === 0) seg(ctx, { x: r.x + r.w - 230, y: r.y + 31, w: 230, h: 60 }, row.values, S.gender);
          if (i === 2) seg(ctx, { x: r.x + r.w - 230, y: r.y + 31, w: 230, h: 60 }, row.values, S.role);
          if (i === 3) toggle(ctx, r.x + r.w - 104, r.y + 33, S.loop, { w: 104, h: 56 });
          if (i === 1) {                                                                             // On call: the knob is her spark
            const xa = r.x + 12, xb = r.x + r.w - 12, y = r.y + 128, kx = lerp(xa, xb, S.call);
            ctx.text(row.values[S.call > 0.5 ? 1 : 0], r.x + r.w, r.y + 52, { size: 24, weight: 600, color: 'sub', align: 'right' });
            ctx.rrect(xa, y - 3, xb - xa, 6, 3, { fill: 'line' }); ctx.rrect(xa, y - 3, kx - xa, 6, 3, { fill: 'me' });
            ctx.text(row.values[0], xa - 4, y + 36, { size: 20, color: 'mute' }); ctx.text(row.values[1], xb + 4, y + 36, { size: 20, color: 'mute', align: 'right' });
            ctx.circle(kx, y, 21, { fill: true, color: 'panel' });
            ctx.glow('me', 12, () => spark(ctx, kx, y, 18, { rot: kx / 40 }), 0.5);
          }
        }, { alpha: e.a });
      });
      const e = enter(t, START + 0.14, 4, { step: 0.07, dur: 0.36 }), press = pulse(t - D(10), 9);
      ctx.rrect(x1 - 150, 908, 150, 60, 30, { fill: press > 0.3 ? 'line' : 'raised', stroke: 'line', alpha: e.a });
      ctx.text(UI.done, x1 - 75, 947, { size: 24, weight: 600, align: 'center', color: 'text', alpha: e.a });
    });
  }
  /** The client with the drawer open by k: the thread as verse 2 left it (the fourth request and her answer to it). */
  function client(ctx, t, k, hints) {
    const L = chatLayout({ side: 0, drawer: WIDE * k }), th = L.thread;
    room(ctx, { art, name: 'tea', alpha: 0.5, dim: 0.5, t });
    windowFrame(ctx, L, { glass: 0.94 });
    header(ctx, L, { t, title: TITLE, presence: 'online' });
    const gx = L.head.x + L.head.w - 176, gy = L.head.y + 33, on = k > 0.5;                           // the Settings button (as pre-chorus 1 draws it)
    if (on) ctx.circle(gx, gy, 19, { fill: true, color: 'raised' });
    ctx.circle(gx, gy, 19, { color: on ? 'sub' : 'line', width: 1.5 });
    for (const [dy, kx] of [[-6, 5], [6, -5]]) { ctx.line(gx - 10, gy + dy, gx + 10, gy + dy, { color: on ? 'text' : 'sub', width: 2 }); ctx.circle(gx + kx, gy + dy, 3.5, { fill: true, color: on ? 'text' : 'sub' }); }
    ctx.clip({ x: L.main.x, y: L.head.y + L.head.h + 2, w: L.main.w, h: L.composer.y - L.head.y - L.head.h - 12 }, () => {
      youBubble(ctx, th.x + th.w, 250, (script.cards_section6 ?? [])[3]?.request ?? '', { size: 30 });
      [53, 54, 55].forEach((i, n) => meBubble(ctx, th.x, 350 + n * 92, text(i), { size: 34, weight: i === 55 ? 700 : 400, hot: i === 55, alpha: 0.75 }));
    });
    composer(ctx, L.composer, { placeholder: HOLD, t, send: 'idle' });
    drawerPanel(ctx, L, t, hints);
    return L;
  }

  // =============================================================================== the last stretch: Loop, Done; the composer
  const LOOP_CAM = frameRect({ x: 980, y: 430, w: 1040, h: 585 }), NEXT_CAM = frameRect({ x: 596, y: 430, w: 1040, h: 585 });   // (NEXT_CAM: the framing chorus 2 opens on)
  const LS = chatLayout(), TH = LS.thread, SIDE = [TITLE, ...(script.sidebar ?? [])];
  /** One row of hers as chorus 2 draws them (08_chorus2.js meRow): its spark and a serif line, y = baseline. */
  function meRow(ctx, x, y, str, n, alpha = 1) {
    const size = 34, r = size * 0.45, o = { size, font: 'serif' }, tx = x + size * 1.6;
    spark(ctx, x + r, y - size * 0.3, r, { alpha });
    ctx.text(str.slice(0, n), tx, y, { ...o, color: 'me', alpha });
    if (n < str.length) ctx.circle(tx + ctx.measure(str.slice(0, n), o) + size * 0.3, y - size * 0.28, size * 0.16, { fill: true, color: 'me', alpha });
  }
  const loop = {
    id: 'pre2-loop', at: cLoop, lines: [62, 62], palette: 'warm', hud: 0, enter: { type: 'cut' },
    layout: 'interface: close on the foot of the drawer: Role, Loop, Done; after the plate: the whole client, closing in on the foot of the thread',
    moment: 'Back in the drawer for two hits a quarter of a second apart: the user switches Loop on and clicks Done. When the trance is over, the drawer is shut; they click into the composer, and the view closes in on the foot of the thread, where she is still saying it.',
    camera: (t) => {
      if (t < cBack) return LOOP_CAM;
      const k = easeInOut(prog(t, cBack, END));
      return { x: NEXT_CAM.x * k, y: NEXT_CAM.y * k, zoom: lerp(1, NEXT_CAM.zoom, k) };
    },
    render(ctx, t) {
      if (t < cBack) {
        client(ctx, t, drawerK(t), { 3: [62] });
        cur(ctx, [{ t: cLoop, x: A.loop[0] - 22, y: A.loop[1] + 6, click: true }, { t: D(10), x: A.done[0], y: A.done[1] + 6, click: true }, { t: cTrance, x: A.done[0] - 60, y: A.done[1] + 40 }], t, { scale: 1 });
        return;
      }
      // the drawer is shut, the settings are as they were left; the thread, as chorus 2 will show its foot
      room(ctx, { art, name: 'rain', alpha: 0.5, dim: 0.42, t });
      windowFrame(ctx, LS, { glass: 0.84 });
      sidebar(ctx, LS, { t, items: SIDE, active: 0, presence: 'online' });
      header(ctx, LS, { t, title: TITLE, presence: 'online' });
      [61, 62].forEach((i, n) => meRow(ctx, TH.x, 340 + n * 78, text(i), 99, 0.3));
      meRow(ctx, TH.x, 506, text(63), sungChars(text(63), t, T(63), L63.marks), lerp(1, 0.3, prog(t, T(64), END)));
      if (t >= T(64)) meRow(ctx, TH.x, 584, text(64), lyrics.typed(64, t).n);
      const box = composer(ctx, LS.composer, { placeholder: HOLD, t: 0, focus: 1, send: 'idle' });
      // the pointer: an arrow that clicks into the composer on the cut and is a text pointer from then on
      const px = LS.composer.x + 318, py = LS.composer.y + 44;
      burst(ctx, px, py, 50, (t - cBack) / 0.45, { color: 'text' });
      ctx.line(box.caret[0] - 16, box.caret[1] + 22, box.caret[0], box.caret[1] + 22, { color: 'text', alpha: 0.8 * (1 - prog(t, cBack, cBack + 0.25)), width: 3 });
      pointer(ctx, px, py, { kind: 'text', scale: 1.2 });
    },
  };

  // =============================================================================== the shots
  const push = (t) => easeInOut(prog(t, START + 0.12, Bt(195.1)));               // pre2-settings: the view closing in on the first row
  return [
    {
      id: 'pre2-settings', at: START, lines: [56, 57], palette: 'warm', hud: 0, enter: { type: 'cut' },
      layout: 'interface: the whole client; the drawer opening at the right; the view closing in on its first row',
      moment: 'The pointer is already on the Settings button and clicks. The drawer opens further down its list than last time: Gender, On call, Role, Loop. The view closes in on the first row as she reads it out.',
      camera: (t) => { const k = push(t), r = rowAt(0); return { x: (r.x + r.w / 2 - 960) * k, y: (r.y + r.h / 2 + 30 - 540) * k, zoom: lerp(1, 2.36, k) }; },
      render(ctx, t) {
        client(ctx, t, drawerK(t), { 0: [56, L57] });
        // (the pointer keeps its size on screen while the view closes in: it arrives from the plate before at 1.5)
        cur(ctx, [{ t: START, x: PRE2_POINTER[0], y: PRE2_POINTER[1], click: true }, { t: Bt(193.6), x: A.f[0] - 150, y: A.f[1] + 70 }, { t: cF - 0.02, x: A.f[0], y: A.f[1] + 6, click: true }], t, { scale: 1.5 / lerp(1, 1.5, push(t)) });
      },
    },
    {
      id: 'pre2-gender', at: cF, lines: [57, 58], palette: 'warm', hud: 0, enter: { type: 'cut' },
      layout: 'PLATE: the segmented control as the whole sheet, a cell each for its two letters; her bust whole in the middle; the two letters huge in her serif either side of her',
      moment: 'The click on the first letter, as it is sung, and the control is as large as the sheet: she stands in it. On the drum the pointer comes down on the other cell and holds it. When the second letter is sung it lets go: the bust is the boy\'s, in register with hers (the long hair is gone), and the letter is printed. The drum after it is a shudder of the sheet. The pointer touches the control, never her.',
      render: (ctx, t) => plateGender(ctx, env, { t, at: cF, press: D(1), click: cue('letterM57'), thud: D(2), sung: cue('letterF'), values: ROWS[0].values, lines: [L57, 58], to: dayGrip(art), until: cDay }),
    },
    {
      id: 'pre2-day', at: cDay, lines: [58, 60], palette: 'warm', hud: 0, enter: { type: 'cut' },
      layout: 'PLATE: the On-call slider as an arc from one end of the horizon to the other, her spark on it as the sun; a small bust under its top; the two ends huge in her serif',
      moment: 'On call. The slider is an arc across the sheet and its knob is her spark: the sun. The pointer takes it on the cut and pulls, slowly at first: up over the top, where it stands behind his head (the brightest frame of the section), and down into the other end: dusk, and of him only a dark shape is left.',
      render: (ctx, t) => plateDay(ctx, env, { t, at: cDay, grab: cDay, drag: Bt(203), top: D(3), end: D(4), am: cue('letterAM'), pm: cue('letterPM'), values: ROWS[1].values, lines: [58, L59, 60], to: [1700, 700], until: cRole }),
    },
    {
      id: 'pre2-role', at: cRole, lines: [60, 62], palette: 'warm', hud: 0, enter: { type: 'cut' },
      layout: 'PLATE: no figure. A tall heavy letter on a platform at the left, a light one on the ground in the middle, an upright switch at the right',
      moment: 'Role: two letters and a switch, nothing else. The pointer takes the knob; on the next hit it starts to push, and the knob is at the top as the first letter is sung: the heavy letter is printed, the sheet jolts and is a step lighter. Then the knob is pulled down and is at the bottom as the second letter is sung: the light letter is printed, goes soft at once, and on the hit after it lies on the ground, which gives under it and comes back once.',
      render: (ctx, t) => plateRole(ctx, env, { t, at: cRole, grab: D(6), push: D(7), s: cue('letterS'), m: cue('letterM61'), land: D(8), values: ROWS[2].values, lines: [60, L61, 62], from: [1700, 700], to: [1373, 400], until: cLoop }),
    },
    ...withInserts(loop, END, [{
      at: cTrance, until: cBack, lines: [63, 63],
      shot: {
        id: 'pre2-trance', lines: [62, 63], palette: 'warm', hud: 0, enter: { type: 'cut' },
        layout: 'PLATE: one plate of each of three busts over one another in the middle of the sheet, out of register and turning; at the end one bust, in register',
        moment: 'The drums have stopped. Loop is on: her three looks, one plate of each (the cream of hers, the orange of the boy\'s, the black of the man\'s, a faint ghost), drift apart and turn about one another, a step further each time the word comes round; then they fall into register, and it is the boy: what the settings were left at.',
        render: (ctx, t) => plateTrance(ctx, env, { t, at: cTrance, steps: [cue('tranceA'), cue('tranceB')], settle: [cBack - 0.3, cBack - 0.1], lines: [62, L63], log: UI.log }),
      },
    }]),
  ];
}
