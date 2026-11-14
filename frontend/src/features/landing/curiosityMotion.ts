export const STAGE_DURATION = 16;
export const INK_INTRO = 3.2;
export const STATIC_STAGE_TIME = INK_INTRO + 8.1;
export function easeBetween(t: number, a: number, b: number) {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
export function stageState(time: number) {
  const phase = ((time % STAGE_DURATION) + STAGE_DURATION) % STAGE_DURATION;
  const t = Math.max(0, Math.min(10.5, phase - INK_INTRO));
  return { t,
    unfold: easeBetween(t, 3.2, 4.2) * (1 - easeBetween(t, 9.3, 10.3)),
    result: easeBetween(t, 7, 7.8) * (1 - easeBetween(t, 8.8, 9.4)),
    roll: easeBetween(t, 1.4, 1.8) * (1 - easeBetween(t, 2.5, 3.2)),
  };
}
// One point per ordered pair travels from a die, through the matrix, to its sum.
export function combinationState(index: number, time: number) {
  const { t } = stageState(time);
  const row = Math.floor(index / 6), col = index % 6, sum = row + col + 2;
  const delay = (row + col) * .035;
  const grow = easeBetween(t, 3.45 + delay, 4.65 + delay) * (1 - easeBetween(t, 9.5, 10.35));
  const gather = easeBetween(t, 6.8 + row * .045, 7.6 + row * .045) * (1 - easeBetween(t, 8.9, 9.5));
  const source = index % 2 ? 323 : 234;
  const x = source + (435 + col * 34 - source) * grow;
  const y = 245 + (228 + row * 30 - 245) * grow - Math.sin(grow * Math.PI) * 48;
  const rank = row - Math.max(0, sum - 7);
  return {
    x: x + (427 + (sum - 2) * 20 - x) * gather + Math.sin(gather * Math.PI) * (row - 2.5) * 9,
    y: y + (466 - rank * 10 - y) * gather - Math.sin(gather * Math.PI) * 30,
    radius: (10 - gather * 6.6) * (.5 + grow * .5), opacity: grow,
    highlight: sum === 7 ? easeBetween(t, 5.1 + row * .15, 5.5 + row * .15) * (1 - easeBetween(t, 9.5, 10.1)) : 0,
    win: sum === 7, gather,
  };
}

// The original silk folds into the same point that opens the ink reveal.
// All values settle before the cycle ends, leaving no reset at the seam.
export function inkState(time: number) {
  const phase = ((time % STAGE_DURATION) + STAGE_DURATION) % STAGE_DURATION;
  const bloom = easeBetween(phase, 1.6, 3.8) * (1 - easeBetween(phase, 13.3, 15.3));
  const fold = easeBetween(phase, .55, 1.8) * (1 - easeBetween(phase, 14.5, 15.8));
  const silkOpacity = 1 - easeBetween(phase, 1.15, 1.85) * (1 - easeBetween(phase, 14.7, 15.8));
  const travel = easeBetween(phase, .8, 2.2) * (1 - easeBetween(phase, 14.5, 15.4));
  const form = easeBetween(phase, 1.65, 3.15) * (1 - easeBetween(phase, 13.8, 15));
  const presence = easeBetween(phase, .65, 1.05) * (1 - easeBetween(phase, 15.2, 15.65));
  const turn = easeBetween(phase, .8, 3.15) * (1 - easeBetween(phase, 13.8, 15.65)) * Math.PI * 2;
  const lift = easeBetween(phase, 1.1, 2.7) * (1 - easeBetween(phase, 14, 15.5));
  const vortexOpacity = presence * (1 - easeBetween(phase, 6, 6.8) * (1 - easeBetween(phase, 13.7, 14.5)));
  return { bloom, fold, silkOpacity, travel, form, presence, turn, lift, vortexOpacity, scale: 1 - fold * .94,
    flowTime: 5.5 + Math.sin(phase / STAGE_DURATION * Math.PI * 2) * 1.1,
  };
}

export function inkContour(progress: number) {
  // Fixed organic lobes expand with the wet edge instead of jittering per frame.
  const points = Array.from({ length: 81 }, (_, i) => {
    const angle = i / 80 * Math.PI * 2;
    const lobe = 1 + .045 * Math.sin(angle * 5 + .7) + .025 * Math.sin(angle * 9 - .6);
    return [360 + Math.cos(angle) * 420 * progress * lobe,
      305 + Math.sin(angle) * 285 * progress * lobe];
  });
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("") + "Z";
}
