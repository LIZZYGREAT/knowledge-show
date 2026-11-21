/*
 * 第三幕：万物剧场与棱片翻页（0:52 – 1:32，全连续零突变 + 惊艳炫技大秀版）
 * 0:52 – 1:04  微观晶格入界面：六角晶格共振 + 惠更斯次级子波 + 倾斜推进波前 + 黄铜放大镜 + 红快紫慢光子珠
 * 1:04 – 1:14  全景水彩彩虹（黄铜测角仪 + 右侧光谱纳米游标尺 + 窗影树叶斑驳 + 漂浮小棱晶焦散）
 * 1:14 – 1:23  零突变棱片轨迹连续驱动两次 FOLD 中轴翻页（paper-editorial -> Bauhaus 现代图形 -> 手工撕边拼贴）
 * 1:23 – 1:32  全物理连续形态变奏（零硬切！）：彩虹卷曲成肥皂泡（双面反射干涉光束）-> 肥皂泡压平且分子飞排成 PN 结（发光灯丝泡 + 黄铜微安表）-> 结面裂折为真 3D 双骰子（36 粒螺旋落下 + P(7)=16.7%）-> 展开回归彩虹定格
 */

import { COLORS, SPECTRUM, FONTS, STYLE_PROFILES, STAGE_W, STAGE_H } from "../config/tokens.js";
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
import { drawRainbowOptics, getPrismGeometry } from "../entities/rainbowOptics.js";
import {
  drawDappledSunlight,
  drawBrassGoniometer,
  drawPopupPaperDiorama,
  drawStarlightGlint,
  drawEditorialPrintMarks,
} from "../entities/ornaments.js";

/**
 * 52s - 64s：动态玻璃滑入折射大秀！
 * 52.0 – 54.2s：纯空气环境（无玻璃片），7 排彩色波列步幅一致、14° 笔直前行（与 51.8s 裂隙 0px 无缝连贯！）
 * 54.2 – 57.6s：磨砂晶格玻璃块从画面右侧平滑推入视野，玻璃前沿扫过之处，7 道直光实时减速并动态弯折散开！
 * 57.6 – 64.0s：晶格共振 + 惠更斯子波 + 黄铜放大镜聚焦紫光短波（v_violet ≈ 0.62 c）
 */
