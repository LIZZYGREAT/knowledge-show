/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 严格受限于选框边界的暖杏水墨纸纹涟漪特效（炫技高定版）
 * 第四幕局部修订高潮：严禁转圈 Loading，以 0.9s 暖杏水墨晕染 + 金箔纸屑星芒 + 精密弧线完成框内局部焕新
 */

import { COLORS } from "../config/tokens.js";
import { clamp, lerp, rgba, easeEditorialOut, mulberry32, TAU } from "../core/math.js";
import { drawStarlightGlint } from "./ornaments.js";

const RIPPLE_FLECKS = (() => {
  const r = mulberry32(55441);
  return Array.from({ length: 28 }, () => ({
    ang: r() * TAU,
    distFactor: 0.25 + r() * 0.72,
    size: 3 + r() * 6,
    isStar: r() > 0.62,
    hue: r() > 0.4 ? COLORS.brandAmber : COLORS.brandTeal,
  }));
})();

export function drawBoxedInkRipple(ctx, rect, progress, { alpha = 1 } = {}) {
  const u = clamp(progress);
  if (u <= 0.002 || u >= 0.998 || alpha <= 0.005 || !rect) return;

  const cx = rect.x + rect.w * 0.44;
  const cy = rect.y + rect.h * 0.52;
  const maxR = Math.hypot(rect.w, rect.h) * 0.92;
  const expand = easeEditorialOut(u);
  const fadeOut = u < 0.52 ? 1 : 1 - (u - 0.52) / 0.48;

  ctx.save();
  // 严格裁切在选框内，绝不溢出到框外未选中元素！
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  ctx.globalAlpha = clamp(alpha * fadeOut);

  // 1. 双波暖杏 + 青绿宣纸水墨晕染云
  const rMain = lerp(18, maxR, expand);
  const rg = ctx.createRadialGradient(cx, cy, Math.max(2, rMain * 0.14), cx, cy, Math.max(8, rMain));
  rg.addColorStop(0, rgba("#FFF9EE", 0.0));
  rg.addColorStop(0.42, rgba(COLORS.brandAmber, 0.18));
  rg.addColorStop(0.72, rgba(COLORS.brandAmber, 0.38));
  rg.addColorStop(0.88, rgba(COLORS.brandTeal, 0.26));
  rg.addColorStop(1, rgba(COLORS.brandAmber, 0.0));

  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, rMain, 0, TAU);
  ctx.fill();

  // 2. 四层有机宣纸渗墨波纹环
  const rings = [
    { scale: 0.98, color: COLORS.brandAmber, width: 3.6, op: 0.76, seed: 1.2 },
    { scale: 0.80, color: COLORS.brandTeal, width: 2.4, op: 0.55, seed: 3.7 },
    { scale: 0.62, color: COLORS.brandAmber, width: 1.8, op: 0.45, seed: 5.9 },
    { scale: 0.42, color: COLORS.brandPeriwinkle, width: 1.4, op: 0.35, seed: 8.4 },
  ];

  for (const ring of rings) {
    const rr = rMain * ring.scale;
    if (rr < 8) continue;
    ctx.beginPath();
    const steps = 84;
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * TAU;
      const organic =
        1 +
        0.036 * Math.sin(ang * 5 + ring.seed + u * 3.5) +
        0.020 * Math.cos(ang * 11 - ring.seed);
      const px = cx + Math.cos(ang) * rr * organic;
      const py = cy + Math.sin(ang) * rr * organic;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = rgba(ring.color, ring.op);
    ctx.lineWidth = ring.width;
    ctx.stroke();
  }

  // 3. 框内漂浮金箔与四芒折光星芒（随涟漪前沿扩散点亮）
  for (const f of RIPPLE_FLECKS) {
    const rr = rMain * f.distFactor;
    const fx = cx + Math.cos(f.ang + u * 0.4) * rr;
    const fy = cy + Math.sin(f.ang + u * 0.4) * rr;
    if (f.isStar) {
      drawStarlightGlint(ctx, fx, fy, f.size * 1.9, "#FFFDF9", f.hue, 0.85 * fadeOut, f.ang);
    } else {
      ctx.fillStyle = rgba(f.hue, 0.72 * fadeOut);
      ctx.beginPath();
      ctx.arc(fx, fy, f.size * 0.48, 0, TAU);
      ctx.fill();
    }
  }

  // 4. 选框内沿温暖高光收边
  ctx.strokeStyle = rgba(COLORS.brandAmber, 0.58 * fadeOut);
  ctx.lineWidth = 4.5;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);

  ctx.restore();
}
