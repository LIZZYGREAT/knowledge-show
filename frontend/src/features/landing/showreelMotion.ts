export const SHOWREEL_DURATION = 30;
export const STATIC_SHOWREEL_TIME = 6.8;

export type ShowreelAct = {
  id: "dice" | "prism" | "pn";
  index: string;
  label: string;
  question: string;
  caption: string;
  prompt: string;
  seekTo: number;
};

export const SHOWREEL_ACTS: readonly ShowreelAct[] = [
  {
    id: "dice",
    index: "01",
    label: "概率直觉",
    question: "为什么两个骰子最容易掷出 7？",
    caption: "36 种等可能组合落成钟形分布，和为 7 独占 6 种。",
    prompt: "为什么两个骰子掷出 7 的概率最高？请用直观动画展示 36 种组合如何形成分布规律。",
    seekTo: 2.2,
  },
  {
    id: "prism",
    index: "02",
    label: "棱镜色散",
    question: "白光穿过棱镜，为何散出彩虹？",
    caption: "不同波长的光在玻璃中速度不同，红光偏折小、紫光偏折大。",
    prompt: "一束白光穿过三棱镜后为什么会散开成七色彩虹？请直观演示不同波长的折射差异。",
    seekTo: 12.6,
  },
  {
    id: "pn",
    index: "03",
    label: "PN 结阀门",
    question: "同一个 PN 结，为何只让电流单向通过？",
    caption: "正接时势垒变窄载流子畅行，反接时势垒加宽电流截止。",
    prompt: "同一个 PN 结，为什么正向接通能导电、反向接通就会截止？请展示载流子与势垒的变化。",
    seekTo: 22.0,
  },
] as const;

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function smoothstep(t: number, a: number, b: number) {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
}

