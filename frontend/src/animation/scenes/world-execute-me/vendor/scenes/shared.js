// Things more than one section needs to agree on (so cuts between shots are seamless).
import { LAYOUT } from '../engine/draw.js';

/** Centre of the right-hand stage of the split composition. */
export const STAGE_C = { x: LAYOUT.stage.x + LAYOUT.stage.w / 2, y: LAYOUT.stage.y + 400 };
export const SCREEN_C = { x: 960, y: 540 };

/**
 * v4: f_eye (her face close up, one eye open) is ALWAYS shown mirrored, and from the last shout on at one fixed
 * registration, so that the letters that are windows onto it (161.88 s), the frame that opens on it (162.81 s) and
 * the push-in that follows (166.50 s) are the same picture. Virtual px; `eye` = where the open eye then is on screen.
 * (About 1.72 x the source: drawn as paths. DISHEARTENED at 124.89 s uses the same mirror direction.)
 */
export const EYE = { name: 'f_eye', flip: true, x: -211, y: -153, w: 2157, h: 2157, eye: [712, 748] };

/** Lyric line indices used as cue points (see data/lyrics.json). */
export const LINE = {
  POWER: 0, PUT_ON: 1, PROTECTION: 2, PIECES: 3, BEGIN: 4, OBJECT: 5, PARAMS: 6, INIT: 7, WORLD: 8, BEGIN_THE: 9,
  SIMULATION: 10, TITLE: 11, POINTS: 12, GIVE_1: 13, DIMENSION: 14, CIRCLE: 15, GIVE_2: 16, CIRCUMFERENCE: 17,
  SINE: 18, SIT: 19, TANGENTS: 20, INFINITY: 21, BE_MY: 22, LIMITATIONS: 23,
};

/**
 * Time helpers for a section file.
 *   T(i)   start of lyric line i            H(i)  that time snapped to the nearest half-beat (cut points)
 *   B(n)   start of bar n                   Bt(b) time of beat b (fractions allowed: 12.5 = off-beat)
 */
export function cues({ features, lyrics }) {
  return {
    P: features.period,
    T: (i) => lyrics.start(i),
    H: (i) => features.snapHalf(lyrics.start(i)),
    B: (n) => features.barTime(n),
    Bt: (b) => features.beatTime(b),
    text: (i) => lyrics.lines[i].text,
  };
}

/** Rotation of the ASCII world: creeps while it is being built, spins once the simulation runs. */
export function worldRotY(t, tWorld, tSim) {
  return 0.22 * (t - tWorld) + (t > tSim ? 0.55 * (t - tSim) : 0);
}

/** Small ASCII progress bar string, e.g. [#####.....] */
export function bar(v, cells = 10) {
  const n = Math.round(Math.max(0, Math.min(1, v)) * cells);
  return '[' + '#'.repeat(n) + '.'.repeat(cells - n) + ']';
}
