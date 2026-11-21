/*
 * 第四幕：创作者主权——真实工作台与局部精修（1:32 – 2:20，全片核心高潮）
 * 1:32 – 1:40  退镜入台：棱片刹车悬停并牵引画幅缩小至 64% 工作台中央，四周真实面板浮现
 * 1:40 – 2:04  精准手术：BRACKET 咬合 prism-spectrum-waves -> 输入自然语言 -> 0.9s 框内暖杏水墨涟漪 -> 框内焕新 v2，框外纹丝不动
 * 2:04 – 2:20  描图纸 v1/v2 竖线对比 + 微调二连击（时间轴节点 & 色带通透度）+ 轻点「导出 MP4」
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
} from "../core/math.js";
import { drawPaperBase, drawFocusMask, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";
import { drawBoxedInkRipple } from "../entities/inkRipple.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawPopupPaperDiorama,
  drawStarlightGlint,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

const REV_PROMPT = "拉大红光与紫光的波长起伏对比，并在折射边界补上手绘角度刻度";

/**
 * 在给定矩形内按 1920x1080 坐标系缩放绘制主线暖纸彩虹动画
 * 支持将 v2Factor 严格限定在局部选框内，或由描图纸竖线 splitX 拆分左右 v1/v2 对比！
 */
export function drawRainbowInRect(
  ctx,
  rect,
  {
    t = 92,
    v2Factor = 0,
    saturationBoost = 0,
    localClipBox = null, // 相对于 1920x1080 画幅内部的选框（严格框内更新、框外纹丝不动）
    compareSplitNormX = null, // [0, 1] 描图纸对比竖线（左侧 v1，右侧 v2）
  } = {}
) {
  const sx = rect.w / STAGE_W;
  const sy = rect.h / STAGE_H;

  const drawPass = (passV2, passSat) => {
    drawPaperBase(ctx, STAGE_W, STAGE_H, {
      tealGlow: 1.0,
      amberGlow: 1.0,
      dotGridAlpha: 0.024,
    });
    drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.85);
    drawPopupPaperDiorama(ctx, 660, 560, 1, 0.85);
    drawBrassGoniometer(ctx, 640, 540, 365, t, {
      alpha: 0.88,
      reveal: 1,
      redDeg: 11.5 - 2.4 * passV2,
      violetDeg: 33.6 + 4.2 * passV2,
    });
    return drawRainbowOptics(ctx, {
      cx: 640,
      cy: 540,
      size: 278,
      t,
      popup: 1,
      beamProgress: 1,
      dispersionProgress: 1,
      v2Factor: passV2,
      saturationBoost: passSat,
      showAngleAnnotation: passV2 > 0.1,
      showWaveBeads: true,
      styleId: "paper-editorial",
      ribbonLen: 1140,
    });
  };

  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, rect.w < 1900 ? 12 : 0);
  ctx.clip();
  ctx.translate(rect.x, rect.y);
  ctx.scale(sx, sy);

  let opticsInfo;

  if (compareSplitNormX !== null) {
    // 描图纸对比模式：左侧显示 v1 初稿，右侧显示 v2 局部精修
    const splitPx = clamp(compareSplitNormX) * STAGE_W;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitPx, STAGE_H);
    ctx.clip();
    opticsInfo = drawPass(0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitPx, 0, STAGE_W - splitPx, STAGE_H);
    ctx.clip();
    drawPass(1, saturationBoost);
    ctx.restore();
  } else if (localClipBox && v2Factor > 0.001) {
    // 核心卖点：框外 100% 原地不动（v1），仅严格在选框内部重绘 v2 细节！
    opticsInfo = drawPass(0, 0);

    ctx.save();
    ctx.beginPath();
    ctx.rect(localClipBox.x, localClipBox.y, localClipBox.w, localClipBox.h);
    ctx.clip();
    drawPass(v2Factor, saturationBoost);
    ctx.restore();
  } else {
    opticsInfo = drawPass(v2Factor, saturationBoost);
  }

  ctx.restore();

  // 将画幅内的波束选框坐标换算回世界坐标系
  const boxInFrame = opticsInfo.waveSelectionRect;
  const worldSelectionBox = {
    x: rect.x + boxInFrame.x * sx,
    y: rect.y + boxInFrame.y * sy,
    w: boxInFrame.w * sx,
    h: boxInFrame.h * sy,
  };

  return { boxInFrame, worldSelectionBox };
}

