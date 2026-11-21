/*
 * Knowledge.Show(me) 宣传片 —— 渲染主循环、浏览器影院播放器与无头导出桥接
 */
(function () {
  "use strict";
  const KS = window.KS;
  KS.DURATION = 62.5;

  KS.CHAPTERS_META = [
    { id: "spark", name: "好奇火花", t: 0.0 },
    { id: "anti-ppt", name: "告别 PPT", t: 5.0 },
    { id: "logo", name: "品牌登场", t: 12.0 },
    { id: "explore", name: "01 知识探索", t: 17.5 },
    { id: "script", name: "02 脚本编排", t: 25.5 },
    { id: "show", name: "03 动画呈现", t: 31.5 },
    { id: "workbench", name: "04 工作台微调", t: 45.0 },
    { id: "export", name: "05 一键导出", t: 51.5 },
    { id: "finale", name: "品牌收尾", t: 55.5 },
  ];

  KS.render = function (ctx, t, frameIndex = Math.round(t * 30)) {
    const time = KS.clamp(t, 0, KS.DURATION);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    KS.drawBackground(ctx, time);
    KS.drawDust(ctx, time, 1);
    for (const sc of KS.scenes) {
      if (time >= sc.start && time <= sc.end) {
        ctx.save();
        sc.draw(ctx, time);
        ctx.restore();
      }
    }
    if (KS.watermark) KS.watermark(ctx, time);
    if (KS.chapterBar) KS.chapterBar(ctx, time);
    KS.drawGrain(ctx, time, frameIndex);
    ctx.restore();
  };

  function boot() {
    const canvas = document.getElementById("stage");
    if (!canvas) return;
    canvas.width = KS.W;
    canvas.height = KS.H;
    const ctx = canvas.getContext("2d", { alpha: false });

    const params = new URLSearchParams(window.location.search);
    const captureMode = params.get("capture") === "1";
    if (captureMode) document.body.classList.add("capture-mode");

    let playing = false;
    let currentTime = Number(params.get("t")) || 0;
    let lastNow = 0;
    let frameCount = 0;

    // 音频状态（用户点击播放后合成一次并复用）
    let audioCtx = null;
    let audioBuffer = null;
    let audioSource = null;
    let audioGain = null;
    let audioReadyPromise = null;
    let muted = false;

    function ensureAudio() {
      if (audioBuffer) return Promise.resolve(audioBuffer);
      if (audioReadyPromise) return audioReadyPromise;
      audioReadyPromise = KS.buildSoundtrack(KS.DURATION).then((buf) => {
        audioBuffer = buf;
        return buf;
      });
      return audioReadyPromise;
    }

    function stopAudio() {
      if (audioSource) {
        try { audioSource.stop(); } catch {}
        try { audioSource.disconnect(); } catch {}
        audioSource = null;
      }
    }

    async function startAudioAt(t) {
      if (captureMode) return;
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
        audioGain = audioCtx.createGain();
        audioGain.gain.value = muted ? 0 : 1;
        audioGain.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const buf = await ensureAudio();
      if (!playing) return;
      stopAudio();
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(audioGain);
      const offset = KS.clamp(t, 0, Math.max(0, KS.DURATION - 0.05));
      src.start(0, offset);
      audioSource = src;
    }

    // 控件引用
    const btnPlay = document.getElementById("btn-play");
    const btnMute = document.getElementById("btn-mute");
    const btnFull = document.getElementById("btn-full");
    const btnRestart = document.getElementById("btn-restart");
    const scrub = document.getElementById("scrub");
    const timeLabel = document.getElementById("time-label");
    const chapterHost = document.getElementById("chapters");
    const startOverlay = document.getElementById("start-overlay");

    const fmt = (sec) => {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    };

    const chapterBtns = [];
    if (chapterHost) {
      KS.CHAPTERS_META.forEach((ch) => {
        const b = document.createElement("button");
        b.className = "ch-btn";
        b.textContent = ch.name;
        b.addEventListener("click", () => seekTo(ch.t, true));
        chapterHost.appendChild(b);
        chapterBtns.push({ el: b, t: ch.t });
      });
    }

    function syncUI() {
      if (btnPlay) btnPlay.textContent = playing ? "⏸ 暂停" : "▶ 播放";
      if (btnMute) btnMute.textContent = muted ? "🔇 静音" : "🔊 声音";
      if (scrub) scrub.value = String(Math.round((currentTime / KS.DURATION) * 1000));
      if (timeLabel) timeLabel.textContent = `${fmt(currentTime)} / ${fmt(KS.DURATION)}`;
      if (startOverlay) startOverlay.classList.toggle("hidden", playing || currentTime > 0.05 || captureMode);
      let activeIdx = 0;
      for (let i = 0; i < chapterBtns.length; i++) {
        if (currentTime >= chapterBtns[i].t - 0.05) activeIdx = i;
      }
      chapterBtns.forEach((item, i) => item.el.classList.toggle("active", i === activeIdx));
    }

    function drawCurrent() {
      KS.render(ctx, currentTime, frameCount++);
      syncUI();
    }

    function seekTo(t, resumeIfPlaying = true) {
      currentTime = KS.clamp(t, 0, KS.DURATION);
      stopAudio();
      drawCurrent();
      if (playing && resumeIfPlaying) startAudioAt(currentTime);
    }

    function togglePlay() {
      if (playing) {
        playing = false;
        stopAudio();
        syncUI();
      } else {
        if (currentTime >= KS.DURATION - 0.05) currentTime = 0;
        playing = true;
        lastNow = performance.now();
        startAudioAt(currentTime);
        syncUI();
        requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.1, (now - lastNow) / 1000);
      lastNow = now;
      currentTime += dt;
      if (currentTime >= KS.DURATION) {
        currentTime = KS.DURATION;
        playing = false;
        stopAudio();
        drawCurrent();
        return;
      }
      drawCurrent();
      requestAnimationFrame(tick);
    }

    // 交互绑定
    if (btnPlay) btnPlay.addEventListener("click", togglePlay);
    if (startOverlay) startOverlay.addEventListener("click", togglePlay);
    if (canvas && !captureMode) canvas.addEventListener("click", togglePlay);
    if (btnRestart) btnRestart.addEventListener("click", () => {
      currentTime = 0;
      if (!playing) togglePlay();
      else seekTo(0, true);
    });
    if (btnMute) btnMute.addEventListener("click", () => {
      muted = !muted;
      if (audioGain) audioGain.gain.value = muted ? 0 : 1;
      syncUI();
    });
    if (btnFull) btnFull.addEventListener("click", () => {
      const wrap = document.getElementById("player-shell") || document.documentElement;
      if (!document.fullscreenElement) wrap.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    if (scrub) {
      scrub.addEventListener("input", () => {
        const t = (Number(scrub.value) / 1000) * KS.DURATION;
        seekTo(t, false);
      });
      scrub.addEventListener("change", () => {
        if (playing) startAudioAt(currentTime);
      });
    }
    window.addEventListener("keydown", (e) => {
      if (captureMode) return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowRight") seekTo(currentTime + 2, true);
      else if (e.code === "ArrowLeft") seekTo(currentTime - 2, true);
      else if (e.key === "m" || e.key === "M") btnMute?.click();
      else if (e.key === "f" || e.key === "F") btnFull?.click();
      else if (e.key === "r" || e.key === "R") btnRestart?.click();
    });

    // 无头导出桥接 API
    window.__PROMO__ = {
      duration: KS.DURATION,
      width: KS.W,
      height: KS.H,
      chapters: KS.CHAPTERS_META,
      renderAt(t, idx) {
        playing = false;
        stopAudio();
        currentTime = KS.clamp(t, 0, KS.DURATION);
        KS.render(ctx, currentTime, idx ?? Math.round(currentTime * 30));
        return currentTime;
      },
      async renderAudioWavBase64() {
        const buf = await KS.buildSoundtrack(KS.DURATION);
        const wav = KS.encodeWav(buf);
        const bytes = new Uint8Array(wav);
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(bin);
      },
    };

    // 首帧绘制（若非导出模式且未指定 t，默认展示品牌开场画面）
    drawCurrent();
    if (!captureMode) ensureAudio(); // 后台静默预热配乐
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
