/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 品牌标识矢量组装与刊物落版
 * 100% 忠实复刻 frontend/src/components/BrandLogo.tsx 几何比例与色彩语义
 */

import { COLORS, FONTS } from "../config/tokens.js";
import { clamp, lerp, rgba, easeEditorialOut } from "../core/math.js";
import { roundRectPath } from "../core/paper.js";

/**
 * 绘制完整或组装中的 Knowledge.Show(me) 图标（100x100 坐标系缩放至 size）
 * opts: {
 *   cx, cy, size,
 *   tileAlpha,     // 暖白瓷片底卡渐显 [0, 1]
 *   spineDraw,     // 左侧青绿竖线自上而下优雅画出 [0, 1]
 *   prismClose,    // 右侧棱片合拢就位进度 [0, 1]（0 时处于略外侧微张态，1 时严丝合缝）
 *   coreGlow,      // 中央暖杏光核亮度 [0, 1]
 *   alpha
 * }
 */
export function drawBrandMark(ctx, opts = {}) {
  const {
    cx = 960,
    cy = 440,
    size = 136,
    tileAlpha = 1,
    spineDraw = 1,
    prismClose = 1,
    coreGlow = 1,
    alpha = 1,
  } = opts;

  if (alpha <= 0.005) return;
  const s = size / 100;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(cx - size * 0.5, cy - size * 0.5);
  ctx.scale(s, s);

  // 1. 暖瓷底卡（BrandLogo.tsx rx=26）
  if (tileAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp(tileAlpha);
    ctx.shadowColor = "rgba(28, 52, 58, 0.12)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    roundRectPath(ctx, 3, 3, 94, 94, 26);
    const tileGrad = ctx.createLinearGradient(6, 6, 94, 94);
    tileGrad.addColorStop(0, "#FFFFFF");
    tileGrad.addColorStop(0.55, "#F9F7F2");
    tileGrad.addColorStop(1, "#F4F8F8");
    ctx.fillStyle = tileGrad;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = rgba(COLORS.brandTeal, 0.24);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  // 2. 左侧青绿圆角竖线（钢笔自上而下画出）
  const sp = clamp(spineDraw);
  if (sp > 0.005) {
    ctx.save();
    const yBottom = lerp(16, 84, easeEditorialOut(sp));
    const h = Math.max(4, yBottom - 16);
    const spineGrad = ctx.createLinearGradient(20, 15, 36, 85);
    spineGrad.addColorStop(0, "#0F3C42");
    spineGrad.addColorStop(0.55, "#146368");
    spineGrad.addColorStop(1, COLORS.brandTeal);

    roundRectPath(ctx, 21, 16, 12.4, h, 6.2);
    ctx.fillStyle = spineGrad;
    ctx.fill();

    // 内侧细高光
    if (h > 14) {
      ctx.strokeStyle = "rgba(126, 250, 227, 0.45)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(24.8, 22.5);
      ctx.lineTo(24.8, Math.min(77.5, 16 + h - 6.5));
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 右侧上下棱片翼（忠实对齐 BrandLogo.tsx 路径）
  const pc = clamp(prismClose);
  if (pc > 0.005) {
    const gap = lerp(5.5, 0, easeEditorialOut(pc));
    const shiftX = lerp(16, 0, easeEditorialOut(pc));

    ctx.save();
    ctx.globalAlpha = clamp(pc * 1.15);

    // 上翼片（青绿渐变）
    ctx.save();
    ctx.translate(shiftX, -gap);
    ctx.beginPath();
    ctx.moveTo(36.8, 47.4);
    ctx.lineTo(50.8, 17.8);
    ctx.bezierCurveTo(52.6, 14, 57.6, 13.1, 60.8, 16);
    ctx.lineTo(86.6, 43);
    ctx.bezierCurveTo(89.3, 45.8, 87.3, 49.4, 83.2, 49.4);
    ctx.lineTo(38.6, 49.4);
    ctx.bezierCurveTo(37, 49.4, 36.2, 48.7, 36.8, 47.4);
    ctx.closePath();
    const gUpper = ctx.createLinearGradient(36, 14, 88, 52);
    gUpper.addColorStop(0, "#24C9B2");
    gUpper.addColorStop(0.55, COLORS.brandTeal);
    gUpper.addColorStop(1, "#2A84D8");
    ctx.fillStyle = gUpper;
    ctx.fill();
    ctx.restore();

    // 下翼片（湖蓝渐变）
    ctx.save();
    ctx.translate(shiftX, gap);
    ctx.beginPath();
    ctx.moveTo(36.8, 52.6);
    ctx.lineTo(50.8, 82.2);
    ctx.bezierCurveTo(52.6, 86, 57.6, 86.9, 60.8, 84);
    ctx.lineTo(86.6, 57);
    ctx.bezierCurveTo(89.3, 54.2, 87.3, 50.6, 83.2, 50.6);
    ctx.lineTo(38.6, 50.6);
    ctx.bezierCurveTo(37, 50.6, 36.2, 51.3, 36.8, 52.6);
    ctx.closePath();
    const gLower = ctx.createLinearGradient(36, 50, 88, 84);
    gLower.addColorStop(0, "#2F96E4");
    gLower.addColorStop(0.55, COLORS.brandPeriwinkle);
    gLower.addColorStop(1, "#6E5CE0");
    ctx.fillStyle = gLower;
    ctx.fill();
    ctx.restore();

    // 中央暖杏折光心与四芒星光核
    const cg = clamp(coreGlow);
    if (cg > 0.01) {
      ctx.save();
      ctx.globalAlpha = cg;
      ctx.beginPath();
      ctx.moveTo(37.8, 50);
      ctx.lineTo(59.5, 31);
      ctx.lineTo(85.5, 50);
      ctx.lineTo(59.5, 69);
      ctx.closePath();
      const gHeart = ctx.createLinearGradient(37, 32, 84, 66);
      gHeart.addColorStop(0, "rgba(255, 255, 255, 0.86)");
      gHeart.addColorStop(0.46, "rgba(255, 210, 138, 0.72)");
      gHeart.addColorStop(0.78, "rgba(242, 153, 74, 0.44)");
      gHeart.addColorStop(1, "rgba(146, 247, 229, 0.25)");
      ctx.fillStyle = gHeart;
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(39, 50);
      ctx.lineTo(84.5, 50);
      ctx.stroke();

      // 四芒星光核
      ctx.beginPath();
      ctx.moveTo(59.5, 39.5);
      ctx.quadraticCurveTo(59.5, 50, 70, 50);
      ctx.quadraticCurveTo(59.5, 50, 59.5, 60.5);
      ctx.quadraticCurveTo(59.5, 50, 49, 50);
      ctx.quadraticCurveTo(59.5, 50, 59.5, 39.5);
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(59.5, 50, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.brandAmber;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制品牌字标与收束语：
 *   Knowledge.Show(me)
 *   让好奇可见，让作品随心。
 */
export function drawBrandWordmark(
  ctx,
  { cx = 960, y = 578, wordmarkAlpha = 1, taglineAlpha = 1, scale = 1 } = {}
) {
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(scale, scale);

  if (wordmarkAlpha > 0.01) {
    const a = clamp(wordmarkAlpha);
    const dy = lerp(14, 0, easeEditorialOut(a));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, dy);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const parts = [
      { text: "Knowledge", font: `500 54px ${FONTS.serif}`, color: COLORS.inkPrimary },
      { text: ".", font: `600 54px ${FONTS.serif}`, color: COLORS.brandTeal },
      { text: "Show", font: `600 54px ${FONTS.serif}`, color: COLORS.brandTeal },
      { text: "(", font: `300 50px ${FONTS.serif}`, color: "#7C9B96" },
      { text: "me", font: `italic 500 52px ${FONTS.serif}`, color: "#CC7824" },
      { text: ")", font: `300 50px ${FONTS.serif}`, color: "#7C9B96" },
    ];

    let totalW = 0;
    const widths = parts.map((p) => {
      ctx.font = p.font;
      const w = ctx.measureText(p.text).width;
      totalW += w;
      return w;
    });

    let curX = -totalW * 0.5;
    for (let i = 0; i < parts.length; i++) {
      ctx.font = parts[i].font;
      ctx.fillStyle = parts[i].color;
      ctx.fillText(parts[i].text, curX, 0);
      curX += widths[i];
    }
    ctx.restore();
  }

  if (taglineAlpha > 0.01) {
    const a = clamp(taglineAlpha);
    const dy = lerp(12, 0, easeEditorialOut(a));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(0, dy);
    ctx.font = `500 28px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 宽松典雅字距绘制
    const tagline = "让好奇可见，让作品随心。";
    const chars = Array.from(tagline);
    const letterGap = 5.5;
    let totalW = 0;
    const cw = chars.map((ch) => {
      const w = ctx.measureText(ch).width;
      totalW += w;
      return w;
    });
    totalW += letterGap * (chars.length - 1);
    let x = -totalW * 0.5;
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x + cw[i] * 0.5, 68);
      x += cw[i] + letterGap;
    }
    ctx.restore();
  }

  ctx.restore();
}
