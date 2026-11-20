/*
 * Knowledge.Show(me) 宣传片 —— 核心工具
 * 所有画面都是时间 t 的纯函数：同一个 t 永远得到同一帧，方便实时播放、拖动与逐帧导出。
 */
(function () {
  "use strict";
  const KS = (window.KS = window.KS || {});

  KS.W = 1920;
  KS.H = 1080;

  // —— 品牌色：取自 frontend/src/common/theme.css 与 BrandLogo ——
  KS.C = {
    canvas: "#f8faf7",
    canvasDeep: "#eef4f1",
    ink: "#122926",
    inkBody: "#2a4340",
    muted: "#5a726f",
    mutedDim: "#7e9491",
    accent: "#0f967d",
    accentStrong: "#0b7a66",
    accentBright: "#1cb89a",
    accentSoft: "#e4f7f2",
    flowLight: "#64d9c2",
    mint: "#35ecc6",
    sky: "#2d82d6",
    skyBright: "#269be8",
    indigo: "#4f6ef2",
    violet: "#7b5ae6",
    warm: "#e08d30",
    warmBright: "#f2a94b",
    gold: "#ffd28a",
    peach: "#ff9a7b",
    night: "#071a18",
    nightMid: "#0d2b28",
  };

  KS.FONT_SANS =
    'Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';
  KS.FONT_SERIF =
    '"Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "Iowan Old Style", Georgia, serif';
  KS.FONT_MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

  // —— 数学 ——
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (u) => u * u * (3 - 2 * u);
  const E = {
    linear: (u) => u,
    inQuad: (u) => u * u,
    outQuad: (u) => 1 - (1 - u) * (1 - u),
    inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
    inCubic: (u) => u * u * u,
    outCubic: (u) => 1 - Math.pow(1 - u, 3),
    inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    outQuart: (u) => 1 - Math.pow(1 - u, 4),
    inQuart: (u) => u * u * u * u,
    inOutQuart: (u) => (u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2),
    outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    inExpo: (u) => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)),
    inOutExpo: (u) =>
      u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
    outBack: (u, s = 1.70158) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
    outElastic: (u) =>
      u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };
  /** 从 a 到 b 的进度，并套用缓动 */
  const ease = (t, a, b, fn = E.inOutCubic) => fn(prog(t, a, b));
  /** 进入、停留、退出三段式透明度 */
  const life = (t, a, b, fadeIn = 0.4, fadeOut = 0.4) =>
    Math.min(ease(t, a, a + fadeIn, E.outCubic), 1 - ease(t, b - fadeOut, b, E.inCubic));

  Object.assign(KS, { clamp, lerp, prog, smooth, E, ease, life, TAU: Math.PI * 2 });

  // —— 确定性随机 ——
  KS.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // —— 平滑噪声（1D / 2D 值噪声），用于有机流动 ——
  const PERM = new Uint8Array(512);
  (function () {
    const r = KS.rng(20261120);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  })();
  const hash2 = (x, y) => PERM[(PERM[x & 255] + y) & 511] / 255;
  KS.noise2 = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smooth(xf), v = smooth(yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
  };
  KS.noise1 = (x, seed = 0) => KS.noise2(x, seed * 17.13);
  KS.fbm = (x, y) => KS.noise2(x, y) * 0.6 + KS.noise2(x * 2.1 + 5.2, y * 2.1 - 1.3) * 0.3 + KS.noise2(x * 4.3, y * 4.3) * 0.1;

  // —— 颜色 ——
  KS.hex = function (h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  KS.rgba = function (h, a = 1) {
    const [r, g, b] = Array.isArray(h) ? h : KS.hex(h);
    return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  };
  KS.mix = function (h1, h2, u) {
    const a = Array.isArray(h1) ? h1 : KS.hex(h1);
    const b = Array.isArray(h2) ? h2 : KS.hex(h2);
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  };
  /** 沿多色渐变取色，stops 为颜色数组 */
  KS.ramp = function (stops, u) {
    u = clamp(u) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(u));
    return KS.mix(stops[i], stops[i + 1], u - i);
  };

  // —— 预渲染发光贴图（比 shadowBlur 快得多）——
  const glowCache = new Map();
  KS.glowSprite = function (color, size = 128) {
    const key = color + size;
    if (glowCache.has(key)) return glowCache.get(key);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, KS.rgba(color, 1));
    grd.addColorStop(0.18, KS.rgba(color, 0.55));
    grd.addColorStop(0.45, KS.rgba(color, 0.16));
    grd.addColorStop(1, KS.rgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    glowCache.set(key, c);
    return c;
  };
  KS.glow = function (ctx, x, y, r, color, alpha = 1) {
    if (alpha <= 0.002 || r <= 0.1) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(KS.glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };

  // —— 形状 ——
  KS.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  KS.circle = function (ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, KS.TAU);
  };
  /** 柔和卡片：白底 + 投影 */
  KS.card = function (ctx, x, y, w, h, r, opt = {}) {
    ctx.save();
    ctx.shadowColor = opt.shadow || "rgba(15,58,52,0.16)";
    ctx.shadowBlur = opt.blur ?? 48;
    ctx.shadowOffsetY = opt.offsetY ?? 18;
    KS.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = opt.fill || "#ffffff";
    ctx.fill();
    ctx.restore();
    if (opt.stroke) {
      KS.roundRect(ctx, x, y, w, h, r);
      ctx.strokeStyle = opt.stroke;
      ctx.lineWidth = opt.lineWidth || 1.5;
      ctx.stroke();
    }
  };

  // —— 三次贝塞尔 ——
  KS.bez = function (p0, p1, p2, p3, u) {
    const v = 1 - u;
    return [
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
    ];
  };
  /** Catmull-Rom 样条：在点列上平滑取样 */
  KS.spline = function (pts, u) {
    const n = pts.length - 1;
    const f = clamp(u) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const s = f - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    const s2 = s * s, s3 = s2 * s;
    const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * s2 + (-a + 3 * b - 3 * c2 + d) * s3);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  };

  /**
   * 丝带：沿中心线绘制会扭转的有机色带。
   * center(s) -> [x,y]；width(s)；twist(s) -> 角度；colors 正面渐变；back 背面渐变
   */
  KS.ribbon = function (ctx, opt) {
    const N = opt.segments || 140;
    const s0 = opt.from ?? 0, s1 = opt.to ?? 1;
    if (s1 - s0 <= 0.001) return;
    const L = [], R = [], F = [];
    let prev = opt.center(s0);
    for (let i = 0; i <= N; i++) {
      const s = lerp(s0, s1, i / N);
      const p = opt.center(s);
      const q = opt.center(Math.min(1, s + 0.002));
      let dx = q[0] - p[0], dy = q[1] - p[1];
      if (Math.abs(dx) + Math.abs(dy) < 1e-6) { dx = p[0] - prev[0]; dy = p[1] - prev[1]; }
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const tw = Math.cos(opt.twist ? opt.twist(s) : 0);
      const w = opt.width(s) * tw;
      L.push([p[0] + nx * w, p[1] + ny * w]);
      R.push([p[0] - nx * w, p[1] - ny * w]);
      F.push(tw);
      prev = p;
    }
    const alpha = opt.alpha ?? 1;
    let target = ctx;
    let off = null;
    if (alpha < 0.995) {
      off = KS._ribOff || (KS._ribOff = Object.assign(document.createElement("canvas"), { width: KS.W, height: KS.H }));
      target = off.getContext("2d");
      target.clearRect(0, 0, KS.W, KS.H);
    }
    target.save();
    target.lineJoin = "round";
    for (let i = 0; i < N; i++) {
      const s = i / N;
      const face = (F[i] + F[i + 1]) / 2;
      const front = face >= 0;
      const shade = Math.abs(face);
      const base = KS.ramp(front ? opt.colors : opt.back || opt.colors, s);
      const lit = front ? KS.mix(base, [255, 255, 255], (1 - shade) * 0.35 + (opt.sheen ? opt.sheen(s) : 0)) : KS.mix(base, [8, 30, 34], (1 - shade) * 0.25 + 0.15);
      const col = KS.rgba(lit, 1);
      target.beginPath();
      target.moveTo(L[i][0], L[i][1]);
      target.lineTo(L[i + 1][0], L[i + 1][1]);
      target.lineTo(R[i + 1][0], R[i + 1][1]);
      target.lineTo(R[i][0], R[i][1]);
      target.closePath();
      target.fillStyle = col;
      target.strokeStyle = col;
      target.lineWidth = 1.2;
      target.fill();
      target.stroke();
    }
    // 内部流线
    if (opt.lines) {
      target.lineWidth = opt.lineWidth || 1.1;
      for (let k = 0; k < opt.lines; k++) {
        const offK = (k + 1) / (opt.lines + 1) * 2 - 1;
        target.beginPath();
        for (let i = 0; i <= N; i++) {
          const x = lerp(R[i][0], L[i][0], (offK + 1) / 2);
          const y = lerp(R[i][1], L[i][1], (offK + 1) / 2);
          i ? target.lineTo(x, y) : target.moveTo(x, y);
        }
        target.strokeStyle = opt.lineColor || "rgba(255,255,255,0.28)";
        target.stroke();
      }
    }
    target.restore();
    if (off) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }
  };

  /** 沿路径绘制线（可部分绘制） */
  KS.strokePath = function (ctx, fn, from, to, steps = 120) {
    if (to - from <= 0.0005) return;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = fn(lerp(from, to, i / steps));
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  };

  // —— 文字 ——
  KS.font = (size, weight = 600, family = KS.FONT_SANS) => `${weight} ${size}px ${family}`;

  /**
   * 逐字显现：每个字从下方浮起、由模糊变清晰。
   * opt: {x,y,size,weight,family,color,align,t,start,stagger,dur,spacing,gradient}
   */
  KS.revealText = function (ctx, text, opt) {
    const chars = Array.from(text);
    ctx.save();
    ctx.font = KS.font(opt.size, opt.weight ?? 700, opt.family || KS.FONT_SANS);
    ctx.textBaseline = "alphabetic";
    const spacing = opt.spacing ?? 0;
    const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let x = opt.align === "left" ? opt.x : opt.align === "right" ? opt.x - total : opt.x - total / 2;
    const stagger = opt.stagger ?? 0.04, dur = opt.dur ?? 0.6;
    const outA = opt.out ?? 1;
    let grad = null;
    if (opt.gradient) {
      grad = ctx.createLinearGradient(x, opt.y - opt.size, x + total, opt.y);
      opt.gradient.forEach((c, k) => grad.addColorStop(k / (opt.gradient.length - 1), c));
    }
    for (let i = 0; i < chars.length; i++) {
      const u = prog(opt.t, opt.start + i * stagger, opt.start + i * stagger + dur);
      const e = E.outCubic(u);
      if (u > 0) {
        const rise = (1 - e) * (opt.rise ?? opt.size * 0.45);
        const blur = (1 - e) * (opt.blur ?? 10);
        ctx.globalAlpha = e * outA;
        if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        if (grad) ctx.fillStyle = grad;
        else ctx.fillStyle = typeof opt.color === "function" ? opt.color(i) : opt.color || KS.C.ink;
        ctx.fillText(chars[i], x, opt.y + rise);
        ctx.filter = "none";
      }
      x += widths[i];
    }
    ctx.restore();
    return total;
  };

  KS.text = function (ctx, text, x, y, opt = {}) {
    ctx.save();
    ctx.font = KS.font(opt.size || 24, opt.weight ?? 500, opt.family || KS.FONT_SANS);
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = opt.baseline || "alphabetic";
    ctx.globalAlpha = opt.alpha ?? 1;
    if (opt.spacing) ctx.letterSpacing = opt.spacing + "px";
    ctx.fillStyle = opt.color || KS.C.ink;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  KS.measure = function (ctx, text, size, weight = 600, family = KS.FONT_SANS) {
    ctx.save();
    ctx.font = KS.font(size, weight, family);
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
  };

  // —— 品牌 K 字标（路径直接取自 frontend/src/components/BrandLogo.tsx，viewBox 0..100）——
  KS.LOGO = {
    tile: new Path2D("M29 3 H71 A26 26 0 0 1 97 29 V71 A26 26 0 0 1 71 97 H29 A26 26 0 0 1 3 71 V29 A26 26 0 0 1 29 3 Z"),
    spine: new Path2D("M21 23.5 C21 19.2 24.4 16 28.8 16 C31.6 16 33.4 18 33.4 20.8 L33.4 79.2 C33.4 82 31.6 84 28.8 84 C24.4 84 21 80.8 21 76.5 Z"),
    upper: new Path2D("M36.8 47.4 L50.8 17.8 C52.6 14 57.6 13.1 60.8 16 L86.6 43 C89.3 45.8 87.3 49.4 83.2 49.4 L38.6 49.4 C37 49.4 36.2 48.7 36.8 47.4 Z"),
    lower: new Path2D("M36.8 52.6 L50.8 82.2 C52.6 86 57.6 86.9 60.8 84 L86.6 57 C89.3 54.2 87.3 50.6 83.2 50.6 L38.6 50.6 C37 50.6 36.2 51.3 36.8 52.6 Z"),
    heart: new Path2D("M37.8 50 L59.5 31 L85.5 50 L59.5 69 Z"),
    star: new Path2D("M59.5 39.5 Q59.5 50 70 50 Q59.5 50 59.5 60.5 Q59.5 50 49 50 Q59.5 50 59.5 39.5 Z"),
  };

  /**
   * 绘制 K 字标。p 为各部件的进度（0..1），用于组装动画；全为 1 即静态字标。
   */
  KS.drawLogo = function (ctx, cx, cy, size, p = {}) {
    const P = Object.assign({ tile: 1, spine: 1, upper: 1, lower: 1, heart: 1, star: 1, alpha: 1, shine: -1 }, p);
    const s = size / 100;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(s, s);
    ctx.globalAlpha = P.alpha;
    const lg = (x1, y1, x2, y2, stops) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      return g;
    };
    // 瓷白底板
    if (P.tile > 0) {
      ctx.save();
      ctx.globalAlpha = P.alpha * E.outCubic(P.tile);
      ctx.translate(50, 50);
      const sc = lerp(0.82, 1, E.outBack(P.tile));
      ctx.scale(sc, sc);
      ctx.translate(-50, -50);
      ctx.shadowColor = "rgba(15,58,52,0.22)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = lg(6, 6, 94, 94, [[0, "#ffffff"], [0.52, "#f3fbf9"], [1, "#faf4ff"]]);
      ctx.fill(KS.LOGO.tile);
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(16,168,148,0.28)";
      ctx.lineWidth = 2.2;
      ctx.stroke(KS.LOGO.tile);
      ctx.restore();
    }
    // 立柱：自下而上生长
    if (P.spine > 0) {
      ctx.save();
      const u = E.outCubic(P.spine);
      ctx.beginPath();
      ctx.rect(0, lerp(86, 14, u), 100, 100);
      ctx.clip();
      ctx.fillStyle = lg(20, 15, 36, 85, [[0, "#0f3c42"], [0.55, "#146368"], [1, "#1a827d"]]);
      ctx.fill(KS.LOGO.spine);
      ctx.strokeStyle = "rgba(126,250,227,0.45)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(24.8, 22.5);
      ctx.lineTo(24.8, 77.5);
      ctx.stroke();
      ctx.restore();
    }
    const part = (prog0, path, grad, fromX, fromY, rot) => {
      if (prog0 <= 0) return;
      const u = E.outBack(prog0, 1.2);
      ctx.save();
      ctx.globalAlpha = P.alpha * clamp(prog0 * 2.2);
      ctx.translate(lerp(fromX, 0, u), lerp(fromY, 0, u));
      ctx.translate(37, 50);
      ctx.rotate(lerp(rot, 0, u));
      ctx.translate(-37, -50);
      ctx.fillStyle = grad;
      ctx.fill(path);
      ctx.restore();
    };
    part(P.upper, KS.LOGO.upper, lg(36, 14, 88, 52, [[0, "#35ecc6"], [0.52, "#10b8a0"], [1, "#1e8ae0"]]), 30, -26, -0.5);
    part(P.lower, KS.LOGO.lower, lg(36, 50, 88, 84, [[0, "#269be8"], [0.55, "#4f6ef2"], [1, "#7b5ae6"]]), 30, 26, 0.5);
    if (P.heart > 0) {
      ctx.save();
      ctx.globalAlpha = P.alpha * clamp(P.heart * 1.5);
      ctx.translate(61.5, 50);
      const k = E.outBack(P.heart, 2);
      ctx.scale(k, k);
      ctx.translate(-61.5, -50);
      ctx.fillStyle = lg(37, 32, 84, 66, [[0, "rgba(255,255,255,0.86)"], [0.44, "rgba(255,210,138,0.72)"], [0.76, "rgba(255,154,123,0.44)"], [1, "rgba(146,247,229,0.28)"]]);
      ctx.fill(KS.LOGO.heart);
      ctx.strokeStyle = "rgba(255,255,255,0.88)";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(39, 50);
      ctx.lineTo(lerp(39, 84.5, P.heart), 50);
      ctx.stroke();
      ctx.restore();
    }
    if (P.star > 0) {
      ctx.save();
      ctx.globalAlpha = P.alpha;
      ctx.translate(59.5, 50);
      const k = E.outElastic(P.star);
      ctx.rotate((1 - clamp(P.star * 1.4)) * Math.PI);
      ctx.scale(k, k);
      ctx.translate(-59.5, -50);
      ctx.fillStyle = "#ffffff";
      ctx.fill(KS.LOGO.star);
      ctx.fillStyle = "#f09c38";
      KS.circle(ctx, 59.5, 50, 2.3);
      ctx.fill();
      ctx.restore();
    }
    // 掠过的高光
    if (P.shine > 0 && P.shine < 1) {
      ctx.save();
      ctx.clip(KS.LOGO.tile);
      const x = lerp(-60, 160, P.shine);
      const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.75)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.translate(50, 50);
      ctx.rotate(0.35);
      ctx.translate(-50, -50);
      ctx.fillRect(-100, -100, 300, 300);
      ctx.restore();
    }
    ctx.restore();
  };

  /** 四芒星闪光 */
  KS.sparkle = function (ctx, x, y, r, color = "#ffffff", alpha = 1, rot = 0) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();
    ctx.restore();
  };

  /** 骰子 */
  KS.PIPS = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  KS.drawDie = function (ctx, x, y, size, value, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(opt.rot || 0);
    const h = size / 2;
    if (opt.shadow !== false) {
      ctx.fillStyle = "rgba(19,66,59,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, h * 1.25, h * 0.95, h * 0.2, 0, 0, KS.TAU);
      ctx.fill();
    }
    KS.roundRect(ctx, -h, -h, size, size, size * 0.22);
    const g = ctx.createLinearGradient(-h, -h, h, h);
    g.addColorStop(0, opt.fill || "#ffffff");
    g.addColorStop(1, opt.fill2 || "#eef6f2");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeStyle = opt.stroke || "#cfe3db";
    ctx.stroke();
    ctx.fillStyle = opt.pip || KS.C.ink;
    for (const [px, py] of KS.PIPS[value] || []) {
      KS.circle(ctx, px * size * 0.25, py * size * 0.25, size * 0.085);
      ctx.fill();
    }
    ctx.restore();
  };

  /** 鼠标指针 */
  KS.cursor = function (ctx, x, y, scale = 1, press = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (1 - press * 0.12), scale * (1 - press * 0.12));
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(8, 23);
    ctx.lineTo(13.5, 35);
    ctx.lineTo(18, 33);
    ctx.lineTo(12.5, 21.5);
    ctx.lineTo(23, 21.5);
    ctx.closePath();
    ctx.fillStyle = KS.C.ink;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  /** 点击波纹 */
  KS.ripple = function (ctx, x, y, t, start, color = KS.C.accent) {
    const u = prog(t, start, start + 0.7);
    if (u <= 0 || u >= 1) return;
    ctx.save();
    ctx.strokeStyle = KS.rgba(color, (1 - u) * 0.8);
    ctx.lineWidth = 3 * (1 - u) + 1;
    KS.circle(ctx, x, y, 8 + E.outCubic(u) * 46);
    ctx.stroke();
    ctx.restore();
  };
})();
