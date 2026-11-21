/*
 * 第一幕：破纸而出与悬念反转（0:00 – 0:22）
 * 0:00 – 0:06  极致的静与枯燥（传统灰度讲义 + 细线三角）
 * 0:06 – 0:14  立体书式苏醒（棱片探角撬起三棱镜 + 午后斜光 + 7 股水彩波动彩虹）
 * 0:14 – 0:19.6 反套路留存钩子（棱片 BRACKET 捏改紫光，其余六道纹丝不动）
 * 0:19.6 – 0:22 衔接机关 ①（彩虹倒卷凝聚为暖白细线，躺平落位为真实输入框光标）
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
import { drawPaperBase, roundRectPath } from "../core/paper.js";
import { drawPrismFold, evaluateFlight, sampleTrailFromPath } from "../entities/prismFold.js";
import { drawRainbowOptics } from "../entities/rainbowOptics.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

/**
 * 绘制前 6 秒传统讲义静态文字与页边细线
 */
function drawStaticHandout(ctx, alpha, slideLeftPx, dotShake = 0) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(-slideLeftPx, 0);

  // 刊物/讲义传统细页框与页眉页码
  ctx.strokeStyle = "rgba(28, 42, 48, 0.10)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(130, 108, 1660, 864);

  ctx.font = `500 14px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.62)";
  ctx.fillText("CHAPTER 04 · GEOMETRICAL OPTICS", 174, 152);
  ctx.textAlign = "right";
  ctx.fillText("P. 142", 1746, 152);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(28, 42, 48, 0.12)";
  ctx.beginPath();
  ctx.moveTo(174, 174);
  ctx.lineTo(1746, 174);
  ctx.stroke();

  // 左侧呆板灰度文字
  const lx = 218;
  ctx.font = `600 40px ${FONTS.serif}`;
  ctx.fillStyle = "#525D62";
  ctx.fillText("光的色散", lx, 344);

  ctx.strokeStyle = "rgba(82, 93, 98, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lx, 372);
  ctx.lineTo(lx + 168, 372);
  ctx.stroke();

  const lines = [
    "复色光通过三棱镜分解为单色光的现象，",
    "称为光的色散。由于同一种透明介质对不同",
    "频率单色光的折射率不同，红光偏折最小，",
    "紫光偏折最大，因而在光屏上形成彩色光带",
  ];

  ctx.font = `400 24px ${FONTS.serif}`;
  ctx.fillStyle = "#6F7B80";
  lines.forEach((line, idx) => {
    ctx.fillText(line, lx, 438 + idx * 48);
  });

  // 末行句号（在 5.6s 时轻轻颤动，棱片从此缝隙钻出）
  const lastW = ctx.measureText(lines[3]).width;
  const dotX = lx + lastW + 10 + Math.sin(dotShake * 38) * 3.5 * clamp(dotShake);
  const dotY = 438 + 3 * 48 + Math.cos(dotShake * 44) * 2.2 * clamp(dotShake);
  ctx.fillStyle = dotShake > 0.1 ? COLORS.brandTeal : "#6F7B80";
  ctx.fillText("。", dotX - 8, dotY);

  // 底部图注
  ctx.font = `400 15px ${FONTS.sans}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.58)";
  ctx.textAlign = "center";
  ctx.fillText("图 4-1  平面三棱镜示意图（静态）", 1250, 770);
  ctx.textAlign = "left";

  ctx.restore();
  return { dotX, dotY };
}

