/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 核心设计 Tokens
 * 严格对齐「Warm Editorial Craft & Living Motion Studio」美学规范
 */

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const DEFAULT_FPS = 60;

export const COLORS = {
  paperBase: "#F9F7F2",
  paperElevated: "#FFFDF9",
  paperWarmTint: "#F3EDE1",
  glowTeal: "rgba(38, 166, 154, 0.11)",
  glowAmber: "rgba(244, 162, 89, 0.12)",
  glowPeriwinkle: "rgba(78, 124, 246, 0.08)",
  brandTeal: "#12948D",
  brandTealLight: "#17A79F",
  brandTealDark: "#0E7C7B",
  brandPeriwinkle: "#4E7CF6",
  brandPeriwinkleLight: "#5B8BF7",
  brandPeriwinkleDark: "#3D63D8",
  brandAmber: "#F2994A",
  brandAmberSoft: "#FAD7A8",
  inkPrimary: "#1C2A30",
  inkSecondary: "#5B6B73",
  inkMuted: "#84949B",
  inkHairline: "rgba(28, 42, 48, 0.14)",
  inkHairlineStrong: "rgba(28, 42, 48, 0.24)",
  shadowTint: "rgba(28, 52, 58, 0.10)",
  shadowDeep: "rgba(28, 52, 58, 0.16)",
  // Frontend alignment accents
  accentSoft: "#E4F7F2",
  warmSoft: "#FEF4E4",
};

/**
 * 暖纸水彩彩虹光谱（拒绝刺眼 RGB 霓虹，专用于暖白纸面叠加）
 * 按物理波长从长到短排列：红光波长最长、偏折最小；紫光波长最短、偏折最大
 */
export const SPECTRUM = [
  {
    id: "red",
    zh: "珊瑚红",
    hex: "#E56B6F",
    wavelengthNm: 680,
    lambdaPx: 126,
    speedRatio: 0.672,
    bendDeg: 11.5,
    phase: 0.0,
    ampBase: 9.2,
  },
  {
    id: "orange",
    zh: "暖杏橙",
    hex: "#F2994A",
    wavelengthNm: 610,
    lambdaPx: 112,
    speedRatio: 0.664,
    bendDeg: 14.8,
    phase: 0.65,
    ampBase: 8.6,
  },
  {
    id: "yellow",
    zh: "姜黄",
    hex: "#E9C46A",
    wavelengthNm: 575,
    lambdaPx: 100,
    speedRatio: 0.656,
    bendDeg: 18.2,
    phase: 1.3,
    ampBase: 8.1,
  },
  {
    id: "green",
    zh: "青翠",
    hex: "#2A9D8F",
    wavelengthNm: 530,
    lambdaPx: 88,
    speedRatio: 0.648,
    bendDeg: 21.8,
    phase: 1.95,
    ampBase: 7.7,
  },
  {
    id: "sky",
    zh: "晴蓝",
    hex: "#4E9AF1",
    wavelengthNm: 485,
    lambdaPx: 77,
    speedRatio: 0.640,
    bendDeg: 25.5,
    phase: 2.6,
    ampBase: 7.3,
  },
  {
    id: "indigo",
    zh: "群青",
    hex: "#5C6BC0",
    wavelengthNm: 445,
    lambdaPx: 66,
    speedRatio: 0.632,
    bendDeg: 29.4,
    phase: 3.25,
    ampBase: 6.9,
  },
  {
    id: "violet",
    zh: "烟紫",
    hex: "#8E6CBB",
    wavelengthNm: 405,
    lambdaPx: 55,
    speedRatio: 0.622,
    bendDeg: 33.6,
    phase: 3.9,
    ampBase: 6.6,
  },
];

export const FONTS = {
  serif: '"Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "Iowan Old Style", Georgia, serif',
  sans: '"Noto Sans CJK SC", Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans Mono CJK SC", "Ubuntu Mono", "DejaVu Sans Mono", ui-monospace, monospace',
};

/**
 * 同主题多风格体系（忠实对齐 frontend/src/animation/styles/profiles/profiles.json）
 */
export const STYLE_PROFILES = {
  "paper-editorial": {
    id: "paper-editorial",
    name: "纸艺编辑风",
    en: "Paper Editorial",
    bg: "#F9F7F2",
    ink: "#1C2A30",
    muted: "#5B6B73",
    prismFill: "rgba(255, 253, 249, 0.78)",
    prismStroke: "rgba(28, 42, 48, 0.28)",
    palette: ["#E56B6F", "#F2994A", "#E9C46A", "#2A9D8F", "#4E9AF1", "#5C6BC0", "#8E6CBB"],
  },
  "modern-graphic": {
    id: "modern-graphic",
    name: "现代图形风",
    en: "Modern Graphic",
    bg: "#F3F0E8",
    ink: "#202638",
    muted: "#585668",
    prismFill: "#FFF3C2",
    prismStroke: "#202638",
    palette: ["#EC4B53", "#F0833A", "#E3BA34", "#1F9D85", "#2262C4", "#4852A8", "#764EA6"],
  },
  "narrative-collage": {
    id: "narrative-collage",
    name: "叙事拼贴风",
    en: "Narrative Collage",
    bg: "#ECE4D3",
    ink: "#2C2B29",
    muted: "#6B6558",
    prismFill: "#F8F1E1",
    prismStroke: "#3B3730",
    palette: ["#D96B52", "#DC8E46", "#D2AE52", "#478F82", "#5186A8", "#5E6B9B", "#866494"],
  },
};
