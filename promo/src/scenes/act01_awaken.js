/*
 * 第一幕：破纸而出与悬念反转（0:00 – 0:22，光点破晓引入 + 高定立体书版）
 * 0:00 – 0:03.2 光点引入：纯净暖纸中央一粒好奇光点呼吸 -> 射出斜向金青光束与丝带 -> 渐进展开整张精装书桌
 * 0:03.2 – 0:06.8 墨滴涟漪唤醒句号 -> 棱片破缝跃出轻敲平面灰三角触发触感回弹环
 * 0:06.8 – 0:14.0 立体书剧场轰然撑起（层叠剪纸山丘 + 旋转黄铜测角仪 + 折纸彩屑迸发 + 7 股光子水彩彩虹）
 * 0:14.0 – 0:19.6 留存反转钩子（BRACKET 精准捏改紫光波列 + 声波谐振环 + 手绘角度小签）
 * 0:19.6 – 0:22.0 衔接机关 ①（彩虹化作星芒流光倒卷收束，优雅立正为真实输入框光标）
 */

import { COLORS, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
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
import { drawPaperBase, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawPopupPaperDiorama,
  drawOrigamiConfettiBurst,
  drawStarlightGlint,
  drawEditorialPrintMarks,
  drawBrassRuler,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

/**
 * 0:00 – 0:03.4 开场光点与引入光束（首帧从一粒温暖星芒光点启程，优雅绽放为完整画桌）
 */
function drawOpeningLightSeed(ctx, t, dotTarget) {
  if (t > 4.2) return;

  const pPulse = easeEditorialOut(segProgress(t, 0.0, 0.85));
  const pBeam = easeEditorialInOut(segProgress(t, 0.35, 1.55));
  const pIris = easeEditorialInOut(segProgress(t, 0.85, 2.75));
  const pTravelToDot = easeEditorialInOut(segProgress(t, 1.85, 3.15));
  const pFade = 1 - easeEditorialOut(segProgress(t, 3.15, 3.85));

  if (pFade <= 0.005) return;

  const sx = lerp(STAGE_W * 0.5, dotTarget.x - 2, pTravelToDot);
  const sy = lerp(STAGE_H * 0.5, dotTarget.y - 4, pTravelToDot);

  ctx.save();
  ctx.globalAlpha = clamp(pFade);

  // 1. 首帧极简优雅的同心探索细环（自中心一点向外舒展）
  if (pPulse > 0.01 && pIris < 0.98) {
    const ringAlpha = (1 - pIris * 0.85) * 0.45;
    for (let k = 0; k < 3; k++) {
      const u = clamp((pBeam - k * 0.14) / 0.86);
      if (u <= 0) continue;
      const rr = lerp(10, 140 + k * 140, easeEditorialOut(u));
      ctx.strokeStyle =
        k === 0
          ? rgba(COLORS.brandAmber, ringAlpha)
          : k === 1
            ? rgba(COLORS.brandTeal, ringAlpha * 0.85)
            : rgba(COLORS.brandPeriwinkle, ringAlpha * 0.55);
      ctx.lineWidth = 1.8 - k * 0.4;
      ctx.beginPath();
      ctx.arc(STAGE_W * 0.5, STAGE_H * 0.5, rr, 0, TAU);
      ctx.stroke();
    }
  }

  // 2. 划开暖白纸面的 18° 斜向金青光束 + 两条柔美引入游丝
  if (pBeam > 0.01 && pTravelToDot < 0.92) {
    const beamFade = (1 - pTravelToDot) * Math.sin(clamp(pBeam) * Math.PI * 0.88);
    const halfSpan = lerp(0, 1080, easeEditorialOut(pBeam));
    const ang = (18 * Math.PI) / 180;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);

    const x1 = STAGE_W * 0.5 - dx * halfSpan;
    const y1 = STAGE_H * 0.5 - dy * halfSpan;
    const x2 = STAGE_W * 0.5 + dx * halfSpan;
    const y2 = STAGE_H * 0.5 + dy * halfSpan;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, "rgba(255, 250, 236, 0)");
    grad.addColorStop(0.28, rgba(COLORS.brandTeal, 0.24 * beamFade));
    grad.addColorStop(0.5, rgba("#FFFDF8", 0.95 * beamFade));
    grad.addColorStop(0.72, rgba(COLORS.brandAmber, 0.34 * beamFade));
    grad.addColorStop(1, "rgba(255, 250, 236, 0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = lerp(26, 4, pTravelToDot);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 纤细暖白光芯
    ctx.strokeStyle = rgba("#FFFFFF", 0.92 * beamFade);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 伴随光束舒展的双股微弧游丝
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const s = lerp(-halfSpan * 0.72, halfSpan * 0.72, u);
        const bulge = Math.sin(u * Math.PI) * 34 * sign * Math.sin(t * 2.4 + sign);
        const px = STAGE_W * 0.5 + dx * s - dy * bulge;
        const py = STAGE_H * 0.5 + dy * s + dx * bulge;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = sign < 0 ? rgba(COLORS.brandTeal, 0.42 * beamFade) : rgba(COLORS.brandPeriwinkle, 0.36 * beamFade);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // 3. 灵动呼吸的核心好奇光点（在 1.85s-3.15s 滑落到书页句号上，唤醒整本书！）
  const coreScale = lerp(0.75, 1.35, Math.sin(pPulse * Math.PI * 0.5)) * lerp(1.0, 0.65, pTravelToDot);
  drawStarlightGlint(
    ctx,
    sx,
    sy,
    24 * coreScale,
    "#FFFFFF",
    pTravelToDot > 0.5 ? COLORS.brandTeal : COLORS.brandAmber,
    0.96,
    t * 0.7
  );

  ctx.restore();
}

/**
 * 绘制精装物理典籍书桌与静态光学铜版讲义（随开场光环平滑显现，不再生硬直出）
 */
function drawOpenBookDesk(ctx, t, alpha, revealProg, slideLeftPx, inkRippleProg = 0) {
  const effAlpha = clamp(alpha * revealProg);
  if (effAlpha <= 0.005) return { dotX: 734, dotY: 590 };

  ctx.save();
  ctx.globalAlpha = effAlpha;
  ctx.translate(-slideLeftPx, 0);

  // 由中央向外扩张的优雅圆形光晕裁切显影（0:00.85 -> 0:02.75 书桌由一束光逐渐铺满全屏！）
  if (revealProg < 0.995) {
    const maxR = Math.hypot(STAGE_W, STAGE_H) * 0.62;
    const curR = lerp(24, maxR, easeEditorialInOut(revealProg));
    ctx.beginPath();
    ctx.arc(STAGE_W * 0.5, STAGE_H * 0.5, curR, 0, TAU);
    ctx.clip();
  }

  // 1. 书页多层纸缘（厚实精装书感）
  for (let layer = 3; layer >= 1; layer--) {
    const off = layer * 5;
    roundRectPath(ctx, 118 + off * 0.4, 96 + off, 1684 - off * 0.8, 882, 10);
    ctx.fillStyle = layer === 1 ? "#F4EFE4" : layer === 2 ? "#ECE5D6" : "#E3DAC8";
    ctx.fill();
    ctx.strokeStyle = "rgba(28, 42, 48, 0.09)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawPaperCard(ctx, 118, 92, 1684, 882, {
    radius: 8,
    fill: "#FDFBF6",
    stroke: "rgba(28, 42, 48, 0.14)",
    lineWidth: 1.3,
    shadowBlur: 34,
    shadowOffsetY: 16,
    shadowColor: "rgba(28, 42, 48, 0.13)",
  });

  // 中央装订书脊折痕阴影
  const spineGrad = ctx.createLinearGradient(910, 92, 1010, 92);
  spineGrad.addColorStop(0, "rgba(28, 42, 48, 0)");
  spineGrad.addColorStop(0.46, "rgba(28, 42, 48, 0.065)");
  spineGrad.addColorStop(0.50, "rgba(28, 42, 48, 0.11)");
  spineGrad.addColorStop(0.54, "rgba(28, 42, 48, 0.05)");
  spineGrad.addColorStop(1, "rgba(28, 42, 48, 0)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(910, 92, 100, 882);

  // 页眉细线
  ctx.strokeStyle = "rgba(28, 42, 48, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(176, 164);
  ctx.lineTo(918, 164);
  ctx.moveTo(1002, 164);
  ctx.lineTo(1744, 164);
  ctx.stroke();

  ctx.font = `500 13px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.65)";
  ctx.fillText("CHAPTER IV · OPTICKS & DISPERSION", 176, 146);
  ctx.textAlign = "right";
  ctx.fillText("PLATE 04 · P. 142", 1744, 146);
  ctx.textAlign = "left";

  // 2. 左页：沉闷灰度讲义排版
  const lx = 212;
  ctx.font = `500 14px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(138, 96, 44, 0.72)";
  ctx.fillText("SECTION 4.1", lx, 266);

  ctx.font = `600 44px ${FONTS.serif}`;
  ctx.fillStyle = "#485358";
  ctx.fillText("光的色散", lx, 326);

  ctx.strokeStyle = "rgba(72, 83, 88, 0.28)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(lx, 356);
  ctx.lineTo(lx + 196, 356);
  ctx.stroke();

  const lines = [
    "复色光通过三棱镜分解为单色光的现象，",
    "称为光的色散。由于同一种透明介质对不同",
    "频率单色光的折射率不同，红光偏折最小，",
    "紫光偏折最大，因而在光屏上形成彩色光带",
  ];
  ctx.font = `400 24px ${FONTS.serif}`;
  ctx.fillStyle = "#6B777C";
  lines.forEach((line, idx) => {
    ctx.fillText(line, lx, 424 + idx * 50);
  });

  const lastW = ctx.measureText(lines[3]).width;
  const dotX = lx + lastW + 10;
  const dotY = 424 + 3 * 50;

  // 光点落上句号后荡开的宣纸毛细涟漪
  if (inkRippleProg > 0.01) {
    for (let k = 0; k < 3; k++) {
      const rp = clamp((inkRippleProg - k * 0.14) / 0.86);
      if (rp <= 0) continue;
      const rr = lerp(6, 138 + k * 52, easeEditorialOut(rp));
      const ra = (1 - rp) * (k === 0 ? 0.58 : 0.36);
      ctx.strokeStyle = k % 2 === 0 ? rgba(COLORS.brandTeal, ra) : rgba(COLORS.brandAmber, ra);
      ctx.lineWidth = 2.2 - k * 0.5;
      ctx.beginPath();
      ctx.arc(dotX - 2, dotY - 4, rr, 0, TAU);
      ctx.stroke();
    }
    drawStarlightGlint(ctx, dotX - 2, dotY - 4, 16 * Math.sin(clamp(inkRippleProg) * Math.PI), "#FFFDF9", COLORS.brandAmber, 0.92, t);
  }

  ctx.fillStyle = inkRippleProg > 0.05 ? COLORS.brandTeal : "#6B777C";
  ctx.fillText("。", dotX - 8, dotY);

  ctx.font = `italic 15px ${FONTS.serif}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.52)";
  ctx.fillText("n₁ sin θ₁ = n₂(λ) sin θ₂   ·   Static textbook illustration", lx, 718);

  // 3. 右页：铜版草图辅助虚线弧
  ctx.save();
  ctx.strokeStyle = "rgba(91, 107, 115, 0.16)";
  ctx.lineWidth = 1.1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(1335, 540, 210, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1060, 470);
  ctx.lineTo(1580, 620);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.font = `400 15px ${FONTS.sans}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.56)";
  ctx.textAlign = "center";
  ctx.fillText("图 4-1  平面三棱镜示意图（静态黑白讲义）", 1335, 788);
  ctx.textAlign = "left";

  // 4. 书桌右下角黄铜直尺
  drawBrassRuler(ctx, 1210, 868, 490, 34, -0.045, 0.92);

  // 5. 书页右下角微翘纸角
  const curl = 24 + 14 * Math.sin(t * 1.6);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1802 - curl * 2.2, 974);
  ctx.lineTo(1802, 974 - curl * 2.2);
  ctx.lineTo(1802, 974);
  ctx.closePath();
  ctx.fillStyle = "#EAE2D1";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1802 - curl * 2.2, 974);
  ctx.quadraticCurveTo(1802 - curl * 1.1, 974 - curl * 1.1, 1802, 974 - curl * 2.2);
  ctx.lineTo(1802 - curl * 1.8, 974 - curl * 1.8);
  ctx.closePath();
  ctx.fillStyle = "#FFFDF9";
  ctx.shadowColor = "rgba(28, 42, 48, 0.14)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  ctx.restore();
  return { dotX, dotY };
}

