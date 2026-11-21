// Composition presets (virtual 1920x1080 units). The left-log / right-stage split of the
// first version is now just one preset among several; shots pick whichever fits the lyric.
//
//   split()        code window left + stage right        (the film's recurring motif)
//   SAFE / FULL    one full-screen subject (inside / ignoring the HUD rules)
//   centre(rect)   anchor for centred headline typography
//   hsplit()       top / bottom bands
//   vsplit()       left / right halves
//   grid(c, r)     2-4 (or more) panel storyboard
//   corner()       window shrunk into a corner as a small HUD
//   FULL + hud 0   pure image, no UI at all

export const VW = 1920, VH = 1080;
export const FULL = { x: 0, y: 0, w: VW, h: VH };
export const SAFE = { x: 56, y: 104, w: 1808, h: 872 };          // area between the HUD rules
export const HUD_TOP = 64, HUD_BOTTOM = 1016, PAD = 56;

/** Left log window + right stage. ratio = share of the width given to the log. */
export function split(ratio = 0.4115, area = SAFE, gap = 32) {
  const lw = Math.round(area.w * ratio);
  return {
    log: { x: area.x, y: area.y, w: lw, h: area.h },
    stage: { x: area.x + lw + gap, y: area.y, w: area.w - lw - gap, h: area.h },
  };
}

/** Top / bottom bands. ratio = share of the height given to the top band. */
export function hsplit(ratio = 0.5, area = SAFE, gap = 28) {
  const th = Math.round((area.h - gap) * ratio);
  return [{ x: area.x, y: area.y, w: area.w, h: th }, { x: area.x, y: area.y + th + gap, w: area.w, h: area.h - th - gap }];
}

/** Left / right halves. */
export function vsplit(ratio = 0.5, area = SAFE, gap = 28) {
  const lw = Math.round((area.w - gap) * ratio);
  return [{ x: area.x, y: area.y, w: lw, h: area.h }, { x: area.x + lw + gap, y: area.y, w: area.w - lw - gap, h: area.h }];
}

/** cols x rows panels, row-major. */
export function grid(cols, rows, area = SAFE, gap = 28) {
  const w = (area.w - gap * (cols - 1)) / cols, h = (area.h - gap * (rows - 1)) / rows, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: area.x + c * (w + gap), y: area.y + r * (h + gap), w, h });
  return out;
}

/** Small window parked in a corner: 'tl' | 'tr' | 'bl' | 'br'. */
export function corner(which = 'bl', w = 560, h = 236, area = SAFE) {
  return { x: which[1] === 'l' ? area.x : area.x + area.w - w, y: which[0] === 't' ? area.y : area.y + area.h - h, w, h };
}

/** Camera parameters ({ x, y, zoom } for a shot's `camera`) that make rect `r` fill the screen, with a margin in px. */
export function frameRect(r, margin = 0) {
  const zoom = Math.min(VW / (r.w + 2 * margin), VH / (r.h + 2 * margin));
  return { x: r.x + r.w / 2 - VW / 2, y: r.y + r.h / 2 - VH / 2, zoom };
}

export const centre = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const inset = (r, d) => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });
/** Blend two rects (for panels that move/resize over time). */
export const lerpRect = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });
