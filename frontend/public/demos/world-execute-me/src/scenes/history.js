// HISTORY (v4): what flows under the spark while the user drags the AI's knowledge date back (04_pre1.js, pre1-date).
// One strip of cut paper in the three inks, far longer than the frame. From the right (now) to the left (then):
//
//   [now]  towers  ·  spires  ·  a colonnade  ·  [the era line]  ·  a stepped temple  ·  a long empty horizon  ·  pyramids
//
// on one low line of roofs that joins them. Between two landmarks is a gap, and the gaps are where the spark is at the
// end of each pull of the hand (STOPS): what it has passed stands to its right, what it still knows to its left. Every landmark is a few LARGE flat shapes: no rows of thin columns, no
// arcades, nothing that would flicker when the strip is pulled fast. A landmark is drawn in one of three ways:
//
//   'dark'     one flat dark shape (what is seen while the strip moves fast; also the base of the inked state)
//   'ink'      its cream and orange plates printed onto that shape (as it slows)
//   'hollow'   only its outline: the spark has passed it, it is no longer known
//
// World x: 0 = now, negative = the past (strip units; 04_pre1.js maps years onto it and draws it at 0.86). y: 0 = the ground, up is negative.
// Pure functions; lab set `history` shows the whole strip in one still (it has to read at a third of that size too).
import { ground } from '../components/plate.js';
import { rand } from '../engine/prng.js';

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const disc = (x, y, r, n = 20) => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * 6.2832), y + r * Math.sin((i / n) * 6.2832)]);

/** [ink, outline] in print order. k = black (the silhouette itself), c = cream, o = orange. */
export const ERAS = [
  {
    name: 'towers', x: -520, w: 680, parts: [
      ['k', [[-330, 0], [-330, -40], [-300, -40], [-300, -300], [-150, -300], [-150, -60], [-140, -60], [-140, -430], [-110, -430], [-110, -470], [-62, -470], [-62, -548], [-48, -548], [-48, -470], [10, -470], [10, -430], [40, -430], [40, -60], [60, -60], [60, -250], [190, -250], [190, -60], [200, -60], [200, -320], [310, -384], [310, -40], [330, -40], [330, 0]]],
      ['c', rect(-112, -410, 44, 300)], ['c', rect(-276, -272, 102, 34)], ['c', rect(-276, -204, 102, 34)], ['c', rect(84, -222, 82, 112)],
      ['o', [[200, -320], [310, -384], [310, -330], [200, -266]]], ['o', rect(-62, -548, 14, 78)],
    ],
  },
  {
    name: 'spires', x: -1410, w: 620, parts: [
      ['k', [[-300, 0], [-300, -40], [-262, -40], [-262, -190], [-232, -190], [-232, -330], [-181, -530], [-130, -330], [-130, -214], [0, -272], [130, -214], [130, -330], [181, -530], [232, -330], [232, -190], [262, -190], [262, -40], [300, -40], [300, 0]]],
      ['c', disc(0, -150, 46)], ['c', [[-34, 0], [-34, -74], [0, -104], [34, -74], [34, 0]]],
      ['o', [[-206, -430], [-181, -530], [-156, -430]]], ['o', [[156, -430], [181, -530], [206, -430]]],
    ],
  },
  {
    name: 'colonnade', x: -2340, w: 740, parts: [
      ['k', [[-370, 0], [-370, -30], [-334, -30], [-334, -250], [-352, -250], [-352, -292], [0, -404], [352, -292], [352, -250], [334, -250], [334, -30], [370, -30], [370, 0]]],
      ...[-264, -132, 0, 132, 264].map((x) => ['c', rect(x - 31, -250, 62, 220)]),
      ['o', [[-246, -294], [0, -372], [246, -294]]],
    ],
  },
  {
    name: 'stepped temple', x: -3320, w: 700, parts: [
      ['k', [[-350, 0], [-350, -110], [-236, -110], [-236, -212], [-128, -212], [-128, -300], [128, -300], [128, -212], [236, -212], [236, -110], [350, -110], [350, 0]]],
      ['c', [[-30, 0], [-30, -300], [30, -300], [30, 0]]],              // the stair up its middle
      ['o', rect(-128, -300, 256, 26)],
    ],
  },
  {
    name: 'pyramids', x: -5798, w: 1040, parts: [
      ['k', [[-580, 0], [-372, -236], [-164, 0]]], ['c', [[-372, -236], [-164, 0], [-330, 0]]],
      ['k', [[236, 0], [352, -138], [468, 0]]], ['c', [[352, -138], [468, 0], [376, 0]]],
      ['k', [[-306, 0], [0, -346], [306, 0]]], ['c', [[0, -346], [306, 0], [62, 0]]], ['o', [[-34, -308], [0, -346], [34, -308], [7, -308]]],
    ],
  },
];
/** Where the strip ends on either side: far beyond the pyramids; now. */
export const SPAN = [-6800, 0];
/**
 * Where the spark is at the end of each pull, right to left: now · just short of the towers · between towers and spires ·
 * between spires and colonnade · ON THE ERA LINE · beyond the stepped temple · the end, with the pyramids before it.
 */
export const STOPS = [0, -100, -980, -1840, -2840, -3800, -5200];
export const ERA_LINE = STOPS[4];

