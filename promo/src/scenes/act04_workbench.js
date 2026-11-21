/*
 * 第四幕：创作者主权——矢量语义对象点选与多形态局部精修（1:32 – 2:20，全片核心高潮）
 * 1:32 – 1:37.2  退镜入台：棱片刹车悬停并牵引画幅缩小至 64.2% 工作台中央，四周真实面板浮现
 * 1:37.2 – 1:41.5 语义对象巡检（告别死板矩形选框！）：
 *                  - 97.4–99.3s  轻掠「▲ 磨砂三棱镜」→ 精准贴合三边棱锥矢量轮廓 + 3 枚顶点锚钉
 *                  - 99.3–101.2s 轻掠「◯ 光学测角环」→ 精准贴合圆形双环矢量轮廓 + 4 枚罗盘锚点
 * 1:41.2 – 2:03.8 精准精修 ①「~ 彩色波浪带」(v1 -> v2)：
 *                  - 贴合红/紫真实波浪曲线的矢量轮廓 + 贝塞尔切线手柄锁定，拒绝灰蒙蒙矩形遮罩
 *                  - 输入自然语言 -> 沿弯曲波扇裁剪的暖杏流光水墨涟漪 -> 仅波束与角度刻度焕新 v2，棱镜与圆环纹丝不动
 * 2:04.0 – 2:08.8 描图纸 v1 / v2 竖线对比
 * 2:08.8 – 2:13.0 精准精修 ②「▲ 三角棱锥」(v2 -> v3)：锁定三边棱锥 -> 三角裁切晶体流光扫过 -> 棱镜折光质感 +35%
 * 2:13.0 – 2:17.2 精准精修 ③「◯ 测角圆环」(v3 -> v4)：锁定圆形测角环 -> 360° 黄金流光环扫过 -> 黄铜刻度强化
 * 2:17.2 – 2:20.0 轻点右上角「导出 MP4」化作流光弧线掠向左缘，无缝衔接第五幕标尺扫屏
 */

