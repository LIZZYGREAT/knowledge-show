/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 暖纸材质、纤维微噪点、环境柔晕与刊物排版工具
 * 核心要求：纸纹离线生成且坐标锁定在世界空间，绝不逐帧随机刷新，防止 H.264 压缩闪烁
 */

import { COLORS, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { mulberry32, clamp, rgba, easeEditorialOut } from "./math.js";

let cachedGrainCanvas = null;

/**
 * 离线生成 256x256 周期平铺无缝暖纸纤维灰度纹理
 */
export function getPaperGrainCanvas(size = 256) {
  if (cachedGrainCanvas) return cachedGrainCanvas;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");

  const img = ctx.createImageData(size, size);
  const d = img.data;
  const rand = mulberry32(20261120);

  // 柔和像素粒感底噪（暖中性灰）
  for (let i = 0; i < size * size; i++) {
    const n1 = rand();
    const n2 = rand();
    const v = 228 + Math.round((n1 - n2) * 26);
    const idx = i * 4;
    d[idx] = clamp(v, 190, 255);
    d[idx + 1] = clamp(v - 2, 188, 255);
    d[idx + 2] = clamp(v - 6, 182, 255);
    d[idx + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // 叠加极细棉麻纸纤维（周期环绕绘制，保证无缝平铺）
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 190; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 6 + rand() * 18;
    const ang = rand() * Math.PI * 2;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    const dark = rand() > 0.45;
    ctx.strokeStyle = dark
      ? `rgba(110, 98, 82, ${(0.045 + rand() * 0.055).toFixed(3)})`
      : `rgba(255, 252, 245, ${(0.08 + rand() * 0.08).toFixed(3)})`;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        if (
          x + ox + len < 0 ||
          x + ox - len > size ||
          y + oy + len < 0 ||
          y + oy - len > size
        ) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.quadraticCurveTo(
          x + ox + dx * 0.5 + (rand() - 0.5) * 3,
          y + oy + dy * 0.5 + (rand() - 0.5) * 3,
          x + ox + dx,
          y + oy + dy
        );
        ctx.stroke();
      }
    }
  }

  cachedGrainCanvas = c;
  return c;
}

/**
 * 绘制全片基础暖米白画桌纸底 + 柔和青绿/暖杏空气感日光晕
 */
export function drawPaperBase(
  ctx,
  w = STAGE_W,
  h = STAGE_H,
  {
    baseColor = COLORS.paperBase,
    tealGlow = 1.0,
    amberGlow = 1.0,
    dotGridAlpha = 0.028,
    sunShiftX = 0,
    sunShiftY = 0,
  } = {}
) {
  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);

  // 左上环境青绿柔晕
  if (tealGlow > 0.001) {
    const gTeal = ctx.createRadialGradient(
      w * 0.14 + sunShiftX,
      h * 0.12 + sunShiftY,
      40,
      w * 0.14 + sunShiftX,
      h * 0.12 + sunShiftY,
      w * 0.56
    );
    gTeal.addColorStop(0, `rgba(38, 166, 154, ${(0.11 * tealGlow).toFixed(4)})`);
    gTeal.addColorStop(0.55, `rgba(38, 166, 154, ${(0.038 * tealGlow).toFixed(4)})`);
    gTeal.addColorStop(1, "rgba(38, 166, 154, 0)");
    ctx.fillStyle = gTeal;
    ctx.fillRect(0, 0, w, h);
  }

  // 右上环境暖杏日光晕
  if (amberGlow > 0.001) {
    const gAmber = ctx.createRadialGradient(
      w * 0.86 - sunShiftX * 0.6,
      h * 0.16 + sunShiftY * 0.5,
      40,
      w * 0.86 - sunShiftX * 0.6,
      h * 0.16 + sunShiftY * 0.5,
      w * 0.52
    );
    gAmber.addColorStop(0, `rgba(244, 162, 89, ${(0.12 * amberGlow).toFixed(4)})`);
    gAmber.addColorStop(0.58, `rgba(244, 162, 89, ${(0.042 * amberGlow).toFixed(4)})`);
    gAmber.addColorStop(1, "rgba(244, 162, 89, 0)");
    ctx.fillStyle = gAmber;
    ctx.fillRect(0, 0, w, h);
  }

  // 底部极浅湖蓝空气反光
  const gPeri = ctx.createRadialGradient(
    w * 0.52,
    h * 1.04,
    20,
    w * 0.52,
    h * 1.04,
    w * 0.48
  );
  gPeri.addColorStop(0, "rgba(78, 124, 246, 0.06)");
  gPeri.addColorStop(1, "rgba(78, 124, 246, 0)");
  ctx.fillStyle = gPeri;
  ctx.fillRect(0, 0, w, h);

  // 呼应 theme.css 的极轻刊物微点阵（可选）
  if (dotGridAlpha > 0.001) {
    ctx.fillStyle = `rgba(28, 52, 58, ${dotGridAlpha.toFixed(4)})`;
    const step = 36;
    for (let y = 18; y < h; y += step) {
      for (let x = 18; x < w; x += step) {
        ctx.fillRect(x, y, 1.4, 1.4);
      }
    }
  }

  ctx.restore();
}

