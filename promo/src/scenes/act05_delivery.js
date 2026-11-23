/*
 * 第五幕：所见即成片与克制落版（2:20 – 2:45，丝滑多层渐隐与流纹演进版）
 * 2:20 – 2:30.8  青绿-暖杏星芒标尺扫屏，隐去工作台面板舒展回 100% 精修 v2 彩虹 + 轻盈印章「已导出 · 1080P 60fps」
 * 2:30.8 – 2:36.8 丝滑分阶段演变（彻底消除 2:34 处突变）：
 *                 1) 测角仪/立体背景/角度标注率先轻柔隐去（150.8–153.0s）
 *                 2) 7 股彩虹波列逐步柔化降饱和、拉伸并自然编织融合为上下双股品牌流纹丝带（152.2–156.2s）
 *                 3) 晶莹棱镜温柔收拢为一粒星芒墨珠，飘升至画幅正中化作画笔引出青绿竖线（153.4–156.8s）
 * 2:36.8 – 2:45.0 棱片归位拼合 BrandLogo -> Knowledge.Show(me) + 「让好奇可见，让作品随心。」-> 2.5s 纯净留白
 */

import { COLORS, SPECTRUM, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  lerpColor,
  rgba,
  easeEditorialOut,
  easeEditorialInOut,
  springProgress,
  bezierPoint,
  TAU,
} from "../core/math.js";
import { drawPaperBase, drawPaperCard } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";
import { drawBrandMark, drawBrandWordmark } from "../entities/brandLogo.js";
import { drawRainbowInRect } from "./act04_workbench.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawPopupPaperDiorama,
  drawStarlightGlint,
  drawOrigamiConfettiBurst,
  drawEditorialPrintMarks,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

/**
 * 绘制项目最具辨识度的上下双股流纹丝带（青绿 + 湖蓝 + 暖杏，可平滑从彩虹波列演进过来）
 */
