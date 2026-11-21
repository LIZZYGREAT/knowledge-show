/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 2D 虚拟摄像机
 * 同步驱动 Layer 1 Canvas 世界变换与 Layer 2 DOM 变换矩阵，确保三层像素级对齐
 */

import { STAGE_W, STAGE_H } from "../config/tokens.js";

export class Camera2D {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = STAGE_W * 0.5;
    this.y = STAGE_H * 0.5;
    this.zoom = 1.0;
    this.rotation = 0.0;
    // 局部柔焦遮罩：{ active, rect: {x,y,w,h}, dimAlpha, feather }
    this.focusMask = null;
  }

  set({ x = STAGE_W * 0.5, y = STAGE_H * 0.5, zoom = 1.0, rotation = 0.0, focusMask = null } = {}) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.rotation = rotation;
    this.focusMask = focusMask;
  }

  /**
   * 将摄像机变换应用到 2D Canvas 上下文（假设画布逻辑坐标为 1920x1080）
   */
  applyToCanvas(ctx, w = STAGE_W, h = STAGE_H) {
    ctx.translate(w * 0.5, h * 0.5);
    if (this.rotation !== 0) ctx.rotate(-this.rotation);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /**
   * 输出与 applyToCanvas 完全等价的 CSS transform（transform-origin: 0 0）
   */
  toCssTransform(w = STAGE_W, h = STAGE_H) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const rotDeg = (-this.rotation * 180) / Math.PI;
    const parts = [
      `translate3d(${cx.toFixed(3)}px, ${cy.toFixed(3)}px, 0)`,
    ];
    if (Math.abs(rotDeg) > 1e-4) {
      parts.push(`rotate(${rotDeg.toFixed(4)}deg)`);
    }
    parts.push(`scale(${this.zoom.toFixed(5)})`);
    parts.push(`translate3d(${(-this.x).toFixed(3)}px, ${(-this.y).toFixed(3)}px, 0)`);
    return parts.join(" ");
  }

  /**
   * 世界坐标 -> 屏幕（1920x1080）坐标
   */
  worldToScreen(wx, wy, w = STAGE_W, h = STAGE_H) {
    const dx = wx - this.x;
    const dy = wy - this.y;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const rx = (dx * cos - dy * sin) * this.zoom;
    const ry = (dx * sin + dy * cos) * this.zoom;
    return { x: w * 0.5 + rx, y: h * 0.5 + ry };
  }

  /**
   * 世界矩形 -> 屏幕矩形（适用于无旋转时精确映射 DOM/Canvas 元素位置）
   */
  worldRectToScreen(rect, w = STAGE_W, h = STAGE_H) {
    const tl = this.worldToScreen(rect.x, rect.y, w, h);
    return {
      x: tl.x,
      y: tl.y,
      w: rect.w * this.zoom,
      h: rect.h * this.zoom,
    };
  }
}
