/*
 * 第三幕：万物剧场与棱片翻页（0:52 – 1:32，高定炫技大秀版）
 * 0:52 – 1:04  微观晶格入界面：玻璃晶格共振 + 倾斜波前推进 + 7 色行进光子珠（红快紫慢肉眼可见）
 * 1:04 – 1:14  全景水彩彩虹（黄铜测角仪 + 立体纸艺舞台 + 午后斜阳焦散，B 站封面级高光）
 * 1:14 – 1:23  同题异风两次 FOLD 中轴翻页（纸艺编辑风 -> Bauhaus 现代图形风 -> 手工拼贴叙事风）
 * 1:23 – 1:32  三大跨主题视觉奇观：肥皂泡群与薄膜干涉 -> PN 结能垒山丘与黄铜电流表 -> 真 3D 多面骰子与概率钟形云
 */

import { COLORS, SPECTRUM, FONTS, STYLE_PROFILES, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  rgba,
  easeEditorialOut,
  easeEditorialInOut,
  springProgress,
  TAU,
} from "../core/math.js";
import { drawPaperBase, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawPopupPaperDiorama,
  drawStarlightGlint,
  drawOrigamiConfettiBurst,
  drawEditorialPrintMarks,
} from "../entities/ornaments.js";

/**
 * 52s - 64s：微观玻璃晶格共振 + 7 色波列步幅分化 + 推进波前 + 光子珠
 */
