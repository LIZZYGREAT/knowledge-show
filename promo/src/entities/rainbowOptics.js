/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 阳光书桌纸面光学与 7 股水彩波动彩虹引擎（炫技高定版）
 * 主案例：「白光经过棱镜，为何散出彩虹？」
 * 视觉升级：
 *   - 棱镜内部多层晶体折射焦散面 + 四芒星高光闪烁
 *   - 7 股水彩丝带叠加「相速度行进光子珠」与「垂直波前参考短线」，肉眼直观感知红快紫慢
 *   - 三种画风（paper-editorial / modern-graphic / narrative-collage）全面拉满材质与构图辨识度
 */

import { COLORS, SPECTRUM, FONTS, STYLE_PROFILES } from "../config/tokens.js";
import { clamp, lerp, rgba, mulberry32, smoothstep, TAU } from "../core/math.js";
import { drawStarlightGlint } from "./ornaments.js";

const SUN_DUST = (() => {
  const r = mulberry32(8831);
  return Array.from({ length: 42 }, () => ({
    u: r(),
    v: (r() - 0.5) * 2.1,
    rad: 1.3 + r() * 2.9,
    phase: r() * TAU,
    speed: 0.45 + r() * 0.85,
  }));
})();

export function getPrismGeometry(cx = 760, cy = 560, size = 250, popup = 1) {
  const liftY = lerp(22, 0, popup);
  const top = { x: cx, y: cy - size * 0.64 + liftY };
  const left = { x: cx - size * 0.58, y: cy + size * 0.44 };
  const right = { x: cx + size * 0.58, y: cy + size * 0.44 };
  const depthX = size * 0.155 * popup;
  const depthY = -size * 0.085 * popup;
  const backTop = { x: top.x + depthX, y: top.y + depthY };
  const backRight = { x: right.x + depthX, y: right.y + depthY };
  return { top, left, right, backTop, backRight, cx, cy, size };
}

/**
 * 绘制纸面倾斜暖白阳光束（18° 入射，带多层光束丝与午后金尘）
 */
