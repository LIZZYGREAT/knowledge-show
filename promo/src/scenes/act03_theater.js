/*
 * 第三幕：万物剧场与棱片翻页（0:52 – 1:32）
 * 0:52 – 1:04  微观入界面：7 排并肩彩色波列斜跨玻璃边界，步幅不同导致偏折分叉
 * 1:04 – 1:14  全景水彩彩虹舒展（B 站封面级高光构图）
 * 1:14 – 1:23  同题异风：棱片 FOLD 中轴翻页两次（paper-editorial -> modern-graphic -> narrative-collage）
 * 1:23 – 1:32  光学同源跨主题物理变奏：彩虹 -> 肥皂泡 -> PN 结 -> 双骰子 -> 弹回彩虹定格帧
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
  smoothstep,
  TAU,
} from "../core/math.js";
import { drawPaperBase, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";

/**
 * 52s - 64s：微观玻璃界面波列减速与偏折（直观无需公式）
 */
function drawMicroRefraction(ctx, t, alpha) {
  if (alpha <= 0.005) return;
  const pEnter = easeEditorialOut(segProgress(t, 52.0, 53.8));
  const pCross = easeEditorialOut(segProgress(t, 53.2, 60.2));

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 倾斜玻璃界面（左为空气暖纸，右为半透明磨砂玻璃介质）
  const bxTop = 870;
  const bxBot = 670;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bxTop, -20);
  ctx.lineTo(STAGE_W + 40, -20);
  ctx.lineTo(STAGE_W + 40, STAGE_H + 20);
  ctx.lineTo(bxBot, STAGE_H + 20);
  ctx.closePath();

  const glassGrad = ctx.createLinearGradient(bxBot, 0, STAGE_W, STAGE_H);
  glassGrad.addColorStop(0, "rgba(225, 241, 240, 0.72)");
  glassGrad.addColorStop(0.5, "rgba(235, 245, 246, 0.56)");
  glassGrad.addColorStop(1, "rgba(229, 238, 248, 0.66)");
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // 玻璃边缘柔和厚线与高光
  ctx.strokeStyle = "rgba(18, 148, 141, 0.34)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bxTop, 0);
  ctx.lineTo(bxBot, STAGE_H);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bxTop + 5, 0);
  ctx.lineTo(bxBot + 5, STAGE_H);
  ctx.stroke();
  ctx.restore();

  // 轻柔的介质标尺注记（绝非讲义大字，仅像精致刊物页边注）
  ctx.font = `500 16px ${FONTS.mono}`;
  ctx.fillStyle = rgba(COLORS.inkSecondary, 0.72 * pEnter);
  ctx.fillText("AIR · 步幅一致", 210, 128);
  ctx.fillText("GLASS INTERFACE · 不同色光减速分化", 940, 128);

  // 7 排并肩前行的彩色波列，在穿过倾斜界面时自然减速与折弯
  const incAng = (14 * Math.PI) / 180;
  const incDx = Math.cos(incAng);
  const incDy = Math.sin(incAng);
  const incNx = -incDy;
  const incNy = incDx;

  // 边界线参数：x(y) = lerp(bxTop, bxBot, y / STAGE_H)
  const boundaryXAt = (y) => lerp(bxTop, bxBot, y / STAGE_H);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    const yHit = 250 + i * 94;
    const xHit = boundaryXAt(yHit);

    // 1. 空气段（左侧）：7 色波列几乎并肩、波长舒展
    const airLen = 840 * pEnter;
    const airLambda = 110 - i * 4.5;
    const airAmp = 10.5;
    const omega = 5.4;

    ctx.beginPath();
    for (let k = 0; k <= 90; k++) {
      const s = -airLen + (k / 90) * airLen;
      const w = Math.sin((TAU * s) / airLambda - omega * t + band.phase) * airAmp;
      const px = xHit + incDx * s + incNx * w;
      const py = yHit + incDy * s + incNy * w;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = rgba(band.hex, 0.78);
    ctx.lineWidth = 5.4;
    ctx.lineCap = "round";
    ctx.stroke();

    // 2. 玻璃内部段（右侧）：波长按色光物理比例明显缩短，红缓折、紫急折！
    if (pCross > 0.01) {
      const refAng = ((16 + i * 3.8) * Math.PI) / 180;
      const rDx = Math.cos(refAng);
      const rDy = Math.sin(refAng);
      const rNx = -rDy;
      const rNy = rDx;
      const glassLen = 1120 * pCross;
      const glassLambda = lerp(96, 42, i / 6); // 红步幅大，紫步幅紧促！
      const glassAmp = lerp(12.0, 14.5, i / 6);

      // 柔和底光带（高密度采样保证紫光短波圆润顺滑）
      ctx.beginPath();
      for (let k = 0; k <= 340; k++) {
        const s = (k / 340) * glassLen;
        const w = Math.sin((TAU * s) / glassLambda - omega * t + band.phase) * glassAmp;
        const px = xHit + rDx * s + rNx * w;
        const py = yHit + rDy * s + rNy * w;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(band.hex, 0.16);
      ctx.lineWidth = 22;
      ctx.stroke();

      // 清晰主波线
      ctx.strokeStyle = rgba(band.hex, 0.88);
      ctx.lineWidth = 5.2;
      ctx.stroke();

      // 界面入射点微标圆点
      ctx.fillStyle = band.hex;
      ctx.beginPath();
      ctx.arc(xHit, yHit, 5, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();

  // 红波与紫波步幅直观刻度标尺（无公式，仅展示“步幅宽 vs 步幅密”）
  const calloutAlpha = easeEditorialOut(segProgress(t, 56.2, 58.0));
  if (calloutAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * calloutAlpha);

    // 红光长步幅标尺
    ctx.strokeStyle = "#D4575C";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1160, 260);
    ctx.lineTo(1256, 260);
    ctx.moveTo(1160, 252);
    ctx.lineTo(1160, 268);
    ctx.moveTo(1256, 252);
    ctx.lineTo(1256, 268);
    ctx.stroke();
    ctx.font = `500 16px ${FONTS.sans}`;
    ctx.fillStyle = "#B5464B";
    ctx.fillText("红光 · 长波舒展 · 微折", 1272, 266);

    // 紫光短步幅标尺（暖纸底托避免与靛蓝波线重叠）
    drawPaperCard(ctx, 1112, 930, 294, 44, {
      radius: 22,
      fill: "rgba(255, 253, 249, 0.92)",
      stroke: "rgba(142, 108, 187, 0.36)",
      lineWidth: 1.2,
      shadowBlur: 12,
      shadowOffsetY: 4,
    });
    ctx.strokeStyle = "#7D5BA8";
    ctx.beginPath();
    ctx.moveTo(1132, 952);
    ctx.lineTo(1174, 952);
    ctx.moveTo(1132, 944);
    ctx.lineTo(1132, 960);
    ctx.moveTo(1174, 944);
    ctx.lineTo(1174, 960);
    ctx.stroke();
    ctx.fillStyle = "#694A91";
    ctx.fillText("紫光 · 短波紧促 · 急折", 1190, 958);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制某种艺术风格的完整全景彩虹画幅（用于全景高光与两次中轴翻页）
 */
function drawStyledRainbowScene(ctx, styleId, t, alpha = 1) {
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  drawPaperBase(ctx, STAGE_W, STAGE_H, {
    baseColor: style.bg,
    tealGlow: styleId === "paper-editorial" ? 1.0 : 0.45,
    amberGlow: styleId === "paper-editorial" ? 1.0 : 0.55,
    dotGridAlpha: styleId === "narrative-collage" ? 0.045 : 0.025,
  });

  // 风格专属的微妙纸面装饰细节（绝不喧宾夺主）
  if (styleId === "modern-graphic") {
    // 现代图形风：右上俐落几何参考弧线与粗细线标尺
    ctx.strokeStyle = "rgba(32, 38, 56, 0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(640, 540, 420, -0.35, 0.72);
    ctx.stroke();
  } else if (styleId === "narrative-collage") {
    // 叙事拼贴风：左上角贴一枚淡暖纸手工色标贴纸条
    ctx.save();
    ctx.translate(1540, 128);
    ctx.rotate(0.04);
    drawPaperCard(ctx, 0, 0, 260, 74, {
      radius: 4,
      fill: "#F8F1E1",
      stroke: "rgba(59, 55, 48, 0.32)",
      lineWidth: 1.5,
      shadowBlur: 12,
      shadowOffsetY: 6,
    });
    style.palette.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(16 + idx * 33, 18, 25, 38);
    });
    ctx.restore();
  }

  // 主棱镜与 7 股波动丝带（位于黄金构图点 cx=640, cy=540）
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
    ribbonLen: 1120,
  });

  // 风格左下角克制刊物印章标（清晰交代当前画风）
  ctx.save();
  drawPaperCard(ctx, 78, 926, 262, 58, {
    radius: 29,
    fill: "rgba(255, 253, 249, 0.88)",
    stroke: "rgba(28, 42, 48, 0.14)",
    lineWidth: 1.2,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.fillStyle = style.palette[3];
  ctx.beginPath();
  ctx.arc(108, 955, 6, 0, TAU);
  ctx.fill();
  ctx.font = `600 17px ${FONTS.serif}`;
  ctx.fillStyle = style.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(style.name, 128, 955);
  ctx.font = `400 12px ${FONTS.mono}`;
  ctx.fillStyle = style.muted;
  ctx.fillText(style.id, 224, 956);
  ctx.restore();

  ctx.restore();
}

/**
 * 跨主题快闪 ①（83.0 - 86.0s）：彩虹波带卷曲围合 -> 薄膜干涉肥皂泡（soap-style-lab）
 */
function drawSoapMorph(ctx, t) {
  const u = segProgress(t, 83.0, 86.0);
  const pIn = springProgress(segProgress(t, 83.0, 84.1), 0.65, 0.78, 17);
  const pPop = easeEditorialInOut(segProgress(t, 85.45, 86.0));

  drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });

  const cx = 960;
  const cy = 525 + Math.sin(t * 2.6) * 8;
  const R = lerp(90, 265, pIn) * (1 + pPop * 0.28);

  ctx.save();
  ctx.globalAlpha = 1 - pPop;

  // 肥皂泡落影
  const sh = ctx.createRadialGradient(cx, cy + R + 58, 12, cx, cy + R + 58, R * 0.9);
  sh.addColorStop(0, "rgba(28, 52, 58, 0.11)");
  sh.addColorStop(1, "rgba(28, 52, 58, 0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(cx, cy + R + 58, R * 0.85, 28, 0, 0, TAU);
  ctx.fill();

  // 半透明暖纸肥皂泡球体与表面薄膜干涉水彩环
  const bubbleGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.3, R * 0.08, cx, cy, R);
  bubbleGrad.addColorStop(0, "rgba(255, 254, 251, 0.92)");
  bubbleGrad.addColorStop(0.55, "rgba(232, 248, 245, 0.45)");
  bubbleGrad.addColorStop(0.84, "rgba(242, 153, 74, 0.24)");
  bubbleGrad.addColorStop(0.95, "rgba(78, 124, 246, 0.30)");
  bubbleGrad.addColorStop(1, "rgba(18, 148, 141, 0.42)");
  ctx.fillStyle = bubbleGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();

  // 内部流淌的七彩薄膜干涉水彩波纹
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R - 3, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    ctx.beginPath();
    const yBase = cy - R * 0.55 + i * (R * 0.19);
    for (let k = 0; k <= 64; k++) {
      const x = cx - R + (k / 64) * R * 2;
      const y = yBase + Math.sin(x * 0.014 + t * 3.2 + i * 0.8) * 26;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(band.hex, 0.44);
    ctx.lineWidth = 14;
    ctx.stroke();
  }
  ctx.restore();

  // 玻璃感弧形高光 + 极细圆轮廓
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.82, -2.55, -1.75);
  ctx.stroke();

  ctx.strokeStyle = "rgba(18, 148, 141, 0.36)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();

  // 周围微小的亲水/疏水肥皂分子环（呼应 soap-style-lab）
  for (let m = 0; m < 12; m++) {
    const ang = (m / 12) * TAU + t * 0.35;
    const mx = cx + Math.cos(ang) * (R + 28);
    const my = cy + Math.sin(ang) * (R + 28);
    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.72);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(cx + Math.cos(ang) * (R + 8), cy + Math.sin(ang) * (R + 8));
    ctx.stroke();
    ctx.fillStyle = COLORS.brandTeal;
    ctx.beginPath();
    ctx.arc(mx, my, 5.5, 0, TAU);
    ctx.fill();
  }

  // 右下轻盈主题小注
  ctx.font = `500 18px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.textAlign = "center";
  ctx.fillText("薄膜干涉与表面张力 · 肥皂泡的彩色奥秘", cx, cy + R + 98);
  ctx.restore();

  // 85.45s 肥皂泡破开飞溅出青绿与暖杏纸艺微粒，直接承接 PN 结载流子！
  if (pPop > 0.02) {
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * TAU;
      const dist = R * 0.85 + pPop * 210;
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist * 0.65;
      ctx.fillStyle = i % 2 === 0 ? COLORS.brandTeal : COLORS.brandAmber;
      ctx.globalAlpha = 1 - pPop * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, lerp(8, 12, pPop), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * 跨主题快闪 ②（86.0 - 89.0s）：飞溅微粒有序排布为暖纸 PN 结（pn-junction）
 */
function drawPnMorph(ctx, t) {
  const pIn = springProgress(segProgress(t, 86.0, 86.9), 0.55, 0.78, 18);
  const pBias = easeEditorialInOut(segProgress(t, 87.0, 88.2)); // 耗尽层随偏置收窄与导通
  const pFoldOut = easeEditorialInOut(segProgress(t, 88.45, 89.0));

  drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });

  const cx = 960;
  const cy = 530;
  const boxW = lerp(1080, 440, pFoldOut) * lerp(0.88, 1, pIn);
  const boxH = lerp(390, 320, pFoldOut);
  const x0 = cx - boxW * 0.5;
  const y0 = cy - boxH * 0.5;
  const depW = lerp(158, 54, pBias);

  ctx.save();
  ctx.globalAlpha = 1 - pFoldOut * 0.35;

  // 陶瓷暖纸结本体卡片
  drawPaperCard(ctx, x0, y0, boxW, boxH, {
    radius: 26,
    fill: COLORS.paperElevated,
    stroke: "rgba(28, 42, 48, 0.22)",
    lineWidth: 2,
    shadowBlur: 28,
    shadowOffsetY: 12,
  });

  // P 区暖杏浅底、N 区青绿浅底、中央耗尽层
  ctx.save();
  roundRectPath(ctx, x0 + 2, y0 + 2, boxW - 4, boxH - 4, 24);
  ctx.clip();

  ctx.fillStyle = "rgba(242, 153, 74, 0.11)";
  ctx.fillRect(x0, y0, boxW * 0.5 - depW * 0.5, boxH);
  ctx.fillStyle = "rgba(18, 148, 141, 0.11)";
  ctx.fillRect(cx + depW * 0.5, y0, boxW * 0.5 - depW * 0.5, boxH);

  // 中央耗尽层斜线纹理
  ctx.fillStyle = "rgba(28, 42, 48, 0.045)";
  ctx.fillRect(cx - depW * 0.5, y0, depW, boxH);
  ctx.strokeStyle = "rgba(28, 42, 48, 0.18)";
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - depW * 0.5, y0);
  ctx.lineTo(cx - depW * 0.5, y0 + boxH);
  ctx.moveTo(cx + depW * 0.5, y0);
  ctx.lineTo(cx + depW * 0.5, y0 + boxH);
  ctx.stroke();
  ctx.setLineDash([]);

  // P 区空穴（暖珊瑚空心圆）与 N 区电子（青绿实心圆），随正向偏置定向穿越！
  const rows = 4;
  const cols = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const drift = pBias * 145 * (1 - pFoldOut);
      // P 区空穴向右移动
      const hx = x0 + 64 + c * 92 + drift * 0.55;
      const hy = y0 + 68 + r * 82 + Math.sin(t * 4 + r + c) * 4;
      ctx.strokeStyle = "#DC6B5C";
      ctx.lineWidth = 3.2;
      ctx.fillStyle = "#FFFDF9";
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // N 区电子向左移动
      const ex = x0 + boxW - 64 - c * 92 - drift * 0.55;
      const ey = y0 + 68 + r * 82 + Math.cos(t * 4 + r - c) * 4;
      ctx.fillStyle = COLORS.brandTeal;
      ctx.beginPath();
      ctx.arc(ex, ey, 11, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // P / N 与耗尽层刊物标签
  ctx.font = `600 22px ${FONTS.mono}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#C65A4B";
  ctx.fillText("P-TYPE · 空穴", cx - boxW * 0.3, y0 - 24);
  ctx.fillStyle = COLORS.brandTealDark;
  ctx.fillText("N-TYPE · 电子", cx + boxW * 0.3, y0 - 24);
  ctx.font = `500 17px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.fillText("PN 结单向导电阀门 · 耗尽层开合", cx, y0 + boxH + 54);
  ctx.restore();
}

/**
 * 跨主题快闪 ③（89.0 - 92.0s）：载流子方阵折起为双暖纸骰子 + 概率分布弧，随后优雅弹回彩虹定格
 */
function drawDiceToRainbowMorph(ctx, t) {
  const pDiceIn = springProgress(segProgress(t, 89.0, 89.8), 0.52, 0.74, 18);
  const pBack = easeEditorialInOut(segProgress(t, 90.85, 92.0));

  // 底层淡入回主线暖纸彩虹定格（与第四幕 92.0s 100% 同构，实现零帧跳变！）
  if (pBack > 0.05) {
    drawStyledRainbowScene(ctx, "paper-editorial", 92.0, clamp((pBack - 0.05) / 0.95));
  } else {
    drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
  }

  const diceAlpha = 1 - easeEditorialOut(segProgress(t, 90.8, 91.65));
  if (diceAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = diceAlpha;

  // 柔和的概率钟形柱状背景（峰值 7）
  const bars = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
  const baseY = 820;
  for (let i = 0; i < bars.length; i++) {
    const bx = 520 + i * 82;
    const bh = bars[i] * 34 * pDiceIn;
    const isSeven = i === 5;
    roundRectPath(ctx, bx - 24, baseY - bh, 48, bh, 8);
    ctx.fillStyle = isSeven ? rgba(COLORS.brandAmber, 0.34) : rgba(COLORS.brandTeal, 0.14);
    ctx.fill();
    ctx.strokeStyle = isSeven ? COLORS.brandAmber : rgba(COLORS.brandTeal, 0.35);
    ctx.lineWidth = isSeven ? 2.2 : 1.2;
    ctx.stroke();

    ctx.font = `600 15px ${FONTS.mono}`;
    ctx.fillStyle = isSeven ? "#A85D15" : COLORS.inkSecondary;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 2), bx, baseY + 26);
  }

  // 两枚跃动翻滚的暖纸立体骰子（3 + 4 = 7）
  const drawDie = (x, y, size, rot, pips, accent) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // 侧立面厚度
    ctx.fillStyle = "#EAE2D3";
    roundRectPath(ctx, -size * 0.5 + 10, -size * 0.5 + 10, size, size, 20);
    ctx.fill();

    // 正面暖纸面
    drawPaperCard(ctx, -size * 0.5, -size * 0.5, size, size, {
      radius: 20,
      fill: COLORS.paperElevated,
      stroke: "rgba(28, 42, 48, 0.24)",
      lineWidth: 2,
      shadowBlur: 24,
      shadowOffsetY: 12,
    });

    const p = size * 0.25;
    const coords = {
      3: [[-p, -p], [0, 0], [p, p]],
      4: [[-p, -p], [p, -p], [-p, p], [p, p]],
    }[pips];
    ctx.fillStyle = accent;
    for (const [px, py] of coords) {
      ctx.beginPath();
      ctx.arc(px, py, size * 0.085, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  const lift = Math.sin(clamp(segProgress(t, 89.0, 90.2)) * Math.PI) * 72;
  drawDie(
    lerp(790, 640, pBack),
    450 - lift,
    162 * lerp(0.7, 1, pDiceIn),
    lerp(-0.35, -0.08, pDiceIn),
    3,
    COLORS.brandTeal
  );
  drawDie(
    lerp(1130, 820, pBack),
    450 - lift * 0.85,
    162 * lerp(0.7, 1, pDiceIn),
    lerp(0.42, 0.09, pDiceIn),
    4,
    COLORS.brandAmber
  );

  ctx.font = `500 18px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.textAlign = "center";
  ctx.fillText("36 种组合与概率分布 · 为什么双骰子最容易掷出 7？", 960, 892);
  ctx.restore();
}