/**
 * The low line of roofs all of it stands on: flat steps of unequal width, nowhere higher than a tenth of a landmark,
 * and flat on the ground under a landmark (so that an outline of the strip is one line, not two).
 */
const ROOFS = (() => {
  const foot = ERAS.map((e) => { const xs = e.parts.filter(([ink]) => ink === 'k').flatMap(([, pts]) => pts.map(([x]) => x + e.x)); return [Math.min(...xs) - 6, Math.max(...xs) + 6]; });
  const top = [];
  const put = (xa, xb, h) => { if (xb - xa > 1) top.push([xa, -h], [xb, -h]); };
  for (let x = SPAN[0], i = 0; x < SPAN[1]; i++) {
    const w = 170 + 190 * rand(4411, i), h = 18 + 40 * rand(4412, i), xb = Math.min(SPAN[1], x + w);
    let at = x;                                                          // (the last step ends at now: beyond it there is nothing)
    for (const [fa, fb] of foot.filter(([fa, fb]) => fb > x && fa < xb).sort((p, q) => p[0] - q[0])) { put(at, Math.max(at, fa), h); put(Math.max(at, fa), Math.min(xb, fb), 0); at = Math.min(xb, fb); }
    put(at, xb, h);
    x = xb;
  }
  return [[SPAN[0], 0], ...top, [SPAN[1], 0]];
})();

/**
 * The strip, with world x = 0 drawn at screen x = `scroll` and its ground at screen y = gy, at `scale`.
 *   mode    'dark' | 'ink' | 'hollow' (see above);  alpha;  from / to = the screen x range to draw (what lies outside is skipped)
 * Clip it yourself (the known side and the forgotten side of the spark are two calls).
 */
export function strip(ctx, scroll, gy, mode, { scale = 1, alpha = 1, from = -60, to = 1980, dark = 'panel', edge = 'sub', width = 3 } = {}) {
  if (!(alpha > 0.003)) return;
  const at = (ox) => (pts) => pts.map(([x, y]) => [scroll + (x + ox) * scale, gy + y * scale]);
  if (mode !== 'ink') {
    const p = at(0)(ROOFS.filter(([x]) => scroll + x * scale > from - 400 && scroll + x * scale < to + 400));
    if (p.length > 2) { if (mode === 'dark') ctx.poly([[p[0][0], gy], ...p, [p[p.length - 1][0], gy]], { close: true, fill: true, color: dark, alpha }); else ctx.poly(p, { color: edge, width, alpha }); }
  }
  for (const era of ERAS) {
    const ox = scroll + era.x * scale, half = (era.w / 2 + 80) * scale;
    if (ox + half < from || ox - half > to) continue;
    const put = at(era.x);
    for (const [ink, pts] of era.parts) {
      if (mode === 'hollow') { if (ink === 'k') ctx.poly(put(pts), { close: true, color: edge, width, alpha }); }
      else if (mode === 'dark') { if (ink === 'k') ctx.poly(put(pts), { close: true, fill: true, color: dark, alpha }); }
      else ctx.poly(put(pts), { close: true, fill: true, color: ink === 'k' ? dark : ink === 'c' ? 'text' : 'me', alpha });
    }
  }
}

// ---------------------------------------------------------------------------------------------- check cards
export function labCards() {
  const sky = (ctx, y, h) => ctx.gradRect(0, y, 1920, h, [[0, 'line', 0], [1, 'line', 0.85]]);
  // the whole strip in one still, at a quarter of its size in the film: dark, inked, hollow. It has to read here
  const whole = {
    palette: 'on',
    render(ctx) {
      ground(ctx, { light: null, tone: 'raised', dots: 0.5 });
      const k = 1840 / (SPAN[1] - SPAN[0]), x0 = 40 - SPAN[0] * k;
      [['dark'], ['dark', 'ink'], ['hollow']].forEach((modes, j) => {
        const gy = 330 + 300 * j;
        sky(ctx, gy - 200, 200);
        for (const m of modes) strip(ctx, x0, gy, m, { scale: k, from: -1e5, to: 1e5, width: 2 });
        for (const w of STOPS) ctx.circle(x0 + w * k, gy + 16, 5, { fill: true, color: w === ERA_LINE ? 'text' : 'me' });
      });
    },
  };
  // and what the frame holds at the end of each pull (the spark in its gap; inked to its left, hollow to its right)
  const stop = (i) => ({
    palette: 'on',
    render(ctx) {
      ground(ctx, { light: null, tone: 'raised', dots: 0.5 });
      const K = 0.86, kx = [1560, 1540, 1440, 1350, 1260, 1170, 1090][i], sc = kx - STOPS[i] * K, gy = 640;
      ctx.clip({ x: 0, y: 100, w: kx, h: gy - 100 }, () => { sky(ctx, 100, gy - 100); strip(ctx, sc, gy, 'dark', { scale: K }); strip(ctx, sc, gy, 'ink', { scale: K }); });
      ctx.clip({ x: kx, y: 100, w: 1920 - kx, h: gy - 100 }, () => strip(ctx, sc, gy, 'hollow', { scale: K }));
      ctx.circle(kx, gy + 66, 46, { fill: true, color: 'me' });
    },
  });
  return { history: [whole, ...STOPS.map((_, i) => stop(i))] };
}
