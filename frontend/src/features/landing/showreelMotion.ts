export const SHOWREEL_DURATION = 36;
export const STATIC_SHOWREEL_TIME = 3.7;

export type ShowreelAct = {
  id: "logo" | "dice" | "prism" | "pn";
  index: string;
  label: string;
  question: string;
  caption: string;
  prompt: string;
  seekTo: number;
};

export const SHOWREEL_ACTS: readonly ShowreelAct[] = [
  {
    id: "logo",
    index: "00",
    label: "品牌序幕",
    question: "Knowledge.Show(me)",
    caption: "折光棱镜与字标合为一体，把抽象原理折射成看得见的动态直觉。",
    prompt: "为什么两个骰子掷出 7 的概率最高？请用直观动画展示 36 种组合如何形成分布规律。",
    seekTo: 0.0,
  },
  {
    id: "dice",
    index: "01",
    label: "概率直觉",
    question: "为什么两个骰子最容易掷出 7？",
    caption: "36 种等可能组合落成钟形分布，和为 7 独占 6 种。",
    prompt: "为什么两个骰子掷出 7 的概率最高？请用直观动画展示 36 种组合如何形成分布规律。",
    seekTo: 7.4,
  },
  {
    id: "prism",
    index: "02",
    label: "棱镜色散",
    question: "白光穿过棱镜，为何散出彩虹？",
    caption: "不同波长的光在玻璃中速度不同，红光偏折小、紫光偏折大。",
    prompt: "一束白光穿过三棱镜后为什么会散开成七色彩虹？请直观演示不同波长的折射差异。",
    seekTo: 18.2,
  },
  {
    id: "pn",
    index: "03",
    label: "PN 结阀门",
    question: "同一个 PN 结，为何只让电流单向通过？",
    caption: "正接时耗尽层变窄载流子畅行，反接时耗尽层加宽电流截止。",
    prompt: "同一个 PN 结，为什么正向接通能导电、反向接通就会截止？请展示空穴、电子与耗尽层的变化。",
    seekTo: 27.2,
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

export function easeOutExpo(u: number) {
  const x = clamp01(u);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
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
  if (cycle < 6.4) return SHOWREEL_ACTS[0];
  if (cycle < 16.0) return SHOWREEL_ACTS[1];
  if (cycle < 25.4) return SHOWREEL_ACTS[2];
  return SHOWREEL_ACTS[3];
}

export function actOpacities(cycle: number) {
  const logo = 1 - smoothstep(cycle, 5.1, 6.25);
  const dice =
    smoothstep(cycle, 6.0, 6.9) * (1 - smoothstep(cycle, 15.1, 16.1));
  const prism =
    smoothstep(cycle, 15.6, 16.7) * (1 - smoothstep(cycle, 24.5, 25.5));
  const pn =
    smoothstep(cycle, 25.0, 26.0) * (1 - smoothstep(cycle, 33.9, 34.85));
  return { logo, dice, prism, pn };
}

export type LogoOvertureState = {
  /** Overall visibility of the Act 00 Hero Logo Overture (0 during Acts 1-3!) */
  opacity: number;
  /** Soft daylight optical caustic halo behind the emblem */
  auraOpacity: number;
  /** Whisper-thin architectural prism construction hairlines (fade out cleanly once locked) */
  guideDraw: number;
  guideOpacity: number;
  /** 3 interlocking origami glass planes (easeOutExpo silk settle) */
  spineIn: number;
  upperWingIn: number;
  lowerWingIn: number;
  /** Overlapping refractive glass core + curved 4-point optical starlight aperture */
  coreIn: number;
  starTwist: number;
  /** Sweeping diagonal specular sheen across the prism glass */
  sheenProgress: number;
  /** Subtle weightless floating breath during hold */
  floatY: number;
  /** Masked baseline curtain typography assembly */
  knowledgeIn: number;
  showIn: number;
  meIn: number;
  taglineIn: number;
  /** Sculpted champagne-gold "." diamond jewel on the baseline (0 during Acts 1-3!) */
  dotScale: number;
  dotOpacity: number;
  dotRotation: number;
  /** Unfold & morph-out into Act 1's 36 knowledge particles */
  emblemExit: number;
  emblemScale: number;
  emblemOpacity: number;
  wordmarkExitY: number;
  wordmarkOpacity: number;
  /** Soft converging caustic bloom at end of Act 3 (34.7..36.0) -> seamlessly restarts t=0 */
  returnAuraOpacity: number;
};

export function logoOvertureState(cycle: number): LogoOvertureState {
  const exitWord = smoothstep(cycle, 4.75, 5.55);
  const emblemExit = smoothstep(cycle, 4.95, 6.15);
  const opacity = 1 - emblemExit;

  const auraOpacity = smoothstep(cycle, 0.0, 0.9) * (1 - emblemExit);
  const guideDraw = easeOutExpo(smoothstep(cycle, 0.05, 1.1));
  const guideOpacity =
    smoothstep(cycle, 0.05, 0.45) * (1 - smoothstep(cycle, 1.85, 2.75)) * (1 - emblemExit);

  const spineIn = easeOutExpo(smoothstep(cycle, 0.22, 1.25));
  const upperWingIn = easeOutExpo(smoothstep(cycle, 0.52, 1.55));
  const lowerWingIn = easeOutExpo(smoothstep(cycle, 0.78, 1.8));
  const coreIn = easeOutExpo(smoothstep(cycle, 1.28, 2.12));
  const starTwist = lerp(45, 0, coreIn);

  const sheenProgress = smoothstep(cycle, 2.85, 4.35);
  const floatY = Math.sin(cycle * 1.65) * 2.2 * smoothstep(cycle, 1.8, 2.8) * (1 - emblemExit);

  // Masked baseline curtain reveal (Apple / Pentagram style)
  const knowledgeIn = easeOutExpo(smoothstep(cycle, 1.5, 2.45));
  const showIn = easeOutExpo(smoothstep(cycle, 1.72, 2.68));
  const meIn = easeOutExpo(smoothstep(cycle, 2.05, 2.95));
  const taglineIn = easeOutCubic(smoothstep(cycle, 2.45, 3.25));

  // Sculpted golden diamond "." blooms right on the baseline between Knowledge & Show,
  // and cleanly vanishes with the wordmark before Act 1 starts (zero floating dot during Acts 1-3!).
  const dotAppear = easeOutExpo(smoothstep(cycle, 1.78, 2.52));
  const dotScale = lerp(0.15, 1, dotAppear) * (1 - exitWord * 0.5);
  const dotOpacity = smoothstep(cycle, 1.75, 2.15) * (1 - exitWord);
  const dotRotation = lerp(-45, 0, dotAppear);

  const emblemScale = lerp(1, 0.58, easeInOutCubic(emblemExit));
  const emblemOpacity = (1 - emblemExit) * smoothstep(cycle, 0.15, 0.5);
  const wordmarkExitY = lerp(0, 30, easeInOutCubic(exitWord));
  const wordmarkOpacity = 1 - exitWord;

  const returnAuraOpacity = smoothstep(cycle, 34.65, 35.85);

  return {
    opacity,
    auraOpacity,
    guideDraw,
    guideOpacity,
    spineIn,
    upperWingIn,
    lowerWingIn,
    coreIn,
    starTwist,
    sheenProgress,
    floatY,
    knowledgeIn,
    showIn,
    meIn,
    taglineIn,
    dotScale,
    dotOpacity,
    dotRotation,
    emblemExit,
    emblemScale,
    emblemOpacity,
    wordmarkExitY,
    wordmarkOpacity,
    returnAuraOpacity,
  };
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
    const phase = ((x - x0) / band.wavelength) * Math.PI * 2 - cycle * 4.4;
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
  kind: "dot" | "photon" | "hole" | "electron";
};

export function sharedBeadState(index: number, cycle: number): SharedBead {
  const row = Math.floor(index / 6);
  const col = index % 6;
  const sum = row + col + 2;
  const isSeven = sum === 7;

  // Birth directly out of the Origami Prism-K's refractive core (418, 204) -> Act 1 Dice & 6x6 Matrix -> Elevated Bell-Curve Histogram
  const logoBurst = easeInOutCubic((cycle - (5.15 + (row + col) * 0.045)) / 1.15);
  const drop = easeInOutCubic((cycle - (10.1 + row * 0.09)) / 1.15);
  const coreX = 418;
  const coreY = 204;
  const gridX = 432 + col * 44;
  const gridY = 178 + row * 38;
  const rank = row - Math.max(0, sum - 7);
  const histX = 394 + (sum - 2) * 32;
  const histY = 436 - rank * 27;

  const arc1 = Math.sin(logoBurst * Math.PI) * 36;
  const gx = lerp(coreX, gridX, logoBurst);
  const gy = lerp(coreY, gridY, logoBurst) - arc1;
  const a1x = lerp(gx, histX, drop) + Math.sin(drop * Math.PI) * (row - 2.5) * 6;
  const a1y = lerp(gy, histY, drop) - Math.sin(drop * Math.PI) * 18;
  const a1r = lerp(4.0, isSeven ? 8.2 : 6.6, logoBurst) * lerp(1, 0.96, drop);

  // Bridge 1->2 & Act 2 (16.0..25.4): Photons entering left beam -> surfing spectral waves
  const toBeam = smoothstep(cycle, 14.9, 16.3);
  const bandIndex = index % 5;
  const band = SPECTRAL_BANDS[bandIndex];
  const travel = ((cycle - 16.2) * 0.44 + index * 0.137) % 1;
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

  // Bridge 2->3 & Act 3 (25.4..34.4): 22 spacious carriers strictly inside glass chamber (y: 228..346)
  const toPn = smoothstep(cycle, 24.4, 25.85);
  const pnLocal = Math.max(0, cycle - 25.4);
  const reverse = smoothstep(pnLocal, 4.2, 5.3);
  const isHole = index % 2 === 0;
  const phaseOffset = (index * 0.6180339887) % 1;
  const laneSlot = index % 4;
  const laneY = 236 + laneSlot * 34 + ((index % 3) - 1) * 5;
  const forwardFlow = (pnLocal * 0.21 + phaseOffset) % 1;
  const forwardX = isHole
    ? lerp(154, 498, forwardFlow)
    : lerp(498, 154, forwardFlow);
  const pullLeft = 156 + ((phaseOffset * 94) % 94) + Math.sin(cycle * 2.1 + index) * 4;
  const pullRight = 402 + ((phaseOffset * 94) % 94) + Math.cos(cycle * 2.1 + index) * 4;
  const pnX = lerp(forwardX, isHole ? pullLeft : pullRight, reverse);
  const pnY = Math.max(
    228,
    Math.min(346, laneY + Math.sin(cycle * 2.6 + index * 1.7) * (4.5 * (1 - reverse * 0.45))),
  );

  // Bridge 3->0 (34.2..35.85): Carriers sweep smoothly back to the Origami Prism-K center (400, 204)
  const toOrigin = smoothstep(cycle, 34.2, 35.75);

  let x = lerp(a1x, wx, toBeam);
  let y = lerp(a1y, wy, toBeam);
  x = lerp(x, pnX, toPn);
  y = lerp(y, pnY, toPn);
  x = lerp(x, 400, toOrigin);
  y = lerp(y, 204, toOrigin);

  let r = lerp(a1r, inBeam ? 4.4 : 4.8, toBeam);
  r = lerp(r, isHole ? 7.2 : 6.2, toPn);
  r = lerp(r, 2.8, toOrigin);

  let fill = isSeven && logoBurst > 0.45 ? "#f0a43b" : "#89d6c6";
  let stroke = isSeven && logoBurst > 0.45 ? "#c97a16" : "#2e8b7a";
  let kind: SharedBead["kind"] = "dot";

  if (toOrigin > 0.55) {
    fill = "#18b89a";
    stroke = "#fff7e2";
    kind = "dot";
  } else if (toBeam > 0.5 && toPn <= 0.5) {
    fill = inBeam ? "#f6b95b" : band.color;
    stroke = "#ffffff";
    kind = "photon";
  } else if (toPn > 0.5) {
    fill = isHole ? "#fff7f5" : "#2d8be6";
    stroke = isHole ? "#e35d4b" : "#ffffff";
    kind = isHole ? "hole" : "electron";
  }

  const pnDensityFade = index >= 22 ? 1 - toPn * (1 - toOrigin) : 1;

  const opacity =
    cycle < 5.1
      ? 0
      : clamp01(logoBurst * 1.6) * (1 - smoothstep(cycle, 35.25, 35.95)) * pnDensityFade;

  return {
    x,
    y,
    r,
    fill,
    stroke,
    opacity,
    highlight: isSeven && cycle >= 6.8 && cycle <= 15.2,
    kind,
  };
}