function drawMicroRefraction(ctx, t, alpha) {
  if (alpha <= 0.005) return;

  // 玻璃块从右侧 x = +1260 平移滑入至最终位 (0)
  const pSlide = easeEditorialInOut(segProgress(t, 54.2, 57.6));
  const pGlassPresent = segProgress(t, 54.15, 54.7);
  const pLoupe = easeEditorialOut(segProgress(t, 58.0, 59.4));
  const pCallout = easeEditorialOut(segProgress(t, 58.2, 59.8));

  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  const slideOffsetX = lerp(1280, 0, pSlide);
  const bxTop = 860 + slideOffsetX;
  const bxBot = 660 + slideOffsetX;
  const boundaryXAt = (y) => lerp(bxTop, bxBot, y / STAGE_H);

  // 1. 平移进入视野的倾斜磨砂玻璃块 + 内部六角晶格阵列
  if (pGlassPresent > 0.005) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bxTop, -20);
    ctx.lineTo(STAGE_W + 1400, -20);
    ctx.lineTo(STAGE_W + 1400, STAGE_H + 20);
    ctx.lineTo(bxBot, STAGE_H + 20);
    ctx.closePath();

    // 玻璃块滑入边缘的柔和纸面投射阴影
    ctx.save();
    ctx.shadowColor = "rgba(28, 52, 58, 0.14)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = -14;
    const glassGrad = ctx.createLinearGradient(bxBot, 0, bxTop + 1200, STAGE_H);
    glassGrad.addColorStop(0, "rgba(214, 239, 237, 0.84)");
    glassGrad.addColorStop(0.5, "rgba(232, 245, 247, 0.68)");
    glassGrad.addColorStop(1, "rgba(224, 235, 249, 0.76)");
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.restore();

    ctx.clip();

    // 随玻璃块一起平移进场的六角晶格节点
    const stepX = 112;
    const stepY = 98;
    for (let row = 0; row <= 12; row++) {
      for (let col = 0; col <= 14; col++) {
        const gx = 680 + slideOffsetX + col * stepX + (row % 2) * (stepX * 0.5);
        const gy = row * stepY;
        if (gx < boundaryXAt(gy) + 24 || gx > STAGE_W + 40) continue;
        const osc = Math.sin(t * 5.2 - gx * 0.015 + gy * 0.01) * 3.4 * pSlide;
        ctx.strokeStyle = "rgba(18, 148, 141, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(gx + osc, gy, 15, 0, TAU);
        ctx.stroke();

        ctx.fillStyle = "rgba(18, 148, 141, 0.25)";
        ctx.beginPath();
        ctx.arc(gx + osc, gy, 3.2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // 玻璃前沿双层折光高光边线
    ctx.strokeStyle = "rgba(18, 148, 141, 0.48)";
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(bxTop, 0);
    ctx.lineTo(bxBot, STAGE_H);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bxTop + 5, 0);
    ctx.lineTo(bxBot + 5, STAGE_H);
    ctx.stroke();
  }

  // 刊物注记卡片（随玻璃滑入动态显现右侧标签！）
  drawPaperCard(ctx, 112, 930, 268, 46, {
    radius: 23,
    fill: "rgba(255, 253, 249, 0.92)",
    stroke: COLORS.inkHairline,
    lineWidth: 1.2,
    shadowBlur: 12,
    shadowOffsetY: 4,
  });
  ctx.font = `600 14px ${FONTS.mono}`;
  ctx.fillStyle = COLORS.inkSecondary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pSlide < 0.2 ? "AIR · 空气中步幅一致 · 直线前行" : "AIR · 空气中步幅一致", 246, 953);

  if (pSlide > 0.25) {
    const gLabelA = clamp((pSlide - 0.25) / 0.45);
    ctx.save();
    ctx.globalAlpha = clamp(alpha * gLabelA);
    drawPaperCard(ctx, Math.min(STAGE_W - 410, bxTop + 80), 74, 376, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.92)",
      stroke: rgba(COLORS.brandTeal, 0.34),
      lineWidth: 1.2,
      shadowBlur: 12,
      shadowOffsetY: 4,
    });
    ctx.fillStyle = COLORS.brandTealDark;
    ctx.fillText("GLASS LATTICE · 介质减速与偏折分化", Math.min(STAGE_W - 410, bxTop + 80) + 188, 97);
    ctx.restore();
  }
  ctx.textAlign = "left";

  // 2. 7 色波列：空气侧严格直线传播，与移动玻璃前沿实时求交，入玻璃后瞬间动态压缩波长并弯折！
  const incAng = (14 * Math.PI) / 180;
  const incDx = Math.cos(incAng);
  const incDy = Math.sin(incAng);
  const incNx = -incDy;
  const incNy = incDx;

  // 玻璃斜边直线方程：x = bxTop + (bxBot - bxTop) * (y / STAGE_H) => x + m * y = bxTop
  const slopeM = (bxTop - bxBot) / STAGE_H; // = 200 / 1080

  const beadPoints = [];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";

  for (let i = 0; i < SPECTRUM.length; i++) {
    const band = SPECTRUM[i];
    // 每道光在空气中的固定参考锚点（与第二幕 51.8s 透视裂隙完全同坐标！）
    const y0 = 246 + i * 94;
    const x0 = lerp(860, 660, y0 / STAGE_H);
    const airLambda = 112 - i * 4.5;
    const airAmp = 10.5;
    const omega = 5.4;

    // 实时计算该直线光束与当前移动玻璃前沿的交点参数 sHit
    const denom = incDx + slopeM * incDy;
    const sHit = (bxTop - (x0 + slopeM * y0)) / denom;
    const xHit = x0 + incDx * sHit;
    const yHit = y0 + incDy * sHit;

    // 空气段：从画面最左端 (-940) 一直画到交点 sHit（若玻璃还在画面外，则直接直线穿透整个 1920 画面！）
    const airStartS = -940;
    const airEndS = Math.min(1380, sHit);

    if (airEndS > airStartS) {
      const airSteps = Math.max(80, Math.round((airEndS - airStartS) / 10));
      ctx.beginPath();
      for (let k = 0; k <= airSteps; k++) {
        const s = lerp(airStartS, airEndS, k / airSteps);
        const w = Math.sin((TAU * s) / airLambda - omega * t + band.phase) * airAmp;
        const px = x0 + incDx * s + incNx * w;
        const py = y0 + incDy * s + incNy * w;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(band.hex, 0.14);
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.strokeStyle = rgba(band.hex, 0.80);
      ctx.lineWidth = 5.4;
      ctx.stroke();

      // 空气段同步冲浪光子珠（全部 7 色同速前进！）
      for (let m = 0; m < 3; m++) {
        const s = airStartS + (((m * 520 + t * 215) % Math.max(120, airEndS - airStartS)));
        if (s > airEndS - 20) continue;
        const w = Math.sin((TAU * s) / airLambda - omega * t + band.phase) * airAmp;
        const px = x0 + incDx * s + incNx * w;
        const py = y0 + incDy * s + incNy * w;
        if (px > 10 && px < STAGE_W - 10 && py > 10 && py < STAGE_H - 10) {
          beadPoints.push({ x: px, y: py, color: band.hex });
        }
      }
    }

    // 玻璃内部段：只要交点进入画面内（xHit < STAGE_W + 40），右侧立即实时发生减速、波长压缩与动态弯折！
    if (xHit < STAGE_W + 40 && pGlassPresent > 0.02) {
      // 弯折角随玻璃推进平滑舒展（从直行 14° 自然过渡到各色完整折射角，丝毫不生硬！）
      const bendProgress = clamp((STAGE_W + 40 - xHit) / 420);
      const targetRefDeg = 16 + i * 3.85;
      const curRefDeg = lerp(14, targetRefDeg, easeEditorialOut(bendProgress));
      const refAng = (curRefDeg * Math.PI) / 180;
      const rDx = Math.cos(refAng);
      const rDy = Math.sin(refAng);
      const rNx = -rDy;
      const rNy = rDx;

      const glassLen = Math.max(40, (STAGE_W + 180 - xHit) / Math.max(0.35, rDx));
      const glassLambda = lerp(airLambda, lerp(96, 42, i / 6), easeEditorialOut(bendProgress));
      const glassAmp = lerp(airAmp, lerp(12.2, 14.6, i / 6), easeEditorialOut(bendProgress));
      // 保持在交点处相位严格连续！
      const phaseAtHit = (TAU * sHit) / airLambda + band.phase;

      // 惠更斯次级子波扩散弧
      for (let wv = 0; wv < 2; wv++) {
        const wu = (t * 0.65 + i * 0.14 + wv * 0.5) % 1;
        const wr = wu * lerp(72, 46, i / 6);
        ctx.strokeStyle = rgba(band.hex, (1 - wu) * 0.34 * bendProgress);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(xHit, yHit, wr, -0.75, 1.25);
        ctx.stroke();
      }

      // 垂直推进波前短标（红波宽 vs 紫波密）
      if ((i === 0 || i === 6) && bendProgress > 0.35) {
        const wfCount = Math.floor(glassLen / glassLambda);
        const phaseOff = ((omega * t - phaseAtHit) / TAU) * glassLambda;
        ctx.strokeStyle = rgba(band.hex, 0.30 * bendProgress);
        ctx.lineWidth = 1.8;
        for (let m = 0; m < wfCount; m++) {
          const s = ((m * glassLambda + phaseOff) % glassLen + glassLen) % glassLen;
          if (s < 18 || s > glassLen - 14) continue;
          const bx = xHit + rDx * s;
          const by = yHit + rDy * s;
          ctx.beginPath();
          ctx.moveTo(bx - rNx * 22, by - rNy * 22);
          ctx.lineTo(bx + rNx * 22, by + rNy * 22);
          ctx.stroke();
        }
      }

      const glassSteps = Math.max(120, Math.min(360, Math.round(glassLen / 3.5)));
      ctx.beginPath();
      for (let k = 0; k <= glassSteps; k++) {
        const s = (k / glassSteps) * glassLen;
        const w = Math.sin((TAU * s) / glassLambda - omega * t + phaseAtHit) * glassAmp;
        const px = xHit + rDx * s + rNx * w;
        const py = yHit + rDy * s + rNy * w;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rgba(band.hex, 0.18);
      ctx.lineWidth = 24;
      ctx.stroke();
      ctx.strokeStyle = rgba(band.hex, 0.90);
      ctx.lineWidth = 5.2;
      ctx.stroke();

      const speedPx = lerp(165, 86, i / 6);
      for (let m = 0; m < 4; m++) {
        const s = ((m * 280 + t * speedPx) % Math.max(40, glassLen));
        const w = Math.sin((TAU * s) / glassLambda - omega * t + phaseAtHit) * glassAmp;
        const px = xHit + rDx * s + rNx * w;
        const py = yHit + rDy * s + rNy * w;
        if (px < STAGE_W + 10 && py < STAGE_H + 10) {
          beadPoints.push({ x: px, y: py, color: band.hex });
        }
      }
      if (xHit > 10 && xHit < STAGE_W - 10) {
        beadPoints.push({ x: xHit, y: yHit, color: band.hex, isHit: true });
      }
    }
  }
  ctx.restore();

  for (const pt of beadPoints) {
    if (pt.isHit) {
      drawStarlightGlint(ctx, pt.x, pt.y, 12, "#FFFFFF", pt.color, 0.82, t * 0.4);
    } else {
      ctx.fillStyle = rgba(pt.color, 0.28);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#FFFDF9";
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. 玻璃滑定后显现的黄铜光学放大镜（v_violet ≈ 0.62 c）
  if (pLoupe > 0.02) {
    const lx = 740;
    const ly = 815;
    const lr = 76 * lerp(0.8, 1.0, pLoupe);
    ctx.save();
    ctx.globalAlpha = clamp(alpha * pLoupe);

    ctx.shadowColor = "rgba(28, 42, 48, 0.14)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(255, 253, 249, 0.38)";
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, TAU);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "#C59753";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 253, 249, 0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(lx, ly, lr - 4, 0, TAU);
    ctx.stroke();

    drawPaperCard(ctx, lx - 82, ly + lr + 12, 164, 30, {
      radius: 15,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: "rgba(197, 151, 83, 0.55)",
      lineWidth: 1.2,
      shadowBlur: 10,
      shadowOffsetY: 3,
    });
    ctx.font = `600 12.5px ${FONTS.mono}`;
    ctx.fillStyle = "#694A91";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("v_violet ≈ 0.62 c", lx, ly + lr + 27);
    ctx.restore();
  }

  // 4. 红光长步幅 vs 紫光短步幅暖纸标尺卡
  if (pCallout > 0.02) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * pCallout);

    drawPaperCard(ctx, 1140, 224, 308, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: "rgba(229, 107, 111, 0.42)",
      lineWidth: 1.3,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    ctx.strokeStyle = "#D4575C";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(1162, 247);
    ctx.lineTo(1238, 247);
    ctx.moveTo(1162, 239);
    ctx.lineTo(1162, 255);
    ctx.moveTo(1238, 239);
    ctx.lineTo(1238, 255);
    ctx.stroke();
    ctx.font = `600 15px ${FONTS.sans}`;
    ctx.fillStyle = "#B5464B";
    ctx.textBaseline = "middle";
    ctx.fillText("红光 · 长波舒展 · 微折", 1254, 248);

    drawPaperCard(ctx, 1112, 930, 296, 46, {
      radius: 23,
      fill: "rgba(255, 253, 249, 0.94)",
      stroke: "rgba(142, 108, 187, 0.42)",
      lineWidth: 1.3,
      shadowBlur: 14,
      shadowOffsetY: 5,
    });
    ctx.strokeStyle = "#7D5BA8";
    ctx.beginPath();
    ctx.moveTo(1134, 953);
    ctx.lineTo(1176, 953);
    ctx.moveTo(1134, 945);
    ctx.lineTo(1134, 961);
    ctx.moveTo(1176, 945);
    ctx.lineTo(1176, 961);
    ctx.stroke();
    ctx.fillStyle = "#694A91";
    ctx.fillText("紫光 · 短波紧促 · 急折", 1192, 954);

    ctx.restore();
  }

  ctx.restore();
}

/**
 * 绘制三种风格迥异、细节拉满的全景彩虹画幅（支持传入 swirlCollapse 供无缝卷曲演进至肥皂泡！）
 */
function drawStyledRainbowScene(ctx, styleId, t, alpha = 1, { showVernier = true } = {}) {
  const style = STYLE_PROFILES[styleId] || STYLE_PROFILES["paper-editorial"];
  ctx.save();
  ctx.globalAlpha = clamp(alpha);

  drawPaperBase(ctx, STAGE_W, STAGE_H, {
    baseColor: style.bg,
    tealGlow: styleId === "paper-editorial" ? 1.0 : 0.35,
    amberGlow: styleId === "paper-editorial" ? 1.0 : 0.45,
    dotGridAlpha: styleId === "narrative-collage" ? 0.045 : 0.024,
  });

  // 计算 7 道色光与倾斜光学分光接收尺的精确交点（保证每一道波与对应波长刻度 0.0px 严格对齐！）
  let vernierHits = null;
  let perBandLengths = null;
  if (styleId === "paper-editorial" && showVernier) {
    const geom = getPrismGeometry(640, 540, 278, 1);
    const nAng = (21.8 * Math.PI) / 180; // 垂直于中央绿光方向，构成真实倾斜光学接收屏
    const nx = Math.cos(nAng);
    const ny = Math.sin(nAng);
    const screenD = 1645;
    vernierHits = SPECTRUM.map((band, i) => {
      const u = 0.42 + (i / 6) * 0.34;
      const epX = lerp(geom.top.x, geom.right.x, u);
      const epY = lerp(geom.top.y, geom.right.y, u);
      const rad = (band.bendDeg * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      const s = (screenD - (epX * nx + epY * ny)) / (dx * nx + dy * ny);
      return {
        band,
        s,
        x: epX + dx * s,
        y: epY + dy * s,
      };
    });
    perBandLengths = vernierHits.map((h) => h.s);
  }

  if (styleId === "paper-editorial") {
    drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.95);
    drawPopupPaperDiorama(ctx, 660, 560, 1, 0.88);
    drawBrassGoniometer(ctx, 640, 540, 365, t, { alpha: 0.92, reveal: 1 });

    // 倾斜光学分光游标接收尺（每道波长刻度精准落在对应色波的物理落点上！）
    if (vernierHits) {
      ctx.save();
      const first = vernierHits[0];
      const last = vernierHits[vernierHits.length - 1];
      const ux = last.x - first.x;
      const uy = last.y - first.y;
      const uLen = Math.hypot(ux, uy) || 1;
      const tx = ux / uLen;
      const ty = uy / uLen;

      // 细雅黄铜-墨线倾斜接收标尺脊线
      ctx.strokeStyle = "rgba(176, 128, 66, 0.42)";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(first.x - tx * 28, first.y - ty * 28);
      ctx.lineTo(last.x + tx * 28, last.y + ty * 28);
      ctx.stroke();

      // 尺背柔和暖白纸条底托
      ctx.strokeStyle = "rgba(255, 253, 249, 0.72)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(first.x - tx * 20, first.y - ty * 20);
      ctx.lineTo(last.x + tx * 20, last.y + ty * 20);
      ctx.stroke();

      // 顶部微型标题
      ctx.font = `600 11.5px ${FONTS.mono}`;
      ctx.fillStyle = "rgba(138, 96, 44, 0.75)";
      ctx.textAlign = "left";
      ctx.fillText("SPECTRUM SCALE · λ", first.x + 14, first.y - 34);

      vernierHits.forEach((hit, idx) => {
        const b = hit.band;
        const pulse = 0.86 + 0.14 * Math.sin(t * 3.5 - idx * 0.7);

        // 柔和色光落点晕斑
        const rg = ctx.createRadialGradient(hit.x, hit.y, 1, hit.x, hit.y, 18);
        rg.addColorStop(0, rgba(b.hex, 0.55 * pulse));
        rg.addColorStop(1, rgba(b.hex, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(hit.x, hit.y, 18, 0, TAU);
        ctx.fill();

        // 精确落点圆珠标
        ctx.fillStyle = "#FFFDF9";
        ctx.strokeStyle = b.hex;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(hit.x, hit.y, 5.2, 0, TAU);
        ctx.fill();
        ctx.stroke();

        // 水平细短引线 -> 色块 + 精确纳米数与中文色名
        ctx.strokeStyle = rgba(b.hex, 0.45);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hit.x + 8, hit.y);
        ctx.lineTo(hit.x + 26, hit.y);
        ctx.stroke();

        ctx.fillStyle = rgba(b.hex, 0.92);
        roundRectPath(ctx, hit.x + 30, hit.y - 6, 12, 12, 3);
        ctx.fill();

        ctx.font = `600 13px ${FONTS.mono}`;
        ctx.fillStyle = COLORS.inkPrimary;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${b.wavelengthNm}nm`, hit.x + 49, hit.y);

        ctx.font = `500 12.5px ${FONTS.sans}`;
        ctx.fillStyle = COLORS.inkSecondary;
        ctx.fillText(b.zh, hit.x + 104, hit.y);
      });
      ctx.restore();
    }

    // 上空漂浮的 2 枚微缩半透明折纸小棱晶
    [
      { x: 1320, y: 185 + Math.sin(t * 1.4) * 10, s: 28, rot: 0.28 },
      { x: 1540, y: 270 + Math.cos(t * 1.2) * 12, s: 20, rot: -0.42 },
    ].forEach((sh) => {
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot + Math.sin(t * 0.7) * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, -sh.s);
      ctx.lineTo(sh.s * 0.82, sh.s * 0.65);
      ctx.lineTo(-sh.s * 0.82, sh.s * 0.65);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 253, 249, 0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(18, 148, 141, 0.30)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });
  } else if (styleId === "modern-graphic") {
    // Bauhaus / 瑞士海报展视觉奇观！
    ctx.save();
    // 右上明快 Bauhaus 几何构图 + 旋转色轮指南针
    ctx.fillStyle = "rgba(236, 75, 83, 0.16)";
    ctx.beginPath();
    ctx.arc(1660, 210, 195, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "rgba(34, 98, 196, 0.14)";
    ctx.fillRect(1560, 74, 210, 78);
    ctx.strokeStyle = "#202638";
    ctx.lineWidth = 3;
    ctx.strokeRect(1560, 74, 210, 78);

    // 右上小型 Bauhaus 7 色旋转色轮
    ctx.save();
    ctx.translate(1665, 210);
    ctx.rotate(t * 0.25);
    style.palette.forEach((col, i) => {
      const a0 = (i / 7) * TAU;
      const a1 = ((i + 1) / 7) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 52, a0, a1);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    });
    ctx.fillStyle = style.bg;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#202638";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // 围绕棱镜的硬边瑞士旋转色弧
    ctx.save();
    ctx.translate(640, 540);
    ctx.rotate(t * 0.08);
    ctx.strokeStyle = "rgba(32, 38, 56, 0.24)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 390, -0.45, 0.95);
    ctx.stroke();
    ctx.strokeStyle = "#F0833A";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 414, -0.25, 0.35);
    ctx.stroke();
    ctx.strokeStyle = "#2262C4";
    ctx.beginPath();
    ctx.arc(0, 0, 414, 0.42, 0.85);
    ctx.stroke();
    ctx.restore();

    // 醒目瑞士排版标题与几何箭头标（λ↑ θ↓ / λ↓ θ↑）
    ctx.font = `700 88px ${FONTS.sans}`;
    ctx.fillStyle = "rgba(32, 38, 56, 0.08)";
    ctx.fillText("SPECTRUM", 1090, 224);
    ctx.font = `700 22px ${FONTS.mono}`;
    ctx.fillStyle = "rgba(32, 38, 56, 0.62)";
    ctx.fillText("405nm — 680nm · DISPERSION", 1096, 268);

    // 左侧 Bauhaus 竖向三色块展览标
    ["#EC4B53", "#E3BA34", "#2262C4"].forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(78, 120 + idx * 42, 26, 26);
      ctx.strokeStyle = "#202638";
      ctx.lineWidth = 2;
      ctx.strokeRect(78, 120 + idx * 42, 26, 26);
    });
    ctx.restore();
  } else if (styleId === "narrative-collage") {
    // 手工叙事拼贴风：复古雕版太阳射线 + 撕边和纸条 + 金属回形针色标卡 + 缝线轨迹 + 朱红邮戳！
    ctx.save();
    ctx.fillStyle = "rgba(215, 174, 82, 0.24)";
    ctx.beginPath();
    ctx.arc(640, 540, 345, 0, TAU);
    ctx.fill();

    // 雕版太阳细放射光线（旋转极缓慢，宛如古老天体光学版画！）
    ctx.save();
    ctx.translate(640, 540);
    ctx.rotate(t * 0.03);
    ctx.strokeStyle = "rgba(138, 96, 44, 0.16)";
    ctx.lineWidth = 1.2;
    for (let r = 0; r < 36; r++) {
      const a = (r / 36) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 345, Math.sin(a) * 345);
      ctx.lineTo(Math.cos(a) * (r % 2 === 0 ? 396 : 374), Math.sin(a) * (r % 2 === 0 ? 396 : 374));
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(59, 55, 48, 0.36)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(640, 540, 368, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 左上斜贴手工牛皮纸撕边便签 + 半透明和纸胶带
    ctx.save();
    ctx.translate(115, 118);
    ctx.rotate(-0.045);
    drawPaperCard(ctx, 0, 0, 348, 96, {
      radius: 3,
      fill: "#F8F1E1",
      stroke: "rgba(59, 55, 48, 0.34)",
      lineWidth: 1.6,
      shadowBlur: 14,
      shadowOffsetY: 6,
    });
    ctx.fillStyle = "rgba(217, 107, 82, 0.38)";
    ctx.fillRect(118, -14, 112, 26);
    ctx.font = `600 18px ${FONTS.serif}`;
    ctx.fillStyle = "#2C2B29";
    ctx.fillText("牛顿色散手记 · 1672", 24, 40);
    ctx.font = `400 13px ${FONTS.mono}`;
    ctx.fillStyle = "#6B6558";
    ctx.fillText("COLLAGE EDITION · HANDMADE", 24, 68);
    ctx.restore();

    // 右上手工拼贴色标卡 + 手绘黄铜回形针 + 朱红邮戳
    ctx.save();
    ctx.translate(1505, 120);
    ctx.rotate(0.05);
    drawPaperCard(ctx, 0, 0, 278, 84, {
      radius: 4,
      fill: "#F8F1E1",
      stroke: "rgba(59, 55, 48, 0.36)",
      lineWidth: 1.6,
      shadowBlur: 14,
      shadowOffsetY: 6,
    });
    style.palette.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(18 + idx * 35, 19, 27, 46);
    });
    // 精致黄铜回形针夹住色卡上缘
    ctx.strokeStyle = "#B88648";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.roundRect(228, -14, 16, 46, 8);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(1748, 250);
    ctx.rotate(-0.18);
    ctx.strokeStyle = "rgba(196, 82, 58, 0.65)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, TAU);
    ctx.stroke();
    ctx.font = `700 13px ${FONTS.mono}`;
    ctx.fillStyle = "rgba(196, 82, 58, 0.74)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OPTICS", 0, -9);
    ctx.fillText("1672", 0, 11);
    ctx.restore();

    ctx.restore();
  }

  drawRainbowOptics(ctx, {
    cx: 640,
    cy: 540,
    size: 278,
    t,
    popup: 1,
    beamProgress: 1,
    dispersionProgress: 1,
    styleId,
    alpha: 1,
    showWaveBeads: true,
    ribbonLen: 1140,
    perBandLengths,
  });

  // 风格左下角刊物印章标
  ctx.save();
  drawPaperCard(ctx, 78, 924, 278, 58, {
    radius: 29,
    fill: "rgba(255, 253, 249, 0.92)",
    stroke: "rgba(28, 42, 48, 0.16)",
    lineWidth: 1.3,
    shadowBlur: 14,
    shadowOffsetY: 5,
  });
  ctx.fillStyle = style.palette[3];
  ctx.beginPath();
  ctx.arc(108, 953, 6.5, 0, TAU);
  ctx.fill();
  ctx.font = `600 18px ${FONTS.serif}`;
  ctx.fillStyle = style.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(style.name, 128, 953);
  ctx.font = `500 12px ${FONTS.mono}`;
  ctx.fillStyle = style.muted;
  ctx.fillText(style.id, 232, 954);
  ctx.restore();

  ctx.restore();
}

/**
 * 82.2s – 92.0s 全连续物理变奏渲染器（彻底消除任何对象硬切！）
 * 四个大型视觉对象（拼贴彩虹 -> 肥皂泡 -> PN 结 -> 真 3D 双骰子 -> 暖纸彩虹）通过平滑缩放、卷曲、变形与粒子接力无缝衔接！
 */
function drawContinuousCrossTopicMorphs(ctx, t) {
  // 过渡窗口权重（每个相邻对象有 ~0.8–1.1s 重叠变形桥接！）
  const pCollageToSoap = easeEditorialInOut(segProgress(t, 82.2, 83.4));
  const pSoapToPn = easeEditorialInOut(segProgress(t, 85.2, 86.4));
  const pPnToDice = easeEditorialInOut(segProgress(t, 88.2, 89.3));
  const pDiceToRainbow = easeEditorialInOut(segProgress(t, 90.7, 92.0));

  // 统一暖纸底层 + 斜阳
  drawPaperBase(ctx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
  drawDappledSunlight(ctx, STAGE_W, STAGE_H, t, 0.88);

  // ── A. 82.2–83.4s：叙事拼贴彩虹向圆心卷曲收缩并无缝融入肥皂泡 ────────────
  if (t < 83.45) {
    const a = 1 - pCollageToSoap;
    const sc = lerp(1.0, 0.56, pCollageToSoap);
    ctx.save();
    ctx.translate(lerp(STAGE_W * 0.5, 960, pCollageToSoap), lerp(STAGE_H * 0.5, 518, pCollageToSoap));
    ctx.scale(sc, sc);
    ctx.rotate(pCollageToSoap * 0.16);
    ctx.translate(-STAGE_W * 0.5, -STAGE_H * 0.5);
    drawStyledRainbowScene(ctx, "narrative-collage", t, a);
    ctx.restore();
  }

  // ── B. 82.6–86.4s：肥皂泡浮群 + 入射日光双面干涉光束 -> 形变压平并飞出粒子接力 PN 结 ──
  if (t >= 82.5 && t <= 86.5) {
    const pIn = springProgress(segProgress(t, 82.6, 83.8), 0.62, 0.78, 17);
    const pOut = pSoapToPn;
    const alpha = clamp(pIn * (1 - Math.max(0, (pOut - 0.35) / 0.65)));

    const cx = lerp(960, 860, pOut);
    const cy = lerp(518 + Math.sin(t * 2.6) * 8, 446, pOut);
    const rx = lerp(lerp(42, 272, pIn), 530, pOut); // 从圆泡平滑拉宽为陶瓷结宽度！
    const ry = lerp(lerp(42, 272, pIn), 185, pOut); // 从圆泡平滑压平为陶瓷结高度！

    ctx.save();
    ctx.globalAlpha = alpha;

    // 卫星浮泡随 pOut 平滑收拢归位
    const satFade = (1 - pOut * 1.4);
    if (satFade > 0.02) {
      const satellites = [
        { x: 510, y: 310 + Math.sin(t * 2.1) * 12, r: 74 * pIn },
        { x: 1430, y: 350 + Math.cos(t * 1.9) * 14, r: 92 * pIn },
        { x: 1360, y: 740 + Math.sin(t * 2.4 + 1) * 10, r: 52 * pIn },
        { x: 575, y: 735 + Math.cos(t * 2.2 + 2) * 10, r: 44 * pIn },
      ];
      ctx.save();
      ctx.globalAlpha = clamp(alpha * satFade);
      for (const sat of satellites) {
        const sg = ctx.createRadialGradient(sat.x - sat.r * 0.3, sat.y - sat.r * 0.3, 4, sat.x, sat.y, sat.r);
        sg.addColorStop(0, "rgba(255, 255, 255, 0.88)");
        sg.addColorStop(0.65, "rgba(220, 245, 242, 0.34)");
        sg.addColorStop(0.92, "rgba(242, 153, 74, 0.24)");
        sg.addColorStop(1, "rgba(78, 124, 246, 0.36)");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sat.x, sat.y, sat.r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(18, 148, 141, 0.28)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawBrassGoniometer(ctx, cx, cy, 348, t * 1.2, { alpha: 0.52 * (1 - pOut), reveal: pIn, showVernier: false });

    // 主变形肥皂泡（圆角矩形由 r=272 平滑过渡到 r=26，真正做到“形变衔接”！）
    const cornerR = lerp(Math.min(rx, ry), 26, pOut);
    roundRectPath(ctx, cx - rx, cy - ry, rx * 2, ry * 2, cornerR);
    const bubbleGrad = ctx.createRadialGradient(cx - rx * 0.28, cy - ry * 0.3, 12, cx, cy, Math.max(rx, ry));
    bubbleGrad.addColorStop(0, "rgba(255, 254, 251, 0.96)");
    bubbleGrad.addColorStop(0.50, "rgba(232, 248, 245, 0.50)");
    bubbleGrad.addColorStop(0.80, "rgba(242, 153, 74, 0.28)");
    bubbleGrad.addColorStop(0.93, "rgba(78, 124, 246, 0.34)");
    bubbleGrad.addColorStop(1, "rgba(18, 148, 141, 0.48)");
    ctx.fillStyle = bubbleGrad;
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, cx - rx + 2, cy - ry + 2, rx * 2 - 4, ry * 2 - 4, Math.max(2, cornerR - 2));
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < SPECTRUM.length; i++) {
      const band = SPECTRUM[i];
      ctx.beginPath();
      const yBase = cy - ry * 0.58 + i * (ry * 0.195);
      for (let k = 0; k <= 80; k++) {
        const x = cx - rx + (k / 80) * rx * 2;
        const y = yBase + Math.sin(x * 0.015 + t * 3.4 + i * 0.85) * 26 * (1 - pOut * 0.7);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(band.hex, 0.48 * (1 - pOut * 0.8));
      ctx.lineWidth = 15;
      ctx.stroke();
    }
    ctx.restore();

    roundRectPath(ctx, cx - rx, cy - ry, rx * 2, ry * 2, cornerR);
    ctx.strokeStyle = "rgba(18, 148, 141, 0.44)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 入射日光射中泡膜上沿，反射出内外膜双波干涉光束（纯视觉惊艳！）
    if (pOut < 0.35) {
      const rayA = (1 - pOut / 0.35) * pIn;
      const hitX = cx - 96;
      const hitY = cy - 252;
      ctx.save();
      ctx.globalAlpha = rayA;
      ctx.strokeStyle = "rgba(242, 185, 102, 0.85)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hitX - 180, hitY - 96);
      ctx.lineTo(hitX, hitY);
      ctx.stroke();
      // 外膜与内膜两条反射彩色干涉波
      [0, 1].forEach((k) => {
        ctx.beginPath();
        for (let s = 0; s <= 180; s += 6) {
          const px = hitX + s * 0.88;
          const py = hitY - s * 0.46 + k * 14 + Math.sin(s * 0.12 - t * 6 + k * 0.8) * 5;
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = k === 0 ? "#E56B6F" : "#4E9AF1";
        ctx.lineWidth = 2.6;
        ctx.stroke();
      });
      drawStarlightGlint(ctx, hitX, hitY, 18, "#FFFFFF", COLORS.brandAmber, 0.95, t);
      ctx.restore();
    }

    // 20 枚表面活性剂分子在 pOut 期间直接飞向 PN 结的 P/N 载流子网格点！
    for (let m = 0; m < 16; m++) {
      const ang = (m / 16) * TAU + t * 0.38;
      const sx = cx + Math.cos(ang) * (rx + 28 * (1 - pOut));
      const sy = cy + Math.sin(ang) * (ry + 28 * (1 - pOut));
      const isLeft = m < 8;
      const colIdx = m % 4;
      const rowIdx = Math.floor((m % 8) / 4);
      const tx = isLeft ? 860 - 530 + 68 + colIdx * 92 : 860 + 530 - 68 - colIdx * 92;
      const ty = 446 - 185 + 62 + rowIdx * 164;
      const px = lerp(sx, tx, pOut);
      const py = lerp(sy, ty, pOut);

      if (pOut < 0.6) {
        ctx.strokeStyle = rgba(COLORS.brandAmber, 0.78 * (1 - pOut / 0.6));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(cx + Math.cos(ang) * (rx + 6), cy + Math.sin(ang) * (ry + 6));
        ctx.stroke();
      }
      ctx.fillStyle = isLeft ? "#DC6B5C" : COLORS.brandTeal;
      ctx.beginPath();
      ctx.arc(px, py, lerp(6.2, 10.5, pOut), 0, TAU);
      ctx.fill();
    }

    if (pOut < 0.5) {
      ctx.globalAlpha = clamp(alpha * (1 - pOut * 2));
      drawPaperCard(ctx, cx + 272 + 86, cy - 68, 252, 136, {
        radius: 16,
        fill: "rgba(255, 253, 249, 0.94)",
        stroke: rgba(COLORS.brandTeal, 0.34),
        lineWidth: 1.3,
        shadowBlur: 18,
        shadowOffsetY: 7,
      });
      ctx.font = `600 15px ${FONTS.serif}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.fillText("薄膜双面反射干涉", cx + 272 + 108, cy - 36);
      [0, 1].forEach((k) => {
        ctx.beginPath();
        for (let px = 0; px <= 198; px += 4) {
          const py = cy + 8 + k * 24 + Math.sin(px * 0.08 - t * 6 + k * 1.1) * 7;
          px === 0 ? ctx.moveTo(cx + 272 + 108 + px, py) : ctx.lineTo(cx + 272 + 108 + px, py);
        }
        ctx.strokeStyle = k === 0 ? "#E56B6F" : "#4E9AF1";
        ctx.lineWidth = 2.4;
        ctx.stroke();
      });

      ctx.font = `600 20px ${FONTS.serif}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.textAlign = "center";
      ctx.fillText("薄膜干涉与表面张力 · 肥皂泡的彩色奥秘", 960, 898);
    }
    ctx.restore();
  }

  // ── C. 85.7–89.3s：精工陶瓷 PN 结 + 实时能垒山丘 + 发光暖金灯丝泡 + 黄铜微安表 ──
  if (t >= 85.7 && t <= 89.35) {
    const pIn = easeEditorialOut(segProgress(t, 85.7, 86.5));
    const pBias = easeEditorialInOut(segProgress(t, 86.6, 88.1));
    const pOut = pPnToDice;
    const alpha = clamp(pIn * (1 - pOut));

    const cx = 860;
    const cy = 446;
    const boxW = lerp(1060, 560, pOut);
    const boxH = lerp(370, 260, pOut);
    const x0 = cx - boxW * 0.5;
    const y0 = cy - boxH * 0.5;
    const depW = lerp(176, 52, pBias);

    ctx.save();
    ctx.globalAlpha = alpha;

    // 外接黄铜优雅回路线（连接 PN 结两端 -> 右侧暖金发光灯丝泡 & 微安表！）
    if (pOut < 0.45) {
      const wireA = (1 - pOut / 0.45) * pIn;
      ctx.save();
      ctx.globalAlpha = alpha * wireA;
      ctx.strokeStyle = pBias > 0.25 ? rgba(COLORS.brandAmber, 0.72) : "rgba(176, 128, 66, 0.35)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(x0 + boxW, cy - 60);
      ctx.lineTo(1435, cy - 60);
      ctx.lineTo(1435, 340);
      ctx.lineTo(1585, 340);
      ctx.stroke();

      // 沿黄铜导线流动的电流光点（正向导通后加速流动！）
      if (pBias > 0.15) {
        for (let k = 0; k < 5; k++) {
          const u = (k / 5 + t * 0.9 * pBias) % 1;
          const wx = lerp(x0 + boxW, 1585, u);
          const wy = wx < 1435 ? cy - 60 : 340;
          ctx.fillStyle = COLORS.brandAmber;
          ctx.beginPath();
          ctx.arc(wx, wy, 4.2, 0, TAU);
          ctx.fill();
        }
      }

      // 发光暖金灯丝灯泡（随导通电流明亮发光！）
      const bx = 1585;
      const by = 248;
      if (pBias > 0.08) {
        const glowR = 32 + pBias * 88;
        const bg = ctx.createRadialGradient(bx, by, 6, bx, by, glowR);
        bg.addColorStop(0, rgba("#FFF8DE", 0.92 * pBias));
        bg.addColorStop(0.45, rgba(COLORS.brandAmber, 0.45 * pBias));
        bg.addColorStop(1, rgba(COLORS.brandAmber, 0));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, glowR, 0, TAU);
        ctx.fill();

        // 8 道克制刊物光芒短线
        ctx.strokeStyle = rgba(COLORS.brandAmber, 0.75 * pBias);
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        for (let r = 0; r < 8; r++) {
          const a = (r / 8) * TAU + t * 0.25;
          ctx.beginPath();
          ctx.moveTo(bx + Math.cos(a) * 44, by + Math.sin(a) * 44);
          ctx.lineTo(bx + Math.cos(a) * (54 + pBias * 16), by + Math.sin(a) * (54 + pBias * 16));
          ctx.stroke();
        }
      }
      ctx.fillStyle = pBias > 0.2 ? "#FFF8E2" : "#FFFDF9";
      ctx.strokeStyle = pBias > 0.2 ? COLORS.brandAmber : "rgba(28, 42, 48, 0.28)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(bx, by, 34, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // 灯丝
      ctx.strokeStyle = pBias > 0.2 ? "#E07D20" : "#8A9599";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 20);
      ctx.lineTo(bx - 8, by - 4);
      ctx.quadraticCurveTo(bx, by - 16, bx + 8, by - 4);
      ctx.lineTo(bx + 10, by + 20);
      ctx.stroke();
      ctx.fillStyle = "#B88648";
      roundRectPath(ctx, bx - 14, by + 32, 28, 14, 4);
      ctx.fill();
      ctx.restore();
    }

    // 陶瓷结本体
    drawPaperCard(ctx, x0, y0, boxW, boxH, {
      radius: 26,
      fill: COLORS.paperElevated,
      stroke: "rgba(28, 42, 48, 0.24)",
      lineWidth: 2.2,
      shadowBlur: 30,
      shadowOffsetY: 14,
    });

    ctx.save();
    roundRectPath(ctx, x0 + 2, y0 + 2, boxW - 4, boxH - 4, 24);
    ctx.clip();

    ctx.fillStyle = "rgba(242, 153, 74, 0.12)";
    ctx.fillRect(x0, y0, boxW * 0.5 - depW * 0.5, boxH);
    ctx.fillStyle = "rgba(18, 148, 141, 0.12)";
    ctx.fillRect(cx + depW * 0.5, y0, boxW * 0.5 - depW * 0.5, boxH);
    ctx.fillStyle = "rgba(28, 42, 48, 0.055)";
    ctx.fillRect(cx - depW * 0.5, y0, depW, boxH);

    ctx.strokeStyle = "rgba(28, 42, 48, 0.22)";
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - depW * 0.5, y0);
    ctx.lineTo(cx - depW * 0.5, y0 + boxH);
    ctx.moveTo(cx + depW * 0.5, y0);
    ctx.lineTo(cx + depW * 0.5, y0 + boxH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let r = 0; r < 4; r++) {
      const iy = y0 + 56 + r * 86;
      ctx.font = `700 16px ${FONTS.mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(198, 90, 75, 0.36)";
      ctx.fillText("⊖", cx - depW * 0.26, iy);
      ctx.fillStyle = "rgba(18, 148, 141, 0.36)";
      ctx.fillText("⊕", cx + depW * 0.26, iy);
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const drift = pBias * 185 * (1 - pOut);
        const hx = x0 + 68 + c * 92 + drift * 0.58;
        const hy = y0 + 62 + r * 82 + Math.sin(t * 4.5 + r + c) * 4;
        ctx.strokeStyle = "#DC6B5C";
        ctx.lineWidth = 3.2;
        ctx.fillStyle = "#FFFDF9";
        ctx.beginPath();
        ctx.arc(hx, hy, 12, 0, TAU);
        ctx.fill();
        ctx.stroke();

        const ex = x0 + boxW - 68 - c * 92 - drift * 0.58;
        const ey = y0 + 62 + r * 82 + Math.cos(t * 4.5 + r - c) * 4;
        ctx.fillStyle = COLORS.brandTeal;
        ctx.beginPath();
        ctx.arc(ex, ey, 11, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // 下方势垒地形图
    if (pOut < 0.55) {
      const hillY = 740;
      const hillW = 780;
      const hx0 = cx - hillW * 0.5;
      const dropH = lerp(112, 30, pBias);
      ctx.save();
      ctx.globalAlpha = alpha * (1 - pOut / 0.55);
      drawPaperCard(ctx, hx0 - 30, hillY - 76, hillW + 60, 178, {
        radius: 18,
        fill: "rgba(255, 253, 249, 0.94)",
        stroke: COLORS.inkHairline,
        lineWidth: 1.3,
        shadowBlur: 18,
        shadowOffsetY: 6,
      });
      ctx.beginPath();
      for (let k = 0; k <= 80; k++) {
        const u = k / 80;
        const px = hx0 + u * hillW;
        const s = 1 / (1 + Math.exp(-(u - 0.5) * 14));
        const py = hillY + 46 - s * dropH;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COLORS.brandPeriwinkle;
      ctx.lineWidth = 3.8;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.font = `600 14px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.textAlign = "left";
      ctx.fillText(`POTENTIAL BARRIER · 势垒高度 ${(lerp(0.7, 0.16, pBias)).toFixed(2)} eV`, hx0, hillY - 46);
      ctx.restore();
    }

    // 右侧黄铜微安表
    if (pOut < 0.55) {
      const mx = 1585;
      const my = 560;
      const mr = 142;
      ctx.save();
      ctx.globalAlpha = alpha * (1 - pOut / 0.55);
      drawPaperCard(ctx, mx - mr - 20, my - mr - 16, (mr + 20) * 2, (mr + 20) * 2 + 34, {
        radius: 24,
        fill: "#FFFDF9",
        stroke: "rgba(176, 128, 66, 0.42)",
        lineWidth: 2,
        shadowBlur: 24,
        shadowOffsetY: 10,
      });
      ctx.strokeStyle = "rgba(28, 42, 48, 0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my + 16, mr * 0.78, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      for (let k = 0; k <= 12; k++) {
        const ang = lerp(Math.PI * 1.15, Math.PI * 1.85, k / 12);
        ctx.strokeStyle = k >= 9 ? COLORS.brandTeal : "rgba(28, 42, 48, 0.35)";
        ctx.lineWidth = k % 3 === 0 ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(ang) * mr * 0.68, my + 16 + Math.sin(ang) * mr * 0.68);
        ctx.lineTo(mx + Math.cos(ang) * mr * 0.78, my + 16 + Math.sin(ang) * mr * 0.78);
        ctx.stroke();
      }
      const needleAng = lerp(Math.PI * 1.20, Math.PI * 1.78, pBias);
      ctx.strokeStyle = "#C65A4B";
      ctx.lineWidth = 3.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mx, my + 16);
      ctx.lineTo(mx + Math.cos(needleAng) * mr * 0.64, my + 16 + Math.sin(needleAng) * mr * 0.64);
      ctx.stroke();
      ctx.fillStyle = "#B88648";
      ctx.beginPath();
      ctx.arc(mx, my + 16, 9, 0, TAU);
      ctx.fill();
      ctx.font = `700 24px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.brandTealDark;
      ctx.textAlign = "center";
      ctx.fillText(`${(pBias * 18.4).toFixed(1)} mA`, mx, my + 90);
      ctx.font = `500 13px ${FONTS.sans}`;
      ctx.fillStyle = COLORS.inkSecondary;
      ctx.fillText("正向导通电流 · FORWARD BIAS", mx, my + 118);
      ctx.restore();
    }

    ctx.font = `600 21px ${FONTS.mono}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#C65A4B";
    ctx.fillText("P-TYPE · 空穴", cx - boxW * 0.3, y0 - 26);
    ctx.fillStyle = COLORS.brandTealDark;
    ctx.fillText("N-TYPE · 电子", cx + boxW * 0.3, y0 - 26);
    ctx.restore();
  }

  // ── D. 88.6–92.0s：真 3D 双骰子 + 螺旋落粒 + P(7)=16.7% 皇冠 -> 平滑展开回归暖纸彩虹！ ──
  if (t >= 88.6) {
    // 90.7s 起底图平滑融回主线纸艺彩虹（与第四幕 92.0s 100% 像素级重合！）
    if (pDiceToRainbow > 0.02) {
      drawStyledRainbowScene(ctx, "paper-editorial", 92.0, pDiceToRainbow, { showVernier: false });
    }

    const pDiceIn = springProgress(segProgress(t, 88.6, 89.5), 0.56, 0.74, 18);
    const diceAlpha = clamp(pDiceIn * (1 - easeEditorialOut(segProgress(t, 90.8, 91.85))));
    if (diceAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = diceAlpha;

      const bars = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
      const baseY = 856;

      ctx.beginPath();
      for (let i = 0; i < bars.length; i++) {
        const bx = 460 + i * 100;
        const by = baseY - bars[i] * 40 * pDiceIn - 18;
        i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = rgba(COLORS.brandAmber, 0.48);
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < bars.length; i++) {
        const bx = 460 + i * 100;
        const bh = bars[i] * 40 * pDiceIn;
        const isSeven = i === 5;
        for (let u = 0; u < bars[i]; u++) {
          const uy = baseY - (u + 1) * 40 * pDiceIn + 4;
          roundRectPath(ctx, bx - 28, uy, 56, 32 * pDiceIn, 8);
          ctx.fillStyle = isSeven ? rgba(COLORS.brandAmber, 0.34 + u * 0.06) : rgba(COLORS.brandTeal, 0.14 + u * 0.04);
          ctx.fill();
          ctx.strokeStyle = isSeven ? COLORS.brandAmber : rgba(COLORS.brandTeal, 0.36);
          ctx.lineWidth = isSeven ? 2 : 1.2;
          ctx.stroke();
        }
        if (isSeven) {
          drawStarlightGlint(ctx, bx, baseY - bh - 36, 20, "#FFFFFF", COLORS.brandAmber, pDiceIn, t);
          drawPaperCard(ctx, bx - 88, baseY - bh - 86, 176, 32, {
            radius: 16,
            fill: "rgba(255, 253, 249, 0.95)",
            stroke: rgba(COLORS.brandAmber, 0.55),
            lineWidth: 1.3,
            shadowBlur: 12,
            shadowOffsetY: 4,
          });
          ctx.font = `700 13px ${FONTS.mono}`;
          ctx.fillStyle = "#A85D15";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("P(7) = 6/36 = 16.7%", bx, baseY - bh - 70);
        }
        ctx.font = `700 17px ${FONTS.mono}`;
        ctx.fillStyle = isSeven ? "#A85D15" : COLORS.inkSecondary;
        ctx.textAlign = "center";
        ctx.fillText(String(i + 2), bx, baseY + 28);
      }

      // 螺旋飞落进柱图的光彩概率粒子流（连接双骰子与下方钟形柱图的视觉魔力！）
      for (let p = 0; p < 12; p++) {
        const u = (p / 12 + t * 0.72) % 1;
        const targetCol = (p % 7) + 2;
        const tx = 460 + targetCol * 100;
        const pt = bezierPoint(
          { x: p % 2 === 0 ? 770 : 1150, y: 420 },
          { x: 960, y: 500 },
          { x: tx, y: 560 },
          { x: tx, y: baseY - bars[targetCol] * 40 },
          u
        );
        ctx.fillStyle = p % 2 === 0 ? rgba(COLORS.brandTeal, 0.72 * Math.sin(u * Math.PI)) : rgba(COLORS.brandAmber, 0.78 * Math.sin(u * Math.PI));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, TAU);
        ctx.fill();
      }

      const drawIsoDie = (cx, cy, s, tilt, topPips, leftPips, rightPips, accent) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);

        ctx.fillStyle = "rgba(28, 52, 58, 0.11)";
        ctx.beginPath();
        ctx.ellipse(6, s * 1.18, s * 0.92, s * 0.28, 0, 0, TAU);
        ctx.fill();

        const dx = s * 0.866;
        const dy = s * 0.5;
        const pTop = { x: 0, y: -s };
        const pRight = { x: dx, y: -dy };
        const pCenter = { x: 0, y: 0 };
        const pLeft = { x: -dx, y: -dy };
        const pBotLeft = { x: -dx, y: dy };
        const pBot = { x: 0, y: s };
        const pBotRight = { x: dx, y: dy };

        const drawFace = (pts, fill) => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = "rgba(28, 42, 48, 0.26)";
          ctx.lineWidth = 2;
          ctx.lineJoin = "round";
          ctx.stroke();
        };

        drawFace([pTop, pRight, pCenter, pLeft], "#FFFDF9");
        drawFace([pLeft, pCenter, pBot, pBotLeft], "#F1EAE0");
        drawFace([pCenter, pRight, pBotRight, pBot], "#E5DCCD");

        const mapPip = (face, u, v) => {
          const [a, b, c, d] = face;
          const fu = (u + 1) * 0.5;
          const fv = (v + 1) * 0.5;
          return {
            x: (1 - fu) * (1 - fv) * a.x + fu * (1 - fv) * b.x + fu * fv * c.x + (1 - fu) * fv * d.x,
            y: (1 - fu) * (1 - fv) * a.y + fu * (1 - fv) * b.y + fu * fv * c.y + (1 - fu) * fv * d.y,
          };
        };

        const pipLayouts = {
          1: [[0, 0]],
          2: [[-0.45, -0.45], [0.45, 0.45]],
          3: [[-0.48, -0.48], [0, 0], [0.48, 0.48]],
          4: [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]],
          5: [[-0.46, -0.46], [0.46, -0.46], [0, 0], [-0.46, 0.46], [0.46, 0.46]],
          6: [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0], [0.44, 0], [-0.44, 0.5], [0.44, 0.5]],
        };

        const paintPips = (face, count, col) => {
          ctx.fillStyle = col;
          for (const [u, v] of pipLayouts[count]) {
            const pt = mapPip(face, u, v);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, s * 0.095, 0, TAU);
            ctx.fill();
          }
        };

        paintPips([pTop, pRight, pCenter, pLeft], topPips, accent);
        paintPips([pLeft, pCenter, pBot, pBotLeft], leftPips, "rgba(28, 42, 48, 0.65)");
        paintPips([pCenter, pRight, pBotRight, pBot], rightPips, "rgba(28, 42, 48, 0.52)");

        ctx.restore();
      };

      const lift = Math.sin(clamp(segProgress(t, 88.6, 89.9)) * Math.PI) * 86;
      drawIsoDie(lerp(770, 640, pDiceToRainbow), lerp(360 - lift, 540, pDiceToRainbow), 96 * lerp(0.7, 1, pDiceIn), lerp(-0.24, -0.05, pDiceIn), 3, 5, 1, COLORS.brandTeal);
      drawIsoDie(lerp(1150, 640, pDiceToRainbow), lerp(360 - lift * 0.85, 540, pDiceToRainbow), 96 * lerp(0.7, 1, pDiceIn), lerp(0.28, 0.06, pDiceIn), 4, 2, 6, COLORS.brandAmber);

      drawPaperCard(ctx, 886, 316, 148, 48, {
        radius: 24,
        fill: "rgba(255, 253, 249, 0.94)",
        stroke: rgba(COLORS.brandAmber, 0.52),
        lineWidth: 1.5,
        shadowBlur: 14,
        shadowOffsetY: 5,
      });
      ctx.font = `700 20px ${FONTS.mono}`;
      ctx.fillStyle = "#A85D15";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("3 + 4 = 7", 960, 340);

      ctx.font = `600 20px ${FONTS.serif}`;
      ctx.fillStyle = COLORS.inkPrimary;
      ctx.fillText("36 种有序组合与概率分布 · 为什么双骰子最容易掷出 7？", 960, 932);
      ctx.restore();
    }
  }
}

/**
 * 第三幕「棱片」全连续无缝轨迹函数（52.0s – 92.0s）：
 * 彻底修复 1:13 处及任何段落交界的位置突变，保证每一帧都自然连续！
 */
function act03PrismPath(time) {
  // 52.0 – 55.2s：从第二幕划开终点 (1145, 760) 平滑滑升至右上守望点 (1690, 210)
  if (time < 55.2) {
    const u = easeEditorialOut(segProgress(time, 52.0, 55.2));
    return bezierPoint(
      { x: 1145, y: 760 },
      { x: 1320, y: 540 },
      { x: 1560, y: 310 },
      { x: 1690, y: 210 },
      u
    );
  }
  // 55.2 – 71.8s：柔和巡航呼吸
  if (time < 71.8) {
    return {
      x: 1690 + Math.sin((time - 55.2) * 0.9) * 16,
      y: 210 + Math.cos((time - 55.2) * 1.1) * 14,
    };
  }
  // 71.8 – 74.2s：平滑滑向右侧页缘 (1904, 540) 准备展开第一次 FOLD 翻页（零突变！）
  if (time < 74.2) {
    const u = easeEditorialInOut(segProgress(time, 71.8, 74.2));
    return bezierPoint(
      { x: 1690, y: 210 },
      { x: 1840, y: 270 },
      { x: 1904, y: 410 },
      { x: 1904, y: 540 },
      u
    );
  }
  // 74.2 – 76.4s：第一次 FOLD 翻页，从右扫向左
  if (time < 76.4) {
    const u = easeEditorialInOut(segProgress(time, 74.2, 76.4));
    return { x: lerp(1904, 18, u), y: 540 };
  }
  // 76.4 – 78.7s：从左缘 (18, 540) 优雅越过顶部高空弧线飞回右缘 (1904, 540) 承接第二次翻页！
  if (time < 78.7) {
    const u = easeEditorialInOut(segProgress(time, 76.4, 78.7));
    return bezierPoint(
      { x: 18, y: 540 },
      { x: 320, y: 120 },
      { x: 1600, y: 120 },
      { x: 1904, y: 540 },
      u
    );
  }
  // 78.7 – 80.9s：第二次 FOLD 翻页，从右扫向左
  if (time < 80.9) {
    const u = easeEditorialInOut(segProgress(time, 78.7, 80.9));
    return { x: lerp(1904, 18, u), y: 540 };
  }
  // 80.9 – 83.2s：从左缘 (18, 540) 平滑弧线飞至左上守望位 (215, 178)（绝不遮挡右侧发光灯丝泡！）
  if (time < 83.2) {
    const u = easeEditorialInOut(segProgress(time, 80.9, 83.2));
    return bezierPoint(
      { x: 18, y: 540 },
      { x: 48, y: 290 },
      { x: 110, y: 170 },
      { x: 215, y: 178 },
      u
    );
  }
  // 83.2 – 90.4s：伴随三大跨主题奇观于左上空域柔和巡航
  if (time < 90.4) {
    return {
      x: 215 + Math.sin((time - 83.2) * 1.1) * 18,
      y: 178 + Math.cos((time - 83.2) * 1.4) * 22,
    };
  }
  // 90.4 – 92.0s：平滑弧线俯冲并刹车悬停至第四幕精确起点 (1080, 460)（0.0px 无缝交接！）
  const u = easeEditorialInOut(segProgress(time, 90.4, 92.0));
  return bezierPoint(
    { x: 215, y: 178 },
    { x: 620, y: 140 },
    { x: 960, y: 260 },
    { x: 1080, y: 460 },
    u
  );
}

export function renderAct03({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();
  camera.reset();

  // ── 底层画面渲染（全连续过渡，零硬切！） ─────────────────────────────────
  if (t < 65.5) {
    const pBlend = easeEditorialInOut(segProgress(t, 63.4, 65.4));
    drawPaperBase(worldCtx, STAGE_W, STAGE_H, { tealGlow: 1.0, amberGlow: 1.0 });
    if (pBlend < 0.99) {
      worldCtx.save();
      const zoomOut = lerp(1.0, 0.86, pBlend);
      worldCtx.translate(STAGE_W * 0.5, STAGE_H * 0.5);
      worldCtx.scale(zoomOut, zoomOut);
      worldCtx.translate(-STAGE_W * 0.5, -STAGE_H * 0.5);
      drawMicroRefraction(worldCtx, t, 1 - pBlend);
      worldCtx.restore();
    }
    if (pBlend > 0.01) {
      drawStyledRainbowScene(worldCtx, "paper-editorial", t, pBlend);
    }
    drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, { alpha: 0.42, issue: "ACT III · LIVING THEATER" });
  } else if (t < 74.2) {
    drawStyledRainbowScene(worldCtx, "paper-editorial", t, 1);
    drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, { alpha: 0.45, issue: "PAPER EDITORIAL · 1080P 60FPS" });
  } else if (t < 82.2) {
    const isFlip1 = t < 78.7;
    const uFlip = isFlip1
      ? easeEditorialInOut(segProgress(t, 74.2, 76.4))
      : easeEditorialInOut(segProgress(t, 78.7, 80.9));

    const fromStyle = isFlip1 ? "paper-editorial" : "modern-graphic";
    const toStyle = isFlip1 ? "modern-graphic" : "narrative-collage";
    const xSweep = lerp(STAGE_W, 0, uFlip);

    if (xSweep > 0.5) {
      worldCtx.save();
      worldCtx.beginPath();
      worldCtx.rect(0, 0, xSweep, STAGE_H);
      worldCtx.clip();
      drawStyledRainbowScene(worldCtx, fromStyle, t, 1);
      worldCtx.restore();
    }
    if (xSweep < STAGE_W - 0.5) {
      worldCtx.save();
      worldCtx.beginPath();
      worldCtx.rect(xSweep, 0, STAGE_W - xSweep, STAGE_H);
      worldCtx.clip();
      drawStyledRainbowScene(worldCtx, toStyle, t, 1);
      worldCtx.restore();
    }
  } else {
    drawContinuousCrossTopicMorphs(worldCtx, t);
  }

  // ── 顶层「棱片」主角：单一连续轨迹函数驱动，零瞬移、零突变！ ─────────────
  const inFlip1 = t >= 74.2 && t <= 76.4;
  const inFlip2 = t >= 78.7 && t <= 80.9;

  if (inFlip1 || inFlip2) {
    const uFlip = inFlip1
      ? easeEditorialInOut(segProgress(t, 74.2, 76.4))
      : easeEditorialInOut(segProgress(t, 78.7, 80.9));
    // 翻页头尾 8% 平滑伸缩高度，与 GLIDE 态自然无缝接轨！
    const edgeGrow = Math.min(1, uFlip / 0.08) * Math.min(1, (1 - uFlip) / 0.08);
    drawPrismFold(overlayCtx, {
      x: lerp(STAGE_W, 0, uFlip),
      y: STAGE_H * 0.5,
      mode: "FOLD",
      foldProgress: uFlip,
      foldHeight: lerp(88, STAGE_H, easeEditorialOut(edgeGrow)),
      alpha: 1,
      coreGlow: 0.95,
    });
  } else {
    const pos = act03PrismPath(t);
    const ahead = act03PrismPath(Math.min(92.0, t + 0.04));
    const speed = Math.hypot(ahead.x - pos.x, ahead.y - pos.y);
    // 52s 承接第二幕竖划角度 Math.PI*0.5 -> 平滑回正；90.4-92s 平滑落定到第四幕倾角 0.16
    const entryAngleBlend = 1 - easeEditorialOut(segProgress(t, 52.0, 53.2));
    const exitAngleBlend = easeEditorialInOut(segProgress(t, 90.4, 92.0));
    const velAngle = speed > 0.6 ? Math.atan2(ahead.y - pos.y, ahead.x - pos.x) * 0.24 : 0;
    const angle = lerp(lerp(velAngle, Math.PI * 0.5, entryAngleBlend), 0.16, exitAngleBlend);

    const trail = sampleTrailFromPath(act03PrismPath, t, 0.58, 24);
    const isCalmPrism = (t >= 55.0 && t < 71.8);
    const prismBlend = isCalmPrism
      ? easeEditorialInOut(segProgress(t, 55.0, 56.0)) * (1 - easeEditorialInOut(segProgress(t, 71.0, 71.8)))
      : lerp(0.15, 0.25, exitAngleBlend);

    drawPrismFold(overlayCtx, {
      x: pos.x,
      y: pos.y,
      mode: prismBlend > 0.55 ? "PRISM" : "GLIDE",
      size: 38,
      angle,
      alpha: 0.96,
      t,
      prismBlend,
      coreGlow: Math.max(0.55, prismBlend * 0.9),
      trail,
      trailAlpha: isCalmPrism ? 0.2 : 0.88,
    });
  }
}
