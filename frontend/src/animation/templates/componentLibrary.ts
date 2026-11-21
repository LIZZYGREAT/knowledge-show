import type { VectorObject } from "../runtime/BundleTypes";
import type { StyleProfile } from "../styles/profiles";

type Keyframe = VectorObject["keyframes"][number];

export type ComponentId =
  | "metric-bars"
  | "carrier-chamber"
  | "wave-band"
  | "analog-gauge"
  | "concept-network"
  | "causal-cards"
  | "orbit-model"
  | "editorial-caption";

export type ComponentMeta = {
  id: ComponentId;
  name: string;
  category: string;
  summary: string;
  useCase: string;
};

export const COMPONENT_CATALOG: readonly ComponentMeta[] = [
  {
    id: "metric-bars",
    name: "动态概率 / 指标柱状图",
    category: "数据与分布",
    summary: "支持依次平滑生长、峰值高亮与动态数值对照的矢量柱图",
    useCase: "概率分布、增长曲线、对比实验结果",
  },
  {
    id: "carrier-chamber",
    name: "微观机制截面舱 + 粒子流",
    category: "物理与化学",
    summary: "带核心屏障与双色载流子定向运动的透明截面装置",
    useCase: "PN 结导电、分子扩散、细胞膜通道、化学反应",
  },
  {
    id: "wave-band",
    name: "连续波动与色散轨迹",
    category: "波动与光学",
    summary: "基于归一化路径显现（drawProgress）的波形展开与相位对比",
    useCase: "光折射色散、声波干涉、电磁信号调制",
  },
  {
    id: "analog-gauge",
    name: "实时指针仪表盘",
    category: "状态与度量",
    summary: "随核心机制变化实时偏转的刻度表盘与高亮扇区",
    useCase: "电流强弱、温度/熵值监测、概率指针",
  },
  {
    id: "concept-network",
    name: "注意力与概念关系网",
    category: "AI 与逻辑",
    summary: "节点层次清晰、权重连线按因果顺序逐步点亮的拓扑网络",
    useCase: "AI 注意力权重、因果推理链、知识图谱",
  },
  {
    id: "causal-cards",
    name: "层叠状态演化卡片",
    category: "叙事与对照",
    summary: "展现前后状态变化与流向箭头的双状态实体对照容器",
    useCase: "条件翻转前后对比、实验对照组、阶段演化",
  },
  {
    id: "orbit-model",
    name: "同心轨道与周期运动",
    category: "天文与周期",
    summary: "中心核心体加多轨道连续角速度公转的几何运动模型",
    useCase: "行星轨道、原子能级、周期函数与共振",
  },
  {
    id: "editorial-caption",
    name: "模板级主标题与标注引导",
    category: "版式与注解",
    summary: "自动遵循当前模板字体、配色与引导线的层次化字幕对象",
    useCase: "开场核心提问、关键结论聚焦、局部机制标注",
  },
] as const;

export function styleMaterialFor(
  style: StyleProfile,
): VectorObject["materialKey"] {
  if (style.id === "paper-editorial") return "paper-layer";
  if (style.id === "precision-science") return "frosted";
  if (style.id === "narrative-collage") return "ink-print";
  return "flat";
}

export function styleStrokeWidthFor(style: StyleProfile): number {
  if (style.id === "modern-graphic") return 3.2;
  if (style.id === "narrative-collage") return 2.4;
  if (style.id === "paper-editorial") return 1.6;
  return 2;
}

export function styleCornerFor(style: StyleProfile): number {
  if (style.id === "modern-graphic") return 10;
  if (style.id === "paper-editorial") return 18;
  if (style.id === "narrative-collage") return 6;
  return 16;
}

function holdFrames(
  durationMs: number,
  x: number,
  y: number,
  opacity = 1,
  scale = 1,
  rotation = 0,
): Keyframe[] {
  return [
    { time_ms: 0, x, y, opacity, scale, rotation, easing: "ease-out-cubic" },
    { time_ms: durationMs, x, y, opacity, scale, rotation },
  ];
}

