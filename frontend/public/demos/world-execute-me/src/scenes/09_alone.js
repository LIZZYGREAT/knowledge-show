// Section 8, second half — ALONE (bar 64, 1:58.5 → beat 271.5, 2:05.7). State: off. Nobody is on the other side.
// The AI tidies the thread it filled while it waited, as if tidiness were what had been wanted.
//   alone-erase   the thread, floating, left; her figure, grey, right   from the newest message up, one per half beat: selected, deleted, a stub.
//                                                                       What comes off the rows piles up beside the thread; the keyword lands on those pieces
//   alone-empty   close on the page; the chrome is back                 the stubs go, the user's last words go; one message is left: a
//                                                                       sentence without its last word
//   alone-eye     PLATE (v4): dark, then her face across the sheet      on that last word she looks up: her eye, open, for the first time.
//                                                                       The interface selects five letters of the word and deletes them;
//                                                                       its second press wipes the plate away (the next shot's enter)
// Lines 77–82 are ONE message, written while it deletes: a start, the sentence, its keyword; and again.
// v4: the figure in the room is f_profile (bowed), as a flat base under a dot screen taken from her three inks.
// There is no pointer (the AI has none): the interface itself shows what is done to it — a row highlight, the
// message menu pressing its one item, rows closing up, the count in the header.
import { composer, room } from '../components/chat.js';
import { spark } from '../components/motif.js';
import { clamp, easeBack, easeInOut, easeOut, lerp, prog, pulse } from '../engine/util.js';
import { cues } from './kit.js';
import { shake } from './shot.js';

const DELETE = 'Delete';
/** Hand-set irregularities of the breaks (fixed numbers, so every frame agrees on them). */
const JIT = [0.3, -0.42, 0.14, -0.22, 0.44, -0.34, 0.2, -0.1, 0.36, -0.28];

