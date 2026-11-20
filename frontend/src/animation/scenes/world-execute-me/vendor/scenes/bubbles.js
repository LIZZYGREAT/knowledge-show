// MESSAGE BUBBLES as the close interface shots draw them (v4), shared by chorus 1, verse 2 and what follows:
// her messages are bubbles in her serif, orange, with an orange rule at the left; the user's are cream sans in a
// cream-edged bubble. All sizes hang on the type size, so a shot can set them as large as its framing wants.
//
//   meBox / meBubble / meIn       one of HER messages: its box, itself, arriving from her side (the left)
//   youBox / youBubble / youIn    one of the USER's: its box, itself (right-aligned at xr), arriving from the right
//   dots                          the user is typing: three cream dots
//   delivered                     a tick and one word under a bubble that got through
import { clamp, easeOut, prog } from '../engine/util.js';

export function meBox(ctx, str, size, weight = 400) {
  const padX = size * 0.6, padY = size * 0.36;
  return { w: ctx.measure(str, { size, weight, font: 'serif' }) + padX * 2 + size * 0.2, h: size * 1.22 + padY * 2, padX, padY };
}
/** One of HER messages. */
export function meBubble(ctx, x, y, str, { size = 40, weight = 400, n = null, alpha = 1, hot = false, caret = true } = {}) {
  const b = meBox(ctx, str, size, weight), rad = Math.min(b.h * 0.4, size * 0.72);
  if (alpha <= 0.003) return { x, y, w: b.w, h: b.h };
  ctx.rrect(x, y, b.w, b.h, rad, { fill: 'raised', stroke: 'meDim', strokeAlpha: 0.7, width: Math.max(1.5, size * 0.028), alpha, shadow: 0.35 });
  ctx.rrect(x + size * 0.24, y + b.h * 0.25, Math.max(3, size * 0.085), b.h * 0.5, size * 0.05, { fill: 'me', alpha });
  const o = { size, weight, font: 'serif' }, shown = n == null ? str : str.slice(0, n), tx = x + b.padX + size * 0.2, ty = y + b.padY + size * 0.93;
  ctx.text(shown, tx, ty, { ...o, color: hot ? 'meHot' : 'me', alpha });
  if (caret && n != null && n < str.length) ctx.circle(tx + ctx.measure(shown, o) + size * 0.3, ty - size * 0.28, size * 0.16, { fill: true, color: 'me', alpha });
  return { x, y, w: b.w, h: b.h };
}
/** Her bubble arriving from her side (the left), blurred while it travels. */
export function meIn(ctx, t, at, x, y, str, o = {}) {
  if (t < at) return null;
  let r = null;
  const k0 = prog(t, at, at + 0.26);
  ctx.trail(k0 < 1 ? 3 : 0, 0.016, (tau) => {
    const k = easeOut(prog(t - tau, at, at + 0.26));
    r = meBubble(ctx, x - (1 - k) * (o.fly ?? 220), y, str, { ...o, alpha: (o.alpha ?? 1) * clamp(k * 3) });
  }, 0.4);
  return r;
}
export function youBox(ctx, str, size, maxW = 1e9) {
  const o = { size, weight: 500, font: 'sans' }, lines = ctx.wrap(str, maxW, o), padX = size * 0.78, padY = size * 0.52;
  return { lines, w: Math.max(...lines.map((l) => ctx.measure(l, o))) + padX * 2, h: lines.length * size * 1.28 + padY * 2 - size * 0.16, padX, padY };
}
/** One of the USER's messages (right-aligned at xr). */
export function youBubble(ctx, xr, y, str, { size = 30, maxW = 1e9, alpha = 1 } = {}) {
  const b = youBox(ctx, str, size, maxW), x = xr - b.w, rad = Math.min(b.h * 0.42, size * 0.95);
  if (alpha > 0.003) {
    ctx.rrect(x, y, b.w, b.h, rad, { fill: 'raised', stroke: 'text', strokeAlpha: 0.6, width: Math.max(1.5, size * 0.04), alpha, shadow: 0.35 });
    b.lines.forEach((ln, i) => ctx.text(ln, x + b.padX, y + b.padY + (i + 0.76) * size * 1.28, { size, weight: 500, color: 'text', alpha }));
  }
  return { x, y, w: b.w, h: b.h, lines: b.lines, padX: b.padX, padY: b.padY };
}
/** A cream bubble arriving from the user's side (the right). */
export function youIn(ctx, t, at, xr, y, str, o = {}) {
  if (t < at) return null;
  let r = null;
  const k0 = prog(t, at, at + 0.26);
  ctx.trail(k0 < 1 ? 3 : 0, 0.016, (tau) => {
    const k = easeOut(prog(t - tau, at, at + 0.26));
    r = youBubble(ctx, xr + (1 - k) * (o.fly ?? 420), y, str, { ...o, alpha: (o.alpha ?? 1) * clamp(k * 3) });
  }, 0.4);
  return r;
}
/** The user is typing: three cream dots. */
export function dots(ctx, xr, y, size, t, alpha = 1) {
  const w = size * 3.3, h = size * 1.9;
  ctx.rrect(xr - w, y, w, h, h / 2, { fill: 'raised', stroke: 'text', strokeAlpha: 0.4, width: Math.max(1.5, size * 0.05), alpha });
  for (let i = 0; i < 3; i++) ctx.circle(xr - w + size * (0.95 + i * 0.7), y + h / 2 - size * 0.2 * Math.max(0, Math.sin(t * 9 - i * 0.9)), size * 0.17, { fill: true, color: 'text', alpha: alpha * 0.9 });
}
/** A tick and one word under a bubble that got through. */
export function delivered(ctx, x, y, size, k) {
  if (k <= 0) return;
  const a = clamp(k * 2);
  ctx.poly([[x, y - size * 0.34], [x + size * 0.28, y - size * 0.06], [x + size * 0.8, y - size * 0.64]], { color: 'sub', width: Math.max(1.5, size * 0.11), alpha: a });
  ctx.text('Delivered', x + size * 1.15, y, { size, weight: 500, color: 'mute', alpha: a });
}
