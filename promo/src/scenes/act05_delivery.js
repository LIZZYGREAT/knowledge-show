/*
 * 第五幕：所见即成片与克制落版（2:20 – 2:45）
 * 2:20 – 2:31  扫尺拂过：青绿-暖杏刊物标尺从左向右轻扫全屏，工作台面板轻盈淡出收拢，画布丝滑舒展回 100% 精修 v2 彩虹 + 轻盈印章「已导出 · 1080P 60fps」
 * 2:31 – 2:45  七彩波带编织回项目标志双股流纹丝带 -> 青绿竖线优雅画出 -> 棱片归位拼合 BrandLogo -> Knowledge.Show(me) + 「让好奇可见，让作品随心。」-> 2.5s 纯净留白
 */

import { COLORS, SPECTRUM, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  rgba,
  easeEditorialOut,
  easeEditorialInOut,
  springProgress,
  bezierPoint,
  TAU,
} from "../core/math.js";
import { drawPaperBase, drawPaperCard } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import { drawBrandMark, drawBrandWordmark } from "../entities/brandLogo.js";
import { drawRainbowInRect } from "./act04_workbench.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

/**
 * 绘制项目最具辨识度的上下双股流纹丝带（青绿 + 湖蓝 + 暖杏，呼应首页 LivingFlowScene）
 */