export function buildEditorialCaption(
  style: StyleProfile,
  durationMs: number,
  opts: {
    idPrefix: string;
    title: string;
    subtitle: string;
    x?: number;
    y?: number;
  },
): VectorObject[] {
  const x = opts.x ?? 120;
  const y = opts.y ?? 120;
  const p = style.palette;
  return [
    {
      id: `${opts.idPrefix}_LINE`,
      label: "标题引导线",
      shape: "path",
      x: 0,
      y: 0,
      path: `M${x} ${y + 20} L${x + 420} ${y + 20}`,
      fill: p.gold,
      fillOpacity: 0,
      stroke: p.gold,
      strokeWidth: styleStrokeWidthFor(style) + 0.5,
      lineCap: "round",
      zIndex: 8,
      keyframes: [
        { time_ms: 0, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 0, easing: "ease-out-cubic" },
        { time_ms: Math.min(1800, Math.round(durationMs * 0.2)), x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1 },
        { time_ms: durationMs, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1 },
      ],
    },
    {
      id: `${opts.idPrefix}_TITLE`,
      label: "主标题",
      shape: "text",
      x,
      y,
      text: opts.title,
      fill: p.ink,
      fontSize: 52,
      fontWeight: 700,
      textAnchor: "start",
      zIndex: 10,
      keyframes: [
        { time_ms: 0, x, y: y + 18, opacity: 0, scale: 1, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: 900, x, y, opacity: 1, scale: 1, rotation: 0 },
        { time_ms: durationMs, x, y, opacity: 1, scale: 1, rotation: 0 },
      ],
    },
    {
      id: `${opts.idPrefix}_SUB`,
      label: "副标题说明",
      shape: "text",
      x,
      y: y + 60,
      text: opts.subtitle,
      fill: p.muted,
      fontSize: 25,
      fontWeight: 500,
      textAnchor: "start",
      zIndex: 10,
      keyframes: [
        { time_ms: 0, x, y: y + 70, opacity: 0, scale: 1, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: 1400, x, y: y + 60, opacity: 1, scale: 1, rotation: 0 },
        { time_ms: durationMs, x, y: y + 60, opacity: 1, scale: 1, rotation: 0 },
      ],
    },
  ];
}

export function buildMetricBars(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number; peakIndex?: number },
): VectorObject[] {
  const p = style.palette;
  const mat = styleMaterialFor(style);
  const sw = styleStrokeWidthFor(style);
  const rx = Math.min(12, styleCornerFor(style));
  const values = [0.22, 0.42, 0.65, 0.96, 0.68, 0.45, 0.28];
  const peak = opts.peakIndex ?? 3;
  const objects: VectorObject[] = [
    {
      id: `${opts.idPrefix}_BASE`,
      label: "基线坐标轴",
      shape: "path",
      x: 0,
      y: 0,
      path: `M${opts.x - 16} ${opts.y + 250} L${opts.x + 480} ${opts.y + 250}`,
      fill: p.shade,
      fillOpacity: 0,
      stroke: p.shade,
      strokeWidth: sw,
      lineCap: "round",
      zIndex: 2,
      keyframes: holdFrames(durationMs, 0, 0),
    },
  ];

  values.forEach((ratio, idx) => {
    const h = Math.round(ratio * 220);
    const bx = opts.x + idx * 66;
    const by = opts.y + 248 - h;
    const isPeak = idx === peak;
    const startMs = 400 + idx * 240;
    const settleMs = Math.min(durationMs - 400, startMs + 1400);
    objects.push({
      id: `${opts.idPrefix}_BAR_${idx + 1}`,
      label: isPeak ? "峰值数据柱" : `数据柱 ${idx + 1}`,
      shape: "rect",
      x: bx,
      y: by,
      width: 46,
      height: h,
      cornerRadius: rx,
      fill: isPeak ? p.red : idx % 2 === 0 ? p.blue : p.material,
      stroke: isPeak ? p.gold : p.ink,
      strokeWidth: isPeak ? sw + 1 : sw * 0.7,
      materialKey: mat,
      zIndex: isPeak ? 5 : 3,
      keyframes: [
        { time_ms: 0, x: bx, y: opts.y + 246, opacity: 0, scale: 0.25, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: startMs, x: bx, y: opts.y + 246, opacity: 0.1, scale: 0.3, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: settleMs, x: bx, y: by, opacity: 1, scale: 1, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: durationMs, x: bx, y: isPeak ? by - 6 : by, opacity: 1, scale: 1, rotation: 0 },
      ],
    });
  });

  objects.push({
    id: `${opts.idPrefix}_PEAK_TAG`,
    label: "峰值标注",
    shape: "text",
    x: opts.x + peak * 66 + 23,
    y: opts.y + 18,
    text: "峰值聚焦",
    fill: p.red,
    fontSize: 22,
    fontWeight: 700,
    textAnchor: "middle",
    zIndex: 8,
    keyframes: [
      { time_ms: 0, x: opts.x + peak * 66 + 23, y: opts.y + 34, opacity: 0, scale: 0.9, rotation: 0 },
      { time_ms: 2200, x: opts.x + peak * 66 + 23, y: opts.y + 34, opacity: 0, scale: 0.9, rotation: 0, easing: "ease-out-cubic" },
      { time_ms: 3200, x: opts.x + peak * 66 + 23, y: opts.y + 16, opacity: 1, scale: 1, rotation: 0 },
      { time_ms: durationMs, x: opts.x + peak * 66 + 23, y: opts.y + 16, opacity: 1, scale: 1, rotation: 0 },
    ],
  });

  return objects;
}