function drawSunbeam(ctx, geom, { t = 0, beamProgress = 1, alpha = 1, styleId = "paper-editorial" }) {
  if (beamProgress <= 0.005 || alpha <= 0.005) return null;
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];

  const hitX = lerp(geom.left.x, geom.top.x, 0.56);
  const hitY = lerp(geom.left.y, geom.top.y, 0.56);
  const incAngle = (18 * Math.PI) / 180;
  const beamLen = 960;
  const startX = hitX - Math.cos(incAngle) * beamLen;
  const startY = hitY - Math.sin(incAngle) * beamLen;

  const curEndX = lerp(startX, hitX, beamProgress);
  const curEndY = lerp(startY, hitY, beamProgress);
  const nx = -Math.sin(incAngle);
  const ny = Math.cos(incAngle);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  if (styleId === "modern-graphic") {
    // Bauhaus 现代图形风：双层硬边几何光带 + 粗黑轮廓 + 方向箭头标
    ctx.beginPath();
    ctx.moveTo(startX + nx * 22, startY + ny * 22);
    ctx.lineTo(curEndX + nx * 16, curEndY + ny * 16);
    ctx.lineTo(curEndX - nx * 16, curEndY - ny * 16);
    ctx.lineTo(startX - nx * 22, startY - ny * 22);
    ctx.closePath();
    ctx.fillStyle = "#FFF7DC";
    ctx.fill();
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // 中央明快几何流向短线
    ctx.strokeStyle = "#F0833A";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = -t * 70;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curEndX, curEndY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // 暖纸刊物风 / 叙事拼贴风：宽幅柔金空气外晕 + 5 股细腻白光游丝 + 漂浮金尘
    const outerWide = 66;
    const outerNarrow = 24;

    const outerGrad = ctx.createLinearGradient(startX, startY, curEndX, curEndY);
    outerGrad.addColorStop(0, "rgba(255, 250, 236, 0)");
    outerGrad.addColorStop(0.28, "rgba(255, 241, 206, 0.34)");
    outerGrad.addColorStop(0.85, "rgba(255, 249, 234, 0.72)");
    outerGrad.addColorStop(1, "rgba(255, 253, 246, 0.94)");

    ctx.beginPath();
    ctx.moveTo(startX + nx * outerWide, startY + ny * outerWide);
    ctx.lineTo(curEndX + nx * outerNarrow, curEndY + ny * outerNarrow);
    ctx.lineTo(curEndX - nx * outerNarrow, curEndY - ny * outerNarrow);
    ctx.lineTo(startX - nx * outerWide, startY - ny * outerWide);
    ctx.closePath();
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // 内部 5 股微动白光游丝（隐喻白光内含多色复合波）
    const offsets = [-11, -5.5, 0, 5.5, 11];
    offsets.forEach((off, idx) => {
      ctx.beginPath();
      ctx.moveTo(startX + nx * off, startY + ny * off);
      ctx.lineTo(curEndX + nx * (off * 0.65), curEndY + ny * (off * 0.65));
      ctx.strokeStyle =
        idx === 2
          ? "rgba(255, 255, 255, 0.96)"
          : idx === 1 || idx === 3
            ? "rgba(248, 212, 148, 0.58)"
            : "rgba(218, 242, 238, 0.45)";
      ctx.lineWidth = idx === 2 ? 4.8 : 1.7;
      ctx.stroke();
    });

    // 沿白光流动的暖白光脉冲微粒
    for (let p = 0; p < 7; p++) {
      const u = ((p / 7 + t * 0.24) % 1);
      if (u > beamProgress) continue;
      const px = lerp(startX, hitX, u);
      const py = lerp(startY, hitY, u);
      ctx.fillStyle = `rgba(255, 254, 248, ${(0.85 * Math.sin(u * Math.PI)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, TAU);
      ctx.fill();
    }

    // 午后光线金尘
    for (const d of SUN_DUST) {
      if (d.u > beamProgress) continue;
      const bx = lerp(startX, hitX, d.u);
      const by = lerp(startY, hitY, d.u);
      const drift = Math.sin(t * d.speed + d.phase) * 8;
      const px = bx + nx * (d.v * 24 + drift);
      const py = by + ny * (d.v * 24 + drift);
      ctx.fillStyle = `rgba(242, 178, 92, ${(0.34 + 0.22 * Math.sin(t * 2.2 + d.phase)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, d.rad, 0, TAU);
      ctx.fill();
    }
  }

  // 入射光斑接触点：精致四芒星折光闪烁！
  if (beamProgress > 0.9) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 4.2);
    drawStarlightGlint(ctx, hitX, hitY, 22 * pulse, "#FFFFFF", COLORS.brandAmber, 0.92, t * 0.15);
  }

  ctx.restore();
  return { hitX, hitY, incAngle };
}

/**
 * 绘制立体磨砂玻璃三棱镜（带内部晶体多面折射高光与完整外轮廓）
 */
