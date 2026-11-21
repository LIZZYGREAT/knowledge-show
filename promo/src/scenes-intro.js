/*
 * 共享图层 + 第一幕（好奇心火花）+ 第二幕（告别 PPT）+ 第三幕（品牌字标）
 */
(function () {
  "use strict";
  const KS = window.KS;
  const { C, W, H, E, ease, life, prog, lerp, clamp, TAU } = KS;
  KS.scenes = KS.scenes || [];

  // ————————————————————————————————————————————————————————————
  // 共享背景
  // ————————————————————————————————————————————————————————————
  let lightBg = null, grain = null;
  function buildLightBg() {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = C.canvas;
    g.fillRect(0, 0, W, H);
    const blob = (x, y, rx, ry, col, a) => {
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      grd.addColorStop(0, KS.rgba(col, a));
      grd.addColorStop(1, KS.rgba(col, 0));
      g.fillStyle = grd;
      g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    };
    blob(190, -40, 1300, 540, "#2dc6a5", 0.14);
    blob(1730, 60, 1080, 520, "#f6bb6c", 0.13);
    blob(1000, 1150, 1100, 480, "#5caef5", 0.1);
    g.fillStyle = "rgba(18,72,65,0.05)";
    for (let y = 14; y < H; y += 28) for (let x = 14; x < W; x += 28) { g.beginPath(); g.arc(x, y, 1.1, 0, TAU); g.fill(); }
    lightBg = c;
    const n = document.createElement("canvas");
    n.width = n.height = 256;
    const ng = n.getContext("2d");
    const img = ng.createImageData(256, 256);
    const r = KS.rng(3);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    grain = n;
  }

  KS.darkness = (t) => {
    if (t < 5) return 1 - ease(t, 4.88, 5.0, E.inQuad) * 0; // 前 5 秒保持黑夜
    return 1 - ease(t, 5.0, 5.35, E.outCubic);
  };

  KS.drawBackground = function (ctx, t) {
    if (!lightBg) buildLightBg();
    const dk = t < 5 ? 1 : KS.darkness(t);
    if (dk < 1) {
      ctx.drawImage(lightBg, 0, 0);
      // 缓慢游动的色晕
      KS.glow(ctx, 380 + Math.sin(t * 0.21) * 160, 260 + Math.cos(t * 0.17) * 90, 700, "#7fe3cf", 0.28);
      KS.glow(ctx, 1560 + Math.cos(t * 0.19) * 140, 820 + Math.sin(t * 0.23) * 80, 760, "#a9c8ff", 0.2);
      KS.glow(ctx, 1500 + Math.sin(t * 0.13) * 120, 180, 520, "#ffd9a3", 0.22);
    }
    if (dk > 0) {
      ctx.save();
      ctx.globalAlpha = dk;
      const g = ctx.createRadialGradient(960, 470, 40, 960, 540, 1250);
      g.addColorStop(0, "#123a35");
      g.addColorStop(0.45, C.nightMid);
      g.addColorStop(1, "#030c0b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };

  KS.drawGrain = function (ctx, t, frame) {
    if (!grain) buildLightBg();
    const dk = KS.darkness(t);
    ctx.save();
    ctx.globalAlpha = 0.035 + dk * 0.03;
    ctx.globalCompositeOperation = "overlay";
    const ox = (frame * 73) % 256, oy = (frame * 151) % 256;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = ctx.createPattern(grain, "repeat");
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
    // 暗角
    const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1180);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(${dk > 0.5 ? "0,0,0" : "12,40,36"},${0.08 + dk * 0.45})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  };

  // ————————————————————————————————————————————————————————————
  // 漂浮的知识微尘（全片贯穿的视觉锚点）
  // ————————————————————————————————————————————————————————————
  const DUST = [];
  (function () {
    const r = KS.rng(42);
    const cols = [C.flowLight, C.mint, C.gold, "#9fd8ff", "#ffffff", C.accentBright];
    for (let i = 0; i < 170; i++)
      DUST.push({ x: r() * W, y: r() * H, vx: (r() - 0.5) * 22, vy: -6 - r() * 16, s: 0.6 + r() * r() * 3.2, c: cols[Math.floor(r() * cols.length)], ph: r() * TAU, f: 0.5 + r() * 1.5 });
  })();
  KS.dustPos = function (p, t, i) {
    let x = p.x + p.vx * t + Math.sin(t * 0.4 * p.f + p.ph) * 24 + KS.noise1(t * 0.15 + i, i) * 40;
    let y = p.y + p.vy * t + Math.cos(t * 0.33 * p.f + p.ph) * 18;
    x = ((x % (W + 80)) + W + 80) % (W + 80) - 40;
    y = ((y % (H + 80)) + H + 80) % (H + 80) - 40;
    return [x, y];
  };
  KS.drawDust = function (ctx, t, amount = 1) {
    const dk = KS.darkness(t);
    const pts = DUST.map((p, i) => KS.dustPos(p, t, i));
    if (dk > 0.02) {
      // 夜空中的“知识星座”连线
      ctx.save();
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const a = (1 - Math.sqrt(d2) / 120) * 0.22 * dk * amount;
            ctx.strokeStyle = `rgba(120,230,205,${a})`;
            ctx.beginPath();
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(pts[j][0], pts[j][1]);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      pts.forEach(([x, y], i) => {
        const p = DUST[i];
        const tw = 0.55 + 0.45 * Math.sin(t * 2.2 * p.f + p.ph);
        KS.glow(ctx, x, y, p.s * 7, p.c, 0.55 * tw * dk * amount);
      });
      ctx.restore();
    }
    if (dk < 0.98) {
      ctx.save();
      pts.forEach(([x, y], i) => {
        if (i % 2) return;
        const p = DUST[i];
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 * p.f + p.ph);
        ctx.globalAlpha = (1 - dk) * 0.42 * tw * amount;
        ctx.fillStyle = p.c === "#ffffff" ? C.accent : p.c === C.gold ? C.warmBright : C.accentBright;
        KS.circle(ctx, x, y, p.s * 1.1);
        ctx.fill();
        if (p.s > 2.4) {
          ctx.globalAlpha *= 0.5;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1;
          KS.circle(ctx, x, y, p.s * 3.2);
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  };

  // ————————————————————————————————————————————————————————————
  // 丝带系统：横向流动 ↔ 螺旋汇聚
  // ————————————————————————————————————————————————————————————
  const RIBBONS = [
    { base: 165, amp: 72, freq: 0.85, ph: 0.4, w: 46, colors: [C.mint, C.accentBright, C.skyBright], back: ["#0b7a66", "#0f3c42", "#146368"], lines: 4 },
    { base: 965, amp: 58, freq: 0.7, ph: 2.1, w: 50, colors: [C.skyBright, C.indigo, C.violet], back: ["#24306e", "#1a3f7a", "#1a827d"], lines: 4 },
    { base: 920, amp: 62, freq: 1.05, ph: 4.2, w: 14, colors: [C.gold, C.warmBright, C.peach], back: [C.warm, "#b86c1c"], lines: 0 },
  ];
  /**
   * opt: { m: 螺旋混合 0..1, cx, cy, from, to(数组或数字), alpha, spin }
   */
  KS.drawRibbons = function (ctx, t, opt) {
    RIBBONS.forEach((R, i) => {
      const to = Array.isArray(opt.to) ? opt.to[i] : opt.to;
      const from = Array.isArray(opt.from) ? opt.from[i] : opt.from || 0;
      if (to - from <= 0.002) return;
      const wave = (s) => [
        lerp(-260, W + 260, s),
        R.base + R.amp * Math.sin(s * TAU * R.freq + R.ph + t * 0.55) + 46 * KS.noise1(s * 2.6 + t * 0.25, i + 3),
      ];
      const spiral = (s) => {
        const ang = (i * TAU) / 3 + (1 - s) * 4.4 + t * (opt.spin ?? 1.4);
        const rad = lerp(6, 1500, Math.pow(1 - s, 1.5));
        return [opt.cx + Math.cos(ang) * rad, opt.cy + Math.sin(ang) * rad * 0.78];
      };
      const m = opt.m || 0;
      const center = m <= 0 ? wave : m >= 1 ? spiral : (s) => {
        const a = wave(s), b = spiral(s);
        const mm = E.inOutCubic(clamp(m * 1.25 - (1 - s) * 0.25));
        return [lerp(a[0], b[0], mm), lerp(a[1], b[1], mm)];
      };
      const shrink = m > 0 ? lerp(1, 0.55, m) : 1;
      KS.ribbon(ctx, {
        center,
        from,
        to,
        segments: 150,
        width: (s) => R.w * shrink * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * clamp(s)), 0.6)) * (m > 0 ? lerp(1, 1 - s * 0.85, m) : 1),
        twist: (s) => s * TAU * 1.15 + t * 0.9 + i * 2.1,
        colors: R.colors,
        back: R.back,
        lines: R.lines,
        lineColor: "rgba(255,255,255,0.3)",
        alpha: opt.alpha ?? 1,
      });
    });
  };

  // ————————————————————————————————————————————————————————————
  // 第一幕：黑暗中的好奇心火花（0 – 5.1s）
  // ————————————————————————————————————————————————————————————
  const QUESTIONS = [
    "为什么两个骰子最容易掷出 7？",
    "白光为何散成彩虹？",
    "23 个人里，为何常有人同一天生日？",
    "AI 怎样“注意”一句话？",
    "PN 结为何只让电流单向通过？",
    "肥皂泡为什么是彩色的？",
    "为什么天空是蓝的？",
    "猫为什么总能四脚着地？",
  ];
  const SPARK = [960, 420];
  const qState = (i, t) => {
    // 避开下方标语区（y=630..840 中央），把 8 个问题分布在星空的上方与左右翼
    const slots = [
      [340, 210], [720, 145], [1220, 155], [1580, 240],
      [270, 445], [1640, 465], [330, 745], [1590, 735],
    ];
    const [bx, by] = slots[i % slots.length];
    const absorb = ease(t, 2.5 + i * 0.07, 3.75 + i * 0.05, E.inCubic);
    const driftX = Math.sin(t * 0.7 + i * 1.3) * 16;
    const driftY = Math.cos(t * 0.6 + i * 1.1) * 12;
    const sx = bx + driftX, sy = by + driftY;
    const dx = sx - SPARK[0], dy = sy - SPARK[1];
    const ang = Math.atan2(dy, dx) + absorb * 2.1;
    const rad = Math.hypot(dx, dy) * (1 - absorb);
    return {
      x: SPARK[0] + Math.cos(ang) * rad,
      y: SPARK[1] + Math.sin(ang) * rad,
      a: ease(t, 0.25 + i * 0.16, 0.9 + i * 0.16, E.outCubic) * (1 - absorb * absorb),
      sc: 1 - absorb * 0.85,
      absorb,
    };
  };

  KS.scenes.push({
    id: "spark",
    start: 0,
    end: 5.4,
    draw(ctx, t) {
      const fadeIn = ease(t, 0, 0.9, E.outCubic);
      // 被吸入火花的问题
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      QUESTIONS.forEach((q, i) => {
        const s = qState(i, t);
        if (s.a <= 0.01) return;
        // 尾迹
        if (s.absorb > 0.02) {
          ctx.globalCompositeOperation = "lighter";
          for (let k = 1; k <= 8; k++) {
            const p = qState(i, t - k * 0.035);
            KS.glow(ctx, p.x, p.y, 14 - k, C.gold, s.a * (1 - k / 9) * 0.6);
          }
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(s.sc, s.sc);
        ctx.globalAlpha = s.a * 0.85 * fadeIn;
        ctx.font = KS.font(30, 500, KS.FONT_SERIF);
        ctx.fillStyle = "#d9f5ee";
        ctx.fillText(q, 0, 0);
        ctx.restore();
      });
      ctx.restore();

      // 火花
      const charge = ease(t, 2.7, 4.3, E.inOutCubic);
      const breath = 0.5 + 0.5 * Math.sin(t * 3.2);
      const burst = ease(t, 4.45, 5.1, E.outCubic);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const r0 = (70 + breath * 26 + charge * 190) * fadeIn;
      KS.glow(ctx, SPARK[0], SPARK[1], r0 * 2.6, C.warm, 0.35 * fadeIn);
      KS.glow(ctx, SPARK[0], SPARK[1], r0, C.gold, 0.9 * fadeIn);
      KS.glow(ctx, SPARK[0], SPARK[1], r0 * 0.35, "#ffffff", 1 * fadeIn);
      KS.sparkle(ctx, SPARK[0], SPARK[1], (26 + charge * 70 + breath * 6) * fadeIn, "#fff6e0", 0.95, t * 0.4);
      KS.sparkle(ctx, SPARK[0], SPARK[1], (14 + charge * 40) * fadeIn, "#ffffff", 0.8, t * 0.4 + Math.PI / 4);
      // 冲击波
      for (let k = 0; k < 3; k++) {
        const u = ease(t, 4.45 + k * 0.12, 5.2 + k * 0.12, E.outCubic);
        if (u > 0 && u < 1) {
          ctx.strokeStyle = KS.rgba(k === 1 ? C.mint : C.gold, (1 - u) * 0.85);
          ctx.lineWidth = 6 * (1 - u) + 1;
          KS.circle(ctx, SPARK[0], SPARK[1], 30 + u * (900 + k * 200));
          ctx.stroke();
        }
      }
      // 迸射粒子
      if (burst > 0) {
        const r = KS.rng(5);
        for (let i = 0; i < 90; i++) {
          const ang = r() * TAU, sp = 300 + r() * 1100;
          const d = burst * sp;
          const col = [C.gold, C.mint, "#ffffff", C.skyBright][i % 4];
          KS.glow(ctx, SPARK[0] + Math.cos(ang) * d, SPARK[1] + Math.sin(ang) * d, 10 + r() * 14, col, (1 - burst) * 0.9);
        }
      }
      ctx.restore();

      // 标语
      const out = 1 - ease(t, 4.2, 4.6, E.inCubic);
      KS.revealText(ctx, "好奇心，", { x: 960, y: 700, size: 74, weight: 700, family: KS.FONT_SERIF, t, start: 1.1, stagger: 0.09, dur: 0.8, gradient: ["#ffe2a8", "#ffd28a", "#f2a94b"], out });
      KS.revealText(ctx, "是所有好故事的开始。", { x: 960, y: 800, size: 58, weight: 600, family: KS.FONT_SERIF, t, start: 1.7, stagger: 0.07, dur: 0.8, color: "#e6fbf5", out, spacing: 4 });
      // 白光转场
      const flash = Math.max(0, 1 - Math.abs(t - 5.0) / 0.32);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,253,246,${E.outCubic(flash)})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  });

  // ————————————————————————————————————————————————————————————
  // 第二幕：告别 PPT，让知识动起来（5.0 – 12.4s）
  // ————————————————————————————————————————————————————————————
  const SLIDE_W = 780, SLIDE_H = 440;
  const SLIDES = [
    { title: "第三章  概率论基础", lines: ["• 定义：样本空间 Ω 为所有可能结果", "• 古典概型：P(A) = |A| / |Ω|", "• 例：两枚骰子点数之和……"], page: "P.12" },
    { title: "3.2  离散型随机变量", lines: ["• 分布列：P(X = k) = pₖ", "• 期望：E(X) = Σ k · pₖ", "• 方差：D(X) = E(X²) − E²(X)"], page: "P.13" },
    { title: "3.3  例题讲解", lines: ["• 已知……求……", "• 解：由题意得……", "• 综上所述，答案为 ____"], page: "P.14" },
  ];
  const slidePose = (k, t) => {
    const appear = 5.25 + k * 0.42;
    const u = E.outBack(prog(t, appear, appear + 0.5), 1.4);
    return {
      x: 960 + (k - 1) * 70,
      y: 600 + (k - 1) * 46 + (1 - u) * 420,
      rot: (k - 1) * 0.035,
      a: clamp(prog(t, appear, appear + 0.2)),
    };
  };
  function drawSlide(ctx, s, k) {
    const x = -SLIDE_W / 2, y = -SLIDE_H / 2;
    ctx.save();
    ctx.shadowColor = "rgba(30,40,50,0.18)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, SLIDE_W, SLIDE_H);
    ctx.restore();
    ctx.strokeStyle = "#d4d9de";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, SLIDE_W, SLIDE_H);
    ctx.fillStyle = "#4a6fa5";
    ctx.fillRect(x, y, SLIDE_W, 84);
    KS.text(ctx, s.title, x + 36, y + 56, { size: 36, weight: 700, color: "#ffffff" });
    s.lines.forEach((l, i) => KS.text(ctx, l, x + 44, y + 160 + i * 72, { size: 32, weight: 500, color: "#4b5560" }));
    ctx.fillStyle = "#e9edf1";
    ctx.fillRect(x + 520, y + 130, 220, 150);
    ctx.strokeStyle = "#c8d0d8";
    ctx.strokeRect(x + 520, y + 130, 220, 150);
    KS.text(ctx, "[ 图 3-" + (k + 1) + " ]", x + 630, y + 215, { size: 24, color: "#9aa5b0", align: "center" });
    KS.text(ctx, s.page, x + SLIDE_W - 30, y + SLIDE_H - 24, { size: 22, color: "#9aa5b0", align: "right" });
  }
  let slideSnap = null;
  function buildSlideSnap() {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    for (let k = 0; k < 3; k++) {
      const p = slidePose(k, 99);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      drawSlide(g, SLIDES[k], k);
      g.restore();
    }
    slideSnap = c;
  }
  const SHARDS = [];
  (function () {
    const r = KS.rng(77);
    const cols = 18, rows = 10;
    const x0 = 960 - 70 - SLIDE_W / 2 - 40, y0 = 600 - 46 - SLIDE_H / 2 - 30;
    const w = (SLIDE_W + 140 + 80) / cols, h = (SLIDE_H + 92 + 60) / rows;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = x0 + (i + 0.5) * w, cy = y0 + (j + 0.5) * h;
        const ang = Math.atan2(cy - 600, cx - 960) + (r() - 0.5) * 0.9;
        SHARDS.push({ sx: x0 + i * w, sy: y0 + j * h, w, h, ang, sp: 500 + r() * 1300, rot: (r() - 0.5) * 7, delay: (Math.abs(cx - 760) / 1000) * 0.35 + r() * 0.1 });
      }
  })();

  KS.scenes.push({
    id: "anti-ppt",
    start: 5.0,
    end: 12.6,
    draw(ctx, t) {
      if (!slideSnap) buildSlideSnap();
      const shatterAt = 7.55;
      // 上方提问字幕 + 删除线
      const capA = life(t, 5.5, 7.95, 0.4, 0.35);
      if (capA > 0) {
        const txt = "还在用一页页 PPT 讲知识？";
        ctx.save();
        ctx.globalAlpha = capA;
        ctx.font = KS.font(46, 700);
        const w = ctx.measureText(txt).width;
        ctx.fillStyle = C.inkBody;
        ctx.textAlign = "center";
        ctx.fillText(txt, 960, 214);
        const sw = ease(t, 6.75, 7.15, E.inOutCubic);
        if (sw > 0) {
          ctx.strokeStyle = C.warm;
          ctx.lineWidth = 7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(960 - w / 2 - 14, 200);
          ctx.lineTo(960 - w / 2 - 14 + (w + 28) * sw, 196 - sw * 4);
          ctx.stroke();
        }
        ctx.restore();
      }
      // 幻灯片：弹入（刻意的“PPT 式”动画）
      if (t < shatterAt) {
        for (let k = 0; k < 3; k++) {
          const p = slidePose(k, t);
          if (p.a <= 0) continue;
          ctx.save();
          ctx.globalAlpha = p.a;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          drawSlide(ctx, SLIDES[k], k);
          ctx.restore();
        }
      } else if (t < shatterAt + 1.6) {
        // 碎裂：每片沿径向飞散、旋转、染成品牌青绿
        SHARDS.forEach((s) => {
          const u = prog(t, shatterAt + s.delay, shatterAt + s.delay + 1.1);
          const e = E.outCubic(u);
          const d = e * s.sp;
          const cx = s.sx + s.w / 2 + Math.cos(s.ang) * d;
          const cy = s.sy + s.h / 2 + Math.sin(s.ang) * d;
          ctx.save();
          ctx.globalAlpha = 1 - E.inQuad(u);
          ctx.translate(cx, cy);
          ctx.rotate(s.rot * e);
          const sc = 1 - e * 0.6;
          ctx.scale(sc, sc);
          ctx.drawImage(slideSnap, s.sx, s.sy, s.w, s.h, -s.w / 2, -s.h / 2, s.w + 0.6, s.h + 0.6);
          if (u > 0) {
            ctx.fillStyle = KS.rgba(KS.ramp([C.mint, C.accentBright, C.skyBright], (s.sx / W)), e * 0.85);
            ctx.fillRect(-s.w / 2, -s.h / 2, s.w + 0.6, s.h + 0.6);
          }
          ctx.restore();
        });
        // 碎裂瞬间的亮环
        const u = prog(t, shatterAt, shatterAt + 0.8);
        if (u < 1) {
          ctx.strokeStyle = KS.rgba(C.accentBright, (1 - u) * 0.7);
          ctx.lineWidth = 10 * (1 - u);
          KS.circle(ctx, 900, 600, 100 + E.outCubic(u) * 900);
          ctx.stroke();
        }
      }

      // 丝带（第二幕横扫 → 第三幕汇聚）
      if (t > 7.4 && t < 13.6) {
        KS.drawRibbons(ctx, t, {
          to: [ease(t, 7.45, 8.7, E.outCubic), ease(t, 7.6, 8.9, E.outCubic), ease(t, 7.8, 9.1, E.outCubic)],
          from: ease(t, 12.35, 13.45, E.inCubic),
          m: ease(t, 11.25, 12.45, E.inOutCubic),
          cx: 960,
          cy: 430,
        });
      }

      // 主标语
      const out = 1 - ease(t, 11.15, 11.6, E.inCubic);
      if (t > 8.0 && out > 0) {
        ctx.save();
        const lift = ease(t, 11.15, 11.6, E.inCubic) * -30;
        ctx.translate(0, lift);
        KS.revealText(ctx, "让知识，", { x: 960, y: 500, size: 164, weight: 900, family: KS.FONT_SERIF, t, start: 8.15, stagger: 0.1, dur: 0.75, color: C.ink, out, spacing: 8 });
        const w2 = KS.revealText(ctx, "动起来。", { x: 960, y: 690, size: 164, weight: 900, family: KS.FONT_SERIF, t, start: 8.55, stagger: 0.1, dur: 0.75, gradient: [C.accentStrong, C.accentBright, C.skyBright], out, spacing: 8 });
        // 手绘下划线
        const ul = ease(t, 9.15, 9.85, E.inOutCubic);
        if (ul > 0) {
          ctx.save();
          ctx.globalAlpha = out;
          ctx.strokeStyle = C.warmBright;
          ctx.lineWidth = 10;
          ctx.lineCap = "round";
          const x0 = 960 - w2 / 2 + 10, x1 = 960 + w2 / 2 - 60;
          KS.strokePath(ctx, (u) => [lerp(x0, x1, u), 724 + Math.sin(u * Math.PI * 2.2) * 7 - u * 6], 0, ul, 60);
          ctx.restore();
          KS.sparkle(ctx, x1 + 30, 708, 22 * E.outBack(prog(t, 9.8, 10.2)), C.warmBright, out, t);
        }
        KS.revealText(ctx, "把一个好奇的问题，变成一支看得见对象变化与机制规律的知识动画", { x: 960, y: 802, size: 34, weight: 500, t, start: 9.5, stagger: 0.022, dur: 0.6, color: C.muted, out, spacing: 2 });
        ctx.restore();
      }
    },
  });

  // ————————————————————————————————————————————————————————————
  // 第三幕：品牌字标组装（12.0 – 17.6s）
  // ————————————————————————————————————————————————————————————
  const LOGO_C = [960, 430];
  KS.watermark = function (ctx, t) {
    // 品牌角标：从 17.5s 起常驻，至 55.5s 让位给片尾
    const a = life(t, 17.2, 55.6, 0.5, 0.4);
    if (a <= 0) return;
    KS.drawLogo(ctx, 92, 78, 52, { alpha: a });
    KS.text(ctx, "Knowledge.Show(me)", 132, 88, { size: 24, weight: 800, color: C.ink, alpha: a });
  };

  KS.scenes.push({
    id: "logo",
    start: 12.0,
    end: 17.6,
    draw(ctx, t) {
      const fly = ease(t, 16.75, 17.5, E.inOutCubic);
      const cx = lerp(LOGO_C[0], 92, fly), cy = lerp(LOGO_C[1], 78, fly);
      const size = lerp(300, 52, fly);
      // 轨道
      const orbitA = life(t, 13.0, 16.9, 0.8, 0.4);
      if (orbitA > 0) {
        ctx.save();
        ctx.translate(LOGO_C[0], LOGO_C[1]);
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.rotate(-0.35 + k * 0.42);
          ctx.strokeStyle = KS.rgba([C.accentBright, C.skyBright, C.warmBright][k], 0.28 * orbitA);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 10]);
          ctx.beginPath();
          const rx = 300 + k * 70, ry = 92 + k * 26;
          ctx.ellipse(0, 0, rx, ry, 0, 0, TAU * ease(t, 13.0 + k * 0.15, 14.0 + k * 0.15, E.outCubic));
          ctx.stroke();
          ctx.setLineDash([]);
          const a = t * (0.9 - k * 0.2) + k * 2;
          ctx.fillStyle = KS.rgba([C.accentBright, C.skyBright, C.warmBright][k], orbitA);
          KS.circle(ctx, Math.cos(a) * rx, Math.sin(a) * ry, 7 - k);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      // 迸发
      const bu = prog(t, 13.45, 14.6);
      if (bu > 0 && bu < 1) {
        ctx.save();
        const r = KS.rng(13);
        for (let i = 0; i < 70; i++) {
          const ang = r() * TAU, sp = 180 + r() * 520;
          const d = E.outCubic(bu) * sp;
          const col = [C.mint, C.skyBright, C.violet, C.warmBright][i % 4];
          ctx.globalAlpha = (1 - bu) * 0.9;
          ctx.fillStyle = col;
          const x = LOGO_C[0] + Math.cos(ang) * (160 + d), y = LOGO_C[1] + Math.sin(ang) * (160 + d) * 0.85;
          if (i % 3 === 0) KS.sparkle(ctx, x, y, 9 * (1 - bu) + 3, col, (1 - bu), ang);
          else { KS.circle(ctx, x, y, 2 + (i % 4)); ctx.fill(); }
        }
        ctx.restore();
        ctx.strokeStyle = KS.rgba(C.accentBright, (1 - bu) * 0.6);
        ctx.lineWidth = 3;
        KS.circle(ctx, LOGO_C[0], LOGO_C[1], 160 + E.outCubic(bu) * 420);
        ctx.stroke();
      }
      // 字标
      KS.glow(ctx, cx, cy, size * 1.4, C.flowLight, 0.35 * life(t, 12.6, 16.9, 0.6, 0.5));
      KS.drawLogo(ctx, cx, cy, size, {
        tile: prog(t, 12.2, 12.85),
        spine: prog(t, 12.4, 13.0),
        upper: prog(t, 12.6, 13.3),
        lower: prog(t, 12.75, 13.45),
        heart: prog(t, 13.1, 13.8),
        star: prog(t, 13.35, 14.4),
        shine: prog(t, 14.45, 15.3),
      });
      if (t > 13.3) KS.sparkle(ctx, cx + size * 0.095, cy, size * 0.32 * life(t, 13.35, 14.4, 0.15, 0.6), "#ffffff", 0.9, t * 2);
      // 文字
      const out = 1 - ease(t, 16.5, 16.95, E.inCubic);
      if (out > 0) {
        ctx.save();
        ctx.font = KS.font(118, 800);
        const parts = [["Knowledge.", C.ink], ["Show", C.accent], ["(me)", C.warm]];
        const total = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
        ctx.restore();
        let x = 960 - total / 2;
        let idx = 0;
        parts.forEach(([s, col]) => {
          const w = KS.revealText(ctx, s, { x, y: 735, size: 118, weight: 800, align: "left", t, start: 13.65 + idx * 0.035, stagger: 0.035, dur: 0.6, color: col, out });
          x += w;
          idx += s.length;
        });
        KS.revealText(ctx, "清新知识动画工坊  ·  一个问题，一支动画", { x: 960, y: 820, size: 32, weight: 500, t, start: 14.4, stagger: 0.03, dur: 0.6, color: C.muted, out, spacing: 6 });
      }
    },
  });
})();
