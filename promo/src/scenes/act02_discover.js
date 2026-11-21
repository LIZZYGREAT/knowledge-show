/*
 * 第二幕：提问生光与故事骨架（0:22 – 0:52）
 * 0:22 – 0:30  真实创作入口（CreationComposer 逐字键入 + 选择「直观看懂」+ 棱片轻点确认）
 * 0:30 – 0:42  字面意义的“光学拆解”（提问文字射入 PRISM 棱片，色散出 3 股知识线索带 + 翼尖弹飞误区纸签）
 * 0:42 – 0:52  游丝绷直为故事弧线（真实 GraduatedStageBar 刻度尺 -> 拱起叙事张力弧线 -> 衔接机关 ② 划开舞台）
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
import { drawPaperBase, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

const PROMPT_TEXT = "白光经过棱镜，为何散出彩虹？";

const KNOWLEDGE_RIBBONS = [
  {
    color: COLORS.brandAmber,
    endY: 326,
    tag: "不同色光 · 波长各异",
    sub: "红波舒展（680nm）· 紫波紧促（405nm）",
  },
  {
    color: COLORS.brandTeal,
    endY: 536,
    tag: "进入玻璃 · 减速不同",
    sub: "短波在介质中受阻更明显，步幅骤减",
  },
  {
    color: COLORS.brandPeriwinkle,
    endY: 746,
    tag: "速度之差 · 偏折分叉",
    sub: "波前倾斜转弯，七色自然分道扬镳",
  },
];

const ARC_NODES = [
  { x: 340, y: 655, label: "悬念引入", sub: "白光藏着什么？", color: COLORS.brandAmber },
  { x: 740, y: 505, label: "微观波列", sub: "七色并肩入镜", color: COLORS.brandTeal },
  { x: 1140, y: 365, label: "边界分叉", sub: "减速与偏折高潮", color: COLORS.brandPeriwinkle },
  { x: 1560, y: 492, label: "彩虹全貌", sub: "完整光谱舒展", color: COLORS.brandAmber },
];

/**
 * 绘制光学拆解阶段：文字白光束 + 3 股知识线索丝带 + 误区弹飞
 */
