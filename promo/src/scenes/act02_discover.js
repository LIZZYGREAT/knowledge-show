/*
 * 第二幕：提问生光与故事骨架（0:22 – 0:52，惊艳高定机械星盘 + 活态分镜剧场版）
 * 0:22 – 0:30  真实创作入口（CreationComposer + 边缘灵动流纹丝带 + 午后斜阳）
 * 0:30 – 0:42  多环机械知识星盘（3 层逆向旋转星盘 + 6 枚环绕证据卫星 + 15 股虹彩丝瀑 + 红墨扫描核验并折纸弹飞误区）
 * 0:42 – 0:52  活态分镜张力弧线（GraduatedStageBar -> 底部律动声波柱 + 彗星光点巡航点亮 4 张活态分镜画窗 -> 波峰划开透出第三幕彩色波列）
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

const ORRERY_SATELLITES = [
  { label: "折射率 n(λ)", angle0: -2.4, radius: 248, speed: 0.14, color: COLORS.brandAmber },
  { label: "波长 λ", angle0: -1.1, radius: 288, speed: -0.11, color: COLORS.brandTeal },
  { label: "相速度 v", angle0: 0.3, radius: 248, speed: 0.14, color: COLORS.brandPeriwinkle },
  { label: "惠更斯波前", angle0: 1.5, radius: 288, speed: -0.11, color: COLORS.brandAmber },
  { label: "斯涅尔定律", angle0: 2.5, radius: 248, speed: 0.14, color: COLORS.brandTeal },
  { label: "色散角 Δθ", angle0: 3.4, radius: 288, speed: -0.11, color: COLORS.brandPeriwinkle },
];

const KNOWLEDGE_RIBBONS = [
  {
    id: "wavelength",
    color: COLORS.brandAmber,
    endY: 274,
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
    endY: 798,
    tag: "速度之差 · 偏折分叉",
    sub: "倾斜波前自然转弯，七色光谱彻底展开",
  },
];

const ARC_NODES = [
  { id: "hook", x: 310, y: 668, time: "00:52", label: "01 · 悬念引入", sub: "白光里藏着什么？", color: COLORS.brandAmber },
  { id: "micro", x: 720, y: 505, time: "01:04", label: "02 · 微观波列", sub: "七色并肩入镜", color: COLORS.brandTeal },
  { id: "split", x: 1145, y: 365, time: "01:14", label: "03 · 边界分叉", sub: "减速与偏折高潮", color: COLORS.brandPeriwinkle },
  { id: "full", x: 1585, y: 492, time: "01:23", label: "04 · 彩虹全貌", sub: "完整光谱舒展", color: COLORS.brandAmber },
];

/**
 * 知识卡左侧实时动态微缩图示
 */
