/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 确定性数学、缓动、弹簧与伪随机引擎
 */

export const TAU = Math.PI * 2;

export function clamp(v, lo = 0, hi = 1) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function invLerp(a, b, v) {
  if (a === b) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

export function remap(v, inA, inB, outA, outB, easeFn = null) {
  const u = invLerp(inA, inB, v);
  return lerp(outA, outB, easeFn ? easeFn(u) : u);
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t) {
  const u = 1 - clamp(t);
  return 1 - u * u * u;
}

export function easeInCubic(t) {
  const u = clamp(t);
  return u * u * u;
}

export function easeInOutCubic(t) {
  const u = clamp(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

/**
 * 精确三次贝塞尔缓动构造器
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (u) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u) => ((ay * u + by) * u + cy) * u;
  const sampleDX = (u) => (3 * ax * u + 2 * bx) * u + cx;

  return function (x) {
    const t = clamp(x, 0, 1);
    if (t === 0 || t === 1) return t;
    let u = t;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(u) - t;
      if (Math.abs(err) < 1e-6) break;
      const dx = sampleDX(u);
      if (Math.abs(dx) < 1e-6) break;
      u -= err / dx;
    }
    u = clamp(u, 0, 1);
    return sampleY(u);
  };
}

/** 位移与展开：柔和强减速 cubic-bezier(0.22, 1, 0.36, 1) */
export const easeEditorialOut = cubicBezier(0.22, 1, 0.36, 1);

/** 翻页与扫尺：对称优雅缓入缓出 cubic-bezier(0.65, 0, 0.35, 1) */
export const easeEditorialInOut = cubicBezier(0.65, 0, 0.35, 1);

/**
 * 阻尼弹簧解析解（确定性，无需状态累积）
 * x'' + 2 * zeta * omega0 * x' + omega0^2 * (x - 1) = 0, x(0)=0, x'(0)=0
 * 推荐参数：zeta = 0.78, omega0 = 18 rad/s（干脆利落，仅微过冲一次即稳稳落定）
 */
export function springResponse(elapsedSec, zeta = 0.78, omega0 = 18) {
  if (elapsedSec <= 0) return 0;
  if (elapsedSec > 1.8) return 1;
  if (zeta < 1) {
    const wd = omega0 * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega0 * elapsedSec);
    return (
      1 -
      decay *
        (Math.cos(wd * elapsedSec) +
          ((zeta * omega0) / wd) * Math.sin(wd * elapsedSec))
    );
  }
  const decay = Math.exp(-omega0 * elapsedSec);
  return 1 - decay * (1 + omega0 * elapsedSec);
}

/**
 * 归一化时间 [0, 1] 上的弹簧响应（durationSec 决定物理展开跨度）
 */
export function springProgress(u, durationSec = 0.55, zeta = 0.78, omega0 = 18) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const endVal = springResponse(durationSec, zeta, omega0);
  const raw = springResponse(u * durationSec, zeta, omega0);
  return endVal > 0.001 ? raw / endVal : u;
}

/**
 * 三阶贝塞尔曲线采样点
 */
export function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function bezierTangent(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x:
      3 * u * u * (p1.x - p0.x) +
      6 * u * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x),
    y:
      3 * u * u * (p1.y - p0.y) +
      6 * u * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y),
  };
}

/**
 * Mulberry32 确定性伪随机数生成器（禁止使用 Math.random()）
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(4)})`;
}

export function lerpColor(hexA, hexB, t, alpha = 1) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const u = clamp(t);
  const r = Math.round(lerp(a.r, b.r, u));
  const g = Math.round(lerp(a.g, b.g, u));
  const bl = Math.round(lerp(a.b, b.b, u));
  return alpha >= 0.999 ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(4)})`;
}