import { COLORS, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  rgba,
  smoothstep,
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
  drawStarlightGlint,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

const REV_PROMPT = "拉大红光与紫光的波长起伏对比，并在折射边界补上手绘角度刻度";

const SEMANTIC_OBJECTS = {
  waves: {
    title: "~ prism-spectrum-waves",
    meta: "彩色波浪带 · 7 股水彩波动曲线",
    lockText: "其余 6 项已锁定",
    attachText: "已引用 ✓",
    tlChipText: "已选中对象 · ~ prism-spectrum-waves · 连续多帧",
  },
  prism: {
    title: "▲ glass-prism-body",
    meta: "磨砂三角棱锥 · 光学晶体折射面",
    lockText: "波束与圆环已锁定",
    attachText: "矢量化锁定",
    tlChipText: "已选中对象 · ▲ glass-prism-body · 晶体层",
  },
  ring: {
    title: "◯ brass-goniometer",
    meta: "黄铜光学测角环 · 72 刻度圆环",
    lockText: "棱镜与波束已锁定",
    attachText: "矢量化锁定",
    tlChipText: "已选中对象 · ◯ brass-goniometer · 刻度环层",
  },
};

/**
 * 采样某一条彩虹波列在画幅坐标系 (1920×1080) 中的真实正弦曲线点列
 */
function sampleBandWavePoints(meta, waveTime, maxLen = 920, steps = 96) {
  const pts = [];
  const len = Math.min(meta.curLen, maxLen);
  for (let k = 0; k <= steps; k++) {
    const s = (k / steps) * len;
    const env = smoothstep(0, 75, s);
    const wave = Math.sin((TAU * s) / meta.lambdaPx - meta.omega * waveTime + meta.phase) * meta.amp * env;
    pts.push({
      x: meta.ep.x + meta.dirX * s + meta.normX * wave,
      y: meta.ep.y + meta.dirY * s + meta.normY * wave,
      s,
      env,
      wave,
    });
  }
  return pts;
}

/**
 * 绘制统一暖纸浮标胶囊（用于矢量对象悬停/锁定徽章）
 */
function drawSemanticPill(ctx, x, y, text, accentColor = COLORS.brandTeal, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `600 12px ${FONTS.mono}`;
  const textW = ctx.measureText(text).width;
  const w = Math.max(176, textW + 38);
  const h = 28;
  drawPaperCard(ctx, x, y, w, h, {
    radius: 14,
    fill: "rgba(255, 253, 249, 0.96)",
    stroke: rgba(accentColor, 0.56),
    lineWidth: 1.35,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x + 14, y + h * 0.5, 4.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.inkPrimary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 25, y + h * 0.5 + 0.5);
  ctx.restore();
}

/**
 * 矢量形状选区 ①：精准贴合「▲ 三角棱锥」的三边轮廓 + 3 枚顶点锚钉 + 三角内部晶体扫光
 */
function drawTriangleSelection(ctx, geom, mapPt, { alpha = 1, locked = false, t = 0, shimmerU = 0, badgeText = "" } = {}) {
  if (alpha <= 0.01 || !geom) return;
  const pTop = mapPt(geom.top.x, geom.top.y);
  const pRight = mapPt(geom.right.x, geom.right.y);
  const pLeft = mapPt(geom.left.x, geom.left.y);
  const pBackTop = mapPt(geom.backTop.x, geom.backTop.y);
  const pBackRight = mapPt(geom.backRight.x, geom.backRight.y);

  const traceTri = () => {
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y);
    ctx.lineTo(pRight.x, pRight.y);
    ctx.lineTo(pLeft.x, pLeft.y);
    ctx.closePath();
  };

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 轻盈半透棱锥矢量高亮铺底（绝不糊住玻璃本体）
  traceTri();
  ctx.fillStyle = locked ? "rgba(18, 148, 141, 0.085)" : "rgba(18, 148, 141, 0.055)";
  ctx.fill();

  // 2. 右侧立体厚度边虚线参考
  ctx.strokeStyle = rgba(COLORS.brandTeal, locked ? 0.45 : 0.28);
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.lineTo(pBackTop.x, pBackTop.y);
  ctx.lineTo(pBackRight.x, pBackRight.y);
  ctx.lineTo(pRight.x, pRight.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. 严格贴合三角形三边的外光晕 + 主矢量轮廓线
  traceTri();
  ctx.strokeStyle = rgba(COLORS.brandTeal, locked ? 0.24 : 0.14);
  ctx.lineWidth = locked ? 9 : 6;
  ctx.lineJoin = "round";
  ctx.stroke();

  traceTri();
  ctx.strokeStyle = locked ? COLORS.brandTeal : rgba(COLORS.brandTeal, 0.85);
  ctx.lineWidth = locked ? 2.4 : 1.9;
  if (!locked) {
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -t * 28;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. 锁定瞬间的暖金晶体对角扫光（严格裁切在三角形内部！）
  if (shimmerU > 0.005 && shimmerU < 0.995) {
    ctx.save();
    traceTri();
    ctx.clip();
    const minX = pLeft.x - 40;
    const maxX = pRight.x + 40;
    const bandX = lerp(minX, maxX, easeEditorialInOut(shimmerU));
    const sheen = ctx.createLinearGradient(bandX - 65, pTop.y, bandX + 65, pRight.y);
    sheen.addColorStop(0, "rgba(255, 248, 224, 0)");
    sheen.addColorStop(0.42, rgba(COLORS.brandAmber, 0.42 * Math.sin(shimmerU * Math.PI)));
    sheen.addColorStop(0.55, rgba("#FFFFFF", 0.78 * Math.sin(shimmerU * Math.PI)));
    sheen.addColorStop(1, "rgba(18, 148, 141, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(pLeft.x - 20, pTop.y - 20, pRight.x - pLeft.x + 60, pRight.y - pTop.y + 40);

    // 晶体内部闪耀的星芒
    const sparkX = lerp(pLeft.x + 30, pRight.x - 24, shimmerU);
    const sparkY = lerp(pLeft.y - 34, pTop.y + 42, Math.sin(shimmerU * Math.PI));
    drawStarlightGlint(ctx, sparkX, sparkY, 22 * Math.sin(shimmerU * Math.PI), "#FFFFFF", COLORS.brandAmber, 0.95, t * 2);
    ctx.restore();
  }

  // 5. 3 枚三角顶点矢量锚钉 + 3 枚中点控制菱形
  const verts = [pTop, pRight, pLeft];
  for (let i = 0; i < 3; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % 3];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;

    if (locked) {
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = COLORS.brandAmber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(mx, my - 4.5);
      ctx.lineTo(mx + 4.5, my);
      ctx.lineTo(mx, my + 4.5);
      ctx.lineTo(mx - 4.5, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "#FFFDF9";
    ctx.strokeStyle = locked ? COLORS.brandTeal : COLORS.brandPeriwinkle;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, locked ? 5.6 : 4.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // 6. 顶点上方浮标
  if (badgeText) {
    drawSemanticPill(ctx, pTop.x - 104, pTop.y - 44, badgeText, locked ? COLORS.brandTeal : COLORS.brandPeriwinkle, alpha);
  }
  ctx.restore();
}

/**
 * 矢量形状选区 ②：精准贴合「◯ 光学测角圆环」的双环轮廓 + 4 枚罗盘锚点 + 360° 黄金流光环扫
 */
function drawRingSelection(ctx, cx, cy, radius, mapPt, { alpha = 1, locked = false, t = 0, sweepU = 0, badgeText = "" } = {}) {
  if (alpha <= 0.01) return;
  const pC = mapPt(cx, cy);
  const pEdge = mapPt(cx + radius, cy);
  const rS = Math.abs(pEdge.x - pC.x);
  const rOuter = rS + 10;
  const rInner = rS - 13;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 环形柔和半透选中带（仅高亮圆环环带，绝不盖住中心棱镜！）
  ctx.strokeStyle = locked ? "rgba(242, 153, 74, 0.14)" : "rgba(18, 148, 141, 0.10)";
  ctx.lineWidth = Math.max(12, rOuter - rInner);
  ctx.beginPath();
  ctx.arc(pC.x, pC.y, (rOuter + rInner) * 0.5, 0, TAU);
  ctx.stroke();

  // 2. 外环与内环精准矢量轮廓
  ctx.strokeStyle = locked ? COLORS.brandAmber : COLORS.brandTeal;
  ctx.lineWidth = locked ? 2.3 : 1.8;
  ctx.setLineDash(locked ? [10, 6] : [6, 6]);
  ctx.lineDashOffset = -t * 32;
  ctx.beginPath();
  ctx.arc(pC.x, pC.y, rOuter, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = rgba(locked ? COLORS.brandTeal : COLORS.brandPeriwinkle, 0.68);
  ctx.lineWidth = 1.3;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = t * 22;
  ctx.beginPath();
  ctx.arc(pC.x, pC.y, rInner, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. 360° 黄金-青绿流光彗星沿圆环飞驰（v3 -> v4 局部修订高光！）
  if (sweepU > 0.005 && sweepU < 0.995) {
    const startAng = -Math.PI * 0.5;
    const curAng = startAng + easeEditorialInOut(sweepU) * TAU;
    const tailAng = Math.max(startAng, curAng - 1.35);
    const env = Math.sin(sweepU * Math.PI);

    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.88 * env);
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(pC.x, pC.y, rS, tailAng, curAng);
    ctx.stroke();

    ctx.strokeStyle = rgba("#FFFFFF", 0.92 * env);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(pC.x, pC.y, rS, Math.max(startAng, curAng - 0.55), curAng);
    ctx.stroke();

    const tipX = pC.x + Math.cos(curAng) * rS;
    const tipY = pC.y + Math.sin(curAng) * rS;
    drawStarlightGlint(ctx, tipX, tipY, 24 * env, "#FFFFFF", COLORS.brandAmber, 0.96, t * 3);
  }

  // 4. 4 枚东西南北罗盘锚点 + 轻盈半径虚线标尺
  const cardinals = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  for (const ang of cardinals) {
    const ax = pC.x + Math.cos(ang) * rOuter;
    const ay = pC.y + Math.sin(ang) * rOuter;
    ctx.fillStyle = "#FFFDF9";
    ctx.strokeStyle = locked ? COLORS.brandAmber : COLORS.brandTeal;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(ax, ay, locked ? 5.6 : 4.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // 右上 45° 极细半径指引线 + 浮标
  const callAng = -Math.PI * 0.27;
  const rx = pC.x + Math.cos(callAng) * rOuter;
  const ry = pC.y + Math.sin(callAng) * rOuter;
  if (badgeText) {
    ctx.strokeStyle = rgba(locked ? COLORS.brandAmber : COLORS.brandTeal, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + 20, ry - 18);
    ctx.stroke();
    drawSemanticPill(ctx, rx + 20, ry - 34, badgeText, locked ? COLORS.brandAmber : COLORS.brandTeal, alpha);
  }

  ctx.restore();
}

/**
 * 矢量形状选区 ③：精准贴合「~ 彩色波浪带」的弯曲波列轮廓 + 贝塞尔节点切线手柄 + 沿波扇流淌的暖杏水墨涟漪！
 */
function drawCurvedWaveRibbonSelection(
  ctx,
  bandMeta,
  waveTime,
  mapPt,
  { alpha = 1, locked = true, t = 0, rippleU = 0, snapPulseU = 0, badgeText = "" } = {}
) {
  if (alpha <= 0.01 || !bandMeta || bandMeta.length < 7) return;
  const red = bandMeta[0];
  const mid = bandMeta[3];
  const violet = bandMeta[6];

  const redPts = sampleBandWavePoints(red, waveTime, 940, 88).map((p) => mapPt(p.x, p.y));
  const midPts = sampleBandWavePoints(mid, waveTime, 900, 64).map((p) => mapPt(p.x, p.y));
  const violetPts = sampleBandWavePoints(violet, waveTime, 880, 88).map((p) => mapPt(p.x, p.y));

  // 构建贴合波扇上下边界的封闭弯曲包络路径（绝非矩形！）
  const padOut = 15;
  const traceWaveFanEnvelope = () => {
    ctx.beginPath();
    redPts.forEach((p, i) => {
      const px = p.x - red.normX * padOut;
      const py = p.y - red.normY * padOut;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    for (let i = violetPts.length - 1; i >= 0; i--) {
      const p = violetPts[i];
      const px = p.x + violet.normX * padOut;
      const py = p.y + violet.normY * padOut;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 弯曲波扇极轻盈透明青绿底光（让选中的 7 道彩色波浪跃然纸上，绝不遮盖左侧棱镜！）
  traceWaveFanEnvelope();
  const fanGrad = ctx.createLinearGradient(redPts[0].x, redPts[0].y, redPts[redPts.length - 1].x, violetPts[violetPts.length - 1].y);
  fanGrad.addColorStop(0, "rgba(18, 148, 141, 0.075)");
  fanGrad.addColorStop(0.55, "rgba(242, 153, 74, 0.055)");
  fanGrad.addColorStop(1, "rgba(18, 148, 141, 0.025)");
  ctx.fillStyle = fanGrad;
  ctx.fill();

  // 2. 贴合红光与紫光波峰起伏的矢量描边轮廓（真正的“选中波浪条”视觉！）
  const traceCurve = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };

  // 外包络柔和虚线框（呈弯曲扇形，随波浪起伏）
  traceWaveFanEnvelope();
  ctx.strokeStyle = rgba(COLORS.brandTeal, 0.42);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = -t * 24;
  ctx.stroke();
  ctx.setLineDash([]);

  // 红光波浪矢量路径高亮 + 紫光波浪矢量路径高亮
  [
    { pts: redPts, stroke: "#D94E58", halo: "rgba(229, 107, 111, 0.24)" },
    { pts: violetPts, stroke: "#7C58B0", halo: "rgba(142, 108, 187, 0.26)" },
  ].forEach(({ pts, stroke, halo }) => {
    traceCurve(pts);
    ctx.strokeStyle = halo;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();

    traceCurve(pts);
    ctx.strokeStyle = locked ? COLORS.brandTeal : stroke;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([9, 5]);
    ctx.lineDashOffset = -t * 30;
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // 3. 沿红光、中轴绿光、紫光波列分布的矢量贝塞尔锚点与切线操控杆！
  const anchorIndices = [16, 44, 72];
  for (const idx of anchorIndices) {
    for (const pts of [redPts, violetPts]) {
      const p = pts[idx];
      const pPrev = pts[Math.max(0, idx - 3)];
      const pNext = pts[Math.min(pts.length - 1, idx + 3)];
      const tx = pNext.x - pPrev.x;
      const ty = pNext.y - pPrev.y;
      const tLen = Math.hypot(tx, ty) || 1;
      const ux = (tx / tLen) * 20;
      const uy = (ty / tLen) * 20;

      // 贝塞尔切线杆 + 两端小圆柄（一眼看懂这是在编辑曲线路径！）
      if (idx === 44) {
        ctx.strokeStyle = rgba(COLORS.brandTeal, 0.65);
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(p.x - ux, p.y - uy);
        ctx.lineTo(p.x + ux, p.y + uy);
        ctx.stroke();

        ctx.fillStyle = COLORS.brandAmber;
        ctx.beginPath();
        ctx.arc(p.x - ux, p.y - uy, 2.8, 0, TAU);
        ctx.arc(p.x + ux, p.y + uy, 2.8, 0, TAU);
        ctx.fill();
      }

      // 主矢量路径节点
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = COLORS.brandTeal;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, idx === 44 ? 5.2 : 4.1, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 4. 咬合瞬间的波浪脉冲光丝（沿曲线向外轻柔扩散一次）
  if (snapPulseU > 0.01 && snapPulseU < 0.99) {
    const env = 1 - snapPulseU;
    traceWaveFanEnvelope();
    ctx.strokeStyle = rgba(COLORS.brandTeal, env * 0.62);
    ctx.lineWidth = lerp(2.5, 16, easeEditorialOut(snapPulseU));
    ctx.stroke();
  }

  // 5. 严格裁切在弯曲波扇内的暖杏水墨流光涟漪（115.2 – 116.6s，波浪焕新 v2！）
  if (rippleU > 0.005 && rippleU < 0.995) {
    ctx.save();
    traceWaveFanEnvelope();
    ctx.clip();

    const pSweep = easeEditorialInOut(rippleU);
    const waveFrontIdx = Math.floor(pSweep * (midPts.length - 1));
    const wfPt = midPts[clamp(waveFrontIdx, 0, midPts.length - 1)];
    const env = Math.sin(rippleU * Math.PI);

    // 沿波扇推进的暖金-青绿水彩光幕
    const rg = ctx.createRadialGradient(wfPt.x, wfPt.y, 10, wfPt.x, wfPt.y, 260);
    rg.addColorStop(0, rgba("#FFF9E4", 0.78 * env));
    rg.addColorStop(0.38, rgba(COLORS.brandAmber, 0.42 * env));
    rg.addColorStop(0.75, rgba(COLORS.brandTeal, 0.22 * env));
    rg.addColorStop(1, "rgba(18, 148, 141, 0)");
    ctx.fillStyle = rg;
    ctx.fillRect(redPts[0].x - 60, redPts[0].y - 80, 1200, 900);

    // 随波峰跳跃的 3 枚四芒星闪烁
    const rIdx = clamp(Math.floor(pSweep * (redPts.length - 1)), 0, redPts.length - 1);
    const vIdx = clamp(Math.floor(pSweep * (violetPts.length - 1)), 0, violetPts.length - 1);
    drawStarlightGlint(ctx, redPts[rIdx].x, redPts[rIdx].y, 22 * env, "#FFFFFF", "#E56B6F", 0.95, t * 3);
    drawStarlightGlint(ctx, wfPt.x, wfPt.y, 26 * env, "#FFFFFF", COLORS.brandAmber, 0.95, t * 2.5);
    drawStarlightGlint(ctx, violetPts[vIdx].x, violetPts[vIdx].y, 22 * env, "#FFFFFF", "#8E6CBB", 0.95, -t * 3);
    ctx.restore();
  }

  // 6. 红光上方清雅浮标（避开棱镜，精准悬于波浪带之上）
  if (badgeText) {
    const anchor = redPts[24];
    drawSemanticPill(ctx, anchor.x - 16, anchor.y - 52, badgeText, COLORS.brandTeal, alpha);
  }

  ctx.restore();
}

/**
 * 在给定矩形内按 1920x1080 坐标系缩放绘制主线暖纸彩虹动画
 * 支持分别独立控制波束 v2Factor、棱镜 prismGlowBoost、测角环 brassBoost，以及描图纸 v1/v2 对比！
 */
export function drawRainbowInRect(
  ctx,
  rect,
  {
    t = 92,
    v2Factor = 0,
    saturationBoost = 0,
    prismGlowBoost = 0,
    brassBoost = 0,
    compareSplitNormX = null, // [0, 1] 描图纸对比竖线（左侧 v1，右侧 v2）
  } = {}
) {
  const sx = rect.w / STAGE_W;
  const sy = rect.h / STAGE_H;

  const drawPass = (passV2, passSat, passPrism, passBrass) => {
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
      brassBoost: passBrass,
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
      prismGlowBoost: passPrism,
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
    // 描图纸对比模式：左侧显示 v1 初稿，右侧显示 v2 波束局部精修
    const splitPx = clamp(compareSplitNormX) * STAGE_W;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitPx, STAGE_H);
    ctx.clip();
    opticsInfo = drawPass(0, 0, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(splitPx, 0, STAGE_W - splitPx, STAGE_H);
    ctx.clip();
    opticsInfo = drawPass(1, saturationBoost, prismGlowBoost, brassBoost);
    ctx.restore();
  } else {
    opticsInfo = drawPass(v2Factor, saturationBoost, prismGlowBoost, brassBoost);
  }

  ctx.restore();

  return { opticsInfo };
}

export function renderAct04({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  const wbRect = UI_GEOMETRY.workbench.frameRect; // { x: 112, y: 82, w: 1232, h: 693 }

  // ── 关键阶段进度 ──
  const pPullback = easeEditorialInOut(segProgress(t, 93.2, 96.8));
  const pChrome = easeEditorialOut(segProgress(t, 94.0, 97.2));

  // 巡检三类矢量几何对象（97.4–101.2s）：先掠过三角棱锥，再掠过测角圆环，再锁定彩色波浪带！
  const hoverPrismA =
    easeEditorialOut(segProgress(t, 97.4, 97.9)) * (1 - easeEditorialInOut(segProgress(t, 98.9, 99.4)));
  const hoverRingA =
    easeEditorialOut(segProgress(t, 99.3, 99.8)) * (1 - easeEditorialInOut(segProgress(t, 100.8, 101.3)));

  // ① 波浪带锁定与 v1->v2 修订（101.3 – 123.8s）
  const waveLockIn = springProgress(segProgress(t, 101.3, 102.5), 0.55, 0.78, 18);
  const waveLockOut = easeEditorialInOut(segProgress(t, 123.0, 123.9));
  const waveSelA = clamp(waveLockIn * (1 - waveLockOut));
  const pWaveRipple = segProgress(t, 115.2, 116.6);
  const pV2Reveal = easeEditorialOut(segProgress(t, 115.5, 116.8));
  const pVerFlipV2 = segProgress(t, 117.3, 118.0);

  // 描图纸 v1/v2 对比（124.0 – 128.8s）
  const pCompareIn = easeEditorialOut(segProgress(t, 124.0, 124.7));
  const pCompareOut = easeEditorialInOut(segProgress(t, 128.1, 128.8));
  const compareActive = t >= 124.0 && t <= 128.8;

  // ② 三角棱锥选中与 v2->v3 晶体折光精修（128.9 – 133.1s）
  const prismLockIn = springProgress(segProgress(t, 129.1, 130.0), 0.55, 0.78, 18);
  const prismLockOut = easeEditorialInOut(segProgress(t, 132.4, 133.1));
  const prismSelA = clamp(prismLockIn * (1 - prismLockOut));
  const pPrismShimmer = segProgress(t, 130.3, 132.0);
  const pPrismGlow = easeEditorialOut(segProgress(t, 130.6, 132.1));
  const pVerFlipV3 = segProgress(t, 131.6, 132.2);

  // ③ 测角圆环选中与 v3->v4 黄铜刻度强化（133.1 – 137.2s）
  const ringLockIn = springProgress(segProgress(t, 133.4, 134.3), 0.55, 0.78, 18);
  const ringLockOut = easeEditorialInOut(segProgress(t, 136.5, 137.2));
  const ringSelA = clamp(ringLockIn * (1 - ringLockOut));
  const pRingSweep = segProgress(t, 134.5, 136.2);
  const pBrassBoost = easeEditorialOut(segProgress(t, 134.8, 136.3));
  const pVerFlipV4 = segProgress(t, 135.8, 136.4);

  // ── 1. 摄像机优雅微推（聚焦右侧波浪与对话区 -> 退回全貌 -> 轻推棱镜与测角环） ──
  const pFocusPush = easeEditorialInOut(segProgress(t, 102.0, 103.8));
  const pFocusRelease = easeEditorialInOut(segProgress(t, 118.4, 120.4));
  const focusAmt = pFocusPush * (1 - pFocusRelease);
  const multiEditZoom =
    easeEditorialInOut(segProgress(t, 129.0, 130.2)) *
    (1 - easeEditorialInOut(segProgress(t, 136.4, 137.6)));

  const camZoom = 1.0 + focusAmt * 0.11 + multiEditZoom * 0.12;
  const camX = STAGE_W * 0.5 + focusAmt * 84 + multiEditZoom * -125;
  const camY = STAGE_H * 0.5 + focusAmt * 12 + multiEditZoom * -35;
  camera.set({ x: camX, y: camY, zoom: camZoom });

  // ── 2. 暖纸桌面底色 ──
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: 0.75,
    amberGlow: 0.85,
    dotGridAlpha: 0.02,
  });

  // ── 3. 当前视频画幅矩形（从 100% 全屏平滑收缩到 64.2% 工作台画幅窗） ──
  const curFrameRect = {
    x: lerp(0, wbRect.x, pPullback),
    y: lerp(0, wbRect.y, pPullback),
    w: lerp(STAGE_W, wbRect.w, pPullback),
    h: lerp(STAGE_H, wbRect.h, pPullback),
  };

  // 画幅坐标 (0..1920, 0..1080) -> 世界坐标 / 屏幕坐标精确映射
  const frameToWorld = (fx, fy) => ({
    x: curFrameRect.x + (fx / STAGE_W) * curFrameRect.w,
    y: curFrameRect.y + (fy / STAGE_H) * curFrameRect.h,
  });
  const frameToScreen = (fx, fy) => {
    const w = frameToWorld(fx, fy);
    return camera.worldToScreen(w.x, w.y);
  };

  let compareNormX = null;
  if (compareActive) {
    const u1 = easeEditorialInOut(segProgress(t, 124.2, 126.3));
    const u2 = easeEditorialInOut(segProgress(t, 126.5, 128.4));
    compareNormX = t < 126.4 ? lerp(0.18, 0.86, u1) : lerp(0.86, 0.24, u2);
  }

  const localV2 = t >= 115.5 ? pV2Reveal : 0;
  const waveTime = 92.0 + (t - 92.0) * 0.45;

  // ── 4. Layer 1 绘制实时彩虹预览画面 ──
  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  const { opticsInfo } = drawRainbowInRect(worldCtx, curFrameRect, {
    t: waveTime,
    v2Factor: localV2,
    saturationBoost: pV2Reveal * 0.45,
    prismGlowBoost: pPrismGlow,
    brassBoost: pBrassBoost,
    compareSplitNormX: compareActive ? compareNormX : null,
  });

  worldCtx.restore();

  // ── 5. Layer 2 真实前端 Workbench 状态同步（随三类语义对象动态切换检视器与版本号！） ──
  if (pChrome > 0.01) {
    const revChars = Math.floor(segProgress(t, 107.4, 113.8) * REV_PROMPT.length + 0.001);
    const revTyped = t < 114.6 ? REV_PROMPT.slice(0, revChars) : "";

    let version = "v1";
    let versionLabel = "v1 · 纸艺编辑风";
    let versionFlip = 0;
    if (t >= 136.1) {
      version = "v4";
      versionLabel = "v4 · 测角环精修";
      versionFlip = pVerFlipV4;
    } else if (t >= 131.9) {
      version = "v3";
      versionLabel = "v3 · 棱镜精修";
      versionFlip = pVerFlipV3;
    } else if (t >= 117.65) {
      version = "v2";
      versionLabel = "v2 · 波束精修";
      versionFlip = pVerFlipV2;
    } else if (pVerFlipV2 > 0) {
      versionFlip = pVerFlipV2;
    }
    if (pVerFlipV3 > 0 && pVerFlipV3 < 1) versionFlip = pVerFlipV3;
    if (pVerFlipV4 > 0 && pVerFlipV4 < 1) versionFlip = pVerFlipV4;

    // 根据当前巡检/锁定阶段动态决定活跃语义对象
    let activeObj = SEMANTIC_OBJECTS.waves;
    let inspAlpha = 0;
    let isSelected = false;
    let statusText = "直接点选波浪带、三角棱锥或测角圆环，只改你关心的局部对象。";

    if (t >= 97.4 && t < 99.3) {
      activeObj = { ...SEMANTIC_OBJECTS.prism, attachText: "悬停预览" };
      inspAlpha = hoverPrismA;
      isSelected = hoverPrismA > 0.3;
    } else if (t >= 99.3 && t < 101.3) {
      activeObj = { ...SEMANTIC_OBJECTS.ring, attachText: "悬停预览" };
      inspAlpha = hoverRingA;
      isSelected = hoverRingA > 0.3;
    } else if (t >= 101.3 && t < 123.9) {
      activeObj = SEMANTIC_OBJECTS.waves;
      inspAlpha = easeEditorialOut(segProgress(t, 101.6, 102.6)) * (1 - waveLockOut);
      isSelected = true;
      statusText =
        t >= 117.65
          ? "v2 波束精修已生效：仅更新彩色波浪带，三棱镜与测角圆环 100% 保持原样。"
          : "矢量波浪轮廓仅用于编辑定位，不进入最终导出画面。";
    } else if (t >= 129.0 && t < 133.1) {
      activeObj = SEMANTIC_OBJECTS.prism;
      inspAlpha = prismSelA;
      isSelected = prismSelA > 0.25;
      statusText = "v3 棱镜精修：仅增强磨砂三角棱锥折光质感，波浪带与测角环保持锁定。";
    } else if (t >= 133.1 && t < 137.3) {
      activeObj = SEMANTIC_OBJECTS.ring;
      inspAlpha = ringSelA;
      isSelected = ringSelA > 0.25;
      statusText = "v4 圆环精修：仅强化黄铜测角环刻度与星标，其余对象零串改。";
    } else if (t >= 137.3) {
      statusText = "波浪带、三角棱锥与测角圆环三项精修均已就绪，点击导出 1080P 60fps 成片。";
    }

    const playheadPct = lerp(66, 74, easeEditorialInOut(segProgress(t, 129.0, 136.5)));
    const kfNodePct = lerp(44, 62, easeEditorialInOut(segProgress(t, 129.0, 136.5)));

    ui.renderWorkbench({
      visible: true,
      alpha: 1,
      chromeReveal: pChrome,
      version,
      versionLabel,
      versionFlip,
      selected: isSelected,
      selectedObject: activeObj,
      inspectorAlpha: inspAlpha,
      inputChip: t >= 104.2 && t < 114.6,
      inputChipLabel: "~ prism-spectrum-waves ×",
      inputText: revTyped,
      inputCaret: t >= 107.0 && t < 114.4 && Math.sin(t * 7.5) > -0.3,
      inputFocused: t >= 106.8 && t < 114.7,
      sendPressed: t >= 114.55 && t < 115.05,
      showUserMsg: t >= 114.65,
      showAiDoneMsg: t >= 117.7,
      playheadPct,
      kfNodePct,
      timeCode: t >= 133.1 ? "01:44 / 02:45" : t >= 129.0 ? "01:40 / 02:45" : "01:36 / 02:45",
      exportPressed: t >= 138.8 && t < 139.5,
      statusText,
    });
  }

  // ── 6. Layer 3 Overlay：三类真正贴合几何形态的矢量选区（严格裁切在视频画幅内） ──
  const frameScreen = camera.worldRectToScreen(curFrameRect);
  overlayCtx.save();
  roundRectPath(overlayCtx, frameScreen.x, frameScreen.y, frameScreen.w, frameScreen.h, 12);
  overlayCtx.clip();

  // A. 巡检阶段悬停「▲ 三角棱锥」(97.4–99.4s)
  if (hoverPrismA > 0.01) {
    drawTriangleSelection(overlayCtx, opticsInfo.geom, frameToScreen, {
      alpha: hoverPrismA,
      locked: false,
      t,
      badgeText: "▲ glass-prism-body · 磨砂三角棱锥",
    });
  }

  // B. 巡检阶段悬停「◯ 测角圆环」(99.3–101.3s)
  if (hoverRingA > 0.01) {
    drawRingSelection(overlayCtx, 640, 540, 365, frameToScreen, {
      alpha: hoverRingA,
      locked: false,
      t,
      badgeText: "◯ brass-goniometer · 光学测角圆环",
    });
  }

  // C. 锁定「~ 彩色波浪带」(101.3–123.9s) + 沿弯曲波扇流淌的暖杏水墨涟漪
  if (waveSelA > 0.01) {
    drawCurvedWaveRibbonSelection(overlayCtx, opticsInfo.bandMeta, waveTime, frameToScreen, {
      alpha: waveSelA,
      locked: true,
      t,
      rippleU: pWaveRipple,
      snapPulseU: segProgress(t, 101.6, 102.9),
      badgeText: "~ prism-spectrum-waves · 彩色波浪带已锁定",
    });
  }

  // D. 锁定并修订「▲ 三角棱锥」(129.1–133.1s，v2 -> v3)
  if (prismSelA > 0.01) {
    drawTriangleSelection(overlayCtx, opticsInfo.geom, frameToScreen, {
      alpha: prismSelA,
      locked: true,
      t,
      shimmerU: pPrismShimmer,
      badgeText: "▲ glass-prism-body · 棱锥局部锁定",
    });
  }

  // E. 锁定并修订「◯ 光学测角圆环」(133.4–137.2s，v3 -> v4)
  if (ringSelA > 0.01) {
    drawRingSelection(overlayCtx, 640, 540, 365, frameToScreen, {
      alpha: ringSelA,
      locked: true,
      t,
      sweepU: pRingSweep,
      badgeText: "◯ brass-goniometer · 圆环局部锁定",
    });
  }

  overlayCtx.restore();

  // ── 描图纸对比竖线（124.0 – 128.8s） ──
  if (compareActive) {
    const cAlpha = pCompareIn * (1 - pCompareOut);
    const lineX = frameScreen.x + compareNormX * frameScreen.w;

    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(cAlpha);

    const sheetGrad = overlayCtx.createLinearGradient(lineX - 42, 0, lineX, 0);
    sheetGrad.addColorStop(0, "rgba(255, 253, 249, 0)");
    sheetGrad.addColorStop(1, "rgba(255, 253, 249, 0.36)");
    overlayCtx.fillStyle = sheetGrad;
    overlayCtx.fillRect(lineX - 42, frameScreen.y, 42, frameScreen.h);

    overlayCtx.strokeStyle = COLORS.brandTeal;
    overlayCtx.lineWidth = 2.6;
    overlayCtx.beginPath();
    overlayCtx.moveTo(lineX, frameScreen.y);
    overlayCtx.lineTo(lineX, frameScreen.y + frameScreen.h);
    overlayCtx.stroke();

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
    if (frameScreen.x + frameScreen.w - lineX > 130) drawBadge(lineX + 16, "v2 波束精修", true);

    overlayCtx.fillStyle = "#FFFDF9";
    overlayCtx.strokeStyle = COLORS.brandTeal;
    overlayCtx.lineWidth = 2.4;
    overlayCtx.beginPath();
    overlayCtx.arc(lineX, frameScreen.y + frameScreen.h * 0.5, 13, 0, TAU);
    overlayCtx.fill();
    overlayCtx.stroke();
    overlayCtx.fillStyle = COLORS.brandAmber;
    overlayCtx.beginPath();
    overlayCtx.arc(lineX, frameScreen.y + frameScreen.h * 0.5, 4, 0, TAU);
    overlayCtx.fill();

    overlayCtx.restore();
  }

  // ── 局部精修浮动反馈胶囊（三角棱锥 v3 / 测角圆环 v4） ──
  if (t >= 130.5 && t <= 132.9) {
    const a = easeEditorialOut(segProgress(t, 130.5, 131.0)) * (1 - easeEditorialInOut(segProgress(t, 132.2, 132.9)));
    const pChip = frameToScreen(640, 745);
    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(a);
    drawPaperCard(overlayCtx, pChip.x - 118, pChip.y - 22, 236, 44, {
      radius: 22,
      fill: "rgba(255, 253, 249, 0.96)",
      stroke: rgba(COLORS.brandTeal, 0.56),
      lineWidth: 1.4,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    overlayCtx.font = `600 13.5px ${FONTS.mono}`;
    overlayCtx.fillStyle = COLORS.brandTealDark;
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";
    overlayCtx.fillText(`▲ 棱镜折光质感 +${Math.round(pPrismGlow * 35)}%`, pChip.x, pChip.y);
    overlayCtx.restore();
  }

  if (t >= 134.7 && t <= 137.1) {
    const a = easeEditorialOut(segProgress(t, 134.7, 135.2)) * (1 - easeEditorialInOut(segProgress(t, 136.4, 137.1)));
    const pChip = frameToScreen(640, 146);
    overlayCtx.save();
    overlayCtx.globalAlpha = clamp(a);
    drawPaperCard(overlayCtx, pChip.x - 120, pChip.y - 22, 240, 44, {
      radius: 22,
      fill: "rgba(255, 253, 249, 0.96)",
      stroke: rgba(COLORS.brandAmber, 0.60),
      lineWidth: 1.4,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    overlayCtx.font = `600 13.5px ${FONTS.mono}`;
    overlayCtx.fillStyle = "#9D5614";
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";
    overlayCtx.fillText(`◯ 黄铜测角刻度强化 +${Math.round(pBrassBoost * 40)}%`, pChip.x, pChip.y);
    overlayCtx.restore();
  }

  // ── 7. 顶层「棱片」主角连续飞行轨迹（巡检三棱镜 -> 测角环 -> 点选波浪带 -> 再精修棱锥与圆环 -> 轻点导出！） ──
  const prismW = frameToWorld(640, 520);
  const ringTopW = frameToWorld(640 + 258, 540 - 258); // 圆环右上 45° 弧缘
  const waveTargetW = frameToWorld(1160, 585); // 彩虹波浪带核心
  const expBtn = UI_GEOMETRY.workbench.exportBtnCenter;

  const flightPath = (time) => {
    if (time < 93.4) {
      return { x: 1080, y: 460 + Math.sin(time * 3) * 6 };
    }
    if (time < 97.2) {
      const u = easeEditorialInOut(segProgress(time, 93.4, 97.2));
      return bezierPoint(
        { x: 1080, y: 460 },
        { x: 1120, y: 310 },
        { x: 960, y: 230 },
        { x: 740, y: 255 },
        u
      );
    }
    if (time < 99.3) {
      // 轻掠并悬停在「▲ 三角棱锥」旁
      const u = easeEditorialInOut(segProgress(time, 97.2, 98.1));
      const p = bezierPoint(
        { x: 740, y: 255 },
        { x: 640, y: 280 },
        { x: prismW.x + 28, y: prismW.y - 60 },
        { x: prismW.x + 14, y: prismW.y - 12 },
        u
      );
      return { x: p.x, y: p.y + Math.sin(time * 4) * 3 };
    }
    if (time < 101.2) {
      // 滑向「◯ 光学测角圆环」右上弧缘
      const u = easeEditorialInOut(segProgress(time, 99.3, 100.1));
      const p = bezierPoint(
        { x: prismW.x + 14, y: prismW.y - 12 },
        { x: prismW.x + 90, y: prismW.y - 120 },
        { x: ringTopW.x - 30, y: ringTopW.y - 20 },
        ringTopW,
        u
      );
      return { x: p.x, y: p.y + Math.cos(time * 4) * 3 };
    }
    if (time < 102.4) {
      // 俯冲点击「~ 彩色波浪带」
      const u = easeEditorialInOut(segProgress(time, 101.2, 102.0));
      return bezierPoint(
        ringTopW,
        { x: ringTopW.x + 140, y: ringTopW.y + 80 },
        { x: waveTargetW.x - 40, y: waveTargetW.y - 70 },
        waveTargetW,
        u
      );
    }
    if (time < 123.8) {
      // 伴随波浪带呼吸轻游，审视 Co-Director 输入与 v2 局部焕新
      const hoverX = waveTargetW.x + Math.sin((time - 102.4) * 0.9) * 18;
      const hoverY = waveTargetW.y - 14 + Math.cos((time - 102.4) * 1.3) * 8;
      return { x: hoverX, y: hoverY };
    }
    if (time < 128.8) {
      const curX = curFrameRect.x + (compareNormX ?? 0.5) * curFrameRect.w;
      return { x: curX, y: curFrameRect.y + curFrameRect.h * 0.5 };
    }
    if (time < 133.1) {
      // 精修 ②：飞回点选「▲ 三角棱锥」
      const u = easeEditorialInOut(segProgress(time, 128.8, 129.6));
      const p = bezierPoint(
        { x: curFrameRect.x + curFrameRect.w * 0.28, y: curFrameRect.y + curFrameRect.h * 0.5 },
        { x: prismW.x - 90, y: prismW.y - 70 },
        { x: prismW.x - 20, y: prismW.y - 45 },
        { x: prismW.x + 10, y: prismW.y - 6 },
        u
      );
      return { x: p.x, y: p.y + Math.sin(time * 4.2) * 3 };
    }
    if (time < 137.2) {
      // 精修 ③：顺势滑向「◯ 光学测角圆环」
      const u = easeEditorialInOut(segProgress(time, 133.1, 133.9));
      const p = bezierPoint(
        { x: prismW.x + 10, y: prismW.y - 6 },
        { x: prismW.x + 80, y: prismW.y - 110 },
        { x: ringTopW.x - 25, y: ringTopW.y - 18 },
        ringTopW,
        u
      );
      return { x: p.x, y: p.y + Math.cos(time * 4.2) * 3 };
    }
    if (time < 139.25) {
      // 飞落右上角「导出 MP4」轻点！
      const u = easeEditorialInOut(segProgress(time, 137.2, 138.8));
      const p = bezierPoint(
        ringTopW,
        { x: 1180, y: 160 },
        { x: expBtn.x - 100, y: expBtn.y + 85 },
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
  const trailW = sampleTrailFromPath(flightPath, t, 0.44, 18);
  const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

  const hideForCompareLine = compareActive ? 1 - pCompareIn * (1 - pCompareOut) : 1;

  if (hideForCompareLine > 0.02) {
    const startSize = lerp(38, 30, pPullback);
    const exportVanish = 1 - easeEditorialInOut(segProgress(t, 139.35, 140.0));
    const activePulse = Math.max(
      pWaveRipple > 0 && pWaveRipple < 1 ? 1 : 0,
      pPrismShimmer > 0 && pPrismShimmer < 1 ? 1 : 0,
      pRingSweep > 0 && pRingSweep < 1 ? 1 : 0,
      t >= 138.7 ? 0.95 : 0.35
    );
    drawPrismFold(overlayCtx, {
      x: posS.x,
      y: posS.y,
      mode: "GLIDE",
      size: startSize * camera.zoom,
      angle: lerp(0.16, 0, easeEditorialOut(segProgress(t, 92.8, 94.0))),
      alpha: hideForCompareLine * exportVanish,
      t,
      coreGlow: activePulse,
      trail: trailS,
      trailAlpha: 0.78,
    });
  }
}