export function renderAct01({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();

  // 各子镜头进度
  const pIntroCam = easeEditorialOut(segProgress(t, 0.0, 5.4));
  const pDotTremble = segProgress(t, 5.4, 6.2);
  const pPrismPeek = easeEditorialOut(segProgress(t, 5.9, 7.1));
  const pPopup = springProgress(segProgress(t, 7.2, 8.9), 0.72, 0.76, 17);
  const pHandoutOut = easeEditorialInOut(segProgress(t, 7.1, 8.8));
  const pBeam = easeEditorialOut(segProgress(t, 8.3, 9.6));
  const pDispersion = easeEditorialOut(segProgress(t, 9.0, 12.6));
  const pHookMove = easeEditorialInOut(segProgress(t, 14.0, 15.2));
  const pBracketOpen = springProgress(segProgress(t, 14.9, 15.9), 0.52, 0.78, 18);
  const pVioletTweak = springProgress(segProgress(t, 16.0, 18.0), 0.65, 0.76, 16);
  const pBracketClose = easeEditorialInOut(segProgress(t, 18.8, 19.6));
  const pRewind = easeEditorialInOut(segProgress(t, 19.6, 21.1));
  const pCursorMorph = easeEditorialInOut(segProgress(t, 20.8, 22.0));

  // 摄像机：开场微距俯拍 -> 立体书展开回归全景 -> 紫光特写轻推 -> 回归光标对齐
  const camZoom =
    lerp(1.06, 1.0, pIntroCam) +
    0.06 * Math.sin(pHookMove * Math.PI * 0.5) * (1 - pRewind) -
    0.0;
  const camX = lerp(960, 1020, pHookMove * (1 - pRewind));
  const camY = lerp(540, 575, pHookMove * (1 - pRewind));
  camera.set({ x: camX, y: camY, zoom: camZoom });

  // 1. 底层暖纸画桌
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: lerp(0.32, 1.0, pPopup),
    amberGlow: lerp(0.25, 1.0, pBeam),
    dotGridAlpha: lerp(0.015, 0.03, pPopup),
  });

  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  // 2. 传统静态讲义（随立体书撑起柔和退隐）
  const handoutAlpha = 1 - pHandoutOut;
  const dotPos = drawStaticHandout(
    worldCtx,
    handoutAlpha,
    pHandoutOut * 140,
    pDotTremble
  ) || { dotX: 702, dotY: 582 };

  // 3. 三棱镜与暖纸水彩彩虹（从右侧静态灰三角无缝移入居中黄金构图点）
  const prismCx = lerp(1250, 740, easeEditorialInOut(segProgress(t, 7.2, 9.2)));
  const prismCy = lerp(550, 548, easeEditorialInOut(segProgress(t, 7.2, 9.2)));
  const prismSize = lerp(220, 265, clamp(pPopup));

  // 14.0s 钩子定格感：波列时间略放缓，突出“你可以伸手拨动”的定格张力
  const waveT =
    t < 14.0
      ? t
      : t < 19.6
        ? 14.0 + (t - 14.0) * 0.18
        : 14.0 + 5.6 * 0.18 + (t - 19.6);

  // 立体书展开瞬间纸页折痕压线
  if (pPopup > 0.02 && pPopup < 0.99) {
    worldCtx.save();
    worldCtx.globalAlpha = (1 - Math.abs(pPopup - 0.5) * 2) * 0.35;
    worldCtx.strokeStyle = COLORS.inkHairlineStrong;
    worldCtx.lineWidth = 1.4;
    worldCtx.setLineDash([8, 6]);
    worldCtx.beginPath();
    worldCtx.moveTo(prismCx - 240, prismCy + prismSize * 0.44);
    worldCtx.lineTo(prismCx + 240, prismCy + prismSize * 0.44);
    worldCtx.stroke();
    worldCtx.restore();
  }

  const opticsAlpha = 1 - easeEditorialOut(segProgress(t, 20.7, 21.4));
  const optics = drawRainbowOptics(worldCtx, {
    cx: prismCx,
    cy: prismCy,
    size: prismSize,
    t: waveT,
    popup: clamp(pPopup, 0, 1.05),
    beamProgress: pBeam,
    dispersionProgress: pDispersion,
    rewindProgress: pRewind,
    violetTweak: pVioletTweak * (1 - pRewind),
    alpha: opticsAlpha,
    styleId: "paper-editorial",
  });

  // 4. 衔接机关 ①：彩虹倒卷凝聚为一根暖白/青绿细光线 -> 平移落位到第二幕真实输入框光标 (434, 404)
  if (pRewind > 0.42) {
    const lineIn = easeEditorialOut(segProgress(t, 20.3, 21.0));
    const target = UI_GEOMETRY.composer.cursorStart; // { x: 434, y: 404 }
    const cxLine = lerp(prismCx, target.x, pCursorMorph);
    const cyLine = lerp(prismCy - 18, target.y, pCursorMorph);
    const len = lerp(260, 34, pCursorMorph);
    const rot = lerp(0.18, Math.PI * 0.5, pCursorMorph); // 从斜光线立正为竖直光标！
    const thick = lerp(5.0, 2.6, pCursorMorph);

    worldCtx.save();
    worldCtx.translate(cxLine, cyLine);
    worldCtx.rotate(rot);
    worldCtx.globalAlpha = lineIn;

    // 柔光尾晕
    if (pCursorMorph < 0.92) {
      const g = worldCtx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
      g.addColorStop(0, rgba(COLORS.brandAmber, 0));
      g.addColorStop(0.5, rgba(COLORS.brandAmber, 0.45 * (1 - pCursorMorph)));
      g.addColorStop(1, rgba(COLORS.brandTeal, 0));
      worldCtx.strokeStyle = g;
      worldCtx.lineWidth = 18 * (1 - pCursorMorph * 0.7);
      worldCtx.lineCap = "round";
      worldCtx.beginPath();
      worldCtx.moveTo(-len * 0.5, 0);
      worldCtx.lineTo(len * 0.5, 0);
      worldCtx.stroke();
    }

    // 核心光线 -> 竖直闪烁光标
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
  }

  worldCtx.restore();

  // 5. 顶层「棱片」主角路径与状态机（世界坐标映射到屏幕 Overlay）
  if (t >= 5.85) {
    const flightPath = (time) => {
      if (time < 7.2) {
        // 从句号缝隙探出，弧线滑向静态灰三角底边轻碰两下
        const u = segProgress(time, 5.85, 7.2);
        const p = bezierPoint(
          { x: dotPos.dotX + 6, y: dotPos.dotY - 6 },
          { x: 920, y: 420 },
          { x: 1120, y: 690 },
          { x: 1210, y: 650 },
          easeEditorialOut(u)
        );
        // 轻敲两下的微颤动作
        const tap = Math.sin(clamp((u - 0.55) / 0.45) * Math.PI * 2) * 10;
        return { x: p.x, y: p.y - Math.abs(tap) };
      }
      if (time < 9.2) {
        // 向上撬起三棱镜，随后优雅绕至棱镜右上方
        const u = segProgress(time, 7.2, 9.2);
        return bezierPoint(
          { x: 1210, y: 650 },
          { x: 1080, y: 310 },
          { x: 960, y: 290 },
          { x: 895, y: 360 },
          easeEditorialInOut(u)
        );
      }
      if (time < 14.0) {
        // 悬停在棱镜旁柔和呼吸观察彩虹绽放
        const u = segProgress(time, 9.2, 14.0);
        return {
          x: 895 + Math.sin(u * Math.PI * 2) * 14,
          y: 360 + Math.cos(u * Math.PI * 2) * 10,
        };
      }
      if (time < 19.6) {
        // 飞向紫光波带中段并执行 BRACKET 捏改
        const u = segProgress(time, 14.0, 15.2);
        const target = optics.violetAnchor;
        return bezierPoint(
          { x: 895, y: 360 },
          { x: 1060, y: 430 },
          { x: target.x - 40, y: target.y - 90 },
          { x: target.x, y: target.y },
          easeEditorialInOut(u)
        );
      }
      // 19.6 - 22.0：松手合拢，伴随倒卷光线优雅飞至第二幕右侧待命点
      const u = segProgress(time, 19.6, 22.0);
      const target = optics.violetAnchor;
      return bezierPoint(
        { x: target.x, y: target.y },
        { x: 940, y: 460 },
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
    const trailW = sampleTrailFromPath(flightPath, t, 0.55, 22);
    const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

    const vAnchorS = camera.worldToScreen(optics.violetAnchor.x, optics.violetAnchor.y);
    const violetBoxS = {
      x: vAnchorS.x - 135,
      y: vAnchorS.y - 62,
      w: 270,
      h: 124,
    };

    const bracketBlend = clamp(pBracketOpen * (1 - pBracketClose));
    const prismBlend =
      t >= 8.8 && t < 14.0
        ? easeEditorialInOut(segProgress(t, 8.8, 9.6)) * (1 - segProgress(t, 13.4, 14.0))
        : 0;

    drawPrismFold(overlayCtx, {
      x: posS.x,
      y: posS.y,
      mode: bracketBlend > 0.05 ? "BRACKET" : prismBlend > 0.5 ? "PRISM" : "GLIDE",
      size: 36 * camera.zoom,
      angle: velAngle,
      alpha: clamp(pPrismPeek * 1.6),
      t,
      prismBlend,
      bracketBlend,
      bracketRect: violetBoxS,
      bracketPulse: pVioletTweak > 0 && pVioletTweak < 0.7 ? Math.sin(pVioletTweak * Math.PI) * 0.5 : 0,
      coreGlow: Math.max(
        prismBlend * 0.85,
        clamp(Math.sin(pVioletTweak * Math.PI) * 0.9),
        pPopup > 0.1 && pPopup < 0.9 ? 0.8 : 0
      ),
      trail: trailS,
      trailAlpha: t > 6.1 ? 0.88 : 0,
    });
  }
}