function drawSignatureFlowRibbons(ctx, t, progress, alpha = 1) {
  if (progress <= 0.005 || alpha <= 0.005) return;
  const p = clamp(progress);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.lineCap = "round";

  const ribbons = [
    // 上方柔美弧带
    { yBase: 175, amp: 56, freq: 1.45, color: COLORS.brandTeal, width: 4.0, op: 0.42, phase: 0.2 },
    { yBase: 196, amp: 44, freq: 1.65, color: COLORS.brandPeriwinkle, width: 2.4, op: 0.30, phase: 1.1 },
    { yBase: 184, amp: 32, freq: 1.9, color: COLORS.brandAmber, width: 1.8, op: 0.34, phase: 2.3 },
    // 下方托底弧带
    { yBase: 902, amp: 58, freq: 1.38, color: COLORS.brandTeal, width: 4.2, op: 0.44, phase: 3.1 },
    { yBase: 882, amp: 46, freq: 1.6, color: COLORS.brandPeriwinkle, width: 2.6, op: 0.32, phase: 4.0 },
    { yBase: 894, amp: 34, freq: 1.82, color: COLORS.brandAmber, width: 2.0, op: 0.36, phase: 5.2 },
  ];

  for (const r of ribbons) {
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = lerp(-40, STAGE_W + 40, u);
      // 随 progress 从中段向两侧自然展开舒缓波形
      const env = Math.sin(u * Math.PI);
      const y =
        lerp(STAGE_H * 0.5, r.yBase, p) +
        Math.sin(u * TAU * r.freq + t * 0.65 + r.phase) * r.amp * (0.45 + 0.55 * env) * p;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, r.yBase, STAGE_W, r.yBase);
    grad.addColorStop(0, rgba(r.color, 0));
    grad.addColorStop(0.18, rgba(r.color, r.op));
    grad.addColorStop(0.82, rgba(r.color, r.op));
    grad.addColorStop(1, rgba(r.color, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = r.width;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制青绿-暖杏双色刊物标尺（带精细刻度与实时帧号微标）
 */
function drawExportSweepRuler(ctx, sweepX, sweepProgress, alpha) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 标尺扫过尾迹的极轻暖杏空气光晕（不遮挡刚显现的满屏精修彩虹）
  const trailGrad = ctx.createLinearGradient(sweepX - 72, 0, sweepX, 0);
  trailGrad.addColorStop(0, "rgba(18, 148, 141, 0)");
  trailGrad.addColorStop(0.76, "rgba(18, 148, 141, 0.04)");
  trailGrad.addColorStop(1, "rgba(242, 153, 74, 0.11)");
  ctx.fillStyle = trailGrad;
  ctx.fillRect(sweepX - 72, 0, 72, STAGE_H);

  // 纤细双色主标尺线
  const lineGrad = ctx.createLinearGradient(sweepX, 0, sweepX, STAGE_H);
  lineGrad.addColorStop(0, COLORS.brandTeal);
  lineGrad.addColorStop(0.52, COLORS.brandPeriwinkle);
  lineGrad.addColorStop(1, COLORS.brandAmber);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(sweepX, 0);
  ctx.lineTo(sweepX, STAGE_H);
  ctx.stroke();

  // 沿标尺分布的极细刊物刻度短线
  for (let y = 36; y < STAGE_H - 36; y += 24) {
    const major = y % 120 === 0;
    const len = major ? 16 : 7;
    ctx.strokeStyle = major ? rgba(COLORS.inkPrimary, 0.36) : rgba(COLORS.inkPrimary, 0.16);
    ctx.lineWidth = major ? 1.4 : 1.0;
    ctx.beginPath();
    ctx.moveTo(sweepX, y);
    ctx.lineTo(sweepX - len, y);
    ctx.stroke();
  }

  // 实时帧号微标（无弹窗、无进度条，仅轻盈浮于标尺上方）
  const frameNum = Math.min(9900, Math.round(sweepProgress * 9900));
  const tagX = Math.max(120, Math.min(STAGE_W - 140, sweepX - 102));
  drawPaperCard(ctx, tagX - 88, 96, 176, 36, {
    radius: 18,
    fill: "rgba(255, 253, 249, 0.94)",
    stroke: rgba(COLORS.brandTeal, 0.36),
    lineWidth: 1.2,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.font = `600 12.5px ${FONTS.mono}`;
  ctx.fillStyle = COLORS.brandTealDark;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`F ${String(frameNum).padStart(4, "0")} · 60fps`, tagX, 114);

  ctx.restore();
}

export function renderAct05({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  camera.reset();

  const wbRect = UI_GEOMETRY.workbench.frameRect;

  // 各阶段归一化进度
  const pSweep = easeEditorialInOut(segProgress(t, 140.2, 148.2));
  const pStampIn = springProgress(segProgress(t, 148.4, 149.2), 0.5, 0.78, 18);
  const pStampOut = easeEditorialInOut(segProgress(t, 151.8, 153.0));
  const pGather = easeEditorialInOut(segProgress(t, 151.2, 156.2));
  const pSpine = easeEditorialOut(segProgress(t, 156.6, 158.1));
  const pPrismHome = easeEditorialInOut(segProgress(t, 157.4, 159.4));
  const pPrismClose = springProgress(segProgress(t, 159.2, 160.2), 0.55, 0.78, 18);
  const pTileReveal = easeEditorialOut(segProgress(t, 159.0, 160.6));
  const pWordmark = easeEditorialOut(segProgress(t, 159.7, 161.2));
  const pTagline = easeEditorialOut(segProgress(t, 160.6, 162.1));
  const pFinalFade = easeEditorialInOut(segProgress(t, 163.8, 165.0));

  const sweepX = lerp(-24, STAGE_W + 24, pSweep);

  // 1. 2:20 – 2:31（标尺扫屏过渡：左侧 100% 满屏 v2 彩虹，右侧尚未扫到的工作台面板优雅隐去）
  if (t < 151.6) {
    // 底层先画右侧工作台内的 64% v2 彩虹（仅在标尺右侧可见）
    if (sweepX < STAGE_W) {
      worldCtx.save();
      worldCtx.beginPath();
      worldCtx.rect(Math.max(0, sweepX), 0, STAGE_W - Math.max(0, sweepX), STAGE_H);
      worldCtx.clip();
      drawPaperBase(worldCtx, STAGE_W, STAGE_H, { tealGlow: 0.75, amberGlow: 0.85, dotGridAlpha: 0.02 });
      drawRainbowInRect(worldCtx, wbRect, {
        t: 92 + (t - 92) * 0.5,
        v2Factor: 1,
        saturationBoost: 1,
      });
      worldCtx.restore();

      // Layer 2 真实 Workbench 用 sweepClipX 同步被标尺优雅揭去
      ui.renderWorkbench({
        visible: true,
        alpha: 1,
        chromeReveal: 1,
        sweepClipX: Math.max(0, sweepX),
        version: "v2",
        selected: false,
        inspectorAlpha: 0,
        showUserMsg: true,
        showAiDoneMsg: true,
        playheadPct: 75,
        kfNodePct: 58,
        timeCode: "02:20 / 02:45",
        exportPressed: t < 140.5,
        statusText: "正在按确定性时间轴同步导出 1080P 60fps 成片…",
      });
    }

    // 标尺左侧直接显现 100% 满屏精修 v2 彩虹成片（所见即成片！）
    if (sweepX > 0) {
      worldCtx.save();
      worldCtx.beginPath();
      worldCtx.rect(0, 0, Math.min(STAGE_W, sweepX), STAGE_H);
      worldCtx.clip();
      drawRainbowInRect(worldCtx, { x: 0, y: 0, w: STAGE_W, h: STAGE_H }, {
        t: 92 + (t - 92) * 0.5,
        v2Factor: 1,
        saturationBoost: 1,
      });
      worldCtx.restore();
    }

    // 顶层刊物标尺线
    if (pSweep > 0.002 && pSweep < 0.998) {
      const rulerAlpha = Math.min(1, pSweep * 10) * Math.min(1, (1 - pSweep) * 10);
      drawExportSweepRuler(overlayCtx, sweepX, pSweep, rulerAlpha);
    }

    // 右上角极轻盈的刊物印章式提示：「已导出 · 1080P 60fps」
    const stampAlpha = pStampIn * (1 - pStampOut);
    if (stampAlpha > 0.01) {
      overlayCtx.save();
      overlayCtx.globalAlpha = clamp(stampAlpha);
      const sx = STAGE_W - 294;
      const sy = 56 + lerp(-12, 0, pStampIn);
      drawPaperCard(overlayCtx, sx, sy, 236, 46, {
        radius: 23,
        fill: "rgba(255, 253, 249, 0.92)",
        stroke: rgba(COLORS.brandTeal, 0.42),
        lineWidth: 1.4,
        shadowBlur: 16,
        shadowOffsetY: 6,
      });
      overlayCtx.fillStyle = COLORS.brandTeal;
      overlayCtx.beginPath();
      overlayCtx.arc(sx + 24, sy + 23, 5.5, 0, TAU);
      overlayCtx.fill();
      overlayCtx.font = `600 14px ${FONTS.mono}`;
      overlayCtx.fillStyle = COLORS.inkPrimary;
      overlayCtx.textBaseline = "middle";
      overlayCtx.fillText("已导出 · 1080P 60fps", sx + 42, sy + 24);
      overlayCtx.restore();
    }
    return;
  }

  // 2. 2:31 – 2:45（回归纯粹暖纸 -> 七彩编织为双股流纹丝带 -> 棱片归位拼合完整 BrandLogo）
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 1.0,
    amberGlow: 1.0,
    dotGridAlpha: 0.024,
  });

  // 彩虹收势柔和淡出，同时双股品牌流纹丝带自然展开托起暖白纸页
  const rainbowFadeOut = 1 - easeEditorialInOut(segProgress(t, 151.6, 154.6));
  if (rainbowFadeOut > 0.008) {
    worldCtx.save();
    worldCtx.globalAlpha = rainbowFadeOut;
    drawRainbowInRect(worldCtx, { x: 0, y: 0, w: STAGE_W, h: STAGE_H }, {
      t: 92 + (t - 92) * 0.5,
      v2Factor: 1,
      saturationBoost: 1 - pGather * 0.7,
    });
    worldCtx.restore();
  }

  // 过渡编织七彩丝带 -> 汇聚为标志上下双股青绿/湖蓝/暖杏流动丝带
  drawSignatureFlowRibbons(worldCtx, t, easeEditorialOut(segProgress(t, 152.0, 156.4)), 1 - pFinalFade);

  // 仍短暂保留的右上角印章淡出
  const stampAlpha = 1 - pStampOut;
  if (stampAlpha > 0.01) {
    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(stampAlpha);
    const sx = STAGE_W - 294;
    const sy = 56;
    drawPaperCard(overlayCtx, sx, sy, 236, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.92)",
      stroke: rgba(COLORS.brandTeal, 0.42),
      lineWidth: 1.4,
      shadowBlur: 16,
      shadowOffsetY: 6,
    });
    overlayCtx.fillStyle = COLORS.brandTeal;
    overlayCtx.beginPath();
    overlayCtx.arc(sx + 24, sy + 23, 5.5, 0, TAU);
    overlayCtx.fill();
    overlayCtx.font = `600 14px ${FONTS.mono}`;
    overlayCtx.fillStyle = COLORS.inkPrimary;
    overlayCtx.textBaseline = "middle";
    overlayCtx.fillText("已导出 · 1080P 60fps", sx + 42, sy + 24);
    overlayCtx.restore();
  }

  // 3. 画面正中：青绿竖线自上而下优雅画出 + 棱片归位拼合为完整 Knowledge.Show(me) 图标
  const markCx = 960;
  const markCy = 418;
  const markSize = 152;
  // BrandLogo 右侧棱晶几何中心大约在 cx + size * 0.115
  const homeX = markCx + markSize * 0.115;
  const homeY = markCy;

  // 棱片远弧线飞回图标右侧（156.2 – 159.4s），到达后无缝融入完整矢量 BrandLogo
  if (t < 159.55) {
    const flightPath = (time) => {
      const u = easeEditorialInOut(segProgress(time, 156.0, 159.4));
      return bezierPoint(
        { x: 1680, y: 240 },
        { x: 1460, y: 180 },
        { x: 1180, y: 310 },
        { x: homeX, y: homeY },
        u
      );
    };
    const pos = flightPath(t);
    const trail = sampleTrailFromPath(flightPath, t, 0.72, 26);
    const handoffFade = 1 - easeEditorialOut(segProgress(t, 159.15, 159.55));
    drawPrismFold(overlayCtx, {
      x: pos.x,
      y: pos.y,
      mode: pPrismHome > 0.75 ? "PRISM" : "GLIDE",
      size: lerp(38, 44, pPrismHome),
      angle: lerp(-0.22, 0, pPrismHome),
      alpha: clamp(easeEditorialOut(segProgress(t, 155.8, 156.8)) * handoffFade),
      t,
      prismBlend: clamp((pPrismHome - 0.55) / 0.45),
      coreGlow: clamp((pPrismHome - 0.6) / 0.4),
      trail,
      trailAlpha: 1 - pPrismHome * 0.9,
    });
  }

  // 完整矢量 BrandLogo 组装绘制
  if (pSpine > 0.005) {
    drawBrandMark(overlayCtx, {
      cx: markCx,
      cy: markCy,
      size: markSize,
      tileAlpha: pTileReveal * (1 - pFinalFade),
      spineDraw: pSpine,
      prismClose: pPrismClose,
      coreGlow: easeEditorialOut(segProgress(t, 159.4, 160.8)),
      alpha: 1 - pFinalFade,
    });
  }

  // 品牌字标与克制收束语（零点赞/投币/收藏/弹幕引导弹窗）
  drawBrandWordmark(overlayCtx, {
    cx: 960,
    y: 572,
    wordmarkAlpha: pWordmark * (1 - pFinalFade),
    taglineAlpha: pTagline * (1 - pFinalFade),
  });

  // 结尾 1.2s 优雅渐隐回纯净暖纸（与 0:00 开场首尾闭环）
  if (pFinalFade > 0.005) {
    overlayCtx.save();
    overlayCtx.fillStyle = rgba(COLORS.paperBase, pFinalFade);
    overlayCtx.fillRect(0, 0, STAGE_W, STAGE_H);
    overlayCtx.restore();
  }
}
