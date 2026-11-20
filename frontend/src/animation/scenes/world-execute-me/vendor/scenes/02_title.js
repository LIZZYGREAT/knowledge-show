// Section 2 — TITLE and the first question (bar 8, 0:15.1 → beat 63, 0:29.4). State: off → on.
// The spark lights up: the first orange in the film. Then, over the instrumental, the user arrives.
//   title       centred, dark                 the spark ignites petal by petal; the launch command is typed and entered
//   chat-open   the whole client              a blank conversation; a cream cursor crosses the window: presence turns online
//   chat-type   close on the composer         the user starts one question, deletes it, types the real one
//   chat-think  wide → into the spark         the question is sent; the AI starts thinking; we fall into the spark
import { chatLayout, composer, drawThread, header, room, sidebar, windowFrame } from '../components/chat.js';
import { drawCursor } from '../components/cursor.js';
import { burst, spark } from '../components/motif.js';
import { frameRect } from '../engine/layout.js';
import { clamp, easeIn, easeInOut, easeOut, lerp, prog, pulse } from '../engine/util.js';
import { cues, glassFigure } from './kit.js';
import { enter } from './shot.js';

/** Where the thinking spark ends up, full frame: verse 1 starts from exactly this burst. */
export const HANDOFF = { cx: 960, cy: 486, r: 300, rot: 0.26 };

