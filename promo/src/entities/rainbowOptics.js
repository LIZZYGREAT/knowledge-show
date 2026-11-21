/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 阳光书桌纸面光学与 7 股水彩波动彩虹引擎
 * 主案例：「白光经过棱镜，为何散出彩虹？」
 * 物理直观建模：n_i(s, t) = A_i(s) * sin(2*pi/lambda_i * s - omega_i * t + phi_i)
 * 支持：立体书掀折(popup)、紫光单波拨动(violetTweak)、局部修订对比(v2Factor)、三画风切换
 */

import { COLORS, SPECTRUM, FONTS, STYLE_PROFILES } from "../config/tokens.js";
import { clamp, lerp, rgba, mulberry32, smoothstep } from "../core/math.js";

// 确定性午后阳光微尘
const SUN_DUST = (() => {
  const r = mulberry32(8831);
  return Array.from({ length: 28 }, () => ({
    u: r(),
    v: (r() - 0.5) * 1.8,
    rad: 1.2 + r() * 2.4,
    phase: r() * Math.PI * 2,
    speed: 0.35 + r() * 0.65,
  }));
})();

/**
 * 计算棱镜三角形三个顶点（世界坐标系，默认中心 cx=760, cy=560）
 */
export function getPrismGeometry(cx = 760, cy = 560, size = 250, popup = 1) {
  // popup=0 时平躺为讲义细线三角，popup=1 时立体书撑起为带轻微立体厚度的磨砂棱镜
  const liftY = lerp(22, 0, popup);
  const top = { x: cx, y: cy - size * 0.64 + liftY };
  const left = { x: cx - size * 0.58, y: cy + size * 0.44 };
  const right = { x: cx + size * 0.58, y: cy + size * 0.44 };
  // 右后方玻璃厚度面（立体书撑起后浮现）
  const depthX = size * 0.14 * popup;
  const depthY = -size * 0.08 * popup;
  const backTop = { x: top.x + depthX, y: top.y + depthY };
  const backRight = { x: right.x + depthX, y: right.y + depthY };
  return { top, left, right, backTop, backRight, cx, cy, size };
}

/**
 * 绘制纸面倾斜暖白阳光束（18° 入射）
 */