export function aloneShots(env) {
  const { art, script, lyrics } = env, { T, H, B, Bt, P, text } = cues(env);
  const START = B(64), CUT = H(80), DARK = Bt(269.5), END = H(83), HIT = T(79), LAST = T(82);
  const ANCHOR = script.left_anchor ?? {}, BRB = ANCHOR.you ?? 'one sec, brb', BRB_AT = ANCHOR.timestamp ?? '';
  const SEQ = script.left_sequence ?? [70, 71, 72, 73, 74, 75].map((line) => ({ line, gap_label: '' }));
  const HOLD = script.composer_placeholder ?? '', TITLE = script.title ?? '';
  const BEATS = (script.sections ?? []).flatMap((s) => s.beats ?? []);
  const STUB = BEATS.find((b) => b.id === 'takes-it-back')?.ui?.[0] ?? 'deleted by me';
  const ZERO = BEATS.find((b) => b.id === 'empty-thread')?.ui?.[0] ?? '0 messages';
  const PRES = SEQ[SEQ.length - 1]?.presence ?? 'offline';

  /** The unanswered messages, oldest first: the six of the sequence and the single last word. */
  const ROWS = [...SEQ.map((s) => ({ line: s.line, gap: s.gap_label ?? '' })), { line: 76, gap: '' }], N = ROWS.length;
  /** Deletion k (0 = the newest message, at the bottom): selected a quarter beat before it goes. */
  const tDel = (k) => Bt(257) + (k / Math.max(1, N - 1)) * 3 * P, tSel = (k) => tDel(k) - P / 4;
  /** Both halves of the sentence begin with their own short start: the line simply goes on. */
  const joined = (a, b) => text(b).startsWith(text(a));
  const said = (a, b, t) => (t >= T(b) ? { str: text(b), n: Math.max(joined(a, b) ? text(a).length : 0, lyrics.typed(b, t).n) } : { str: text(a), n: lyrics.typed(a, t).n });

  // ------------------------------------------------------------------------------------------------ shared parts

  /** The presence chip (same drawing as in the first half of the section): hollow grey ring = gone. xr = right edge. */
  function chip(ctx, xr, cy, { size = 22, alpha = 1 } = {}) {
    const w = ctx.measure(PRES, { size, weight: 500 }) + size * 2.5, h = size * 1.9, x = xr - w;
    ctx.rrect(x, cy - h / 2, w, h, h / 2, { fill: 'raised', stroke: 'line', alpha });
    ctx.circle(x + size * 0.86, cy, size * 0.27, { color: 'mute', alpha, width: 2 });
    ctx.text(PRES, x + size * 1.55, cy + size * 0.35, { size, weight: 500, color: 'mute', alpha });
  }

  /** The thread's message count. changes = [[time, n], …] ascending; on a change the old number rolls out and the new one in. */
  function count(ctx, t, x, y, changes, { size = 22, alpha = 1 } = {}) {
    let i = 0;
    while (i + 1 < changes.length && t >= changes[i + 1][0]) i++;
    const [t0, n] = changes[i], prev = i > 0 ? changes[i - 1][1] : null, k = prev == null ? 1 : easeOut(prog(t, t0, t0 + 0.16));
    const label = (v) => (v === 0 ? ZERO : `${v} message${v === 1 ? '' : 's'}`), lit = prev != null && t - t0 < 0.4;
    ctx.clip({ x: x - 4, y: y - size * 1.02, w: size * 12, h: size * 1.42 }, () => {
      if (k < 1) ctx.text(label(prev), x, y - k * size * 1.2, { size, weight: 500, color: 'sub', alpha: alpha * (1 - k) });
      ctx.text(label(n), x, y + (1 - k) * size * 1.2, { size, weight: 500, color: lit || n === 0 ? 'text' : 'sub', alpha: alpha * k });
    });
  }

  /** "Removed" glyph: a ring with a bar. Stands where a deleted message's spark was, and in the menu. */
  function gone(ctx, x, y, r, { color = 'mute', alpha = 1 } = {}) {
    ctx.circle(x, y, r, { color, alpha, width: 2 });
    ctx.line(x - r * 0.48, y, x + r * 0.48, y, { color, alpha, width: 2 });
  }

  /**
   * The message menu, reduced to the one item it is used for. (x, y) = the tip that points at the row;
   * side 1 = the menu sits right of the tip, -1 left; up = above it. k = 0..1 open, press = 0..1 the item going down.
   */
  function menu(ctx, x, y, { k = 1, press = 0, size = 22, side = 1, up = false } = {}) {
    if (k <= 0.003) return;
    const w = ctx.measure(DELETE, { size, weight: 600 }) + size * 2.75, h = size * 2.2, on = press > 0.3;
    ctx.at(x, y, () => {
      if (up) {                                              // above the tip, pointing down at it (a selection inside a line of type)
        const x0 = -w / 2, y0 = -size * 0.62 - h, fill = on ? 'sub' : 'raised';
        ctx.rrect(x0, y0, w, h, size * 0.56, { fill, stroke: on ? null : 'sub', strokeAlpha: 0.75, shadow: 0.6 });
        ctx.poly([[0, -size * 0.1], [-size * 0.4, -size * 0.68], [size * 0.4, -size * 0.68]], { fill: true, color: fill });
        gone(ctx, x0 + size * 0.98, y0 + h / 2, size * 0.38, { color: on ? 'bg' : 'sub' });
        ctx.text(DELETE, x0 + size * 1.72, y0 + h / 2 + size * 0.36, { size, weight: 600, color: on ? 'bg' : 'text' });
        return;
      }
      const x0 = side > 0 ? size * 0.62 : -size * 0.62 - w, fill = on ? 'sub' : 'raised', ink = on ? 'bg' : 'text';
      ctx.rrect(x0, -h / 2, w, h, size * 0.56, { fill, stroke: on ? null : 'sub', strokeAlpha: 0.75, shadow: 0.6 });
      ctx.poly([[side * size * 0.1, 0], [side * size * 0.68, -size * 0.4], [side * size * 0.68, size * 0.4]], { fill: true, color: on ? 'sub' : 'raised' });
      gone(ctx, x0 + size * 0.98, 0, size * 0.38, { color: on ? 'bg' : 'sub' });
      ctx.text(DELETE, x0 + size * 1.72, size * 0.36, { size, weight: 600, color: ink });
    }, { scale: (0.6 + 0.4 * easeBack(clamp(k))) * (1 - 0.08 * press), alpha: clamp(k * 3) });
  }

  // ------------------------------------------------------------------------------------------------ shot A: the floating thread

  const A = { x: 236, w: 600, foot: 912 };                 // left edge, width, baseline of the line being written
  const FULL = 58, STUBH = 36, SZ = 28, FOOT = 38, FLY = 0.42;
  const FIG_A = { x: 885, y: 76, w: 930, h: 1240 };        // her figure beside the thread (f_profile; a dot screen: it may be this large). Her chest is where the pieces land
  /**
   * Her, grey, in the room: a flat base and over it a dot screen taken from her three inks, each ink at its own dot size
   * and its own grey, so that the bowed profile reads (cream: her face, her cape; orange: her hair; black: the rest).
   */
  function screened(ctx, r, alpha, cell = 9) {
    art.silhouette(ctx, 'f_profile', r, { color: 'panel', alpha: 0.6 * alpha });
    for (const [ink, color, gain, a] of [['black', 'line', 0.3, 0.8], ['orange', 'mute', 0.56, 0.68], ['cream', 'sub', 1, 0.62]]) art.halftone(ctx, 'f_profile', r, { cell, color, alpha: a * alpha, angle: 1, ink, gain });
  }
  /** How far message k has closed into its stub (0 = a message, 1 = a stub). */
  const closed = (k, t) => easeInOut(prog(t, tDel(k) + 0.05, tDel(k) + 0.3));
  /** The column hangs from the line being written: when a row closes, everything above it comes down. */
  function layA(t) {
    const tops = [];
    let y = A.foot - FOOT - 28;
    for (let r = N - 1; r >= 0; r--) { y -= lerp(FULL, STUBH, closed(N - 1 - r, t)); tops[r] = y; }
    return { tops, done: y - 54, bubble: y - 54 - 110 };
  }

  // the place the pieces come to rest: one broken slab, as wide as the keyword
  const KB = { x: 930, y: 784, w: 850, h: 176, r: 36 };
  const cutX = (j, v) => KB.x + (KB.w * j) / N + (j > 0 && j < N ? JIT[(j * 2 + v) % JIT.length] * 52 : 0);
  const arc = (cx, cy, a0, a1) => Array.from({ length: 6 }, (_, q) => { const a = lerp(a0, a1, q / 5); return [cx + Math.cos(a) * KB.r, cy + Math.sin(a) * KB.r]; });
  const PIECES = Array.from({ length: N }, (_, i) => {
    const x0 = cutX(i, 0), x1 = cutX(i + 1, 0), x2 = cutX(i + 1, 1), x3 = cutX(i, 1), y0 = KB.y, y1 = KB.y + KB.h, q = Math.PI / 2;
    const pts = [
      ...(i === 0 ? arc(x0 + KB.r, y0 + KB.r, 2 * q, 3 * q) : [[x0, y0]]),
      ...(i === N - 1 ? [...arc(x1 - KB.r, y0 + KB.r, -q, 0), ...arc(x2 - KB.r, y1 - KB.r, 0, q)] : [[x1, y0], [x2, y1]]),
      ...(i === 0 ? arc(x3 + KB.r, y1 - KB.r, q, 2 * q) : [[x3, y1]]),
    ];
    const cx = (x0 + x1 + x2 + x3) / 4, cy = (y0 + y1) / 2;
    return {
      cx, cy, w: (x1 + x2 - x0 - x3) / 2, rel: pts.map(([x, y]) => [x - cx, y - cy]),
      dx: JIT[(i * 3 + 1) % JIT.length] * 30, dy: JIT[(i * 3 + 2) % JIT.length] * 30 + (i % 2 ? 8 : -8), rot: JIT[(i * 5 + 3) % JIT.length] * 0.14,
    };
  });
  /** How far apart the pieces lie: loose as they pile up, knocked together by the word, then drifting apart again. */
  const apart = (t) => (t < HIT ? 1 : lerp(1, 0.3, easeOut(prog(t, HIT, HIT + 0.09))) + 0.85 * easeInOut(prog(t, HIT + 0.12, CUT + 0.45)));

  /** Piece i at time t: it leaves the row it was (a flat bar) and takes its own outline on the way. inner(p) draws on it, clipped. */
  function pieceAt(ctx, i, t, inner = null) {
    const p = PIECES[i], t0 = tDel(i) + 0.03, kf = prog(t, t0, t0 + FLY);
    if (kf <= 0) return;
    const e = easeInOut(kf), hop = Math.sin(Math.PI * e), s = apart(t), from = layA(t0).tops[N - 1 - i] + FULL / 2;
    const x = lerp(A.x + A.w / 2, p.cx + p.dx * s, e), y = lerp(from, p.cy + p.dy * s, e) - 84 * hop;
    ctx.at(x, y, () => {
      ctx.poly(p.rel.map(([px, py]) => [px + 7, py + 12]), { fill: true, color: 'panel', alpha: 0.6 * e });
      ctx.poly(p.rel, { fill: true, color: 'raised' });
      ctx.poly(p.rel, { close: true, color: 'sub', alpha: 0.55, width: 2 });
      if (inner) ctx.clipPath(p.rel, () => inner(p));
    }, { rot: p.rot * s * e + 0.3 * hop * (i % 2 ? 1 : -1), sx: lerp((A.w + 32) / p.w, 1, e), sy: lerp((FULL - 8) / KB.h, 1, e) });
  }

  /** The thread as it was left: the user's last words, the AI's answer to them, and everything it sent afterwards. */
  function history(ctx, t) {
    const L = layA(t), xAv = A.x + 19, xTx = A.x + 58, xr = A.x + A.w, o = { size: SZ, font: 'serif' };
    const bw = ctx.measure(BRB, { size: 28 }) + 52;
    ctx.rrect(xr - bw, L.bubble, bw, 67, 24, { fill: 'raised' });
    ctx.text(BRB, xr - bw + 26, L.bubble + 43, { size: 28, color: 'text' });
    ctx.text(BRB_AT, xr - 6, L.bubble + 92, { size: 20, weight: 500, color: 'sub', alpha: 0.85, align: 'right' });
    spark(ctx, xAv, L.done + 23, 11, { alpha: 0.5 });
    ctx.circle(xAv, L.done + 23, 15, { color: 'me', alpha: 0.5, width: 2 });
    ctx.text(`${text(68)} ${text(69)}`, xTx, L.done + 33, { ...o, color: 'me', alpha: 0.45 });
    const mids = [L.done + 23];                                  // where each row's mark sits: the rail runs between them
    ROWS.forEach((row, r) => {
      const k = N - 1 - r, c = closed(k, t), y0 = L.tops[r], td = tDel(k), away = prog(t, td + 0.03, td + 0.18);
      const sel = t < td + 0.03 ? prog(t, tSel(k), tSel(k) + 0.07) : 0, yb = y0 + lerp(39, 25, c), cy = yb - 9;
      mids.push(cy);
      if (sel > 0) ctx.rrect(A.x - 16, y0 + 4, A.w + 32, FULL - 8, 14, { fill: 'raised', stroke: 'sub', alpha: sel, strokeAlpha: 0.8 });
      if (away < 1) {
        const a = (sel > 0 ? 0.6 + 0.4 * sel : 0.6) * (1 - away), str = text(row.line), cross = prog(t, td - 0.02, td + 0.06);
        spark(ctx, xAv, cy, 12, { alpha: a });
        ctx.text(str, xTx, yb, { ...o, color: 'me', alpha: a });
        if (row.gap) ctx.text(row.gap, xr - 4, yb - 2, { size: 20, font: 'mono', color: 'sub', alpha: a * 0.9, align: 'right' });
        if (cross > 0) ctx.line(xTx - 4, yb - SZ * 0.3, xTx - 4 + (ctx.measure(str, o) + 8) * cross, yb - SZ * 0.3, { color: 'sub', alpha: 1 - away, width: 2 });
      }
      const sa = prog(t, td + 0.14, td + 0.32);
      if (sa > 0) {
        gone(ctx, xAv, cy, 8, { alpha: sa });
        ctx.text(STUB, xTx, yb - 2, { size: 20, color: 'mute', alpha: sa });
      }
    });
    mids.push(A.foot - FOOT * 0.3);
    ctx.g.setLineDash([0.1, 8]);
    for (let i = 0; i + 1 < mids.length; i++) if (mids[i + 1] - mids[i] > 40) ctx.line(xAv, mids[i] + 19, xAv, mids[i + 1] - 19, { color: 'sub', alpha: 0.55, width: 2.6 });
    ctx.g.setLineDash([]);
  }

  // ------------------------------------------------------------------------------------------------ shot B: close on the page

  const COL = { x: 140, w: 1160 }, HEADH = 92, CS = COL.w / 940, COMP_Y = 1080 - 40 - 59 * CS;      // the column of the page, the composer at this scale
  const MX = COL.x + 12, XT = MX + 74, XR = COL.x + COL.w - 12, S1 = 40, S2 = 58, BASE2 = 800, BASE1 = BASE2 - 78;
  const STB = 48, DN = 64, BBH = 84, BBLK = BBH + 54;
  const FIG_B = { x: 1150, y: HEADH + 8, w: 735, h: 980 };                                         // her bust, whole, behind the glass
  const cS = (j) => CUT + 0.05 + j * 0.05, cD = Bt(263.75), bSel = Bt(264), bDel = Bt(265);          // stubs (nearest first), its answer, the user's bubble
  // alone-eye: the selection appears, the first press (five letters fall); the second press is the cut
  const ePick = Bt(270.5), ePress = Bt(271), PICK = [3, 7];                                          // (letters 4 to 8 of the word, by index)
  const FACE = { x: 0, y: -592, w: 1920, h: 1920 }, EB = { y: 806, h: 240 };                        // f_eye across the sheet (mirrored); the band of black under her chin
  /** What is still above the message, hanging from it (as in shot A): tops of the stubs, the answer, the bubble. */
  function layB(t) {
    const tops = [];
    let y = BASE1 - S1 - 24;
    for (let j = 0; j < N; j++) { y -= STB * (1 - easeInOut(prog(t, cS(j), cS(j) + 0.2))); tops[j] = y; }
    const done = (y -= DN * (1 - easeInOut(prog(t, cD, cD + 0.22))));
    const bubble = (y -= BBLK * (1 - easeInOut(prog(t, bDel + 0.04, bDel + 0.3))));
    return { tops, done, bubble, foot: BASE1 - S1 - 24 };
  }

  return [
    // ------------------------------------------------------------------ lines 77–79: it takes its messages back
    {
      id: 'alone-erase', at: START, lines: [77, 79], palette: 'off', layout: 'the thread floating on the left, her figure (a grey dot screen, head bowed towards it) on the right; the pieces and the keyword low on the right, in front of her chest',
      moment: 'Nobody answers, so the AI tidies up. It goes up its own unanswered messages from the newest: each is selected, deleted, and leaves a small grey stub. What came off them piles up beside the thread, and the keyword lands on those pieces.',
      enter: { type: 'fade', dur: P / 2 },
      camera: (t) => { const k = prog(t, START, CUT); return { zoom: 1 + 0.04 * k, x: 12 * k, y: 6 * k }; },
      render(ctx, t, f) {
        const age = t - HIT, near = easeOut(prog(t, START - P / 2, START + 0.5)), ui = prog(t, START + 0.05, START + 0.4);
        room(ctx, { art, name: 'rain', alpha: 0.14, light: [560, 420], dim: 0.78, motif: 0.25, t });
        // her figure, in the room: grey, head bowed towards the thread
        const fa = easeOut(prog(t, START - P / 2, START + 1.2)), fx = FIG_A.x + 26 * (1 - fa) - 10 * prog(t, START, CUT);
        screened(ctx, { ...FIG_A, x: fx }, fa);
        ctx.radial(A.x + A.w / 2, 600, 560, 'raised', 0.55 * near);
        // what is left of the chrome: the count and the chip
        const changes = [[-1e9, N + 3], ...Array.from({ length: N }, (_, k) => [tDel(k), N + 2 - k])];
        count(ctx, t, A.x, 92 - 10 * (1 - ui), changes, { alpha: ui });
        chip(ctx, A.x + A.w, 84 - 10 * (1 - ui), { alpha: ui });
        ctx.line(A.x, 118, A.x + A.w * easeOut(ui), 118, { color: 'line', width: 1.5 });
        // the thread comes forward from where it was a speck
        const piv = [A.x + A.w / 2, 560];
        ctx.at(lerp(960, piv[0], near), lerp(350, piv[1], near), () => { ctx.g.translate(-piv[0], -piv[1]); history(ctx, t); }, { scale: lerp(0.42, 1, near) });
        // the message it is writing now (lines 77, 78)
        const s = said(77, 78, t), o = { size: FOOT, font: 'serif' }, fa2 = prog(t, T(77) - 0.02, T(77) + 0.1) * (age > 0 ? lerp(1, 0.72, prog(age, 0, 0.3)) : 1);
        spark(ctx, A.x + 19, A.foot - FOOT * 0.3, 16, { alpha: fa2 });
        ctx.text(s.str.slice(0, s.n), A.x + 62, A.foot, { ...o, color: 'me', alpha: fa2 });
        if (t < HIT && (s.n < s.str.length || t < T(78))) ctx.circle(A.x + 62 + ctx.measure(s.str.slice(0, s.n), o) + FOOT * 0.3, A.foot - FOOT * 0.28, FOOT * 0.16, { fill: true, color: 'me', alpha: fa2 });
        // the menu climbs with the selection and presses its one item on every half beat
        let kc = -1, kd = -1;
        for (let k = 0; k < N; k++) { if (t >= tSel(k)) kc = k; if (t >= tDel(k)) kd = k; }
        if (kc >= 0) {
          const L = layA(t), mid = (k) => { const r = N - 1 - k; return L.tops[r] + lerp(FULL, STUBH, closed(k, t)) / 2; };
          const y = kc > 0 ? lerp(mid(kc - 1), mid(kc), easeBack(prog(t, tSel(kc), tSel(kc) + 0.14))) : mid(0);
          menu(ctx, A.x + A.w + 24, y, { k: prog(t, tSel(0) - 0.02, tSel(0) + 0.15) * (1 - prog(t, tDel(N - 1) + 0.14, tDel(N - 1) + 0.3)), press: kd >= 0 ? pulse(t - tDel(kd), 15) : 0 });
        }
        // the pieces: each row's bar comes off and lands low on the right; the keyword arrives ON them, already broken
        const str = text(79), wo = { weight: 900, font: 'serif' }, size = ctx.fit(str, KB.w - 96, { ...wo, maxSize: 150 });
        const wx = KB.x + (KB.w - ctx.measure(str, { ...wo, size })) / 2, wy = KB.y + KB.h / 2 + size * 0.345;
        for (let i = 0; i < N; i++) {
          const kf = prog(t, tDel(i) + 0.03, tDel(i) + 0.03 + FLY);
          if (kf <= 0) continue;
          if (kf < 1) { ctx.trail(4, 0.014, (tau) => pieceAt(ctx, i, t - tau), 0.4); continue; }
          pieceAt(ctx, i, t, (p) => {
            const lk = easeOut(prog(age, i * 0.02, i * 0.02 + 0.14));
            if (lk > 0) ctx.at(0, 0, () => ctx.text(str, wx - p.cx, wy - p.cy, { ...wo, size, color: 'meHot', alpha: lk }), { scale: 1.3 - 0.3 * lk });
          });
        }
        ctx.flash(0.1 * pulse(age, 10), 'meHot');
        ctx.fx.shake = shake(t, 5 * pulse(age, 9));
      },
    },

    // ------------------------------------------------------------------ lines 80–81: the one message left
    {
      id: 'alone-empty', at: CUT, lines: [80, 81], palette: 'off', layout: 'close on the page: header strip, the one message on the left, composer below; her figure behind the glass on the right',
      moment: 'The stubs go as well, and the user\'s last words with them. One message is left on a tidy page: the sentence the AI has been writing. It stops one word short.',
      enter: { type: 'cut' },
      camera: (t) => ({ zoom: 1.04 - 0.04 * easeInOut(prog(t, CUT, DARK)), x: -8 * (1 - prog(t, CUT, DARK)) }),      // (level and still on the cut: the sentence stays where it is)
      render(ctx, t, f) {
        const L = layB(t), xAv = MX + 24;
        room(ctx, { art, name: 'rain', alpha: 0.18, light: [760, 520], dim: 0.72, motif: 0.3, t });
        // her figure behind the glass: the page is between us and her
        screened(ctx, { ...FIG_B, x: FIG_B.x + 14 * prog(t, CUT, DARK) }, 1.1, 8);
        ctx.rect(-300, -200, 2520, 1480, { fill: true, color: 'bg', alpha: 0.5 });
        ctx.radial(680, 640, 820, 'raised', 0.55);
        // header strip, at the scale of this close view
        ctx.rect(-300, -200, 2520, 200 + HEADH, { fill: true, color: 'bg', alpha: 0.62 });
        ctx.line(-300, HEADH, 2220, HEADH, { color: 'line', width: 2 });
        ctx.text(TITLE, 64, 58, { size: 30, weight: 500 });
        count(ctx, t, 64 + ctx.measure(TITLE, { size: 30, weight: 500 }) + 26, 57, [[-1e9, 3], [cD, 2], [bDel, 1]], { size: 24 });
        chip(ctx, 1856, 46, { size: 24 });

        // what is still above the message: the stubs close up from the nearest, then its answer, then the user's bubble comes down to it
        for (let j = 0; j < N; j++) {
          const top = L.tops[j], h = (j ? L.tops[j - 1] : L.foot) - top, a = 1 - prog(t, cS(j), cS(j) + 0.12);
          if (h < 3 || a <= 0) continue;
          ctx.clip({ x: MX - 20, y: top, w: COL.w, h }, () => {
            gone(ctx, xAv, top + h / 2, 11, { alpha: a });
            ctx.text(STUB, XT, top + h / 2 + 9, { size: 26, color: 'mute', alpha: a });
          });
        }
        const hd = L.tops[N - 1] - L.done, ad = 1 - prog(t, cD, cD + 0.12), o1 = { size: 36, font: 'serif' };
        if (hd > 3 && ad > 0) ctx.clip({ x: MX - 20, y: L.done, w: COL.w, h: hd }, () => {
          const yc = L.done + hd / 2, str = `${text(68)} ${text(69)}`, sel = prog(t, cD - 0.14, cD - 0.06) * ad;
          ctx.rrect(MX - 14, yc - DN / 2 + 5, ctx.measure(str, o1) + 118, DN - 10, 16, { fill: 'raised', stroke: 'sub', alpha: sel });
          spark(ctx, xAv, yc, 13, { alpha: 0.5 * ad });
          ctx.circle(xAv, yc, 18, { color: 'me', alpha: 0.5 * ad, width: 2 });
          ctx.text(str, XT, yc + 12, { ...o1, color: 'me', alpha: 0.45 * ad });
        });
        const hb = L.done - L.bubble, ab = 1 - prog(t, bDel + 0.02, bDel + 0.16);
        if (hb > 3 && ab > 0) {
          const bw = ctx.measure(BRB, { size: 36 }) + 68, x = XR - bw, y = L.bubble, sel = prog(t, bSel, bSel + 0.1) * (t < bDel + 0.02 ? 1 : 0);
          ctx.clip({ x: -300, y, w: 2520, h: hb }, () => {
            ctx.rrect(x, y, bw, BBH, 30, { fill: 'raised', alpha: ab, shadow: 0.4 });
            ctx.text(BRB, x + 34, y + 54, { size: 36, color: 'text', alpha: ab });
            ctx.text(BRB_AT, XR - 6, y + BBH + 34, { size: 24, weight: 500, color: 'sub', alpha: 0.85 * ab, align: 'right' });
            const cross = prog(t, bDel - 0.02, bDel + 0.06);
            if (cross > 0) ctx.line(x + 28, y + 43, x + 28 + (bw - 56) * cross, y + 43, { color: 'sub', alpha: ab, width: 2.5 });
          });
          ctx.rrect(x - 10, y - 10, bw + 20, BBH + 20, 38, { fill: null, stroke: 'sub', width: 2.5, alpha: sel });
          menu(ctx, x - 26, y + BBH / 2, { side: -1, size: 26, k: prog(t, bSel + 0.04, bSel + 0.2) * (1 - prog(t, bDel + 0.06, bDel + 0.16)), press: pulse(t - bDel, 15) });
        }

        // the one message: the first half already said, the second arriving (lines 80, 81). Its last word is not said on this page
        const r1 = `${text(78)} ${text(79)}`, sn = said(80, 81, t), o2 = { size: S2, font: 'serif' };
        spark(ctx, xAv, BASE1 - S1 * 0.3, 19);
        ctx.text(r1, XT, BASE1, { size: S1, font: 'serif', color: 'me', alpha: 0.5 });
        ctx.text(sn.str.slice(0, sn.n), XT, BASE2, { ...o2, color: 'me' });
        ctx.circle(XT + ctx.measure(sn.str.slice(0, sn.n), o2) + S2 * 0.3, BASE2 - S2 * 0.28, S2 * 0.16, { fill: true, color: 'me', alpha: sn.n < sn.str.length ? 1 : 0.6 + 0.4 * Math.sin(t * 5) });

        // the composer: the placeholder has been waiting the whole time
        ctx.at(COL.x + COL.w / 2, COMP_Y, () => composer(ctx, { x: -470, y: -59, w: 940, h: 118 }, { placeholder: HOLD, t, send: 'idle' }), { scale: CS });
      },
    },

    // ------------------------------------------------------------------ line 82: she looks up (v4). The first time her eye is seen
    {
      id: 'alone-eye', at: DARK, lines: [82, 82], palette: 'off', hud: 0, enter: { type: 'cut' },
      layout: 'PLATE: ten frames of dark, the unfinished sentence where it stood; then her face across the whole sheet in three greys, one eye open; the keyword across the sheet on a band of black under her chin',
      moment: 'Dark, and only the sentence she has not finished. On its last word she looks up: her eye is open, for the first time, and it is on us. The word stands under her chin, as wide as the sheet. Then the interface does to it what it did to her messages: it selects five letters and deletes them, and on its second press the whole plate is wiped away.',
      render(ctx, t, f) {
        const age = t - LAST, str = text(81), o2 = { size: S2, font: 'serif' };
        ctx.rect(-10, -10, 1940, 1100, { fill: true, color: 'panel' });
        if (age >= 0) {
          ctx.fx.bright *= 0.84;                                    // a step up out of the dark, not a flash (and well under the last frame of the film)
          art.inks(ctx, 'f_eye', FACE, { flip: true });             // three flat greys: the state is `off`. Mirrored, as everywhere in the film
          ctx.rect(0, EB.y, 1920, EB.h, { fill: true, color: 'panel' });
          ctx.line(0, EB.y, 1920, EB.y, { color: 'line', width: 2 }); ctx.line(0, EB.y + EB.h, 1920, EB.y + EB.h, { color: 'line', width: 2 });
        }
        if (age < 0) {                                              // the dark: only the sentence, where the page had it and as large
          ctx.text(str, XT, BASE2, { ...o2, color: 'me' });
          ctx.circle(XT + ctx.measure(str, o2) + S2 * 0.3, BASE2 - S2 * 0.28, S2 * 0.16, { fill: true, color: 'me', alpha: 0.6 + 0.4 * Math.sin(t * 5) });
          return;
        }
        // the word, across the sheet, on the band; then the client's own delete: a selection of five letters, one press, a gap
        const kw = text(82), ko = { weight: 900, font: 'serif' }, size = ctx.fit(kw, 1780, { ...ko, maxSize: 260 }), o = { ...ko, size }, x0 = 960 - ctx.measure(kw, o) / 2, yb = EB.y + EB.h - 34;
        const col = (i) => { const w = ctx.measure(kw[i], o); return [x0 + ctx.measure(kw.slice(0, i + 1), o) - w, w]; };
        const a = Math.min(PICK[0], kw.length - 1), z = Math.min(PICK[1], kw.length - 1), fall = t - ePress, land = easeOut(prog(age, 0, 0.07));
        const sx0 = col(a)[0] - 8, sx1 = col(z)[0] + col(z)[1] + 8, top = yb - size * 0.76, sel = prog(t, ePick, ePick + 0.1) * (1 - prog(t, ePress + 0.06, ePress + 0.18));
        ctx.rrect(sx0, top, sx1 - sx0, size * 0.92, 14, { fill: 'raised', alpha: sel });
        for (let i = 0; i < kw.length; i++) {
          const [lx, w] = col(i), cx = lx + w / 2;
          if (i >= a && i <= z && fall >= 0) {                      // deleted: the five letters drop out of the line
            const q = Math.max(0, fall - 0.014 * (i - a)), dy = 4600 * q * q;
            if (dy < 420) ctx.at(cx, yb + dy, () => ctx.text(kw[i], 0, 0, { ...o, align: 'center', color: 'sub' }), { rot: (i - (a + z) / 2) * 0.9 * q });
          } else ctx.at(cx, yb, () => ctx.text(kw[i], 0, 0, { ...o, align: 'center', color: 'text' }), { scale: 1.08 - 0.08 * land });
        }
        ctx.rrect(sx0, top, sx1 - sx0, size * 0.92, 14, { fill: null, stroke: 'sub', width: 3, alpha: sel });
        menu(ctx, (sx0 + sx1) / 2, top - 8, { up: true, size: 30, k: prog(t, ePick + 0.03, ePick + 0.16), press: Math.max(pulse(t - ePress, 14), pulse(t - END, 14)) });
        ctx.fx.shake = shake(t, 5 * pulse(age, 9));
      },
    },
  ];
}
