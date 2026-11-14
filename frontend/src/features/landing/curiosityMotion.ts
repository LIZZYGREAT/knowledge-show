export const STAGE_DURATION = 10.5;
export const STATIC_STAGE_TIME = 8.1;
export function easeBetween(t: number, a: number, b: number) {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
export function stageState(time: number) {
  const t = ((time % STAGE_DURATION) + STAGE_DURATION) % STAGE_DURATION;
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
    highlight: sum === 7 ? easeBetween(t, 5.1 + row * .15, 5.5 + row * .15) : 0,
    win: sum === 7, gather,
  };
}
