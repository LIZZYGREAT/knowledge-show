/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 暖纸材质、纤维微噪点、环境柔晕与刊物排版工具
 * 核心要求：纸纹离线生成且坐标锁定在世界空间，绝不逐帧随机刷新，防止 H.264 压缩闪烁
 */

import { COLORS, FONTS, STAGE_W, STAGE_H } from "../config/tokens.js";
import { mulberry32, clamp } from "./math.js";

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
 * 绘制克制高雅的刊物底部旁白字幕（半透明暖纸轻垫 + 典雅衬线体）
 */
export function drawEditorialCaption(ctx, text, alpha, w = STAGE_W, h = STAGE_H) {
  if (!text || alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `500 28px ${FONTS.serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(text);
  const padX = 34;
  const pillW = Math.min(w - 160, metrics.width + padX * 2);
  const pillH = 58;
  const cx = w * 0.5;
  const cy = h - 62;

  ctx.shadowColor = "rgba(28, 42, 48, 0.08)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, cx - pillW * 0.5, cy - pillH * 0.5, pillW, pillH, 29);
  ctx.fillStyle = "rgba(255, 253, 249, 0.88)";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(28, 42, 48, 0.11)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 左右极细青绿与暖杏装饰短点
  ctx.fillStyle = COLORS.brandTeal;
  ctx.beginPath();
  ctx.arc(cx - pillW * 0.5 + 16, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.brandAmber;
  ctx.beginPath();
  ctx.arc(cx + pillW * 0.5 - 16, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.inkPrimary;
  ctx.fillText(text, cx, cy + 1);
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