/**
 * 顶层全局锁定的微纸纹 multiply 叠层（起到天然防色带 Dithering 与真实纸感统一作用）
 */
export function drawPaperGrainOverlay(
  ctx,
  w = STAGE_W,
  h = STAGE_H,
  camera = null,
  opacity = 0.036
) {
  const tile = getPaperGrainCanvas(256);
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = opacity;

  // 纸纹坐标锁定世界空间，仅随镜头平移微动，绝不每帧抖动
  const ox = camera ? -(camera.x - w * 0.5) * 0.35 : 0;
  const oy = camera ? -(camera.y - h * 0.5) * 0.35 : 0;
  const scale = camera ? 1 + (camera.zoom - 1) * 0.25 : 1;

  ctx.translate(((ox % 256) + 256) % 256 - 256, ((oy % 256) + 256) % 256 - 256);
  ctx.scale(scale, scale);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, (w + 512) / scale, (h + 512) / scale);
  ctx.restore();
}

/**
 * 绘制带柔和暖青灰物理投影的纸卡容器
 */
export function drawPaperCard(
  ctx,
  x,
  y,
  w,
  h,
  {
    radius = 18,
    fill = COLORS.paperElevated,
    stroke = COLORS.inkHairline,
    lineWidth = 1.2,
    shadowBlur = 24,
    shadowOffsetY = 10,
    shadowColor = COLORS.shadowTint,
  } = {}
) {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = shadowOffsetY;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * 解析字体族别名（serif / sans / mono）
 */
function resolveCaptionFont(family = "serif", weight = 500, size = 28) {
  const fam = family === "sans" ? FONTS.sans : family === "mono" ? FONTS.mono : FONTS.serif;
  return `${weight} ${size}px ${fam}`;
}

/**
 * 渲染支持行内多关键词异色高亮 + 极细雅致手绘下划线的排版行
 */
function drawRichCaptionLine(ctx, lineSpec, anchorX, baselineY, align = "left") {
  const {
    text = "",
    size = 28,
    weight = 500,
    family = "serif",
    color = COLORS.inkPrimary,
    highlights = [],
  } = lineSpec;

  ctx.font = resolveCaptionFont(family, weight, size);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const totalW = ctx.measureText(text).width;
  const startX =
    align === "center" ? anchorX - totalW * 0.5 : align === "right" ? anchorX - totalW : anchorX;

  // 若无关键词高亮，直接整行绘制
  if (!highlights || highlights.length === 0) {
    ctx.fillStyle = color;
    ctx.fillText(text, startX, baselineY);
    return totalW;
  }

  // 将整行拆分为普通片段与高亮片段（按首次出现顺序非重叠切分）
  const spans = [];
  let cursor = 0;
  while (cursor < text.length) {
    let bestIdx = -1;
    let bestHl = null;
    for (const hl of highlights) {
      if (!hl.word) continue;
      const idx = text.indexOf(hl.word, cursor);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestHl = hl;
      }
    }
    if (bestIdx === -1) {
      spans.push({ text: text.slice(cursor), hl: null });
      break;
    }
    if (bestIdx > cursor) {
      spans.push({ text: text.slice(cursor, bestIdx), hl: null });
    }
    spans.push({ text: bestHl.word, hl: bestHl });
    cursor = bestIdx + bestHl.word.length;
  }

  let curX = startX;
  for (const seg of spans) {
    const segW = ctx.measureText(seg.text).width;
    if (seg.hl) {
      // 若开启下划线：在文字下方绘一道轻盈水彩暖色笔触底线
      if (seg.hl.underline) {
        ctx.save();
        ctx.strokeStyle = rgba(seg.hl.color, 0.34);
        ctx.lineWidth = Math.max(3, size * 0.14);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(curX + 2, baselineY + size * 0.44);
        ctx.lineTo(curX + segW - 2, baselineY + size * 0.44);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = seg.hl.color;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fillText(seg.text, curX, baselineY);
    curX += segW;
  }

  return totalW;
}

/**
 * 绘制帧感知灵动刊物旁白字幕（支持 5 种与当前画风融为一体的装帧变体 + 多行大小错落 + 关键词异色高亮 + 0% 遮挡）
 */
export function drawEditorialCaption(ctx, captionOrText, alphaOverride, w = STAGE_W, h = STAGE_H) {
  if (!captionOrText) return;

  // 向下兼容旧的字符串调用方式
  const cap =
    typeof captionOrText === "string"
      ? {
          variant: "editorial-band",
          x: w * 0.5,
          y: h - 78,
          align: "center",
          alpha: alphaOverride,
          enterP: alphaOverride,
          lines: [{ text: captionOrText, size: 28, weight: 500, family: "serif", color: COLORS.inkPrimary }],
        }
      : captionOrText;

  const alpha = clamp(alphaOverride ?? cap.alpha ?? 1);
  const lines = cap.lines || (cap.text ? [{ text: cap.text, size: 28, weight: 500, family: "serif" }] : []);
  if (lines.length === 0 || alpha <= 0.005) return;

  const variant = cap.variant || "editorial-quote";
  const align = cap.align || "left";
  const accent = cap.accent || COLORS.brandTeal;
  const accent2 = cap.accent2 || COLORS.brandAmber;
  const enterEase = easeEditorialOut(clamp(cap.enterP ?? alpha));
  const slideOffsetY = (1 - enterEase) * 12;

  // 预先测量每行宽高与行距
  const lineMetrics = lines.map((ln) => {
    const size = ln.size || 26;
    const weight = ln.weight || 500;
    const family = ln.family || "serif";
    ctx.save();
    ctx.font = resolveCaptionFont(family, weight, size);
    const width = ctx.measureText(ln.text || "").width;
    ctx.restore();
    return { ...ln, size, weight, family, width, rowH: Math.round(size * 1.46) };
  });

  const maxLineW = Math.max(...lineMetrics.map((m) => m.width), 160);
  const hasKicker = Boolean(cap.kicker);
  const kickerH = hasKicker ? 24 : 0;
  const totalTextH = lineMetrics.reduce((acc, m) => acc + m.rowH, 0);

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 变体 1：editorial-quote（无重框刊物引语：渐隐空气晕 + 左侧青绿暖杏渐变竖线 + 大小错落衬线） ──
  if (variant === "editorial-quote") {
    const baseX = cap.x ?? 1120;
    const baseY = (cap.y ?? 160) + slideOffsetY;
    const barGap = 22;
    const blockH = kickerH + totalTextH;

    // 极柔和暖纸微空气底晕，保证文字在任何淡笔触背景上都清晰通透却不显“加框感”
    const gx = align === "right" ? baseX - maxLineW * 0.5 : baseX + maxLineW * 0.5;
    const gy = baseY + blockH * 0.5;
    const rg = ctx.createRadialGradient(gx, gy, 24, gx, gy, Math.max(maxLineW * 0.68, 260));
    rg.addColorStop(0, "rgba(249, 247, 242, 0.84)");
    rg.addColorStop(0.68, "rgba(249, 247, 242, 0.42)");
    rg.addColorStop(1, "rgba(249, 247, 242, 0)");
    ctx.fillStyle = rg;
    ctx.fillRect(gx - maxLineW * 0.78, gy - blockH * 1.1, maxLineW * 1.56, blockH * 2.2);

    // 优雅渐变装饰竖线（随 enterEase 从上向下轻盈生长）
    const barX = align === "right" ? baseX + barGap : baseX - barGap;
    const barTop = baseY + 2;
    const barLen = Math.max(24, (blockH - 6) * enterEase);
    const barGrad = ctx.createLinearGradient(barX, barTop, barX, barTop + blockH);
    barGrad.addColorStop(0, accent);
    barGrad.addColorStop(1, accent2);
    ctx.strokeStyle = barGrad;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(barX, barTop);
    ctx.lineTo(barX, barTop + barLen);
    ctx.stroke();

    // 顶部微星点
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(barX, barTop, 3.2, 0, Math.PI * 2);
    ctx.fill();

    let curY = baseY;
    if (hasKicker) {
      ctx.font = `600 12.5px ${FONTS.mono}`;
      ctx.fillStyle = rgba(accent, 0.86);
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillText(cap.kicker, baseX, curY + 8);
      curY += kickerH + 4;
    }

    for (const m of lineMetrics) {
      drawRichCaptionLine(ctx, m, baseX, curY + m.rowH * 0.5, align);
      curY += m.rowH;
    }
  }

  // ── 变体 2：editorial-band（典雅无框居下双行排印：柔和雾托底 + 双色极细顶分隔线 + 精致眉标） ──
  else if (variant === "editorial-band") {
    const cx = cap.x ?? w * 0.5;
    const topY = (cap.y ?? h - 180) + slideOffsetY;
    const blockH = kickerH + totalTextH + 14;

    // 柔雾暖纸托底（无硬边框）
    const rg = ctx.createRadialGradient(cx, topY + blockH * 0.5, 40, cx, topY + blockH * 0.5, maxLineW * 0.72);
    rg.addColorStop(0, "rgba(255, 253, 249, 0.88)");
    rg.addColorStop(0.7, "rgba(249, 247, 242, 0.50)");
    rg.addColorStop(1, "rgba(249, 247, 242, 0)");
    ctx.fillStyle = rg;
    ctx.fillRect(cx - maxLineW * 0.8, topY - 26, maxLineW * 1.6, blockH + 56);

    // 顶部细长居中渐变微线
    const ruleHalf = 74 * enterEase;
    const ruleGrad = ctx.createLinearGradient(cx - ruleHalf, topY, cx + ruleHalf, topY);
    ruleGrad.addColorStop(0, rgba(accent, 0));
    ruleGrad.addColorStop(0.32, accent);
    ruleGrad.addColorStop(0.68, accent2);
    ruleGrad.addColorStop(1, rgba(accent2, 0));
    ctx.strokeStyle = ruleGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - ruleHalf, topY);
    ctx.lineTo(cx + ruleHalf, topY);
    ctx.stroke();

    let curY = topY + 14;
    if (hasKicker) {
      ctx.font = `600 12px ${FONTS.mono}`;
      ctx.fillStyle = rgba(accent, 0.82);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cap.kicker, cx, curY + 6);
      curY += kickerH;
    }

    for (const m of lineMetrics) {
      drawRichCaptionLine(ctx, m, cx, curY + m.rowH * 0.5, "center");
      curY += m.rowH;
    }
  }

  // ── 变体 3：bauhaus-poster（第三幕现代图形风专属：利落黑边几何海报卡 + 红黄蓝三原色极简色标 + 粗体无衬线） ──
  else if (variant === "bauhaus-poster") {
    const padX = 28;
    const padY = 20;
    const cardW = maxLineW + padX * 2;
    const cardH = kickerH + totalTextH + padY * 2 + 4;
    const x0 = align === "right" ? (cap.x ?? 84) - cardW : (cap.x ?? 84);
    const y0 = (cap.y ?? 736) + slideOffsetY;

    // 包豪斯硬朗几何偏移底影
    ctx.fillStyle = "rgba(32, 38, 56, 0.14)";
    ctx.fillRect(x0 + 7, y0 + 7, cardW, cardH);

    // 纯净暖米白海报底 + 利落 2.4px 深藏青实线框
    ctx.fillStyle = "#FAF8F2";
    ctx.fillRect(x0, y0, cardW, cardH);
    ctx.strokeStyle = "#202638";
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x0, y0, cardW, cardH);

    // 左侧色块装饰条（红 + 黄 + 蓝）
    const stripeW = 7;
    ctx.fillStyle = "#EC4B53";
    ctx.fillRect(x0, y0, stripeW, cardH * 0.34);
    ctx.fillStyle = "#E3BA34";
    ctx.fillRect(x0, y0 + cardH * 0.34, stripeW, cardH * 0.33);
    ctx.fillStyle = "#2262C4";
    ctx.fillRect(x0, y0 + cardH * 0.67, stripeW, cardH * 0.33);

    let curY = y0 + padY;
    if (hasKicker) {
      ctx.font = `700 11.5px ${FONTS.mono}`;
      ctx.fillStyle = "#2262C4";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(cap.kicker, x0 + padX + 2, curY + 7);
      curY += kickerH + 2;
    }

    for (const m of lineMetrics) {
      drawRichCaptionLine(ctx, m, x0 + padX + 2, curY + m.rowH * 0.5, "left");
      curY += m.rowH;
    }
  }

  // ── 变体 4：collage-note（第三幕手工叙事拼贴风专属：微倾暖棉纸便签 + 珊瑚红和纸胶带 + 手账虚线边） ──
  else if (variant === "collage-note") {
    const padX = 28;
    const padY = 22;
    const cardW = maxLineW + padX * 2;
    const cardH = kickerH + totalTextH + padY * 2 + 2;
    const x0 = cap.x ?? 1038;
    const y0 = (cap.y ?? 148) + slideOffsetY;

    ctx.save();
    ctx.translate(x0 + cardW * 0.5, y0 + cardH * 0.5);
    ctx.rotate(-0.024); // -1.4° 自然手贴微倾角
    ctx.translate(-cardW * 0.5, -cardH * 0.5);

    drawPaperCard(ctx, 0, 0, cardW, cardH, {
      radius: 4,
      fill: "#FAF3E4",
      stroke: "rgba(94, 78, 56, 0.34)",
      lineWidth: 1.5,
      shadowBlur: 18,
      shadowOffsetY: 8,
      shadowColor: "rgba(59, 48, 32, 0.14)",
    });

    // 内嵌极细手账缝线装饰
    ctx.strokeStyle = "rgba(184, 134, 72, 0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(7, 7, cardW - 14, cardH - 14);
    ctx.setLineDash([]);

    // 顶部半透明珊瑚红和纸胶带
    ctx.save();
    ctx.translate(cardW * 0.5, -2);
    ctx.rotate(0.03);
    ctx.fillStyle = "rgba(217, 107, 82, 0.42)";
    ctx.fillRect(-46, -11, 92, 22);
    ctx.restore();

    let curY = padY;
    if (hasKicker) {
      ctx.font = `600 11.5px ${FONTS.mono}`;
      ctx.fillStyle = "rgba(154, 104, 52, 0.85)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(cap.kicker, padX, curY + 7);
      curY += kickerH;
    }

    for (const m of lineMetrics) {
      drawRichCaptionLine(ctx, m, padX, curY + m.rowH * 0.5, "left");
      curY += m.rowH;
    }
    ctx.restore();
  }

  // ── 变体 5：studio-whisper（第四幕工作台画幅留白轻注卡：磨砂暖纸浮注 + 极细渐变竖条，0% 遮挡 UI） ──
  else if (variant === "studio-whisper") {
    const padX = 24;
    const padY = 16;
    const cardW = maxLineW + padX * 2 + 10;
    const cardH = kickerH + totalTextH + padY * 2 + 2;
    const x0 =
      align === "right"
        ? (cap.x ?? 1312) - cardW
        : align === "center"
          ? (cap.x ?? w * 0.5) - cardW * 0.5
          : (cap.x ?? 130);
    const y0 = (cap.y ?? 120) + slideOffsetY;

    drawPaperCard(ctx, x0, y0, cardW, cardH, {
      radius: 16,
      fill: "rgba(255, 253, 249, 0.90)",
      stroke: rgba(accent, 0.24),
      lineWidth: 1.25,
      shadowBlur: 20,
      shadowOffsetY: 8,
      shadowColor: "rgba(28, 52, 58, 0.09)",
    });

    // 右对齐时竖条在右缘、左对齐时竖条在左缘，贴合画面构图重心
    const barX = align === "right" ? x0 + cardW - 12 : x0 + 12;
    const barGrad = ctx.createLinearGradient(barX, y0 + 16, barX, y0 + cardH - 16);
    barGrad.addColorStop(0, accent);
    barGrad.addColorStop(1, accent2);
    ctx.strokeStyle = barGrad;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(barX, y0 + 16);
    ctx.lineTo(barX, y0 + 16 + (cardH - 32) * enterEase);
    ctx.stroke();

    const textAnchorX = align === "right" ? x0 + cardW - padX - 4 : x0 + padX + 4;
    let curY = y0 + padY;
    if (hasKicker) {
      ctx.font = `600 11.5px ${FONTS.mono}`;
      ctx.fillStyle = rgba(accent, 0.88);
      ctx.textAlign = align === "right" ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillText(cap.kicker, textAnchorX, curY + 7);
      curY += kickerH;
    }

    for (const m of lineMetrics) {
      drawRichCaptionLine(ctx, m, textAnchorX, curY + m.rowH * 0.5, align === "right" ? "right" : "left");
      curY += m.rowH;
    }
  }

  ctx.restore();
}

/**
 * 绘制柔焦聚焦遮罩（第四幕工作台精修时温和压暗非操作区，锁定视线焦点）
 */
export function drawFocusMask(ctx, mask, w = STAGE_W, h = STAGE_H) {
  if (!mask || !mask.active || mask.dimAlpha <= 0.004) return;
  const { rect, dimAlpha = 0.22, radius = 16 } = mask;
  ctx.save();
  ctx.fillStyle = `rgba(28, 42, 48, ${clamp(dimAlpha, 0, 0.5).toFixed(4)})`;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  if (rect) {
    // 逆时针挖空保留高亮区（evenodd）
    const r = Math.min(radius, rect.w * 0.5, rect.h * 0.5);
    ctx.moveTo(rect.x + r, rect.y);
    ctx.lineTo(rect.x + rect.w - r, rect.y);
    ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r);
    ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h);
    ctx.lineTo(rect.x + r, rect.y + rect.h);
    ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r);
    ctx.lineTo(rect.x, rect.y + r);
    ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y);
    ctx.closePath();
  }
  ctx.fill("evenodd");
  ctx.restore();
}
