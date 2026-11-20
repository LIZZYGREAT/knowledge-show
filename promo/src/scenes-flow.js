/*
 * 第四幕：知识探索（17.5 – 25.6s）
 * 第五幕：脚本编排（25.3 – 31.7s）
 */
(function () {
  "use strict";
  const KS = window.KS;
  const { C, W, H, E, ease, life, prog, lerp, clamp, TAU } = KS;

  /** 章节标题：编号胶囊 + 衬线大标题 */
  KS.sectionHeader = function (ctx, t, a, b, num, kicker, title, opt = {}) {
    const al = life(t, a, b, 0.5, 0.4);
    if (al <= 0) return;
    const y = opt.y ?? 128;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.font = KS.font(22, 700, KS.FONT_MONO);
    const label = `${num}`;
    ctx.font = KS.font(24, 700);
    const kw = ctx.measureText(kicker).width;
    const pw = 54 + 14 + kw;
    const px = 960 - pw / 2;
    const enter = E.outCubic(prog(t, a, a + 0.6));
    ctx.translate(0, (1 - enter) * 16);
    KS.roundRect(ctx, px - 6, y - 30, pw + 30, 44, 22);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(15,150,125,0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    KS.roundRect(ctx, px, y - 25, 54, 34, 17);
    ctx.fillStyle = C.accent;
    ctx.fill();
    KS.text(ctx, label, px + 27, y - 1, { size: 20, weight: 800, color: "#fff", align: "center", family: KS.FONT_MONO });
    KS.text(ctx, kicker, px + 68, y, { size: 24, weight: 700, color: C.accentStrong, spacing: 2 });
    ctx.restore();
    KS.revealText(ctx, title, { x: 960, y: y + 76, size: opt.size || 56, weight: 800, family: KS.FONT_SERIF, t, start: a + 0.15, stagger: 0.05, dur: 0.6, color: C.ink, out: 1 - ease(t, b - 0.4, b, E.inCubic), spacing: 3 });
  };

  /** 底部章节导航条 */
  const CHAPTERS = [["知识探索", 17.5], ["脚本编排", 25.5], ["动画呈现", 31.5], ["工作台微调", 45.0], ["一键导出", 51.5]];
  KS.chapterBar = function (ctx, t) {
    const a = life(t, 17.6, 55.3, 0.6, 0.4);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a * 0.95;
    ctx.font = KS.font(19, 600);
    const gap = 54;
    const widths = CHAPTERS.map(([s]) => ctx.measureText(s).width + 30);
    const total = widths.reduce((x, y) => x + y, 0) + gap * (CHAPTERS.length - 1);
    let x = 960 - total / 2;
    const y = 1044;
    CHAPTERS.forEach(([label, st], i) => {
      const en = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1][1] : 55.5;
      const active = t >= st && t < en;
      const done = t >= en;
      const w = widths[i];
      ctx.fillStyle = active ? C.accent : done ? C.accentBright : "rgba(18,62,56,0.22)";
      KS.circle(ctx, x + 8, y - 6, active ? 7 : 5);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = KS.rgba(C.accent, 0.3 + 0.2 * Math.sin(t * 5));
        ctx.lineWidth = 2;
        KS.circle(ctx, x + 8, y - 6, 12);
        ctx.stroke();
      }
      ctx.fillStyle = active ? C.ink : done ? C.inkBody : C.mutedDim;
      ctx.font = KS.font(19, active ? 800 : 600);
      ctx.fillText(label, x + 24, y);
      if (i < CHAPTERS.length - 1) {
        const x0 = x + w + 6, x1 = x + w + gap - 10;
        ctx.strokeStyle = "rgba(18,62,56,0.15)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y - 6); ctx.lineTo(x1, y - 6); ctx.stroke();
        const u = clamp((t - st) / (en - st));
        if (u > 0) {
          ctx.strokeStyle = C.accentBright;
          ctx.beginPath(); ctx.moveTo(x0, y - 6); ctx.lineTo(lerp(x0, x1, u), y - 6); ctx.stroke();
        }
      }
      x += w + gap;
    });
    ctx.restore();
  };

  // ————————————————————————————————————————————————————————————
  // 第四幕：知识探索
  // ————————————————————————————————————————————————————————————
  const QUESTION = "为什么两个骰子最容易掷出 7？";
  const MODES = ["创意优先", "直观演示", "干货精讲", "故事悬念"];
  const M = [960, 660];
  const PARTS = [];
  (function () {
    const r = KS.rng(321);
    for (let i = 0; i < 56; i++) {
      const a = r() * TAU;
      const b = (i / 56) * TAU * 3.1 + r() * 0.6;
      const rad = 130 + Math.pow(r(), 0.8) * 300;
      PARTS.push({ a, b, rad, side: r() < 0.5 ? -1 : 1, delay: i * 0.042 + r() * 0.15, s: 2.5 + r() * 4, col: [C.accentBright, C.skyBright, C.warmBright, C.accent, C.violet][i % 5] });
    }
    PARTS.forEach((p, i) => {
      const tp = [Math.cos(p.b) * p.rad, Math.sin(p.b) * p.rad * 0.58];
      const ds = PARTS.map((q, j) => {
        if (j === i) return [j, 1e9];
        const tq = [Math.cos(q.b) * q.rad, Math.sin(q.b) * q.rad * 0.58];
        return [j, Math.hypot(tp[0] - tq[0], tp[1] - tq[1])];
      }).sort((x, y) => x[1] - y[1]);
      p.nb = [ds[0][0], ds[1][0]];
    });
  })();
  const partPos = (p, t) => {
    const t0 = 20.45 + p.delay;
    const u = E.inOutCubic(prog(t, t0, t0 + 1.35));
    const rot = (t - 20) * 0.07;
    const tgt = [M[0] + Math.cos(p.b + rot) * p.rad, M[1] + Math.sin(p.b + rot) * p.rad * 0.58];
    const src = [M[0] + Math.cos(p.a) * 1250, M[1] + Math.sin(p.a) * 800];
    const mid = [(src[0] + tgt[0]) / 2 + Math.sin(p.a) * 320 * p.side, (src[1] + tgt[1]) / 2 - Math.cos(p.a) * 320 * p.side];
    const v = 1 - u;
    return { x: v * v * src[0] + 2 * v * u * mid[0] + u * u * tgt[0], y: v * v * src[1] + 2 * v * u * mid[1] + u * u * tgt[1], arrived: u };
  };
  const BUBBLES = [
    { text: "正在了解这个主题", at: 20.65, dx: -500, dy: -70 },
    { text: "正在寻找有趣的切入角度", at: 21.65, dx: 520, dy: -110 },
    { text: "正在确认重要知识", at: 22.65, dx: -470, dy: 120 },
    { text: "知识方向已准备好", at: 23.65, dx: 500, dy: 90, done: true },
  ];
  KS.TAGS = ["36 种等可能组合", "和为 7 的组合有 6 种", "P(7) = 6/36 = 1/6"];
  KS.tagHome = (k) => [560 + k * 400, 930];

  KS.drawTag = function (ctx, x, y, text, a, sc = 1, glow = 0) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.font = KS.font(26, 700);
    const w = ctx.measureText(text).width + 120;
    if (glow > 0) KS.glow(ctx, 0, 0, w * 0.7, C.flowLight, glow * 0.5);
    KS.card(ctx, -w / 2, -32, w, 64, 32, { blur: 26, offsetY: 10, stroke: "rgba(15,150,125,0.28)" });
    ctx.fillStyle = C.accent;
    KS.circle(ctx, -w / 2 + 34, 0, 15);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 27, 1); ctx.lineTo(-w / 2 + 32, 6); ctx.lineTo(-w / 2 + 41, -5);
    ctx.stroke();
    KS.text(ctx, text, -w / 2 + 62, 9, { size: 26, weight: 700, color: C.ink });
    ctx.restore();
  };

  KS.scenes.push({
    id: "explore",
    start: 17.4,
    end: 25.7,
    draw(ctx, t) {
      KS.sectionHeader(ctx, t, 17.55, 25.5, "01", "知识探索", "一个问题，就够了。");
      const fade = 1 - ease(t, 25.0, 25.5, E.inCubic);

      // —— 知识星座 ——
      if (t > 20.3) {
        const pts = PARTS.map((p) => partPos(p, t));
        ctx.save();
        ctx.globalAlpha = fade;
        // 连线
        ctx.lineWidth = 1.3;
        PARTS.forEach((p, i) => {
          p.nb.forEach((j, k) => {
            if (j < i && PARTS[j].nb.includes(i)) return;
            const a = Math.min(pts[i].arrived, pts[j].arrived);
            if (a <= 0.6) return;
            ctx.strokeStyle = KS.rgba(C.accent, (a - 0.6) * 0.75);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
            if ((i + k) % 4 === 0) {
              const u = (t * 0.7 + i * 0.13) % 1;
              ctx.fillStyle = KS.rgba(C.warmBright, (a - 0.6) * 2);
              KS.circle(ctx, lerp(pts[i].x, pts[j].x, u), lerp(pts[i].y, pts[j].y, u), 2.4);
              ctx.fill();
            }
          });
        });
        // 主辐条
        PARTS.forEach((p, i) => {
          if (i % 7) return;
          const a = pts[i].arrived;
          if (a < 0.9) return;
          const g = ctx.createLinearGradient(M[0], M[1], pts[i].x, pts[i].y);
          g.addColorStop(0, KS.rgba(C.accentBright, 0.6 * (a - 0.9) * 10));
          g.addColorStop(1, KS.rgba(C.skyBright, 0));
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(M[0], M[1]);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        });
        // 粒子
        pts.forEach((q, i) => {
          const p = PARTS[i];
          if (q.arrived <= 0) return;
          const tail = partPos(p, t - 0.08);
          ctx.strokeStyle = KS.rgba(p.col, 0.35 * (1 - q.arrived));
          ctx.lineWidth = p.s;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.fillStyle = p.col;
          KS.circle(ctx, q.x, q.y, p.s * (0.8 + 0.25 * Math.sin(t * 3 + i)));
          ctx.fill();
          if (i % 6 === 0) {
            ctx.strokeStyle = KS.rgba(p.col, 0.35);
            ctx.lineWidth = 1.2;
            KS.circle(ctx, q.x, q.y, p.s * 3);
            ctx.stroke();
          }
        });
        // 主节点
        const ma = ease(t, 20.35, 20.9, E.outBack);
        if (ma > 0) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 4);
          KS.glow(ctx, M[0], M[1], 170 + pulse * 30, C.flowLight, 0.55 * ma);
          for (let k = 0; k < 2; k++) {
            const u = ((t - 20.4) * 0.55 + k * 0.5) % 1;
            ctx.strokeStyle = KS.rgba(C.accentBright, (1 - u) * 0.5);
            ctx.lineWidth = 2;
            KS.circle(ctx, M[0], M[1], 52 + u * 120);
            ctx.stroke();
          }
          ctx.save();
          ctx.translate(M[0], M[1]);
          ctx.scale(ma, ma);
          ctx.rotate(t * 0.8);
          ctx.setLineDash([10, 9]);
          ctx.strokeStyle = KS.rgba(C.accent, 0.7);
          ctx.lineWidth = 2.5;
          KS.circle(ctx, 0, 0, 72);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.rotate(-t * 0.8);
          const g = ctx.createRadialGradient(-14, -16, 4, 0, 0, 50);
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.35, C.flowLight);
          g.addColorStop(1, C.accentStrong);
          ctx.fillStyle = g;
          KS.circle(ctx, 0, 0, 50);
          ctx.fill();
          const done = ease(t, 23.7, 24.1);
          ctx.globalAlpha = 1 - done;
          KS.text(ctx, "?", 0, 18, { size: 54, weight: 900, color: "#fff", align: "center", family: KS.FONT_SERIF });
          ctx.globalAlpha = done;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 7;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-5, 15); ctx.lineTo(20, -12); ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        // 事件气泡
        BUBBLES.forEach((b, i) => {
          const end = b.done ? 25.3 : b.at + 2.1;
          const a = life(t, b.at, end, 0.35, 0.45) * fade;
          if (a <= 0) return;
          const pop = E.outBack(prog(t, b.at, b.at + 0.5), 1.8);
          const drift = (t - b.at) * 8;
          const x = M[0] + b.dx * lerp(0.4, 1, pop), y = M[1] + b.dy * lerp(0.4, 1, pop) - drift;
          // 连接曲线
          ctx.save();
          ctx.globalAlpha = a * 0.7;
          ctx.strokeStyle = KS.rgba(C.accent, 0.45);
          ctx.setLineDash([4, 7]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(M[0], M[1]);
          ctx.quadraticCurveTo(lerp(M[0], x, 0.5), y + (b.dy > 0 ? -60 : 60) * 0, x - Math.sign(b.dx) * 140, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(x, y);
          const sc = lerp(0.6, 1, pop) * (1 - (1 - a) * 0.15);
          ctx.scale(sc, sc);
          ctx.font = KS.font(27, 600);
          const w = ctx.measureText(b.text).width + 86;
          KS.card(ctx, -w / 2, -34, w, 68, 34, { blur: 30, offsetY: 12, stroke: b.done ? "rgba(15,150,125,0.45)" : "rgba(18,62,56,0.08)", fill: b.done ? "#effbf7" : "#fff" });
          ctx.fillStyle = b.done ? C.accent : [C.skyBright, C.warmBright, C.violet][i % 3];
          KS.circle(ctx, -w / 2 + 34, 0, 8);
          ctx.fill();
          if (!b.done) {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.globalAlpha = a * (0.5 - 0.5 * Math.sin(t * 6));
            ctx.lineWidth = 2;
            KS.circle(ctx, -w / 2 + 34, 0, 14);
            ctx.stroke();
            ctx.globalAlpha = a;
          }
          KS.text(ctx, b.text, -w / 2 + 56, 10, { size: 27, weight: 600, color: b.done ? C.accentStrong : C.inkBody });
          ctx.restore();
        });
      }

      // —— 可靠知识标签 ——
      if (t < 25.35) {
        KS.TAGS.forEach((txt, k) => {
          const at = 23.35 + k * 0.25;
          const a = ease(t, at, at + 0.4, E.outCubic);
          const [x, y] = KS.tagHome(k);
          KS.drawTag(ctx, x, y + (1 - a) * 30, txt, a, lerp(0.8, 1, E.outBack(prog(t, at, at + 0.5))), life(t, at, at + 1.2, 0.2, 0.8));
        });
      }

      // —— 输入卡片 ——
      const cardA = ease(t, 17.65, 18.15, E.outCubic) * (1 - ease(t, 24.6, 25.2, E.inCubic));
      if (cardA > 0) {
        const up = ease(t, 20.2, 20.85, E.inOutCubic);
        const cy = lerp(372, 300, up);
        const sc = lerp(lerp(0.94, 1, cardA), 0.82, up);
        ctx.save();
        ctx.globalAlpha = cardA;
        ctx.translate(960, cy);
        ctx.scale(sc, sc);
        // 外发光边
        const glowA = 0.5 + 0.5 * Math.sin(t * 2.5);
        KS.roundRect(ctx, -556, -66, 1112, 132, 66);
        ctx.strokeStyle = KS.rgba(C.accentBright, 0.18 + glowA * 0.15);
        ctx.lineWidth = 8;
        ctx.stroke();
        KS.card(ctx, -550, -60, 1100, 120, 60, { blur: 50, offsetY: 20, stroke: "rgba(15,150,125,0.25)" });
        KS.sparkle(ctx, -490, 0, 20, C.warmBright, 1, t * 0.8);
        const typed = Math.floor(clamp((t - 18.0) / 0.11, 0, QUESTION.length + 0.01));
        if (typed <= 0) {
          KS.text(ctx, "输入一个你好奇的问题……", -450, 14, { size: 38, weight: 500, color: C.mutedDim });
        } else {
          const s = Array.from(QUESTION).slice(0, typed).join("");
          KS.text(ctx, s, -450, 14, { size: 40, weight: 700, color: C.ink });
          if (Math.floor(t * 2.6) % 2 === 0 || t < 19.8) {
            const w = KS.measure(ctx, s, 40, 700);
            ctx.fillStyle = C.accent;
            ctx.fillRect(-446 + w, -22, 3.5, 46);
          }
        }
        // 按钮
        const press = Math.max(0, 1 - Math.abs(t - 20.02) / 0.12);
        ctx.save();
        ctx.translate(345 + 95, 0);
        ctx.scale(1 - press * 0.06, 1 - press * 0.06);
        const bg = ctx.createLinearGradient(-95, -44, 95, 44);
        bg.addColorStop(0, C.accentBright);
        bg.addColorStop(1, C.accentStrong);
        KS.roundRect(ctx, -95, -44, 190, 88, 44);
        ctx.fillStyle = bg;
        ctx.shadowColor = "rgba(15,150,125,0.45)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.fill();
        ctx.shadowColor = "transparent";
        KS.text(ctx, "开始创作 ↗", 0, 10, { size: 29, weight: 800, color: "#fff", align: "center" });
        ctx.restore();
        KS.ripple(ctx, 440, 0, t, 20.0, "#ffffff");
        ctx.restore();

        // 模式选择
        const chipsA = cardA * (1 - ease(t, 20.05, 20.45, E.inCubic));
        if (chipsA > 0) {
          ctx.save();
          ctx.globalAlpha = chipsA;
          KS.text(ctx, "创作模式", 960 - 470, 507, { size: 24, weight: 700, color: C.muted });
          MODES.forEach((m, i) => {
            const at = 18.35 + i * 0.1;
            const a = E.outBack(prog(t, at, at + 0.45));
            if (a <= 0) return;
            const x = 960 - 340 + i * 184, y = 497;
            const sel = i === 1 ? ease(t, 19.25, 19.45) : 0;
            ctx.save();
            ctx.translate(x + 82, y);
            ctx.scale(a, a);
            KS.roundRect(ctx, -82, -28, 164, 56, 28);
            ctx.fillStyle = sel > 0 ? KS.rgba(KS.mix("#ffffff", C.accent, sel), 1) : "#ffffff";
            ctx.fill();
            ctx.strokeStyle = sel > 0 ? C.accent : "rgba(18,62,56,0.14)";
            ctx.lineWidth = 2;
            ctx.stroke();
            KS.text(ctx, m, 0, 9, { size: 25, weight: 700, color: sel > 0.5 ? "#fff" : C.inkBody, align: "center" });
            ctx.restore();
            if (i === 1) KS.ripple(ctx, x + 82, y, t, 19.25);
          });
          ctx.restore();
        }
        // 光标
        const cA = life(t, 18.9, 20.45, 0.2, 0.3);
        if (cA > 0) {
          const p1 = [1500, 820], p2 = [960 - 340 + 184 + 82, 512], p3 = [960 + 445, 388];
          const u1 = ease(t, 18.9, 19.2), u2 = ease(t, 19.5, 19.9);
          let x = lerp(p1[0], p2[0], u1), y = lerp(p1[1], p2[1], u1);
          x = lerp(x, p3[0], u2); y = lerp(y, p3[1], u2);
          ctx.save();
          ctx.globalAlpha = cA;
          KS.cursor(ctx, x, y, 1.3, Math.max(0, 1 - Math.abs(t - 20.02) / 0.1) + Math.max(0, 1 - Math.abs(t - 19.25) / 0.1));
          ctx.restore();
        }
      }
    },
  });

  // ————————————————————————————————————————————————————————————
  // 第五幕：脚本编排
  // ————————————————————————————————————————————————————————————
  const X0 = 210, X1 = 1710;
  const curve = (s) => [lerp(X0, X1, s), 650 + 46 * Math.sin(s * TAU * 1.0 + 0.6)];
  const MARKS = [0.06, 0.37, 0.66, 0.94];
  const SPANS = [[0, 0.22], [0.22, 0.51], [0.51, 0.8], [0.8, 1]];
  const SCENE_COLS = [C.warmBright, C.accentBright, C.skyBright, C.violet];
  const CARDS = [
    { title: "抛出问题", time: "0:00" },
    { title: "列出 36 种组合", time: "0:32" },
    { title: "堆成钟形分布", time: "1:08" },
    { title: "揭晓 7 的秘密", time: "2:06" },
  ];
  const cardCenter = (k) => [clamp(curve(MARKS[k])[0], 300, 1620), 452];

  function miniArt(ctx, k, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    if (k === 0) {
      KS.drawDie(ctx, -38, 0, 46, 3, { rot: -0.2, shadow: false });
      KS.drawDie(ctx, 22, 4, 46, 4, { rot: 0.18, shadow: false });
      KS.text(ctx, "?", 72, 14, { size: 40, weight: 900, color: C.warm, family: KS.FONT_SERIF });
    } else if (k === 1) {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        ctx.fillStyle = i + j === 5 ? C.warmBright : KS.rgba(C.accentBright, 0.25 + ((i + j) / 10) * 0.5);
        KS.roundRect(ctx, -60 + j * 20, -30 + i * 10, 17, 8, 2);
        ctx.fill();
      }
    } else if (k === 2) {
      for (let s = 0; s < 11; s++) {
        const h = (6 - Math.abs(s - 5)) * 9;
        ctx.fillStyle = s === 5 ? C.warmBright : KS.rgba(C.skyBright, 0.65);
        KS.roundRect(ctx, -66 + s * 12, 28 - h, 9, h, 2);
        ctx.fill();
      }
    } else {
      KS.sparkle(ctx, -40, 0, 26, C.warmBright, 1, t);
      KS.text(ctx, "1/6", 0, 14, { size: 38, weight: 900, color: C.violet, family: KS.FONT_SERIF });
    }
    ctx.restore();
  }

  KS.scenes.push({
    id: "script",
    start: 25.3,
    end: 31.8,
    draw(ctx, t) {
      KS.sectionHeader(ctx, t, 25.55, 31.3, "02", "脚本编排", "主线先行，节奏有据。");
      const zoom = ease(t, 30.85, 31.65, E.inCubic);
      const sceneA = 1 - ease(t, 31.2, 31.65);
      ctx.save();
      if (zoom > 0) {
        const [zx, zy] = cardCenter(2);
        ctx.translate(zx, zy);
        ctx.scale(1 + zoom * 2.6, 1 + zoom * 2.6);
        ctx.translate(-zx, -zy);
      }
      ctx.globalAlpha = sceneA;

      // 时间曲线
      const draw = ease(t, 25.6, 26.6, E.inOutCubic);
      if (draw > 0) {
        ctx.save();
        ctx.lineCap = "round";
        const g = ctx.createLinearGradient(X0, 0, X1, 0);
        g.addColorStop(0, C.warmBright);
        g.addColorStop(0.35, C.accentBright);
        g.addColorStop(0.7, C.skyBright);
        g.addColorStop(1, C.violet);
        ctx.strokeStyle = "rgba(28,184,154,0.18)";
        ctx.lineWidth = 22;
        KS.strokePath(ctx, curve, 0, draw);
        ctx.strokeStyle = g;
        ctx.lineWidth = 7;
        KS.strokePath(ctx, curve, 0, draw);
        const head = curve(draw);
        if (draw < 1) KS.glow(ctx, head[0], head[1], 40, C.flowLight, 0.9);
        ctx.restore();
      }
      // 时间刻度
      const tickA = ease(t, 26.3, 26.9);
      if (tickA > 0) {
        ctx.save();
        ctx.globalAlpha = sceneA * tickA;
        for (let k = 0; k <= 11; k++) {
          const x = lerp(X0, X1, k / 11);
          ctx.fillStyle = "rgba(18,62,56,0.25)";
          ctx.fillRect(x - 1, 905, 2, k % 2 ? 8 : 14);
          if (k % 2 === 0) {
            const sec = k * 15;
            KS.text(ctx, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`, x, 945, { size: 18, color: C.mutedDim, align: "center", family: KS.FONT_MONO });
          }
        }
        ctx.restore();
      }
      // 轨道：画面 / 文字 / 事件
      const lanes = ["画面", "文字", "事件"];
      lanes.forEach((name, li) => {
        const y = 768 + li * 46;
        const la = ease(t, 26.6 + li * 0.12, 27.0 + li * 0.12);
        if (la <= 0) return;
        ctx.save();
        ctx.globalAlpha = sceneA * la;
        KS.text(ctx, name, X0 - 24, y + 8, { size: 20, weight: 700, color: C.muted, align: "right" });
        const reveal = ease(t, 26.7 + li * 0.15, 27.9 + li * 0.15, E.inOutCubic);
        ctx.beginPath();
        ctx.rect(X0 - 4, y - 30, (X1 - X0 + 8) * reveal, 60);
        ctx.clip();
        SPANS.forEach(([a, b], k) => {
          const xa = lerp(X0, X1, a) + 3, xb = lerp(X0, X1, b) - 3;
          if (li === 0) {
            const g = ctx.createLinearGradient(xa, 0, xb, 0);
            g.addColorStop(0, KS.rgba(SCENE_COLS[k], 0.85));
            g.addColorStop(1, KS.rgba(SCENE_COLS[k], 0.45));
            ctx.fillStyle = g;
            KS.roundRect(ctx, xa, y - 14, xb - xa, 28, 10);
            ctx.fill();
          } else if (li === 1) {
            const n = k === 1 || k === 2 ? 3 : 2;
            for (let q = 0; q < n; q++) {
              const w = (xb - xa) / n;
              ctx.fillStyle = "rgba(18,62,56,0.16)";
              KS.roundRect(ctx, xa + q * w + 4, y - 9, w * 0.72, 18, 9);
              ctx.fill();
            }
          } else {
            for (let q = 0; q < 3; q++) {
              const x = lerp(xa, xb, (q + 0.6) / 3.4);
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(Math.PI / 4);
              ctx.fillStyle = q === 1 ? SCENE_COLS[k] : "rgba(18,62,56,0.32)";
              ctx.fillRect(-7, -7, 14, 14);
              ctx.restore();
            }
          }
        });
        ctx.restore();
      });

      // 播放头
      const ph = ease(t, 27.9, 30.85, E.inOutQuad);
      const phA = ease(t, 27.75, 28.0) ;
      const phX = lerp(X0, X1, ph);

      // 场景标记 + 卡片
      CARDS.forEach((c, k) => {
        const m = curve(MARKS[k]);
        const at = 26.0 + k * 0.28;
        const a = E.outBack(prog(t, at, at + 0.5), 1.6);
        if (a <= 0) return;
        const active = phA > 0 ? clamp((phX - m[0] + 30) / 30) : 0;
        const pulse = phA > 0 ? Math.max(0, 1 - Math.abs(phX - m[0]) / 60) : 0;
        // 标记
        ctx.save();
        ctx.globalAlpha = sceneA;
        KS.glow(ctx, m[0], m[1], 50 + pulse * 50, SCENE_COLS[k], 0.4 * a + pulse * 0.5);
        ctx.fillStyle = "#fff";
        KS.circle(ctx, m[0], m[1], 22 * a * (1 + pulse * 0.25));
        ctx.fill();
        ctx.strokeStyle = SCENE_COLS[k];
        ctx.lineWidth = 5;
        ctx.stroke();
        KS.text(ctx, String(k + 1), m[0], m[1] + 8, { size: 22, weight: 900, color: C.ink, align: "center" });
        ctx.restore();
        // 卡片
        const [cx, cy0] = cardCenter(k);
        const cy = cy0 - active * 12;
        ctx.save();
        ctx.globalAlpha = sceneA * clamp(a);
        ctx.strokeStyle = KS.rgba(SCENE_COLS[k], 0.6);
        ctx.setLineDash([3, 7]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m[0], m[1] - 26); ctx.lineTo(cx, cy + 82); ctx.stroke();
        ctx.setLineDash([]);
        ctx.translate(cx, cy);
        ctx.scale(lerp(0.7, 1, a), lerp(0.7, 1, a));
        KS.card(ctx, -165, -82, 330, 164, 26, { blur: 34 + active * 20, offsetY: 14, stroke: active > 0.5 ? KS.rgba(SCENE_COLS[k], 0.9) : "rgba(18,62,56,0.08)", lineWidth: active > 0.5 ? 3 : 1.5 });
        KS.roundRect(ctx, -141, -60, 48, 28, 14);
        ctx.fillStyle = SCENE_COLS[k];
        ctx.fill();
        KS.text(ctx, "S" + (k + 1), -117, -39, { size: 18, weight: 900, color: "#fff", align: "center", family: KS.FONT_MONO });
        KS.text(ctx, c.time, 141, -39, { size: 18, weight: 600, color: C.mutedDim, align: "right", family: KS.FONT_MONO });
        KS.text(ctx, c.title, -141, 4, { size: 29, weight: 800, color: C.ink });
        miniArt(ctx, k, 0, 46, t);
        ctx.restore();
      });

      // 飞入卡片的知识标签
      if (t >= 25.35 && t < 26.7) {
        KS.TAGS.forEach((txt, k) => {
          const u = ease(t, 25.35 + k * 0.08, 26.25 + k * 0.08, E.inOutCubic);
          const [hx, hy] = KS.tagHome(k);
          const [tx, ty] = cardCenter(k + 1);
          const x = lerp(hx, tx, u), y = lerp(hy, ty, u) - Math.sin(u * Math.PI) * 120;
          KS.drawTag(ctx, x, y, txt, (1 - ease(t, 26.15 + k * 0.08, 26.5 + k * 0.08)) * sceneA, lerp(1, 0.7, u), 0.5);
        });
      }

      if (phA > 0 && ph < 1) {
        ctx.save();
        ctx.globalAlpha = sceneA * phA;
        const g = ctx.createLinearGradient(0, 330, 0, 920);
        g.addColorStop(0, KS.rgba(C.accent, 0));
        g.addColorStop(0.3, KS.rgba(C.accent, 0.8));
        g.addColorStop(1, KS.rgba(C.accent, 0.5));
        ctx.fillStyle = g;
        ctx.fillRect(phX - 1.5, 330, 3, 590);
        const hp = curve(ph);
        KS.glow(ctx, hp[0], hp[1], 60, C.flowLight, 1);
        ctx.fillStyle = "#fff";
        KS.circle(ctx, hp[0], hp[1], 10);
        ctx.fill();
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 4;
        ctx.stroke();
        KS.roundRect(ctx, phX - 40, 896, 80, 30, 15);
        ctx.fillStyle = C.accent;
        ctx.fill();
        const sec = Math.round(ph * 165);
        KS.text(ctx, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`, phX, 918, { size: 18, weight: 800, color: "#fff", align: "center", family: KS.FONT_MONO });
        ctx.restore();
      }
      ctx.restore();
    },
  });
})();