function drawSunbeam(ctx, geom, { t = 0, beamProgress = 1, alpha = 1, styleId = "paper-editorial" }) {
  if (beamProgress <= 0.005 || alpha <= 0.005) return;
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];

  // 入射点在左棱边中上部
  const hitX = lerp(geom.left.x, geom.top.x, 0.56);
  const hitY = lerp(geom.left.y, geom.top.y, 0.56);
  const incAngle = (18 * Math.PI) / 180; // 18° 向右下倾斜
  const beamLen = 920;
  const startX = hitX - Math.cos(incAngle) * beamLen;
  const startY = hitY - Math.sin(incAngle) * beamLen;

  const curEndX = lerp(startX, hitX, beamProgress);
  const curEndY = lerp(startY, hitY, beamProgress);
  const nx = -Math.sin(incAngle);
  const ny = Math.cos(incAngle);

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  if (styleId === "modern-graphic") {
    // 现代图形风：干脆俐落的硬边浅暖白几何光带
    ctx.beginPath();
    ctx.moveTo(startX + nx * 16, startY + ny * 16);
    ctx.lineTo(curEndX + nx * 13, curEndY + ny * 13);
    ctx.lineTo(curEndX - nx * 13, curEndY - ny * 13);
    ctx.lineTo(startX - nx * 16, startY - ny * 16);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 250, 232, 0.92)";
    ctx.fill();
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    // 暖纸刊物风 / 叙事拼贴风：柔和金白阳光束 + 纸面光晕
    const wide = 44;
    const narrow = 16;

    const grad = ctx.createLinearGradient(startX, startY, curEndX, curEndY);
    grad.addColorStop(0, "rgba(255, 250, 238, 0.0)");
    grad.addColorStop(0.25, "rgba(255, 246, 224, 0.42)");
    grad.addColorStop(0.85, "rgba(255, 252, 242, 0.85)");
    grad.addColorStop(1, "rgba(255, 253, 248, 0.96)");

    // 外层柔光晕
    ctx.beginPath();
    ctx.moveTo(startX + nx * wide, startY + ny * wide);
    ctx.lineTo(curEndX + nx * (narrow * 1.45), curEndY + ny * (narrow * 1.45));
    ctx.lineTo(curEndX - nx * (narrow * 1.45), curEndY - ny * (narrow * 1.45));
    ctx.lineTo(startX - nx * wide, startY - ny * wide);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 内部三股柔和白光游丝
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      const off = k * 6.5;
      ctx.moveTo(startX + nx * off, startY + ny * off);
      ctx.lineTo(curEndX + nx * (off * 0.72), curEndY + ny * (off * 0.72));
      ctx.strokeStyle =
        k === 0 ? "rgba(255, 255, 255, 0.92)" : "rgba(244, 214, 162, 0.55)";
      ctx.lineWidth = k === 0 ? 4.2 : 1.6;
      ctx.stroke();
    }

    // 午后光线微尘（确定性漂浮）
    for (const d of SUN_DUST) {
      if (d.u > beamProgress) continue;
      const bx = lerp(startX, hitX, d.u);
      const by = lerp(startY, hitY, d.u);
      const drift = Math.sin(t * d.speed + d.phase) * 7;
      const px = bx + nx * (d.v * 20 + drift);
      const py = by + ny * (d.v * 20 + drift);
      ctx.fillStyle = `rgba(242, 185, 110, ${(0.28 + 0.18 * Math.sin(t * 2 + d.phase)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, d.rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 入射光斑接触点微亮
  if (beamProgress > 0.92) {
    const gHit = ctx.createRadialGradient(hitX, hitY, 2, hitX, hitY, 34);
    gHit.addColorStop(0, "rgba(255, 253, 246, 0.95)");
    gHit.addColorStop(0.5, "rgba(242, 185, 110, 0.35)");
    gHit.addColorStop(1, "rgba(242, 185, 110, 0)");
    ctx.fillStyle = gHit;
    ctx.beginPath();
    ctx.arc(hitX, hitY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return { hitX, hitY, incAngle };
}

/**
 * 绘制立体磨砂玻璃三棱镜（支持不同艺术风格与立体书撑起进度）
 */
function drawPrismBody(ctx, geom, { popup = 1, alpha = 1, styleId = "paper-editorial", internalGlow = 1 }) {
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  const { top, left, right, backTop, backRight } = geom;

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  // 1. 投射在暖白纸面上的柔和斜阳投影（随 popup 撑起自然拉长）
  if (popup > 0.04) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left.x + 8, left.y + 4);
    ctx.lineTo(right.x + 14 + 46 * popup, right.y + 22 * popup);
    ctx.lineTo(top.x + 68 * popup, right.y + 38 * popup);
    ctx.closePath();
    const sg = ctx.createLinearGradient(left.x, right.y, right.x + 70, right.y + 36);
    sg.addColorStop(0, `rgba(28, 52, 58, ${(0.12 * popup).toFixed(4)})`);
    sg.addColorStop(1, "rgba(28, 52, 58, 0)");
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();
  }

  // 2. 右侧玻璃厚度面
  if (popup > 0.15) {
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(backTop.x, backTop.y);
    ctx.lineTo(backRight.x, backRight.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    if (styleId === "modern-graphic") {
      ctx.fillStyle = "#D8C589";
      ctx.fill();
      ctx.strokeStyle = style.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else if (styleId === "narrative-collage") {
      ctx.fillStyle = "rgba(182, 169, 143, 0.55)";
      ctx.fill();
      ctx.strokeStyle = style.prismStroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else {
      const sideGrad = ctx.createLinearGradient(top.x, top.y, backRight.x, backRight.y);
      sideGrad.addColorStop(0, "rgba(222, 240, 238, 0.72)");
      sideGrad.addColorStop(1, "rgba(196, 218, 226, 0.52)");
      ctx.fillStyle = sideGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(28, 42, 48, 0.18)";
      ctx.lineWidth = 1.2;
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
    // 硬边几何阴影切分
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(34, 98, 196, 0.10)";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(geom.cx + 12, geom.cy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 重新描绘棱镜主轮廓再描边（restore 不恢复路径）
    tracePrismFace();
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = 3.2;
    ctx.lineJoin = "round";
    ctx.stroke();
  } else if (styleId === "narrative-collage") {
    ctx.fillStyle = style.prismFill;
    ctx.fill();
    // 印刷网点装饰（局部裁剪在棱镜右下）
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(71, 143, 130, 0.18)";
    for (let gy = top.y + 20; gy < right.y; gy += 11) {
      for (let gx = geom.cx - 20; gx < right.x; gx += 11) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    // 手绘双层墨线轮廓
    tracePrismFace();
    ctx.strokeStyle = style.prismStroke;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = "rgba(182, 120, 62, 0.35)";
    ctx.lineWidth = 1.1;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // 暖纸刊物风：半透明磨砂玻璃质感
    const faceGrad = ctx.createLinearGradient(left.x, top.y, right.x, right.y);
    faceGrad.addColorStop(0, `rgba(255, 254, 250, ${(0.88 * popup + 0.12).toFixed(3)})`);
    faceGrad.addColorStop(0.48, `rgba(241, 249, 247, ${(0.72 * popup + 0.12).toFixed(3)})`);
    faceGrad.addColorStop(1, `rgba(232, 240, 249, ${(0.64 * popup + 0.10).toFixed(3)})`);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // 内部柔和折光高光条（无描边）
    if (popup > 0.25 && internalGlow > 0.05) {
      ctx.save();
      ctx.clip();
      const glint = ctx.createLinearGradient(top.x - 40, top.y, geom.cx + 30, right.y);
      glint.addColorStop(0, "rgba(255, 255, 255, 0.58)");
      glint.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
      glint.addColorStop(1, "rgba(242, 153, 74, 0.06)");
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.moveTo(top.x - 10, top.y);
      ctx.lineTo(top.x + 28, top.y + 40);
      ctx.lineTo(left.x + 76, left.y);
      ctx.lineTo(left.x + 28, left.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 精细边界线（必须重新追踪主三角形路径）
    tracePrismFace();
    ctx.strokeStyle = popup < 0.15 ? "rgba(91, 107, 115, 0.55)" : "rgba(28, 42, 48, 0.24)";
    ctx.lineWidth = lerp(1.5, 2.0, popup);
    ctx.lineJoin = "round";
    ctx.stroke();

    // 内边暖白高光
    if (popup > 0.3) {
      ctx.beginPath();
      ctx.moveTo(top.x, top.y + 5);
      ctx.lineTo(left.x + 8, left.y - 4);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * 绘制 7 股水彩波动丝带（核心色散物理可视化）
 * 返回紫光波带中点坐标与红/紫折射区域包围盒，供棱片夹持与修订框精准对齐
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
    rewindProgress = 0, // [0, 1] 彩虹倒卷回棱镜
    violetTweak = 0, // [0, 1] 第一幕：棱片捏改紫光波峰紧凑度与偏折角
    v2Factor = 0, // [0, 1] 第四幕：局部修订后红/紫波长对比增强 + 手绘角度弧刻度
    saturationBoost = 0, // [0, 1] 第四幕微调二连击：色带通透度微调
    styleId = "paper-editorial",
    alpha = 1,
    showAngleAnnotation = false,
    onlyInsideClip = false,
    ribbonLen = 980,
  } = opts;

  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  const geom = getPrismGeometry(cx, cy, size, popup);

  // 计算倒卷有效色散长度
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

  // 2. 棱镜内部发散折射光扇（在棱镜正面绘制之前/之上叠加）
  const exitBaseT = 0.42;
  const exitPoints = SPECTRUM.map((band, i) => {
    const u = exitBaseT + (i / 6) * 0.34;
    return {
      x: lerp(geom.top.x, geom.right.x, u),
      y: lerp(geom.top.y, geom.right.y, u),
    };
  });

  // 先绘棱镜本体
  drawPrismBody(ctx, geom, {
    popup,
    alpha,
    styleId,
    internalGlow: effDisp,
  });

  // 内部微色散扇（半透明叠印在棱镜内部）
  if (effDisp > 0.02 && popup > 0.25) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * Math.min(1, effDisp * 2.2) * 0.42);
    for (let i = 0; i < SPECTRUM.length; i++) {
      const ep = exitPoints[i];
      const color = style.palette[i];
      ctx.beginPath();
      ctx.moveTo(hit.hitX, hit.hitY);
      ctx.lineTo(ep.x, ep.y);
      ctx.strokeStyle = rgba(color, 0.58);
      ctx.lineWidth = 4.6;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. 7 股水彩波动丝带（每道由 3 股细丝组成，红长波平缓、紫短波紧促）
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

      // 局部修订与紫光钩子仅定向影响红/紫波束，中间五道色光纹丝不动
      let bendDeg = band.bendDeg;
      let lambdaPx = band.lambdaPx;
      let amp = band.ampBase;

      if (isViolet && violetTweak > 0) {
        bendDeg += 5.8 * violetTweak;
        lambdaPx *= 1 - 0.30 * violetTweak;
        amp *= 1 + 0.42 * violetTweak;
      }

      if (v2Factor > 0) {
        if (isRed) {
          lambdaPx *= 1 + 0.32 * v2Factor;
          amp *= 1 + 0.55 * v2Factor;
          bendDeg -= 2.4 * v2Factor;
        } else if (isViolet) {
          lambdaPx *= 1 - 0.34 * v2Factor;
          amp *= 1 + 0.62 * v2Factor;
          bendDeg += 4.2 * v2Factor;
        }
      }

      const rad = (bendDeg * Math.PI) / 180;
      const dirX = Math.cos(rad);
      const dirY = Math.sin(rad);
      const normX = -dirY;
      const normY = dirX;

      const curLen = ribbonLen * effDisp;
      const omega = 4.4 + i * 0.52;

      bandMeta.push({
        id: band.id,
        ep,
        dirX,
        dirY,
        rad,
        bendDeg,
        color,
      });

      if (isViolet) {
        const sPick = Math.min(curLen * 0.55, 360);
        const wOff = Math.sin((2 * Math.PI * sPick) / lambdaPx - omega * t + band.phase) * amp;
        violetAnchor = {
          x: ep.x + dirX * sPick + normX * wOff,
          y: ep.y + dirY * sPick + normY * wOff,
        };
      }

      if (styleId === "modern-graphic") {
        // 现代图形风：粗细明快的单实心几何波带 + 清晰中心线
        ctx.beginPath();
        const steps = 240;
        for (let k = 0; k <= steps; k++) {
          const s = (k / steps) * curLen;
          const env = smoothstep(0, 65, s);
          const wave = Math.sin((2 * Math.PI * s) / lambdaPx - omega * t + band.phase) * amp * env;
          const px = ep.x + dirX * s + normX * wave;
          const py = ep.y + dirY * s + normY * wave;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = rgba(color, 0.92);
        ctx.lineWidth = isRed || isViolet ? 9.5 : 7.5;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.strokeStyle = "rgba(32, 38, 56, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // 暖纸刊物水彩风 / 叙事拼贴风：每道色光由 3 股极细半透明波动曲线束构成
        const subStrands = [
          { off: -4.2, w: 3.1, op: 0.44, phaseShift: -0.32 },
          { off: 0.0, w: 4.8, op: 0.80 + saturationBoost * 0.14, phaseShift: 0.0 },
          { off: 4.2, w: 2.6, op: 0.40, phaseShift: 0.36 },
        ];

        // 淡淡的水彩底色柔晕带
        ctx.beginPath();
        const haloSteps = 160;
        for (let k = 0; k <= haloSteps; k++) {
          const s = (k / haloSteps) * curLen;
          const env = smoothstep(0, 75, s);
          const wave = Math.sin((2 * Math.PI * s) / lambdaPx - omega * t + band.phase) * amp * env;
          const px = ep.x + dirX * s + normX * wave;
          const py = ep.y + dirY * s + normY * wave;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = rgba(color, (0.13 + saturationBoost * 0.06) * (isRed || isViolet ? 1.25 : 1));
        ctx.lineWidth = 22;
        ctx.lineCap = "round";
        ctx.stroke();

        for (const sub of subStrands) {
          ctx.beginPath();
          const steps = 260;
          for (let k = 0; k <= steps; k++) {
            const s = (k / steps) * curLen;
            const env = smoothstep(0, 68, s);
            const spread = 1 + (s / 980) * 0.95;
            const wave =
              Math.sin((2 * Math.PI * s) / lambdaPx - omega * t + band.phase + sub.phaseShift) *
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
            (styleId === "narrative-collage" ? 1.1 : 1.0) *
            (v2Factor > 0 && (isRed || isViolet) ? 1 + 0.2 * v2Factor : 1);
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  // 4. 第一幕紫光拨动时的手绘铅笔标注（避开选框边角，配柔暖纸签底托）
  if (violetTweak > 0.05 && effDisp > 0.4) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * smoothstep(0.05, 0.45, violetTweak));
    const ax = violetAnchor.x - 240;
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
    ctx.fillStyle = "rgba(255, 253, 249, 0.92)";
    ctx.strokeStyle = "rgba(142, 108, 187, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(ax - 12, ay - 18, 214, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 15.5px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.inkPrimary;
    ctx.textBaseline = "middle";
    ctx.fillText(label, ax + 4, ay);
    ctx.restore();
  }

  // 5. 第四幕局部修订 v2 生效后的手绘折射角弧线与 θ_red < θ_violet 标注
  if ((showAngleAnnotation || v2Factor > 0.08) && bandMeta.length === 7) {
    const a = clamp(alpha * smoothstep(0.08, 0.85, v2Factor));
    if (a > 0.01) {
      const red = bandMeta[0];
      const violet = bandMeta[6];
      const ox = (red.ep.x + violet.ep.x) * 0.5 - 12;
      const oy = (red.ep.y + violet.ep.y) * 0.5;

      ctx.save();
      ctx.globalAlpha = a;

      // 水平参考虚线
      ctx.strokeStyle = rgba(COLORS.inkPrimary, 0.34);
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 265, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 红光折射角刻度弧
      const rRed = 152;
      ctx.strokeStyle = rgba("#E56B6F", 0.9);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(ox, oy, rRed, 0, red.rad);
      ctx.stroke();

      // 紫光折射角刻度弧
      const rViolet = 204;
      ctx.strokeStyle = rgba("#8E6CBB", 0.92);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ox, oy, rViolet, 0, violet.rad);
      ctx.stroke();

      // 弧线上的刊物细刻度短线
      for (let tick = 0; tick <= 6; tick++) {
        const ang = (tick / 6) * violet.rad;
        const r0 = rViolet - 5;
        const r1 = rViolet + 5;
        ctx.strokeStyle = rgba(COLORS.inkPrimary, 0.45);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(ang) * r0, oy + Math.sin(ang) * r0);
        ctx.lineTo(ox + Math.cos(ang) * r1, oy + Math.sin(ang) * r1);
        ctx.stroke();
      }

      // 手绘刊物小标：暖纸浅卡轻垫确保清晰可读
      ctx.fillStyle = "rgba(255, 253, 249, 0.92)";
      ctx.strokeStyle = "rgba(28, 42, 48, 0.16)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(ox + 208, oy - 76, 198, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 17.5px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.fillText("θ_red < θ_violet", ox + 222, oy - 50);
      ctx.font = `500 13.5px ${FONTS.sans}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.fillText("长波舒展 · 短波急折", ox + 222, oy - 30);

      // 红波 / 紫波端点波长小注（避开角度标签卡）
      ctx.font = `600 13.5px ${FONTS.mono}`;
      ctx.fillStyle = "#C64B50";
      ctx.fillText("λ_red 680nm", red.ep.x + 392, red.ep.y + 42);
      ctx.fillStyle = "#6F4E9E";
      ctx.fillText("λ_violet 405nm", violet.ep.x + 250, violet.ep.y + 236);

      ctx.restore();
    }
  }

  // 选框建议区域（精准包裹红紫波束交汇与出射折射边界）
  const waveSelectionRect = {
    x: geom.right.x - 108,
    y: geom.top.y + 84,
    w: 560,
    h: 348,
  };

  return { geom, hit, violetAnchor, waveSelectionRect };
}