export function renderAct04({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  const wbRect = UI_GEOMETRY.workbench.frameRect; // { x: 112, y: 82, w: 1232, h: 693 }

  // 关键阶段进度
  const pPullback = easeEditorialInOut(segProgress(t, 93.2, 96.8));
  const pChrome = easeEditorialOut(segProgress(t, 94.0, 97.2));
  const pFocusPush = easeEditorialInOut(segProgress(t, 100.0, 101.8));
  const pFocusRelease = easeEditorialInOut(segProgress(t, 118.4, 120.4));
  const pBracketSnap = springProgress(segProgress(t, 101.6, 102.9), 0.55, 0.78, 18);
  const pBracketOff = easeEditorialInOut(segProgress(t, 123.3, 124.2));
  const pRipple = segProgress(t, 115.2, 116.5); // 严格框内 0.9s-1.3s 暖杏水墨涟漪
  const pV2Reveal = easeEditorialOut(segProgress(t, 115.5, 116.8));
  const pVerFlip = segProgress(t, 117.3, 118.0);
  const pCompareIn = easeEditorialOut(segProgress(t, 124.0, 124.7));
  const pCompareOut = easeEditorialInOut(segProgress(t, 128.4, 129.1));
  const pTimelineZoom =
    easeEditorialInOut(segProgress(t, 129.3, 130.3)) *
    (1 - easeEditorialInOut(segProgress(t, 132.4, 133.4)));
  const pKfNudge = springProgress(segProgress(t, 130.4, 132.0), 0.62, 0.78, 17);
  const pSatBoost = easeEditorialOut(segProgress(t, 133.8, 135.8));
  const pExportMove = easeEditorialInOut(segProgress(t, 136.8, 138.8));

  // 1. 摄像机虚实推拉（拒绝僵硬大屏录屏：全貌 3s -> 1.15x 聚焦精修 -> 回全貌 -> 时间轴微推 -> 归位）
  const focusAmt = pFocusPush * (1 - pFocusRelease);
  let camZoom = 1.0 + focusAmt * 0.14 + pTimelineZoom * 0.14;
  let camX =
    STAGE_W * 0.5 +
    focusAmt * 110 +
    pTimelineZoom * -120;
  let camY =
    STAGE_H * 0.5 +
    focusAmt * 20 +
    pTimelineZoom * 145;

  camera.set({ x: camX, y: camY, zoom: camZoom });

  // 2. 暖纸桌面底色
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 0.75,
    amberGlow: 0.85,
    dotGridAlpha: 0.02,
  });

  // 3. 当前视频画幅矩形（从 100% 全屏平滑收缩到 64.2% 工作台画幅窗）
  const curFrameRect = {
    x: lerp(0, wbRect.x, pPullback),
    y: lerp(0, wbRect.y, pPullback),
    w: lerp(STAGE_W, wbRect.w, pPullback),
    h: lerp(STAGE_H, wbRect.h, pPullback),
  };

  // 描图纸对比竖线位置（124.2 – 128.5s：先右扫再左扫，差异一目了然）
  const compareActive = t >= 124.0 && t <= 129.1;
  let compareNormX = null;
  if (compareActive) {
    const u1 = easeEditorialInOut(segProgress(t, 124.3, 126.4));
    const u2 = easeEditorialInOut(segProgress(t, 126.6, 128.5));
    compareNormX = t < 126.5 ? lerp(0.18, 0.86, u1) : lerp(0.86, 0.24, u2);
  }

  // 选框内部的真实局部修订进度
  const localV2 = t >= 115.5 ? pV2Reveal : 0;
  // 彩虹微动时间（在精修审视期轻盈呼吸，时间轴拨动时随节点轻快响应）
  const waveTime = 92.0 + (t - 92.0) * 0.45 + pKfNudge * 1.6;

  // 4. Layer 1 绘制实时彩虹预览画面（与 Layer 2 Workbench 画幅孔严丝合缝）
  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  // 先算出标准选框区域（供框内裁剪用）
  const previewLocalBox = { x: 690, y: 318, w: 720, h: 465 };

  const { worldSelectionBox } = drawRainbowInRect(worldCtx, curFrameRect, {
    t: waveTime,
    v2Factor: localV2,
    saturationBoost: pSatBoost,
    localClipBox: t < 124.0 ? previewLocalBox : null,
    compareSplitNormX: compareActive ? compareNormX : null,
  });

  // 如果处于局部精修（102s-124s），按精确画幅内选框映射世界选框
  const activeSelectionWorld = {
    x: curFrameRect.x + (previewLocalBox.x / STAGE_W) * curFrameRect.w,
    y: curFrameRect.y + (previewLocalBox.y / STAGE_H) * curFrameRect.h,
    w: (previewLocalBox.w / STAGE_W) * curFrameRect.w,
    h: (previewLocalBox.h / STAGE_H) * curFrameRect.h,
  };

  worldCtx.restore();

  // 5. Layer 2 真实前端 Workbench 状态同步
  if (pChrome > 0.01) {
    const revChars = Math.floor(segProgress(t, 107.4, 113.8) * REV_PROMPT.length + 0.001);
    const revTyped = t < 114.6 ? REV_PROMPT.slice(0, revChars) : "";
    const isV2 = t >= 117.65;
    const playheadPct = lerp(66, 75, pKfNudge);
    const kfNodePct = lerp(44, 58, pKfNudge);

    const mins = "01";
    const secs = String(Math.floor(lerp(36, 44, pKfNudge))).padStart(2, "0");

    ui.renderWorkbench({
      visible: true,
      alpha: 1,
      chromeReveal: pChrome,
      version: isV2 ? "v2" : "v1",
      versionFlip: pVerFlip,
      selected: t >= 102.0 && t < 137.0,
      inspectorAlpha:
        easeEditorialOut(segProgress(t, 102.4, 103.6)) *
        (1 - easeEditorialInOut(segProgress(t, 136.5, 137.6))),
      inputChip: t >= 104.2 && t < 114.6,
      inputText: revTyped,
      inputCaret: t >= 107.0 && t < 114.4 && Math.sin(t * 7.5) > -0.3,
      inputFocused: t >= 106.8 && t < 114.7,
      sendPressed: t >= 114.55 && t < 115.05,
      showUserMsg: t >= 114.65,
      showAiDoneMsg: t >= 117.7,
      playheadPct,
      kfNodePct,
      timeCode: `${mins}:${secs} / 02:45`,
      exportPressed: t >= 138.8 && t < 139.5,
      statusText: isV2
        ? "v2 局部精修已生效：仅更新选中对象，其余画面 100% 保持原样。"
        : "选择框仅用于编辑定位，不进入最终导出画面。",
    });
  }

  // 6. Layer 3 Overlay：柔焦遮罩 + 框内暖杏水墨涟漪 + 描图纸对比竖线 + 「棱片」主角
  const selScreen = camera.worldRectToScreen(activeSelectionWorld);

  // 温和降焦蒙版（仅限工作台左侧视频画幅内压暗未选中区，保持右侧 Co-Director 输入区清晰明亮！）
  if (focusAmt > 0.02 && t < 118.6) {
    const dim = focusAmt * 0.14 * (1 - easeEditorialOut(segProgress(t, 117.6, 118.6)));
    const frameScreen = camera.worldRectToScreen(curFrameRect);
    overlayCtx.save();
    roundRectPath(overlayCtx, frameScreen.x, frameScreen.y, frameScreen.w, frameScreen.h, 12);
    overlayCtx.clip();
    drawFocusMask(
      overlayCtx,
      { active: true, rect: selScreen, dimAlpha: dim, radius: 10 },
      STAGE_W,
      STAGE_H
    );
    overlayCtx.restore();
  }

  // 框内暖杏水墨纸纹涟漪（严格裁切在 selScreen 选框内，0.9s 焕新，零转圈 Loading！）
  if (pRipple > 0.005 && pRipple < 0.995) {
    drawBoxedInkRipple(overlayCtx, selScreen, pRipple, { alpha: 1 });
  }

  // 选框咬合瞬间的磁吸卡尺微标签与扩散环（强化“外科手术级局部精准锁定”）
  if (pBracketSnap > 0.25 && pBracketOff < 0.85) {
    const tagA = clamp(Math.min(1, (pBracketSnap - 0.25) * 2) * (1 - pBracketOff));
    overlayCtx.save();
    overlayCtx.globalAlpha = tagA;
    // 顶部精细尺寸卡尺标签
    drawPaperCard(overlayCtx, selScreen.x, selScreen.y - 34, 248, 28, {
      radius: 14,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: rgba(COLORS.brandTeal, 0.48),
      lineWidth: 1.2,
      shadowBlur: 10,
      shadowOffsetY: 3,
    });
    overlayCtx.fillStyle = COLORS.brandTeal;
    overlayCtx.beginPath();
    overlayCtx.arc(selScreen.x + 14, selScreen.y - 20, 4, 0, Math.PI * 2);
    overlayCtx.fill();
    overlayCtx.font = `600 11.5px ${FONTS.mono}`;
    overlayCtx.fillStyle = COLORS.brandTealDark;
    overlayCtx.textBaseline = "middle";
    overlayCtx.fillText("prism-spectrum-waves · 局部锁定", selScreen.x + 26, selScreen.y - 20);

    // 咬合瞬间扩散一次的细腻青绿冲击波环
    const snapWave = segProgress(t, 101.9, 103.1);
    if (snapWave > 0.01 && snapWave < 0.99) {
      const pad = lerp(0, 32, easeEditorialOut(snapWave));
      overlayCtx.strokeStyle = rgba(COLORS.brandTeal, (1 - snapWave) * 0.55);
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(selScreen.x - pad, selScreen.y - pad, selScreen.w + pad * 2, selScreen.h + pad * 2);
    }
    overlayCtx.restore();
  }

  // 描图纸对比竖线（124.0 – 129.1s）
  if (compareActive) {
    const cAlpha = pCompareIn * (1 - pCompareOut);
    const frameScreen = camera.worldRectToScreen(curFrameRect);
    const lineX = frameScreen.x + compareNormX * frameScreen.w;

    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(cAlpha);

    // 半透明硫酸描图纸边缘柔影
    const sheetGrad = overlayCtx.createLinearGradient(lineX - 42, 0, lineX, 0);
    sheetGrad.addColorStop(0, "rgba(255, 253, 249, 0)");
    sheetGrad.addColorStop(1, "rgba(255, 253, 249, 0.36)");
    overlayCtx.fillStyle = sheetGrad;
    overlayCtx.fillRect(lineX - 42, frameScreen.y, 42, frameScreen.h);

    // 刊物精细对比竖线
    overlayCtx.strokeStyle = COLORS.brandTeal;
    overlayCtx.lineWidth = 2.6;
    overlayCtx.beginPath();
    overlayCtx.moveTo(lineX, frameScreen.y);
    overlayCtx.lineTo(lineX, frameScreen.y + frameScreen.h);
    overlayCtx.stroke();

    // 左右 v1 / v2 硫酸纸小标签
    const drawBadge = (bx, text, isV2Badge) => {
      drawPaperCard(overlayCtx, bx, frameScreen.y + 22, 108, 34, {
        radius: 17,
        fill: isV2Badge ? "rgba(254, 244, 228, 0.95)" : "rgba(255, 253, 249, 0.92)",
        stroke: isV2Badge ? rgba(COLORS.brandAmber, 0.6) : COLORS.inkHairlineStrong,
        lineWidth: 1.2,
        shadowBlur: 10,
        shadowOffsetY: 3,
      });
      overlayCtx.font = `600 13px ${FONTS.mono}`;
      overlayCtx.fillStyle = isV2Badge ? "#9D5614" : COLORS.inkSecondary;
      overlayCtx.textAlign = "center";
      overlayCtx.textBaseline = "middle";
      overlayCtx.fillText(text, bx + 54, frameScreen.y + 39);
    };
    if (lineX - frameScreen.x > 130) drawBadge(lineX - 124, "v1 初稿", false);
    if (frameScreen.x + frameScreen.w - lineX > 130) drawBadge(lineX + 16, "v2 精修", true);

    // 竖线中点微棱标
    overlayCtx.fillStyle = "#FFFDF9";
    overlayCtx.strokeStyle = COLORS.brandTeal;
    overlayCtx.lineWidth = 2.4;
    overlayCtx.beginPath();
    overlayCtx.arc(lineX, frameScreen.y + frameScreen.h * 0.5, 13, 0, Math.PI * 2);
    overlayCtx.fill();
    overlayCtx.stroke();
    overlayCtx.fillStyle = COLORS.brandAmber;
    overlayCtx.beginPath();
    overlayCtx.arc(lineX, frameScreen.y + frameScreen.h * 0.5, 4, 0, Math.PI * 2);
    overlayCtx.fill();

    overlayCtx.restore();
  }

  // 色带通透度微调浮标（133.8 – 136.5s）
  if (t >= 133.6 && t <= 136.7) {
    const a =
      easeEditorialOut(segProgress(t, 133.6, 134.2)) *
      (1 - easeEditorialInOut(segProgress(t, 135.9, 136.7)));
    const pChip = camera.worldToScreen(curFrameRect.x + 860, curFrameRect.y + 220);
    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(a);
    drawPaperCard(overlayCtx, pChip.x - 102, pChip.y - 22, 204, 44, {
      radius: 22,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: rgba(COLORS.brandAmber, 0.55),
      lineWidth: 1.4,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    overlayCtx.font = `600 14px ${FONTS.mono}`;
    overlayCtx.fillStyle = "#9D5614";
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";
    const pct = Math.round(pSatBoost * 18);
    overlayCtx.fillText(`色带通透度 +${pct}%`, pChip.x, pChip.y);
    overlayCtx.restore();
  }

  // 7. 顶层「棱片」主角路径与 BRACKET 状态机
  const selCenterW = {
    x: activeSelectionWorld.x + activeSelectionWorld.w * 0.5,
    y: activeSelectionWorld.y + activeSelectionWorld.h * 0.5,
  };
  const expBtn = UI_GEOMETRY.workbench.exportBtnCenter;
  const tlNode = UI_GEOMETRY.workbench.timelineNodeCenter;

  const flightPath = (time) => {
    if (time < 93.4) {
      // 刹车悬停、微微歪头凝视红紫波束区
      return { x: 1080, y: 460 + Math.sin(time * 3) * 6 };
    }
    if (time < 97.2) {
      // 匀速向后退飞，牵引画面退入工作台
      const u = easeEditorialInOut(segProgress(time, 93.4, 97.2));
      return bezierPoint(
        { x: 1080, y: 460 },
        { x: 1180, y: 310 },
        { x: 1280, y: 240 },
        { x: 1210, y: 210 },
        u
      );
    }
    if (time < 101.6) {
      // 巡航俯瞰真实工作台全貌，随后俯冲向红紫波束交汇区
      const u = easeEditorialInOut(segProgress(time, 99.8, 101.6));
      return bezierPoint(
        { x: 1210, y: 210 },
        { x: 1120, y: 260 },
        { x: selCenterW.x + 80, y: selCenterW.y - 120 },
        selCenterW,
        u
      );
    }
    if (time < 124.2) {
      // 锁定在选框位置（BRACKET 态）
      return selCenterW;
    }
    if (time < 129.1) {
      // 描图纸对比期隐藏在竖线中点
      const curX = curFrameRect.x + (compareNormX ?? 0.5) * curFrameRect.w;
      return { x: curX, y: curFrameRect.y + curFrameRect.h * 0.5 };
    }
    if (time < 133.2) {
      // 微调一：飞向底部时间轴拨动橙色关键帧节点
      const uIn = easeEditorialInOut(segProgress(time, 129.1, 130.4));
      const uNudge = springProgress(segProgress(time, 130.4, 132.0), 0.62, 0.78, 17);
      if (time < 130.4) {
        return bezierPoint(
          { x: curFrameRect.x + curFrameRect.w * 0.3, y: curFrameRect.y + curFrameRect.h * 0.5 },
          { x: 740, y: 740 },
          { x: tlNode.x - 40, y: tlNode.y - 90 },
          { x: tlNode.x - 36, y: tlNode.y - 26 },
          uIn
        );
      }
      return {
        x: lerp(tlNode.x - 36, tlNode.x + 88, uNudge),
        y: tlNode.y - 26,
      };
    }
    if (time < 136.8) {
      // 微调二：轻拂色带提升通透度
      const u = easeEditorialInOut(segProgress(time, 133.2, 135.8));
      return bezierPoint(
        { x: tlNode.x + 88, y: tlNode.y - 26 },
        { x: 980, y: 620 },
        { x: 860, y: 420 },
        { x: 1080, y: 390 },
        u
      );
    }
    // 136.8 – 140.0：衔接机关 ③，飞落右上角「导出 MP4」轻点后化作流光弧线掠向左缘展开第五幕标尺！
    if (time < 139.25) {
      const u = easeEditorialInOut(segProgress(time, 136.8, 138.8));
      const p = bezierPoint(
        { x: 1080, y: 390 },
        { x: 1420, y: 260 },
        { x: expBtn.x - 90, y: expBtn.y + 90 },
        { x: expBtn.x - 8, y: expBtn.y + 8 },
        u
      );
      const press = time >= 138.8 && time < 139.2 ? 6 : 0;
      return { x: p.x, y: p.y + press };
    }
    const uFlyLeft = easeEditorialInOut(segProgress(time, 139.25, 140.0));
    return bezierPoint(
      { x: expBtn.x - 8, y: expBtn.y + 8 },
      { x: 1200, y: 90 },
      { x: 460, y: 180 },
      { x: 0, y: 540 },
      uFlyLeft
    );
  };

  const posW = flightPath(t);
  const posS = camera.worldToScreen(posW.x, posW.y);
  const trailW = sampleTrailFromPath(flightPath, t, 0.48, 20);
  const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

  const bracketBlend = clamp(pBracketSnap * (1 - pBracketOff));
  const hideForCompareLine = compareActive ? 1 - pCompareIn * (1 - pCompareOut) : 1;

  if (hideForCompareLine > 0.02) {
    // 92s 精确承接第三幕尺寸 38 -> 退镜时柔和缩放至 34；139.2–140.0s 轻点导出后化作流光滑向第五幕左缘标尺
    const startSize = lerp(38, 34, pPullback);
    const exportVanish = 1 - easeEditorialInOut(segProgress(t, 139.35, 140.0));
    drawPrismFold(overlayCtx, {
      x: posS.x,
      y: posS.y,
      mode: bracketBlend > 0.05 ? "BRACKET" : "GLIDE",
      size: startSize * camera.zoom,
      angle: lerp(0.16, 0, easeEditorialOut(segProgress(t, 92.8, 94.0))),
      alpha: hideForCompareLine * exportVanish,
      t,
      bracketBlend,
      bracketRect: selScreen,
      bracketPulse: pRipple > 0 && pRipple < 0.55 ? pRipple / 0.55 : 0,
      coreGlow: Math.max(
        pRipple > 0 && pRipple < 1 ? 1 : 0,
        t >= 138.7 ? 0.95 : 0.25
      ),
      trail: trailS,
      trailAlpha: bracketBlend < 0.2 ? 0.8 : 0,
    });
  }
}
