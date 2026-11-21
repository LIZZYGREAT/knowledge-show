/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 核心视觉主角：「棱片」（The Prism-Fold）
 * 源自 BrandLogo 右侧多面菱形棱晶的物理活化形态
 * 四态连续参数状态机：GLIDE（游走）/ PRISM（棱镜）/ FOLD（翻页）/ BRACKET（夹持）
 */

import { COLORS } from "../config/tokens.js";
import { clamp, lerp, rgba, bezierPoint } from "../core/math.js";

/**
 * 绘制圆角多边形路径（用于硫酸纸折纸翼片）
 */
function roundedPolygon(ctx, pts, radius = 6) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const dx1 = prev.x - curr.x;
    const dy1 = prev.y - curr.y;
    const len1 = Math.hypot(dx1, dy1) || 1;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2) || 1;
    const r = Math.min(radius, len1 * 0.35, len2 * 0.35);
    const p1x = curr.x + (dx1 / len1) * r;
    const p1y = curr.y + (dy1 / len1) * r;
    const p2x = curr.x + (dx2 / len2) * r;
    const p2y = curr.y + (dy2 / len2) * r;
    if (i === 0) ctx.moveTo(p1x, p1y);
    else ctx.lineTo(p1x, p1y);
    ctx.quadraticCurveTo(curr.x, curr.y, p2x, p2y);
  }
  ctx.closePath();
}

/**
 * 绘制伴生三股游丝（呼应首页 LivingFlowScene）
 * trailPoints: [{x, y}] 从旧到新排列，最后一个点靠近棱片
 */