function drawMicroRefraction(ctx, t, alpha) {
  if (alpha <= 0.005) return;
  const pEnter = easeEditorialOut(segProgress(t, 52.0, 53.8));
  const pCross = easeEditorialOut(segProgress(t, 53.1, 59.8));

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  const bxTop = 860;
  const bxBot = 660;
  const boundaryXAt = (y) => lerp(bxTop, bxBot, y / STAGE_H);

  // 1. 倾斜半透明玻璃介质 + 内部晶格节点微振阵列（直观解释光在介质中为何减速）
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bxTop, -20);
  ctx.lineTo(STAGE_W + 40, -20);
  ctx.lineTo(STAGE_W + 40, STAGE_H + 20);
  ctx.lineTo(bxBot, STAGE_H + 20);
  ctx.closePath();

  const glassGrad = ctx.createLinearGradient(bxBot, 0, STAGE_W, STAGE_H);
  glassGrad.addColorStop(0, "rgba(219, 240, 238, 0.78)");
  glassGrad.addColorStop(0.5, "rgba(234, 245, 247, 0.62)");
  glassGrad.addColorStop(1, "rgba(226, 236, 249, 0.72)");
  ctx.fillStyle = glassGrad;
  ctx.fill();
  ctx.clip();

  // 玻璃内部精致六角晶格节点（受波列激发轻轻呼吸，展现介质原子阻滞感）
  const stepX = 112;
  const stepY = 98;
  for (let row = 0; row <= 12; row++) {
    for (let col = 0; col <= 13; col++) {
      const gx = 680 + col * stepX + (row % 2) * (stepX * 0.5);
      const gy = row * stepY;
      if (gx < boundaryXAt(gy) + 28) continue;
      const osc = Math.sin(t * 5.2 - gx * 0.015 + gy * 0.01) * 3.2 * pCross;
      ctx.strokeStyle = "rgba(18, 148, 141, 0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(gx + osc, gy, 15, 0, TAU);
      ctx.stroke();

      ctx.fillStyle = "rgba(18, 148, 141, 0.22)";
      ctx.beginPath();
      ctx.arc(gx + osc, gy, 3.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // 玻璃折射界面的双层高光厚线 + 刻度
  ctx.strokeStyle = "rgba(18, 148, 141, 0.42)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(bxTop, 0);
  ctx.lineTo(bxBot, STAGE_H);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(bxTop + 5, 0);
  ctx.lineTo(bxBot + 5, STAGE_H);
  ctx.stroke();

  // 顶部刊物注记卡片
  drawPaperCard(ctx, 130, 74, 240, 44, {
    radius: 22,
    fill: "rgba(255, 253, 249, 0.90)",
    stroke: COLORS.inkHairline,
    lineWidth: 1.2,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.font = `600 14px ${FONTS.mono}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AIR · 空气中步幅一致", 250, 96);

  drawPaperCard(ctx, 940, 74, 376, 44, {
    radius: 22,
    fill: "rgba(255, 253, 249, 0.90)",
    stroke: rgba(COLORS.brandTeal, 0.34),
    lineWidth: 1.2,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.fillStyle = COLORS.brandTealDark;
  ctx.fillText("GLASS LATTICE · 介质减速与偏折分化", 1128, 96);
  ctx.textAlign = "left";

  // 2. 7 排并肩彩色波列 + 同步行进光子珠
  const incAng = (14 * Math.PI) / 180;
  const incDx = Math.cos(incAng);
  const incDy = Math.sin(incAng);
  const incNx = -incDy;
  const incNy = incDx;

  const beadPoints = [];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    const yHit = 246 + i * 94;
    const xHit = boundaryXAt(yHit);

    // 空气段
    const airLen = 860 * pEnter;
    const airLambda = 112 - i * 4.5;
    const airAmp = 10.5;
    const omega = 5.4;

    ctx.beginPath();
    for (let k = 0; k <= 120; k++) {
      const s = -airLen + (k / 120) * airLen;
      const w = Math.sin((TAU * s) / airLambda - omega * t + band.phase) * airAmp;
      const px = xHit + incDx * s + incNx * w;
      const py = yHit + incDy * s + incNy * w;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = rgba(band.hex, 0.14);
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.strokeStyle = rgba(band.hex, 0.80);
    ctx.lineWidth = 5.4;
    ctx.stroke();

    // 玻璃内部段（高密度 340 步采样，丝滑圆润！）
    if (pCross > 0.01) {
      const refAng = ((16 + i * 3.85) * Math.PI) / 180;
      const rDx = Math.cos(refAng);
      const rDy = Math.sin(refAng);
      const rNx = -rDy;
      const rNy = rDx;
      const glassLen = 1140 * pCross;
      const glassLambda = lerp(96, 42, i / 6);
      const glassAmp = lerp(12.2, 14.6, i / 6);

      ctx.beginPath();
      for (let k = 0; k <= 340; k++) {
        const s = (k / 340) * glassLen;
        const w = Math.sin((TAU * s) / glassLambda - omega * t + band.phase) * glassAmp;
        const px = xHit + rDx * s + rNx * w;
        const py = yHit + rDy * s + rNy * w;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(band.hex, 0.18);
      ctx.lineWidth = 24;
      ctx.stroke();

      ctx.strokeStyle = rgba(band.hex, 0.90);
      ctx.lineWidth = 5.2;
      ctx.stroke();

      // 沿每道色波冲浪的行进光子珠（红光步幅大跑得快，紫光密集紧凑！）
      const speedPx = lerp(165, 86, i / 6);
      for (let m = 0; m < 4; m++) {
        const s = ((m * 280 + t * speedPx) % Math.max(40, glassLen));
        const w = Math.sin((TAU * s) / glassLambda - omega * t + band.phase) * glassAmp;
        beadPoints.push({
          x: xHit + rDx * s + rNx * w,
          y: yHit + rDy * s + rNy * w,
          color: band.hex,
        });
      }

      // 界面入射点星芒
      beadPoints.push({ x: xHit, y: yHit, color: band.hex, isHit: true });
    }
  }
  ctx.restore();

  // 绘制晶莹行进光子珠与界面闪光
  for (const pt of beadPoints) {
    if (pt.isHit) {
      drawStarlightGlint(ctx, pt.x, pt.y, 11, "#FFFFFF", pt.color, 0.78, t * 0.4);
    } else {
      ctx.fillStyle = rgba(pt.color, 0.28);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. 红光长步幅 vs 紫光短步幅暖纸标尺卡
  const calloutAlpha = easeEditorialOut(segProgress(t, 56.0, 57.8));
  if (calloutAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * calloutAlpha);

    drawPaperCard(ctx, 1140, 224, 308, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: "rgba(229, 107, 111, 0.42)",
      lineWidth: 1.3,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    ctx.strokeStyle = "#D4575C";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(1162, 247);
    ctx.lineTo(1238, 247);
    ctx.moveTo(1162, 239);
    ctx.lineTo(1162, 255);
    ctx.moveTo(1238, 239);
    ctx.lineTo(1238, 255);
    ctx.stroke();
    ctx.font = `600 15px ${FONTS.sans}`;
    ctx.fillStyle = "#B5464B";
    ctx.textBaseline = "middle";
    ctx.fillText("红光 · 长波舒展 · 微折", 1254, 248);

    drawPaperCard(ctx, 1112, 930, 296, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: "rgba(142, 108, 187, 0.42)",
      lineWidth: 1.3,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    ctx.strokeStyle = "#7D5BA8";
    ctx.beginPath();
    ctx.moveTo(1134, 953);
    ctx.lineTo(1176, 953);
    ctx.moveTo(1134, 945);
    ctx.lineTo(1134, 961);
    ctx.moveTo(1176, 945);
    ctx.lineTo(1176, 961);
    ctx.stroke();
    ctx.fillStyle = "#694A91";
    ctx.fillText("紫光 · 短波紧促 · 急折", 1192, 954);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制三种风格迥异、各具收藏级美感的全景彩虹画幅
 */
function drawStyledRainbowScene(ctx, styleId, t, alpha = 1) {
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  drawPaperBase(ctx, STAGE_W, STAGE_H, {
    baseColor: style.bg,
    tealGlow: styleId === "paper-editorial" ? 1.0 : 0.35,
    amberGlow: styleId === "paper-editorial" ? 1.0 : 0.45,
    dotGridAlpha: styleId === "narrative-collage" ? 0.045 : 0.024,
  });

  // ── 风格专属高定背景艺术装置 ────────────────────────────────────────────
  if (styleId === "paper-editorial") {
    drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.95);
    drawPopupPaperDiorama(ctx, 660, 560, 1, 0.88);
    drawBrassGoniometer(ctx, 640, 540, 365, t, { alpha: 0.92, reveal: 1 });
  } else if (styleId === "modern-graphic") {
    // Bauhaus / 瑞士海报现代图形风：大幅旋转色环 + 醒目几何色块 + 瑞士无衬线大排版
    ctx.save();
    // 右上明快 Bauhaus 半圆与色块构图
    ctx.fillStyle = "rgba(236, 75, 83, 0.14)";
    ctx.beginPath();
    ctx.arc(1660, 210, 195, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "rgba(34, 98, 196, 0.12)";
    ctx.fillRect(1560, 74, 210, 78);
    ctx.strokeStyle = "#202638";
    ctx.lineWidth = 3;
    ctx.strokeRect(1560, 74, 210, 78);

    // 围绕棱镜的硬边瑞士同心旋转几何环
    ctx.translate(640, 540);
    ctx.rotate(t * 0.08);
    ctx.strokeStyle = "rgba(32, 38, 56, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 390, -0.45, 0.95);
    ctx.stroke();
    ctx.strokeStyle = "#F0833A";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 412, -0.25, 0.35);
    ctx.stroke();
    ctx.strokeStyle = "#2262C4";
    ctx.beginPath();
    ctx.arc(0, 0, 412, 0.42, 0.85);
    ctx.stroke();
    ctx.restore();

    // 醒目瑞士排版标题水印
    ctx.save();
    ctx.font = `700 84px ${FONTS.sans}`;
    ctx.fillStyle = "rgba(32, 38, 56, 0.075)";
    ctx.fillText("SPECTRUM", 1120, 224);
    ctx.font = `600 24px ${FONTS.mono}`;
    ctx.fillStyle = "rgba(32, 38, 56, 0.52)";
    ctx.fillText("405nm — 680nm · DISPERSION", 1126, 268);
    ctx.restore();
  } else if (styleId === "narrative-collage") {
    // 手工叙事拼贴风：撕边牛皮纸条 + 复古日蚀网点圆 + 胶带色卡 + 朱红邮戳印章 + 缝线虚轨迹
    ctx.save();
    // 复古手绘太阳网点大圆（拼贴于棱镜背后）
    ctx.fillStyle = "rgba(215, 174, 82, 0.22)";
    ctx.beginPath();
    ctx.arc(640, 540, 345, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 55, 48, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(640, 540, 368, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 左上斜贴手工牛皮纸便签条 + 半透明和纸胶带
    ctx.save();
    ctx.translate(115, 118);
    ctx.rotate(-0.045);
    drawPaperCard(ctx, 0, 0, 340, 94, {
      radius: 3,
      fill: "#F8F1E1",
      stroke: "rgba(59, 55, 48, 0.34)",
      lineWidth: 1.6,
      shadowBlur: 14,
      shadowOffsetY: 6,
    });
    // 半透明和纸胶带
    ctx.fillStyle = "rgba(217, 107, 82, 0.34)";
    ctx.fillRect(118, -14, 104, 26);
    ctx.font = `600 18px ${FONTS.serif}`;
    ctx.fillStyle = "#2C2B29";
    ctx.fillText("牛顿色散手记 · 1672", 24, 40);
    ctx.font = `400 13px ${FONTS.mono}`;
    ctx.fillStyle = "#6B6558";
    ctx.fillText("COLLAGE EDITION · HANDMADE", 24, 68);
    ctx.restore();

    // 右上手工拼贴色标卡 + 复古朱红圆形邮戳印章
    ctx.save();
    ctx.translate(1510, 120);
    ctx.rotate(0.05);
    drawPaperCard(ctx, 0, 0, 276, 82, {
      radius: 4,
      fill: "#F8F1E1",
      stroke: "rgba(59, 55, 48, 0.36)",
      lineWidth: 1.6,
      shadowBlur: 14,
      shadowOffsetY: 6,
    });
    style.palette.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(18 + idx * 35, 18, 27, 46);
    });
    ctx.restore();

    // 圆形复古邮戳印章
    ctx.save();
    ctx.translate(1748, 248);
    ctx.rotate(-0.18);
    ctx.strokeStyle = "rgba(196, 82, 58, 0.62)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, TAU);
    ctx.stroke();
    ctx.font = `700 13px ${FONTS.mono}`;
    ctx.fillStyle = "rgba(196, 82, 58, 0.72)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OPTICS", 0, -9);
    ctx.fillText("1672", 0, 11);
    ctx.restore();

    ctx.restore();
  }

  // 主棱镜与 7 股波动彩虹
  drawRainbowOptics(ctx, {
    cx: 640,
    cy: 540,
    size: 278,
    t,
    popup: 1,
    beamProgress: 1,
    dispersionProgress: 1,
    styleId,
    alpha: 1,
    showWaveBeads: true,
    ribbonLen: 1140,
  });

  // 风格左下角刊物印章标
  ctx.save();
  drawPaperCard(ctx, 78, 924, 278, 58, {
    radius: 29,
    fill: "rgba(255, 253, 249, 0.92)",
    stroke: "rgba(28, 42, 48, 0.16)",
    lineWidth: 1.3,
    shadowBlur: 14,
    shadowOffsetY: 5,
  });
  ctx.fillStyle = style.palette[3];
  ctx.beginPath();
  ctx.arc(108, 953, 6.5, 0, TAU);
  ctx.fill();
  ctx.font = `600 18px ${FONTS.serif}`;
  ctx.fillStyle = style.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(style.name, 128, 953);
  ctx.font = `500 12px ${FONTS.mono}`;
  ctx.fillStyle = style.muted;
  ctx.fillText(style.id, 232, 954);
  ctx.restore();

  ctx.restore();
}

/**
 * 跨主题奇观 ①（83.0 - 86.0s）：多泡虹彩浮群 + 表面活性剂分子环 + 薄膜双面反射干涉波
 */
function drawSoapMorph(ctx, t) {
  const pIn = springProgress(segProgress(t, 83.0, 84.0), 0.65, 0.78, 17);
  const pPop = easeEditorialInOut(segProgress(t, 85.45, 86.0));

  drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
  drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.9);

  const cx = 960;
  const cy = 518 + Math.sin(t * 2.6) * 10;
  const R = lerp(95, 272, pIn) * (1 + pPop * 0.25);

  ctx.save();
  ctx.globalAlpha = 1 - pPop;

  // 背景卫星浮泡（营造立体景深空气感！）
  const satellites = [
    { x: 510, y: 310 + Math.sin(t * 2.1) * 14, r: 74 * pIn },
    { x: 1430, y: 350 + Math.cos(t * 1.9) * 16, r: 92 * pIn },
    { x: 1360, y: 740 + Math.sin(t * 2.4 + 1) * 12, r: 52 * pIn },
    { x: 575, y: 735 + Math.cos(t * 2.2 + 2) * 12, r: 44 * pIn },
  ];
  for (const sat of satellites) {
    const sg = ctx.createRadialGradient(sat.x - sat.r * 0.3, sat.y - sat.r * 0.3, 4, sat.x, sat.y, sat.r);
    sg.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    sg.addColorStop(0.65, "rgba(220, 245, 242, 0.32)");
    sg.addColorStop(0.92, "rgba(242, 153, 74, 0.24)");
    sg.addColorStop(1, "rgba(78, 124, 246, 0.34)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sat.x, sat.y, sat.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(18, 148, 141, 0.26)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // 主泡周围极细光学薄膜厚度刻度环
  drawBrassGoniometer(ctx, cx, cy, R + 76, t * 1.2, { alpha: 0.55, reveal: pIn, showVernier: false });

  // 落影
  const sh = ctx.createRadialGradient(cx, cy + R + 66, 12, cx, cy + R + 66, R * 0.95);
  sh.addColorStop(0, "rgba(28, 52, 58, 0.12)");
  sh.addColorStop(1, "rgba(28, 52, 58, 0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R + 66, R * 0.9, 30, 0, 0, TAU);
  ctx.fill();

  // 主肥皂泡球体
  const bubbleGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.3, R * 0.08, cx, cy, R);
  bubbleGrad.addColorStop(0, "rgba(255, 254, 251, 0.95)");
  bubbleGrad.addColorStop(0.50, "rgba(232, 248, 245, 0.48)");
  bubbleGrad.addColorStop(0.80, "rgba(242, 153, 74, 0.28)");
  bubbleGrad.addColorStop(0.93, "rgba(78, 124, 246, 0.34)");
  bubbleGrad.addColorStop(1, "rgba(18, 148, 141, 0.48)");
  ctx.fillStyle = bubbleGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();

  // 表面流淌的七彩薄膜干涉水彩波纹
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 3, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    ctx.beginPath();
    const yBase = cy - R * 0.58 + i * (R * 0.195);
    for (let k = 0; k <= 80; k++) {
      const x = cx - R + (k / 80) * R * 2;
      const y = yBase + Math.sin(x * 0.015 + t * 3.4 + i * 0.85) * 28;
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(band.hex, 0.50);
    ctx.lineWidth = 16;
    ctx.stroke();
  }
  ctx.restore();

  // 玻璃弧形主高光 + 折光星芒
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.82, -2.55, -1.72);
  ctx.stroke();

  drawStarlightGlint(ctx, cx - R * 0.58, cy - R * 0.58, 18, "#FFFFFF", COLORS.brandAmber, 0.9, t);

  ctx.strokeStyle = "rgba(18, 148, 141, 0.42)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();

  // 亲水青绿头 + 疏水暖杏波浪尾的肥皂表面活性剂分子环（20 枚灵动绕行！）
  for (let m = 0; m < 20; m++) {
    const ang = (m / 20) * TAU + t * 0.4;
    const mx = cx + Math.cos(ang) * (R + 30);
    const my = cy + Math.sin(ang) * (R + 30);
    const ix = cx + Math.cos(ang) * (R + 6);
    const iy = cy + Math.sin(ang) * (R + 6);
    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.8);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(ix, iy);
    ctx.stroke();
    ctx.fillStyle = m % 2 === 0 ? COLORS.brandTeal : COLORS.brandPeriwinkle;
    ctx.beginPath();
    ctx.arc(mx, my, 6.2, 0, TAU);
    ctx.fill();
  }

  // 右侧微缩“薄膜内外双面反射干涉”原理气泡卡
  drawPaperCard(ctx, cx + R + 92, cy - 68, 252, 136, {
    radius: 16,
    fill: "rgba(255, 253, 249, 0.94)",
    stroke: rgba(COLORS.brandTeal, 0.34),
    lineWidth: 1.3,
    shadowBlur: 18,
    shadowOffsetY: 7,
  });
  ctx.font = `600 15px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.fillText("薄膜双面反射干涉", cx + R + 114, cy - 36);
  // 双面反射双波线
  [0, 1].forEach((k) => {
    ctx.beginPath();
    for (let px = 0; px <= 198; px += 4) {
      const py = cy + 8 + k * 24 + Math.sin(px * 0.08 - t * 6 + k * 1.1) * 7;
      px === 0 ? ctx.moveTo(cx + R + 114 + px, py) : ctx.lineTo(cx + R + 114 + px, py);
    }
    ctx.strokeStyle = k === 0 ? "#E56B6F" : "#4E9AF1";
    ctx.lineWidth = 2.4;
    ctx.stroke();
  });

  ctx.font = `600 20px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.textAlign = "center";
  ctx.fillText("薄膜干涉与表面张力 · 肥皂泡的彩色奥秘", cx, cy + R + 106);
  ctx.restore();

  // 85.45s 破开飞溅彩纸与载流子粒子，直接无缝接力 PN 结！
  if (pPop > 0.02) {
    drawOrigamiConfettiBurst(ctx, cx, cy, pPop, { seed: 8545, count: 32, spread: 340, alpha: 0.9 });
  }
}

/**
 * 跨主题奇观 ②（86.0 - 89.0s）：精工陶瓷 PN 结 + 固定离子晶格 + 实时能垒山丘 + 摆动黄铜电流表
 */
function drawPnMorph(ctx, t) {
  const pIn = springProgress(segProgress(t, 86.0, 86.85), 0.55, 0.78, 18);
  const pBias = easeEditorialInOut(segProgress(t, 86.9, 88.25));
  const pFoldOut = easeEditorialInOut(segProgress(t, 88.45, 89.0));

  drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
  drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.8);

  const cx = 860;
  const cy = 446;
  const boxW = lerp(1060, 440, pFoldOut) * lerp(0.88, 1, pIn);
  const boxH = lerp(370, 300, pFoldOut);
  const x0 = cx - boxW * 0.5;
  const y0 = cy - boxH * 0.5;
  const depW = lerp(176, 52, pBias);

  ctx.save();
  ctx.globalAlpha = 1 - pFoldOut * 0.35;

  // 陶瓷暖纸结本体卡片
  drawPaperCard(ctx, x0, y0, boxW, boxH, {
    radius: 26,
    fill: COLORS.paperElevated,
    stroke: "rgba(28, 42, 48, 0.24)",
    lineWidth: 2.2,
    shadowBlur: 30,
    shadowOffsetY: 14,
  });

  ctx.save();
  roundRectPath(ctx, x0 + 2, y0 + 2, boxW - 4, boxH - 4, 24);
  ctx.clip();

  ctx.fillStyle = "rgba(242, 153, 74, 0.12)";
  ctx.fillRect(x0, y0, boxW * 0.5 - depW * 0.5, boxH);
  ctx.fillStyle = "rgba(18, 148, 141, 0.12)";
  ctx.fillRect(cx + depW * 0.5, y0, boxW * 0.5 - depW * 0.5, boxH);

  // 中央耗尽层斜线纹理 + 内建电场方向箭头 (N -> P)
  ctx.fillStyle = "rgba(28, 42, 48, 0.055)";
  ctx.fillRect(cx - depW * 0.5, y0, depW, boxH);
  ctx.strokeStyle = "rgba(28, 42, 48, 0.22)";
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - depW * 0.5, y0);
  ctx.lineTo(cx - depW * 0.5, y0 + boxH);
  ctx.moveTo(cx + depW * 0.5, y0);
  ctx.lineTo(cx + depW * 0.5, y0 + boxH);
  ctx.stroke();
  ctx.setLineDash([]);

  // 固定晶格离子（不随载流子漂移，科学准确！）
  for (let r = 0; r < 4; r++) {
    const iy = y0 + 56 + r * 86;
    ctx.font = `700 16px ${FONTS.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(198, 90, 75, 0.36)";
    ctx.fillText("⊖", cx - depW * 0.26, iy);
    ctx.fillStyle = "rgba(18, 148, 141, 0.36)";
    ctx.fillText("⊕", cx + depW * 0.26, iy);
  }

  // 带运动尾迹的 P 区空穴与 N 区电子定向导通流
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const drift = pBias * 185 * (1 - pFoldOut);
      const hx = x0 + 68 + c * 92 + drift * 0.58;
      const hy = y0 + 62 + r * 82 + Math.sin(t * 4.5 + r + c) * 4;
      if (pBias > 0.15) {
        const tg = ctx.createLinearGradient(hx - 40, hy, hx, hy);
        tg.addColorStop(0, "rgba(220, 107, 92, 0)");
        tg.addColorStop(1, "rgba(220, 107, 92, 0.45)");
        ctx.strokeStyle = tg;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(hx - 38 * pBias, hy);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
      ctx.strokeStyle = "#DC6B5C";
      ctx.lineWidth = 3.2;
      ctx.fillStyle = "#FFFDF9";
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, TAU);
      ctx.fill();
      ctx.stroke();

      const ex = x0 + boxW - 68 - c * 92 - drift * 0.58;
      const ey = y0 + 62 + r * 82 + Math.cos(t * 4.5 + r - c) * 4;
      if (pBias > 0.15) {
        const tg2 = ctx.createLinearGradient(ex + 40, ey, ex, ey);
        tg2.addColorStop(0, "rgba(18, 148, 141, 0)");
        tg2.addColorStop(1, "rgba(18, 148, 141, 0.45)");
        ctx.strokeStyle = tg2;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ex + 38 * pBias, ey);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.brandTeal;
      ctx.beginPath();
      ctx.arc(ex, ey, 11, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // 下方实时势垒地形图（正向偏置时势垒山坡平滑降低！）
  if (pFoldOut < 0.4) {
    const hillY = 740;
    const hillW = 780;
    const hx0 = cx - hillW * 0.5;
    const dropH = lerp(112, 34, pBias);

    drawPaperCard(ctx, hx0 - 30, hillY - 76, hillW + 60, 178, {
      radius: 18,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: COLORS.inkHairline,
      lineWidth: 1.3,
      shadowBlur: 18,
      shadowOffsetY: 6,
    });

    ctx.beginPath();
    for (let k = 0; k <= 80; k++) {
      const u = k / 80;
      const px = hx0 + u * hillW;
      const s = 1 / (1 + Math.exp(-(u - 0.5) * 14));
      const py = hillY + 46 - s * dropH;
      k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = COLORS.brandPeriwinkle;
    ctx.lineWidth = 3.8;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.font = `600 14px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "left";
    ctx.fillText(`POTENTIAL BARRIER · 势垒高度 ${(lerp(0.7, 0.18, pBias)).toFixed(2)} eV`, hx0, hillY - 46);
  }

  // 右侧摆动的精工黄铜指针微安表（视觉爆点：电流瞬间抬升！）
  if (pFoldOut < 0.45) {
    const mx = 1585;
    const my = 520;
    const mr = 148;
    drawPaperCard(ctx, mx - mr - 22, my - mr - 22, (mr + 22) * 2, (mr + 22) * 2 + 44, {
      radius: 24,
      fill: "#FFFDF9",
      stroke: "rgba(176, 128, 66, 0.42)",
      lineWidth: 2,
      shadowBlur: 24,
      shadowOffsetY: 10,
    });

    // 仪表弧形刻度盘
    ctx.strokeStyle = "rgba(28, 42, 48, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my + 18, mr * 0.78, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    for (let k = 0; k <= 12; k++) {
      const ang = lerp(Math.PI * 1.15, Math.PI * 1.85, k / 12);
      ctx.strokeStyle = k >= 9 ? COLORS.brandTeal : "rgba(28, 42, 48, 0.35)";
      ctx.lineWidth = k % 3 === 0 ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(ang) * mr * 0.68, my + 18 + Math.sin(ang) * mr * 0.68);
      ctx.lineTo(mx + Math.cos(ang) * mr * 0.78, my + 18 + Math.sin(ang) * mr * 0.78);
      ctx.stroke();
    }

    // 灵动黄铜表针
    const needleAng = lerp(Math.PI * 1.20, Math.PI * 1.78, pBias);
    ctx.strokeStyle = "#C65A4B";
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx, my + 18);
    ctx.lineTo(mx + Math.cos(needleAng) * mr * 0.64, my + 18 + Math.sin(needleAng) * mr * 0.64);
    ctx.stroke();

    ctx.fillStyle = "#B88648";
    ctx.beginPath();
    ctx.arc(mx, my + 18, 9, 0, TAU);
    ctx.fill();

    ctx.font = `700 24px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.brandTealDark;
    ctx.textAlign = "center";
    ctx.fillText(`${(pBias * 18.4).toFixed(1)} mA`, mx, my + 96);
    ctx.font = `500 13px ${FONTS.sans}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.fillText("正向导通电流 · FORWARD BIAS", mx, my + 126);
  }

  ctx.font = `600 21px ${FONTS.mono}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#C65A4B";
  ctx.fillText("P-TYPE · 空穴", cx - boxW * 0.3, y0 - 26);
  ctx.fillStyle = COLORS.brandTealDark;
  ctx.fillText("N-TYPE · 电子", cx + boxW * 0.3, y0 - 26);
  ctx.restore();
}

/**
 * 跨主题奇观 ③（89.0 - 92.0s）：真 3D 多面阴影立体骰子 + 掉落概率粒子 + 水彩钟形峰曲线
 */
function drawDiceToRainbowMorph(ctx, t) {
  const pDiceIn = springProgress(segProgress(t, 89.0, 89.8), 0.54, 0.72, 18);
  const pBack = easeEditorialInOut(segProgress(t, 90.85, 92.0));

  if (pBack > 0.05) {
    drawStyledRainbowScene(ctx, "paper-editorial", 92.0, clamp((pBack - 0.05) / 0.95));
  } else {
    drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
    drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.85);
  }

  const diceAlpha = 1 - easeEditorialOut(segProgress(t, 90.8, 91.65));
  if (diceAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = diceAlpha;

  // 1. 钟形柱图 + 柔和青绿平滑包络曲线 + 顶部 7 号金星皇冠
  const bars = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
  const baseY = 856;

  // 柔和钟形包络底弧
  ctx.beginPath();
  for (let i = 0; i < bars.length; i++) {
    const bx = 460 + i * 100;
    const by = baseY - bars[i] * 40 * pDiceIn - 18;
    i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
  }
  ctx.strokeStyle = rgba(COLORS.brandAmber, 0.45);
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < bars.length; i++) {
    const bx = 460 + i * 100;
    const bh = bars[i] * 40 * pDiceIn;
    const isSeven = i === 5;

    // 柱体内层叠小点数方块（直观展示 36 种有序组合！）
    for (let u = 0; u < bars[i]; u++) {
      const uy = baseY - (u + 1) * 40 * pDiceIn + 4;
      roundRectPath(ctx, bx - 28, uy, 56, 32 * pDiceIn, 8);
      ctx.fillStyle = isSeven ? rgba(COLORS.brandAmber, 0.32 + u * 0.06) : rgba(COLORS.brandTeal, 0.14 + u * 0.04);
      ctx.fill();
      ctx.strokeStyle = isSeven ? COLORS.brandAmber : rgba(COLORS.brandTeal, 0.36);
      ctx.lineWidth = isSeven ? 2 : 1.2;
      ctx.stroke();
    }

    if (isSeven) {
      drawStarlightGlint(ctx, bx, baseY - bh - 34, 18, "#FFFFFF", COLORS.brandAmber, pDiceIn, t);
    }

    ctx.font = `700 17px ${FONTS.mono}`;
    ctx.fillStyle = isSeven ? "#A85D15" : COLORS.inkSecondary;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 2), bx, baseY + 28);
  }

  // 2. 真 3D 等轴测三面暖纸立体骰子（顶面、左面、右面严格透视与受光阴影！）
  const drawIsoDie = (cx, cy, s, tilt, topPips, leftPips, rightPips, accent) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // 柔和桌面落影
    ctx.fillStyle = "rgba(28, 52, 58, 0.11)";
    ctx.beginPath();
    ctx.ellipse(6, s * 1.18, s * 0.92, s * 0.28, 0, 0, TAU);
    ctx.fill();

    const dx = s * 0.866;
    const dy = s * 0.5;
    const pTop = { x: 0, y: -s };
    const pRight = { x: dx, y: -dy };
    const pCenter = { x: 0, y: 0 };
    const pLeft = { x: -dx, y: -dy };
    const pBotLeft = { x: -dx, y: dy };
    const pBot = { x: 0, y: s };
    const pBotRight = { x: dx, y: dy };

    const drawFace = (pts, fill) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "rgba(28, 42, 48, 0.26)";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    drawFace([pTop, pRight, pCenter, pLeft], "#FFFDF9");
    drawFace([pLeft, pCenter, pBot, pBotLeft], "#F1EAE0");
    drawFace([pCenter, pRight, pBotRight, pBot], "#E5DCCD");

    const mapPip = (face, u, v) => {
      // u, v ∈ [-0.55, 0.55] 双线性映射到对应菱形面
      const [a, b, c, d] = face;
      const fu = (u + 1) * 0.5;
      const fv = (v + 1) * 0.5;
      return {
        x: (1 - fu) * (1 - fv) * a.x + fu * (1 - fv) * b.x + fu * fv * c.x + (1 - fu) * fv * d.x,
        y: (1 - fu) * (1 - fv) * a.y + fu * (1 - fv) * b.y + fu * fv * c.y + (1 - fu) * fv * d.y,
      };
    };

    const pipLayouts = {
      1: [[0, 0]],
      2: [[-0.45, -0.45], [0.45, 0.45]],
      3: [[-0.48, -0.48], [0, 0], [0.48, 0.48]],
      4: [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]],
      5: [[-0.46, -0.46], [0.46, -0.46], [0, 0], [-0.46, 0.46], [0.46, 0.46]],
      6: [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0], [0.44, 0], [-0.44, 0.5], [0.44, 0.5]],
    };

    const paintPips = (face, count, col) => {
      ctx.fillStyle = col;
      for (const [u, v] of pipLayouts[count]) {
        const pt = mapPip(face, u, v);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, s * 0.095, 0, TAU);
        ctx.fill();
      }
    };

    paintPips([pTop, pRight, pCenter, pLeft], topPips, accent);
    paintPips([pLeft, pCenter, pBot, pBotLeft], leftPips, "rgba(28, 42, 48, 0.65)");
    paintPips([pCenter, pRight, pBotRight, pBot], rightPips, "rgba(28, 42, 48, 0.52)");

    ctx.restore();
  };

  const lift = Math.sin(clamp(segProgress(t, 89.0, 90.2)) * Math.PI) * 86;
  drawIsoDie(lerp(770, 640, pBack), 380 - lift, 96 * lerp(0.7, 1, pDiceIn), lerp(-0.24, -0.05, pDiceIn), 3, 5, 1, COLORS.brandTeal);
  drawIsoDie(lerp(1150, 820, pBack), 380 - lift * 0.85, 96 * lerp(0.7, 1, pDiceIn), lerp(0.28, 0.06, pDiceIn), 4, 2, 6, COLORS.brandAmber);

  // 中央 "3 + 4 = 7" 暖纸徽标
  drawPaperCard(ctx, 886, 336, 148, 48, {
    radius: 24,
    fill: "rgba(255, 253, 249, 0.94)",
    stroke: rgba(COLORS.brandAmber, 0.52),
    lineWidth: 1.5,
    shadowBlur: 14,
    shadowOffsetY: 5,
  });
  ctx.font = `700 20px ${FONTS.mono}`;
  ctx.fillStyle = "#A85D15";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("3 + 4 = 7", 960, 360);

  ctx.font = `600 20px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.fillText("36 种有序组合与概率分布 · 为什么双骰子最容易掷出 7？", 960, 932);
  ctx.restore();
}

export function renderAct03({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  camera.reset();

  // 1. 52.0 – 65.5s：微观晶格界面 -> 全景暖纸彩虹
  if (t < 65.5) {
    const pBlend = easeEditorialInOut(segProgress(t, 63.4, 65.4));
    drawPaperBase(worldCtx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });

    if (pBlend < 0.99) {
      worldCtx.save();
      const zoomOut = lerp(1.0, 0.86, pBlend);
      worldCtx.translate(STAGE_W * 0.5, STAGE_H * 0.5);
      worldCtx.scale(zoomOut, zoomOut);
      worldCtx.translate(-STAGE_W * 0.5, -STAGE_H * 0.5);
      drawMicroRefraction(worldCtx, t, 1 - pBlend);
      worldCtx.restore();
    }
    if (pBlend > 0.01) {
      drawStyledRainbowScene(worldCtx, "paper-editorial", t, pBlend);
    }

    drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, { alpha: 0.42, issue: "ACT III · LIVING THEATER" });

    const pGlide = segProgress(t, 52.0, 65.5);
    drawPrismFold(overlayCtx, {
      x: lerp(1145, 1690, easeEditorialOut(Math.min(1, pGlide * 2.5))),
      y: lerp(760, 210, easeEditorialOut(Math.min(1, pGlide * 2.5))) + Math.sin(t * 2.2) * 10,
      mode: "PRISM",
      size: 36,
      alpha: 0.94,
      t,
      prismBlend: 0.82,
      coreGlow: 0.72,
    });
    return;
  }

  // 2. 65.5 – 74.0s：纯全景暖纸水彩彩虹高光（B 站封面级构图）
  if (t < 74.0) {
    const pMoveToCenter = easeEditorialInOut(segProgress(t, 72.2, 74.0));
    drawStyledRainbowScene(worldCtx, "paper-editorial", t, 1);
    drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, { alpha: 0.45, issue: "PAPER EDITORIAL · 1080P 60FPS" });

    drawPrismFold(overlayCtx, {
      x: lerp(1690, 960, pMoveToCenter),
      y: lerp(210, 540, pMoveToCenter),
      mode: "PRISM",
      size: lerp(36, 56, pMoveToCenter),
      alpha: 0.96,
      t,
      prismBlend: 1,
      coreGlow: lerp(0.72, 1.0, pMoveToCenter),
    });
    return;
  }

  // 3. 74.0 – 83.0s：同题异风两次中轴 FOLD 翻页切换
  if (t < 83.0) {
    const isFlip1 = t < 78.5;
    const uFlip = isFlip1
      ? easeEditorialInOut(segProgress(t, 74.2, 76.4))
      : easeEditorialInOut(segProgress(t, 78.7, 80.9));

    const fromStyle = isFlip1 ? "paper-editorial" : "modern-graphic";
    const toStyle = isFlip1 ? "modern-graphic" : "narrative-collage";
    const xSweep = lerp(STAGE_W, 0, uFlip);

    worldCtx.save();
    worldCtx.beginPath();
    worldCtx.rect(0, 0, xSweep, STAGE_H);
    worldCtx.clip();
    drawStyledRainbowScene(worldCtx, fromStyle, t, 1);
    worldCtx.restore();

    worldCtx.save();
    worldCtx.beginPath();
    worldCtx.rect(xSweep, 0, STAGE_W - xSweep, STAGE_H);
    worldCtx.clip();
    drawStyledRainbowScene(worldCtx, toStyle, t, 1);
    worldCtx.restore();

    if (uFlip > 0.005 && uFlip < 0.995) {
      drawPrismFold(overlayCtx, {
        x: xSweep,
        y: STAGE_H * 0.5,
        mode: "FOLD",
        foldProgress: uFlip,
        foldHeight: STAGE_H,
        alpha: 1,
        coreGlow: 0.95,
      });
    } else {
      drawPrismFold(overlayCtx, {
        x: 960,
        y: 118,
        mode: "PRISM",
        size: 34,
        alpha: 0.92,
        t,
        prismBlend: 0.88,
        coreGlow: 0.78,
      });
    }
    return;
  }

  // 4. 83.0 – 92.0s：三大跨主题视觉奇观快闪 -> 弹回主线彩虹定格
  if (t < 86.0) {
    drawSoapMorph(worldCtx, t);
  } else if (t < 89.0) {
    drawPnMorph(worldCtx, t);
  } else {
    drawDiceToRainbowMorph(worldCtx, t);
  }

  const pBrake = easeEditorialInOut(segProgress(t, 90.8, 92.0));
  const px = lerp(1660, 1080, pBrake);
  const py = lerp(210 + Math.sin(t * 2.5) * 36, 460, pBrake);
  drawPrismFold(overlayCtx, {
    x: px,
    y: py,
    mode: "GLIDE",
    size: 38,
    angle: lerp(-0.18, 0.06, pBrake),
    alpha: 0.96,
    t,
    prismBlend: 0.25,
    coreGlow: 0.65,
  });
}
