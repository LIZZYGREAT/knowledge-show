/*
 * 第一幕：破纸而出与悬念反转（0:00 – 0:22，光点破晓引入 + 高定立体书版）
 * 0:00 – 0:03.2 光点引入：纯净暖纸中央一粒好奇光点呼吸 -> 射出斜向金青光束与丝带 -> 渐进展开整张精装书桌
 * 0:03.2 – 0:06.8 墨滴涟漪唤醒句号 -> 棱片破缝跃出轻敲平面灰三角触发触感回弹环
 * 0:06.8 – 0:14.0 立体书剧场轰然撑起（层叠剪纸山丘 + 旋转黄铜测角仪 + 折纸彩屑迸发 + 7 股光子水彩彩虹）
 * 0:14.0 – 0:19.6 留存反转钩子（BRACKET 精准捏改紫光波列 + 声波谐振环 + 手绘角度小签）
 * 0:19.6 – 0:22.0 衔接机关 ①（彩虹化作星芒流光倒卷收束，优雅立正为真实输入框光标）
 */

import { COLORS, SPECTRUM, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { segProgress } from "../config/timeline.js";
import {
  clamp,
  lerp,
  rgba,
  mulberry32,
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
  drawOrigamiConfettiBurst,
  drawStarlightGlint,
  drawEditorialPrintMarks,
  drawBrassRuler,
} from "../entities/ornaments.js";
import { UI_GEOMETRY } from "../ui/frontendStage.js";

const OPENING_MOTES = (() => {
  const r = mulberry32(202601);
  return Array.from({ length: 22 }, (_, i) => ({
    angle: (i / 22) * TAU + (r() - 0.5) * 0.25,
    rBase: 36 + r() * 210,
    speed: (r() > 0.5 ? 1 : -1) * (0.28 + r() * 0.45),
    rad: 1.5 + r() * 2.8,
    phase: r() * TAU,
    hue: i % 3 === 0 ? COLORS.brandAmber : i % 3 === 1 ? COLORS.brandTeal : COLORS.brandPeriwinkle,
  }));
})();

/**
 * 0:00 – 0:03.8 开场光点与精密光学星盘破晓（高定书桌苏醒序幕）
 * 0:00 – 0:00.9 暖白棉纸中央一粒棱晶星芒苏醒 + 呼吸黄铜准星 + 环绕金青微尘
 * 0:00.35 – 0:02.2 18° 斜阳金青光束携柔和七彩微色散光晕划开纸面 + 双层精密黄铜测角星盘弧线舒展
 * 0:00.85 – 0:02.85 扩张的暖金日光光环沿圆弧边沿将精装书桌徐徐“照亮显影”
 * 0:01.85 – 0:03.30 星芒沿优雅 S 形贝塞尔弧线拖曳流光金青丝带轻落书页句号，唤醒整部动画！
 */
function drawOpeningLightSeed(ctx, t, dotTarget, bookRevealProg = 0) {
  if (t > 4.2) return;

  const cx = STAGE_W * 0.5;
  const cy = STAGE_H * 0.5;

  const pPulse = easeEditorialOut(segProgress(t, 0.0, 0.85));
  const pAstrolabe = easeEditorialOut(segProgress(t, 0.12, 1.45));
  const pBeam = easeEditorialInOut(segProgress(t, 0.32, 1.58));
  const pIris = easeEditorialInOut(segProgress(t, 0.85, 2.85));
  const pTravelToDot = easeEditorialInOut(segProgress(t, 1.85, 3.25));
  const pFade = 1 - easeEditorialOut(segProgress(t, 3.25, 3.95));

  if (pFade <= 0.005) return;

  // 星芒落向句号的优雅 S 形贝塞尔轨迹
  const sparkPath = (u) =>
    bezierPoint(
      { x: cx, y: cy },
      { x: cx - 55, y: cy - 145 },
      { x: dotTarget.x + 110, y: dotTarget.y - 120 },
      { x: dotTarget.x - 2, y: dotTarget.y - 4 },
      clamp(u)
    );

  const curSpark = pTravelToDot > 0.001 ? sparkPath(pTravelToDot) : { x: cx, y: cy };
  const centerElementsFade = clamp(1 - pTravelToDot * 1.35) * clamp(1 - Math.max(0, (pIris - 0.55) / 0.45));

  ctx.save();
  ctx.globalAlpha = clamp(pFade);

  // 1. 中心温柔呼吸的晨光暖晕 + 极细光学准星草图线 + 隐约正三角光学水印
  if (centerElementsFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = clamp(pFade * centerElementsFade);

    // 晨曦暖金-浅青空气光晕
    const auraR = lerp(88, 340, pAstrolabe);
    const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, auraR);
    aura.addColorStop(0, "rgba(255, 252, 240, 0.92)");
    aura.addColorStop(0.24, rgba(COLORS.brandAmber, 0.24 * (0.65 + 0.35 * pPulse)));
    aura.addColorStop(0.58, rgba(COLORS.brandTeal, 0.09 * pAstrolabe));
    aura.addColorStop(1, "rgba(249, 247, 242, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, TAU);
    ctx.fill();

    // 精密黄铜光学取景十字细轴（随光点呼吸向外延展，带刊物微刻度）
    const axisSpan = lerp(44, 248, pAstrolabe);
    const axisGradH = ctx.createLinearGradient(cx - axisSpan, cy, cx + axisSpan, cy);
    axisGradH.addColorStop(0, "rgba(176, 128, 66, 0)");
    axisGradH.addColorStop(0.25, "rgba(176, 128, 66, 0.28)");
    axisGradH.addColorStop(0.5, "rgba(18, 148, 141, 0.36)");
    axisGradH.addColorStop(0.75, "rgba(176, 128, 66, 0.28)");
    axisGradH.addColorStop(1, "rgba(176, 128, 66, 0)");
    ctx.strokeStyle = axisGradH;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx - axisSpan, cy);
    ctx.lineTo(cx + axisSpan, cy);
    ctx.stroke();

    const axisGradV = ctx.createLinearGradient(cx, cy - axisSpan * 0.78, cx, cy + axisSpan * 0.78);
    axisGradV.addColorStop(0, "rgba(176, 128, 66, 0)");
    axisGradV.addColorStop(0.5, "rgba(176, 128, 66, 0.28)");
    axisGradV.addColorStop(1, "rgba(176, 128, 66, 0)");
    ctx.strokeStyle = axisGradV;
    ctx.beginPath();
    ctx.moveTo(cx, cy - axisSpan * 0.78);
    ctx.lineTo(cx, cy + axisSpan * 0.78);
    ctx.stroke();

    // 隐约浮现的几何三棱镜光影水印（预告全片光学母题）
    const triR = lerp(34, 108, pAstrolabe);
    ctx.strokeStyle = rgba(COLORS.brandTeal, 0.18 * pAstrolabe);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    for (let v = 0; v < 3; v++) {
      const ang = -Math.PI * 0.5 + (v * TAU) / 3 + (1 - pAstrolabe) * 0.28;
      const vx = cx + Math.cos(ang) * triR;
      const vy = cy + Math.sin(ang) * triR;
      v === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. 双层反向旋转精密光学星盘（带 36 细刻度 + 分段青绿/湖蓝优雅圆弧 + 四方位微菱星）
    const rInner = lerp(24, 126, pAstrolabe);
    const rOuter = lerp(42, 224, pAstrolabe);

    // 内层黄铜细刻度环
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.18);
    ctx.strokeStyle = rgba("#B88648", 0.34 * pAstrolabe);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, rInner, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * TAU;
      const major = k % 9 === 0;
      const t0 = rInner - (major ? 9 : 4);
      ctx.strokeStyle = major ? rgba(COLORS.brandAmber, 0.65) : rgba("#8A602C", 0.26);
      ctx.lineWidth = major ? 1.6 : 0.9;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * t0, Math.sin(a) * t0);
      ctx.lineTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
      ctx.stroke();
    }
    ctx.restore();

    // 外层精工分段子午弧线（青绿 + 湖蓝双对称圆弧 + 末端微珠）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-t * 0.14);
    const arcSpecs = [
      { start: -0.65, end: 0.72, color: COLORS.brandTeal, w: 1.9, r: rOuter },
      { start: Math.PI - 0.65, end: Math.PI + 0.72, color: COLORS.brandTeal, w: 1.9, r: rOuter },
      { start: Math.PI * 0.5 - 0.5, end: Math.PI * 0.5 + 0.5, color: COLORS.brandPeriwinkle, w: 1.5, r: rOuter + 24 },
      { start: Math.PI * 1.5 - 0.5, end: Math.PI * 1.5 + 0.5, color: COLORS.brandPeriwinkle, w: 1.5, r: rOuter + 24 },
    ];
    for (const arc of arcSpecs) {
      const span = (arc.end - arc.start) * pAstrolabe;
      ctx.strokeStyle = rgba(arc.color, 0.46 * pAstrolabe);
      ctx.lineWidth = arc.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, arc.r, arc.start, arc.start + span);
      ctx.stroke();

      // 弧线首尾精致黄铜圆点
      const ex = Math.cos(arc.start + span) * arc.r;
      const ey = Math.sin(arc.start + span) * arc.r;
      ctx.fillStyle = rgba(COLORS.brandAmber, 0.85 * pAstrolabe);
      ctx.beginPath();
      ctx.arc(ex, ey, 3.0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // 环绕旋转的 22 粒晨光金青微尘（随星盘徐徐呼吸浮游）
    for (const m of OPENING_MOTES) {
      const ang = m.angle + t * m.speed;
      const rad = lerp(16, m.rBase, pAstrolabe) + Math.sin(t * 2.2 + m.phase) * 8;
      const mx = cx + Math.cos(ang) * rad;
      const my = cy + Math.sin(ang) * rad;
      const tw = 0.45 + 0.55 * Math.sin(t * 3.4 + m.phase);
      const rg = ctx.createRadialGradient(mx, my, 0, mx, my, m.rad * 2.6);
      rg.addColorStop(0, rgba("#FFFDF9", 0.9 * tw));
      rg.addColorStop(0.5, rgba(m.hue, 0.55 * tw));
      rg.addColorStop(1, rgba(m.hue, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(mx, my, m.rad * 2.6, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  // 3. 划开暖白纸面的 18° 斜向金青光束 + 细腻七彩微色散扇晕 + 双股柔弧光丝
  if (pBeam > 0.01 && pTravelToDot < 0.92) {
    const beamFade = (1 - pTravelToDot) * Math.sin(clamp(pBeam) * Math.PI * 0.90);
    const halfSpan = lerp(0, 1140, easeEditorialOut(pBeam));
    const ang = (18 * Math.PI) / 180;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const nx = -dy;
    const ny = dx;

    const x1 = cx - dx * halfSpan;
    const y1 = cy - dy * halfSpan;
    const x2 = cx + dx * halfSpan;
    const y2 = cy + dy * halfSpan;

    // 宽幅暖奶油空气散射光幕
    const mistGrad = ctx.createLinearGradient(x1, y1, x2, y2);
    mistGrad.addColorStop(0, "rgba(255, 250, 236, 0)");
    mistGrad.addColorStop(0.26, rgba(COLORS.brandTeal, 0.14 * beamFade));
    mistGrad.addColorStop(0.5, rgba("#FFFBF0", 0.72 * beamFade));
    mistGrad.addColorStop(0.74, rgba(COLORS.brandAmber, 0.22 * beamFade));
    mistGrad.addColorStop(1, "rgba(255, 250, 236, 0)");
    ctx.strokeStyle = mistGrad;
    ctx.lineWidth = lerp(48, 8, pTravelToDot);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 右侧柔和绽放的 7 色水彩微色散游丝（极克制、高雅地剧透彩虹光学主题！）
    for (let i = 0; i < SPECTRUM.length; i++) {
      const band = SPECTRUM[i];
      const fanAng = ang + ((i - 3) * 1.9 * Math.PI) / 180;
      const fx = Math.cos(fanAng);
      const fy = Math.sin(fanAng);
      const fanLen = halfSpan * lerp(0.52, 0.68, (6 - Math.abs(i - 3)) / 6);
      const fg = ctx.createLinearGradient(cx, cy, cx + fx * fanLen, cy + fy * fanLen);
      fg.addColorStop(0, rgba(band.hex, 0.34 * beamFade));
      fg.addColorStop(0.55, rgba(band.hex, 0.18 * beamFade));
      fg.addColorStop(1, rgba(band.hex, 0));
      ctx.strokeStyle = fg;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + fx * fanLen, cy + fy * fanLen);
      ctx.stroke();
    }

    // 纤细纯净暖白光芯 + 左右对称游丝
    ctx.strokeStyle = rgba("#FFFFFF", 0.96 * beamFade);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    for (const sign of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const u = i / 72;
        const s = lerp(-halfSpan * 0.78, halfSpan * 0.78, u);
        const bulge = Math.sin(u * Math.PI) * 32 * sign * Math.sin(u * Math.PI * 2 + t * 2.2 + sign);
        const px = cx + dx * s + nx * bulge;
        const py = cy + dy * s + ny * bulge;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = sign < 0 ? rgba(COLORS.brandTeal, 0.40 * beamFade) : rgba(COLORS.brandAmber, 0.38 * beamFade);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  // 4. 沿精装书桌扩张圆形显影边界（curR）奔跑的「暖金-青绿日光揭幕光环」！
  if (bookRevealProg > 0.01 && bookRevealProg < 0.98) {
    const maxR = Math.hypot(STAGE_W, STAGE_H) * 0.62;
    const curR = lerp(24, maxR, easeEditorialInOut(bookRevealProg));
    const rimEnv = Math.sin(clamp(bookRevealProg) * Math.PI);

    ctx.save();
    // 柔焦暖金外光带
    ctx.strokeStyle = rgba(COLORS.brandAmber, 0.24 * rimEnv);
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, TAU);
    ctx.stroke();

    // 细腻高亮白金揭幕边线
    ctx.strokeStyle = rgba("#FFFDF5", 0.78 * rimEnv);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, TAU);
    ctx.stroke();

    // 沿揭幕光环分布的 4 枚微闪星芒珠
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + bookRevealProg * 1.4 + 0.4;
      drawStarlightGlint(
        ctx,
        cx + Math.cos(a) * curR,
        cy + Math.sin(a) * curR,
        14 * rimEnv,
        "#FFFFFF",
        k % 2 === 0 ? COLORS.brandAmber : COLORS.brandTeal,
        0.85 * rimEnv,
        t * 1.6 + k
      );
    }
    ctx.restore();
  }

  // 5. 星芒滑向句号时的绵长金青丝带拖尾（1.85s – 3.30s）
  if (pTravelToDot > 0.01 && pTravelToDot < 0.995) {
    const steps = 28;
    const tailStart = Math.max(0, pTravelToDot - 0.42);
    for (let i = 1; i <= steps; i++) {
      const u0 = lerp(tailStart, pTravelToDot, (i - 1) / steps);
      const u1 = lerp(tailStart, pTravelToDot, i / steps);
      const p0 = sparkPath(u0);
      const p1 = sparkPath(u1);
      const ratio = i / steps;
      ctx.strokeStyle = i % 2 === 0 ? rgba(COLORS.brandTeal, ratio * 0.62) : rgba(COLORS.brandAmber, ratio * 0.68);
      ctx.lineWidth = 1.4 + ratio * 5.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // 6. 灵动呼吸的核心好奇星芒（内置精致微棱晶菱核，从第 0 帧即呈现高定珠宝质感！）
  const coreScale = lerp(0.82, 1.38, Math.sin(pPulse * Math.PI * 0.5)) * lerp(1.0, 0.70, pTravelToDot);
  drawStarlightGlint(
    ctx,
    curSpark.x,
    curSpark.y,
    30 * coreScale,
    "#FFFFFF",
    pTravelToDot > 0.5 ? COLORS.brandTeal : COLORS.brandAmber,
    0.98,
    t * 0.55
  );

  // 星芒正中的青金双色微菱晶（呼应主角「棱片」诞生前的光核！）
  const gemR = 6.5 * coreScale;
  ctx.save();
  ctx.translate(curSpark.x, curSpark.y);
  ctx.rotate(t * 0.35);
  ctx.fillStyle = rgba(COLORS.brandTeal, 0.78);
  ctx.beginPath();
  ctx.moveTo(0, -gemR);
  ctx.lineTo(gemR * 0.72, 0);
  ctx.lineTo(-gemR * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(COLORS.brandPeriwinkle, 0.72);
  ctx.beginPath();
  ctx.moveTo(0, gemR);
  ctx.lineTo(gemR * 0.72, 0);
  ctx.lineTo(-gemR * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(0, 0, gemR * 0.36, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * 绘制精装物理典籍书桌与静态光学铜版讲义（随开场光环平滑显现，不再生硬直出）
 */
function drawOpenBookDesk(ctx, t, alpha, revealProg, slideLeftPx, inkRippleProg = 0) {
  const effAlpha = clamp(alpha * revealProg);
  if (effAlpha <= 0.005) return { dotX: 734, dotY: 590 };

  ctx.save();
  ctx.globalAlpha = effAlpha;
  ctx.translate(-slideLeftPx, 0);

  // 由中央向外扩张的优雅圆形光晕裁切显影（0:00.85 -> 0:02.75 书桌由一束光逐渐铺满全屏！）
  if (revealProg < 0.995) {
    const maxR = Math.hypot(STAGE_W, STAGE_H) * 0.62;
    const curR = lerp(24, maxR, easeEditorialInOut(revealProg));
    ctx.beginPath();
    ctx.arc(STAGE_W * 0.5, STAGE_H * 0.5, curR, 0, TAU);
    ctx.clip();
  }

  // 1. 书页多层纸缘（厚实精装书感）
  for (let layer = 3; layer >= 1; layer--) {
    const off = layer * 5;
    roundRectPath(ctx, 118 + off * 0.4, 96 + off, 1684 - off * 0.8, 882, 10);
    ctx.fillStyle = layer === 1 ? "#F4EFE4" : layer === 2 ? "#ECE5D6" : "#E3DAC8";
    ctx.fill();
    ctx.strokeStyle = "rgba(28, 42, 48, 0.09)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawPaperCard(ctx, 118, 92, 1684, 882, {
    radius: 8,
    fill: "#FDFBF6",
    stroke: "rgba(28, 42, 48, 0.14)",
    lineWidth: 1.3,
    shadowBlur: 34,
    shadowOffsetY: 16,
    shadowColor: "rgba(28, 42, 48, 0.13)",
  });

  // 中央装订书脊折痕阴影
  const spineGrad = ctx.createLinearGradient(910, 92, 1010, 92);
  spineGrad.addColorStop(0, "rgba(28, 42, 48, 0)");
  spineGrad.addColorStop(0.46, "rgba(28, 42, 48, 0.065)");
  spineGrad.addColorStop(0.50, "rgba(28, 42, 48, 0.11)");
  spineGrad.addColorStop(0.54, "rgba(28, 42, 48, 0.05)");
  spineGrad.addColorStop(1, "rgba(28, 42, 48, 0)");
  ctx.fillStyle = spineGrad;
  ctx.fillRect(910, 92, 100, 882);

  // 页眉细线
  ctx.strokeStyle = "rgba(28, 42, 48, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(176, 164);
  ctx.lineTo(918, 164);
  ctx.moveTo(1002, 164);
  ctx.lineTo(1744, 164);
  ctx.stroke();

  ctx.font = `500 13px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.65)";
  ctx.fillText("CHAPTER IV · OPTICKS & DISPERSION", 176, 146);
  ctx.textAlign = "right";
  ctx.fillText("PLATE 04 · P. 142", 1744, 146);
  ctx.textAlign = "left";

  // 2. 左页：沉闷灰度讲义排版
  const lx = 212;
  ctx.font = `500 14px ${FONTS.mono}`;
  ctx.fillStyle = "rgba(138, 96, 44, 0.72)";
  ctx.fillText("SECTION 4.1", lx, 266);

  ctx.font = `600 44px ${FONTS.serif}`;
  ctx.fillStyle = "#485358";
  ctx.fillText("光的色散", lx, 326);

  ctx.strokeStyle = "rgba(72, 83, 88, 0.28)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(lx, 356);
  ctx.lineTo(lx + 196, 356);
  ctx.stroke();

  const lines = [
    "复色光通过三棱镜分解为单色光的现象，",
    "称为光的色散。由于同一种透明介质对不同",
    "频率单色光的折射率不同，红光偏折最小，",
    "紫光偏折最大，因而在光屏上形成彩色光带",
  ];
  ctx.font = `400 24px ${FONTS.serif}`;
  ctx.fillStyle = "#6B777C";
  lines.forEach((line, idx) => {
    ctx.fillText(line, lx, 424 + idx * 50);
  });

  const lastW = ctx.measureText(lines[3]).width;
  const dotX = lx + lastW + 10;
  const dotY = 424 + 3 * 50;

  // 光点落上句号后荡开的宣纸毛细涟漪
  if (inkRippleProg > 0.01) {
    for (let k = 0; k < 3; k++) {
      const rp = clamp((inkRippleProg - k * 0.14) / 0.86);
      if (rp <= 0) continue;
      const rr = lerp(6, 138 + k * 52, easeEditorialOut(rp));
      const ra = (1 - rp) * (k === 0 ? 0.58 : 0.36);
      ctx.strokeStyle = k % 2 === 0 ? rgba(COLORS.brandTeal, ra) : rgba(COLORS.brandAmber, ra);
      ctx.lineWidth = 2.2 - k * 0.5;
      ctx.beginPath();
      ctx.arc(dotX - 2, dotY - 4, rr, 0, TAU);
      ctx.stroke();
    }
    drawStarlightGlint(ctx, dotX - 2, dotY - 4, 16 * Math.sin(clamp(inkRippleProg) * Math.PI), "#FFFDF9", COLORS.brandAmber, 0.92, t);
  }

  ctx.fillStyle = inkRippleProg > 0.05 ? COLORS.brandTeal : "#6B777C";
  ctx.fillText("。", dotX - 8, dotY);

  ctx.font = `italic 15px ${FONTS.serif}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.52)";
  ctx.fillText("n₁ sin θ₁ = n₂(λ) sin θ₂   ·   Static textbook illustration", lx, 718);

  // 3. 右页：铜版草图辅助虚线弧
  ctx.save();
  ctx.strokeStyle = "rgba(91, 107, 115, 0.16)";
  ctx.lineWidth = 1.1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(1335, 540, 210, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1060, 470);
  ctx.lineTo(1580, 620);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.font = `400 15px ${FONTS.sans}`;
  ctx.fillStyle = "rgba(91, 107, 115, 0.56)";
  ctx.textAlign = "center";
  ctx.fillText("图 4-1  平面三棱镜示意图（静态黑白讲义）", 1335, 788);
  ctx.textAlign = "left";

  // 4. 书桌右下角黄铜直尺
  drawBrassRuler(ctx, 1210, 868, 490, 34, -0.045, 0.92);

  // 5. 书页右下角微翘纸角
  const curl = 24 + 14 * Math.sin(t * 1.6);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(1802 - curl * 2.2, 974);
  ctx.lineTo(1802, 974 - curl * 2.2);
  ctx.lineTo(1802, 974);
  ctx.closePath();
  ctx.fillStyle = "#EAE2D1";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1802 - curl * 2.2, 974);
  ctx.quadraticCurveTo(1802 - curl * 1.1, 974 - curl * 1.1, 1802, 974 - curl * 2.2);
  ctx.lineTo(1802 - curl * 1.8, 974 - curl * 1.8);
  ctx.closePath();
  ctx.fillStyle = "#FFFDF9";
  ctx.shadowColor = "rgba(28, 42, 48, 0.14)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  ctx.restore();
  return { dotX, dotY };
}

export function renderAct01({ worldCtx, overlayCtx, camera, ui, t }) {
  ui.hideAll();

  // 0:00 – 0:03.2：由一点一束光渐进铺开全屏，再衔接句号墨滴与棱片苏醒！
  const pBookReveal = easeEditorialInOut(segProgress(t, 0.85, 2.85));
  const pIntroCam = easeEditorialOut(segProgress(t, 0.0, 5.4));
  const pInkEmber = segProgress(t, 2.9, 5.0);
  const pPrismPeek = easeEditorialOut(segProgress(t, 4.0, 5.4));
  const pPopup = springProgress(segProgress(t, 7.0, 8.8), 0.72, 0.74, 17);
  const pConfetti = segProgress(t, 7.1, 9.7);
  const pHandoutOut = easeEditorialInOut(segProgress(t, 6.8, 8.6));
  const pGoniometer = easeEditorialOut(segProgress(t, 7.5, 9.9));
  const pBeam = easeEditorialOut(segProgress(t, 8.1, 9.5));
  const pDispersion = easeEditorialOut(segProgress(t, 8.8, 12.3));
  const pHookMove = easeEditorialInOut(segProgress(t, 14.0, 15.1));
  const pBracketOpen = springProgress(segProgress(t, 14.8, 15.8), 0.52, 0.78, 18);
  const pVioletTweak = springProgress(segProgress(t, 15.9, 17.9), 0.65, 0.75, 16);
  const pBracketClose = easeEditorialInOut(segProgress(t, 18.8, 19.6));
  const pRewind = easeEditorialInOut(segProgress(t, 19.6, 21.1));
  const pCursorMorph = easeEditorialInOut(segProgress(t, 20.8, 22.0));

  // 开场微推拉：由 1.14x 聚焦中心光点柔和拉远展开整张书桌 -> 立体书展开全景 -> 紫光钩子微推
  const camZoom =
    lerp(1.14, 1.0, pIntroCam) +
    0.07 * Math.sin(pHookMove * Math.PI * 0.5) * (1 - pRewind);
  const camX = lerp(960, 1025, pHookMove * (1 - pRewind));
  const camY = lerp(540, 578, pHookMove * (1 - pRewind));
  camera.set({ x: camX, y: camY, zoom: camZoom });

  // 1. 纯净暖纸底色 + 午后斜阳随开场光束柔和渐入
  drawPaperBase(worldCtx, STAGE_W, STAGE_H, {
    tealGlow: lerp(0.18, 1.0, Math.max(pBookReveal * 0.5, pPopup)),
    amberGlow: lerp(0.22, 1.0, Math.max(pBookReveal * 0.5, pBeam)),
    dotGridAlpha: lerp(0.008, 0.032, Math.max(pBookReveal * 0.5, pPopup)),
  });
  drawDappledSunlight(worldCtx, STAGE_W, STAGE_H, t, lerp(0.15, 1.0, pBookReveal) * (1 - pCursorMorph * 0.4));

  worldCtx.save();
  camera.applyToCanvas(worldCtx, STAGE_W, STAGE_H);

  // 2. 精装物理书桌（由 0.85s-2.85s 随光环渐进显现，再于立体书撑起时向左侧优雅退隐）
  const handoutAlpha = 1 - pHandoutOut;
  const dotPos = drawOpenBookDesk(worldCtx, t, handoutAlpha, pBookReveal, pHandoutOut * 165, pInkEmber);

  // 3. 立体书多层纸艺舞台 + 旋转黄铜测角仪
  const prismCx = lerp(1335, 730, easeEditorialInOut(segProgress(t, 7.0, 9.1)));
  const prismCy = lerp(542, 546, easeEditorialInOut(segProgress(t, 7.0, 9.1)));
  const prismSize = lerp(220, 272, clamp(pPopup));
  const opticsAlpha = pBookReveal * (1 - easeEditorialOut(segProgress(t, 20.7, 21.4)));

  if (pPopup > 0.02 && opticsAlpha > 0.01) {
    drawPopupPaperDiorama(worldCtx, prismCx + 24, prismCy + 16, pPopup, opticsAlpha * (1 - pRewind * 0.9));
    drawBrassGoniometer(worldCtx, prismCx, prismCy, 355, t, {
      alpha: opticsAlpha * (1 - pRewind),
      reveal: pGoniometer,
      redDeg: 11.5,
      violetDeg: lerp(33.6, 39.4, pVioletTweak),
    });
  }

  if (pConfetti > 0.01 && pConfetti < 0.99) {
    drawOrigamiConfettiBurst(worldCtx, prismCx, prismCy - 20, pConfetti, {
      seed: 20261,
      count: 34,
      spread: 380,
      alpha: 0.95,
    });
  }

  // 棱片敲击静态灰三角时的触感回弹波纹
  if (t >= 5.6 && t <= 7.0) {
    const tapCycle = ((t - 5.6) / 0.65) % 1;
    const tapR = lerp(10, 96, easeEditorialOut(tapCycle));
    worldCtx.save();
    worldCtx.strokeStyle = rgba(COLORS.brandTeal, (1 - tapCycle) * 0.55);
    worldCtx.lineWidth = 2.0;
    worldCtx.beginPath();
    worldCtx.arc(1270, 622, tapR, 0, TAU);
    worldCtx.stroke();
    worldCtx.restore();
  }

  // 4. 三棱镜与 7 股光子水彩彩虹（随开场光环平滑显现）
  const waveT =
    t < 14.0
      ? t
      : t < 19.6
        ? 14.0 + (t - 14.0) * 0.2
        : 14.0 + 5.6 * 0.2 + (t - 19.6);

  const optics = drawRainbowOptics(worldCtx, {
    cx: prismCx,
    cy: prismCy,
    size: prismSize,
    t: waveT,
    popup: clamp(pPopup, 0, 1.06),
    beamProgress: pBeam,
    dispersionProgress: pDispersion,
    rewindProgress: pRewind,
    violetTweak: pVioletTweak * (1 - pRewind),
    alpha: opticsAlpha,
    styleId: "paper-editorial",
    showWaveBeads: true,
    ribbonLen: 1050,
  });

  // 5. 开场 0:00 – 0:03.9 的精密光学星盘破晓与书桌揭幕光环（最上层引导视线落在句号上！）
  drawOpeningLightSeed(worldCtx, t, { x: dotPos.dotX, y: dotPos.dotY }, pBookReveal);

  // 6. 紫光捏改谐振环
  if (pVioletTweak > 0.02 && pVioletTweak < 0.96 && pRewind < 0.1) {
    worldCtx.save();
    for (let ring = 0; ring < 2; ring++) {
      const ru = clamp((pVioletTweak - ring * 0.18) / 0.82);
      if (ru <= 0) continue;
      worldCtx.strokeStyle = rgba("#8E6CBB", (1 - ru) * 0.55);
      worldCtx.lineWidth = 2.2 - ring * 0.7;
      worldCtx.beginPath();
      worldCtx.arc(optics.violetAnchor.x, optics.violetAnchor.y, lerp(16, 132 + ring * 34, easeEditorialOut(ru)), 0, TAU);
      worldCtx.stroke();
    }
    worldCtx.restore();
  }

  // 7. 衔接机关 ①：彩虹倒卷凝聚为星芒细线 -> 立正落位到第二幕真实输入框光标 (434, 404)
  if (pRewind > 0.40) {
    const lineIn = easeEditorialOut(segProgress(t, 20.3, 21.0));
    const target = UI_GEOMETRY.composer.cursorStart;
    const cxLine = lerp(prismCx, target.x, pCursorMorph);
    const cyLine = lerp(prismCy - 18, target.y, pCursorMorph);
    const len = lerp(290, 34, pCursorMorph);
    const rot = lerp(0.18, Math.PI * 0.5, pCursorMorph);
    const thick = lerp(5.2, 2.6, pCursorMorph);

    worldCtx.save();
    worldCtx.translate(cxLine, cyLine);
    worldCtx.rotate(rot);
    worldCtx.globalAlpha = lineIn;

    if (pCursorMorph < 0.92) {
      const g = worldCtx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0);
      g.addColorStop(0, rgba(COLORS.brandAmber, 0));
      g.addColorStop(0.5, rgba(COLORS.brandAmber, 0.52 * (1 - pCursorMorph)));
      g.addColorStop(1, rgba(COLORS.brandTeal, 0));
      worldCtx.strokeStyle = g;
      worldCtx.lineWidth = 22 * (1 - pCursorMorph * 0.7);
      worldCtx.lineCap = "round";
      worldCtx.beginPath();
      worldCtx.moveTo(-len * 0.5, 0);
      worldCtx.lineTo(len * 0.5, 0);
      worldCtx.stroke();
    }

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

    if (pCursorMorph < 0.88) {
      drawStarlightGlint(worldCtx, cxLine, cyLine, 18 * (1 - pCursorMorph * 0.6), "#FFFFFF", COLORS.brandAmber, lineIn * 0.9, t);
    }
  }

  worldCtx.restore();

  drawEditorialPrintMarks(overlayCtx, STAGE_W, STAGE_H, {
    alpha: 0.48 * pGoniometer * (1 - pCursorMorph),
    issue: "ACT I · AWAKEN THE PAGE",
  });

  // 8. 顶层「棱片」主角路径与四态驱动（4.0s 从句号缝隙跃出）
  if (t >= 3.95) {
    const flightPath = (time) => {
      if (time < 7.0) {
        const u = segProgress(time, 3.95, 7.0);
        const p = bezierPoint(
          { x: dotPos.dotX + 4, y: dotPos.dotY - 6 },
          { x: 960, y: 290 },
          { x: 1180, y: 690 },
          { x: 1270, y: 630 },
          easeEditorialOut(u)
        );
        const tap = u > 0.60 ? Math.sin(((u - 0.60) / 0.40) * Math.PI * 2) * 13 : 0;
        return { x: p.x, y: p.y - Math.abs(tap) };
      }
      if (time < 9.3) {
        const u = segProgress(time, 7.0, 9.3);
        return bezierPoint(
          { x: 1270, y: 630 },
          { x: 1090, y: 250 },
          { x: 950, y: 250 },
          { x: 905, y: 345 },
          easeEditorialInOut(u)
        );
      }
      if (time < 14.0) {
        const u = segProgress(time, 9.3, 14.0);
        return {
          x: 905 + Math.sin(u * TAU) * 16,
          y: 345 + Math.cos(u * TAU) * 11,
        };
      }
      if (time < 19.6) {
        const u = segProgress(time, 14.0, 15.1);
        const target = optics.violetAnchor;
        return bezierPoint(
          { x: 905, y: 345 },
          { x: 1080, y: 420 },
          { x: target.x - 40, y: target.y - 95 },
          { x: target.x, y: target.y },
          easeEditorialInOut(u)
        );
      }
      const u = segProgress(time, 19.6, 22.0);
      const target = optics.violetAnchor;
      return bezierPoint(
        { x: target.x, y: target.y },
        { x: 940, y: 450 },
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
    const trailW = sampleTrailFromPath(flightPath, t, 0.62, 26);
    const trailS = trailW.map((pt) => camera.worldToScreen(pt.x, pt.y));

    const vAnchorS = camera.worldToScreen(optics.violetAnchor.x, optics.violetAnchor.y);
    const violetBoxS = {
      x: vAnchorS.x - 142,
      y: vAnchorS.y - 64,
      w: 284,
      h: 128,
    };

    const bracketBlend = clamp(pBracketOpen * (1 - pBracketClose));
    const prismBlend =
      t >= 8.9 && t < 14.0
        ? easeEditorialInOut(segProgress(t, 8.9, 9.7)) * (1 - segProgress(t, 13.4, 14.0))
        : 0;

    drawPrismFold(overlayCtx, {
      x: posS.x,
      y: posS.y,
      mode: bracketBlend > 0.05 ? "BRACKET" : prismBlend > 0.5 ? "PRISM" : "GLIDE",
      size: 38 * camera.zoom,
      angle: velAngle,
      alpha: clamp(pPrismPeek * 1.5),
      t,
      prismBlend,
      bracketBlend,
      bracketRect: violetBoxS,
      bracketPulse: pVioletTweak > 0 && pVioletTweak < 0.7 ? Math.sin(pVioletTweak * Math.PI) * 0.55 : 0,
      coreGlow: Math.max(
        prismBlend * 0.9,
        clamp(Math.sin(pVioletTweak * Math.PI) * 0.95),
        pPopup > 0.1 && pPopup < 0.9 ? 0.9 : 0.3
      ),
      trail: trailS,
      trailAlpha: t > 4.05 ? 0.92 : 0,
    });
  }
}
