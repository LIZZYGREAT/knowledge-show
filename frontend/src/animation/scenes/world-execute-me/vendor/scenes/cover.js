// THE COVER (not part of the film): one still for the video's thumbnail, rendered through the real pipeline as a
// check card (lab.js), so it is made of exactly what the film is made of.
//
//   node export/export.mjs --lab cover --sheet out/cover/cover_16x9.png --times 0 --cols 1 --width 3840 --height 2160
//
// The picture: her face full bleed (f_eye, the frame the last chorus opens on), out of register, one eye looking
// straight out, the world turning in her iris; the sheet torn in three bands; and the title of the song as a call
// typed into the picture: three rows of mono type on strips of black paper, whole, set over the tear.
// A thumbnail is seen about 300 px wide and is cut to other shapes by the site: everything that matters (her eye,
// her flower, the title) stands inside the middle 4:3 of the frame (x 240 … 1680), and the title's capitals are
// about a tenth of the frame's height.
import { marks } from '../components/plate.js';
import { PAL, expose, inkScreen, livePlates, world } from './climax.js';
import { EYE } from './shared.js';

const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
/**
 * Her face is closer than the film ever shows it in this shot (Z times the registration of shared.js EYE: drawn as
 * paths, so it stays sharp), and her eye stands at AT_EYE: left of the middle, where a thumbnail is looked at first.
 * Her flower comes in from the top left corner.
 */
const Z = 1.32, AT_EYE = [610, 640];
const FACE = { x: AT_EYE[0] - (EYE.eye[0] - EYE.x) * Z, y: AT_EYE[1] - (EYE.eye[1] - EYE.y) * Z, w: EYE.w * Z, h: EYE.h * Z }, IRIS = { x: AT_EYE[0], y: AT_EYE[1], r: 44 * Z };
/** The instant of the film's eye shot that the moving layers are taken at (the turn of the sphere, the drift of the plates, the scroll). */
const AT = 163.5;
/** The tear: bands of the sheet [y, height, dx] (virtual px), moved sideways. None of them crosses her eye. */
const TEAR = [[70, 44, 110], [318, 20, -64], [956, 50, -150]];

/**
 * The light in her eye, printed (the film's eye shot has it in the middle of the iris; here it is a catch-light, up
 * and to the left of the middle, so that the world in her iris can be seen): a long bar, a short one across, four short rays.
 */
function glint(ctx, x, y) {
  const bar = (len, w, rot, alpha) => ctx.at(x, y, () => ctx.poly([[-len, 0], [0, -w], [len, 0], [0, w]], { close: true, fill: true, color: 'text', alpha }), { rot });
  bar(290, 5, 0, 0.92); bar(104, 4.5, Math.PI / 2, 0.92);
  for (let i = 0; i < 4; i++) bar(54, 3, Math.PI / 4 + (i * Math.PI) / 2 + 0.2, 0.75);
  ctx.circle(x, y, 8, { fill: true, color: 'text' });
}

/** The sheet as drawn so far, torn: each band of TEAR moved sideways (in the layer itself, as climax.js tearSheet does). */
function tear(ctx) {
  const g = ctx.g, c = ctx.canvas, s = ctx.scale, W = c.width;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (const [y, h, dx] of TEAR) g.drawImage(c, 0, Math.round(y * s), W, Math.round(h * s), Math.round(dx * s), Math.round(y * s), W, Math.round(h * s));
  g.restore();
}

/**
 * The title: the call itself, in the system's mono, three rows on strips of black paper with their shadow plate; under
 * the cream type a thin red plate out of register (the print is broken, the title is not); her orange caret after it.
 * Under it, small, the line the film ends on.
 */
function title(ctx) {
  const ROWS = ['world.', 'execute', '(me);'], SIZE = 144, LH = 178, X = 1000, Y = 400, PAD = 28, cw = ctx.cw(SIZE), o = { size: SIZE, font: 'mono', weight: 800 };
  const strip = (x, y, w, h) => { ctx.rect(x + 12, y + 12, w, h, { fill: true, color: 'bg', alpha: 0.55 }); ctx.rect(x, y, w, h, { fill: true, color: 'panel' }); };
  ROWS.forEach((str, i) => {
    const y = Y + i * LH, w = str.length * cw + (i === 2 ? cw * 0.9 : 0);
    strip(X - PAD, y - SIZE * 0.86, w + 2 * PAD, SIZE * 1.16);
    ctx.text(str, X + 7, y + 4, { ...o, color: 'err' });
    ctx.text(str, X, y, { ...o, color: 'text' });
  });
  ctx.rect(X + ROWS[2].length * cw + 12, Y + 2 * LH - SIZE * 0.76, cw * 0.62, SIZE * 0.92, { fill: true, color: 'me' });      // the caret: her orange
  const note = '> last message: unread', ns = 34, ny = Y + 2 * LH + 104;
  strip(X - PAD, ny - ns * 1.05, note.length * ctx.cw(ns) + 2 * PAD, ns * 1.6);
  ctx.text(note, X, ny, { size: ns, font: 'mono', color: 'sub' });
}

export function labCards(env) {
  const { art } = env;
  return {
    cover: [{
      palette: PAL,
      render(ctx) {
        ctx.rect(-10, -10, 1940, 1100, { fill: true, color: 'raised' });       // paper under her
        const lie = livePlates(ctx, art, EYE.name, FACE, AT, { m: 12, flip: EYE.flip });
        inkScreen(ctx, art, EYE.name, FACE, AT, { rect: FULL, size: 15, colW: 370, offset: lie.black, flip: EYE.flip, alpha: 0.6 });
        ctx.circle(IRIS.x, IRIS.y, IRIS.r, { fill: true, color: 'bg' });       // her iris holds the world
        world(ctx, { cx: IRIS.x, cy: IRIS.y, r: IRIS.r - 2, t: AT, energy: 0.85, size: 11, cage: 0, hot: true });
        ctx.circle(IRIS.x, IRIS.y, IRIS.r, { color: 'meHot', width: 3 });
        glint(ctx, IRIS.x - IRIS.r * 0.34, IRIS.y - IRIS.r * 0.36);
        marks(ctx, { color: 'mute' });
        tear(ctx);
        title(ctx);
        expose(ctx, 2, { at: [IRIS.x, IRIS.y], glow: 0.12 });
        ctx.fx.rays = 0.14; ctx.fx.streak = 0.2; ctx.fx.bloomAll = 0.2; ctx.fx.zoom = 1;
      },
    }],
  };
}
