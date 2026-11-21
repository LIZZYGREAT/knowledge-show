/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 刊物工艺饰纹与炫技视觉组件库
 * 风格定位：Warm Editorial Craft × Luxury Pop-Up Book × Brass Optical Instruments × Luminous Watercolor
 * 严守美学边界：零黑底科幻/霓虹故障风，全部基于暖白纸面、硫酸纸叠色、黄铜精密刻度与阳光焦散
 */

import { COLORS, SPECTRUM, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { clamp, lerp, rgba, mulberry32, easeEditorialOut, TAU } from "../core/math.js";
import { roundRectPath, drawPaperCard } from "../core/paper.js";

const DUST_MOTES = (() => {
  const r = mulberry32(77123);
  return Array.from({ length: 48 }, () => ({
    x: r() * STAGE_W,
    y: r() * STAGE_H,
    rad: 1.5 + r() * 3.8,
    speedX: 6 + r() * 14,
    speedY: -5 + r() * 10,
    phase: r() * TAU,
    hue: r() > 0.45 ? COLORS.brandAmber : COLORS.brandTeal,
    alpha: 0.16 + r() * 0.28,
  }));
})();

/**
 * 1. 午后窗棂漫射斜阳与金色空气浮尘（营造极致温暖书桌景深）
 */
export function drawDappledSunlight(ctx, w = STAGE_W, h = STAGE_H, t = 0, alpha = 1) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 三道柔和斜穿画面的午后窗光柱（暖金白）
  const shafts = [
    { x0: -120, w0: 360, angle: 0.32, op: 0.14, drift: 18 },
    { x0: 420, w0: 280, angle: 0.32, op: 0.10, drift: -14 },
    { x0: 1120, w0: 420, angle: 0.32, op: 0.12, drift: 22 },
  ];
  for (let i = 0; i < shafts.length; i++) {
    const s = shafts[i];
    const shift = Math.sin(t * 0.32 + i * 1.8) * s.drift;
    ctx.save();
    ctx.translate(s.x0 + shift, -80);
    ctx.rotate(s.angle);
    const g = ctx.createLinearGradient(0, 0, s.w0, 0);
    g.addColorStop(0, "rgba(255, 248, 232, 0)");
    g.addColorStop(0.35, `rgba(255, 244, 214, ${s.op.toFixed(3)})`);
    g.addColorStop(0.65, `rgba(255, 251, 238, ${(s.op * 1.25).toFixed(3)})`);
    g.addColorStop(1, "rgba(255, 248, 232, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s.w0, h * 1.6);
    ctx.restore();
  }

  // 漂浮在斜阳中的极轻金青微尘光斑
  for (const m of DUST_MOTES) {
    const px = ((m.x + t * m.speedX) % (w + 80)) - 40;
    const py = ((m.y + Math.sin(t * 0.7 + m.phase) * 24 + t * m.speedY * 0.3) % (h + 80) + h + 80) % (h + 80) - 40;
    const twinkle = 0.55 + 0.45 * Math.sin(t * 2.1 + m.phase);
    const rg = ctx.createRadialGradient(px, py, 0, px, py, m.rad * 2.6);
    rg.addColorStop(0, rgba("#FFFDF5", m.alpha * twinkle));
    rg.addColorStop(0.45, rgba(m.hue, m.alpha * 0.55 * twinkle));
    rg.addColorStop(1, rgba(m.hue, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(px, py, m.rad * 2.6, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 2. 精密黄铜与刊物墨线光学测角仪（围绕棱镜缓慢旋转，赋予画面高级机械仪器与典籍质感）
 */
export function drawBrassGoniometer(
  ctx,
  cx,
  cy,
  radius = 335,
  t = 0,
  { alpha = 1, reveal = 1, redDeg = 11.5, violetDeg = 33.6, showVernier = true, brassBoost = 0 } = {}
) {
  const a = clamp(alpha * reveal);
  if (a <= 0.005) return;

  const r = radius * lerp(0.86, 1.0, easeEditorialOut(reveal));
  const slowRot = t * 0.045;
  const bb = clamp(brassBoost);

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);

  // v4 测角环局部精修：温润黄铜外晕光环
  if (bb > 0.02) {
    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.24 * bb);
    ctx.lineWidth = 10 * bb;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }

  // 最外层极细虚线轨道环
  ctx.save();
  ctx.rotate(-slowRot * 0.6);
  ctx.strokeStyle = rgba("#B88648", 0.22 + 0.34 * bb);
  ctx.lineWidth = 1.15 + 0.85 * bb;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, r + 34, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // 轨道上的 4 枚微缩黄铜菱形星标
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * TAU + 0.35;
    const bx = Math.cos(ang) * (r + 34);
    const by = Math.sin(ang) * (r + 34);
    const sz = 5.5 + 3.0 * bb;
    ctx.fillStyle =
      k % 2 === 0
        ? rgba(COLORS.brandAmber, 0.65 + 0.32 * bb)
        : rgba(COLORS.brandTeal, 0.55 + 0.40 * bb);
    ctx.beginPath();
    ctx.moveTo(bx, by - sz);
    ctx.lineTo(bx + sz * 0.82, by);
    ctx.lineTo(bx, by + sz);
    ctx.lineTo(bx - sz * 0.82, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 主黄铜精细刻度环（72 刻度 + 12 主刻度 + 度数小字）
  ctx.save();
  ctx.rotate(slowRot * 0.22);
  ctx.strokeStyle = rgba("#B08042", 0.28 + 0.54 * bb);
  ctx.lineWidth = 1.4 + 1.4 * bb;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = bb > 0.05 ? rgba(COLORS.brandTeal, 0.14 + 0.38 * bb) : "rgba(28, 42, 48, 0.10)";
  ctx.lineWidth = 1 + 0.7 * bb;
  ctx.beginPath();
  ctx.arc(0, 0, r - 14, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 72; i++) {
    const ang = (i / 72) * TAU;
    const isMajor = i % 6 === 0;
    const isMid = i % 3 === 0;
    const r0 = r - (isMajor ? 14 + 5 * bb : isMid ? 9 + 3 * bb : 5 + 2 * bb);
    const r1 = r;
    ctx.strokeStyle = isMajor
      ? rgba("#A26E30", 0.48 + 0.46 * bb)
      : rgba("#1C2A30", 0.16 + 0.26 * bb);
    ctx.lineWidth = isMajor ? 1.6 + 1.0 * bb : 0.9 + 0.45 * bb;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.stroke();

    if (isMajor && showVernier && i % 12 === 0) {
      const deg = (i * 5) % 360;
      const tx = Math.cos(ang) * (r + 17 + 4 * bb);
      const ty = Math.sin(ang) * (r + 17 + 4 * bb);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ang + Math.PI * 0.5);
      ctx.font = `${bb > 0.3 ? 700 : 500} ${(11 + 2 * bb).toFixed(1)}px ${FONTS.mono}`;
      ctx.fillStyle = rgba("#8A602C", 0.55 + 0.42 * bb);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${deg}°`, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();

  // 光谱出射扇区动态色弧（直观标出红光到紫光的折射扇角）
  const aRed = (redDeg * Math.PI) / 180;
  const aViolet = (violetDeg * Math.PI) / 180;
  ctx.save();
  ctx.strokeStyle = "rgba(229, 107, 111, 0.55)";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, r + 7, aRed, lerp(aRed, aViolet, 0.35));
  ctx.stroke();

  ctx.strokeStyle = "rgba(42, 157, 143, 0.55)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 7, lerp(aRed, aViolet, 0.35), lerp(aRed, aViolet, 0.68));
  ctx.stroke();

  ctx.strokeStyle = "rgba(142, 108, 187, 0.62)";
  ctx.beginPath();
  ctx.arc(0, 0, r + 7, lerp(aRed, aViolet, 0.68), aViolet);
  ctx.stroke();
  ctx.restore();

  // 十字准星延伸细参考线
  ctx.strokeStyle = "rgba(28, 42, 48, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r - 58, 0);
  ctx.lineTo(-r - 18, 0);
  ctx.moveTo(r + 18, 0);
  ctx.lineTo(r + 58, 0);
  ctx.moveTo(0, -r - 52);
  ctx.lineTo(0, -r - 18);
  ctx.moveTo(0, r + 18);
  ctx.lineTo(0, r + 52);
  ctx.stroke();

  ctx.restore();
}

/**
 * 3. 呼应 BrandLogo 的精致四芒星折光焦散点（星芒光点）
 */
export function drawStarlightGlint(ctx, x, y, radius = 14, color = "#FFFDF9", accent = COLORS.brandAmber, alpha = 1, rot = 0) {
  if (alpha <= 0.01 || radius <= 0.5) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(x, y);
  ctx.rotate(rot);

  // 柔和彩晕
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.9);
  rg.addColorStop(0, rgba(color, 0.85));
  rg.addColorStop(0.4, rgba(accent, 0.38));
  rg.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.9, 0, TAU);
  ctx.fill();

  // 四芒弯曲星芒（与 BrandLogo.tsx 同源几何！）
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, radius);
  ctx.quadraticCurveTo(0, 0, -radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, -radius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.6, radius * 0.16), 0, TAU);
  ctx.fill();

  ctx.restore();
}

/**
 * 4. 立体书折纸碎屑与彩纸礼花迸发（用于立体书弹开、弹飞误区、涟漪绽放、品牌归位等高光时刻）
 */
export function drawOrigamiConfettiBurst(ctx, ox, oy, progress, { seed = 101, count = 24, spread = 240, alpha = 1 } = {}) {
  const u = clamp(progress);
  if (u <= 0.005 || u >= 0.995 || alpha <= 0.005) return;

  const rand = mulberry32(seed);
  const palette = [
    COLORS.brandTeal,
    COLORS.brandPeriwinkle,
    COLORS.brandAmber,
    "#E56B6F",
    "#E9C46A",
    "#8E6CBB",
  ];
  const fade = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
  const distScale = easeEditorialOut(u);

  ctx.save();
  ctx.globalAlpha = clamp(alpha * fade);

  for (let i = 0; i < count; i++) {
    const ang = rand() * TAU;
    const speed = 0.45 + rand() * 0.85;
    const dist = spread * speed * distScale;
    const gravity = 48 * u * u * (0.6 + rand() * 0.8);
    const px = ox + Math.cos(ang) * dist;
    const py = oy + Math.sin(ang) * dist + gravity;
    const size = 5 + rand() * 9;
    const rot = rand() * TAU + u * (rand() > 0.5 ? 5.5 : -5.5);
    const flip = Math.cos(u * (5 + rand() * 6) + i);
    const color = palette[i % palette.length];
    const kind = i % 3;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(1, Math.max(0.22, Math.abs(flip)));

    if (kind === 0) {
      // 微缩折纸三角形
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.85, size * 0.7);
      ctx.lineTo(-size * 0.85, size * 0.7);
      ctx.closePath();
      ctx.fillStyle = rgba(color, 0.82);
      ctx.fill();
    } else if (kind === 1) {
      // 微缩棱片菱形
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.9);
      ctx.lineTo(size * 0.65, 0);
      ctx.lineTo(0, size * 0.9);
      ctx.lineTo(-size * 0.65, 0);
      ctx.closePath();
      ctx.fillStyle = rgba(color, 0.85);
      ctx.fill();
    } else {
      // 细纸带圆点
      ctx.fillStyle = rgba(color, 0.78);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.42, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 5. 多层立体书折纸层叠山丘与手风琴折页背景（第一幕破纸而出时从纸面轰然撑起！）
 */
export function drawPopupPaperDiorama(ctx, cx, cy, popup = 1, alpha = 1) {
  const p = clamp(popup);
  if (p <= 0.02 || alpha <= 0.005) return;

  ctx.save();
  ctx.globalAlpha = clamp(alpha * Math.min(1, p * 1.4));

  // 底层折纸底座阴影椭圆
  const sh = ctx.createRadialGradient(cx + 28, cy + 122, 16, cx + 28, cy + 122, 430 * p);
  sh.addColorStop(0, "rgba(28, 52, 58, 0.11)");
  sh.addColorStop(0.65, "rgba(28, 52, 58, 0.04)");
  sh.addColorStop(1, "rgba(28, 52, 58, 0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(cx + 28, cy + 126, 430 * p, 64 * p, 0, 0, TAU);
  ctx.fill();

  // 后景双层暖纸剪纸拱门与折痕山峦（随 popup 从底线垂直立起！）
  const baseY = cy + 114;
  const hScale = easeEditorialOut(p);

  // 远层青灰暖纸立体折峰
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 390, baseY);
  ctx.lineTo(cx - 240, baseY - 142 * hScale);
  ctx.lineTo(cx - 120, baseY - 46 * hScale);
  ctx.lineTo(cx + 155, baseY - 196 * hScale);
  ctx.lineTo(cx + 370, baseY);
  ctx.closePath();
  ctx.fillStyle = "rgba(232, 241, 238, 0.56)";
  ctx.fill();
  ctx.strokeStyle = "rgba(18, 148, 141, 0.16)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 中央立体折痕线
  ctx.beginPath();
  ctx.moveTo(cx - 240, baseY - 142 * hScale);
  ctx.lineTo(cx - 210, baseY);
  ctx.moveTo(cx + 155, baseY - 196 * hScale);
  ctx.lineTo(cx + 185, baseY);
  ctx.strokeStyle = "rgba(28, 42, 48, 0.09)";
  ctx.stroke();
  ctx.restore();

  // 立体书展开纸面装订中缝与折痕尺标
  ctx.strokeStyle = "rgba(184, 134, 72, 0.25)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(cx - 460 * p, baseY);
  ctx.lineTo(cx + 520 * p, baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 纸台边缘微缩折角立签
  if (p > 0.45) {
    const tagA = (p - 0.45) / 0.55;
    ctx.save();
    ctx.globalAlpha = clamp(alpha * tagA * 0.72);
    ctx.font = `500 12.5px ${FONTS.mono}`;
    ctx.fillStyle = "rgba(138, 96, 44, 0.75)";
    ctx.fillText("FIG. 01 · PRISM DISPERSION STAGE", cx - 380, baseY + 26);
    ctx.fillText("n(λ) · 405–680nm", cx + 220, baseY + 26);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * 6. 精致刊物页边印刷裁切线与装帧角标（让每一帧都像高定印刷画册）
 */
export function drawEditorialPrintMarks(ctx, w = STAGE_W, h = STAGE_H, { alpha = 0.45, issue = "VOL.01 · OPTICS & MOTION" } = {}) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  const m = 34;
  const len = 18;
  ctx.strokeStyle = "rgba(28, 42, 48, 0.20)";
  ctx.lineWidth = 1.1;

  // 四角 L 形裁切印刷标
  const corners = [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * len, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * len);
    ctx.stroke();
  }

  // 顶部极克制刊头细标
  ctx.font = `500 11.5px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.62)";
  ctx.textAlign = "left";
  ctx.fillText("KNOWLEDGE.SHOW(ME)", m + 28, m + 5);
  ctx.textAlign = "right";
  ctx.fillText(issue, w - m - 28, m + 5);
  ctx.restore();
}

/**
 * 7. 精致黄铜直尺（用于第一幕书桌静物与开场质感）
 */
export function drawBrassRuler(ctx, x, y, width = 560, height = 38, angle = 0, alpha = 1) {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.shadowColor = "rgba(28, 42, 48, 0.14)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#EBD5A7");
  grad.addColorStop(0.5, "#DFC086");
  grad.addColorStop(1, "#CCA766");
  roundRectPath(ctx, 0, 0, width, height, 4);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(116, 82, 34, 0.45)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 毫米刻度线
  const ticks = Math.floor((width - 28) / 8);
  for (let i = 0; i <= ticks; i++) {
    const tx = 14 + i * 8;
    const isCm = i % 5 === 0;
    const th = isCm ? 14 : 7;
    ctx.strokeStyle = isCm ? "rgba(74, 52, 22, 0.65)" : "rgba(74, 52, 22, 0.34)";
    ctx.lineWidth = isCm ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx, th);
    ctx.stroke();
    if (isCm && i % 10 === 0 && i > 0) {
      ctx.font = `600 9.5px ${FONTS.mono}`;
      ctx.fillStyle = "rgba(74, 52, 22, 0.68)";
      ctx.textAlign = "center";
      ctx.fillText(String(i / 5), tx, 24);
    }
  }

  ctx.restore();
}