function drawOpticalBreakdown(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  const pBeamIn = easeEditorialOut(segProgress(t, 30.3, 32.0));
  const pRibbons = easeEditorialOut(segProgress(t, 31.8, 35.2));
  const pTags = easeEditorialOut(segProgress(t, 33.4, 36.2));
  const pTighten = easeEditorialInOut(segProgress(t, 41.2, 43.4));

  const prismX = lerp(740, 960, pTighten);
  const prismY = lerp(536, 576, pTighten);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 左侧入射文字白光束（整句提问化作光束射入棱片）
  if (pBeamIn > 0.01 && pTighten < 0.85) {
    const beamAlpha = pBeamIn * (1 - pTighten / 0.85);
    const sx = 120;
    const ex = lerp(sx, prismX - 38, pBeamIn);
    const beamGrad = ctx.createLinearGradient(sx, prismY, ex, prismY);
    beamGrad.addColorStop(0, "rgba(255, 252, 245, 0)");
    beamGrad.addColorStop(0.28, "rgba(255, 250, 238, 0.72)");
    beamGrad.addColorStop(1, "rgba(255, 253, 249, 0.96)");

    ctx.save();
    ctx.globalAlpha = beamAlpha;
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 42;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, prismY);
    ctx.lineTo(ex, prismY);
    ctx.stroke();

    // 中央细金白光芯
    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 40, prismY);
    ctx.lineTo(ex, prismY);
    ctx.stroke();

    // 伴随光束的提问衬线字
    ctx.font = `500 25px ${FONTS.serif}`;
    ctx.fillStyle = rgba(COLORS.inkPrimary, 0.86);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(PROMPT_TEXT, lerp(340, 425, pBeamIn), prismY - 38);
    ctx.restore();
  }

  // 2. 右侧 3 股知识线索丝带（在 41.2s 后收束拉直向 GraduatedStageBar 过渡）
  if (pRibbons > 0.01) {
    for (let i = 0; i < KNOWLEDGE_RIBBONS.length; i++) {
      const r = KNOWLEDGE_RIBBONS[i];
      const targetY = lerp(r.endY, 576, pTighten);
      const startX = lerp(prismX + 36, 280, pTighten);
      const endX = lerp(prismX + 36, 1640, pRibbons);

      ctx.save();
      ctx.lineCap = "round";

      // 三股细波浪游丝组成每条知识带
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        const steps = 64;
        for (let k = 0; k <= steps; k++) {
          const u = k / steps;
          const x = lerp(startX, endX, u);
          const baseY = lerp(prismY, targetY, easeEditorialOut(u));
          const wave =
            Math.sin(u * 10 - t * 3.8 + i * 1.4 + s * 0.5) *
            (5.5 + (s === 0 ? 1.5 : 0)) *
            (1 - pTighten * 0.85) *
            Math.sin(u * Math.PI);
          const y = baseY + wave + s * 4.5 * (1 - pTighten * 0.7);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(r.color, s === 0 ? 0.86 : 0.38);
        ctx.lineWidth = s === 0 ? 4.4 : 2.0;
        ctx.stroke();
      }

      // 克制的关键词纸签
      const tagAlpha = pTags * (1 - pTighten * 1.4);
      if (tagAlpha > 0.02) {
        const tx = 1110 + i * 28;
        const ty = targetY - 42;
        ctx.globalAlpha = clamp(tagAlpha);
        drawPaperCard(ctx, tx, ty - 34, 468, 76, {
          radius: 14,
          fill: "rgba(255, 253, 249, 0.94)",
          stroke: rgba(r.color, 0.36),
          lineWidth: 1.4,
          shadowBlur: 18,
          shadowOffsetY: 6,
        });
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(tx + 24, ty + 4, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `600 21px ${FONTS.serif}`;
        ctx.fillStyle = COLORS.inkPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(r.tag, tx + 44, ty - 7);

        ctx.font = `400 14.5px ${FONTS.sans}`;
        ctx.fillStyle = COLORS.inkSecondary;
        ctx.fillText(r.sub, tx + 44, ty + 18);
      }

      ctx.restore();
    }
  }

  // 3. 核验隐喻：漂浮而来的常见误区纸签被「棱片」翼尖干脆弹飞出画幅
  const pMythIn = easeEditorialOut(segProgress(t, 35.4, 37.6));
  const pMythFlick = easeEditorialOut(segProgress(t, 37.8, 39.6));
  if (pMythIn > 0.01 && pMythFlick < 0.99) {
    const mx = lerp(890, 815, pMythIn) + pMythFlick * 1240;
    const my = lerp(120, 352, pMythIn) - Math.sin(pMythFlick * Math.PI) * 260 + pMythFlick * 90;
    const rot = lerp(-0.08, 0.04, pMythIn) + pMythFlick * 2.4;
    const mAlpha = clamp(pMythIn * (1 - Math.max(0, (pMythFlick - 0.55) / 0.45)));

    ctx.save();
    ctx.globalAlpha = mAlpha;
    ctx.translate(mx, my);
    ctx.rotate(rot);

    drawPaperCard(ctx, -182, -38, 364, 76, {
      radius: 13,
      fill: "#F5F1E9",
      stroke: pMythFlick > 0.05 ? "rgba(210, 88, 78, 0.55)" : "rgba(28, 42, 48, 0.22)",
      lineWidth: 1.5,
      shadowBlur: 18,
      shadowOffsetY: 8,
    });

    // 小问号角标
    ctx.fillStyle = pMythFlick > 0.05 ? "#D15349" : COLORS.inkSecondary;
    ctx.beginPath();
    ctx.arc(-148, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 15px ${FONTS.mono}`;
    ctx.fillStyle = "#FFFDF9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pMythFlick > 0.05 ? "✕" : "?", -148, 1);

    ctx.font = `500 19px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "left";
    ctx.fillText("棱镜给白光染了色？", -120, 1);

    // 弹飞瞬间划掉细线
    if (pMythFlick > 0.04) {
      ctx.strokeStyle = "rgba(209, 83, 73, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-124, 1);
      ctx.lineTo(148, 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制叙事张力弧线（从 GraduatedStageBar 平直标尺拱起，并由棱片在波峰划开）
 */
function drawTensionArc(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  const pArch = easeEditorialInOut(segProgress(t, 45.2, 48.2));
  const pSlice = easeEditorialInOut(segProgress(t, 51.0, 52.0));
  const splitY = pSlice * 560; // 幕布向上下舒展退为舞台边界

  ctx.save();
  ctx.globalAlpha = clamp(alpha * (1 - pSlice * 0.85));

  // 采样弧线函数（pArch=0 时为 y=576 的水平刻度线，pArch=1 时拱起为叙事张力曲线）
  const arcY = (x) => {
    const u = clamp((x - 240) / 1440);
    // 用平滑多峰插值经过 4 个节点
    const base = 576;
    const target =
      655 * Math.pow(1 - u, 3) +
      3 * 455 * Math.pow(1 - u, 2) * u +
      3 * 270 * (1 - u) * u * u +
      492 * Math.pow(u, 3);
    return lerp(base, target, pArch);
  };

  // 上下半部随衔接机关 ② 划开
  for (const half of [-1, 1]) {
    ctx.save();
    ctx.translate(0, half * splitY * (half === -1 ? 0.55 : 0.45));

    // 主张力游丝（青绿 -> 湖蓝 -> 暖杏）
    const grad = ctx.createLinearGradient(240, 0, 1680, 0);
    grad.addColorStop(0, COLORS.brandTeal);
    grad.addColorStop(0.55, COLORS.brandPeriwinkle);
    grad.addColorStop(1, COLORS.brandAmber);

    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = lerp(240, 1680, i / 100);
      const y = arcY(x) + (half === 1 ? 6 : 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = half === -1 ? grad : rgba(COLORS.brandTeal, 0.28);
    ctx.lineWidth = half === -1 ? 4.5 : 1.8;
    ctx.lineCap = "round";
    ctx.stroke();

    // 刊物精细刻度线（沿曲线法向生长）
    if (half === -1) {
      for (let k = 0; k <= 36; k++) {
        const x = lerp(240, 1680, k / 36);
        const y = arcY(x);
        const y2 = arcY(x + 4);
        const ang = Math.atan2(y2 - y, 4);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const isMajor = k % 9 === 0;
        const len = isMajor ? 16 : 8;
        ctx.strokeStyle = isMajor ? "rgba(28, 42, 48, 0.36)" : "rgba(28, 42, 48, 0.16)";
        ctx.lineWidth = isMajor ? 1.6 : 1.0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + nx * len, y + ny * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 4 个叙事节奏节点纸标
  const nodeAlpha = easeEditorialOut(segProgress(t, 46.2, 48.8)) * (1 - pSlice);
  if (nodeAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(nodeAlpha);
    for (let i = 0; i < ARC_NODES.length; i++) {
      const n = ARC_NODES[i];
      const ny = arcY(n.x);
      const pulse = 1 + 0.08 * Math.sin(t * 4.2 - i * 1.1);

      // 垂直细引线
      ctx.strokeStyle = rgba(n.color, 0.45);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(n.x, ny);
      ctx.lineTo(n.x, ny - 54);
      ctx.stroke();

      // 节点圆点
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(n.x, ny, 7.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 纸签卡
      drawPaperCard(ctx, n.x - 102, ny - 118, 204, 62, {
        radius: 12,
        fill: "rgba(255, 253, 249, 0.94)",
        stroke: rgba(n.color, 0.32),
        lineWidth: 1.2,
        shadowBlur: 14,
        shadowOffsetY: 5,
      });
      ctx.font = `600 18px ${FONTS.serif}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, ny - 96);

      ctx.font = `400 12.5px ${FONTS.sans}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.fillText(n.sub, n.x, ny - 73);
    }
    ctx.restore();
  }

  // 衔接机关 ②：波峰竖直划开一道柔和青绿光缝
  if (pSlice > 0.01) {
    ctx.save();
    const sx = 1140;
    const slitH = lerp(60, 1080, easeEditorialOut(pSlice));
    const g = ctx.createLinearGradient(sx, 540 - slitH * 0.5, sx, 540 + slitH * 0.5);
    g.addColorStop(0, rgba(COLORS.brandTeal, 0));
    g.addColorStop(0.5, rgba(COLORS.brandTeal, 0.65 * (1 - pSlice * 0.5)));
    g.addColorStop(1, rgba(COLORS.brandPeriwinkle, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(sx, 540 - slitH * 0.5);
    ctx.lineTo(sx, 540 + slitH * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function renderAct02({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();

  // 摄像机柔和推拉（创作页平稳 -> 光学拆解轻微深入 -> 张力弧线舒展）
  const pEnterZoom = easeEditorialOut(segProgress(t, 29.5, 31.4));
  const pArcZoom = easeEditorialInOut(segProgress(t, 41.8, 44.5));
  const camZoom = 1.0 + 0.05 * pEnterZoom * (1 - pArcZoom);
  camera.set({ x: STAGE_W * 0.5, y: STAGE_H * 0.5, zoom: camZoom });

  // 1. 暖白纸底
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 1.0,
    amberGlow: 1.0,
    dotGridAlpha: 0.03,
  });

  // 2. 真实 CreationComposer（22.0 – 30.8s）
  const composerFadeIn = easeEditorialOut(segProgress(t, 22.0, 23.1));
  const composerFadeOut = easeEditorialInOut(segProgress(t, 29.4, 30.8));
  const composerAlpha = composerFadeIn * (1 - composerFadeOut);

  if (composerAlpha > 0.005) {
    const typeProg = segProgress(t, 23.2, 26.6);
    const charCount = Math.floor(typeProg * PROMPT_TEXT.length + 0.001);
    const activeMode = t >= 27.6 ? "visual_explain" : "auto";
    const hoverMode =
      t >= 26.8 && t < 27.2 ? "creative" : t >= 27.2 && t < 27.6 ? "visual_explain" : null;
    const submitPressed = t >= 29.15 && t < 29.55;

    ui.renderComposer({
      visible: true,
      alpha: composerAlpha,
      scale: lerp(0.985, 1.0, composerFadeIn) + composerFadeOut * 0.06,
      typedText: PROMPT_TEXT.slice(0, charCount),
      caretVisible: Math.sin(t * 7.5) > -0.35 && t < 27.0,
      activeMode,
      hoverMode,
      submitPressed,
    });
  }

  // 3. 真实 GraduatedStageBar（42.4 – 46.8s）
  const sbIn = easeEditorialOut(segProgress(t, 42.4, 43.8));
  const sbOut = easeEditorialInOut(segProgress(t, 45.4, 46.9));
  const sbAlpha = sbIn * (1 - sbOut);
  if (sbAlpha > 0.005) {
    ui.renderStageBar({
      visible: true,
      alpha: sbAlpha,
      progress: lerp(0.36, 0.68, easeEditorialOut(segProgress(t, 42.6, 45.6))),
      translateY: lerp(14, -22, sbOut),
    });
  }

  // 4. 底层 Canvas：光学拆解 + 故事张力弧线
  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  const breakdownAlpha =
    easeEditorialOut(segProgress(t, 30.2, 31.4)) *
    (1 - easeEditorialInOut(segProgress(t, 42.8, 44.0)));
  drawOpticalBreakdown(worldCtx, t, breakdownAlpha);

  const arcAlpha = easeEditorialOut(segProgress(t, 44.8, 46.2));
  drawTensionArc(worldCtx, t, arcAlpha);

  worldCtx.restore();

  // 5. 顶层「棱片」主角驱动
  const flightPath = (time) => {
    if (time < 26.6) {
      // 在输入框上方轻盈守候
      const u = segProgress(time, 22.0, 26.6);
      return {
        x: lerp(540, 1020, easeEditorialInOut(u)),
        y: 340 + Math.sin(u * Math.PI * 2) * 14,
      };
    }
    if (time < 28.1) {
      // 滑向「直观看懂」轻点
      const u = segProgress(time, 26.6, 28.1);
      const m = UI_GEOMETRY.composer.modeVisualCenter;
      return bezierPoint(
        { x: 1020, y: 340 },
        { x: 1120, y: 460 },
        { x: m.x + 20, y: m.y - 80 },
        { x: m.x, y: m.y - 10 },
        easeEditorialInOut(u)
      );
    }
    if (time < 29.6) {
      // 飞向「开始探索与创作」按钮并点击
      const u = segProgress(time, 28.1, 29.2);
      const m = UI_GEOMETRY.composer.modeVisualCenter;
      const b = UI_GEOMETRY.composer.submitBtnCenter;
      const p = bezierPoint(
        { x: m.x, y: m.y - 10 },
        { x: 1260, y: 740 },
        { x: b.x - 30, y: b.y - 70 },
        { x: b.x, y: b.y - 8 },
        easeEditorialInOut(u)
      );
      const press = time >= 29.15 && time < 29.48 ? 8 : 0;
      return { x: p.x, y: p.y + press };
    }
    if (time < 31.6) {
      // 潜入画面中左成为 PRISM 棱镜核心
      const u = segProgress(time, 29.6, 31.6);
      const b = UI_GEOMETRY.composer.submitBtnCenter;
      return bezierPoint(
        { x: b.x, y: b.y - 8 },
        { x: 1140, y: 690 },
        { x: 860, y: 560 },
        { x: 740, y: 536 },
        easeEditorialInOut(u)
      );
    }
    if (time < 41.2) {
      // 稳立棱镜态；37.8s 机敏微振上翼弹飞误区纸签
      const flick = Math.sin(clamp(segProgress(time, 37.65, 38.25)) * Math.PI);
      return {
        x: 740 + flick * 22,
        y: 536 - flick * 34,
      };
    }
    if (time < 44.5) {
      // 环绕三股线索丝带轻旋并向右拉直为刻度尺
      const u = segProgress(time, 41.2, 44.5);
      return bezierPoint(
        { x: 740, y: 536 },
        { x: 1160, y: 390 },
        { x: 1380, y: 640 },
        { x: 1280, y: 576 },
        easeEditorialInOut(u)
      );
    }
    if (time < 51.0) {
      // 沿张力弧线攀上最高波峰 (1140, 365)
      const u = segProgress(time, 44.5, 50.8);
      return bezierPoint(
        { x: 1280, y: 576 },
        { x: 640, y: 630 },
        { x: 860, y: 380 },
        { x: 1140, y: 350 },
        easeEditorialInOut(u)
      );
    }
    // 51.0 - 52.0：沿竖直中线向下轻划一刀，幕布展开进入第三幕
    const u = easeEditorialInOut(segProgress(time, 51.0, 52.0));
    return { x: 1140, y: lerp(350, 740, u) };
  };

  const posW = flightPath(t);
  const posAhead = flightPath(Math.min(52.0, t + 0.04));
  const velAngle =
    Math.hypot(posAhead.x - posW.x, posAhead.y - posW.y) > 0.8
      ? Math.atan2(posAhead.y - posW.y, posAhead.x - posW.x) * 0.25
      : 0;

  const prismBlend =
    easeEditorialInOut(segProgress(t, 30.8, 31.7)) *
    (1 - easeEditorialInOut(segProgress(t, 41.0, 41.8)));
  const size = lerp(36, 62, prismBlend);

  const posS = camera.worldToScreen(posW.x, posW.y);
  const trailW = sampleTrailFromPath(flightPath, t, 0.55, 22);
  const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

  drawPrismFold(overlayCtx, {
    x: posS.x,
    y: posS.y,
    mode: prismBlend > 0.5 ? "PRISM" : "GLIDE",
    size: size * camera.zoom,
    angle: t >= 51.0 ? Math.PI * 0.5 : velAngle,
    alpha: 1,
    t,
    prismBlend,
    coreGlow: Math.max(
      prismBlend * 0.95,
      t >= 29.1 && t <= 29.6 ? 0.85 : 0,
      t >= 50.8 ? 0.9 : 0
    ),
    trail: trailS,
    trailAlpha: 1 - prismBlend * 0.85,
  });
}
