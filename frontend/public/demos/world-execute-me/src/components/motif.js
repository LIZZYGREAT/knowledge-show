// The film's one recurring shape: a radial burst. It is the character's flower ornament and
// the client's spark icon at once, so it is drawn here, in code, and reused everywhere:
// app icon, avatar, thinking animation, completion ring, click burst, the shape points gather into.
// (It is our own drawing of a sunburst, taken from the ornament in the supplied character art.)
import { clamp } from '../engine/util.js';

const TAU = Math.PI * 2;
/** Petal lengths: slightly uneven, like something cut by hand. */
const LEN = [1, 0.8, 0.94, 0.74, 0.98, 0.82, 0.9, 0.76, 1, 0.8, 0.95, 0.78];
export const RAYS = 12;

/**
 * Sunburst / spark.
 *   lit    0..1  share of the rays that are "on" (the rest are drawn as dim ghosts) — progress, attempts.
 *                Rays light clockwise from 12 o'clock; the one in progress grows from the hub to its tip
 *   grow   0..1  rays extend from the centre (ignition)
 *   pulse  (i) => length multiplier, for the thinking animation
 *   fat    petal half-width as a share of r
 */
export function spark(ctx, cx, cy, r, { rays = RAYS, rot = 0, color = 'me', off = 'mute', alpha = 1, lit = 1, grow = 1, fat = 0.105, inner = 0.17, pulse = null, core = 0.1, offAlpha = 0.35 } = {}) {
  if (alpha <= 0.003 || r <= 0) return;
  const g = ctx.g, nLit = lit * rays;
  for (const pass of [0, 1]) {                       // 0 = ghosts, 1 = lit petals (drawn on top, one path each pass)
    g.beginPath();
    let any = false;
    for (let i = 0; i < rays; i++) {
      const on = clamp(nLit - i);                    // 0..1, the petal currently lighting up is partial
      const k = pass ? on : 1 - on;
      if (k <= 0.001) continue;
      const a = rot + (i / rays) * TAU - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      // the petal that is lighting up grows out of the hub over its ghost, so a slowly animated `lit` never pops
      const len = r * LEN[i % 12] * grow * (pulse ? pulse(i) : 1) * (pass ? on : 1);
      const r0 = r * inner, w = r * fat;
      if (len <= r0) continue;
      const mx = (r0 + (len - r0) * 0.56), nx = -s * w, ny = c * w;
      g.moveTo(cx + c * r0, cy + s * r0);
      g.quadraticCurveTo(cx + c * mx + nx, cy + s * mx + ny, cx + c * len, cy + s * len);
      g.quadraticCurveTo(cx + c * mx - nx, cy + s * mx - ny, cx + c * r0, cy + s * r0);
      any = true;
    }
    if (!any) continue;
    g.fillStyle = ctx.col(pass ? color : off, alpha * (pass ? 1 : offAlpha));
    g.fill();
  }
  if (core > 0) ctx.circle(cx, cy, r * core * grow, { fill: true, color: lit > 0 ? color : off, alpha: alpha * (lit > 0 ? 1 : offAlpha) });
}

/** The spark while the AI is thinking: a wave runs round the petals and the whole thing turns slowly. */
export function thinking(ctx, cx, cy, r, t, { color = 'me', alpha = 1, speed = 1, stuck = 0 } = {}) {
  // stuck 0..1: the wave stalls and stutters (a thought that will not finish), from 12 steps a second down to 3
  const q = 12 - 9 * clamp(stuck), tt = stuck > 0 ? Math.floor(t * q) / q : t;
  spark(ctx, cx, cy, r, { color, alpha, rot: tt * 0.5 * speed, pulse: (i) => 0.66 + 0.34 * Math.sin(tt * 7 * speed - i * 0.62) });
}

/** Tips of the petals, for match cuts (points that gather into the burst, rays that become lines). */
export function sparkTips(cx, cy, r, rot = 0, rays = RAYS) {
  return Array.from({ length: rays }, (_, i) => { const a = rot + (i / rays) * TAU - Math.PI / 2; return [cx + Math.cos(a) * r * LEN[i % 12], cy + Math.sin(a) * r * LEN[i % 12]]; });
}

/** Closed outline of the burst with n points (same convention as shapes.js: starts at 12 o'clock, clockwise). */
export function sparkOutline(cx, cy, r, { rot = 0, n = 180, rays = RAYS, inner = 0.34 } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const u = (k / n) * rays, i = Math.floor(u), f = u - i;                 // within petal i: tip at f = 0, valley at f = 0.5
    // (the last petal runs back into petal 0, so the outline closes for any number of rays)
    const rr = r * (inner + (LEN[i % 12] * (1 - f) + LEN[((i + 1) % rays) % 12] * f - inner) * Math.pow(Math.abs(Math.cos(f * Math.PI)), 1.6));
    const a = rot + (k / n) * TAU - Math.PI / 2;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

/** A click, a hit, a notification: petals fly outwards and thin out. k = 0..1 age of the burst. */
export function burst(ctx, cx, cy, r, k, { color = 'text', rays = RAYS, alpha = 1, rot = 0 } = {}) {
  if (k <= 0 || k >= 1) return;
  const e = 1 - Math.pow(1 - k, 3);
  for (let i = 0; i < rays; i++) {
    const a = rot + (i / rays) * TAU, c = Math.cos(a), s = Math.sin(a), r0 = r * (0.35 + 0.65 * e), r1 = r0 + r * 0.42 * (1 - k) * LEN[i % 12];
    ctx.line(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, { color, alpha: alpha * (1 - k), width: Math.max(1.5, r * 0.07 * (1 - k)) });
  }
}