function drawSignatureFlowRibbons(ctx, t, spreadProgress, alpha = 1) {
  if (spreadProgress <= 0.004 || alpha <= 0.004) return;
  const p = clamp(spreadProgress);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.lineCap = "round";

  const ribbons = [
    // 上方柔美弧带
    { yBase: 175, amp: 56, freq: 1.45, color: COLORS.brandTeal, width: 4.0, op: 0.44, phase: 0.2 },
    { yBase: 196, amp: 44, freq: 1.65, color: COLORS.brandPeriwinkle, width: 2.5, op: 0.32, phase: 1.1 },
    { yBase: 184, amp: 32, freq: 1.90, color: COLORS.brandAmber, width: 1.9, op: 0.36, phase: 2.3 },
    // 下方托底弧带
    { yBase: 902, amp: 58, freq: 1.38, color: COLORS.brandTeal, width: 4.2, op: 0.46, phase: 3.1 },
    { yBase: 882, amp: 46, freq: 1.60, color: COLORS.brandPeriwinkle, width: 2.6, op: 0.34, phase: 4.0 },
    { yBase: 894, amp: 34, freq: 1.82, color: COLORS.brandAmber, width: 2.0, op: 0.38, phase: 5.2 },
  ];

  for (const r of ribbons) {
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = lerp(-40, STAGE_W + 40, u);
      const env = Math.sin(u * Math.PI);
      const y =
        lerp(STAGE_H * 0.54, r.yBase, easeEditorialOut(p)) +
        Math.sin(u * TAU * r.freq + t * 0.65 + r.phase) * r.amp * (0.45 + 0.55 * env) * p;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
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
 * 2:31.5 – 2:36.2：7 股水彩彩虹平滑脱色、伸展并优雅编织入上下双股流纹丝带的过渡层
 * 彻底替代突变切换，让原画的每一缕色彩都有机融进结尾舞台！
 */
function drawDissolvingRainbowWeave(ctx, t, morphU) {
  const u = clamp(morphU);
  if (u <= 0.002 || u >= 0.998) return;

  const fade = Math.sin(u * Math.PI);
  const targets = [
    { y: 175, color: COLORS.brandTeal },
    { y: 184, color: COLORS.brandAmber },
    { y: 196, color: COLORS.brandPeriwinkle },
    { y: 540, color: COLORS.brandTeal },
    { y: 882, color: COLORS.brandPeriwinkle },
    { y: 894, color: COLORS.brandAmber },
    { y: 902, color: COLORS.brandTeal },
  ];

  ctx.save();
  ctx.globalAlpha = clamp(fade * 0.85);
  ctx.lineCap = "round";

  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    const tgt = targets[i];
    const startX = lerp(740, -30, easeEditorialInOut(u));
    const endX = lerp(1860, STAGE_W + 30, easeEditorialInOut(u));
    const baseY0 = 490 + i * 26;
    const strokeCol = lerpColor(band.hex, tgt.color, u, i === 3 ? 0.35 * (1 - u) : 0.52);

    ctx.beginPath();
    const steps = 110;
    for (let k = 0; k <= steps; k++) {
      const s = k / steps;
      const x = lerp(startX, endX, s);
      const yRainbow = baseY0 + s * (210 + i * 48) + Math.sin(s * 18 - t * 3.8 + band.phase) * (8 * (1 - u * 0.65));
      const yRibbon = tgt.y + Math.sin(s * TAU * 1.55 + t * 0.65 + i) * 44 * Math.sin(s * Math.PI);
      const y = lerp(yRainbow, yRibbon, easeEditorialInOut(u));
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = lerp(5.2, 3.0, u);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制青绿-暖杏双色星芒刊物标尺
 */
function drawExportSweepRuler(ctx, sweepX, sweepProgress, alpha) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  const trailGrad = ctx.createLinearGradient(sweepX - 72, 0, sweepX, 0);
  trailGrad.addColorStop(0, "rgba(18, 148, 141, 0)");
  trailGrad.addColorStop(0.76, "rgba(18, 148, 141, 0.04)");
  trailGrad.addColorStop(1, "rgba(242, 153, 74, 0.11)");
  ctx.fillStyle = trailGrad;
  ctx.fillRect(sweepX - 72, 0, 72, STAGE_H);

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

  [0.24, 0.52, 0.78].forEach((ry, idx) => {
    const sy = STAGE_H * ry + Math.sin(sweepProgress * 12 + idx * 2) * 18;
    drawStarlightGlint(
      ctx,
      sweepX,
      sy,
      11 + 3 * Math.sin(sweepProgress * 16 + idx),
      "#FFFFFF",
      idx === 1 ? COLORS.brandAmber : COLORS.brandTeal,
      0.88,
      sweepProgress * 2 + idx
    );
  });

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

  // ── 连续、零突变的多阶段时间曲线 ────────────────────────────────────────
  const pSweep = easeEditorialInOut(segProgress(t, 140.2, 148.2));
  const pStampIn = springProgress(segProgress(t, 148.4, 149.2), 0.5, 0.78, 18);
  const pStampOut = easeEditorialInOut(segProgress(t, 151.4, 153.2));

  // 分层渐隐曲线（2:30.6 – 2:36.8 丝滑溶解、一点一点消融并演进为最终 Logo！）
  const ornamentFadeOut = 1 - easeEditorialInOut(segProgress(t, 150.6, 153.2)); // 第 1 层：测角仪、立体山丘、角度标注先轻柔隐去
  const rainbowAlphaOut = 1 - easeEditorialInOut(segProgress(t, 152.2, 155.4)); // 第 2 层：彩虹波列与棱镜缓慢柔化淡出
  const rainbowRewindGentle = easeEditorialInOut(segProgress(t, 152.4, 155.6)) * 0.38; // 彩虹轻微回缩舒缓收势
  const pWeaveMorph = segProgress(t, 151.8, 156.4); // 第 3 层：七彩编织丝带同步拉展融为品牌双股流纹
  const pRibbonIn = easeEditorialInOut(segProgress(t, 152.8, 156.8)); // 双股流纹柔和接棒
  const pSparkToSpine = easeEditorialInOut(segProgress(t, 154.0, 156.6)); // 棱镜化作一粒青金星芒飞向中央画笔起点

  const pSpine = easeEditorialOut(segProgress(t, 156.5, 158.2));
  const pPrismHome = easeEditorialInOut(segProgress(t, 157.3, 159.4));
  const pPrismClose = springProgress(segProgress(t, 159.2, 160.2), 0.55, 0.78, 18);
  const pTileReveal = easeEditorialOut(segProgress(t, 159.0, 160.6));
  const pWordmark = easeEditorialOut(segProgress(t, 159.7, 161.2));
  const pTagline = easeEditorialOut(segProgress(t, 160.6, 162.1));
  const pFinalFade = easeEditorialInOut(segProgress(t, 163.8, 165.0));

  const sweepX = lerp(-24, STAGE_W + 24, pSweep);
  const waveT = 92.0 + (t - 92.0) * 0.45;

  // 1. 始终保持统一连贯的底层暖纸与午后斜阳（绝不因分枝切换产生色差或闪烁）
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 1.0,
    amberGlow: 1.0,
    dotGridAlpha: 0.024,
  });
  drawDappledSunlight(worldCtx, STAGE_W, STAGE_H, t, (1 - pFinalFade) * 0.90);

  // 2. 扫屏右侧尚未隐去的工作台（140.0 – 148.4s）
  if (sweepX < STAGE_W && t < 149.0) {
    worldCtx.save();
    worldCtx.beginPath();
    worldCtx.rect(Math.max(0, sweepX), 0, STAGE_W - Math.max(0, sweepX), STAGE_H);
    worldCtx.clip();
    drawRainbowInRect(worldCtx, wbRect, {
      t: waveT,
      v2Factor: 1,
      saturationBoost: 0.45,
      prismGlowBoost: 1,
      brassBoost: 1,
    });
    worldCtx.restore();

    ui.renderWorkbench({
      visible: true,
      alpha: 1,
      chromeReveal: 1,
      sweepClipX: Math.max(0, sweepX),
      version: "v4",
      versionLabel: "v4 · 测角环精修",
      selected: false,
      inspectorAlpha: 0,
      showUserMsg: true,
      showAiDoneMsg: true,
      playheadPct: 74,
      kfNodePct: 62,
      timeCode: "01:44 / 02:45",
      exportPressed: t < 140.5,
      statusText: "正在按确定性时间轴同步导出 1080P 60fps 成片…",
    });
  }

  // 3. 扫屏左侧（及扫屏完成后）：100% 满屏精修 v4 彩虹的分层丝滑淡出与溶解演进！
  if (sweepX > 0 && rainbowAlphaOut > 0.004) {
    worldCtx.save();
    if (sweepX < STAGE_W) {
      worldCtx.beginPath();
      worldCtx.rect(0, 0, Math.min(STAGE_W, sweepX), STAGE_H);
      worldCtx.clip();
    }

    // 第 1 层：立体山丘与黄铜测角仪率先在 150.6–153.2s 轻柔消散
    if (ornamentFadeOut > 0.005) {
      drawPopupPaperDiorama(worldCtx, 660, 560, 1, 0.85 * ornamentFadeOut);
      drawBrassGoniometer(worldCtx, 640, 540, 365, waveT, {
        alpha: 0.88 * ornamentFadeOut,
        reveal: 1,
        redDeg: 9.1,
        violetDeg: 37.8,
        brassBoost: ornamentFadeOut,
      });
    }

    // 第 2 层：棱镜主体与 7 股彩虹波列在 152.2–155.4s 一点一点轻柔回缩、柔化并渐隐
    drawRainbowOptics(worldCtx, {
      cx: 640,
      cy: 540,
      size: lerp(278, 224, easeEditorialInOut(segProgress(t, 152.6, 155.4))),
      t: waveT,
      popup: 1,
      beamProgress: 1 - easeEditorialInOut(segProgress(t, 152.0, 154.6)),
      dispersionProgress: 1,
      rewindProgress: rainbowRewindGentle,
      v2Factor: ornamentFadeOut, // 角度标尺随外饰先温柔隐退，不生硬残留
      saturationBoost: 0.45 * ornamentFadeOut,
      prismGlowBoost: ornamentFadeOut,
      showAngleAnnotation: ornamentFadeOut > 0.05,
      showWaveBeads: ornamentFadeOut > 0.08,
      styleId: "paper-editorial",
      alpha: rainbowAlphaOut,
      ribbonLen: 1140,
    });

    worldCtx.restore();
  }

  // 4. 过渡编织丝带 + 品牌标志双股流纹丝带（151.8s 起无缝接棒彩虹！）
  if (pWeaveMorph > 0.002 && pWeaveMorph < 0.998) {
    drawDissolvingRainbowWeave(worldCtx, t, pWeaveMorph);
  }
  if (pRibbonIn > 0.004) {
    drawSignatureFlowRibbons(worldCtx, t, pRibbonIn, pRibbonIn * (1 - pFinalFade));
  }

  // 5. 棱镜中心凝聚为一粒青金星芒画笔，优雅飘升至中央竖线起点 (918, 366)！
  const markCx = 960;
  const markCy = 418;
  const markSize = 152;
  const spineStartX = markCx - markSize * 0.23;
  const spineStartY = markCy - markSize * 0.34;

  if (t >= 153.8 && t <= 157.1) {
    const sparkAlpha =
      easeEditorialOut(segProgress(t, 153.8, 154.7)) *
      (1 - easeEditorialOut(segProgress(t, 156.4, 157.1)));
    const sp = bezierPoint(
      { x: 640, y: 540 },
      { x: 720, y: 420 },
      { x: 840, y: 340 },
      { x: spineStartX, y: spineStartY },
      pSparkToSpine
    );
    drawStarlightGlint(worldCtx, sp.x, sp.y, 20, "#FFFFFF", COLORS.brandTeal, sparkAlpha, t * 0.9);
  }

  // 6. 顶层扫屏标尺与印章提示
  if (pSweep > 0.002 && pSweep < 0.998) {
    const rulerAlpha = Math.min(1, pSweep * 10) * Math.min(1, (1 - pSweep) * 10);
    drawExportSweepRuler(overlayCtx, sweepX, pSweep, rulerAlpha);
  }

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

  // 7. 围绕 BrandLogo 的柔和晨曦光晕、装饰细轨与归位星屑
  const haloReveal = easeEditorialOut(segProgress(t, 157.4, 160.6)) * (1 - pFinalFade);
  if (haloReveal > 0.01) {
    worldCtx.save();
    worldCtx.globalAlpha = haloReveal;

    const rg = worldCtx.createRadialGradient(markCx, markCy, 24, markCx, markCy, 290);
    rg.addColorStop(0, "rgba(255, 251, 240, 0.78)");
    rg.addColorStop(0.45, "rgba(242, 153, 74, 0.12)");
    rg.addColorStop(0.78, "rgba(18, 148, 141, 0.07)");
    rg.addColorStop(1, "rgba(18, 148, 141, 0)");
    worldCtx.fillStyle = rg;
    worldCtx.beginPath();
    worldCtx.arc(markCx, markCy, 290, 0, TAU);
    worldCtx.fill();

    worldCtx.translate(markCx, markCy);
    worldCtx.rotate(t * 0.08);
    worldCtx.strokeStyle = "rgba(18, 148, 141, 0.18)";
    worldCtx.lineWidth = 1.2;
    worldCtx.setLineDash([4, 10]);
    worldCtx.beginPath();
    worldCtx.arc(0, 0, 152, 0, TAU);
    worldCtx.stroke();
    worldCtx.setLineDash([]);

    worldCtx.strokeStyle = "rgba(242, 153, 74, 0.28)";
    worldCtx.lineWidth = 1.4;
    worldCtx.beginPath();
    worldCtx.arc(0, 0, 178, -0.5, 0.85);
    worldCtx.stroke();
    worldCtx.beginPath();
    worldCtx.arc(0, 0, 178, Math.PI - 0.5, Math.PI + 0.85);
    worldCtx.stroke();
    worldCtx.restore();
  }

  const pLockBurst = segProgress(t, 159.3, 161.4);
  if (pLockBurst > 0.01 && pLockBurst < 0.99) {
    drawOrigamiConfettiBurst(worldCtx, markCx + 18, markCy, pLockBurst, {
      seed: 15930,
      count: 20,
      spread: 210,
      alpha: 0.78 * (1 - pFinalFade),
    });
  }

  if (t > 151.0) {
    drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, {
      alpha: 0.36 * easeEditorialOut(segProgress(t, 151.0, 153.5)) * (1 - pFinalFade),
      issue: "KNOWLEDGE.SHOW(ME) · EDITION",
    });
  }

  // 8. 棱片远弧线飞回图标右侧（155.8 – 159.5s）并无缝拼合为 BrandLogo
  const homeX = markCx + markSize * 0.115;
  const homeY = markCy;
  if (t >= 155.5 && t < 159.55) {
    const flightPath = (time) => {
      const u = easeEditorialInOut(segProgress(time, 155.8, 159.4));
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
      alpha: clamp(easeEditorialOut(segProgress(t, 155.6, 156.8)) * handoffFade),
      t,
      prismBlend: clamp((pPrismHome - 0.55) / 0.45),
      coreGlow: clamp((pPrismHome - 0.6) / 0.4),
      trail,
      trailAlpha: 1 - pPrismHome * 0.9,
    });
  }

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

  drawBrandWordmark(overlayCtx, {
    cx: 960,
    y: 572,
    wordmarkAlpha: pWordmark * (1 - pFinalFade),
    taglineAlpha: pTagline * (1 - pFinalFade),
  });

  // 结尾 1.2s 优雅渐隐回纯净暖纸（与 0:00 单光点首尾闭环）
  if (pFinalFade > 0.005) {
    overlayCtx.save();
    overlayCtx.fillStyle = rgba(COLORS.paperBase, pFinalFade);
    overlayCtx.fillRect(0, 0, STAGE_W, STAGE_H);
    overlayCtx.restore();
  }
}