export function buildCarrierChamber(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const mat = styleMaterialFor(style);
  const sw = styleStrokeWidthFor(style);
  const rx = styleCornerFor(style);
  const w = 520;
  const h = 220;
  const objects: VectorObject[] = [
    {
      id: `${opts.idPrefix}_SHELL`,
      label: "截面装置主体",
      shape: "rect",
      x: opts.x,
      y: opts.y,
      width: w,
      height: h,
      cornerRadius: rx,
      fill: p.material,
      fillOpacity: 0.92,
      stroke: p.shade,
      strokeWidth: sw,
      materialKey: mat,
      zIndex: 2,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_BARRIER`,
      label: "核心势垒区",
      shape: "rect",
      x: opts.x + w / 2 - 26,
      y: opts.y + 14,
      width: 52,
      height: h - 28,
      cornerRadius: Math.max(4, rx - 6),
      fill: p.gold,
      fillOpacity: 0.34,
      stroke: p.gold,
      strokeWidth: sw * 0.8,
      zIndex: 3,
      keyframes: [
        { time_ms: 0, x: opts.x + w / 2 - 26, y: opts.y + 14, opacity: 0.65, scale: 0.85, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.52), x: opts.x + w / 2 - 26, y: opts.y + 14, opacity: 0.95, scale: 1.06, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: durationMs, x: opts.x + w / 2 - 26, y: opts.y + 14, opacity: 0.72, scale: 0.9, rotation: 0 },
      ],
    },
  ];

  for (let i = 0; i < 8; i++) {
    const isRed = i % 2 === 0;
    const py = opts.y + 48 + (i % 4) * 42;
    const xStart = isRed ? opts.x + 36 + (i * 18) : opts.x + w - 36 - (i * 14);
    const xMid = isRed ? opts.x + w - 48 : opts.x + 48;
    const xEnd = isRed ? opts.x + 92 + i * 16 : opts.x + w - 92 - i * 12;
    objects.push({
      id: `${opts.idPrefix}_PT_${i + 1}`,
      label: isRed ? "正向载流子" : "反向载流子",
      shape: "circle",
      x: xStart,
      y: py,
      radius: isRed ? 12 : 10,
      fill: isRed ? p.red : p.blue,
      stroke: p.ink,
      strokeWidth: sw * 0.5,
      zIndex: 6,
      keyframes: [
        { time_ms: 0, x: xStart, y: py, opacity: 0.95, scale: 1, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.48), x: xMid, y: py + (isRed ? -6 : 6), opacity: 1, scale: 1.08, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: durationMs, x: xEnd, y: py, opacity: 0.95, scale: 1, rotation: 0 },
      ],
    });
  }

  return objects;
}

export function buildWaveBand(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const sw = styleStrokeWidthFor(style) + 2;
  const specs = [
    { color: p.red, dy: 0, amp: 26, freq: 1, label: "长波信号" },
    { color: p.gold, dy: 58, amp: 22, freq: 1.5, label: "中波信号" },
    { color: p.blue, dy: 116, amp: 18, freq: 2.2, label: "短波信号" },
  ];

  return specs.map((spec, idx) => {
    const pts: string[] = [];
    for (let s = 0; s <= 36; s++) {
      const u = s / 36;
      const px = opts.x + u * 480;
      const py = opts.y + spec.dy + Math.sin(u * Math.PI * 2 * spec.freq) * spec.amp;
      pts.push(`${s === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    return {
      id: `${opts.idPrefix}_WAVE_${idx + 1}`,
      label: spec.label,
      shape: "path",
      x: 0,
      y: 0,
      path: pts.join(" "),
      fill: spec.color,
      fillOpacity: 0,
      stroke: spec.color,
      strokeWidth: sw,
      lineCap: "round",
      zIndex: 5,
      keyframes: [
        { time_ms: 0, x: 0, y: 0, opacity: 0.95, scale: 1, rotation: 0, drawProgress: 0, easing: "ease-out-cubic" },
        { time_ms: Math.round(durationMs * (0.45 + idx * 0.1)), x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1, easing: "linear" },
        { time_ms: durationMs, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1 },
      ],
    };
  });
}

export function buildAnalogGauge(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const mat = styleMaterialFor(style);
  const sw = styleStrokeWidthFor(style);
  return [
    {
      id: `${opts.idPrefix}_DIAL`,
      label: "仪表盘底盘",
      shape: "circle",
      x: opts.x,
      y: opts.y,
      radius: 96,
      fill: p.material,
      stroke: p.shade,
      strokeWidth: sw + 1,
      materialKey: mat,
      zIndex: 2,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_ARC`,
      label: "刻度光弧",
      shape: "path",
      x: opts.x,
      y: opts.y,
      path: "M-66 28 A72 72 0 1 1 66 28",
      fill: p.blue,
      fillOpacity: 0,
      stroke: p.blue,
      strokeWidth: 9,
      lineCap: "round",
      zIndex: 4,
      keyframes: [
        { time_ms: 0, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 0, drawProgress: 0.15, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.45), x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 0, drawProgress: 0.92, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.78), x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 0, drawProgress: 0.25, easing: "ease-out-cubic" },
        { time_ms: durationMs, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 0, drawProgress: 0.78 },
      ],
    },
    {
      id: `${opts.idPrefix}_NEEDLE`,
      label: "动态指针",
      shape: "path",
      x: opts.x,
      y: opts.y,
      path: "M0 10 L0 -64",
      fill: p.red,
      fillOpacity: 0,
      stroke: p.red,
      strokeWidth: 5,
      lineCap: "round",
      zIndex: 6,
      keyframes: [
        { time_ms: 0, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: -65, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.45), x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 62, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.78), x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: -45, easing: "ease-out-cubic" },
        { time_ms: durationMs, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: 38 },
      ],
    },
    {
      id: `${opts.idPrefix}_PIVOT`,
      label: "指针轴心",
      shape: "circle",
      x: opts.x,
      y: opts.y,
      radius: 11,
      fill: p.gold,
      stroke: p.ink,
      strokeWidth: 1.5,
      zIndex: 7,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_LABEL`,
      label: "仪表读数标签",
      shape: "text",
      x: opts.x,
      y: opts.y + 56,
      text: "响应强度",
      fill: p.muted,
      fontSize: 20,
      fontWeight: 600,
      textAnchor: "middle",
      zIndex: 7,
      keyframes: holdFrames(durationMs, opts.x, opts.y + 56),
    },
  ];
}

export function buildConceptNetwork(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const mat = styleMaterialFor(style);
  const sw = styleStrokeWidthFor(style);
  const nodes = [
    { dx: 0, dy: 96, r: 34, label: "核心词", color: p.red },
    { dx: 210, dy: 12, r: 28, label: "语境 A", color: p.blue },
    { dx: 230, dy: 178, r: 28, label: "语境 B", color: p.gold },
    { dx: 430, dy: 96, r: 36, label: "新理解", color: p.material },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [0, 3],
  ];

  const objects: VectorObject[] = edges.map(([a, b], idx) => {
    const na = nodes[a];
    const nb = nodes[b];
    const strong = idx === 4 || idx === 0;
    return {
      id: `${opts.idPrefix}_EDGE_${idx + 1}`,
      label: `关联权重线 ${idx + 1}`,
      shape: "path",
      x: 0,
      y: 0,
      path: `M${opts.x + na.dx} ${opts.y + na.dy} Q${opts.x + (na.dx + nb.dx) / 2} ${opts.y + (na.dy + nb.dy) / 2 - (idx % 2 === 0 ? 28 : -24)} ${opts.x + nb.dx} ${opts.y + nb.dy}`,
      fill: p.gold,
      fillOpacity: 0,
      stroke: strong ? p.red : p.blue,
      strokeWidth: strong ? sw + 2.5 : sw + 0.5,
      lineCap: "round",
      zIndex: 3,
      keyframes: [
        { time_ms: 0, x: 0, y: 0, opacity: 0.25, scale: 1, rotation: 0, drawProgress: 0, easing: "ease-out-cubic" },
        { time_ms: 900 + idx * 420, x: 0, y: 0, opacity: 0.9, scale: 1, rotation: 0, drawProgress: 1, easing: "ease-in-out-cubic" },
        { time_ms: durationMs, x: 0, y: 0, opacity: strong ? 1 : 0.62, scale: 1, rotation: 0, drawProgress: 1 },
      ],
    };
  });

  nodes.forEach((node, idx) => {
    const nx = opts.x + node.dx;
    const ny = opts.y + node.dy;
    objects.push({
      id: `${opts.idPrefix}_NODE_${idx + 1}`,
      label: node.label,
      shape: "circle",
      x: nx,
      y: ny,
      radius: node.r,
      fill: node.color,
      stroke: p.ink,
      strokeWidth: sw,
      materialKey: mat,
      zIndex: 6,
      keyframes: [
        { time_ms: 0, x: nx, y: ny, opacity: 0, scale: 0.5, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: 500 + idx * 260, x: nx, y: ny, opacity: 1, scale: 1.06, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: Math.round(durationMs * 0.6), x: nx, y: ny, opacity: 1, scale: 1, rotation: 0, easing: "ease-in-out-cubic" },
        { time_ms: durationMs, x: nx, y: ny, opacity: 1, scale: idx === 3 ? 1.1 : 1, rotation: 0 },
      ],
    });
    objects.push({
      id: `${opts.idPrefix}_NODELBL_${idx + 1}`,
      label: `${node.label}文字`,
      shape: "text",
      x: nx,
      y: ny + node.r + 30,
      text: node.label,
      fill: p.ink,
      fontSize: 20,
      fontWeight: 600,
      textAnchor: "middle",
      zIndex: 7,
      keyframes: holdFrames(durationMs, nx, ny + node.r + 30),
    });
  });

  return objects;
}

export function buildCausalCards(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const mat = styleMaterialFor(style);
  const sw = styleStrokeWidthFor(style);
  const rx = styleCornerFor(style);
  return [
    {
      id: `${opts.idPrefix}_CARD_A`,
      label: "状态 A 实体卡",
      shape: "rect",
      x: opts.x,
      y: opts.y,
      width: 210,
      height: 170,
      cornerRadius: rx,
      fill: p.material,
      stroke: p.blue,
      strokeWidth: sw,
      materialKey: mat,
      zIndex: 3,
      keyframes: [
        { time_ms: 0, x: opts.x - 24, y: opts.y, opacity: 0, scale: 0.94, rotation: -3, easing: "ease-out-cubic" },
        { time_ms: 1100, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: -2 },
        { time_ms: durationMs, x: opts.x, y: opts.y, opacity: 1, scale: 1, rotation: -2 },
      ],
    },
    {
      id: `${opts.idPrefix}_ARROW`,
      label: "因果转化箭头",
      shape: "path",
      x: 0,
      y: 0,
      path: `M${opts.x + 228} ${opts.y + 85} C${opts.x + 272} ${opts.y + 42} ${opts.x + 308} ${opts.y + 128} ${opts.x + 354} ${opts.y + 85}`,
      fill: p.gold,
      fillOpacity: 0,
      stroke: p.gold,
      strokeWidth: sw + 2,
      lineCap: "round",
      zIndex: 5,
      keyframes: [
        { time_ms: 0, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 0 },
        { time_ms: 1400, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 0, easing: "ease-out-cubic" },
        { time_ms: 2800, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1 },
        { time_ms: durationMs, x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, drawProgress: 1 },
      ],
    },
    {
      id: `${opts.idPrefix}_CARD_B`,
      label: "状态 B 结果卡",
      shape: "rect",
      x: opts.x + 372,
      y: opts.y,
      width: 210,
      height: 170,
      cornerRadius: rx,
      fill: p.material,
      stroke: p.red,
      strokeWidth: sw + 0.6,
      materialKey: mat,
      zIndex: 4,
      keyframes: [
        { time_ms: 0, x: opts.x + 396, y: opts.y, opacity: 0, scale: 0.94, rotation: 3 },
        { time_ms: 2100, x: opts.x + 396, y: opts.y, opacity: 0, scale: 0.94, rotation: 3, easing: "ease-out-cubic" },
        { time_ms: 3300, x: opts.x + 372, y: opts.y, opacity: 1, scale: 1, rotation: 2 },
        { time_ms: durationMs, x: opts.x + 372, y: opts.y, opacity: 1, scale: 1, rotation: 2 },
      ],
    },
    {
      id: `${opts.idPrefix}_TXT_A`,
      label: "条件说明",
      shape: "text",
      x: opts.x + 105,
      y: opts.y + 94,
      text: "初始条件",
      fill: p.ink,
      fontSize: 26,
      fontWeight: 600,
      textAnchor: "middle",
      zIndex: 7,
      keyframes: holdFrames(durationMs, opts.x + 105, opts.y + 94),
    },
    {
      id: `${opts.idPrefix}_TXT_B`,
      label: "结果说明",
      shape: "text",
      x: opts.x + 477,
      y: opts.y + 94,
      text: "规律结果",
      fill: p.red,
      fontSize: 26,
      fontWeight: 700,
      textAnchor: "middle",
      zIndex: 7,
      keyframes: [
        { time_ms: 0, x: opts.x + 477, y: opts.y + 94, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 2300, x: opts.x + 477, y: opts.y + 94, opacity: 0, scale: 1, rotation: 0, easing: "ease-out-cubic" },
        { time_ms: 3300, x: opts.x + 477, y: opts.y + 94, opacity: 1, scale: 1, rotation: 0 },
        { time_ms: durationMs, x: opts.x + 477, y: opts.y + 94, opacity: 1, scale: 1, rotation: 0 },
      ],
    },
  ];
}

export function buildOrbitModel(
  style: StyleProfile,
  durationMs: number,
  opts: { idPrefix: string; x: number; y: number },
): VectorObject[] {
  const p = style.palette;
  const sw = styleStrokeWidthFor(style);
  const satFrames = (radius: number, turns: number): Keyframe[] => {
    const steps = 16;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const u = i / steps;
      const a = u * Math.PI * 2 * turns;
      return {
        time_ms: Math.round(u * durationMs),
        x: Math.round(opts.x + Math.cos(a) * radius),
        y: Math.round(opts.y + Math.sin(a) * radius * 0.72),
        opacity: 1,
        scale: 1,
        rotation: 0,
        easing: "linear" as const,
      };
    });
  };
  return [
    {
      id: `${opts.idPrefix}_RING1`,
      label: "内轨道",
      shape: "path",
      x: opts.x,
      y: opts.y,
      path: "M-92 0 A92 66 0 1 0 92 0 A92 66 0 1 0 -92 0",
      fill: p.shade,
      fillOpacity: 0,
      stroke: p.shade,
      strokeWidth: sw * 0.75,
      zIndex: 2,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_RING2`,
      label: "外轨道",
      shape: "path",
      x: opts.x,
      y: opts.y,
      path: "M-156 0 A156 112 0 1 0 156 0 A156 112 0 1 0 -156 0",
      fill: p.shade,
      fillOpacity: 0,
      stroke: p.shade,
      strokeWidth: sw * 0.75,
      zIndex: 2,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_CORE`,
      label: "引力核心",
      shape: "circle",
      x: opts.x,
      y: opts.y,
      radius: 26,
      fill: p.gold,
      stroke: p.ink,
      strokeWidth: sw,
      materialKey: styleMaterialFor(style),
      zIndex: 5,
      keyframes: holdFrames(durationMs, opts.x, opts.y),
    },
    {
      id: `${opts.idPrefix}_SAT1`,
      label: "内轨运动体",
      shape: "circle",
      x: opts.x + 92,
      y: opts.y,
      radius: 13,
      fill: p.red,
      stroke: p.ink,
      strokeWidth: 1.5,
      zIndex: 7,
      keyframes: satFrames(92, 2),
    },
    {
      id: `${opts.idPrefix}_SAT2`,
      label: "外轨运动体",
      shape: "circle",
      x: opts.x + 156,
      y: opts.y,
      radius: 15,
      fill: p.blue,
      stroke: p.ink,
      strokeWidth: 1.5,
      zIndex: 7,
      keyframes: satFrames(156, 1),
    },
  ];
}
