/*
 * 第二幕：提问生光与故事骨架（0:22 – 0:52，高定炫技视觉版）
 * 0:22 – 0:30  真实创作入口（CreationComposer + 边缘灵动流纹丝带 + 午后斜阳）
 * 0:30 – 0:42  星盘光学拆解（旋转黄铜星盘环 + 漂浮典籍微卡 + 3 股活态微型插画知识丝带 + 弹飞误区纸屑迸发）
 * 0:42 – 0:52  活态分镜张力弧线（GraduatedStageBar -> 拱起弧线 + 4 张实时动态微缩分镜画窗 -> 衔接机关 ② 划开舞台）
 */

import { COLORS, SPECTRUM, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  rgba,
  easeEditorialOut,
  easeEditorialInOut,
  bezierPoint,
  TAU,
} from "../core/math.js";
import { drawPaperBase, drawPaperCard, roundRectPath } from "../core/paper.js";
import { drawPrismFold, sampleTrailFromPath } from "../entities/prismFold.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawOrigamiConfettiBurst,
  drawStarlightGlint,
  drawEditorialPrintMarks,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

const PROMPT_TEXT = "白光经过棱镜，为何散出彩虹？";

const KNOWLEDGE_RIBBONS = [
  {
    id: "wavelength",
    color: COLORS.brandAmber,
    endY: 286,
    tag: "不同色光 · 波长各异",
    sub: "红波舒展（680nm）· 紫波紧促（405nm）",
  },
  {
    id: "speed",
    color: COLORS.brandTeal,
    endY: 536,
    tag: "进入玻璃 · 减速不同",
    sub: "短波在介质晶格中受阻更显著，步幅骤减",
  },
  {
    id: "refract",
    color: COLORS.brandPeriwinkle,
    endY: 786,
    tag: "速度之差 · 偏折分叉",
    sub: "倾斜波前自然转弯，七色光谱彻底展开",
  },
];

const ARC_NODES = [
  { id: "hook", x: 315, y: 668, label: "01 · 悬念引入", sub: "白光里藏着什么？", color: COLORS.brandAmber },
  { id: "micro", x: 725, y: 505, label: "02 · 微观波列", sub: "七色并肩入镜", color: COLORS.brandTeal },
  { id: "split", x: 1145, y: 365, label: "03 · 边界分叉", sub: "减速与偏折高潮", color: COLORS.brandPeriwinkle },
  { id: "full", x: 1585, y: 492, label: "04 · 彩虹全貌", sub: "完整光谱舒展", color: COLORS.brandAmber },
];

/**
 * 知识卡左侧的实时动态微缩视觉图示（让每张知识线索卡都“活起来”！）
 */