export function renderAct03({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  camera.reset();

  // 1. 52.0 – 65.5s：微观界面 -> 平滑过渡至全景水彩彩虹
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

    // 棱片在右侧柔和巡航，52s 承接第二幕划开余韵
    const pGlide = segProgress(t, 52.0, 65.5);
    drawPrismFold(overlayCtx, {
      x: lerp(1140, 1690, easeEditorialOut(Math.min(1, pGlide * 2.5))),
      y: lerp(740, 210, easeEditorialOut(Math.min(1, pGlide * 2.5))) + Math.sin(t * 2.2) * 10,
      mode: "PRISM",
      size: 34,
      alpha: 0.92,
      t,
      prismBlend: 0.75,
      coreGlow: 0.6,
    });
    return;
  }

  // 2. 65.5 – 74.0s：纯全景暖纸水彩彩虹高光（极佳 B 站封面帧！）
  if (t < 74.0) {
    const pMoveToCenter = easeEditorialInOut(segProgress(t, 72.2, 74.0));
    drawStyledRainbowScene(worldCtx, "paper-editorial", t, 1);

    drawPrismFold(overlayCtx, {
      x: lerp(1690, 960, pMoveToCenter),
      y: lerp(210, 540, pMoveToCenter),
      mode: "PRISM",
      size: lerp(34, 52, pMoveToCenter),
      alpha: 0.95,
      t,
      prismBlend: 1,
      coreGlow: lerp(0.65, 1.0, pMoveToCenter),
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

    // 根据翻页进度，以移动折页前沿 xSweep 作为精确 Canvas clip() 边界，彻底告别淡入淡出！
    const xSweep = lerp(STAGE_W, 0, uFlip);

    // 左侧仍显示旧风格（在翻页扫过之前）
    worldCtx.save();
    worldCtx.beginPath();
    worldCtx.rect(0, 0, xSweep, STAGE_H);
    worldCtx.clip();
    drawStyledRainbowScene(worldCtx, fromStyle, t, 1);
    worldCtx.restore();

    // 右侧（被厚纸页翻开后）显现新风格
    worldCtx.save();
    worldCtx.beginPath();
    worldCtx.rect(xSweep, 0, STAGE_W - xSweep, STAGE_H);
    worldCtx.clip();
    drawStyledRainbowScene(worldCtx, toStyle, t, 1);
    worldCtx.restore();

    // 顶层 FOLD 翻页态厚实色卡（在翻页进行中展开全画幅翻折）
    if (uFlip > 0.005 && uFlip < 0.995) {
      drawPrismFold(overlayCtx, {
        x: xSweep,
        y: STAGE_H * 0.5,
        mode: "FOLD",
        foldProgress: uFlip,
        foldHeight: STAGE_H,
        alpha: 1,
        coreGlow: 0.9,
      });
    } else {
      // 翻页落定后的短暂静赏期，棱片轻停在画幅中轴上方
      drawPrismFold(overlayCtx, {
        x: 960,
        y: 120,
        mode: "PRISM",
        size: 32,
        alpha: 0.88,
        t,
        prismBlend: 0.85,
        coreGlow: 0.7,
      });
    }
    return;
  }

  // 4. 83.0 – 92.0s：跨主题物理变奏快闪（肥皂泡 -> PN 结 -> 双骰子 -> 弹回主线彩虹定格）
  if (t < 86.0) {
    drawSoapMorph(worldCtx, t);
  } else if (t < 89.0) {
    drawPnMorph(worldCtx, t);
  } else {
    drawDiceToRainbowMorph(worldCtx, t);
  }

  // 棱片在跨主题快闪中轻盈领航，并于 92.0s 稳稳刹车悬停在主线彩虹前方，无缝衔接第四幕退镜！
  const pBrake = easeEditorialInOut(segProgress(t, 90.8, 92.0));
  const px = lerp(1640, 1080, pBrake);
  const py = lerp(220 + Math.sin(t * 2.5) * 40, 460, pBrake);
  drawPrismFold(overlayCtx, {
    x: px,
    y: py,
    mode: "GLIDE",
    size: 36,
    angle: lerp(-0.18, 0.06, pBrake),
    alpha: 0.96,
    t,
    prismBlend: 0.25,
    coreGlow: 0.6,
  });
}
