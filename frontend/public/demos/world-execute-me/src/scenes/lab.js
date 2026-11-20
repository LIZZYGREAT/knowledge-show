// CHECK CARDS (not part of the film). Each card is one still, one second apart from t = 0, rendered through the
// real pipeline (2D layer, bloom, grain), so a picture can be judged by itself before it goes into a shot:
//
//   node export/export.mjs --lab inks --sheet out/chk_inks.png --times 0,1,2 --cols 1 --width 1920 --height 1080
//   http://localhost:5173/?lab=inks&t=2          (preview)
//
// Sets:  inks    the silhouettes in their three plates; treatments; the two close-ups at their tightest framing
//        glyph   code-symbol pictures (docs/v4/PROMPT_v4.md §7.1)
//        walls   the code-drawn rooms that replaced the blurred illustrations
//        verse2  the four plates of verse 2 in their states (eggplant, tomato, cat, the proof)
//        pre2    the four plates of pre-chorus 2 in their states (gender, a day, the two letters, the trance)
//        history the strip of cut-paper history of pre-chorus 1 (the whole of it in one still; each landmark)
//        cover   the still for the video's thumbnail (cover.js)
//        meme    a sticker for the comment section (meme.js)
// Section files add their own sets by exporting `labCards(env)`; see LAB_SOURCES.
import { ground, marks } from '../components/plate.js';
import { INK_NAMES } from '../engine/art.js';
import { room } from '../components/chat.js';

/** Section modules that contribute check cards: [file, export]. A missing file is skipped. */
const LAB_SOURCES = [['./cover.js', 'labCards'], ['./meme.js', 'labCards'], ['./plates_chorus.js', 'labCards'], ['./plates_love.js', 'labCards'], ['./12_chorusx.js', 'labCards'], ['./objects.js', 'labCards'], ['./plates_verse2.js', 'labCards'], ['./plates_pre2.js', 'labCards'], ['./history.js', 'labCards'], ['./11_execution.js', 'labCards'], ['./11_count.js', 'labCards']];

const label = (ctx, str, x = 60, y = 1040) => ctx.text(str, x, y, { size: 24, font: 'mono', color: 'sub' });

function inkCards({ art }) {
  const row = (names) => (ctx) => {
    ground(ctx, { light: null });
    names.forEach((n, i) => {
      const { w, h } = art.size(n), H = 860, W = (H * w) / h, x = 60 + i * 465 + (440 - Math.min(W, 440)) / 2, k = Math.min(1, 440 / W);
      ctx.circle(x + (W * k) / 2, 470, 300, { fill: true, color: 'raised' });      // paper light behind: the black ink is almost the page
      art.inks(ctx, n, { x, y: 60 + (H - H * k) / 2, w: W * k, h: H * k });
      label(ctx, n, x, 990);
    });
  };
  return [
    { palette: 'on', render: row(INK_NAMES.slice(0, 4)) },
    { palette: 'on', render: row(INK_NAMES.slice(4)) },
    {                                                               // treatments on f_bust
      palette: 'warm',
      render(ctx) {
        ground(ctx, { light: null });
        const B = (i) => ({ x: 40 + i * 372, y: 90, w: 360, h: 480 }), C = (i) => ({ x: 40 + i * 372, y: 570, w: 345, h: 460 });
        const put = (r, str, o, name = 'f_bust') => { ctx.circle(r.x + r.w / 2, r.y + r.h * 0.48, r.w * 0.5, { fill: true, color: 'raised' }); art.inks(ctx, name, r, o); label(ctx, str, r.x, r.y + r.h + 4); };
        put(B(0), 'registered', {});
        put(B(1), 'offset 10 / 18', { offset: { orange: [10, 4], black: [-8, 12] } });
        put(B(2), 'no cream plate', { roles: { cream: null } });
        put(B(3), 'exact, apart', { exact: true, offset: { cream: [-14, 0], black: [14, 0] } });
        put(B(4), 'cream = sub + keyline', { roles: { cream: 'sub' }, keyline: { color: 'text', width: 2 } });
        put(C(0), 'two greys', { plates: [{ ink: 'all', role: 'mute' }, { ink: 'black', role: 'panel', alpha: 0.6 }], alpha: 0.75 });
        put(C(1), 'alpha 0.5 (group)', { alpha: 0.5 });
        put(C(2), 'reveal .6 / .4 / .2', { reveal: { cream: 0.6, orange: 0.4, black: 0.2 } });
        put(C(3), 'vector, flip', { vector: true, flip: true });
        ctx.withPal('off', () => put(C(4), 'state off', {}));
        // registration: f_bust under boy_bust under cat_bust, outlines only
        const R = { x: 1470, y: 250, w: 420, h: 560 };
        for (const [n, role] of [['f_bust', 'text'], ['boy_bust', 'me'], ['cat_bust', 'sub']]) art.inks(ctx, n, art.fit(n, R), { plates: [{ ink: 'black', role, alpha: 0.5 }] });
        label(ctx, 'black plates registered', R.x - 60, R.y - 20);
      },
    },
    {                                                               // f_eye at the tightest framing of the film (161.88 / 162.81): mirrored, 1.72x
      palette: 'error',
      render(ctx) {
        ground(ctx, { light: null, marks: false });
        art.inks(ctx, 'f_eye', { x: -211, y: -153, w: 2157, h: 2157 }, { flip: true });
      },
    },
    {                                                               // f_reach: the lowest band across the whole frame (170.19)
      palette: 'error',
      render(ctx) {
        ground(ctx, { light: null, marks: false });
        const band = { x: 0, y: 904, w: 1086, h: 544 }, k = 1920 / band.w;
        art.inks(ctx, 'f_reach', { x: 0, y: 1080 - band.h * k, w: 1920, h: band.h * k }, { crop: band });
      },
    },
    {                                                               // the same framing as a bitmap, for comparison (must look softer)
      palette: 'error',
      render(ctx) {
        ground(ctx, { light: null, marks: false });
        art.inks(ctx, 'f_eye', { x: -211, y: -153, w: 2157, h: 2157 }, { flip: true, vector: false });
      },
    },
  ];
}

function wallCards({ art }) {
  const one = (name, pal, o = {}) => ({ palette: pal, render(ctx, t) { room(ctx, { art, name, alpha: 0.5, t, ...o }); label(ctx, `room: ${name} / ${pal}`); marks(ctx, { target: false }); } });
  return [one('tea', 'warm'), one('rain', 'on'), one('rain', 'off'), one('library', 'ash'), one('tea', 'error', { alpha: 0.2 })];
}

export function labShots(env, set, extra = {}) {
  const sets = { inks: inkCards, walls: wallCards };
  const cards = sets[set]?.(env) ?? extra[set] ?? [{ palette: 'on', render: (ctx) => label(ctx, `unknown lab set "${set}"`, 60, 540) }];
  return cards.map((c, i) => ({ id: `lab-${set}-${i}`, at: i, palette: c.palette ?? 'on', hud: 0, moment: 'check card', camera: c.camera, render: (ctx, t, f, u) => c.render(ctx, t - i, f, u) }));
}

/** Collects the check cards section modules export: { setName: [card, ...] } (index.js hands it to labShots). */
export async function labExtra(env) {
  const out = {};
  for (const [file, fn] of LAB_SOURCES) {
    try { const mod = await import(file); if (mod[fn]) Object.assign(out, mod[fn](env)); } catch { /* not built yet */ }
  }
  return out;
}