function drawPrismBody(ctx, geom, { popup = 1, alpha = 1, styleId = "paper-editorial", internalGlow = 1, t = 0 }) {
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  const { top, left, right, backTop, backRight } = geom;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 投射在暖白纸面上的多层斜阳彩色焦散投影
  if (popup > 0.04) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left.x + 8, left.y + 4);
    ctx.lineTo(right.x + 18 + 64 * popup, right.y + 24 * popup);
    ctx.lineTo(top.x + 88 * popup, right.y + 46 * popup);
    ctx.closePath();
    const sg = ctx.createLinearGradient(left.x, right.y, right.x + 90, right.y + 42);
    sg.addColorStop(0, `rgba(28, 52, 58, ${(0.14 * popup).toFixed(4)})`);
    sg.addColorStop(0.55, `rgba(18, 148, 141, ${(0.06 * popup).toFixed(4)})`);
    sg.addColorStop(1, "rgba(242, 153, 74, 0)");
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();
  }

  // 2. 右侧立体玻璃厚度面
  if (popup > 0.15) {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(backTop.x, backTop.y);
    ctx.lineTo(backRight.x, backRight.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    if (styleId === "modern-graphic") {
      ctx.fillStyle = "#D4B033";
      ctx.fill();
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = 2.8;
      ctx.stroke();
    } else if (styleId === "narrative-collage") {
      ctx.fillStyle = "rgba(182, 162, 128, 0.58)";
      ctx.fill();
      ctx.strokeStyle = style.prismStroke;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else {
      const sideGrad = ctx.createLinearGradient(top.x, top.y, backRight.x, backRight.y);
      sideGrad.addColorStop(0, "rgba(218, 241, 238, 0.80)");
      sideGrad.addColorStop(0.5, "rgba(236, 245, 248, 0.65)");
      sideGrad.addColorStop(1, "rgba(196, 214, 236, 0.62)");
      ctx.fillStyle = sideGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(28, 42, 48, 0.22)";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  // 3. 主正面磨砂棱镜面
  const tracePrismFace = () => {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
  };

  tracePrismFace();

  if (styleId === "modern-graphic") {
    ctx.fillStyle = style.prismFill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Bauhaus 几何色块内切分
    ctx.fillStyle = "rgba(34, 98, 196, 0.14)";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(geom.cx + 8, geom.cy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(236, 75, 83, 0.10)";
    ctx.beginPath();
    ctx.arc(geom.cx - 32, geom.cy + 28, 68, 0, TAU);
    ctx.fill();
    ctx.restore();

    tracePrismFace();
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 3.6;
    ctx.lineJoin = "round";
    ctx.stroke();
  } else if (styleId === "narrative-collage") {
    ctx.fillStyle = style.prismFill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 密集印刷网点 + 暖褐牛皮纸斜角拼贴
    ctx.fillStyle = "rgba(71, 143, 130, 0.22)";
    for (let gy = top.y + 14; gy < right.y; gy += 10) {
      for (let gx = geom.cx - 35; gx < right.x; gx += 10) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2.0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(217, 107, 82, 0.10)";
    ctx.fillRect(left.x, geom.cy + 26, geom.size * 1.4, 90);
    ctx.restore();

    tracePrismFace();
    ctx.strokeStyle = style.prismStroke;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = "rgba(182, 112, 54, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // 暖纸刊物风：多面晶体玻璃质感 + 内部虹彩边缘折光
    const faceGrad = ctx.createLinearGradient(left.x, top.y, right.x, right.y);
    faceGrad.addColorStop(0, `rgba(255, 254, 250, ${(0.92 * popup + 0.08).toFixed(3)})`);
    faceGrad.addColorStop(0.45, `rgba(238, 249, 247, ${(0.76 * popup + 0.10).toFixed(3)})`);
    faceGrad.addColorStop(1, `rgba(229, 238, 250, ${(0.70 * popup + 0.08).toFixed(3)})`);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    if (popup > 0.25 && internalGlow > 0.05) {
      ctx.save();
      ctx.clip();
      // 主斜向玻璃高光带
      const glint = ctx.createLinearGradient(top.x - 40, top.y, geom.cx + 30, right.y);
      glint.addColorStop(0, "rgba(255, 255, 255, 0.72)");
      glint.addColorStop(0.48, "rgba(255, 255, 255, 0.12)");
      glint.addColorStop(1, "rgba(242, 153, 74, 0.08)");
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.moveTo(top.x - 10, top.y);
      ctx.lineTo(top.x + 32, top.y + 44);
      ctx.lineTo(left.x + 86, left.y);
      ctx.lineTo(left.x + 28, left.y);
      ctx.closePath();
      ctx.fill();

      // 内部晶体折面微线条（低饱和玻璃切面感）
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(geom.cx - 8, geom.cy + 14);
      ctx.lineTo(left.x, left.y);
      ctx.moveTo(geom.cx - 8, geom.cy + 14);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();

      // 底棱微弱虹彩反光边
      const baseRef = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
      baseRef.addColorStop(0, "rgba(18, 148, 141, 0.16)");
      baseRef.addColorStop(0.5, "rgba(242, 153, 74, 0.14)");
      baseRef.addColorStop(1, "rgba(142, 108, 187, 0.16)");
      ctx.fillStyle = baseRef;
      ctx.fillRect(left.x, left.y - 12, right.x - left.x, 12);
      ctx.restore();
    }

    tracePrismFace();
    ctx.strokeStyle = popup < 0.15 ? "rgba(91, 107, 115, 0.55)" : "rgba(28, 42, 48, 0.28)";
    ctx.lineWidth = lerp(1.5, 2.2, popup);
    ctx.lineJoin = "round";
    ctx.stroke();

    // 顶点与左棱镜脊暖白高光
    if (popup > 0.35) {
      ctx.beginPath();
      ctx.moveTo(top.x, top.y + 5);
      ctx.lineTo(left.x + 8, left.y - 4);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.90)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 棱镜顶点精致星芒反光
      if (internalGlow > 0.3) {
        drawStarlightGlint(
          ctx,
          top.x,
          top.y,
          12 * (0.85 + 0.15 * Math.sin(t * 3.1)),
          "#FFFFFF",
          COLORS.brandTeal,
          0.72 * popup,
          0.2
        );
      }
    }
  }

  ctx.restore();
}

/**
 * 绘制 7 股炫技级水彩波动丝带 + 内部折射扇 + 相速度行进光子珠
 */
export function drawRainbowOptics(ctx, opts = {}) {
  const {
    cx = 760,
    cy = 560,
    size = 250,
    t = 0,
    popup = 1,
    beamProgress = 1,
    dispersionProgress = 1,
    rewindProgress = 0,
    violetTweak = 0,
    v2Factor = 0,
    saturationBoost = 0,
    styleId = "paper-editorial",
    alpha = 1,
    showAngleAnnotation = false,
    showWaveBeads = true,
    onlyInsideClip = false,
    ribbonLen = 980,
  } = opts;

  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  const geom = getPrismGeometry(cx, cy, size, popup);

  const effDisp = clamp(dispersionProgress * (1 - rewindProgress));
  const effBeam = clamp(beamProgress * (1 - Math.max(0, (rewindProgress - 0.55) / 0.45)));

  // 1. 入射白光
  const hit = drawSunbeam(ctx, geom, {
    t,
    beamProgress: effBeam,
    alpha: alpha * (onlyInsideClip ? 0.9 : 1),
    styleId,
  }) || {
    hitX: lerp(geom.left.x, geom.top.x, 0.56),
    hitY: lerp(geom.left.y, geom.top.y, 0.56),
    incAngle: (18 * Math.PI) / 180,
  };

  // 2. 棱镜出射点
  const exitBaseT = 0.42;
  const exitPoints = SPECTRUM.map((band, i) => {
    const u = exitBaseT + (i / 6) * 0.34;
    return {
      x: lerp(geom.top.x, geom.right.x, u),
      y: lerp(geom.top.y, geom.right.y, u),
    };
  });

  // 绘棱镜本体
  drawPrismBody(ctx, geom, {
    popup,
    alpha,
    styleId,
    internalGlow: effDisp,
    t,
  });

  // 棱镜内部柔和多色发散光扇（渐变填充 + 精细光束）
  if (effDisp > 0.02 && popup > 0.25) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * Math.min(1, effDisp * 2.2) * 0.55);
    // 柔光扇底色
    ctx.beginPath();
    ctx.moveTo(hit.hitX, hit.hitY);
    ctx.lineTo(exitPoints[0].x, exitPoints[0].y);
    ctx.lineTo(exitPoints[6].x, exitPoints[6].y);
    ctx.closePath();
    const fanGrad = ctx.createLinearGradient(exitPoints[0].x, exitPoints[0].y, exitPoints[6].x, exitPoints[6].y);
    fanGrad.addColorStop(0, "rgba(229, 107, 111, 0.22)");
    fanGrad.addColorStop(0.5, "rgba(42, 157, 143, 0.18)");
    fanGrad.addColorStop(1, "rgba(142, 108, 187, 0.22)");
    ctx.fillStyle = fanGrad;
    ctx.fill();

    for (let i = 0; i < SPECTRUM.length; i++) {
      const ep = exitPoints[i];
      const color = style.palette[i];
      ctx.beginPath();
      ctx.moveTo(hit.hitX, hit.hitY);
      ctx.lineTo(ep.x, ep.y);
      ctx.strokeStyle = rgba(color, 0.68);
      ctx.lineWidth = 4.6;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 7 股水彩波动丝带 + 相速度光子珠 + 焦散星芒
  let violetAnchor = { x: cx + 440, y: cy + 210 };
  const bandMeta = [];

  if (effDisp > 0.005) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    if (styleId === "paper-editorial") {
      ctx.globalCompositeOperation = "multiply";
    }

    for (let i = 0; i < SPECTRUM.length; i++) {
      const band = SPECTRUM[i];
      const ep = exitPoints[i];
      const color = style.palette[i];
      const isRed = i === 0;
      const isViolet = i === 6;

      let bendDeg = band.bendDeg;
      let lambdaPx = band.lambdaPx;
      let amp = band.ampBase;

      if (isViolet && violetTweak > 0) {
        bendDeg += 5.8 * violetTweak;
        lambdaPx *= 1 - 0.30 * violetTweak;
        amp *= 1 + 0.44 * violetTweak;
      }

      if (v2Factor > 0) {
        if (isRed) {
          lambdaPx *= 1 + 0.32 * v2Factor;
          amp *= 1 + 0.58 * v2Factor;
          bendDeg -= 2.4 * v2Factor;
        } else if (isViolet) {
          lambdaPx *= 1 - 0.34 * v2Factor;
          amp *= 1 + 0.64 * v2Factor;
          bendDeg += 4.2 * v2Factor;
        }
      }

      const rad = (bendDeg * Math.PI) / 180;
      const dirX = Math.cos(rad);
      const dirY = Math.sin(rad);
      const normX = -dirY;
      const normY = dirX;

      const curLen = ribbonLen * effDisp;
      const omega = 4.5 + i * 0.54;

      bandMeta.push({ id: band.id, ep, dirX, dirY, normX, normY, rad, bendDeg, color, lambdaPx, amp, omega, phase: band.phase, curLen });

      if (isViolet) {
        const sPick = Math.min(curLen * 0.55, 360);
        const wOff = Math.sin((TAU * sPick) / lambdaPx - omega * t + band.phase) * amp;
        violetAnchor = {
          x: ep.x + dirX * sPick + normX * wOff,
          y: ep.y + dirY * sPick + normY * wOff,
        };
      }

      if (styleId === "modern-graphic") {
        // 现代图形风：粗犷色带 + 中心白色点划线 + 波峰几何圆点
        ctx.beginPath();
        const steps = 240;
        for (let k = 0; k <= steps; k++) {
          const s = (k / steps) * curLen;
          const env = smoothstep(0, 65, s);
          const wave = Math.sin((TAU * s) / lambdaPx - omega * t + band.phase) * amp * env;
          const px = ep.x + dirX * s + normX * wave;
          const py = ep.y + dirY * s + normY * wave;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = rgba(color, 0.94);
        ctx.lineWidth = isRed || isViolet ? 11.5 : 8.8;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.strokeStyle = "rgba(32, 38, 56, 0.70)";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else {
        // 暖纸刊物风 / 叙事拼贴风：宽水彩纸晕 + 3 股精细波动丝带
        const subStrands = [
          { off: -4.8, w: 3.0, op: 0.44, phaseShift: -0.34 },
          { off: 0.0, w: 5.0, op: 0.84 + saturationBoost * 0.12, phaseShift: 0.0 },
          { off: 4.8, w: 2.5, op: 0.40, phaseShift: 0.36 },
        ];

        // 柔和宽水彩铺底
        ctx.beginPath();
        const haloSteps = 160;
        for (let k = 0; k <= haloSteps; k++) {
          const s = (k / haloSteps) * curLen;
          const env = smoothstep(0, 75, s);
          const wave = Math.sin((TAU * s) / lambdaPx - omega * t + band.phase) * amp * env;
          const px = ep.x + dirX * s + normX * wave;
          const py = ep.y + dirY * s + normY * wave;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = rgba(color, (0.16 + saturationBoost * 0.07) * (isRed || isViolet ? 1.25 : 1));
        ctx.lineWidth = 26;
        ctx.lineCap = "round";
        ctx.stroke();

        for (const sub of subStrands) {
          ctx.beginPath();
          const steps = 260;
          for (let k = 0; k <= steps; k++) {
            const s = (k / steps) * curLen;
            const env = smoothstep(0, 68, s);
            const spread = 1 + (s / 980) * 1.05;
            const wave =
              Math.sin((TAU * s) / lambdaPx - omega * t + band.phase + sub.phaseShift) *
              amp *
              env;
            const px = ep.x + dirX * s + normX * (wave + sub.off * spread);
            const py = ep.y + dirY * s + normY * (wave + sub.off * spread);
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = rgba(color, clamp(sub.op, 0, 0.96));
          ctx.lineWidth =
            sub.w *
            (styleId === "narrative-collage" ? 1.12 : 1.0) *
            (v2Factor > 0 && (isRed || isViolet) ? 1 + 0.22 * v2Factor : 1);
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    // 3b. 行进相速度光子珠 + 出射边折光星芒（在 multiply 之上绘制，呈现出晶莹灵动的光学呼吸感！）
    if (showWaveBeads && effDisp > 0.2) {
      ctx.save();
      ctx.globalAlpha = clamp(alpha * smoothstep(0.2, 0.65, effDisp));
      for (let i = 0; i < bandMeta.length; i++) {
        const b = bandMeta[i];
        // 红光推进速度略快、步幅更长，紫光紧凑灵动
        const speedPx = lerp(145, 92, i / 6);
        const spacing = lerp(240, 175, i / 6);
        const numBeads = Math.floor(b.curLen / spacing);
        for (let k = 0; k <= numBeads; k++) {
          const s = ((k * spacing + t * speedPx + i * 47) % Math.max(40, b.curLen));
          if (s < 32 || s > b.curLen - 18) continue;
          const env = smoothstep(0, 68, s);
          const wave = Math.sin((TAU * s) / b.lambdaPx - b.omega * t + b.phase) * b.amp * env;
          const bx = b.ep.x + b.dirX * s + b.normX * wave;
          const by = b.ep.y + b.dirY * s + b.normY * wave;

          // 外晕 + 暖白晶珠
          ctx.fillStyle = rgba(b.color, 0.28);
          ctx.beginPath();
          ctx.arc(bx, by, 7.5, 0, TAU);
          ctx.fill();

          ctx.fillStyle = "#FFFDF9";
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(bx, by, 3.6, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      }

      // 出射棱边红/绿/紫三处微星芒
      [0, 3, 6].forEach((idx) => {
        const ep = exitPoints[idx];
        drawStarlightGlint(
          ctx,
          ep.x,
          ep.y,
          9 + 2 * Math.sin(t * 3.8 + idx),
          "#FFFFFF",
          style.palette[idx],
          0.62,
          t * 0.25 + idx
        );
      });
      ctx.restore();
    }
  }

  // 4. 第一幕紫光拨动时的手绘铅笔标注（配暖纸签底托）
  if (violetTweak > 0.05 && effDisp > 0.4) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * smoothstep(0.05, 0.45, violetTweak));
    const ax = violetAnchor.x - 245;
    const ay = violetAnchor.y + 84;
    ctx.strokeStyle = rgba(COLORS.inkPrimary, 0.56);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(violetAnchor.x - 6, violetAnchor.y + 12);
    ctx.quadraticCurveTo(violetAnchor.x - 42, ay, ax + 196, ay);
    ctx.stroke();

    const curNm = Math.round(lerp(405, 388, violetTweak));
    const curDeg = lerp(33.6, 39.4, violetTweak).toFixed(1);
    const label = `λ = ${curNm}nm · θ = ${curDeg}°`;
    ctx.fillStyle = "rgba(255, 253, 249, 0.94)";
    ctx.strokeStyle = "rgba(142, 108, 187, 0.48)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(ax - 12, ay - 18, 218, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 15.5px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.inkPrimary;
    ctx.textBaseline = "middle";
    ctx.fillText(label, ax + 4, ay);
    ctx.restore();
  }

  // 5. 第四幕局部修订 v2 生效后的手绘折射角弧线与动态扫描刻度（θ_red < θ_violet）
  if ((showAngleAnnotation || v2Factor > 0.08) && bandMeta.length === 7) {
    const a = clamp(alpha * smoothstep(0.08, 0.85, v2Factor));
    if (a > 0.01) {
      const red = bandMeta[0];
      const violet = bandMeta[6];
      const ox = (red.ep.x + violet.ep.x) * 0.5 - 12;
      const oy = (red.ep.y + violet.ep.y) * 0.5;
      const sweep = smoothstep(0.08, 0.92, v2Factor);

      ctx.save();
      ctx.globalAlpha = a;

      // 水平参考虚线
      ctx.strokeStyle = rgba(COLORS.inkPrimary, 0.36);
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 265 * sweep, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 扇区柔杏填充
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, 204, 0, violet.rad * sweep);
      ctx.closePath();
      ctx.fillStyle = "rgba(242, 153, 74, 0.07)";
      ctx.fill();

      // 红光折射角刻度弧
      const rRed = 152;
      ctx.strokeStyle = rgba("#E56B6F", 0.92);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ox, oy, rRed, 0, red.rad * sweep);
      ctx.stroke();

      // 紫光折射角刻度弧
      const rViolet = 204;
      ctx.strokeStyle = rgba("#8E6CBB", 0.94);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ox, oy, rViolet, 0, violet.rad * sweep);
      ctx.stroke();

      // 弧线上的刊物细刻度短线
      for (let tick = 0; tick <= 8; tick++) {
        const ang = (tick / 8) * violet.rad * sweep;
        const r0 = rViolet - (tick % 2 === 0 ? 7 : 4);
        const r1 = rViolet + (tick % 2 === 0 ? 7 : 4);
        ctx.strokeStyle = rgba(COLORS.inkPrimary, 0.48);
        ctx.lineWidth = tick % 2 === 0 ? 1.4 : 1.0;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(ang) * r0, oy + Math.sin(ang) * r0);
        ctx.lineTo(ox + Math.cos(ang) * r1, oy + Math.sin(ang) * r1);
        ctx.stroke();
      }

      // 手绘刊物小标：暖纸浅卡轻垫确保清晰可读
      ctx.fillStyle = "rgba(255, 253, 249, 0.94)";
      ctx.strokeStyle = "rgba(18, 148, 141, 0.34)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(ox + 208, oy - 78, 202, 58, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 17.5px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.fillText("θ_red < θ_violet", ox + 222, oy - 52);
      ctx.font = `500 13.5px ${FONTS.sans}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.fillText("长波舒展 · 短波急折", ox + 222, oy - 32);

      // 红波 / 紫波端点波长小注（避开角度标签卡）
      ctx.font = `600 13.5px ${FONTS.mono}`;
      ctx.fillStyle = "#C64B50";
      ctx.fillText("λ_red 680nm", red.ep.x + 392, red.ep.y + 42);
      ctx.fillStyle = "#6F4E9E";
      ctx.fillText("λ_violet 405nm", violet.ep.x + 250, violet.ep.y + 236);

      ctx.restore();
    }
  }

  const waveSelectionRect = {
    x: geom.right.x - 108,
    y: geom.top.y + 84,
    w: 560,
    h: 348,
  };

  return { geom, hit, violetAnchor, waveSelectionRect };
}
