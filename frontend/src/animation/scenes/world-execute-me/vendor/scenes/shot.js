// Shot = one camera set-up = one moment of the conversation. A section file returns a list of
// shot definitions; sequence() turns them into engine scenes ({ id, start, end, render, enter })
// and derives the overlap that drives each transition.
//
//   {
//     id: 'v1-circle',
//     at: <cut time in seconds - always a beat / half-beat / bar line>,
//     lines: [15, 17],             lyric line range shown by this shot (coverage check + storyboard)
//     moment: 'The AI answers: if it is a circle, what it gives you is ...',   REQUIRED - which moment of the conversation
//     layout: 'centred ring',      composition, in a few words (storyboard)
//     palette: 'on' | ['on', 'warm', k] | (t, f, u) => spec,     colour STATE (docs/v4/PLAN.md §2)
//     state: 'on > warm',          only needed when `palette` is a function (label for the storyboard)
//     hud: 1 | 0 | (t, u) => n,    opacity of the overlay layer (warning toast, credits); default 1
//     enter: { type, dur, align, flash, ... }   transition from the previous shot (transitions.js)
//     camera: (t, f, u) => ({ x, y, zoom, rot }),
//     render(ctx, t, f, u)         u = { at, until, dur, since, k }
//   }
import { clamp, pulse } from '../engine/util.js';

export function sequence(defs, endTime) {
  const sorted = [...defs].sort((a, b) => a.at - b.at);
  const span = (e) => {                           // [before, after] seconds of overlap around a cut
    const dur = e?.dur || 0, al = e?.align || 'end';
    return al === 'start' ? [0, dur] : al === 'center' ? [dur / 2, dur / 2] : [dur, 0];
  };
  // The engine has two content layers, so at most two shots may be live at any time. The overlap around
  // each cut is therefore clamped: a lead-in cannot reach back past the previous cut (or into the tail of
  // the previous transition), and the tail of a transition cannot outlast the shot it leads into.
  // Without this a lead-in longer than the previous shot would hide that shot altogether.
  const over = [];
  sorted.forEach((d, i) => {
    const want = i ? span(d.enter) : [0, 0];      // nothing precedes the first shot
    const room = i ? d.at - sorted[i - 1].at - over[i - 1][1] - 1e-6 : 0;
    const got = [Math.max(0, Math.min(want[0], room)), Math.min(want[1], (sorted[i + 1]?.at ?? endTime) - d.at)];
    if (want[0] + want[1] - got[0] - got[1] > 1e-3) {
      console.warn(`[shot ${d.id}] enter.dur ${(want[0] + want[1]).toFixed(3)} s does not fit between the cuts around it: shortened to ${(got[0] + got[1]).toFixed(3)} s`);
    }
    over.push(got);
  });
  return sorted.map((d, i) => {
    const next = sorted[i + 1];
    const until = next ? next.at : endTime;
    const enter = d.enter || { type: 'cut' };
    const start = d.at - over[i][0];
    const end = next ? next.at + over[i + 1][1] : endTime;
    return {
      id: d.id, start, end, at: d.at, until, enter,
      layout: d.layout || '', lines: d.lines || null, moment: d.moment || '',
      state: d.state || (typeof d.palette === 'string' ? d.palette : Array.isArray(d.palette) ? `${d.palette[0]} > ${d.palette[1]}` : '?'),
      render(ctx, t, f) {
        const u = { at: d.at, until, dur: until - d.at, since: t - d.at, k: clamp((t - d.at) / (until - d.at)) };
        // the STATE of the shot: the engine takes bloom tint, background and glow from this palette, so a
        // ctx.setPal() further down (one red component, say) recolours the drawing but not the whole frame
        ctx.setPal(typeof d.palette === 'function' ? d.palette(t, f, u) : d.palette || 'on');
        ctx.statePal = ctx.pal;
        ctx.clear();
        ctx.fx.hud = typeof d.hud === 'function' ? d.hud(t, u) : d.hud ?? 1;
        if (enter.flash) ctx.flash(enter.flash * pulse(t - d.at, enter.flashDecay ?? 8), enter.flashColor ?? null);
        if (d.camera) ctx.camera(d.camera(t, f, u));
        d.render(ctx, t, f, u);
      },
    };
  });
}

/** Deterministic camera shake offset (virtual px). */
export function shake(t, amp, seed = 0) {
  if (amp <= 0) return [0, 0];
  const s = (k) => Math.sin(t * (41 + k * 13 + seed) + k * 2.1) * 0.6 + Math.sin(t * (97 + k * 29 + seed * 3) + k) * 0.4;
  return [s(1) * amp, s(2) * amp];
}

/**
 * Staggered, eased entrance for item i of a group: returns { k, a, dy, s } where k = eased 0..1,
 * a = opacity, dy = px still to travel (falls into place), s = scale (settles from slightly small).
 */
export function enter(t, t0, i = 0, { step = 0.05, dur = 0.32, rise = 28 } = {}) {
  const raw = clamp((t - t0 - i * step) / dur), k = 1 - Math.pow(1 - raw, 3);
  return { raw, k, a: clamp(raw * 2.2), dy: (1 - k) * rise, s: 0.94 + 0.06 * k };
}
