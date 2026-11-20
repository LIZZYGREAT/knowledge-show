// The user's mouse pointer: the only body "you" has in the film. Always cream (cream = you).
// The AI has no pointer; when it forges one (section 9) that is itself an error.
// Position is a pure function of time along a list of waypoints, so it can be motion-blurred
// by sampling the past (ctx.trail).
import { clamp, easeInOut, lerp } from '../engine/util.js';
import { burst } from './motif.js';

/**
 * Position at time t along waypoints [{ t, x, y, click?: true }, ...] (sorted by t).
 * Moves ease in and out and bow slightly sideways, like a hand; between a waypoint's arrival
 * and the next departure the pointer rests. `dwell` = share of each leg spent resting.
 */
export function cursorAt(way, t, { dwell = 0.3, bow = 0.07 } = {}) {
  if (!way.length) return [960, 540];
  if (t <= way[0].t) return [way[0].x, way[0].y];
  for (let i = 1; i < way.length; i++) {
    if (t <= way[i].t) {
      const a = way[i - 1], b = way[i], span = b.t - a.t, t0 = a.t + span * dwell;
      const k = easeInOut(clamp((t - t0) / Math.max(1e-6, b.t - t0)));
      const dx = b.x - a.x, dy = b.y - a.y, arc = Math.sin(k * Math.PI) * bow;
      return [lerp(a.x, b.x, k) - dy * arc, lerp(a.y, b.y, k) + dx * arc];
    }
  }
  const z = way[way.length - 1];
  return [z.x, z.y];
}

/** Seconds since the most recent click at or before t (Infinity if none). */
export function sinceClick(way, t) {
  let s = Infinity;
  for (const w of way) if (w.click && t >= w.t) s = t - w.t;
  return s;
}

/** Pointer glyph. kind 'arrow' | 'text' (I-beam) | 'hand'. down 0..1 = pressed. */
export function pointer(ctx, x, y, { kind = 'arrow', color = 'text', alpha = 1, scale = 1, down = 0 } = {}) {
  if (alpha <= 0.003) return;
  const s = scale * (1 - 0.1 * down);
  ctx.at(x, y, () => {
    const g = ctx.g;
    g.shadowColor = `rgba(0,0,0,${0.45 * alpha})`; g.shadowBlur = 10 * ctx.scale; g.shadowOffsetY = 3 * ctx.scale;
    if (kind === 'text') {
      ctx.poly([[-6, -15], [-2, -13], [0, -11], [2, -13], [6, -15]], { color, alpha, width: 2.6 });
      ctx.line(0, -11, 0, 11, { color, alpha, width: 2.6 });
      ctx.poly([[-6, 15], [-2, 13], [0, 11], [2, 13], [6, 15]], { color, alpha, width: 2.6 });
    } else {
      const pts = kind === 'hand'
        ? [[0, 0], [5, 2], [5, 11], [9, 10], [13, 11], [17, 13], [17, 22], [14, 30], [3, 30], [-3, 21], [-6, 15], [-2, 14], [0, 16]]
        : [[0, 0], [0, 25], [6.5, 19.5], [11, 29.5], [15.5, 27.5], [11, 18], [19, 18]];
      ctx.poly(pts, { close: true, fill: true, color, alpha });
      g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0;
      ctx.poly(pts, { close: true, color: 'bg', alpha: alpha * 0.9, width: 1.6 });
    }
    g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }, { scale: s });
}

/**
 * Draw the pointer following `way` at time t, with motion blur on fast moves and a small
 * burst (the film's motif) on every click. The burst stays where the click happened while
 * the pointer moves on. Returns the pointer's position [x, y] (also when alpha is 0).
 */
export function drawCursor(ctx, way, t, { kind = 'arrow', color = 'text', alpha = 1, scale = 1.5, blur = 5, pathOpts = {} } = {}) {
  const now = cursorAt(way, t, pathOpts);
  if (alpha <= 0.003) return now;
  let hit = null;                                                      // the most recent click
  for (const w of way) if (w.click && t >= w.t) hit = w;
  const sc = hit ? t - hit.t : Infinity;
  const before = cursorAt(way, t - 0.03, pathOpts), speed = Math.hypot(now[0] - before[0], now[1] - before[1]) / 0.03;
  if (sc < 0.45) burst(ctx, hit.x, hit.y, 34 * scale, sc / 0.45, { color, alpha });
  const k = clamp((speed - 400) / 600);                                // only blur when it is really moving; the ghosts fade in with speed
  ctx.trail(k > 0 ? blur : 0, 0.011, (tau) => { const p = cursorAt(way, t - tau, pathOpts); pointer(ctx, p[0], p[1], { kind, color, alpha, scale, down: sc < 0.12 ? 1 : 0 }); }, 0.42 * k);
  return now;
}