export function renderAct01({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();

  // 0:00 – 0:03.2：由一点一束光渐进铺开全屏，再衔接句号墨滴与棱片苏醒！
  const pBookReveal = easeEditorialInOut(segProgress(t, 0.85, 2.85));
  const pIntroCam = easeEditorialOut(segProgress(t, 0.0, 5.4));
  const pInkEmber = segProgress(t, 2.9, 5.0);
  const pPrismPeek = easeEditorialOut(segProgress(t, 4.0, 5.4));
  const pPopup = springProgress(segProgress(t, 7.0, 8.8), 0.72, 0.74, 17);
  const pConfetti = segProgress(t, 7.1, 9.7);
  const pHandoutOut = easeEditorialInOut(segProgress(t, 6.8, 8.6));
  const pGoniometer = easeEditorialOut(segProgress(t, 7.5, 9.9));
  const pBeam = easeEditorialOut(segProgress(t, 8.1, 9.5));
  const pDispersion = easeEditorialOut(segProgress(t, 8.8, 12.3));
  const pHookMove = easeEditorialInOut(segProgress(t, 14.0, 15.1));
  const pBracketOpen = springProgress(segProgress(t, 14.8, 15.8), 0.52, 0.78, 18);
  const pVioletTweak = springProgress(segProgress(t, 15.9, 17.9), 0.65, 0.75, 16);
  const pBracketClose = easeEditorialInOut(segProgress(t, 18.8, 19.6));
  const pRewind = easeEditorialInOut(segProgress(t, 19.6, 21.1));
  const pCursorMorph = easeEditorialInOut(segProgress(t, 20.8, 22.0));

  // 开场微推拉：由 1.14x 聚焦中心光点柔和拉远展开整张书桌 -> 立体书展开全景 -> 紫光钩子微推
  const camZoom =
    lerp(1.14, 1.0, pIntroCam) +
    0.07 * Math.sin(pHookMove * Math.PI * 0.5) * (1 - pRewind);
  const camX = lerp(960, 1025, pHookMove * (1 - pRewind));
  const camY = lerp(540, 578, pHookMove * (1 - pRewind));
  camera.set({ x: camX, y: camY, zoom: camZoom });

  // 1. 纯净暖纸底色 + 午后斜阳随开场光束柔和渐入
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: lerp(0.18, 1.0, Math.max(pBookReveal * 0.5, pPopup)),
    amberGlow: lerp(0.22, 1.0, Math.max(pBookReveal * 0.5, pBeam)),
    dotGridAlpha: lerp(0.008, 0.032, Math.max(pBookReveal * 0.5, pPopup)),
  });
  drawDappledSunlight(worldCtx, STAGE_W, STAGE_H, t, lerp(0.15, 1.0, pBookReveal) * (1 - pCursorMorph * 0.4));

  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  // 2. 精装物理书桌（由 0.85s-2.85s 随光环渐进显现，再于立体书撑起时向左侧优雅退隐）
  const handoutAlpha = 1 - pHandoutOut;
  const dotPos = drawOpenBookDesk(worldCtx, t, handoutAlpha, pBookReveal, pHandoutOut * 165, pInkEmber);

  // 3. 立体书多层纸艺舞台 + 旋转黄铜测角仪
  const prismCx = lerp(1335, 730, easeEditorialInOut(segProgress(t, 7.0, 9.1)));
  const prismCy = lerp(542, 546, easeEditorialInOut(segProgress(t, 7.0, 9.1)));
  const prismSize = lerp(220, 272, clamp(pPopup));
  const opticsAlpha = pBookReveal * (1 - easeEditorialOut(segProgress(t, 20.7, 21.4)));

  if (pPopup > 0.02 && opticsAlpha > 0.01) {
    drawPopupPaperDiorama(worldCtx, prismCx + 24, prismCy + 16, pPopup, opticsAlpha * (1 - pRewind * 0.9));
    drawBrassGoniometer(worldCtx, prismCx, prismCy, 355, t, {
      alpha: opticsAlpha * (1 - pRewind),
      reveal: pGoniometer,
      redDeg: 11.5,
      violetDeg: lerp(33.6, 39.4, pVioletTweak),
    });
  }

  if (pConfetti > 0.01 && pConfetti < 0.99) {
    drawOrigamiConfettiBurst(worldCtx, prismCx, prismCy - 20, pConfetti, {
      seed: 20261,
      count: 34,
      spread: 380,
      alpha: 0.95,
    });
  }

  // 棱片敲击静态灰三角时的触感回弹波纹
  if (t >= 5.6 && t <= 7.0) {
    const tapCycle = ((t - 5.6) / 0.65) % 1;
    const tapR = lerp(10, 96, easeEditorialOut(tapCycle));
    worldCtx.save();
    worldCtx.strokeStyle = rgba(COLORS.brandTeal, (1 - tapCycle) * 0.55);
    worldCtx.lineWidth = 2.0;
    worldCtx.beginPath();
    worldCtx.arc(1270, 622, tapR, 0, TAU);
    worldCtx.stroke();
    worldCtx.restore();
  }

  // 4. 三棱镜与 7 股光子水彩彩虹（随开场光环平滑显现）
  const waveT =
    t < 14.0
      ? t
      : t < 19.6
        ? 14.0 + (t - 14.0) * 0.2
        : 14.0 + 5.6 * 0.2 + (t - 19.6);

  const optics = drawRainbowOptics(worldCtx, {
    cx: prismCx,
    cy: prismCy,
    size: prismSize,
    t: waveT,
    popup: clamp(pPopup, 0, 1.06),
    beamProgress: pBeam,
    dispersionProgress: pDispersion,
    rewindProgress: pRewind,
    violetTweak: pVioletTweak * (1 - pRewind),
    alpha: opticsAlpha,
    styleId: "paper-editorial",
    showWaveBeads: true,
    ribbonLen: 1050,
  });

  // 5. 开场 0:00 – 0:03.8 的一粒光点与一束暖光（最上层引导视线落在句号上！）
  drawOpeningLightSeed(worldCtx, t, { x: dotPos.dotX, y: dotPos.dotY });

  // 6. 紫光捏改谐振环
  if (pVioletTweak > 0.02 && pVioletTweak < 0.96 && pRewind < 0.1) {
    worldCtx.save();
    for (let ring = 0; ring < 2; ring++) {
      const ru = clamp((pVioletTweak - ring * 0.18) / 0.82);
      if (ru <= 0) continue;
      worldCtx.strokeStyle = rgba("#8E6CBB", (1 - ru) * 0.55);
      worldCtx.lineWidth = 2.2 - ring * 0.7;
      worldCtx.beginPath();
      worldCtx.arc(optics.violetAnchor.x, optics.violetAnchor.y, lerp(16, 132 + ring * 34, easeEditorialOut(ru)), 0, TAU);
      worldCtx.stroke();
    }
    worldCtx.restore();
  }

  // 7. 衔接机关 ①：彩虹倒卷凝聚为星芒细线 -> 立正落位到第二幕真实输入框光标 (434, 404)
  if (pRewind > 0.40) {
    const lineIn = easeEditorialOut(segProgress(t, 20.3, 21.0));
    const target = UI_GEOMETRY.composer.cursorStart;
    const cxLine = lerp(prismCx, target.x, pCursorMorph);
    const cyLine = lerp(prismCy - 18, target.y, pCursorMorph);
    const len = lerp(290, 34, pCursorMorph);
    const rot = lerp(0.18, Math.PI * 0.5, pCursorMorph);
    const thick = lerp(5.2, 2.6, pCursorMorph);

    worldCtx.save();
    worldCtx.translate(cxLine, cyLine);
    worldCtx.rotate(rot);
    worldCtx.globalAlpha = lineIn;

    if (pCursorMorph < 0.92) {
      const g = worldCtx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
      g.addColorStop(0, rgba(COLORS.brandAmber, 0));
      g.addColorStop(0.5, rgba(COLORS.brandAmber, 0.52 * (1 - pCursorMorph)));
      g.addColorStop(1, rgba(COLORS.brandTeal, 0));
      worldCtx.strokeStyle = g;
      worldCtx.lineWidth = 22 * (1 - pCursorMorph * 0.7);
      worldCtx.lineCap = "round";
      worldCtx.beginPath();
      worldCtx.moveTo(-len * 0.5, 0);
      worldCtx.lineTo(len * 0.5, 0);
      worldCtx.stroke();
    }

    const blink = pCursorMorph > 0.9 ? (Math.sin(t * 7.5) > -0.35 ? 1 : 0.35) : 1;
    worldCtx.strokeStyle = pCursorMorph > 0.65 ? COLORS.brandTeal : "#FFFDF9";
    worldCtx.globalAlpha = lineIn * blink;
    worldCtx.lineWidth = thick;
    worldCtx.lineCap = "round";
    worldCtx.beginPath();
    worldCtx.moveTo(-len * 0.5, 0);
    worldCtx.lineTo(len * 0.5, 0);
    worldCtx.stroke();
    worldCtx.restore();

    if (pCursorMorph < 0.88) {
      drawStarlightGlint(worldCtx, cxLine, cyLine, 18 * (1 - pCursorMorph * 0.6), "#FFFFFF", COLORS.brandAmber, lineIn * 0.9, t);
    }
  }

  worldCtx.restore();

  drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, {
    alpha: 0.48 * pGoniometer * (1 - pCursorMorph),
    issue: "ACT I · AWAKEN THE PAGE",
  });

  // 8. 顶层「棱片」主角路径与四态驱动（4.0s 从句号缝隙跃出）
  if (t >= 3.95) {
    const flightPath = (time) => {
      if (time < 7.0) {
        const u = segProgress(time, 3.95, 7.0);
        const p = bezierPoint(
          { x: dotPos.dotX + 4, y: dotPos.dotY - 6 },
          { x: 960, y: 290 },
          { x: 1180, y: 690 },
          { x: 1270, y: 630 },
          easeEditorialOut(u)
        );
        const tap = u > 0.60 ? Math.sin(((u - 0.60) / 0.40) * Math.PI * 2) * 13 : 0;
        return { x: p.x, y: p.y - Math.abs(tap) };
      }
      if (time < 9.3) {
        const u = segProgress(time, 7.0, 9.3);
        return bezierPoint(
          { x: 1270, y: 630 },
          { x: 1090, y: 250 },
          { x: 950, y: 250 },
          { x: 905, y: 345 },
          easeEditorialInOut(u)
        );
      }
      if (time < 14.0) {
        const u = segProgress(time, 9.3, 14.0);
        return {
          x: 905 + Math.sin(u * TAU) * 16,
          y: 345 + Math.cos(u * TAU) * 11,
        };
      }
      if (time < 19.6) {
        const u = segProgress(time, 14.0, 15.1);
        const target = optics.violetAnchor;
        return bezierPoint(
          { x: 905, y: 345 },
          { x: 1080, y: 420 },
          { x: target.x - 40, y: target.y - 95 },
          { x: target.x, y: target.y },
          easeEditorialInOut(u)
        );
      }
      const u = segProgress(time, 19.6, 22.0);
      const target = optics.violetAnchor;
      return bezierPoint(
        { x: target.x, y: target.y },
        { x: 940, y: 450 },
        { x: 640, y: 310 },
        { x: 540, y: 340 },
        easeEditorialInOut(u)
      );
    };

    const posW = flightPath(t);
    const posAhead = flightPath(Math.min(22.0, t + 0.04));
    const velAngle =
      Math.hypot(posAhead.x - posW.x, posAhead.y - posW.y) > 0.6
        ? Math.atan2(posAhead.y - posW.y, posAhead.x - posW.x) * 0.28
        : 0;

    const posS = camera.worldToScreen(posW.x, posW.y);
    const trailW = sampleTrailFromPath(flightPath, t, 0.62, 26);
    const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

    const vAnchorS = camera.worldToScreen(optics.violetAnchor.x, optics.violetAnchor.y);
    const violetBoxS = {
      x: vAnchorS.x - 142,
      y: vAnchorS.y - 64,
      w: 284,
      h: 128,
    };

    const bracketBlend = clamp(pBracketOpen * (1 - pBracketClose));
    const prismBlend =
      t >= 8.9 && t < 14.0
        ? easeEditorialInOut(segProgress(t, 8.9, 9.7)) * (1 - segProgress(t, 13.4, 14.0))
        : 0;

    drawPrismFold(overlayCtx, {
      x: posS.x,
      y: posS.y,
      mode: bracketBlend > 0.05 ? "BRACKET" : prismBlend > 0.5 ? "PRISM" : "GLIDE",
      size: 38 * camera.zoom,
      angle: velAngle,
      alpha: clamp(pPrismPeek * 1.5),
      t,
      prismBlend,
      bracketBlend,
      bracketRect: violetBoxS,
      bracketPulse: pVioletTweak > 0 && pVioletTweak < 0.7 ? Math.sin(pVioletTweak * Math.PI) * 0.55 : 0,
      coreGlow: Math.max(
        prismBlend * 0.9,
        clamp(Math.sin(pVioletTweak * Math.PI) * 0.95),
        pPopup > 0.1 && pPopup < 0.9 ? 0.9 : 0.3
      ),
      trail: trailS,
      trailAlpha: t > 4.05 ? 0.92 : 0,
    });
  }
}
