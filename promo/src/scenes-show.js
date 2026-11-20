/*
 * 第六幕：动画呈现（31.4 – 45.2s）
 * 用项目首页剧场同款的三个经典知识主题，直观展示“对象真实演化，规律一眼看懂”：
 *   A. 概率直觉（31.5 – 39.5s）：两个骰子 → 6×6 组合矩阵 → 36 枚色块飞入钟形分布 → 7 独占 6/36
 *   B. 棱镜色散（39.5 – 42.2s）：白光入射晶莹三棱镜 → 不同波长色光按真实折射规律散开波动
 *   C. PN 结阀门（42.2 – 45.0s）：正向偏置耗尽层变窄载流子畅行 → 反向偏置耗尽层加宽电流截止
 */
(function () {
  "use strict";
  const KS = window.KS;
  const { C, W, H, E, ease, life, prog, lerp, clamp, TAU } = KS;

  // 舞台画框区域（留出顶部章节标题与底部章节导航）
  const BOX = { x: 180, y: 248, w: 1560, h: 710, r: 34 };

  const ACTS = [
    { id: "dice", num: "01", label: "概率直觉", q: "为什么两个骰子最容易掷出 7？", cap: "36 种等可能组合落成钟形分布，和为 7 独占 6 种。", start: 31.5, end: 39.5 },
    { id: "prism", num: "02", label: "棱镜色散", q: "白光穿过棱镜，为何散出彩虹？", cap: "不同波长的光在玻璃中速度不同，红光偏折小、紫光偏折大。", start: 39.5, end: 42.2 },
    { id: "pn", num: "03", label: "PN 结阀门", q: "同一个 PN 结，为何只让电流单向通过？", cap: "正接时耗尽层变窄载流子畅行，反接时耗尽层加宽电流截止。", start: 42.2, end: 45.0 },
  ];

  // ————————————————————————————————————————————————————————————
  // A. 骰子概率直觉（31.5 – 39.5s）
  // ————————————————————————————————————————————————————————————
  // 预计算 36 种组合的顺序（按列错开，飞入时视觉流畅）
  const COMBOS = [];
  (function () {
    const colCount = new Array(13).fill(0);
    // 交错遍历：先边缘再向中心聚拢，使最后几颗刚好落在 7 上形成高潮
    const order = [];
    for (let i = 1; i <= 6; i++) {
      for (let j = 1; j <= 6; j++) {
        order.push({ i, j, sum: i + j, dist: Math.abs(i + j - 7) });
      }
    }
    order.sort((a, b) => b.dist - a.dist || a.i - b.i);
    order.forEach((o, idx) => {
      const slot = colCount[o.sum]++;
      COMBOS.push({ ...o, idx, slot });
    });
  })();

  function drawDiceAct(ctx, t, alpha) {
    if (alpha <= 0.005) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    // 背景装饰同心虚线圆
    ctx.strokeStyle = "rgba(15,150,125,0.06)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 9]);
    KS.circle(ctx, 960, 620, 290);
    ctx.stroke();
    ctx.setLineDash([]);

    // 布局参数
    const matX = 290, matY = 468, cell = 56, gap = 7; // 左侧 6x6 矩阵（上下留出呼吸间距）
    const histX = 875, histY = 816, colW = 68, colGap = 6, blkH = 43, blkGap = 6; // 右侧 11 列直方图

    // 阶段 1：两枚骰子落下（32.4 – 33.4s）并从中央左移到矩阵上方（33.5 – 34.4s）
    const shift = ease(t, 33.55, 34.4, E.inOutCubic);
    const d1In = prog(t, 32.15, 32.72);
    const d2In = prog(t, 32.35, 32.92);
    const diceScale = lerp(1.15, 0.56, shift);
    const d1x = lerp(850, 396, shift), d1y = lerp(575, 370, shift);
    const d2x = lerp(1070, 502, shift), d2y = lerp(575, 370, shift);

    // 落地柔和光圈
    if (t > 32.5 && t < 33.9) {
      KS.ripple(ctx, 850, 610, t, 32.55, C.accentBright);
      KS.ripple(ctx, 1070, 610, t, 32.75, C.warmBright);
    }

    if (d1In > 0) {
      const b = E.outBack(d1In, 1.5);
      const drop = (1 - b) * -170;
      const rot = lerp(-0.65, -0.1, E.outCubic(d1In)) * (1 - shift * 0.5);
      KS.drawDie(ctx, d1x, d1y + drop, 128 * diceScale, 3, {
        rot,
        fill: "#fffdf8",
        fill2: "#f3ead9",
        stroke: "#dfc9a6",
        pip: C.ink,
      });
    }
    if (d2In > 0) {
      const b = E.outBack(d2In, 1.5);
      const drop = (1 - b) * -170;
      const rot = lerp(0.65, 0.12, E.outCubic(d2In)) * (1 - shift * 0.5);
      KS.drawDie(ctx, d2x, d2y + drop, 128 * diceScale, 4, {
        rot,
        fill: "#eafaf4",
        fill2: "#d3f2e8",
        stroke: "#6cc7b3",
        pip: C.accentStrong,
      });
    }

    // 骰子中间的 "+  = 7" 浮现
    const eqA = ease(t, 32.9, 33.35, E.outCubic);
    if (eqA > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * eqA;
      const midX = (d1x + d2x) / 2, midY = (d1y + d2y) / 2;
      KS.text(ctx, "+", midX, midY + 14 * diceScale, { size: 42 * diceScale, weight: 800, color: C.muted, align: "center" });
      const sumX = lerp(960, 646, shift), sumY = lerp(742, 384, shift);
      KS.roundRect(ctx, sumX - 96 * lerp(1, 0.78, shift), sumY - 40 * lerp(1, 0.78, shift), 192 * lerp(1, 0.78, shift), 58 * lerp(1, 0.78, shift), 29);
      ctx.fillStyle = "#fff5e5";
      ctx.fill();
      ctx.strokeStyle = "rgba(224,141,48,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
      KS.text(ctx, "3 + 4 = 7", sumX, sumY - 2 * lerp(1, 0.78, shift), { size: 32 * lerp(1, 0.8, shift), weight: 800, color: C.warm, align: "center", family: KS.FONT_MONO });
      ctx.restore();
    }

    // 阶段 2：左侧 6×6 组合矩阵展开（33.8 – 35.6s）
    const matA = ease(t, 33.8, 34.4, E.outCubic);
    if (matA > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * matA;
      // 矩阵底板
      KS.card(ctx, matX - 36, matY - 42, 6 * (cell + gap) + 64, 6 * (cell + gap) + 74, 24, {
        blur: 32,
        offsetY: 12,
        fill: "rgba(255,255,255,0.88)",
        stroke: "rgba(18,62,56,0.1)",
      });
      KS.text(ctx, "6 × 6 = 36 种等可能组合", matX + 3 * (cell + gap) - 4, matY - 14, {
        size: 20,
        weight: 700,
        color: C.muted,
        align: "center",
      });
      // 行列标号
      for (let n = 1; n <= 6; n++) {
        KS.text(ctx, String(n), matX + (n - 1) * (cell + gap) + cell / 2, matY + 14, { size: 15, weight: 700, color: C.mutedDim, align: "center", family: KS.FONT_MONO });
        KS.text(ctx, String(n), matX - 16, matY + 26 + (n - 1) * (cell + gap) + cell / 2 + 5, { size: 15, weight: 700, color: C.mutedDim, align: "center", family: KS.FONT_MONO });
      }
      // 36 个格子
      const diagWave = ease(t, 34.65, 35.45, E.inOutCubic);
      for (let i = 1; i <= 6; i++) {
        for (let j = 1; j <= 6; j++) {
          const sum = i + j;
          const pop = E.outBack(prog(t, 33.9 + (i + j - 2) * 0.045, 34.35 + (i + j - 2) * 0.045), 1.3);
          if (pop <= 0) continue;
          const cx = matX + (j - 1) * (cell + gap) + cell / 2;
          const cy = matY + 24 + (i - 1) * (cell + gap) + cell / 2;
          const is7 = sum === 7;
          const lit7 = is7 ? ease(t, 34.7 + (i - 1) * 0.08, 35.1 + (i - 1) * 0.08, E.outCubic) : 0;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(pop, pop);
          KS.roundRect(ctx, -cell / 2, -cell / 2, cell, cell, 12);
          if (is7 && lit7 > 0) {
            ctx.fillStyle = KS.rgba(KS.mix("#eaf7f3", C.warmBright, lit7), 0.95);
            ctx.fill();
            ctx.strokeStyle = KS.rgba(C.warm, 0.85 * lit7);
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else {
            ctx.fillStyle = (i + j) % 2 ? "#f1f8f5" : "#e7f3ef";
            ctx.fill();
            ctx.strokeStyle = "rgba(15,150,125,0.14)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          KS.text(ctx, String(sum), 0, 7, {
            size: is7 && lit7 > 0.5 ? 24 : 20,
            weight: is7 && lit7 > 0.5 ? 900 : 700,
            color: is7 && lit7 > 0.5 ? "#ffffff" : C.inkBody,
            align: "center",
            family: KS.FONT_MONO,
          });
          ctx.restore();
        }
      }
      // 对角线连接高光
      if (diagWave > 0 && t < 38.8) {
        const xA = matX + 5 * (cell + gap) + cell / 2, yA = matY + 24 + cell / 2;
        const xB = matX + cell / 2, yB = matY + 24 + 5 * (cell + gap) + cell / 2;
        ctx.strokeStyle = KS.rgba(C.warm, 0.45 * (1 - ease(t, 37.8, 38.6)));
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(lerp(xA, xB, diagWave), lerp(yA, yB, diagWave));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 阶段 3：右侧直方图基线 & 刻度（35.1s 起）
    const histA = ease(t, 35.0, 35.55, E.outCubic);
    if (histA > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * histA;
      const totalW = 11 * (colW + colGap) - colGap;
      // 底部基线
      ctx.strokeStyle = "rgba(18,62,56,0.2)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(histX - 14, histY + 8);
      ctx.lineTo(histX + totalW + 14, histY + 8);
      ctx.stroke();
      // 淡参考水平线
      for (let lv = 1; lv <= 6; lv++) {
        const ly = histY - lv * (blkH + blkGap) + blkGap / 2;
        ctx.strokeStyle = lv === 6 ? "rgba(224,141,48,0.22)" : "rgba(18,62,56,0.06)";
        ctx.lineWidth = 1;
        ctx.setLineDash(lv === 6 ? [6, 6] : []);
        ctx.beginPath();
        ctx.moveTo(histX - 10, ly);
        ctx.lineTo(histX + totalW + 10, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        KS.text(ctx, `${lv}/36`, histX - 20, ly + 5, { size: 14, weight: 600, color: lv === 6 ? C.warm : C.mutedDim, align: "right", family: KS.FONT_MONO });
      }
      // 柱底标签 2..12
      for (let s = 2; s <= 12; s++) {
        const cx = histX + (s - 2) * (colW + colGap) + colW / 2;
        const is7 = s === 7;
        const peak = is7 ? ease(t, 38.35, 38.85, E.outCubic) : 0;
        if (is7 && peak > 0) {
          KS.roundRect(ctx, cx - 22, histY + 18, 44, 32, 16);
          ctx.fillStyle = KS.rgba(C.warm, peak);
          ctx.fill();
        }
        KS.text(ctx, String(s), cx, histY + 41, {
          size: is7 ? 24 : 20,
          weight: is7 ? 900 : 700,
          color: is7 && peak > 0.5 ? "#ffffff" : C.inkBody,
          align: "center",
          family: KS.FONT_MONO,
        });
      }
      KS.text(ctx, "两枚骰子点数之和", histX + totalW / 2, histY + 76, { size: 19, weight: 600, color: C.muted, align: "center" });
      ctx.restore();
    }

    // 阶段 4：36 枚色块沿抛物线飞入柱状图（35.6 + idx * 0.07s，与配乐 36 声颗粒音精确同步）
    const peakGlow = ease(t, 38.45, 38.9, E.outCubic);
    COMBOS.forEach((c) => {
      const launch = 35.6 + c.idx * 0.07;
      const u = prog(t, launch, launch + 0.48);
      if (u <= 0) return;
      const e = E.inOutCubic(u);
      const sx = matX + (c.j - 1) * (cell + gap) + cell / 2;
      const sy = matY + 24 + (c.i - 1) * (cell + gap) + cell / 2;
      const tx = histX + (c.sum - 2) * (colW + colGap) + colW / 2;
      const ty = histY - c.slot * (blkH + blkGap) - blkH / 2;
      const arc = Math.sin(u * Math.PI) * -150;
      const x = lerp(sx, tx, e);
      const y = lerp(sy, ty, e) + arc;
      const w = lerp(cell * 0.85, colW - 4, e);
      const h = lerp(cell * 0.85, blkH, e);
      const is7 = c.sum === 7;
      const landBounce = u >= 1 ? 1 + Math.max(0, 1 - (t - (launch + 0.48)) / 0.18) * 0.08 : 1;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(landBounce, 2 - landBounce);
      if (is7 && peakGlow > 0) {
        KS.glow(ctx, 0, 0, 48, C.gold, 0.35 * peakGlow);
      }
      KS.roundRect(ctx, -w / 2, -h / 2, w, h, 10);
      if (is7) {
        const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        g.addColorStop(0, "#f7be59");
        g.addColorStop(1, "#e08d30");
        ctx.fillStyle = g;
      } else {
        const ratio = 1 - Math.abs(c.sum - 7) / 5;
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, KS.rgba(KS.mix("#69d8c3", "#269be8", ratio * 0.55), 0.92));
        g.addColorStop(1, KS.rgba(KS.mix("#0f967d", "#1e78c8", ratio * 0.55), 0.92));
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      KS.text(ctx, `${c.i}+${c.j}`, 0, 6, {
        size: 16,
        weight: 700,
        color: "#ffffff",
        align: "center",
        family: KS.FONT_MONO,
      });
      ctx.restore();
    });

    // 阶段 5：钟形包络线与 7 的峰值加冕（38.25 – 39.5s）
    const env = ease(t, 38.15, 38.75, E.outCubic);
    if (env > 0) {
      ctx.save();
      const bellPts = [];
      for (let s = 2; s <= 12; s++) {
        const cnt = 6 - Math.abs(s - 7);
        bellPts.push([histX + (s - 2) * (colW + colGap) + colW / 2, histY - cnt * (blkH + blkGap) - 18]);
      }
      ctx.strokeStyle = C.warm;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.setLineDash([8, 8]);
      KS.strokePath(ctx, (u) => KS.spline(bellPts, u), 0, env, 90);
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (peakGlow > 0) {
      const px = histX + 5 * (colW + colGap) + colW / 2;
      const py = histY - 6 * (blkH + blkGap) - 42;
      KS.glow(ctx, px, py + 12, 120, C.gold, 0.45 * peakGlow);
      KS.sparkle(ctx, px - 102, py - 24, 18 * peakGlow, C.warmBright, peakGlow, t * 1.8);
      KS.sparkle(ctx, px + 106, py - 10, 14 * peakGlow, C.accentBright, peakGlow, -t * 1.6);
      ctx.save();
      ctx.translate(px, py - 34 + (1 - peakGlow) * 16);
      ctx.globalAlpha = alpha * peakGlow;
      KS.card(ctx, -138, -28, 276, 56, 28, { blur: 24, offsetY: 8, fill: "#fff9ef", stroke: C.warm, lineWidth: 2 });
      KS.text(ctx, "★ 最高概率  6/36 = 1/6", 0, 8, { size: 21, weight: 800, color: C.warmDeep || "#b86c1c", align: "center" });
      ctx.restore();
    }
    ctx.restore();
  }

  // ————————————————————————————————————————————————————————————
  // B. 棱镜色散（39.5 – 42.2s）
  // ————————————————————————————————————————————————————————————
  const SPECTRUM = [
    { name: "红光 700nm", col: "#ff5c52", angle: 0.015, wl: 72, amp: 8.5 },
    { name: "橙光", col: "#f5973d", angle: 0.06, wl: 62, amp: 7.5 },
    { name: "黄光", col: "#f0c83c", angle: 0.105, wl: 54, amp: 7 },
    { name: "绿光", col: "#25c78b", angle: 0.15, wl: 47, amp: 6.5 },
    { name: "青光", col: "#22b8da", angle: 0.195, wl: 41, amp: 6 },
    { name: "蓝光", col: "#448eff", angle: 0.24, wl: 35, amp: 5.5 },
    { name: "紫光 400nm", col: "#9c78ff", angle: 0.285, wl: 30, amp: 5 },
  ];

  function drawPrismAct(ctx, t, alpha) {
    if (alpha <= 0.005) return;
    const lt = t - 39.5;
    ctx.save();
    ctx.globalAlpha = alpha;

    // 微暗光室底衬，让色散光谱更加惊艳
    const roomG = ctx.createRadialGradient(840, 600, 60, 960, 600, 820);
    roomG.addColorStop(0, "rgba(16,44,42,0.92)");
    roomG.addColorStop(1, "rgba(8,24,23,0.96)");
    ctx.fillStyle = roomG;
    ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);

    // 光学网格标尺
    ctx.strokeStyle = "rgba(120,230,205,0.06)";
    ctx.lineWidth = 1;
    for (let x = BOX.x + 80; x < BOX.x + BOX.w; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, BOX.y + 88); ctx.lineTo(x, BOX.y + BOX.h - 70); ctx.stroke();
    }
    for (let y = BOX.y + 120; y < BOX.y + BOX.h - 60; y += 80) {
      ctx.beginPath(); ctx.moveTo(BOX.x + 40, y); ctx.lineTo(BOX.x + BOX.w - 40, y); ctx.stroke();
    }

    // 棱镜顶点
    const apex = [760, 366], leftB = [565, 728], rightB = [955, 728];
    const hitL = [667, 538]; // 入射点（左斜边中点偏上）

    // 1. 入射白光束（lt: 0.15 -> 0.65）
    const beamIn = ease(lt, 0.12, 0.55, E.outCubic);
    const src = [220, 624];
    if (beamIn > 0) {
      const ex = lerp(src[0], hitL[0], beamIn), ey = lerp(src[1], hitL[1], beamIn);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      // 外柔光
      const g1 = ctx.createLinearGradient(src[0], src[1], hitL[0], hitL[1]);
      g1.addColorStop(0, "rgba(255,232,175,0.12)");
      g1.addColorStop(0.5, "rgba(255,244,210,0.5)");
      g1.addColorStop(1, "rgba(255,255,255,0.85)");
      ctx.strokeStyle = g1;
      ctx.lineWidth = 28;
      ctx.beginPath(); ctx.moveTo(src[0], src[1]); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(src[0], src[1]); ctx.lineTo(ex, ey); ctx.stroke();
      // 沿光束前进的光子微粒
      for (let k = 0; k < 5; k++) {
        const u = ((lt * 1.4 + k * 0.2) % 1) * beamIn;
        KS.glow(ctx, lerp(src[0], hitL[0], u), lerp(src[1], hitL[1], u), 18, "#fff5d6", 0.75);
      }
      ctx.restore();
      // 标签：复色白光
      KS.text(ctx, "复色白光", 315, 558, { size: 22, weight: 700, color: "#fff2d0", alpha: beamIn * 0.92 });
    }

    // 2. 玻璃内折射扇面 & 3. 右侧 7 道波动光谱（lt: 0.48 -> 1.35）
    const dispIn = ease(lt, 0.45, 0.85, E.outCubic);
    const waveOut = ease(lt, 0.65, 1.45, E.outCubic);

    if (dispIn > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      SPECTRUM.forEach((sp, i) => {
        // 棱镜右侧出射点沿右斜边向下递增
        const frac = lerp(0.45, 0.72, i / 6);
        const exitX = lerp(apex[0], rightB[0], frac);
        const exitY = lerp(apex[1], rightB[1], frac);
        // 内部折射段
        ctx.strokeStyle = KS.rgba(sp.col, 0.55 * dispIn);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(hitL[0], hitL[1]);
        ctx.lineTo(lerp(hitL[0], exitX, dispIn), lerp(hitL[1], exitY, dispIn));
        ctx.stroke();

        // 出射色散波动光线
        if (waveOut > 0) {
          const len = 710 * waveOut;
          const dx = Math.cos(sp.angle), dy = Math.sin(sp.angle);
          const nx = -dy, ny = dx;
          // 柔和色带
          const g = ctx.createLinearGradient(exitX, exitY, exitX + dx * 710, exitY + dy * 710);
          g.addColorStop(0, KS.rgba(sp.col, 0.88));
          g.addColorStop(0.75, KS.rgba(sp.col, 0.52));
          g.addColorStop(1, KS.rgba(sp.col, 0.05));
          ctx.strokeStyle = g;
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(exitX, exitY);
          ctx.lineTo(exitX + dx * len, exitY + dy * len);
          ctx.stroke();
          // 真实波长正弦波！红光波长长、紫光波长短
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = alpha * 0.75;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          const steps = 90;
          for (let s = 0; s <= steps; s++) {
            const d = (s / steps) * len;
            const envW = Math.min(1, d / 40) * Math.min(1, (710 - d) / 80);
            const w = Math.sin((d / sp.wl) * TAU - lt * 12) * sp.amp * envW;
            const px = exitX + dx * d + nx * w;
            const py = exitY + dy * d + ny * w;
            s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
          ctx.globalAlpha = alpha;
          // 右端波长说明
          if ((i === 0 || i === 6) && waveOut > 0.7) {
            const la = prog(waveOut, 0.7, 1);
            const lx = exitX + dx * 635, ly = exitY + dy * 635 + (i === 0 ? -26 : 36);
            KS.text(ctx, i === 0 ? "红光 · 波长长 · 偏折小" : "紫光 · 波长短 · 偏折大", lx, ly, {
              size: 21,
              weight: 700,
              color: i === 0 ? "#ff7e75" : "#ccb3ff",
              align: "right",
              alpha: la,
            });
          }
        }
      });
      ctx.restore();
    }

    // 4. 晶莹玻璃三棱镜本体
    const pScale = E.outBack(prog(lt, 0, 0.5), 1.1);
    ctx.save();
    ctx.translate(760, 620);
    ctx.scale(pScale, pScale);
    ctx.translate(-760, -620);
    const pg = ctx.createLinearGradient(580, 420, 940, 760);
    pg.addColorStop(0, "rgba(255,255,255,0.28)");
    pg.addColorStop(0.5, "rgba(180,245,235,0.14)");
    pg.addColorStop(1, "rgba(170,215,255,0.24)");
    ctx.beginPath();
    ctx.moveTo(apex[0], apex[1]);
    ctx.lineTo(rightB[0], rightB[1]);
    ctx.lineTo(leftB[0], leftB[1]);
    ctx.closePath();
    ctx.fillStyle = pg;
    ctx.fill();
    // 晶面切线与高光棱边
    ctx.strokeStyle = "rgba(215,252,245,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(apex[0], apex[1] + 18);
    ctx.lineTo(725, 718);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 入射点星芒
    if (beamIn > 0.9) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      KS.glow(ctx, hitL[0], hitL[1], 75, "#fff4d0", 0.9);
      KS.sparkle(ctx, hitL[0], hitL[1], 30 + Math.sin(lt * 8) * 4, "#ffffff", 0.95, lt * 1.2);
      ctx.restore();
    }
    ctx.restore();
  }

  // ————————————————————————————————————————————————————————————
  // C. PN 结阀门（42.2 – 45.0s）
  // ————————————————————————————————————————————————————————————
  function drawPnAct(ctx, t, alpha) {
    if (alpha <= 0.005) return;
    const lt = t - 42.2; // 0..2.8s
    // 0..1.35s 正向导通；1.35..1.75s 翻转极性；1.75..2.8s 反向截止
    const rev = ease(lt, 1.32, 1.72, E.inOutCubic);
    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = 960, cy = 605, chW = 1040, chH = 310;
    const x0 = cx - chW / 2, y0 = cy - chH / 2;
    const deplW = lerp(52, 290, rev); // 耗尽层宽度：正接窄、反接宽

    // 顶部状态切换胶囊
    const badgeW = 460;
    KS.card(ctx, cx - badgeW / 2, 355, badgeW, 56, 28, {
      blur: 22,
      offsetY: 8,
      fill: rev < 0.5 ? "#e9fbf5" : "#fff2ee",
      stroke: rev < 0.5 ? C.accent : "#e06a50",
      lineWidth: 2,
    });
    ctx.fillStyle = rev < 0.5 ? C.accent : "#e06a50";
    KS.circle(ctx, cx - badgeW / 2 + 34, 383, 9);
    ctx.fill();
    KS.text(
      ctx,
      rev < 0.5 ? "正向偏置 · 耗尽层变窄 · 电流畅通" : "反向偏置 · 耗尽层加宽 · 电流截止",
      cx + 12,
      392,
      { size: 23, weight: 800, color: rev < 0.5 ? C.accentStrong : "#b9462f", align: "center" }
    );

    // 玻璃腔体
    KS.card(ctx, x0, y0, chW, chH, 28, { blur: 36, offsetY: 14, fill: "#ffffff", stroke: "rgba(18,62,56,0.16)", lineWidth: 2 });
    ctx.save();
    KS.roundRect(ctx, x0, y0, chW, chH, 28);
    ctx.clip();

    // P 区（左，暖珊瑚浅底）与 N 区（右，天蓝浅底）
    const pGrad = ctx.createLinearGradient(x0, 0, cx, 0);
    pGrad.addColorStop(0, "#fff0eb");
    pGrad.addColorStop(1, "#ffffff");
    ctx.fillStyle = pGrad;
    ctx.fillRect(x0, y0, chW / 2, chH);

    const nGrad = ctx.createLinearGradient(cx, 0, x0 + chW, 0);
    nGrad.addColorStop(0, "#ffffff");
    nGrad.addColorStop(1, "#eaf4fe");
    ctx.fillStyle = nGrad;
    ctx.fillRect(cx, y0, chW / 2, chH);

    // 耗尽层（中间琥珀色阻挡带）
    const dGrad = ctx.createLinearGradient(cx - deplW / 2, 0, cx + deplW / 2, 0);
    dGrad.addColorStop(0, "rgba(242,169,75,0.14)");
    dGrad.addColorStop(0.5, KS.rgba("#efb65a", lerp(0.3, 0.52, rev)));
    dGrad.addColorStop(1, "rgba(242,169,75,0.14)");
    ctx.fillStyle = dGrad;
    ctx.fillRect(cx - deplW / 2, y0, deplW, chH);
    ctx.strokeStyle = KS.rgba(C.warm, lerp(0.45, 0.85, rev));
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(cx - deplW / 2, y0); ctx.lineTo(cx - deplW / 2, y0 + chH);
    ctx.moveTo(cx + deplW / 2, y0); ctx.lineTo(cx + deplW / 2, y0 + chH);
    ctx.stroke();
    ctx.setLineDash([]);

    // P / N 标签
    KS.text(ctx, "P 型半导体（空穴 +）", x0 + 30, y0 + 38, { size: 20, weight: 800, color: "#cf5d47" });
    KS.text(ctx, "N 型半导体（电子 −）", x0 + chW - 30, y0 + 38, { size: 20, weight: 800, color: C.sky, align: "right" });
    KS.text(ctx, "耗尽层", cx, y0 + chH - 22, { size: 19, weight: 800, color: C.warmDeep || "#b86c1c", align: "center" });

    // 载流子：10 枚空穴（+）与 10 枚电子（−）
    const rows = [y0 + 92, y0 + 158, y0 + 224];
    for (let k = 0; k < 12; k++) {
      const rowY = rows[k % 3] + Math.sin(lt * 3.5 + k * 1.7) * 7;
      // 空穴（从左向右穿行；反接时被拉回左侧电极）
      const flowU = ((lt * 0.65 + k * 0.21) % 1);
      const hxForward = lerp(x0 + 40, x0 + chW - 40, flowU);
      const hxReverse = x0 + 55 + ((k * 73) % 270);
      const hx = lerp(hxForward, hxReverse, rev);
      // 电子（从右向左穿行；反接时被拉回右侧电极）
      const exForward = lerp(x0 + chW - 40, x0 + 40, (flowU + 0.37) % 1);
      const exReverse = x0 + chW - 55 - ((k * 67) % 270);
      const ex = lerp(exForward, exReverse, rev);

      // 空穴（珊瑚红圆环 +）
      ctx.save();
      ctx.fillStyle = "#fff5f2";
      ctx.strokeStyle = "#e56b52";
      ctx.lineWidth = 3.5;
      KS.circle(ctx, hx, rowY, 15);
      ctx.fill();
      ctx.stroke();
      KS.text(ctx, "+", hx, rowY + 7, { size: 22, weight: 900, color: "#d8563c", align: "center" });
      ctx.restore();

      // 电子（发光天蓝实心球 −）
      ctx.save();
      KS.glow(ctx, ex, rowY + 12, 26, "#5db9ff", 0.35 * (1 - rev * 0.5));
      const eg = ctx.createRadialGradient(ex - 4, rowY + 8, 2, ex, rowY + 12, 15);
      eg.addColorStop(0, "#9be0ff");
      eg.addColorStop(0.6, "#2f8ce6");
      eg.addColorStop(1, "#185ca8");
      ctx.fillStyle = eg;
      KS.circle(ctx, ex, rowY + 12, 14);
      ctx.fill();
      KS.text(ctx, "−", ex, rowY + 19, { size: 22, weight: 900, color: "#ffffff", align: "center" });
      ctx.restore();
    }

    // 正向导通时的流动电流箭头
    if (rev < 0.7) {
      ctx.save();
      ctx.globalAlpha = alpha * (1 - rev / 0.7) * 0.65;
      for (let a = 0; a < 4; a++) {
        const ax = lerp(x0 + 110, x0 + chW - 110, ((lt * 0.8 + a * 0.25) % 1));
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(ax - 18, cy - 12);
        ctx.lineTo(ax, cy);
        ctx.lineTo(ax - 18, cy + 12);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // 左右电极端帽（正负符号随偏置反转）
    const leftPol = rev < 0.5 ? "+" : "−";
    const rightPol = rev < 0.5 ? "−" : "+";
    [
      [x0 - 38, leftPol, leftPol === "+" ? "#e56b52" : C.sky],
      [x0 + chW + 38, rightPol, rightPol === "+" ? "#e56b52" : C.sky],
    ].forEach(([ex, sym, col]) => {
      KS.card(ctx, ex - 26, cy - 42, 52, 84, 16, { blur: 16, offsetY: 6, fill: "#ffffff", stroke: col, lineWidth: 2.5 });
      KS.text(ctx, sym, ex, cy + 12, { size: 36, weight: 900, color: col, align: "center" });
    });

    // 底部简洁电流表条
    const cur = 1 - rev;
    KS.card(ctx, cx - 220, y0 + chH + 26, 440, 48, 24, { blur: 18, offsetY: 6, fill: "rgba(255,255,255,0.9)", stroke: "rgba(18,62,56,0.1)" });
    KS.text(ctx, "电流强度", cx - 192, y0 + chH + 58, { size: 19, weight: 700, color: C.muted });
    KS.roundRect(ctx, cx - 95, y0 + chH + 42, 230, 16, 8);
    ctx.fillStyle = "rgba(18,62,56,0.1)";
    ctx.fill();
    if (cur > 0.02) {
      KS.roundRect(ctx, cx - 95, y0 + chH + 42, 230 * cur, 16, 8);
      ctx.fillStyle = C.accentBright;
      ctx.fill();
    }
    KS.text(ctx, cur > 0.5 ? "导通" : "0 mA", cx + 150, y0 + chH + 58, { size: 19, weight: 800, color: cur > 0.5 ? C.accentStrong : "#c8533b", family: KS.FONT_MONO });

    ctx.restore();
  }

  // ————————————————————————————————————————————————————————————
  // 主场景入口：组合外框 + 顶部切换胶囊 + 三个动态剧场
  // ————————————————————————————————————————————————————————————
  KS.scenes.push({
    id: "show",
    start: 31.35,
    end: 45.25,
    draw(ctx, t) {
      KS.sectionHeader(ctx, t, 31.5, 45.0, "03", "动画呈现", "对象真实演化，规律一眼看懂。");

      const enter = ease(t, 31.4, 32.05, E.outCubic);
      const exit = ease(t, 44.7, 45.2, E.inCubic);
      const alpha = enter * (1 - exit);
      if (alpha <= 0.005) return;

      const sc = lerp(0.92, 1, enter) * lerp(1, 0.96, exit);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(960, BOX.y + BOX.h / 2);
      ctx.scale(sc, sc);
      ctx.translate(-960, -(BOX.y + BOX.h / 2));

      // 剧场外壳
      KS.card(ctx, BOX.x, BOX.y, BOX.w, BOX.h, BOX.r, {
        blur: 56,
        offsetY: 22,
        fill: "rgba(255,255,255,0.92)",
        stroke: "rgba(15,150,125,0.22)",
        lineWidth: 2,
      });

      ctx.save();
      KS.roundRect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, BOX.r);
      ctx.clip();

      // 计算三段交叉淡入淡出权重
      const aDice = life(t, 31.4, 39.75, 0.35, 0.35);
      const aPrism = life(t, 39.35, 42.45, 0.32, 0.32);
      const aPn = life(t, 42.05, 45.25, 0.32, 0.3);

      drawDiceAct(ctx, t, aDice);
      drawPrismAct(ctx, t, aPrism);
      drawPnAct(ctx, t, aPn);

      // 顶部剧场顶栏：当前主题标题 + 右侧三幕胶囊指示器
      const activeIdx = t < 39.5 ? 0 : t < 42.2 ? 1 : 2;
      const curAct = ACTS[activeIdx];
      const darkBar = activeIdx === 1;
      ctx.fillStyle = darkBar ? "rgba(8,26,25,0.72)" : "rgba(248,250,247,0.86)";
      ctx.fillRect(BOX.x, BOX.y, BOX.w, 72);
      ctx.strokeStyle = darkBar ? "rgba(120,230,205,0.16)" : "rgba(18,62,56,0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(BOX.x, BOX.y + 72); ctx.lineTo(BOX.x + BOX.w, BOX.y + 72); ctx.stroke();

      // 左侧播放中指示灯 + 问题标题
      ctx.fillStyle = C.accentBright;
      KS.circle(ctx, BOX.x + 36, BOX.y + 36, 7);
      ctx.fill();
      KS.text(ctx, curAct.q, BOX.x + 56, BOX.y + 45, {
        size: 26,
        weight: 800,
        color: darkBar ? "#eefaf7" : C.ink,
      });

      // 右侧三个主题切换胶囊
      let tx = BOX.x + BOX.w - 30;
      for (let i = ACTS.length - 1; i >= 0; i--) {
        const act = ACTS[i];
        const isOn = i === activeIdx;
        const label = `${act.num} ${act.label}`;
        const pw = KS.measure(ctx, label, 18, 700) + 34;
        tx -= pw;
        KS.roundRect(ctx, tx, BOX.y + 18, pw, 36, 18);
        ctx.fillStyle = isOn ? C.accent : darkBar ? "rgba(255,255,255,0.1)" : "rgba(18,62,56,0.06)";
        ctx.fill();
        KS.text(ctx, label, tx + pw / 2, BOX.y + 42, {
          size: 18,
          weight: 700,
          color: isOn ? "#ffffff" : darkBar ? "#b8ded6" : C.muted,
          align: "center",
        });
        tx -= 10;
      }

      // 底部一句话机制说明条
      ctx.fillStyle = darkBar ? "rgba(8,26,25,0.72)" : "rgba(248,250,247,0.86)";
      ctx.fillRect(BOX.x, BOX.y + BOX.h - 54, BOX.w, 54);
      KS.text(ctx, curAct.cap, 960, BOX.y + BOX.h - 19, {
        size: 21,
        weight: 600,
        color: darkBar ? "#cdebe4" : C.inkBody,
        align: "center",
      });
      // 底部当前小段进度细线
      const segU = clamp((t - curAct.start) / (curAct.end - curAct.start));
      ctx.fillStyle = C.accentBright;
      ctx.fillRect(BOX.x, BOX.y + BOX.h - 4, BOX.w * segU, 4);

      ctx.restore();
      ctx.restore();
    },
  });
})();
