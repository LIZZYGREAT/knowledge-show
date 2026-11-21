// Palette system. In v3 a palette is a STATE of the conversation (docs/v4/PLAN.md §2):
//   off (grey: AI not started / user gone) · on · warm · error · ash · dead
// and the roles carry fixed meaning for the whole film:
//   text = cream = YOU        me / meHot / meDim = orange = the AI        err = red = error
//   bg / panel / raised / line / sub / mute = the client's own surfaces and secondary text
// Shots name a state; two states blend over time (an event unfolding) or swap on a cut.
// Everything downstream (2D drawing, bloom tint, flash colour, art saturation) reads the blend.

export const ROLES = ['bg', 'panel', 'raised', 'line', 'text', 'sub', 'mute', 'me', 'meHot', 'meDim', 'err', 'errDim', 'bloom'];
const SCALARS = ['glow', 'sat'];
/** Old role names still used by a few engine helpers' defaults. */
const ALIAS = { fg: 'text', mid: 'sub', dim: 'mute', faint: 'line', accent: 'text', alt: 'me' };

/** '#rgb' or '#rrggbb' (the '#' may be left out) -> [r, g, b]; null for anything else. */
export function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const badHex = new Set();
/** As parseHex, but never null: anything that is not '#rgb' / '#rrggbb' is reported once and comes back black. */
export function hexToRgb(hex) {
  const c = parseHex(hex);
  if (c) return c;
  if (!badHex.has(hex)) { badHex.add(hex); console.error(`[palette] "${hex}" is not a colour - write '#rgb' or '#rrggbb'`); }
  return [0, 0, 0];
}

function withAliases(p) {
  for (const [old, role] of Object.entries(ALIAS)) p[old] = p[role];
  return p;
}

export function buildPalettes(defs) {
  const out = {};
  for (const [name, d] of Object.entries(defs)) {
    if (name.startsWith('_')) continue;
    const p = { name, glow: d.glow ?? 1, sat: d.sat ?? 1 };
    for (const r of ROLES) p[r] = hexToRgb(d[r] ?? d.text);
    out[name] = withAliases(p);
  }
  return out;
}

/** Linear blend of two palettes (k = 0 -> a, 1 -> b). */
export function mixPal(a, b, k) {
  if (k <= 0 || a === b) return a;
  if (k >= 1) return b;
  const p = { name: `${a.name}>${b.name}` };
  for (const s of SCALARS) p[s] = a[s] + (b[s] - a[s]) * k;
  for (const r of ROLES) p[r] = [0, 1, 2].map((i) => a[r][i] + (b[r][i] - a[r][i]) * k);
  return withAliases(p);
}

/**
 * Palette track: keyframes [[time, name, fade?], ...] -> function(t) returning a spec for ctx.setPal().
 * fade = seconds of blending INTO that keyframe (0 / omitted = hard switch at `time`).
 */
export function palTrack(keys) {
  return (t) => {
    let i = 0;
    while (i + 1 < keys.length && t >= keys[i + 1][0] - (keys[i + 1][2] || 0)) i++;
    const cur = keys[i];                                   // last keyframe whose fade has started
    if (i > 0 && cur[2] && t < cur[0]) return [keys[i - 1][1], cur[1], (t - (cur[0] - cur[2])) / cur[2]];
    return cur[1];
  };
}
