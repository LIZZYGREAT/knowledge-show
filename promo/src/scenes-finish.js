/*
 * 第七幕：工作台微调（44.9 – 51.9s）
 * 第八幕：一键导出（51.4 – 55.6s）
 * 第九幕：品牌收尾 Finale（55.3 – 62.5s）
 */
(function () {
  "use strict";
  const KS = window.KS;
  const { C, W, H, E, ease, life, prog, lerp, clamp, TAU } = KS;

  // 工作台外壳坐标（参考 frontend/src/features/revision/editor-layout.html）
  const WB = { x: 180, y: 248, w: 1560, h: 710, r: 28, topH: 64, sideW: 420 };
  const REVISION_PROMPT = "把 7 这一列再突出一点";

  // 舞台左侧 11 列直方图，供工作台实时预览与元件框选
  function drawWorkbenchStage(ctx, t, stX, stY, stW, stH, selected, upgraded, scanU) {
    // 舞台底板
    ctx.fillStyle = "#f4f9f7";
    ctx.fillRect(stX, stY, stW, stH);
    // 浅点阵
    ctx.fillStyle = "rgba(18,72,65,0.06)";
    for (let y = stY + 24; y < stY + stH - 80; y += 28) {
      for (let x = stX + 24; x < stX + stW - 20; x += 28) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, TAU); ctx.fill();
      }
    }

    // 预览视频画框（16:9 比例居中）
    const pvW = 940, pvH = 490;
    const pvX = stX + (stW - pvW) / 2;
    const pvY = stY + 34;
    KS.card(ctx, pvX, pvY, pvW, pvH, 20, { blur: 32, offsetY: 12, fill: "#ffffff", stroke: "rgba(18,62,56,0.12)" });

    // 画框内标题
    KS.text(ctx, "S03 · 钟形分布与 7 的峰值", pvX + 34, pvY + 46, { size: 22, weight: 800, color: C.ink });
    KS.text(ctx, upgraded > 0.5 ? "v2 · 局部已更新" : "v1 · 预览中", pvX + pvW - 34, pvY + 46, {
      size: 18,
      weight: 700,
      color: upgraded > 0.5 ? C.accent : C.mutedDim,
      align: "right",
      family: KS.FONT_MONO,
    });

    // 11 根分布柱
    const colW = 58, colGap = 14;
    const totalW = 11 * (colW + colGap) - colGap;
    const baseX = pvX + (pvW - totalW) / 2;
    const baseY = pvY + pvH - 72;
    const unitH = 44;

    // 参考线
    ctx.strokeStyle = "rgba(18,62,56,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX - 18, baseY + 6);
    ctx.lineTo(baseX + totalW + 18, baseY + 6);
    ctx.stroke();

    let bar7Box = null;
    for (let s = 2; s <= 12; s++) {
      const idx = s - 2;
      const cnt = 6 - Math.abs(s - 7);
      const is7 = s === 7;
      const cx = baseX + idx * (colW + colGap) + colW / 2;
      const boost = is7 ? upgraded : 0;
      const breath = Math.sin(t * 2.4 + idx * 0.4) * 2;
      const h = cnt * unitH + boost * 34 + breath;
      const w = colW + boost * 12;
      const x = cx - w / 2;
      const y = baseY - h;

      if (is7) bar7Box = { x: x - 12, y: y - 14, w: w + 24, h: h + 52, cx, topY: y };

      // 其他列在 bar7 升级突出时略微柔和退让，增强对比层次
      const dim = !is7 ? lerp(1, 0.72, upgraded) : 1;
      ctx.save();
      ctx.globalAlpha = dim;
      if (is7 && boost > 0.05) {
        KS.glow(ctx, cx, y + h / 2, 115, C.gold, 0.45 * boost);
      }
      KS.roundRect(ctx, x, y, w, h, 12);
      if (is7) {
        const g = ctx.createLinearGradient(0, y, 0, baseY);
        g.addColorStop(0, KS.rgba(KS.mix("#69d8c3", "#ffcb57", boost), 1));
        g.addColorStop(0.55, KS.rgba(KS.mix("#1cb89a", "#f29b38", boost), 1));
        g.addColorStop(1, KS.rgba(KS.mix("#0f967d", "#d9751e", boost), 1));
        ctx.fillStyle = g;
      } else {
        const g = ctx.createLinearGradient(0, y, 0, baseY);
        g.addColorStop(0, "#75decb");
        g.addColorStop(1, "#189e86");
        ctx.fillStyle = g;
      }
      ctx.fill();

      // 升级后 bar7 内部的斜向高光光泽
      if (is7 && boost > 0.2) {
        ctx.save();
        KS.roundRect(ctx, x, y, w, h, 12);
        ctx.clip();
        const sh = ((t * 1.1) % 1.4) - 0.2;
        const sy = lerp(baseY + 40, y - 60, sh);
        const sg = ctx.createLinearGradient(x, sy, x + w, sy + 60);
        sg.addColorStop(0, "rgba(255,255,255,0)");
        sg.addColorStop(0.5, `rgba(255,255,255,${0.48 * boost})`);
        sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      }

      // 柱顶数值
      KS.text(ctx, `${cnt}/36`, cx, y - 10, {
        size: is7 ? lerp(17, 22, boost) : 15,
        weight: is7 ? 900 : 700,
        color: is7 && boost > 0.4 ? C.warmDeep || "#b86c1c" : C.muted,
        align: "center",
        family: KS.FONT_MONO,
      });
      // 柱底点数
      KS.text(ctx, String(s), cx, baseY + 32, {
        size: is7 ? 23 : 18,
        weight: is7 ? 900 : 700,
        color: is7 && boost > 0.4 ? C.warm : C.inkBody,
        align: "center",
        family: KS.FONT_MONO,
      });
      ctx.restore();
    }

    // 升级后 bar7 上方的皇冠高光标签 + 星芒
    if (upgraded > 0.05 && bar7Box) {
      const pop = E.outBack(upgraded, 1.5);
      const bx = bar7Box.cx, by = bar7Box.topY - 56;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(pop, pop);
      KS.card(ctx, -110, -24, 220, 46, 23, { blur: 20, offsetY: 6, fill: "#fff7e8", stroke: C.warm, lineWidth: 2 });
      KS.text(ctx, "★ 最高概率 1/6", 0, 7, { size: 19, weight: 800, color: "#b86c1c", align: "center" });
      ctx.restore();
      // 庆祝微星芒
      const spA = life(t, 49.15, 50.8, 0.15, 0.8);
      if (spA > 0) {
        KS.sparkle(ctx, bx - 95, by - 16, 18 * spA, C.warmBright, spA, t * 2);
        KS.sparkle(ctx, bx + 98, by - 6, 14 * spA, C.accentBright, spA, -t * 1.8);
        KS.sparkle(ctx, bx + 54, bar7Box.topY + 40, 12 * spA, "#ffffff", spA, t * 2.5);
      }
    }

    // 真实元件框选虚线框 + 4 个角标句柄（点击 46.0s 出现，修订完成后柔和退让以便突出成片效果）
    if (selected > 0.01 && bar7Box) {
      const boxA = selected * lerp(1, 0.45, upgraded);
      ctx.save();
      ctx.globalAlpha = boxA;
      const b = bar7Box;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      KS.roundRect(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      // 四个选中句柄
      const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]];
      corners.forEach(([hx, hy]) => {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2.5;
        KS.roundRect(ctx, hx - 5, hy - 5, 10, 10, 3);
        ctx.fill();
        ctx.stroke();
      });
      // 右上外侧锚点 ID 胶囊（完全避开顶部 6/36 与皇冠标签）
      ctx.globalAlpha = selected;
      KS.roundRect(ctx, b.x + b.w + 10, b.y + 4, 156, 26, 13);
      ctx.fillStyle = C.accent;
      ctx.fill();
      KS.text(ctx, "#bar-sum-7 · 柱体", b.x + b.w + 88, b.y + 22, { size: 13, weight: 700, color: "#ffffff", align: "center", family: KS.FONT_MONO });

      // 局部 AI 重绘扫描光带（仅扫过被框选的 bar 7，体现“局部微调”）
      if (scanU > 0 && scanU < 1) {
        const sy = lerp(b.y + b.h, b.y, scanU);
        const sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
        sg.addColorStop(0, "rgba(53,236,198,0)");
        sg.addColorStop(0.5, "rgba(53,236,198,0.55)");
        sg.addColorStop(1, "rgba(53,236,198,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(b.x + 2, Math.max(b.y, sy - 30), b.w - 4, 60);
        ctx.strokeStyle = C.mint;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(b.x, sy); ctx.lineTo(b.x + b.w, sy); ctx.stroke();
      }
      ctx.restore();
    }

    // 底部简洁播放控制条
    const barY = pvY + pvH + 28;
    KS.card(ctx, pvX, barY, pvW, 56, 16, { blur: 18, offsetY: 6, fill: "#ffffff", stroke: "rgba(18,62,56,0.1)" });
    // 播放按钮
    ctx.fillStyle = C.accent;
    KS.circle(ctx, pvX + 34, barY + 28, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(pvX + 30, barY + 21);
    ctx.lineTo(pvX + 42, barY + 28);
    ctx.lineTo(pvX + 30, barY + 35);
    ctx.closePath();
    ctx.fill();
    // 4 段多场景进度条
    const trX = pvX + 70, trW = pvW - 180;
    const segs = [0.22, 0.28, 0.3, 0.2];
    let sx = trX;
    segs.forEach((f, i) => {
      const sw = trW * f - 4;
      KS.roundRect(ctx, sx, barY + 23, sw, 10, 5);
      ctx.fillStyle = i < 2 ? C.accentBright : i === 2 ? C.warmBright : "rgba(18,62,56,0.12)";
      ctx.fill();
      sx += sw + 4;
    });
    // 播放头圆点
    const phX = trX + trW * 0.66;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 3;
    KS.circle(ctx, phX, barY + 28, 8);
    ctx.fill();
    ctx.stroke();
    KS.text(ctx, "01:48 / 02:45", pvX + pvW - 22, barY + 34, { size: 16, weight: 700, color: C.muted, align: "right", family: KS.FONT_MONO });

    return { bar7Center: bar7Box ? [bar7Box.cx, bar7Box.y + bar7Box.h * 0.5] : [pvX + pvW / 2, pvY + pvH / 2] };
  }

  // ————————————————————————————————————————————————————————————
  // 第七幕：工作台微调（44.9 – 52.3s，与第八幕导出点击无缝衔接）
  // ————————————————————————————————————————————————————————————
  KS.scenes.push({
    id: "workbench",
    start: 44.9,
    end: 52.45,
    draw(ctx, t) {
      KS.sectionHeader(ctx, t, 45.05, 51.45, "04", "工作台微调", "哪里不满意，点一下就能改。");

      const enter = ease(t, 45.0, 45.65, E.outCubic);
      const foldOut = ease(t, 52.05, 52.42, E.inCubic);
      const alpha = enter * (1 - foldOut);
      if (alpha <= 0.005) return;

      const sc = lerp(0.94, 1, enter) * lerp(1, 0.88, foldOut);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(960, WB.y + WB.h / 2);
      ctx.scale(sc, sc);
      ctx.translate(-960, -(WB.y + WB.h / 2));

      // 主窗口容器
      KS.card(ctx, WB.x, WB.y, WB.w, WB.h, WB.r, {
        blur: 56,
        offsetY: 22,
        fill: "#ffffff",
        stroke: "rgba(18,62,56,0.16)",
        lineWidth: 2,
      });

      ctx.save();
      KS.roundRect(ctx, WB.x, WB.y, WB.w, WB.h, WB.r);
      ctx.clip();

      // 顶栏（Top Studio Bar）
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fillRect(WB.x, WB.y, WB.w, WB.topH);
      ctx.strokeStyle = "rgba(18,62,56,0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(WB.x, WB.y + WB.topH); ctx.lineTo(WB.x + WB.w, WB.y + WB.topH); ctx.stroke();

      KS.drawLogo(ctx, WB.x + 38, WB.y + 32, 34);
      KS.text(ctx, "动画工作台", WB.x + 66, WB.y + 40, { size: 22, weight: 800, color: C.ink });
      KS.text(ctx, "·  为什么两个骰子最容易掷出 7？", WB.x + 190, WB.y + 40, { size: 19, weight: 500, color: C.muted });

      // 版本号胶囊：49.2s 时从 v1 升级到 v2
      const upgraded = ease(t, 49.15, 49.75, E.outCubic);
      const verX = WB.x + WB.w - 310;
      KS.roundRect(ctx, verX, WB.y + 15, 118, 34, 17);
      ctx.fillStyle = upgraded > 0.5 ? "#e4f7f2" : "#f1f6f3";
      ctx.fill();
      ctx.strokeStyle = upgraded > 0.5 ? C.accent : "rgba(18,62,56,0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      KS.text(ctx, upgraded > 0.5 ? "v2 · 已更新" : "v1 · 首版", verX + 59, WB.y + 38, {
        size: 16,
        weight: 800,
        color: upgraded > 0.5 ? C.accentStrong : C.muted,
        align: "center",
        family: KS.FONT_MONO,
      });

      // 右上角“导出 MP4”主按钮（51.5s 起发光吸引注意，52.0s 被点击）
      const expBtnX = WB.x + WB.w - 174, expBtnY = WB.y + 12, expBtnW = 148, expBtnH = 40;
      const expGlow = ease(t, 51.35, 51.85, E.outCubic);
      const expPress = Math.max(0, 1 - Math.abs(t - 52.0) / 0.12);
      ctx.save();
      ctx.translate(expBtnX + expBtnW / 2, expBtnY + expBtnH / 2);
      ctx.scale(1 - expPress * 0.08 + expGlow * 0.04, 1 - expPress * 0.08 + expGlow * 0.04);
      if (expGlow > 0) KS.glow(ctx, 0, 0, 95, C.flowLight, 0.55 * expGlow);
      const ebG = ctx.createLinearGradient(-expBtnW / 2, 0, expBtnW / 2, 0);
      ebG.addColorStop(0, C.accentBright);
      ebG.addColorStop(1, C.accentStrong);
      KS.roundRect(ctx, -expBtnW / 2, -expBtnH / 2, expBtnW, expBtnH, 20);
      ctx.fillStyle = ebG;
      ctx.fill();
      KS.text(ctx, "导出 MP4 ↗", 0, 7, { size: 18, weight: 800, color: "#ffffff", align: "center" });
      ctx.restore();
      KS.ripple(ctx, expBtnX + expBtnW / 2, expBtnY + expBtnH / 2, t, 52.0, "#ffffff");

      // 左侧实时动画舞台
      const stW = WB.w - WB.sideW;
      const selected = ease(t, 46.0, 46.28, E.outCubic);
      const scanU = prog(t, 48.35, 49.2);
      const stageInfo = drawWorkbenchStage(ctx, t, WB.x, WB.y + WB.topH, stW, WB.h - WB.topH, selected, upgraded, scanU);

      // 右侧局部修订面板
      const sx = WB.x + stW, sy = WB.y + WB.topH, sw = WB.sideW, sh = WB.h - WB.topH;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = "rgba(18,62,56,0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + sh); ctx.stroke();

      KS.text(ctx, "定向局部修订", sx + 28, sy + 44, { size: 22, weight: 800, color: C.ink });
      KS.text(ctx, "选中画面元件，直接说出你的想法", sx + 28, sy + 72, { size: 16, weight: 500, color: C.muted });

      // 1. 已选元件锚点卡片
      KS.roundRect(ctx, sx + 26, sy + 98, sw - 52, 86, 16);
      ctx.fillStyle = selected > 0.5 ? "#eefbf7" : "#f6f9f8";
      ctx.fill();
      ctx.strokeStyle = selected > 0.5 ? "rgba(15,150,125,0.4)" : "rgba(18,62,56,0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      KS.text(ctx, "当前锚定元件", sx + 44, sy + 128, { size: 14, weight: 700, color: C.muted });
      if (selected > 0.3) {
        ctx.fillStyle = C.accent;
        KS.circle(ctx, sx + 52, sy + 158, 6);
        ctx.fill();
        KS.text(ctx, "柱体 #7（和为 7 的组合）", sx + 68, sy + 165, { size: 19, weight: 800, color: C.accentStrong, alpha: selected });
      } else {
        KS.text(ctx, "点击左侧画布选择元件…", sx + 44, sy + 165, { size: 18, weight: 500, color: C.mutedDim });
      }

      // 2. 修订意见输入框（47.0s 聚焦，47.25s 起逐字输入）
      const focused = ease(t, 47.0, 47.2, E.outCubic);
      const inpX = sx + 26, inpY = sy + 208, inpW = sw - 52, inpH = 128;
      KS.roundRect(ctx, inpX, inpY, inpW, inpH, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = focused > 0.5 ? C.accent : "rgba(18,62,56,0.18)";
      ctx.lineWidth = focused > 0.5 ? 2.5 : 1.5;
      ctx.stroke();
      KS.text(ctx, "修改意见", inpX + 18, inpY + 30, { size: 14, weight: 700, color: C.muted });
      const chars = Math.floor(clamp((t - 47.25) / 0.09, 0, REVISION_PROMPT.length + 0.01));
      if (chars <= 0) {
        KS.text(ctx, "例如：把重点元素放大、换更醒目的颜色…", inpX + 18, inpY + 68, { size: 17, color: C.mutedDim });
      } else {
        const str = Array.from(REVISION_PROMPT).slice(0, chars).join("");
        KS.text(ctx, str, inpX + 18, inpY + 72, { size: 23, weight: 700, color: C.ink });
        if (t < 48.35 && Math.floor(t * 3) % 2 === 0) {
          const tw = KS.measure(ctx, str, 23, 700);
          ctx.fillStyle = C.accent;
          ctx.fillRect(inpX + 20 + tw, inpY + 48, 2.5, 28);
        }
      }

      // 3. 应用修订按钮（48.3s 点击）
      const applyX = sx + 26, applyY = sy + 358, applyW = sw - 52, applyH = 54;
      const appPress = Math.max(0, 1 - Math.abs(t - 48.3) / 0.12);
      const applying = t >= 48.32 && t < 49.2;
      ctx.save();
      ctx.translate(applyX + applyW / 2, applyY + applyH / 2);
      ctx.scale(1 - appPress * 0.05, 1 - appPress * 0.05);
      KS.roundRect(ctx, -applyW / 2, -applyH / 2, applyW, applyH, 27);
      ctx.fillStyle = upgraded > 0.5 ? "#e4f7f2" : C.accent;
      ctx.fill();
      if (upgraded > 0.5) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      KS.text(
        ctx,
        upgraded > 0.5 ? "✓ 局部修订已生效（未重跑全片）" : applying ? "正在局部更新元件 #7…" : "应用局部修订 ✦",
        0,
        7,
        { size: 19, weight: 800, color: upgraded > 0.5 ? C.accentStrong : "#ffffff", align: "center" }
      );
      ctx.restore();
      KS.ripple(ctx, applyX + applyW / 2, applyY + applyH / 2, t, 48.3, "#ffffff");

      // 4. 版本变更记录卡片（49.2s 弹出，体现精准版本可回退）
      if (upgraded > 0.05) {
        ctx.save();
        ctx.globalAlpha = upgraded;
        const logY = sy + 436 + (1 - upgraded) * 18;
        KS.roundRect(ctx, sx + 26, logY, sw - 52, 168, 16);
        ctx.fillStyle = "#f7fbf9";
        ctx.fill();
        ctx.strokeStyle = "rgba(15,150,125,0.22)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        KS.text(ctx, "版本历史（支持随时回退）", sx + 44, logY + 32, { size: 15, weight: 700, color: C.muted });
        // v2 项
        KS.roundRect(ctx, sx + 42, logY + 48, sw - 84, 48, 10);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        KS.text(ctx, "v2", sx + 60, logY + 78, { size: 16, weight: 900, color: C.accent, family: KS.FONT_MONO });
        KS.text(ctx, "高亮柱体 #7 + 峰值标签", sx + 96, logY + 78, { size: 16, weight: 700, color: C.ink });
        // v1 项
        KS.text(ctx, "v1", sx + 60, logY + 132, { size: 16, weight: 700, color: C.mutedDim, family: KS.FONT_MONO });
        KS.text(ctx, "首版完整动画预览", sx + 96, logY + 132, { size: 16, weight: 500, color: C.muted });
        ctx.restore();
      }

      // 编排好的鼠标光标轨迹：46.0 点柱 7 -> 47.0 点输入框 -> 48.3 点应用 -> 52.0 点导出 MP4
      const curA = life(t, 45.4, 52.3, 0.25, 0.2);
      if (curA > 0) {
        const p0 = [1180, 780];
        const p1 = [stageInfo.bar7Center[0] + 6, stageInfo.bar7Center[1] + 10];
        const p2 = [inpX + 120, inpY + 68];
        const p3 = [applyX + applyW / 2, applyY + applyH / 2];
        const p4 = [expBtnX + expBtnW / 2, expBtnY + expBtnH / 2];
        let cx = p0[0], cy = p0[1];
        const m1 = ease(t, 45.45, 45.95);
        const m2 = ease(t, 46.45, 46.95);
        const m3 = ease(t, 48.0, 48.26);
        const m4 = ease(t, 51.35, 51.92);
        cx = lerp(cx, p1[0], m1); cy = lerp(cy, p1[1], m1);
        cx = lerp(cx, p2[0], m2); cy = lerp(cy, p2[1], m2);
        cx = lerp(cx, p3[0], m3); cy = lerp(cy, p3[1], m3);
        cx = lerp(cx, p4[0], m4); cy = lerp(cy, p4[1], m4);
        const press =
          Math.max(0, 1 - Math.abs(t - 46.0) / 0.1) +
          Math.max(0, 1 - Math.abs(t - 47.0) / 0.1) +
          Math.max(0, 1 - Math.abs(t - 48.3) / 0.1) +
          Math.max(0, 1 - Math.abs(t - 52.0) / 0.1);
        KS.ripple(ctx, p1[0], p1[1], t, 46.0, C.accent);
        ctx.save();
        ctx.globalAlpha = curA;
        KS.cursor(ctx, cx, cy, 1.25, clamp(press));
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();
    },
  });

  // ————————————————————————————————————————————————————————————
  // 第八幕：一键导出（51.95 – 55.65s）
  // ————————————————————————————————————————————————————————————
  KS.scenes.push({
    id: "export",
    start: 51.5,
    end: 55.65,
    draw(ctx, t) {
      KS.sectionHeader(ctx, t, 51.6, 55.25, "05", "一键导出", "预览即成片，高清交付。");

      const enter = ease(t, 52.05, 52.55, E.outBack);
      const shrinkToCenter = ease(t, 54.45, 55.45, E.inCubic);
      if (enter <= 0) return;

      // 54.2s 起三条品牌丝带螺旋汇聚向中心，为 55.5s 终幕爆发蓄力！
      if (t > 53.95 && t < 55.6) {
        KS.drawRibbons(ctx, t, {
          to: ease(t, 53.95, 55.25, E.inOutCubic),
          from: 0,
          m: ease(t, 54.15, 55.35, E.inCubic),
          cx: 960,
          cy: 430,
          alpha: 0.9,
          spin: 2.1,
        });
      }

      const cardA = clamp(enter) * (1 - shrinkToCenter);
      if (cardA > 0.005) {
        const cx = 960, cy = 590;
        const sc = lerp(0.84, 1, clamp(enter)) * lerp(1, 0.45, shrinkToCenter);
        ctx.save();
        ctx.globalAlpha = cardA;
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);

        // 中心光晕
        const done = ease(t, 53.85, 54.25, E.outCubic);
        KS.glow(ctx, 0, 0, 420 + done * 90, done > 0.5 ? C.gold : C.flowLight, 0.35 + done * 0.25);

        // 导出主体卡片
        KS.card(ctx, -475, -224, 950, 448, 36, {
          blur: 60,
          offsetY: 24,
          fill: "rgba(255,255,255,0.94)",
          stroke: done > 0.5 ? "rgba(15,150,125,0.45)" : "rgba(18,62,56,0.14)",
          lineWidth: 2.2,
        });

        // 左侧双环进度仪表盘
        const rx = -238, ry = -8, R = 112;
        const p = ease(t, 52.15, 53.9, E.inOutCubic);
        // 背景轨道
        ctx.strokeStyle = "rgba(18,62,56,0.09)";
        ctx.lineWidth = 14;
        KS.circle(ctx, rx, ry, R);
        ctx.stroke();
        // 进度弧
        const g = ctx.createLinearGradient(rx - R, ry - R, rx + R, ry + R);
        g.addColorStop(0, C.mint);
        g.addColorStop(0.55, C.accentBright);
        g.addColorStop(1, C.skyBright);
        ctx.strokeStyle = g;
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(rx, ry, R, -Math.PI / 2, -Math.PI / 2 + TAU * p);
        ctx.stroke();
        // 外圈细刻度装饰
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(t * 0.7);
        ctx.strokeStyle = "rgba(15,150,125,0.28)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 10]);
        KS.circle(ctx, 0, 0, R + 22);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 圈内百分比 → 完成对勾
        if (done < 0.5) {
          KS.text(ctx, `${Math.round(p * 100)}%`, rx, ry + 16, { size: 54, weight: 900, color: C.ink, align: "center", family: KS.FONT_MONO, alpha: 1 - done * 2 });
          KS.text(ctx, "同源逐帧渲染", rx, ry + 48, { size: 17, weight: 600, color: C.muted, align: "center", alpha: 1 - done * 2 });
        } else {
          const ck = E.outBack((done - 0.5) * 2, 1.8);
          ctx.save();
          ctx.translate(rx, ry);
          ctx.scale(ck, ck);
          ctx.fillStyle = C.accent;
          KS.circle(ctx, 0, 0, 56);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 9;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(-22, 2); ctx.lineTo(-6, 18); ctx.lineTo(24, -15);
          ctx.stroke();
          ctx.restore();
          KS.sparkle(ctx, rx + 72, ry - 68, 22 * done, C.warmBright, done, t * 2);
          KS.sparkle(ctx, rx - 82, ry + 64, 16 * done, C.mint, done, -t * 1.6);
        }

        // 右侧成片信息与规格
        const infoX = -56;
        KS.roundRect(ctx, infoX, -142, 140, 32, 16);
        ctx.fillStyle = done > 0.5 ? "#e4f7f2" : "#fef4e4";
        ctx.fill();
        KS.text(ctx, done > 0.5 ? "✓ 导出完成" : "正在封装成片", infoX + 70, -120, {
          size: 16,
          weight: 800,
          color: done > 0.5 ? C.accentStrong : C.warm,
          align: "center",
        });

        KS.text(ctx, "dice_probability_v2.mp4", infoX, -62, { size: 30, weight: 800, color: C.ink, family: KS.FONT_MONO });
        KS.text(ctx, "为什么两个骰子最容易掷出 7？", infoX, -20, { size: 22, weight: 600, color: C.muted });

        // 规格参数三胶囊
        const specs = [
          ["分辨率", "1920 × 1080", 148],
          ["帧率", "60 FPS", 118],
          ["一致性", "100% 同源一致", 168],
        ];
        let specCursor = infoX;
        specs.forEach(([k, v, sw]) => {
          KS.roundRect(ctx, specCursor, 16, sw, 72, 14);
          ctx.fillStyle = "#f4f9f7";
          ctx.fill();
          ctx.strokeStyle = "rgba(18,62,56,0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();
          KS.text(ctx, k, specCursor + 14, 42, { size: 14, weight: 600, color: C.mutedDim });
          KS.text(ctx, v, specCursor + 14, 72, { size: 17, weight: 800, color: C.ink });
          specCursor += sw + 12;
        });

        // 底部微缩胶片帧预览条
        const filmY = 114;
        for (let f = 0; f < 6; f++) {
          const fx = infoX + f * 77;
          const lit = p >= f / 6;
          KS.roundRect(ctx, fx, filmY, 68, 42, 8);
          ctx.fillStyle = lit ? KS.rgba([C.warmBright, C.accentBright, C.skyBright, C.violet, C.accent, C.warm][f], 0.25) : "#eef3f1";
          ctx.fill();
          ctx.strokeStyle = lit ? C.accentBright : "rgba(18,62,56,0.1)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (lit) {
            ctx.fillStyle = C.accent;
            KS.circle(ctx, fx + 34, filmY + 21, 5);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // 55.5s 终幕爆发前的一瞬白金闪光
      const flash = Math.max(0, 1 - Math.abs(t - 55.5) / 0.28);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,253,246,${E.outCubic(flash) * 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  });

  // ————————————————————————————————————————————————————————————
  // 第九幕：品牌收尾 Finale（55.35 – 62.5s）
  // ————————————————————————————————————————————————————————————
  const PILLS = ["知识探索", "脚本编排", "动态演绎", "局部微调", "一键导出"];

  KS.scenes.push({
    id: "finale",
    start: 55.35,
    end: 62.6,
    draw(ctx, t) {
      const lt = t - 55.5;
      if (lt < -0.15) return;

      // 宏阔舒展的三条有机流带在画面背后优雅流动
      const ribIn = ease(t, 55.5, 57.0, E.outCubic);
      if (ribIn > 0) {
        KS.drawRibbons(ctx, t * 0.72, {
          to: [ribIn, ribIn, ribIn],
          from: 0,
          m: 0,
          cx: 960,
          cy: 540,
          alpha: 0.42 * ribIn,
        });
      }

      // 55.5s 爆发瞬间冲击波与庆贺微粒
      const bu = prog(t, 55.5, 57.1);
      if (bu > 0 && bu < 1) {
        ctx.save();
        const r = KS.rng(555);
        for (let i = 0; i < 84; i++) {
          const ang = r() * TAU, sp = 200 + r() * 780;
          const d = E.outCubic(bu) * sp;
          const col = [C.mint, C.gold, C.skyBright, C.violet][i % 4];
          const x = 960 + Math.cos(ang) * (120 + d);
          const y = 360 + Math.sin(ang) * (120 + d) * 0.75;
          if (i % 3 === 0) KS.sparkle(ctx, x, y, (1 - bu) * 14 + 3, col, (1 - bu) * 0.9, ang + t);
          else KS.glow(ctx, x, y, 8 + (i % 6) * 2, col, (1 - bu) * 0.7);
        }
        ctx.strokeStyle = KS.rgba(C.accentBright, (1 - bu) * 0.55);
        ctx.lineWidth = 4 * (1 - bu) + 1;
        KS.circle(ctx, 960, 360, 120 + E.outCubic(bu) * 680);
        ctx.stroke();
        ctx.restore();
      }

      // 柔和的焦散双色光晕
      const aura = ease(t, 55.5, 56.4, E.outCubic);
      KS.glow(ctx, 900, 350, 380, C.flowLight, 0.36 * aura);
      KS.glow(ctx, 1030, 365, 320, C.gold, 0.28 * aura);

      // 优雅轨道细环
      const orbA = ease(t, 55.9, 57.2, E.outCubic);
      if (orbA > 0) {
        ctx.save();
        ctx.translate(960, 355);
        for (let k = 0; k < 2; k++) {
          ctx.save();
          ctx.rotate(-0.28 + k * 0.56);
          ctx.strokeStyle = KS.rgba(k === 0 ? C.accentBright : C.warmBright, 0.22 * orbA);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 10]);
          ctx.beginPath();
          ctx.ellipse(0, 0, 260 + k * 55, 84 + k * 20, 0, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          const a = t * (0.65 - k * 0.18) + k * 3.1;
          ctx.fillStyle = KS.rgba(k === 0 ? C.accentBright : C.warmBright, 0.85 * orbA);
          KS.circle(ctx, Math.cos(a) * (260 + k * 55), Math.sin(a) * (84 + k * 20), 6);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // 品牌核心 K 字标
      const breath = 1 + Math.sin(t * 2.1) * 0.014;
      KS.drawLogo(ctx, 960, 355, 224 * breath, {
        tile: prog(t, 55.48, 56.05),
        spine: prog(t, 55.55, 56.1),
        upper: prog(t, 55.62, 56.2),
        lower: prog(t, 55.68, 56.25),
        heart: prog(t, 55.78, 56.35),
        star: prog(t, 55.9, 56.7),
        shine: prog(t, 56.9, 57.85),
      });

      // 品牌字标文字 Knowledge.Show(me)
      ctx.save();
      ctx.font = KS.font(104, 800);
      const parts = [["Knowledge.", C.ink], ["Show", C.accent], ["(me)", C.warm]];
      const total = parts.reduce((acc, [s]) => acc + ctx.measureText(s).width, 0);
      ctx.restore();
      let wx = 960 - total / 2, idx = 0;
      parts.forEach(([s, col]) => {
        const w = KS.revealText(ctx, s, {
          x: wx,
          y: 590,
          size: 104,
          weight: 800,
          align: "left",
          t,
          start: 56.0 + idx * 0.028,
          stagger: 0.028,
          dur: 0.55,
          color: col,
        });
        wx += w;
        idx += s.length;
      });

      // 渐变细分隔线
      const ruleU = ease(t, 56.55, 57.4, E.outCubic);
      if (ruleU > 0) {
        const rw = 520 * ruleU;
        const rg = ctx.createLinearGradient(960 - rw / 2, 0, 960 + rw / 2, 0);
        rg.addColorStop(0, "rgba(18,184,158,0)");
        rg.addColorStop(0.28, "rgba(18,184,158,0.45)");
        rg.addColorStop(0.5, "rgba(235,154,56,0.9)");
        rg.addColorStop(0.72, "rgba(109,92,230,0.45)");
        rg.addColorStop(1, "rgba(109,92,230,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(960 - rw / 2, 622, rw, 3);
      }

      // 终极标语
      KS.revealText(ctx, "让知识，动起来。", {
        x: 960,
        y: 714,
        size: 62,
        weight: 800,
        family: KS.FONT_SERIF,
        t,
        start: 56.75,
        stagger: 0.06,
        dur: 0.65,
        color: C.ink,
        spacing: 8,
      });

      KS.revealText(ctx, "一个好奇的问题，一支看得见对象变化与机制规律的知识动画", {
        x: 960,
        y: 782,
        size: 28,
        weight: 500,
        t,
        start: 57.25,
        stagger: 0.02,
        dur: 0.55,
        color: C.muted,
        spacing: 2,
      });

      // 底部五步链路玻璃胶囊，依次柔和点亮
      const pillW = 160, pillGap = 24;
      const rowW = PILLS.length * pillW + (PILLS.length - 1) * pillGap;
      const startX = 960 - rowW / 2;
      PILLS.forEach((label, i) => {
        const at = 57.7 + i * 0.16;
        const u = E.outBack(prog(t, at, at + 0.5), 1.3);
        if (u <= 0) return;
        const px = startX + i * (pillW + pillGap) + pillW / 2;
        const py = 874;
        const wave = Math.max(0, 1 - Math.abs((t - 58.6) * 2.2 - i) * 0.9);
        ctx.save();
        ctx.globalAlpha = clamp(u);
        ctx.translate(px, py + (1 - clamp(u)) * 18);
        ctx.scale(lerp(0.85, 1, clamp(u)), lerp(0.85, 1, clamp(u)));
        KS.card(ctx, -pillW / 2, -26, pillW, 52, 26, {
          blur: 20,
          offsetY: 8,
          fill: wave > 0.2 ? "#effbf7" : "rgba(255,255,255,0.88)",
          stroke: wave > 0.2 ? C.accentBright : "rgba(18,62,56,0.12)",
          lineWidth: wave > 0.2 ? 2 : 1.5,
        });
        ctx.fillStyle = [C.warmBright, C.accentBright, C.skyBright, C.violet, C.accent][i];
        KS.circle(ctx, -pillW / 2 + 24, 0, 5.5);
        ctx.fill();
        KS.text(ctx, label, 8, 8, { size: 20, weight: 700, color: C.ink, align: "center" });
        ctx.restore();
      });

      // 结尾柔和星芒微闪（伴随五声音阶尾音）
      if (t > 57.2) {
        const twinkle = [
          [680, 290, C.mint, 0.2],
          [1255, 310, C.gold, 1.3],
          [740, 440, C.skyBright, 2.5],
          [1210, 460, C.violet, 3.8],
        ];
        twinkle.forEach(([sx, sy, col, ph]) => {
          const a = (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + ph))) * ease(t, 57.2, 58.0);
          KS.sparkle(ctx, sx, sy, 14 * a, col, a * 0.85, t * 0.6 + ph);
        });
      }

      // 片尾优雅淡入暖白（61.4 – 62.5s）
      const endFade = ease(t, 61.45, 62.45, E.inOutCubic);
      if (endFade > 0) {
        ctx.fillStyle = KS.rgba(C.canvas, endFade);
        ctx.fillRect(0, 0, W, H);
      }
    },
  });
})();
