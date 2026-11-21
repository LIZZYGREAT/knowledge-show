/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 严格受限于选框边界的暖杏水墨纸纹涟漪特效
 * 第四幕局部修订高潮：严禁转圈 Loading，以 0.9s 暖杏水墨涟漪完成框内局部焕新
 */

import { COLORS } from "../config/tokens.js";
import { clamp, lerp, rgba, easeEditorialOut } from "../core/math.js";

/**
 * 绘制严格裁剪在 rect 内部的暖杏水墨涟漪
 * progress ∈ [0, 1]，约对应 0.9s 持续时间
 */
export function drawBoxedInkRipple(ctx, rect, progress, { alpha = 1 } = {}) {
  const u = clamp(progress);
  if (u <= 0.002 || u >= 0.998 || alpha <= 0.005 || !rect) return;

  const cx = rect.x + rect.w * 0.44;
  const cy = rect.y + rect.h * 0.52;
  const maxR = Math.hypot(rect.w, rect.h) * 0.88;
  const expand = easeEditorialOut(u);
  const fadeOut = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;

  ctx.save();
  // 严格裁切在选框内，绝不溢出到框外未选中元素！
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  ctx.globalAlpha = clamp(alpha * fadeOut);

  // 1. 暖杏纸墨晕染内波
  const rMain = lerp(18, maxR, expand);
  const rg = ctx.createRadialGradient(cx, cy, Math.max(2, rMain * 0.18), cx, cy, Math.max(8, rMain));
  rg.addColorStop(0, rgba("#FFF7E8", 0.0));
  rg.addColorStop(0.52, rgba(COLORS.brandAmber, 0.16));
  rg.addColorStop(0.78, rgba(COLORS.brandAmber, 0.34));
  rg.addColorStop(0.92, rgba(COLORS.brandTeal, 0.22));
  rg.addColorStop(1, rgba(COLORS.brandAmber, 0.0));

  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, rMain, 0, Math.PI * 2);
  ctx.fill();

  // 2. 有机纸纤维波纹外环（用低频正弦调制半径，呈现手工宣纸渗墨边缘）
  const rings = [
    { scale: 0.94, color: COLORS.brandAmber, width: 3.2, op: 0.65, seed: 1.2 },
    { scale: 0.72, color: COLORS.brandTeal, width: 2.0, op: 0.45, seed: 3.7 },
    { scale: 0.52, color: COLORS.brandAmber, width: 1.4, op: 0.35, seed: 5.9 },
  ];

  for (const ring of rings) {
    const rr = rMain * ring.scale;
    if (rr < 8) continue;
    ctx.beginPath();
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      const organic =
        1 +
        0.032 * Math.sin(ang * 5 + ring.seed + u * 3) +
        0.018 * Math.cos(ang * 9 - ring.seed);
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

  // 3. 选框内沿温和亮边反馈
  ctx.strokeStyle = rgba(COLORS.brandAmber, 0.45 * fadeOut);
  ctx.lineWidth = 4;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);

  ctx.restore();
}