function drawMiniKnowledgeGlyph(ctx, id, cx, cy, t, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = rgba(color, 0.10);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (id === "wavelength") {
    // 红长波 vs 紫短波动态小波形
    ctx.beginPath();
    for (let x = -17; x <= 17; x += 2) {
      const y = -7 + Math.sin(x * 0.22 - t * 4) * 4.5;
      x === -17 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#E56B6F";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    for (let x = -17; x <= 17; x += 1.5) {
      const y = 7 + Math.sin(x * 0.56 - t * 5.2) * 4.2;
      x === -17 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#8E6CBB";
    ctx.lineWidth = 2.0;
    ctx.stroke();
  } else if (id === "speed") {
    // 玻璃竖界 + 一快一慢两颗动态光珠
    ctx.strokeStyle = "rgba(18, 148, 141, 0.45)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 16);
    ctx.stroke();
    const x1 = -14 + ((t * 28) % 28);
    const x2 = -14 + ((t * 16) % 28);
    ctx.fillStyle = "#E56B6F";
    ctx.beginPath();
    ctx.arc(x1, -7, 3.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8E6CBB";
    ctx.beginPath();
    ctx.arc(x2, 7, 3.8, 0, TAU);
    ctx.fill();
  } else {
    // 微型棱镜色散扇
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(7, 10);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.strokeStyle = COLORS.brandPeriwinkle;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ["#E56B6F", "#2A9D8F", "#8E6CBB"].forEach((c, idx) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.lineTo(17, -6 + idx * 7 + Math.sin(t * 4 + idx) * 1.5);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/**
 * 叙事张力弧线上方的活态微缩分镜画窗（每一幕都有实时微动画！）
 */
function drawMiniStoryboardCard(ctx, node, nx, ny, t, alpha) {
  const cw = 236;
  const ch = 152;
  const x0 = nx - cw * 0.5;
  const y0 = ny - ch - 46;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 垂直细引线与节点圆环
  ctx.strokeStyle = rgba(node.color, 0.52);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.lineTo(nx, y0 + ch);
  ctx.stroke();

  drawPaperCard(ctx, x0, y0, cw, ch, {
    radius: 14,
    fill: "rgba(255, 253, 249, 0.96)",
    stroke: rgba(node.color, 0.36),
    lineWidth: 1.4,
    shadowBlur: 20,
    shadowOffsetY: 8,
  });

  // 上半部活态微缩画幅窗（16:9 缩略预览）
  const vx = x0 + 12;
  const vy = y0 + 12;
  const vw = cw - 24;
  const vh = 82;
  ctx.save();
  roundRectPath(ctx, vx, vy, vw, vh, 8);
  ctx.fillStyle = "#F7F3EA";
  ctx.fill();
  ctx.clip();

  if (node.id === "hook") {
    // 迷你立体棱镜与斜阳
    ctx.strokeStyle = "rgba(242, 153, 74, 0.65)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(vx, vy + 24);
    ctx.lineTo(vx + 86, vy + 44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vx + 105, vy + 16);
    ctx.lineTo(vx + 136, vy + 68);
    ctx.lineTo(vx + 74, vy + 68);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fill();
    ctx.strokeStyle = COLORS.brandTeal;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    drawStarlightGlint(ctx, vx + 86, vy + 44, 10, "#FFFFFF", COLORS.brandAmber, 0.9, t);
  } else if (node.id === "micro") {
    // 迷你玻璃边界与 5 色微波动
    ctx.fillStyle = "rgba(218, 240, 238, 0.65)";
    ctx.fillRect(vx + vw * 0.45, vy, vw * 0.55, vh);
    [0, 2, 3, 4, 6].forEach((sIdx, k) => {
      ctx.beginPath();
      for (let px = 0; px <= vw; px += 4) {
        const inGlass = px > vw * 0.45;
        const freq = inGlass ? 0.22 + k * 0.08 : 0.14;
        const slope = inGlass ? (px - vw * 0.45) * (0.04 + k * 0.045) : 0;
        const py = vy + 16 + k * 11 + slope + Math.sin(px * freq - t * 5 + k) * 3.5;
        px === 0 ? ctx.moveTo(vx + px, py) : ctx.lineTo(vx + px, py);
      }
      ctx.strokeStyle = SPECTRUM[sIdx].hex;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    });
  } else if (node.id === "split") {
    // 迷你高潮色散角度扇
    ctx.strokeStyle = "rgba(28, 42, 48, 0.18)";
    ctx.beginPath();
    ctx.arc(vx + 46, vy + 42, 54, -0.3, 0.65);
    ctx.stroke();
    SPECTRUM.forEach((b, i) => {
      const ang = -0.22 + i * 0.13;
      ctx.strokeStyle = b.hex;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(vx + 46, vy + 42);
      ctx.lineTo(vx + 46 + Math.cos(ang) * 145, vy + 42 + Math.sin(ang) * 145);
      ctx.stroke();
    });
  } else {
    // 迷你全景彩虹波带
    SPECTRUM.forEach((b, i) => {
      ctx.beginPath();
      for (let px = 0; px <= vw; px += 5) {
        const py = vy + 12 + i * 9.5 + Math.sin(px * (0.06 + i * 0.016) - t * 4 + i) * 3.6;
        px === 0 ? ctx.moveTo(vx + px, py) : ctx.lineTo(vx + px, py);
      }
      ctx.strokeStyle = b.hex;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });
  }

  ctx.restore();
  ctx.strokeStyle = "rgba(28, 42, 48, 0.10)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, vx, vy, vw, vh, 8);
  ctx.stroke();

  // 下半部标题与摘要
  ctx.font = `600 16px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(node.label, x0 + 14, y0 + 112);

  ctx.font = `400 12.5px ${FONTS.sans}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.fillText(node.sub, x0 + 14, y0 + 134);

  ctx.restore();
}

/**
 * 绘制星盘光学拆解阶段（30.2s – 44.0s）
 */
function drawOpticalBreakdown(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  const pBeamIn = easeEditorialOut(segProgress(t, 30.3, 32.0));
  const pRibbons = easeEditorialOut(segProgress(t, 31.8, 35.0));
  const pTags = easeEditorialOut(segProgress(t, 33.2, 35.8));
  const pTighten = easeEditorialInOut(segProgress(t, 41.2, 43.4));

  const prismX = lerp(710, 960, pTighten);
  const prismY = lerp(536, 576, pTighten);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 棱片背后缓慢旋转的黄铜光学星盘（营造“深度探索与拆解机制”的仪式感）
  drawBrassGoniometer(ctx, prismX, prismY, 225, t * 1.4, {
    alpha: (1 - pTighten) * 0.85,
    reveal: pBeamIn,
    redDeg: -26,
    violetDeg: 26,
    showVernier: false,
  });

  // 2. 左侧入射文字白光束 + 围绕光束漂浮的微型典籍灵感卡片
  if (pBeamIn > 0.01 && pTighten < 0.85) {
    const beamAlpha = pBeamIn * (1 - pTighten / 0.85);
    const sx = 80;
    const ex = lerp(sx, prismX - 42, pBeamIn);
    const beamGrad = ctx.createLinearGradient(sx, prismY, ex, prismY);
    beamGrad.addColorStop(0, "rgba(255, 252, 245, 0)");
    beamGrad.addColorStop(0.25, "rgba(255, 248, 226, 0.78)");
    beamGrad.addColorStop(1, "rgba(255, 253, 249, 0.98)");

    ctx.save();
    ctx.globalAlpha = beamAlpha;
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 48;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, prismY);
    ctx.lineTo(ex, prismY);
    ctx.stroke();

    // 沿白光流向棱片的微光粒
    for (let p = 0; p < 6; p++) {
      const u = (p / 6 + t * 0.35) % 1;
      const px = lerp(sx + 30, ex, u);
      const py = prismY + Math.sin(u * 12 + p) * 6;
      ctx.fillStyle = rgba(COLORS.brandAmber, 0.55 * Math.sin(u * Math.PI));
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, TAU);
      ctx.fill();
    }

    // 提问主标题暖纸飘带
    drawPaperCard(ctx, 138, prismY - 96, 424, 58, {
      radius: 29,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: rgba(COLORS.brandTeal, 0.30),
      lineWidth: 1.4,
      shadowBlur: 18,
      shadowOffsetY: 6,
    });
    ctx.font = `600 24px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkPrimary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(PROMPT_TEXT, 350, prismY - 67);

    // 漂浮的微型研究线索胶囊（视觉丰富感：不喧宾夺主，衬托知识研究深度）
    const notes = [
      { x: 255, y: prismY + 86, text: "1672 · 牛顿双棱镜实验" },
      { x: 430, y: prismY + 148, text: "介质折射率 n(λ) 与相速度" },
    ];
    notes.forEach((n, idx) => {
      const bob = Math.sin(t * 2.1 + idx * 1.9) * 5;
      drawPaperCard(ctx, n.x - 115, n.y - 18 + bob, 230, 36, {
        radius: 18,
        fill: "rgba(255, 253, 249, 0.85)",
        stroke: COLORS.inkHairline,
        lineWidth: 1.1,
        shadowBlur: 10,
        shadowOffsetY: 4,
      });
      ctx.font = `500 13px ${FONTS.sans}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.fillText(n.text, n.x, n.y + bob);
    });
    ctx.restore();
  }

  // 3. 右侧 3 股活态水彩知识丝带 + 嵌入式动态微缩图示卡
  if (pRibbons > 0.01) {
    for (let i = 0; i < KNOWLEDGE_RIBBONS.length; i++) {
      const r = KNOWLEDGE_RIBBONS[i];
      const targetY = lerp(r.endY, 576, pTighten);
      const startX = lerp(prismX + 42, 280, pTighten);
      const endX = lerp(prismX + 42, 1740, pRibbons);

      ctx.save();
      ctx.lineCap = "round";

      // 宽幅水彩柔晕底带
      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const u = k / 64;
        const x = lerp(startX, endX, u);
        const y = lerp(prismY, targetY, easeEditorialOut(u)) + Math.sin(u * 10 - t * 3.8 + i * 1.4) * 5.5 * (1 - pTighten * 0.85) * Math.sin(u * Math.PI);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(r.color, 0.14);
      ctx.lineWidth = 22 * (1 - pTighten * 0.5);
      ctx.stroke();

      // 三股细波浪游丝
      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const u = k / 72;
          const x = lerp(startX, endX, u);
          const baseY = lerp(prismY, targetY, easeEditorialOut(u));
          const wave =
            Math.sin(u * 11 - t * 4.0 + i * 1.4 + s * 0.5) *
            (6.0 + (s === 0 ? 1.5 : 0)) *
            (1 - pTighten * 0.85) *
            Math.sin(u * Math.PI);
          const y = baseY + wave + s * 5.0 * (1 - pTighten * 0.7);
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(r.color, s === 0 ? 0.88 : 0.42);
        ctx.lineWidth = s === 0 ? 4.6 : 2.0;
        ctx.stroke();
      }

      // 沿知识丝带行进的光子流珠
      if (pTighten < 0.65) {
        const beadU = (t * 0.32 + i * 0.33) % 1;
        const bx = lerp(startX, endX, beadU);
        const by = lerp(prismY, targetY, easeEditorialOut(beadU));
        ctx.fillStyle = "#FFFDF9";
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }

      // 活态知识线索卡（带动态微型图标 + 核验勾标）
      const tagAlpha = pTags * (1 - pTighten * 1.4);
      if (tagAlpha > 0.02) {
        const tx = 1090 + i * 24;
        const ty = targetY - 46;
        ctx.globalAlpha = clamp(tagAlpha);
        drawPaperCard(ctx, tx, ty - 44, 520, 92, {
          radius: 16,
          fill: "rgba(255, 253, 249, 0.96)",
          stroke: rgba(r.color, 0.40),
          lineWidth: 1.5,
          shadowBlur: 22,
          shadowOffsetY: 8,
        });

        drawMiniKnowledgeGlyph(ctx, r.id, tx + 44, ty + 2, t, r.color);

        ctx.font = `600 22px ${FONTS.serif}`;
        ctx.fillStyle = COLORS.inkPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(r.tag, tx + 86, ty - 11);

        ctx.font = `400 14.5px ${FONTS.sans}`;
        ctx.fillStyle = COLORS.inkSecondary;
        ctx.fillText(r.sub, tx + 86, ty + 18);

        // 右上角极克制核验徽标
        ctx.font = `600 11px ${FONTS.mono}`;
        ctx.fillStyle = COLORS.brandTealDark;
        ctx.textAlign = "right";
        ctx.fillText("✓ VERIFIED", tx + 502, ty - 22);
      }

      ctx.restore();
    }
  }

  // 4. 核验隐喻：常见误区纸签被「棱片」翼尖干脆弹飞 + 折纸彩屑迸发！
  const pMythIn = easeEditorialOut(segProgress(t, 35.2, 37.6));
  const pMythFlick = easeEditorialOut(segProgress(t, 37.8, 39.7));
  if (pMythFlick > 0.01 && pMythFlick < 0.95) {
    drawOrigamiConfettiBurst(ctx, 815, 345, pMythFlick, {
      seed: 37801,
      count: 22,
      spread: 240,
      alpha: 0.9,
    });
  }
  if (pMythIn > 0.01 && pMythFlick < 0.99) {
    const mx = lerp(890, 810, pMythIn) + pMythFlick * 1280;
    const my = lerp(110, 340, pMythIn) - Math.sin(pMythFlick * Math.PI) * 280 + pMythFlick * 95;
    const rot = lerp(-0.08, 0.04, pMythIn) + pMythFlick * 2.8;
    const mAlpha = clamp(pMythIn * (1 - Math.max(0, (pMythFlick - 0.55) / 0.45)));

    ctx.save();
    ctx.globalAlpha = mAlpha;
    ctx.translate(mx, my);
    ctx.rotate(rot);

    drawPaperCard(ctx, -186, -40, 372, 80, {
      radius: 14,
      fill: "#F5F0E6",
      stroke: pMythFlick > 0.05 ? "rgba(210, 88, 78, 0.65)" : "rgba(28, 42, 48, 0.24)",
      lineWidth: 1.6,
      shadowBlur: 20,
      shadowOffsetY: 9,
    });

    ctx.fillStyle = pMythFlick > 0.05 ? "#D15349" : COLORS.inkSecondary;
    ctx.beginPath();
    ctx.arc(-150, 0, 15, 0, TAU);
    ctx.fill();
    ctx.font = `700 15px ${FONTS.mono}`;
    ctx.fillStyle = "#FFFDF9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pMythFlick > 0.05 ? "✕" : "?", -150, 1);

    ctx.font = `500 20px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "left";
    ctx.fillText("棱镜给白光染了色？", -122, 1);

    if (pMythFlick > 0.04) {
      ctx.strokeStyle = "rgba(209, 83, 73, 0.78)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-126, 1);
      ctx.lineTo(154, 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制活态叙事张力弧线 + 4 张实时微缩分镜画窗（44.8s – 52.0s）
 */
function drawTensionArc(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  const pArch = easeEditorialInOut(segProgress(t, 45.2, 48.0));
  const pSlice = easeEditorialInOut(segProgress(t, 51.0, 52.0));
  const splitY = pSlice * 560;

  ctx.save();
  ctx.globalAlpha = clamp(alpha * (1 - pSlice * 0.85));

  const arcY = (x) => {
    const u = clamp((x - 190) / 1540);
    const base = 588;
    const target =
      678 * Math.pow(1 - u, 3) +
      3 * 455 * Math.pow(1 - u, 2) * u +
      3 * 270 * (1 - u) * u * u +
      498 * Math.pow(u, 3);
    return lerp(base, target, pArch);
  };

  // 背景极轻刊物弧形辅助坐标网（呼应叙事节奏编排）
  ctx.save();
  ctx.globalAlpha = 0.25 * pArch * (1 - pSlice);
  ctx.strokeStyle = COLORS.inkHairlineStrong;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  for (let y = 320; y <= 760; y += 110) {
    ctx.beginPath();
    ctx.moveTo(160, y);
    ctx.lineTo(1760, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // 上下分离的弧线游丝与刻度尺
  for (const half of [-1, 1]) {
    ctx.save();
    ctx.translate(0, half * splitY * (half === -1 ? 0.55 : 0.45));

    const grad = ctx.createLinearGradient(190, 0, 1730, 0);
    grad.addColorStop(0, COLORS.brandTeal);
    grad.addColorStop(0.52, COLORS.brandPeriwinkle);
    grad.addColorStop(1, COLORS.brandAmber);

    // 柔和丝带底晕
    if (half === -1) {
      ctx.beginPath();
      for (let i = 0; i <= 110; i++) {
        const x = lerp(190, 1730, i / 110);
        const y = arcY(x);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(COLORS.brandTeal, 0.12);
      ctx.lineWidth = 22;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i <= 110; i++) {
      const x = lerp(190, 1730, i / 110);
      const y = arcY(x) + (half === 1 ? 8 : 0);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = half === -1 ? grad : rgba(COLORS.brandPeriwinkle, 0.34);
    ctx.lineWidth = half === -1 ? 4.8 : 2.0;
    ctx.lineCap = "round";
    ctx.stroke();

    // 刊物精细刻度线
    if (half === -1) {
      for (let k = 0; k <= 40; k++) {
        const x = lerp(190, 1730, k / 40);
        const y = arcY(x);
        const y2 = arcY(x + 4);
        const ang = Math.atan2(y2 - y, 4);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const isMajor = k % 10 === 0;
        const len = isMajor ? 18 : 8;
        ctx.strokeStyle = isMajor ? "rgba(28, 42, 48, 0.38)" : "rgba(28, 42, 48, 0.16)";
        ctx.lineWidth = isMajor ? 1.6 : 1.0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + nx * len, y + ny * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 4 张活态微缩分镜预览画窗！
  const nodeAlpha = easeEditorialOut(segProgress(t, 46.0, 48.6)) * (1 - pSlice);
  if (nodeAlpha > 0.02) {
    for (let i = 0; i < ARC_NODES.length; i++) {
      const n = ARC_NODES[i];
      const ny = arcY(n.x);
      const pulse = 1 + 0.1 * Math.sin(t * 4.5 - i * 1.1);

      ctx.save();
      ctx.globalAlpha = clamp(nodeAlpha);
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(n.x, ny, 8.5 * pulse, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawMiniStoryboardCard(ctx, n, n.x, ny, t, nodeAlpha);
    }
  }

  // 衔接机关 ②：波峰竖直划开星芒裂隙
  if (pSlice > 0.01) {
    ctx.save();
    const sx = 1145;
    const slitH = lerp(60, 1080, easeEditorialOut(pSlice));
    const g = ctx.createLinearGradient(sx, 540 - slitH * 0.5, sx, 540 + slitH * 0.5);
    g.addColorStop(0, rgba(COLORS.brandTeal, 0));
    g.addColorStop(0.5, rgba(COLORS.brandTeal, 0.78 * (1 - pSlice * 0.45)));
    g.addColorStop(1, rgba(COLORS.brandPeriwinkle, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(sx, 540 - slitH * 0.5);
    ctx.lineTo(sx, 540 + slitH * 0.5);
    ctx.stroke();
    drawStarlightGlint(ctx, sx, lerp(365, 760, pSlice), 24, "#FFFFFF", COLORS.brandAmber, 0.9 * (1 - pSlice * 0.4), t);
    ctx.restore();
  }

  ctx.restore();
}

export function renderAct02({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();

  const pEnterZoom = easeEditorialOut(segProgress(t, 29.5, 31.4));
  const pArcZoom = easeEditorialInOut(segProgress(t, 41.8, 44.5));
  const camZoom = 1.0 + 0.04 * pEnterZoom * (1 - pArcZoom);
  camera.set({ x: STAGE_W * 0.5, y: STAGE_H * 0.5, zoom: camZoom });

  // 1. 暖白纸底 + 午后斜阳浮尘
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 1.0,
    amberGlow: 1.0,
    dotGridAlpha: 0.03,
  });
  drawDappledSunlight(worldCtx, STAGE_W, STAGE_H, t, 0.85);

  // 创作页背景边缘极柔和流动装饰丝带（让真实表单悬浮在有生命的暖纸画桌上）
  const composerFadeIn = easeEditorialOut(segProgress(t, 22.0, 23.1));
  const composerFadeOut = easeEditorialInOut(segProgress(t, 29.4, 30.8));
  const composerAlpha = composerFadeIn * (1 - composerFadeOut);
  if (composerAlpha > 0.02) {
    worldCtx.save();
    worldCtx.globalAlpha = composerAlpha * 0.42;
    for (let s = 0; s < 2; s++) {
      worldCtx.beginPath();
      const yBase = s === 0 ? 84 : 1004;
      for (let x = 0; x <= STAGE_W; x += 24) {
        const y = yBase + Math.sin(x * 0.004 + t * 0.9 + s * 2.5) * 24;
        x === 0 ? worldCtx.moveTo(x, y) : worldCtx.lineTo(x, y);
      }
      worldCtx.strokeStyle = s === 0 ? COLORS.brandTeal : COLORS.brandAmber;
      worldCtx.lineWidth = 2.6;
      worldCtx.stroke();
    }
    worldCtx.restore();
  }

  // 2. 真实 CreationComposer（22.0 – 30.8s）
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

  // 4. 底层 Canvas：星盘光学拆解 + 活态故事分镜弧线
  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  const breakdownAlpha =
    easeEditorialOut(segProgress(t, 30.2, 31.4)) *
    (1 - easeEditorialInOut(segProgress(t, 42.8, 44.0)));
  drawOpticalBreakdown(worldCtx, t, breakdownAlpha);

  const arcAlpha = easeEditorialOut(segProgress(t, 44.8, 46.2));
  drawTensionArc(worldCtx, t, arcAlpha);

  worldCtx.restore();

  drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, {
    alpha: 0.42 * (1 - composerAlpha * 0.6),
    issue: "ACT II · DISCOVERY & STORY ARC",
  });

  // 5. 顶层「棱片」主角驱动
  const flightPath = (time) => {
    if (time < 26.6) {
      const u = segProgress(time, 22.0, 26.6);
      return {
        x: lerp(540, 1060, easeEditorialInOut(u)),
        y: 340 + Math.sin(u * TAU) * 14,
      };
    }
    if (time < 28.1) {
      const u = segProgress(time, 26.6, 28.1);
      const m = UI_GEOMETRY.composer.modeVisualCenter;
      return bezierPoint(
        { x: 1060, y: 340 },
        { x: 1240, y: 420 },
        { x: m.x + 20, y: m.y - 80 },
        { x: m.x, y: m.y - 10 },
        easeEditorialInOut(u)
      );
    }
    if (time < 29.6) {
      const u = segProgress(time, 28.1, 29.2);
      const m = UI_GEOMETRY.composer.modeVisualCenter;
      const b = UI_GEOMETRY.composer.submitBtnCenter;
      const p = bezierPoint(
        { x: m.x, y: m.y - 10 },
        { x: 1460, y: 650 },
        { x: b.x + 10, y: b.y - 60 },
        { x: b.x, y: b.y - 8 },
        easeEditorialInOut(u)
      );
      const press = time >= 29.15 && time < 29.48 ? 8 : 0;
      return { x: p.x, y: p.y + press };
    }
    if (time < 31.6) {
      const u = segProgress(time, 29.6, 31.6);
      const b = UI_GEOMETRY.composer.submitBtnCenter;
      return bezierPoint(
        { x: b.x, y: b.y - 8 },
        { x: 1120, y: 690 },
        { x: 840, y: 560 },
        { x: 710, y: 536 },
        easeEditorialInOut(u)
      );
    }
    if (time < 41.2) {
      const flick = Math.sin(clamp(segProgress(time, 37.65, 38.25)) * Math.PI);
      return {
        x: 710 + flick * 26,
        y: 536 - flick * 36,
      };
    }
    if (time < 44.5) {
      const u = segProgress(time, 41.2, 44.5);
      return bezierPoint(
        { x: 710, y: 536 },
        { x: 1160, y: 390 },
        { x: 1380, y: 640 },
        { x: 1280, y: 576 },
        easeEditorialInOut(u)
      );
    }
    if (time < 51.0) {
      const u = segProgress(time, 44.5, 50.8);
      return bezierPoint(
        { x: 1280, y: 576 },
        { x: 640, y: 650 },
        { x: 860, y: 390 },
        { x: 1145, y: 365 },
        easeEditorialInOut(u)
      );
    }
    const u = easeEditorialInOut(segProgress(time, 51.0, 52.0));
    return { x: 1145, y: lerp(365, 760, u) };
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
  const size = lerp(38, 66, prismBlend);

  const posS = camera.worldToScreen(posW.x, posW.y);
  const trailW = sampleTrailFromPath(flightPath, t, 0.58, 24);
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
      prismBlend * 0.96,
      t >= 29.1 && t <= 29.6 ? 0.9 : 0,
      t >= 50.8 ? 0.95 : 0.2
    ),
    trail: trailS,
    trailAlpha: 1 - prismBlend * 0.85,
  });
}