export function drawTrailingRibbons(ctx, trailPoints, { alpha = 1, widthScale = 1, t = 0 } = {}) {
  if (!trailPoints || trailPoints.length < 4 || alpha <= 0.01) return;
  const strands = [
    { color: COLORS.brandTeal, offset: -5.5, width: 2.4 * widthScale, op: 0.56, freq: 1.8 },
    { color: COLORS.brandPeriwinkle, offset: 5.5, width: 2.0 * widthScale, op: 0.46, freq: 2.2 },
    { color: COLORS.brandAmber, offset: 0.0, width: 1.5 * widthScale, op: 0.52, freq: 2.7 },
  ];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const s of strands) {
    ctx.beginPath();
    const n = trailPoints.length;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const p = trailPoints[i];
      const next = trailPoints[Math.min(n - 1, i + 1)];
      const prev = trailPoints[Math.max(0, i - 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;
      const flutter = Math.sin(u * 8.0 - t * 4.5 + s.freq) * 3.5 * Math.sin(u * Math.PI);
      const disp = (s.offset * (1 - u * 0.45) + flutter) * widthScale;
      const px = p.x + nx * disp;
      const py = p.y + ny * disp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    const pStart = trailPoints[0];
    const pEnd = trailPoints[trailPoints.length - 1];
    const grad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
    grad.addColorStop(0, rgba(s.color, 0));
    grad.addColorStop(0.4, rgba(s.color, s.op * 0.55 * alpha));
    grad.addColorStop(1, rgba(s.color, s.op * alpha));

    ctx.strokeStyle = grad;
    ctx.lineWidth = s.width;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 按路径采样生成尾迹点集（确定性，无需状态历史）
 */
export function sampleTrailFromPath(pathFn, tNow, spanSec = 0.72, steps = 26) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const ti = Math.max(0, tNow - spanSec * (1 - i / steps));
    pts.push(pathFn(ti));
  }
  return pts;
}

/**
 * 绘制「棱片」主角
 * state: {
 *   x, y,
 *   mode: 'GLIDE' | 'PRISM' | 'FOLD' | 'BRACKET',
 *   size: 36,            // 基准半径 R
 *   angle: 0,            // 航向角（弧度）
 *   alpha: 1,
 *   t: 0,                // 全局时间用于微呼吸
 *   coreGlow: 0,         // [0, 1] 暖杏光核亮度
 *   glideSplit: 4,       // GLIDE 上下错位 px
 *   prismBlend: 0,       // [0, 1] 0=GLIDE, 1=PRISM（自动按 mode 设定，也可显式插值）
 *   foldProgress: 0,     // [0, 1] FOLD 翻页进度 (0 -> pi)
 *   foldHeight: 1080,    // FOLD 展开高度
 *   bracketBlend: 0,     // [0, 1] 0=合体棱片, 1=完全展开为四角选框
 *   bracketRect: null,   // { x, y, w, h } 世界/屏幕坐标包围盒
 *   bracketPulse: 0,     // [0, 1] 确认修订时四角向内轻翻脉冲
 *   trail: null,         // [{x,y}] 伴生游丝
 *   trailAlpha: 1,
 *   multiply: true,      // 硫酸纸叠色开关
 * }
 */
export function drawPrismFold(ctx, state) {
  const {
    x = 960,
    y = 540,
    mode = "GLIDE",
    size = 36,
    angle = 0,
    alpha = 1,
    t = 0,
    coreGlow = 0,
    foldProgress = 0,
    foldHeight = 1080,
    bracketRect = null,
    bracketPulse = 0,
    trail = null,
    trailAlpha = 1,
    multiply = true,
  } = state;

  if (alpha <= 0.004) return;

  // 解析连续混合权重
  const prismBlend =
    state.prismBlend !== undefined
      ? clamp(state.prismBlend)
      : mode === "PRISM"
        ? 1
        : 0;
  const bracketBlend =
    state.bracketBlend !== undefined
      ? clamp(state.bracketBlend)
      : mode === "BRACKET"
        ? 1
        : 0;

  // 1. 先绘制伴生游丝（处于棱片下方）
  if (trail && trail.length > 3 && bracketBlend < 0.7 && mode !== "FOLD") {
    drawTrailingRibbons(ctx, trail, {
      alpha: alpha * trailAlpha * (1 - bracketBlend * 1.4),
      widthScale: clamp(size / 36, 0.7, 1.8),
      t,
    });
  }

  // 2. FOLD 翻页态：沿竖直中轴执行 [0, π] 透视翻折
  if (mode === "FOLD") {
    drawFoldState(ctx, { x, y, foldProgress, foldHeight, alpha, coreGlow });
    return;
  }

  // 3. BRACKET 夹持态或向 BRACKET 过渡态
  if (bracketBlend > 0.001 && bracketRect) {
    drawBracketMorph(ctx, {
      x,
      y,
      size,
      angle,
      alpha,
      t,
      coreGlow,
      bracketBlend,
      bracketRect,
      bracketPulse,
    });
    return;
  }

  // 4. GLIDE <-> PRISM 连续态
  const breath = Math.sin(t * 3.1) * (1 - prismBlend);
  const splitY = lerp(state.glideSplit ?? 4.2, 0, prismBlend) + breath * 0.9;
  const wingTilt = lerp(Math.sin(t * 3.8) * 0.095, 0, prismBlend);
  const wingSpreadX = lerp(2.2, 0, prismBlend);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 柔和青灰物理投影
  ctx.shadowColor = "rgba(28, 52, 58, 0.14)";
  ctx.shadowBlur = 18 * (size / 36);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8 * (size / 36);

  const R = size;
  const cornerR = Math.max(3.5, R * 0.17);

  // 下翼片（湖蓝渐变硫酸纸，先画以呈现叠色）
  ctx.save();
  ctx.translate(-wingSpreadX * 0.5, splitY);
  ctx.rotate(-wingTilt);
  const lowerPts = [
    { x: -R * 0.86, y: R * 0.02 },
    { x: R * 0.86, y: R * 0.02 },
    { x: 0, y: R * 1.04 },
  ];
  const gradLower = ctx.createLinearGradient(-R * 0.7, 0, R * 0.7, R);
  gradLower.addColorStop(0, rgba(COLORS.brandPeriwinkleLight, 0.86));
  gradLower.addColorStop(1, rgba(COLORS.brandPeriwinkleDark, 0.88));
  roundedPolygon(ctx, lowerPts, cornerR);
  ctx.fillStyle = gradLower;
  ctx.fill();
  ctx.shadowColor = "transparent";
  // 1px 暖白内高光线
  ctx.strokeStyle = "rgba(255, 253, 249, 0.62)";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();

  // 上翼片（青绿渐变硫酸纸，交叠处自然透出叠印感）
  ctx.save();
  ctx.translate(wingSpreadX * 0.5, -splitY);
  ctx.rotate(wingTilt);
  if (multiply) {
    ctx.globalCompositeOperation = "multiply";
  }
  const upperPts = [
    { x: 0, y: -R * 1.04 },
    { x: R * 0.86, y: -R * 0.02 },
    { x: -R * 0.86, y: -R * 0.02 },
  ];
  const gradUpper = ctx.createLinearGradient(-R * 0.7, -R, R * 0.7, 0);
  gradUpper.addColorStop(0, rgba(COLORS.brandTealLight, 0.88));
  gradUpper.addColorStop(1, rgba(COLORS.brandTealDark, 0.88));
  roundedPolygon(ctx, upperPts, cornerR);
  ctx.fillStyle = gradUpper;
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 253, 249, 0.72)";
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.restore();

  // PRISM 玻璃折射边光（仅闭合棱镜态浮现）
  if (prismBlend > 0.05) {
    ctx.save();
    ctx.globalAlpha = prismBlend * 0.75;
    ctx.strokeStyle = "rgba(255, 253, 249, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-R * 0.72, 0);
    ctx.lineTo(R * 0.72, 0);
    ctx.stroke();

    // 左上棱面微弱玻璃反光
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.92);
    ctx.lineTo(-R * 0.34, -R * 0.14);
    ctx.lineTo(0, -R * 0.04);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    ctx.fill();
    ctx.restore();
  }

  // 暖杏光核（amberCore）：灵感触发 / 棱镜色散 / 修订生效 / Logo 归位时温柔点亮
  const coreAmt = clamp(coreGlow + prismBlend * 0.35);
  if (coreAmt > 0.01) {
    ctx.save();
    const glowR = R * (0.42 + coreAmt * 0.32);
    const rg = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
    rg.addColorStop(0, rgba("#FFF8EC", 0.95 * coreAmt));
    rg.addColorStop(0.38, rgba(COLORS.brandAmber, 0.72 * coreAmt));
    rg.addColorStop(1, rgba(COLORS.brandAmber, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 精致四芒星光核菱形
    const cr = R * (0.16 + 0.09 * coreAmt);
    ctx.beginPath();
    ctx.moveTo(0, -cr * 1.15);
    ctx.quadraticCurveTo(0, 0, cr * 1.15, 0);
    ctx.quadraticCurveTo(0, 0, 0, cr * 1.15);
    ctx.quadraticCurveTo(0, 0, -cr * 1.15, 0);
    ctx.quadraticCurveTo(0, 0, 0, -cr * 1.15);
    ctx.closePath();
    ctx.fillStyle = rgba("#FFFDF9", 0.92 * coreAmt);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2.2, R * 0.075), 0, Math.PI * 2);
    ctx.fillStyle = rgba(COLORS.brandAmber, 0.96 * coreAmt);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * FOLD 翻页态：独立杂志厚实色卡沿中轴翻折，驱动画风切换
 */
function drawFoldState(ctx, { x, y, foldProgress, foldHeight, alpha, coreGlow }) {
  const u = clamp(foldProgress);
  const theta = u * Math.PI;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // 翻页翼片宽度随翻折深度与透视自然变化
  const maxWingW = 460;
  const wingW = maxWingW * Math.abs(cosT);
  const dir = cosT >= 0 ? 1 : -1;
  const hHalf = foldHeight * 0.5;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(x, y);

  // 动态页背投影（在 90° 竖起时阴影最柔长）
  const shadowW = 140 + 220 * sinT;
  const shadowGrad = ctx.createLinearGradient(0, 0, dir * shadowW, 0);
  shadowGrad.addColorStop(0, `rgba(28, 42, 48, ${(0.18 * sinT).toFixed(4)})`);
  shadowGrad.addColorStop(1, "rgba(28, 42, 48, 0)");
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(dir > 0 ? 0 : -shadowW, -hHalf, shadowW, foldHeight);

  // 翻动的厚实半透明纸页色卡
  if (wingW > 1.5) {
    const isFront = cosT >= 0;
    const perspSkew = sinT * 34;
    ctx.beginPath();
    ctx.moveTo(0, -hHalf);
    ctx.lineTo(dir * wingW, -hHalf - perspSkew);
    ctx.lineTo(dir * wingW, hHalf + perspSkew);
    ctx.lineTo(0, hHalf);
    ctx.closePath();

    const pageGrad = ctx.createLinearGradient(0, -hHalf, dir * wingW, hHalf);
    if (isFront) {
      pageGrad.addColorStop(0, rgba(COLORS.brandTeal, 0.24));
      pageGrad.addColorStop(0.55, rgba(COLORS.paperElevated, 0.94));
      pageGrad.addColorStop(1, rgba(COLORS.paperWarmTint, 0.96));
    } else {
      pageGrad.addColorStop(0, rgba(COLORS.brandPeriwinkle, 0.20));
      pageGrad.addColorStop(0.55, rgba(COLORS.paperElevated, 0.95));
      pageGrad.addColorStop(1, rgba(COLORS.paperBase, 0.98));
    }
    ctx.fillStyle = pageGrad;
    ctx.fill();

    // 纸页边缘厚度线
    ctx.strokeStyle = isFront
      ? rgba(COLORS.brandTeal, 0.42)
      : rgba(COLORS.brandPeriwinkle, 0.42);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 中轴折痕高光脊线与光核微标
  const spineGrad = ctx.createLinearGradient(0, -hHalf, 0, hHalf);
  spineGrad.addColorStop(0, rgba(COLORS.brandTeal, 0.1));
  spineGrad.addColorStop(0.5, rgba(COLORS.brandTeal, 0.65));
  spineGrad.addColorStop(1, rgba(COLORS.brandPeriwinkle, 0.1));
  ctx.strokeStyle = spineGrad;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -hHalf);
  ctx.lineTo(0, hHalf);
  ctx.stroke();

  if (coreGlow > 0.05 || sinT > 0.1) {
    const g = Math.max(coreGlow, sinT * 0.7);
    ctx.fillStyle = rgba(COLORS.brandAmber, 0.85 * g);
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 + 3 * g, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * BRACKET 夹持态：上下翼片拆离 -> 裂变为 4 枚 L 形对角选框角标精准扣合包围盒
 */
function drawBracketMorph(
  ctx,
  { x, y, size, angle, alpha, t, coreGlow, bracketBlend, bracketRect, bracketPulse }
) {
  const b = clamp(bracketBlend);
  const cx = bracketRect.x + bracketRect.w * 0.5;
  const cy = bracketRect.y + bracketRect.h * 0.5;

  // 当 b < 0.35 时，原棱片快速裂变淡出，同时四角角标从中心舒展飞向四个顶点
  if (b < 0.4) {
    const remAlpha = alpha * (1 - b / 0.4);
    drawPrismFold(ctx, {
      x: lerp(x, cx, b / 0.4),
      y: lerp(y, cy, b / 0.4),
      size: size * (1 + b * 0.35),
      angle: angle * (1 - b / 0.4),
      alpha: remAlpha,
      t,
      coreGlow,
      prismBlend: 0,
      glideSplit: 4 + b * 45,
      bracketBlend: 0,
    });
  }

  // 四角 L 形选框角标展开与扣合
  const spread = clamp((b - 0.12) / 0.88);
  if (spread <= 0.005) return;

  // 确认修订时的向内轻翻脉冲（使选框“咬合”一下）
  const pulseInset = Math.sin(clamp(bracketPulse) * Math.PI) * 9;
  const rx = bracketRect.x + pulseInset;
  const ry = bracketRect.y + pulseInset;
  const rw = Math.max(24, bracketRect.w - pulseInset * 2);
  const rh = Math.max(24, bracketRect.h - pulseInset * 2);

  const armLen = Math.min(26, Math.max(14, Math.min(rw, rh) * 0.18));

  const corners = [
    { tx: rx, ty: ry, dx: 1, dy: 1, color: COLORS.brandTeal },
    { tx: rx + rw, ty: ry, dx: -1, dy: 1, color: COLORS.brandTeal },
    { tx: rx, ty: ry + rh, dx: 1, dy: -1, color: COLORS.brandPeriwinkle },
    { tx: rx + rw, ty: ry + rh, dx: -1, dy: -1, color: COLORS.brandPeriwinkle },
  ];

  ctx.save();
  ctx.globalAlpha = clamp(alpha * Math.min(1, spread * 1.4));

  // 四边极细虚线框（在角标接近就位后淡入）
  if (spread > 0.5) {
    const dashAlpha = ((spread - 0.5) / 0.5) * 0.58;
    ctx.save();
    ctx.strokeStyle = rgba(COLORS.brandTeal, dashAlpha);
    ctx.lineWidth = 1.35;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  // 4 枚精致折角角标
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const c of corners) {
    const px = lerp(cx, c.tx, spread);
    const py = lerp(cy, c.ty, spread);

    // 轻微实体投影
    ctx.shadowColor = "rgba(28, 52, 58, 0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // 硫酸纸小折翼背衬（保留「棱片」血统）
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + c.dx * armLen, py);
    ctx.lineTo(px + c.dx * (armLen * 0.58), py + c.dy * (armLen * 0.58));
    ctx.lineTo(px, py + c.dy * armLen);
    ctx.closePath();
    ctx.fillStyle = rgba(c.color, 0.22);
    ctx.fill();

    // 锐利 L 形主描边
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(px + c.dx * armLen, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py + c.dy * armLen);
    ctx.stroke();

    // 角点暖杏微钉
    if (coreGlow > 0.08 || bracketPulse > 0.05) {
      ctx.fillStyle = rgba(COLORS.brandAmber, Math.max(coreGlow, bracketPulse));
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * 辅助：用三阶贝塞尔计算棱片平滑飞行位置与速度切线角
 */
export function evaluateFlight(p0, p1, p2, p3, u) {
  const pos = bezierPoint(p0, p1, p2, p3, clamp(u));
  const eps = 0.004;
  const pAhead = bezierPoint(p0, p1, p2, p3, clamp(u + eps));
  const pBehind = bezierPoint(p0, p1, p2, p3, clamp(u - eps));
  const angle = Math.atan2(pAhead.y - pBehind.y, pAhead.x - pBehind.x);
  return { x: pos.x, y: pos.y, angle };
}