export function titleShots(env) {
  const { art, script, features } = env, { T, B, Bt, P, text } = cues(env);
  const L = chatLayout();
  const DROP = B(8), tType = features.snapToBeat(T(11)), tEnter = B(9), END = Bt(63);
  const QUESTION = script.question ?? 'how would you love me';
  const FALSE = ((script.sections?.[1]?.beats ?? []).flatMap((b) => b.you ?? []).find((s) => /^type, then delete:/.test(s)) ?? 'type, then delete: why did').split(': ')[1];
  /** The figure behind the glass, lit by the spark: the same bust as at boot, now in two dark oranges. */
  const figure = (ctx, a, color = 'meDim') => glassFigure(ctx, art, a, { color });

  /** What is in the composer at time t: a false start, a pause, backspace, then the real question. */
  function typing(t) {
    const b = (t - B(12)) / P;
    if (b < 1.6) return FALSE.slice(0, Math.floor(clamp(b / 1.5) * FALSE.length + 1e-6));
    if (b < 2.7) return FALSE;
    if (b < 3.4) return FALSE.slice(0, Math.ceil((1 - (b - 2.7) / 0.7) * FALSE.length));
    if (b < 4) return '';
    return QUESTION.slice(0, Math.floor(clamp((b - 4) / 2.8) * QUESTION.length + 1e-6));
  }
  const tSend = B(14);
  const msgs = () => [{ who: 'you', text: QUESTION, at: tSend, status: 'sent' }, { who: 'me', thinking: true, at: tSend + P }];

  return [
    // ------------------------------------------------------------------ the spark lights up
    {
      id: 'title', at: DROP, lines: [11, 11], layout: 'centred: the spark over the launch command', state: 'off > on',
      palette: (t) => ['off', 'on', easeOut(prog(t, DROP, DROP + 0.5))],
      moment: 'The spark lights up — the first colour in the film — and the launch command is typed and entered: the session starts.',
      enter: { type: 'cut', flash: 0.9, flashDecay: 5 },
      render(ctx, t, f) {
        const lit = easeOut(prog(t, DROP, DROP + 2 * P)), C = { x: 960, y: 392 };
        room(ctx, { light: [960, 400], dim: 0.62, t, motif: 0.6 });
        figure(ctx, 0.5 * lit, 'meDim');
        ctx.radial(C.x, C.y, 620, 'meDim', 0.5 * lit);                         // the room takes its colour from the spark
        ctx.glow('me', 60, () => spark(ctx, C.x, C.y, 176 * (1 + 0.03 * f.beatPulse), { lit, grow: 0.25 + 0.75 * lit, rot: 0.04 * (t - DROP) }), 0.6 * lit);
        // the command: system voice
        const cmd = text(11), n = Math.floor(prog(t, tType, tType + 0.72) * cmd.length + 1e-6), size = 92, cw = ctx.cw(size);
        const str = '> ' + cmd.slice(0, n), x = 960 - ((cmd.length + 2) * cw) / 2, y = 790, a = prog(t, DROP + 0.3, DROP + 0.55);
        ctx.rrect(x - 50, y - 108, (cmd.length + 2) * cw + 100, 164, 26, { fill: 'bg', stroke: 'line', alpha: a, shadow: 0.8 });
        if (t >= tEnter && t < tEnter + 0.1) { ctx.rrect(x - 50, y - 108, (cmd.length + 2) * cw + 100, 164, 26, { fill: 'text' }); ctx.text(str, x, y, { size, weight: 700, font: 'mono', color: 'bg' }); }
        else ctx.text(str, x, y, { size, weight: 700, font: 'mono', color: 'text', alpha: a });
        if (t < tEnter && (n < cmd.length && t >= tType || Math.floor(t * 5) % 2 === 0)) ctx.rect(x + str.length * cw + 8, y - size * 0.8, cw * 0.82, size * 0.98, { fill: true, color: 'me', alpha: a });
        ctx.flash(0.5 * pulse(t - tEnter, 7), 'me');
      },
    },

    // ------------------------------------------------------------------ a blank conversation; the user arrives
    {
      id: 'chat-open', at: tEnter, layout: 'the whole client, cursor crossing', palette: 'on',
      moment: 'A blank conversation opens. A cream cursor crosses the window — the user is here — and the presence chip turns online for the first time.',
      enter: { type: 'zoom', dur: 2 * P, align: 'start', y: 0.37 },
      camera: (t) => ({ zoom: 1 + 0.05 * easeInOut(prog(t, tEnter, B(12))), y: 14 * prog(t, tEnter, B(12)) }),
      render(ctx, t, f) {
        const tIn = B(10), here = prog(t, tIn, tIn + 0.25), tFocus = B(11) + 2 * P;
        room(ctx, { dim: 0.42, t });
        figure(ctx, 0.75);
        windowFrame(ctx, L, { glass: 0.82 });
        sidebar(ctx, L, { t, items: script.sidebar ?? [], presence: here > 0 ? 'online' : 'offline' });
        header(ctx, L, { t, title: 'New conversation', presence: here > 0 ? 'online' : null });
        if (here > 0 && here < 1) burst(ctx, L.head.x + L.head.w - 128, L.head.y + 34, 40, here, { color: 'text' });
        const cx = L.main.x + L.main.w / 2;
        ctx.radial(cx, 400, 300, 'meDim', 0.4);
        ctx.glow('me', 30, () => spark(ctx, cx, 400, 84 * (1 + 0.04 * f.beatPulse), { rot: 0.08 * (t - B(6)) }), 0.5);
        const box = composer(ctx, { ...L.composer, y: 610 }, { placeholder: script.composer_placeholder ?? '', t, focus: t >= tFocus ? 1 : 0, send: 'idle' });
        drawCursor(ctx, [
          { t: tIn - 0.15, x: 2010, y: 250 }, { t: tIn + 1.5 * P, x: 1470, y: 380 }, { t: B(11), x: 1240, y: 560 },
          { t: tFocus, x: box.caret[0] + 40, y: box.caret[1] + 6, click: true }, { t: B(12), x: box.caret[0] + 300, y: box.caret[1] + 120 },
        ], t, { kind: t > tFocus - 0.3 && t < tFocus + 0.5 ? 'text' : 'arrow' });
      },
    },

    // ------------------------------------------------------------------ the question
    {
      id: 'chat-type', at: B(12), layout: 'close-up on the composer', palette: 'on',
      moment: 'The user starts one question, deletes it, and types the real one: the question the whole film tries to answer.',
      enter: { type: 'push', dir: 2, dur: P / 2 },
      camera: (t) => {
        const c = frameRect({ x: L.composer.x - 70, y: 610 - 190, w: L.composer.w + 140, h: L.composer.h + 300 });
        return { ...c, zoom: c.zoom * (1 + 0.04 * prog(t, B(12), tSend)) };
      },
      render(ctx, t, f) {
        const str = typing(t), del = (t - B(12)) / P > 2.7 && (t - B(12)) / P < 3.4;
        room(ctx, { dim: 0.42, t });
        figure(ctx, 0.75);
        windowFrame(ctx, L, { glass: 0.82 });
        sidebar(ctx, L, { t, items: script.sidebar ?? [], presence: 'online' });
        header(ctx, L, { t, title: 'New conversation', presence: 'online' });
        const cx = L.main.x + L.main.w / 2;
        ctx.glow('me', 30, () => spark(ctx, cx, 400, 84, { rot: 0.08 * (t - B(6)) }), 0.5);
        const ready = str === QUESTION;
        const box = composer(ctx, { ...L.composer, y: 610 }, { text: str, placeholder: script.composer_placeholder ?? '', t: del ? 0 : t, focus: 1, send: ready ? 'ready' : 'idle', size: 34 });
        // each keystroke leaves a short cream tick under the caret, so the typing has weight
        const kb = ((t - B(12)) * 14) % 1;
        if (str.length && !ready && !del) ctx.line(box.caret[0] - 2, box.caret[1] + 22, box.caret[0] + 14, box.caret[1] + 22, { color: 'text', alpha: 0.7 * (1 - kb), width: 3 });
        const tGo = tSend - 1.1 * P;
        drawCursor(ctx, [{ t: B(12), x: box.caret[0] + 300, y: box.caret[1] + 120 }, { t: tGo, x: L.composer.x + 560, y: 610 + 150 }, { t: tSend - 0.04, x: box.send[0] + 3, y: box.send[1] + 4, click: true }], t, { scale: 1.2 });
      },
    },

    // ------------------------------------------------------------------ sent; thinking
    {
      id: 'chat-think', at: tSend, layout: 'wide, then into the thinking spark', palette: 'on', hud: 0,
      moment: 'The question is sent. The AI starts to think — and we fall into the spark, where its answer will take shape.',
      enter: { type: 'cut', flash: 0.35, flashColor: 'text' },
      camera: (t) => { const k = easeIn(prog(t, B(15), END)); return { zoom: 1 + 2.4 * k, x: lerp(0, -540, k), y: lerp(0, -230, k) }; },
      render(ctx, t, f) {
        const k = easeIn(prog(t, B(15), END)), a = 1 - prog(t, B(15) + P, END - 0.25);
        room(ctx, { dim: 0.42, t });
        figure(ctx, 0.75 * a);
        windowFrame(ctx, L, { glass: 0.82, alpha: 0.35 + 0.65 * a });
        sidebar(ctx, L, { t, items: script.sidebar ?? [], presence: 'online' });
        header(ctx, L, { t, title: 'New conversation', presence: 'online' });
        const th = { ...L.thread, h: L.thread.h };
        const items = drawThread(ctx, th, msgs().slice(0, 1), t, { alpha: a });
        composer(ctx, L.composer, { placeholder: script.composer_placeholder ?? '', t, send: 'busy' });
        // the thinking spark leaves its place in the thread and grows to fill the frame (drawn in screen space)
        const from = { x: L.thread.x + 20, y: (items[0]?.y ?? L.thread.y) + (items[0]?.h ?? 80) + 46 }, tOn = tSend + P;
        ctx.camera();
        if (t >= tOn) {
          const e = enter(t, tOn, 0, { dur: 0.3 });
          const x = lerp(from.x, HANDOFF.cx, k), y = lerp(from.y, HANDOFF.cy, k), r = lerp(22, HANDOFF.r, k);
          // the thinking wave calms down as it grows, so the cut lands on a still, even burst (HANDOFF)
          const settle = easeInOut(prog(t, END - 1.5 * P, END - 0.08));
          ctx.radial(x, y, r * 3.2, 'meDim', 0.5 * k);
          ctx.glow('me', 20 + 50 * k, () => spark(ctx, x, y, r * (0.7 + 0.3 * e.k), {
            alpha: e.a, rot: HANDOFF.rot + 0.5 * (t - END) * (1 - settle),
            pulse: (i) => lerp(0.66 + 0.34 * Math.sin(t * 7 - i * 0.62), 1, settle),
          }), 0.5);
          ctx.text('Thinking', x + 34, y + 8, { size: 22, color: 'mute', alpha: e.a * (1 - prog(t, B(15), B(15) + P)) });
        }
      },
    },
  ];
}