export function easeOutCubic(u: number) {
  const x = clamp01(u);
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(u: number) {
  const x = clamp01(u);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function easeOutBack(u: number) {
  const x = clamp01(u);
  const c1 = 1.45;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function showreelCycle(time: number) {
  const mod = time % SHOWREEL_DURATION;
  return mod < 0 ? mod + SHOWREEL_DURATION : mod;
}

export function activeActAt(cycle: number): ShowreelAct {
  if (cycle < 10) return SHOWREEL_ACTS[0];
  if (cycle < 20) return SHOWREEL_ACTS[1];
  return SHOWREEL_ACTS[2];
}

export function actOpacities(cycle: number) {
  const dice =
    smoothstep(cycle, 0, 0.7) * (1 - smoothstep(cycle, 9.1, 10.1));
  const prism =
    smoothstep(cycle, 9.6, 10.7) * (1 - smoothstep(cycle, 19.1, 20.1));
  const pn =
    smoothstep(cycle, 19.6, 20.7) * (1 - smoothstep(cycle, 28.9, 29.85));
  return { dice, prism, pn };
}

export function seedPositionAt(cycle: number): [number, number] {
  const p1 = smoothstep(cycle, 9.2, 10.8);
  const p2 = smoothstep(cycle, 19.2, 20.8);
  const p3 = smoothstep(cycle, 28.8, 30);

  // Act 1 focal point: hovers gently near the golden 7 peak
  const a1x = 468 + Math.sin(cycle * 1.4) * 6;
  const a1y = 216 + Math.cos(cycle * 1.1) * 5;
  // Act 2 focal point: shimmering at the prism apex refraction point
  const a2x = 398 + Math.sin(cycle * 1.6) * 5;
  const a2y = 214 + Math.cos(cycle * 1.2) * 4;
  // Act 3 focal point: centered above the PN junction seam
  const a3x = 350 + Math.sin(cycle * 1.5) * 6;
  const a3y = 248 + Math.cos(cycle * 1.3) * 4;

  let x = lerp(a1x, a2x, p1);
  let y = lerp(a1y, a2y, p1);
  x = lerp(x, a3x, p2);
  y = lerp(y, a3y, p2);
  x = lerp(x, a1x, p3);
  y = lerp(y, a1y, p3);
  return [x, y];
}

export const SPECTRAL_BANDS = [
  { color: "#e35d52", wavelength: 52, yEnd: 244, label: "长波 · 红" },
  { color: "#ee9a38", wavelength: 44, yEnd: 288, label: "橙" },
  { color: "#1db48e", wavelength: 37, yEnd: 332, label: "绿" },
  { color: "#348ce3", wavelength: 31, yEnd: 376, label: "蓝" },
  { color: "#6c67df", wavelength: 26, yEnd: 420, label: "短波 · 紫" },
] as const;

export function spectralWavePath(bandIndex: number, cycle: number, reveal: number) {
  const band = SPECTRAL_BANDS[bandIndex];
  const x0 = 438 + bandIndex * 3.5;
  const y0 = 294 + bandIndex * 11;
  const x1 = 716;
  const y1 = band.yEnd;
  const steps = 42;
  const points: string[] = [];
  const endStep = Math.max(1, Math.round(steps * clamp01(reveal)));
  for (let i = 0; i <= endStep; i++) {
    const u = i / steps;
    const x = lerp(x0, x1, u);
    const base = lerp(y0, y1, u);
    const amp = 7.5 * Math.sin(u * Math.PI * 0.85) * smoothstep(u, 0, 0.14);
    const phase = (x - x0) / band.wavelength * Math.PI * 2 - cycle * 4.4;
    const y = base + Math.sin(phase) * amp;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export type SharedBead = {
  x: number;
  y: number;
  r: number;
  fill: string;
  stroke: string;
  opacity: number;
  highlight: boolean;
};

export function sharedBeadState(index: number, cycle: number): SharedBead {
  const row = Math.floor(index / 6);
  const col = index % 6;
  const sum = row + col + 2;
  const isSeven = sum === 7;

  // Act 1: Dice -> 6x6 Grid -> 11-column histogram
  const launch = easeInOutCubic((cycle - (1.4 + (row + col) * 0.055)) / 1.15);
  const drop = easeInOutCubic((cycle - (4.6 + row * 0.09)) / 1.1);
  const srcX = index % 2 === 0 ? 196 : 284;
  const srcY = 278;
  const gridX = 432 + col * 42;
  const gridY = 204 + row * 34;
  const rank = row - Math.max(0, sum - 7);
  const histX = 398 + (sum - 2) * 30;
  const histY = 474 - rank * 22;

  const arc1 = Math.sin(launch * Math.PI) * 34;
  const gx = lerp(srcX, gridX, launch);
  const gy = lerp(srcY, gridY, launch) - arc1;
  const a1x = lerp(gx, histX, drop) + Math.sin(drop * Math.PI) * (row - 2.5) * 6;
  const a1y = lerp(gy, histY, drop) - Math.sin(drop * Math.PI) * 18;
  const a1r = lerp(5.5, isSeven ? 8.2 : 6.6, launch) * lerp(1, 0.96, drop);

  // Bridge 1->2 & Act 2: Photons entering left beam -> surfing spectral waves
  const toBeam = smoothstep(cycle, 8.9, 10.3);
  const bandIndex = index % 5;
  const band = SPECTRAL_BANDS[bandIndex];
  const travel = ((cycle - 10.2) * 0.44 + (index * 0.137)) % 1;
  const u = travel < 0 ? travel + 1 : travel;
  const inBeam = u < 0.34;
  const beamU = u / 0.34;
  const waveU = (u - 0.34) / 0.66;
  const x0 = 438 + bandIndex * 3.5;
  const y0 = 294 + bandIndex * 11;
  const wx = inBeam ? lerp(88, 355, beamU) : lerp(x0, 712, waveU);
  const wy = inBeam
    ? lerp(346, 312, beamU) + ((index % 3) - 1) * 3
    : lerp(y0, band.yEnd, waveU) +
      Math.sin(((wx - x0) / band.wavelength) * Math.PI * 2 - cycle * 4.4) *
        7.5 *
        Math.sin(waveU * Math.PI * 0.85);

  // Bridge 2->3 & Act 3: Carriers in PN junction (forward then reverse)
  const toPn = smoothstep(cycle, 19.0, 20.5);
  const pnLocal = Math.max(0, cycle - 20);
  const reverse = smoothstep(pnLocal, 4.4, 5.5);
  const isHole = index % 2 === 0;
  const laneY = 278 + ((index % 5) - 2) * 24;
  const forwardFlow = ((pnLocal * 0.24 + index * 0.083) % 1);
  const forwardX = isHole
    ? lerp(144, 514, forwardFlow)
    : lerp(514, 144, forwardFlow);
  // Under reverse bias, holes pull left (150..255) and electrons pull right (405..510)
  const pullLeft = 152 + ((index * 23) % 98) + Math.sin(cycle * 2.2 + index) * 4;
  const pullRight = 408 + ((index * 29) % 98) + Math.cos(cycle * 2.2 + index) * 4;
  const pnX = lerp(forwardX, isHole ? pullLeft : pullRight, reverse);
  const pnY = laneY + Math.sin(cycle * 3 + index * 1.4) * (3.5 * (1 - reverse * 0.4));

  // Seamless Bridge 3->1
  const toStart = smoothstep(cycle, 28.8, 29.95);

  let x = lerp(a1x, wx, toBeam);
  let y = lerp(a1y, wy, toBeam);
  x = lerp(x, pnX, toPn);
  y = lerp(y, pnY, toPn);
  x = lerp(x, srcX, toStart);
  y = lerp(y, srcY, toStart);

  let r = lerp(a1r, inBeam ? 4.4 : 4.8, toBeam);
  r = lerp(r, isHole ? 5.8 : 5.2, toPn);
  r = lerp(r, 4.5, toStart);

  let fill = isSeven && launch > 0.45 ? "#f0a43b" : "#89d6c6";
  let stroke = isSeven && launch > 0.45 ? "#c97a16" : "#2e8b7a";
  if (toBeam > 0.5 && toPn <= 0.5) {
    fill = inBeam ? "#f6b95b" : band.color;
    stroke = "#ffffff";
  } else if (toPn > 0.5) {
    fill = isHole ? "#e66b5b" : "#348ce3";
    stroke = "#ffffff";
  }

  const opacity =
    cycle < 1.3
      ? 0
      : cycle < 9.5
        ? clamp01(launch * 1.5)
        : 1 - toStart * 0.9;

  return {
    x,
    y,
    r,
    fill,
    stroke,
    opacity,
    highlight: isSeven && cycle >= 2.6 && cycle <= 9.2,
  };
}