function drawMiniKnowledgeGlyph(ctx, id, cx, cy, t, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = rgba(color, 0.11);
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.38);
  ctx.lineWidth = 1.3;
  ctx.stroke();

  if (id === "wavelength") {
    ctx.beginPath();
    for (let x = -18; x <= 18; x += 2) {
      const y = -8 + Math.sin(x * 0.22 - t * 4.2) * 4.8;
      x === -18 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#E56B6F";
    ctx.lineWidth = 2.3;
    ctx.stroke();

    ctx.beginPath();
    for (let x = -18; x <= 18; x += 1.5) {
      const y = 8 + Math.sin(x * 0.56 - t * 5.4) * 4.4;
      x === -18 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#8E6CBB";
    ctx.lineWidth = 2.1;
    ctx.stroke();
  } else if (id === "speed") {
    ctx.strokeStyle = "rgba(18, 148, 141, 0.48)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 17);
    ctx.stroke();
    const x1 = -15 + ((t * 30) % 30);
    const x2 = -15 + ((t * 16) % 30);
    ctx.fillStyle = "#E56B6F";
    ctx.beginPath();
    ctx.arc(x1, -8, 4.0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8E6CBB";
    ctx.beginPath();
    ctx.arc(x2, 8, 4.0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-4, -13);
    ctx.lineTo(7, 11);
    ctx.lineTo(-14, 11);
    ctx.closePath();
    ctx.strokeStyle = COLORS.brandPeriwinkle;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ["#E56B6F", "#2A9D8F", "#8E6CBB"].forEach((c, idx) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.lineTo(18, -7 + idx * 7.5 + Math.sin(t * 4 + idx) * 1.5);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/**
 * 多层逆向旋转机械知识星盘与环绕证据卫星（第二幕光学拆解视觉惊艳点！）
 */
function drawKnowledgeOrrery(ctx, cx, cy, t, alpha, reveal) {
  const a = clamp(alpha * reveal);
  if (a <= 0.005) return;

  ctx.save();
  ctx.globalAlpha = a;

  // 主黄铜精密测角环
  drawBrassGoniometer(ctx, cx, cy, 212, t * 1.25, {
    alpha: 0.92,
    reveal,
    redDeg: -28,
    violetDeg: 28,
    showVernier: false,
  });

  // 外双层逆向旋转星盘轨道
  [
    { r: 248, dash: [6, 8], color: "rgba(18, 148, 141, 0.24)", rot: t * 0.14 },
    { r: 288, dash: [3, 10], color: "rgba(78, 124, 246, 0.22)", rot: -t * 0.11 },
  ].forEach((orb) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(orb.rot);
    ctx.strokeStyle = orb.color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash(orb.dash);
    ctx.beginPath();
    ctx.arc(0, 0, orb.r * reveal, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });

  // 6 枚环绕运行的证据概念微卫星（带蛛丝连线与节点星点）
  for (let i = 0; i < ORRERY_SATELLITES.length; i++) {
    const sat = ORRERY_SATELLITES[i];
    const ang = sat.angle0 + t * sat.speed;
    const rr = sat.radius * easeEditorialOut(reveal);
    const sx = cx + Math.cos(ang) * rr;
    const sy = cy + Math.sin(ang) * rr;

    // 避开正右方 3 股主知识带与正左方文字光束，让卫星在上下扇区呼吸显现
    const horizAvoid = Math.abs(Math.sin(ang));
    const satAlpha = clamp(horizAvoid * 1.45) * 0.88;
    if (satAlpha < 0.06) continue;

    ctx.save();
    ctx.globalAlpha = a * satAlpha;

    // 极细径向连线连向中心棱镜
    ctx.strokeStyle = rgba(sat.color, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * 74, cy + Math.sin(ang) * 74);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // 轨道星点 + 轻量概念胶囊
    ctx.fillStyle = "#FFFDF9";
    ctx.strokeStyle = sat.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.font = `500 12px ${FONTS.mono}`;
    const tw = ctx.measureText(sat.label).width + 20;
    drawPaperCard(ctx, sx - tw * 0.5, sy - 28, tw, 24, {
      radius: 12,
      fill: "rgba(255, 253, 249, 0.90)",
      stroke: rgba(sat.color, 0.32),
      lineWidth: 1,
      shadowBlur: 8,
      shadowOffsetY: 3,
    });
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sat.label, sx, sy - 16);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 活态微缩分镜画窗（随巡航彗星依次点亮抬升 + 胶片时间戳徽标！）
 */
function drawMiniStoryboardCard(ctx, node, nx, ny, t, alpha, highlight = 0) {
  const lift = highlight * 14;
  const cw = 248;
  const ch = 160;
  const x0 = nx - cw * 0.5;
  const y0 = ny - ch - 48 - lift;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 垂直细引线
  ctx.strokeStyle = rgba(node.color, 0.48 + highlight * 0.42);
  ctx.lineWidth = 1.5 + highlight * 0.8;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.lineTo(nx, y0 + ch);
  ctx.stroke();

  // 被彗星点亮时的外圈暖金柔和光环
  if (highlight > 0.05) {
    ctx.save();
    ctx.shadowColor = rgba(node.color, 0.32 * highlight);
    ctx.shadowBlur = 28;
    roundRectPath(ctx, x0 - 2, y0 - 2, cw + 4, ch + 4, 16);
    ctx.strokeStyle = rgba(node.color, 0.55 * highlight);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  drawPaperCard(ctx, x0, y0, cw, ch, {
    radius: 15,
    fill: "rgba(255, 253, 249, 0.97)",
    stroke: rgba(node.color, 0.34 + highlight * 0.45),
    lineWidth: 1.4 + highlight * 0.8,
    shadowBlur: 22 + highlight * 10,
    shadowOffsetY: 8 + highlight * 4,
  });

  // 上半部活态微缩画幅窗
  const vx = x0 + 12;
  const vy = y0 + 12;
  const vw = cw - 24;
  const vh = 88;
  ctx.save();
  roundRectPath(ctx, vx, vy, vw, vh, 9);
  ctx.fillStyle = "#F7F3EA";
  ctx.fill();
  ctx.clip();

  if (node.id === "hook") {
    ctx.strokeStyle = "rgba(242, 153, 74, 0.7)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(vx, vy + 26);
    ctx.lineTo(vx + 92, vy + 46);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vx + 112, vy + 16);
    ctx.lineTo(vx + 146, vy + 74);
    ctx.lineTo(vx + 78, vy + 74);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.strokeStyle = COLORS.brandTeal;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    drawStarlightGlint(ctx, vx + 92, vy + 46, 11, "#FFFFFF", COLORS.brandAmber, 0.95, t);
  } else if (node.id === "micro") {
    ctx.fillStyle = "rgba(218, 240, 238, 0.72)";
    ctx.fillRect(vx + vw * 0.45, vy, vw * 0.55, vh);
    [0, 2, 3, 4, 6].forEach((sIdx, k) => {
      ctx.beginPath();
      for (let px = 0; px <= vw; px += 4) {
        const inGlass = px > vw * 0.45;
        const freq = inGlass ? 0.22 + k * 0.08 : 0.14;
        const slope = inGlass ? (px - vw * 0.45) * (0.04 + k * 0.045) : 0;
        const py = vy + 17 + k * 12 + slope + Math.sin(px * freq - t * 5.2 + k) * 3.8;
        px === 0 ? ctx.moveTo(vx + px, py) : ctx.lineTo(vx + px, py);
      }
      ctx.strokeStyle = SPECTRUM[sIdx].hex;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });
  } else if (node.id === "split") {
    ctx.strokeStyle = "rgba(184, 134, 72, 0.35)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(vx + 48, vy + 44, 58, -0.32, 0.68);
    ctx.stroke();
    SPECTRUM.forEach((b, i) => {
      const ang = -0.22 + i * 0.135;
      ctx.strokeStyle = b.hex;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(vx + 48, vy + 44);
      ctx.lineTo(vx + 48 + Math.cos(ang) * 155, vy + 44 + Math.sin(ang) * 155);
      ctx.stroke();
    });
  } else {
    SPECTRUM.forEach((b, i) => {
      ctx.beginPath();
      for (let px = 0; px <= vw; px += 5) {
        const py = vy + 13 + i * 10 + Math.sin(px * (0.06 + i * 0.016) - t * 4.2 + i) * 3.8;
        px === 0 ? ctx.moveTo(vx + px, py) : ctx.lineTo(vx + px, py);
      }
      ctx.strokeStyle = b.hex;
      ctx.lineWidth = 2.3;
      ctx.stroke();
    });
  }

  // 右上微缩时间码标签
  ctx.fillStyle = "rgba(255, 253, 249, 0.88)";
  roundRectPath(ctx, vx + vw - 52, vy + 6, 46, 18, 9);
  ctx.fill();
  ctx.font = `600 10px ${FONTS.mono}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.time, vx + vw - 29, vy + 15);

  ctx.restore();
  ctx.strokeStyle = "rgba(28, 42, 48, 0.11)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, vx, vy, vw, vh, 9);
  ctx.stroke();

  ctx.font = `600 16.5px ${FONTS.serif}`;
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(node.label, x0 + 14, y0 + 119);

  ctx.font = `400 12.5px ${FONTS.sans}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.fillText(node.sub, x0 + 14, y0 + 141);

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

  const prismX = lerp(700, 960, pTighten);
  const prismY = lerp(536, 576, pTighten);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 多层机械知识星盘与环绕证据卫星
  drawKnowledgeOrrery(ctx, prismX, prismY, t, 1 - pTighten, pBeamIn);

  // 2. 15 股超细虹彩丝瀑帘幕（在 3 股主知识带之间形成如梦似幻的光学色散质感！）
  if (pRibbons > 0.05 && pTighten < 0.85) {
    ctx.save();
    ctx.globalAlpha = clamp((1 - pTighten / 0.85) * 0.24 * pRibbons);
    for (let f = 0; f < 15; f++) {
      const ratio = f / 14;
      const targetY = lerp(240, 830, ratio);
      const col = SPECTRUM[Math.min(6, Math.floor(ratio * 7))].hex;
      const endX = lerp(prismX + 42, 1680, pRibbons);
      ctx.beginPath();
      for (let k = 0; k <= 50; k++) {
        const u = k / 50;
        const x = lerp(prismX + 42, endX, u);
        const y = lerp(prismY, targetY, easeEditorialOut(u)) + Math.sin(u * 9 - t * 3.2 + f * 0.6) * 8 * Math.sin(u * Math.PI);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 左侧入射文字白光束 + 漂浮研究线索胶囊
  if (pBeamIn > 0.01 && pTighten < 0.85) {
    const beamAlpha = pBeamIn * (1 - pTighten / 0.85);
    const sx = 64;
    const ex = lerp(sx, prismX - 42, pBeamIn);
    const beamGrad = ctx.createLinearGradient(sx, prismY, ex, prismY);
    beamGrad.addColorStop(0, "rgba(255, 252, 245, 0)");
    beamGrad.addColorStop(0.25, "rgba(255, 248, 226, 0.82)");
    beamGrad.addColorStop(1, "rgba(255, 253, 249, 0.98)");

    ctx.save();
    ctx.globalAlpha = beamAlpha;
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 52;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, prismY);
    ctx.lineTo(ex, prismY);
    ctx.stroke();

    for (let p = 0; p < 7; p++) {
      const u = (p / 7 + t * 0.36) % 1;
      const px = lerp(sx + 30, ex, u);
      const py = prismY + Math.sin(u * 12 + p) * 6;
      ctx.fillStyle = rgba(COLORS.brandAmber, 0.62 * Math.sin(u * Math.PI));
      ctx.beginPath();
      ctx.arc(px, py, 3.4, 0, TAU);
      ctx.fill();
    }

    drawPaperCard(ctx, 118, prismY - 98, 424, 58, {
      radius: 29,
      fill: "rgba(255, 253, 249, 0.95)",
      stroke: rgba(COLORS.brandTeal, 0.34),
      lineWidth: 1.5,
      shadowBlur: 20,
      shadowOffsetY: 6,
    });
    ctx.font = `600 24px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkPrimary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(PROMPT_TEXT, 330, prismY - 69);

    const notes = [
      { x: 240, y: prismY + 86, text: "1672 · 牛顿双棱镜实验" },
      { x: 350, y: prismY + 148, text: "介质折射率 n(λ) 与相速度" },
    ];
    notes.forEach((n, idx) => {
      const bob = Math.sin(t * 2.1 + idx * 1.9) * 5;
      drawPaperCard(ctx, n.x - 116, n.y - 18 + bob, 232, 36, {
        radius: 18,
        fill: "rgba(255, 253, 249, 0.88)",
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

  // 4. 右侧 3 股活态水彩知识丝带 + 嵌入式动态微缩图示卡
  if (pRibbons > 0.01) {
    for (let i = 0; i < KNOWLEDGE_RIBBONS.length; i++) {
      const r = KNOWLEDGE_RIBBONS[i];
      const targetY = lerp(r.endY, 576, pTighten);
      const startX = lerp(prismX + 42, 280, pTighten);
      const endX = lerp(prismX + 42, 1760, pRibbons);

      ctx.save();
      ctx.lineCap = "round";

      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const u = k / 64;
        const x = lerp(startX, endX, u);
        const y = lerp(prismY, targetY, easeEditorialOut(u)) + Math.sin(u * 10 - t * 3.8 + i * 1.4) * 5.5 * (1 - pTighten * 0.85) * Math.sin(u * Math.PI);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(r.color, 0.16);
      ctx.lineWidth = 24 * (1 - pTighten * 0.5);
      ctx.stroke();

      for (let s = -1; s <= 1; s++) {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const u = k / 72;
          const x = lerp(startX, endX, u);
          const baseY = lerp(prismY, targetY, easeEditorialOut(u));
          const wave =
            Math.sin(u * 11 - t * 4.0 + i * 1.4 + s * 0.5) *
            (6.2 + (s === 0 ? 1.5 : 0)) *
            (1 - pTighten * 0.85) *
            Math.sin(u * Math.PI);
          const y = baseY + wave + s * 5.2 * (1 - pTighten * 0.7);
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(r.color, s === 0 ? 0.90 : 0.44);
        ctx.lineWidth = s === 0 ? 4.8 : 2.1;
        ctx.stroke();
      }

      if (pTighten < 0.65) {
        for (let b = 0; b < 2; b++) {
          const beadU = (t * 0.30 + i * 0.33 + b * 0.5) % 1;
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
      }

      const tagAlpha = pTags * (1 - pTighten * 1.4);
      if (tagAlpha > 0.02) {
        const tx = 1105 + i * 24;
        const ty = targetY - 46;
        ctx.globalAlpha = clamp(tagAlpha);
        drawPaperCard(ctx, tx, ty - 46, 526, 94, {
          radius: 16,
          fill: "rgba(255, 253, 249, 0.96)",
          stroke: rgba(r.color, 0.42),
          lineWidth: 1.5,
          shadowBlur: 22,
          shadowOffsetY: 8,
        });

        drawMiniKnowledgeGlyph(ctx, r.id, tx + 46, ty + 1, t, r.color);

        ctx.font = `600 22px ${FONTS.serif}`;
        ctx.fillStyle = COLORS.inkPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(r.tag, tx + 90, ty - 12);

        ctx.font = `400 14.5px ${FONTS.sans}`;
        ctx.fillStyle = COLORS.inkSecondary;
        ctx.fillText(r.sub, tx + 90, ty + 17);

        ctx.font = `600 11px ${FONTS.mono}`;
        ctx.fillStyle = COLORS.brandTealDark;
        ctx.textAlign = "right";
        ctx.fillText("✓ VERIFIED", tx + 508, ty - 24);
      }

      ctx.restore();
    }
  }

  // 5. 核验隐喻：红墨扫描盖章「MYTH · 误区」 -> 棱片翼尖将其折成纸飞镖弹飞 + 折纸彩屑迸发！
  const pMythIn = easeEditorialOut(segProgress(t, 35.0, 37.1));
  const pMythScan = segProgress(t, 36.8, 37.75);
  const pMythFlick = easeEditorialOut(segProgress(t, 37.8, 39.7));
  if (pMythFlick > 0.01 && pMythFlick < 0.95) {
    drawOrigamiConfettiBurst(ctx, 815, 345, pMythFlick, {
      seed: 37801,
      count: 28,
      spread: 270,
      alpha: 0.95,
    });
  }
  if (pMythIn > 0.01 && pMythFlick < 0.99) {
    const mx = lerp(890, 810, pMythIn) + pMythFlick * 1300;
    const my = lerp(110, 340, pMythIn) - Math.sin(pMythFlick * Math.PI) * 290 + pMythFlick * 95;
    const rot = lerp(-0.08, 0.04, pMythIn) + pMythFlick * 2.9;
    const foldSquashY = lerp(1.0, 0.32, Math.min(1, pMythFlick * 2.6)); // 弹飞瞬间折纸对折！
    const mAlpha = clamp(pMythIn * (1 - Math.max(0, (pMythFlick - 0.55) / 0.45)));

    ctx.save();
    ctx.globalAlpha = mAlpha;
    ctx.translate(mx, my);
    ctx.rotate(rot);
    ctx.scale(1, foldSquashY);

    drawPaperCard(ctx, -190, -42, 380, 84, {
      radius: 14,
      fill: "#F5F0E6",
      stroke: pMythScan > 0.2 ? "rgba(210, 88, 78, 0.72)" : "rgba(28, 42, 48, 0.24)",
      lineWidth: 1.7,
      shadowBlur: 20,
      shadowOffsetY: 9,
    });

    // 红墨扫描光带（36.8–37.75s 快速扫过检测出误区！）
    if (pMythScan > 0.01 && pMythScan < 0.98 && pMythFlick < 0.05) {
      const scanX = lerp(-180, 180, pMythScan);
      ctx.fillStyle = "rgba(209, 83, 73, 0.14)";
      ctx.fillRect(-188, -40, scanX + 188, 80);
      ctx.strokeStyle = "rgba(209, 83, 73, 0.85)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(scanX, -42);
      ctx.lineTo(scanX, 42);
      ctx.stroke();
    }

    ctx.fillStyle = pMythScan > 0.4 ? "#D15349" : COLORS.inkSecondary;
    ctx.beginPath();
    ctx.arc(-152, 0, 15, 0, TAU);
    ctx.fill();
    ctx.font = `700 15px ${FONTS.mono}`;
    ctx.fillStyle = "#FFFDF9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pMythScan > 0.4 ? "✕" : "?", -152, 1);

    ctx.font = `500 20px ${FONTS.serif}`;
    ctx.fillStyle = COLORS.inkSecondary;
    ctx.textAlign = "left";
    ctx.fillText("棱镜给白光染了色？", -124, 1);

    // 醒目红墨邮戳印章「MYTH · 误区」
    if (pMythScan > 0.55) {
      ctx.save();
      ctx.translate(128, -12);
      ctx.rotate(-0.18);
      ctx.strokeStyle = "rgba(209, 83, 73, 0.88)";
      ctx.lineWidth = 1.8;
      roundRectPath(ctx, -46, -13, 92, 26, 5);
      ctx.stroke();
      ctx.font = `700 11.5px ${FONTS.mono}`;
      ctx.fillStyle = "rgba(209, 83, 73, 0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("MYTH · 误区", 0, 0);
      ctx.restore();
    }

    if (pMythFlick > 0.04) {
      ctx.strokeStyle = "rgba(209, 83, 73, 0.82)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-128, 1);
      ctx.lineTo(156, 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制活态叙事张力弧线 + 底部节奏声波柱 + 彗星巡航点亮 4 张活态分镜 + 划开透视第三幕！
 */
function drawTensionArc(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  const pArch = easeEditorialInOut(segProgress(t, 45.2, 48.0));
  const pComet = easeEditorialInOut(segProgress(t, 46.2, 50.8));
  const pSlice = easeEditorialInOut(segProgress(t, 51.0, 52.0));
  const splitY = pSlice * 560;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

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

  // 衔接机关 ② 惊艳透视窗：51.0s 棱片划开波峰时，裂缝中透出与第三幕 52.0s 完全同坐标的 7 排直线平行光波（尚未遇玻璃，0px 无缝交接！）
  if (pSlice > 0.01) {
    const slitW = lerp(16, STAGE_W * 1.4, easeEditorialInOut(pSlice));
    const sx = 1145;
    const incAng = (14 * Math.PI) / 180;
    const incDx = Math.cos(incAng);
    const incDy = Math.sin(incAng);
    const incNx = -incDy;
    const incNy = incDx;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - slitW * 0.5, 0, slitW, STAGE_H);
    ctx.clip();

    drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0, dotGridAlpha: 0.025 });

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = clamp(pSlice * 1.15);
    for (let i = 0; i < SPECTRUM.length; i++) {
      const band = SPECTRUM[i];
      const yAnchor = 246 + i * 94;
      const xAnchor = lerp(860, 660, yAnchor / STAGE_H);
      const airLambda = 112 - i * 4.5;
      const airAmp = 10.5;
      const omega = 5.4;

      ctx.beginPath();
      for (let k = 0; k <= 160; k++) {
        const s = -940 + (k / 160) * 2240;
        const w = Math.sin((TAU * s) / airLambda - omega * t + band.phase) * airAmp;
        const px = xAnchor + incDx * s + incNx * w;
        const py = yAnchor + incDy * s + incNy * w;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(band.hex, 0.14);
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.strokeStyle = rgba(band.hex, 0.80);
      ctx.lineWidth = 5.4;
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  ctx.globalAlpha = clamp(alpha * (1 - pSlice * 0.85));

  // 背景刊物节奏网格 + 弧线下方呼吸的精致律动声波柱（直观传达脚本节奏的“起承转合”！）
  if (pArch > 0.1) {
    ctx.save();
    ctx.globalAlpha = 0.28 * pArch * (1 - pSlice);
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

    // 底部 48 根轻盈节奏声波短柱
    for (let b = 0; b <= 48; b++) {
      const bx = lerp(220, 1700, b / 48);
      const by = arcY(bx);
      const tension = clamp((700 - by) / 360);
      const barH = (12 + tension * 54) * (0.7 + 0.3 * Math.sin(t * 4.6 + b * 0.45));
      ctx.fillStyle = b % 3 === 0 ? rgba(COLORS.brandAmber, 0.42) : rgba(COLORS.brandTeal, 0.32);
      roundRectPath(ctx, bx - 2, by + 16, 4, barH, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 上下分离的主张力弧线与精密刻度
  for (const half of [-1, 1]) {
    ctx.save();
    ctx.translate(0, half * splitY * (half === -1 ? 0.55 : 0.45));

    const grad = ctx.createLinearGradient(190, 0, 1730, 0);
    grad.addColorStop(0, COLORS.brandTeal);
    grad.addColorStop(0.52, COLORS.brandPeriwinkle);
    grad.addColorStop(1, COLORS.brandAmber);

    if (half === -1) {
      ctx.beginPath();
      for (let i = 0; i <= 110; i++) {
        const x = lerp(190, 1730, i / 110);
        const y = arcY(x);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(COLORS.brandTeal, 0.14);
      ctx.lineWidth = 24;
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

  // 巡航彗星光点（沿弧线滑过并依次高亮 4 张活态分镜卡！）
  const cometX = lerp(220, 1660, pComet);
  const cometY = arcY(cometX);
  if (pComet > 0.01 && pSlice < 0.2) {
    drawStarlightGlint(ctx, cometX, cometY, 18, "#FFFFFF", COLORS.brandAmber, 0.95 * (1 - pSlice * 5), t * 0.8);
  }

  // 4 张活态微缩分镜预览画窗
  const nodeAlpha = easeEditorialOut(segProgress(t, 46.0, 48.6)) * (1 - pSlice);
  if (nodeAlpha > 0.02) {
    for (let i = 0; i < ARC_NODES.length; i++) {
      const n = ARC_NODES[i];
      const ny = arcY(n.x);
      const distToComet = Math.abs(cometX - n.x);
      const highlight = clamp(1 - distToComet / 260) * (pComet > 0.01 ? 1 : 0);
      const pulse = 1 + 0.1 * Math.sin(t * 4.5 - i * 1.1) + highlight * 0.18;

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

      drawMiniStoryboardCard(ctx, n, n.x, ny, t, nodeAlpha, highlight);
    }
  }

  // 衔接机关 ②：波峰竖直划开星芒裂隙
  if (pSlice > 0.01) {
    ctx.save();
    ctx.globalAlpha = 1;
    const sx = 1145;
    const slitH = lerp(60, 1080, easeEditorialOut(pSlice));
    const g = ctx.createLinearGradient(sx, 540 - slitH * 0.5, sx, 540 + slitH * 0.5);
    g.addColorStop(0, rgba(COLORS.brandTeal, 0));
    g.addColorStop(0.5, rgba(COLORS.brandTeal, 0.82 * (1 - pSlice * 0.45)));
    g.addColorStop(1, rgba(COLORS.brandPeriwinkle, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(sx, 540 - slitH * 0.5);
    ctx.lineTo(sx, 540 + slitH * 0.5);
    ctx.stroke();
    drawStarlightGlint(ctx, sx, lerp(365, 760, pSlice), 26, "#FFFFFF", COLORS.brandAmber, 0.95 * (1 - pSlice * 0.35), t);
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

  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 1.0,
    amberGlow: 1.0,
    dotGridAlpha: 0.03,
  });
  drawDappledSunlight(worldCtx, STAGE_W, STAGE_H, t, 0.88);

  const composerFadeIn = easeEditorialOut(segProgress(t, 22.0, 23.1));
  const composerFadeOut = easeEditorialInOut(segProgress(t, 29.4, 30.8));
  const composerAlpha = composerFadeIn * (1 - composerFadeOut);
  if (composerAlpha > 0.02) {
    worldCtx.save();
    worldCtx.globalAlpha = composerAlpha * 0.46;
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

  // 顶层「棱片」主角驱动
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
        { x: 700, y: 536 },
        easeEditorialInOut(u)
      );
    }
    if (time < 41.2) {
      const flick = Math.sin(clamp(segProgress(time, 37.65, 38.25)) * Math.PI);
      return {
        x: 700 + flick * 26,
        y: 536 - flick * 36,
      };
    }
    if (time < 44.5) {
      const u = segProgress(time, 41.2, 44.5);
      return bezierPoint(
        { x: 700, y: 536 },
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
