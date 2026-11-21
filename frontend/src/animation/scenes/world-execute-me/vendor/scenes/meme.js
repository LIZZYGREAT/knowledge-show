// A STICKER for the comment section (not part of the film): the cat-eared figure with her paws up (cat_paws), in
// tears, and what she says. Rendered as a check card (lab.js) through the film's own pipeline:
//
//   node export/export.mjs --lab meme --sheet out/meme/meme_16x9.png --times 0 --cols 1 --width 3840 --height 2160
//
// and the middle square is cut out of it afterwards (ffmpeg: crop=2160:2160:840:0). Everything stands inside that
// square (x 420 … 1500 of the 1920 x 1080 frame).
//
// She is the supplied silhouette, untouched: the tears, the blush and the shaking are drawn over her in the film's
// inks (cream with a dark edge, the error's rose for the blush). Her line is set in Noto Sans TC 900 (config.json
// fonts.cjk -> memeSans: only the characters of this line are loaded); the one Latin word in it is the system's mono.
import { ground } from '../components/plate.js';

/** Her figure on the sheet: the top edge of the art cuts her ears, so it lies just above the frame. */
const H = 812, FIG = { x: 960 - (H * 1086) / 1448 / 2 + 6, y: -12, w: (H * 1086) / 1448, h: H }, K = H / 1448;
/** A point of the art (source px) on the sheet. */
const at = ([x, y]) => [FIG.x + x * K, FIG.y + y * K];
/** Her line, as the user wrote it, in two rows (the line break stands for its comma, and it has no full stop: a sticker). The second row carries one Latin word. */
const ROW1 = '不要嘲笑我做的视频', ROW2 = ['这都是我用', 'token', '一点一点画出来的'];

/** A tear: cream with a dark edge and a small light, hanging at (x, y); r = its width / 2. */
function tear(ctx, x, y, r, rot = 0) {
  const g = ctx.g;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, -r * 1.75);
  g.bezierCurveTo(r * 0.95, -r * 0.45, r * 1.02, r * 0.4, 0, r);
  g.bezierCurveTo(-r * 1.02, r * 0.4, -r * 0.95, -r * 0.45, 0, -r * 1.75);
  g.closePath();
  g.fillStyle = ctx.col('text', 1); g.fill();
  g.lineWidth = Math.max(3, r * 0.26); g.lineJoin = 'round'; g.strokeStyle = ctx.col('panel', 1); g.stroke();
  g.beginPath(); g.ellipse(-r * 0.3, r * 0.1, r * 0.2, r * 0.36, 0.3, 0, Math.PI * 2); g.fillStyle = ctx.col('meHot', 0.85); g.fill();
  g.restore();
}
/** The blush under an eye: three short strokes in the rose of the error. */
function blush(ctx, x, y, s) {
  for (let i = -1; i <= 1; i++) ctx.line(x + i * 13 * s - 5 * s, y + 9 * s, x + i * 13 * s + 5 * s, y - 9 * s, { color: 'err', width: 5 * s, alpha: 0.9 });
}
/** She is shaking: a pair of short arcs beside a point, on the side `dir` (+1 right, -1 left). */
function shake(ctx, x, y, dir, s = 1) {
  for (const [d, r] of [[0, 30], [20, 40]]) ctx.circle(x + dir * d * s, y, r * s, { color: 'sub', width: 5 * s, a0: dir > 0 ? -0.55 : Math.PI - 0.55, a1: dir > 0 ? 0.55 : Math.PI + 0.55 });
}
/** A row of type with its shadow plate and a dark edge: parts = [[string, font role, weight, colour], ...], centred on x. */
function row(ctx, parts, x, y, size) {
  const w = parts.map(([str, font, weight]) => ctx.measure(str, { size: font === 'mono' ? size * 0.96 : size, weight, font }) + (font === 'mono' ? size * 0.28 : 0));
  let px = x - w.reduce((a, b) => a + b, 0) / 2;
  parts.forEach(([str, font, weight, color], i) => {
    const o = { size: font === 'mono' ? size * 0.96 : size, weight, font }, tx = px + (font === 'mono' ? size * 0.14 : 0);
    ctx.text(str, tx + size * 0.07, y + size * 0.07, { ...o, color: 'bg' });
    ctx.text(str, tx, y, { ...o, color: 'panel', stroke: size * 0.16 });
    ctx.text(str, tx, y, { ...o, color });
    px += w[i];
  });
}

export function labCards(env) {
  const { art } = env;
  return {
    meme: [{
      palette: 'warm',
      render(ctx) {
        ground(ctx, { light: [960, 400, 540, 'raised', 1], marks: false });
        // her, with a shadow plate under her (the print of the film)
        art.inks(ctx, 'cat_paws', { ...FIG, x: FIG.x + 16, y: FIG.y + 16 }, { plates: [{ ink: 'all', role: 'bg' }] });
        art.inks(ctx, 'cat_paws', FIG);
        // the tears: one swelling under each closed eye, one already on its way down
        const eyes = (art.region('cat_paws', 'eyes.0') && art.region('cat_paws', 'eyes.1')) ? ['eyes.0', 'eyes.1'].map((k) => { const r = art.region('cat_paws', k); return [r.x, r.y]; }) : [[690, 430], [520, 515]];
        const [eR, eL] = eyes.map(at);                                    // (on the sheet: eR is the eye at the right)
        // (placed by eye on a 4K render: the tears hang from the outer corners of her lowered lids, clear of her paws and her ribbon)
        blush(ctx, eR[0] - 26, eR[1] + 46, 1); blush(ctx, eL[0] + 15, eL[1] + 30, 1);
        tear(ctx, eR[0] + 5, eR[1] + 30, 17, -0.1); tear(ctx, eR[0] + 13, eR[1] + 72, 10, -0.08);
        tear(ctx, eL[0] - 21, eL[1] + 30, 18, 0.16);
        // she is shaking: beside her shoulders
        shake(ctx, FIG.x + FIG.w + 4, 470, 1); shake(ctx, FIG.x - 4, 520, -1);
        // what she says
        row(ctx, [[ROW1, 'memeSans', 900, 'text']], 960, 902, 92);
        row(ctx, [[ROW2[0], 'memeSans', 900, 'text'], [ROW2[1], 'mono', 800, 'me'], [ROW2[2], 'memeSans', 900, 'text']], 960, 992, 60);
        ctx.text('// token × 1,013,359,536', 960, 1046, { size: 26, font: 'mono', color: 'sub', align: 'center' });
        ctx.fx.glow = 0.3; ctx.fx.scan = 0; ctx.fx.vignette = 0.5; ctx.fx.zoom = 1; ctx.fx.bright = 1.04;
      },
    }],
  };
}
