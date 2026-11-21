// Section 1 — BOOT (0:00 → bar 8, 0:15.1). State: off (greyscale). Nobody is talking yet:
// the lyric lines are the SYSTEM's boot log (mono), and each sung step creates one part of the client.
//   boot-power   wide, dark room            a hairline becomes the window; the protection layer goes on
//   boot-layout  tilted, exploded view      the client's pieces are laid down, then assembled
//   boot-params  close on a card            the persona's fields are filled in (one stays undefined)
//   boot-world   the whole client           an empty new conversation: the space is ready
// The character is only a grey figure in the room behind the glass (v4: the faceless bust, in two greys).
import { card, chatLayout, composer, header, pill, room, sidebar, slider, windowFrame } from '../components/chat.js';
import { burst, spark } from '../components/motif.js';
import { clamp, easeBack, easeInOut, easeOut, lerp, prog, pulse } from '../engine/util.js';
import { cues, glassFigure, keywordSys, sysLine } from './kit.js';
import { enter } from './shot.js';

export function bootShots(env) {
  const { art, script } = env, { T, B, P, text } = cues(env);
  const L = chatLayout();
  const W = L.win, C = { x: W.x + W.w / 2, y: W.y + W.h / 2 };
  const tPower = 0.209;                                   // first transient of the track: the switch

  /** The grey figure in the room: her faceless bust as a flat two-grey shape (kit.js glassFigure). */
  const figure = (ctx, a, dx = 0) => glassFigure(ctx, art, a, { dx });
  /** Boot log: the lyric lines of this shot, in the system's voice. */
  const log = (ctx, t, first, last, x, y, a = 1) => {
    for (let i = first; i <= last; i++) if (!env.lyrics.lines[i].emphasis) sysLine(ctx, text(i), t, T(i), x, y + (i - first) * 42, { size: 27, alpha: a, color: t < env.lyrics.end(i) ? 'text' : 'sub' });
  };
  /** Dark band + keyword in the system's voice, in screen space. */
  const keyBand = (ctx, t, i, y, maxSize = 124) => {
    const age = t - T(i);
    if (age < 0) return;
    ctx.gradRect(0, y - 150, 1920, 230, [[0, 'panel', 0], [0.3, 'panel', 0.82 * clamp(age * 6)], [0.75, 'panel', 0.82 * clamp(age * 6)], [1, 'panel', 0]]);
    keywordSys(ctx, text(i), t, T(i), 960, y, { maxW: 1500, maxSize, key: i });
  };

  return [
    // ------------------------------------------------------------------ power / protection
    {
      id: 'boot-power', at: 0, lines: [0, 2], palette: 'off', layout: 'wide: dark room, the window opening from a hairline',
      moment: 'Power reaches the client: a hairline opens into the window, and its protection layer is switched on.',
      render(ctx, t, f) {
        const grow = easeOut(prog(t, tPower, tPower + 0.3)), open = easeInOut(prog(t, tPower + 0.32, tPower + 1.05)), hot = pulse(t - tPower, 3.5);
        room(ctx, { light: [960, 540], dim: 0.85 - 0.35 * open, motif: open, t });
        figure(ctx, 0.75 * prog(t, 1.2, 3.2));
        if (t >= tPower) {
          const h = Math.max(2, W.h * open), half = (W.w / 2) * grow;
          if (open <= 0) ctx.glow('text', 24, () => ctx.line(C.x - half, C.y, C.x + half, C.y, { color: 'text', alpha: 0.6 + 0.4 * hot, width: 2 + 2 * hot }), 0.7 * hot);
          else ctx.rrect(W.x, C.y - h / 2, W.w, h, W.r * open, { fill: 'bg', fillAlpha: 0.84 * open, stroke: hot > 0.25 ? 'text' : 'line', width: 1.5 + 2 * hot, shadow: open });
        }
        log(ctx, t, 0, 1, W.x + 56, W.y + 84);
        const tProt = T(2), on = prog(t, tProt, tProt + 0.35);
        if (on > 0) {
          // the protection layer: a second outline drawn once round the window, and its switch
          const g = ctx.g, per = 2 * (W.w + W.h) + 60;
          g.setLineDash([per * easeOut(on), per * 2]);
          ctx.glow('text', 16, () => ctx.rrect(W.x - 14, W.y - 14, W.w + 28, W.h + 28, W.r + 12, { fill: null, stroke: 'text', width: 3, strokeAlpha: 0.95 }), 0.5);
          g.setLineDash([]);
          const e = enter(t, tProt, 0, { dur: 0.3 });
          ctx.rrect(C.x - 330, C.y + 150 + e.dy, 660, 76, 20, { fill: 'raised', stroke: 'line', alpha: e.a, shadow: 0.6 });
          ctx.text(`${text(2).toLowerCase()} layer`, C.x - 296, C.y + 198 + e.dy, { size: 27, font: 'mono', color: 'sub', alpha: e.a });
          ctx.rrect(C.x + 230, C.y + 169 + e.dy, 70, 38, 19, { fill: 'line', alpha: e.a });
          ctx.rrect(C.x + 230, C.y + 169 + e.dy, 70, 38, 19, { fill: 'text', alpha: e.a * easeOut(prog(t, tProt + 0.12, tProt + 0.3)) });
          ctx.circle(C.x + 249 + 32 * easeBack(prog(t, tProt + 0.12, tProt + 0.34)), C.y + 188 + e.dy, 14, { fill: true, color: 'bg', alpha: e.a });
          keywordSys(ctx, text(2), t, tProt, C.x, C.y + 40, { maxW: 1300, maxSize: 132, key: 2 });
        }
      },
    },

    // ------------------------------------------------------------------ pieces → object creation
    {
      id: 'boot-layout', at: B(2), lines: [3, 5], palette: 'off', layout: 'tilted exploded view of the client, seen from above',
      moment: 'The pieces of the interface are laid out — sidebar, header, thread, composer — and assembled into one object.',
      enter: { type: 'push', dir: 2, dur: P / 2 },
      render(ctx, t, f) {
        const tObj = T(5), k = 1 - easeBack(prog(t, tObj, tObj + 0.42));            // tilt: 1 = laid out, 0 = assembled
        room(ctx, { light: [960, 600], dim: 0.45, t });
        figure(ctx, 0.6, 60 * k);
        const g = ctx.g, sc = lerp(1, 0.6, k);
        const pieces = [                                                             // [rect, lift, label]
          [{ x: W.x, y: W.y, w: W.w, h: W.h }, 0, 'window'],
          [{ x: L.side.x + 12, y: L.side.y + 12, w: L.side.w - 24, h: L.side.h - 24 }, 90, 'sidebar'],
          [{ x: L.head.x + 14, y: L.head.y + 12, w: L.head.w - 28, h: L.head.h - 8 }, 180, 'header'],
          [{ x: L.thread.x - 30, y: L.thread.y + 8, w: L.thread.w + 60, h: L.thread.h - 8 }, 270, 'thread'],
          [{ x: L.composer.x, y: L.composer.y, w: L.composer.w, h: L.composer.h }, 360, 'composer'],
        ];
        const bars = (r, rows, a) => { for (let j = 0; j < rows; j++) ctx.rrect(r.x + 26, r.y + 30 + j * 44, Math.min(r.w - 52, 140 + ((j * 67) % 150)), 16, 8, { fill: 'line', alpha: a }); };
        pieces.forEach(([r, lift, label], i) => {
          const t0 = B(2) - 0.12 + i * (P / 2), arrive = easeOut(prog(t, t0, t0 + 0.36));      // one piece per half beat
          if (arrive <= 0) return;
          const bob = Math.sin(t * 2.2 + i * 1.3) * 12 * k * prog(t, T(4), T(4) + 0.4);           // "let's begin": they stir
          const up = lift * k + (1 - arrive) * 700 + bob;
          g.save();
          g.translate(C.x, C.y + 110 * k); g.scale(sc, sc); g.transform(1, 0.16 * k, -0.44 * k, 1 - 0.3 * k, 0, 0); g.translate(-C.x, -C.y);
          if (i > 0 && k > 0.02) ctx.rrect(r.x + 18, r.y + 18, r.w, r.h, 18, { fill: 'panel', alpha: 0.6 * k * arrive });      // its shadow on the base
          g.translate(0, -up / ((1 - 0.3 * k) * sc));
          ctx.rrect(r.x, r.y, r.w, r.h, i ? 18 : W.r, { fill: i ? 'raised' : 'bg', fillAlpha: i ? 0.95 : 0.88, stroke: i ? 'sub' : 'line', strokeAlpha: i ? 0.3 + 0.7 * k : 1, alpha: arrive, width: 2 / sc, shadow: i ? 0.5 * k : 1 });
          if (i === 1) bars(r, 9, arrive);
          if (i === 2) ctx.rrect(r.x + 26, r.y + 20, 260, 18, 9, { fill: 'line', alpha: arrive });
          if (i === 3) for (let j = 0; j < 4; j++) ctx.rrect(r.x + (j % 2 ? r.w - 440 : 40), r.y + 50 + j * 104, 400 - j * 40, 56, 24, { fill: j % 2 ? 'line' : 'bg', stroke: 'line', alpha: arrive });
          if (i === 4) ctx.rrect(r.x + 30, r.y + 34, 340, 20, 10, { fill: 'line', alpha: arrive });
          if (i > 0) ctx.text(label, r.x + r.w - 18, r.y - 16, { size: 26 / sc, font: 'mono', color: 'text', alpha: arrive * clamp(k * 3), align: 'right' });
          g.restore(); ctx._font = '';
        });
        log(ctx, t, 3, 4, 84, 110);
        if (t >= tObj) for (const [x, y] of [[W.x, W.y], [W.x + W.w, W.y], [W.x, W.y + W.h], [W.x + W.w, W.y + W.h]]) burst(ctx, x, y, 70, (t - tObj - 0.25) / 0.5, { color: 'text' });
        keyBand(ctx, t, 5, 830);
      },
    },

    // ------------------------------------------------------------------ parameters → initialization
    {
      id: 'boot-params', at: B(4), lines: [6, 7], palette: 'off', layout: 'close-up: persona card left, loader right',
      moment: 'The persona card is filled in field by field; the last field, love, stays undefined. Then it initialises.',
      enter: { type: 'zoom', dur: P, x: 0.5, y: 0.5 },
      camera: (t) => ({ zoom: 1.16 + 0.04 * prog(t, B(4), B(6)), x: lerp(-170, 60, easeInOut(prog(t, T(7) - 0.15, T(7) + 0.35))), y: -8 }),
      render(ctx, t, f) {
        const tInit = T(7), init = prog(t, tInit, tInit + 0.9);
        room(ctx, { dim: 0.45, t });
        figure(ctx, 0.55);
        windowFrame(ctx, L, { glass: 0.86 });
        sidebar(ctx, L, { t, loaded: 0, items: script.sidebar ?? Array(6).fill('') });
        header(ctx, L, { t, loaded: 0, title: '' });
        const r = { x: 470, y: 160, w: 760, h: 700 }, b = card(ctx, r, { title: 'persona', subtitle: text(6).toLowerCase(), tag: 'setup', k: prog(t, B(4) - 0.1, B(4) + 0.25) });
        if (b) {
          const rows = [['name', 'Claude', 'serif'], ['voice', 'serif, unhurried', 'serif'], ['warmth', null, null], ['memory', 'this conversation', 'sans'], ['love', 'undefined', 'mono']];
          rows.forEach(([label, value, font], i) => {
            const t0 = B(4) + P * 0.5 + i * P, e = enter(t, t0, 0, { dur: 0.28, rise: 20 }), y = b.y + 22 + i * 104 + e.dy;
            if (e.a <= 0) return;
            ctx.text(label, b.x, y + 38, { size: 25, weight: 500, color: 'sub', alpha: e.a });
            ctx.rrect(b.x + 190, y, b.w - 190, 64, 16, { fill: 'bg', stroke: i === 4 ? 'sub' : 'line', alpha: e.a });
            if (value) {
              const n = Math.floor(clamp((t - t0 - 0.12) * 26, 0, value.length)), last = i === 4;
              ctx.text(value.slice(0, n), b.x + 214, y + 42, { size: 29, font, italic: i === 1, color: last ? 'sub' : 'text', alpha: e.a });
              if (n < value.length || (last && Math.floor(t * 2.5) % 2 === 0)) ctx.rect(b.x + 217 + ctx.measure(value.slice(0, n), { size: 29, font, italic: i === 1 }), y + 16, 3, 32, { fill: true, color: 'text', alpha: e.a });
            } else slider(ctx, { x: b.x + 216, y, w: b.w - 256, h: 64 }, 0.62 * easeOut(prog(t, t0 + 0.1, t0 + 0.7)), { fill: 'sub', alpha: e.a });
          });
        }
        if (init > 0) {                                              // the loader is the film's motif: twelve petals, one after another
          const x = 1500, y = 440, a = clamp(init * 5);
          ctx.radial(x, y, 330, 'raised', 0.9 * a);
          spark(ctx, x, y, 190, { lit: init, color: 'text', off: 'mute', alpha: a });
          ctx.text(`${String(Math.round(init * 100)).padStart(3, ' ')}%`, x, y + 286, { size: 34, font: 'mono', color: 'sub', align: 'center', alpha: a });
        }
        ctx.camera();                                                // screen space from here
        keyBand(ctx, t, 7, 950, 112);
      },
    },

    // ------------------------------------------------------------------ the new world
    {
      id: 'boot-world', at: B(6), lines: [8, 10], palette: 'off', layout: 'the whole client: empty new chat, figure behind the glass',
      moment: 'A new, empty conversation is set up: the place where the two of them will meet. Everything is ready, and nothing is lit.',
      enter: { type: 'scan', dur: P, dir: 0 },
      camera: (t) => ({ zoom: 1 + 0.07 * easeInOut(prog(t, B(6), B(8))), y: -10 * prog(t, B(6), B(8)) }),
      render(ctx, t, f) {
        const tSim = T(10), sim = prog(t, tSim, tSim + 0.3), load = prog(t, B(6), B(6) + 1.6);
        room(ctx, { dim: 0.4, t });
        figure(ctx, 0.7 + 0.2 * sim, -40 * easeOut(prog(t, B(6), B(8))));             // slight parallax against the push-in
        windowFrame(ctx, L, { glass: 0.8 });
        sidebar(ctx, L, { t, k: 1, loaded: easeOut(load), items: script.sidebar ?? [], lit: 0, presence: 'offline' });
        header(ctx, L, { t, title: 'New chat', loaded: easeOut(prog(t, B(6) + 0.6, B(6) + 1.4)) });
        log(ctx, t, 8, 9, L.main.x + 38, L.head.y + L.head.h + 62);
        const cx = L.main.x + L.main.w / 2, cy = 430;
        const e = enter(t, B(6) + P, 0, { dur: 0.5 });
        ctx.radial(cx, cy - 20, 260, 'raised', 0.7 * e.a);
        spark(ctx, cx, cy - 20 + e.dy, 84, { lit: 0, off: 'mute', offAlpha: 0.9, alpha: e.a, rot: 0.08 * (t - B(6)) });
        const c2 = enter(t, B(6) + 2 * P, 0, { dur: 0.45 });
        composer(ctx, { ...L.composer, y: 610 + c2.dy }, { placeholder: script.composer_placeholder ?? '', t, k: c2.raw, send: 'off' });
        if (sim > 0) pill(ctx, L.head.x + L.head.w - 34, L.head.y + 34, `${text(10).toLowerCase()} · ready`, { align: 'right', font: 'mono', size: 17, alpha: sim, color: 'text' });
        ctx.camera();
        keyBand(ctx, t, 10, 925);
      },
    },
  ];
}
