/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 全局主调度器与确定性渲染入口
 * 暴露 window.__renderFrame(frameIndex, fps) 与 window.__PROMO__ 桥接供 Playwright 逐帧采集
 */

import { STAGE_W, STAGE_H, DEFAULT_FPS } from "./config/tokens.js";
import { TOTAL_DURATION, ACTS, getActAt, getActiveCaption } from "./config/timeline.js";
import { clamp } from "./core/math.js";
import { Camera2D } from "./core/camera.js";
import { drawPaperGrainOverlay, drawEditorialCaption } from "./core/paper.js";
import { FrontendStage } from "./ui/frontendStage.js";
import { renderAct01 } from "./scenes/act01_awaken.js";
import { renderAct02 } from "./scenes/act02_discover.js";
import { renderAct03 } from "./scenes/act03_theater.js";
import { renderAct04 } from "./scenes/act04_workbench.js";
import { renderAct05 } from "./scenes/act05_delivery.js";
import { renderSoundtrackBuffer, renderAudioWavBase64 } from "./audio/soundEngine.js";

const isCapture = new URLSearchParams(window.location.search).get("capture") === "1";
if (isCapture) {
  document.body.classList.add("capture-mode");
}

const viewportEl = document.getElementById("stage-viewport");
const stageRootEl = document.getElementById("stage-root");
const worldCanvas = document.getElementById("stage-world");
const overlayCanvas = document.getElementById("stage-overlay");
const uiMountEl = document.getElementById("stage-ui");

const worldCtx = worldCanvas.getContext("2d");
const overlayCtx = overlayCanvas.getContext("2d");
const camera = new Camera2D();
const ui = new FrontendStage(uiMountEl);

const ACT_RENDERERS = {
  act01: renderAct01,
  act02: renderAct02,
  act03: renderAct03,
  act04: renderAct04,
  act05: renderAct05,
};

/**
 * 确定性单帧纯渲染函数：任意 t ∈ [0, 165.0] 均可瞬间随机 Seek 且结果逐像素一致
 */
export function renderAt(timeSec) {
  const t = clamp(Number(timeSec) || 0, 0, TOTAL_DURATION);

  worldCtx.setTransform(1, 0, 0, 1, 0, 0);
  worldCtx.clearRect(0, 0, STAGE_W, STAGE_H);
  overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
  overlayCtx.clearRect(0, 0, STAGE_W, STAGE_H);
  camera.reset();

  const { act, localT, progress } = getActAt(t);
  const fn = ACT_RENDERERS[act.id];
  if (fn) {
    fn({ worldCtx, overlayCtx, camera, ui, t, localT, progress });
  }

  // 同步 Layer 2 DOM 摄像机变换矩阵
  ui.syncCamera(camera);

  // 帧感知刊物旁白字幕（Layer 3：按场景留白与画风灵活落位装帧）
  const cap = getActiveCaption(t);
  if (cap) {
    drawEditorialCaption(overlayCtx, cap, cap.alpha, STAGE_W, STAGE_H);
  }

  // 顶层全局世界锁定微纸纹 multiply 叠层（确保 Canvas 与真实 DOM 融为同一张纸并消除 H.264 色带）
  drawPaperGrainOverlay(overlayCtx, STAGE_W, STAGE_H, camera, 0.036);

  return t;
}

/**
 * 方案第 6.1 节标准统一时钟入口：window.__renderFrame(frameIndex, fps)
 */
export function renderFrame(frameIndex, fps = DEFAULT_FPS) {
  const safeFps = fps > 0 ? fps : DEFAULT_FPS;
  const t = clamp(frameIndex / safeFps, 0, TOTAL_DURATION);
  return renderAt(t);
}

window.__renderFrame = renderFrame;
window.__PROMO__ = {
  version: "2.0",
  duration: TOTAL_DURATION,
  width: STAGE_W,
  height: STAGE_H,
  fps: DEFAULT_FPS,
  acts: ACTS,
  renderAt,
  renderFrame,
  renderAudioWavBase64: () => renderAudioWavBase64(TOTAL_DURATION),
};

// ── 等比缩放 1920x1080 舞台适配任意视口（预览模式与任意分辨率采集通用） ──
function fitStageToViewport() {
  const rect = viewportEl.getBoundingClientRect();
  const sx = rect.width / STAGE_W;
  const sy = rect.height / STAGE_H;
  const scale = Math.min(sx, sy);
  stageRootEl.style.transform = `scale(${scale.toFixed(6)})`;
}
fitStageToViewport();
window.addEventListener("resize", fitStageToViewport);

// 首帧立即渲染
renderAt(0);

// ── 交互预览模式控制条（?capture=1 时不激活） ────────────────────────────
if (!isCapture) {
  const startOverlay = document.getElementById("start-overlay");
  const btnPlay = document.getElementById("btn-play");
  const btnMute = document.getElementById("btn-mute");
  const btnReset = document.getElementById("btn-reset");
  const hudTime = document.getElementById("hud-time");
  const hudScrubber = document.getElementById("hud-scrubber");
  const hudActs = document.getElementById("hud-acts");

  let playing = false;
  let muted = false;
  let currentTime = 0;
  let rafId = null;
  let lastPerf = 0;

  // Web Audio 实时回放（懒加载离线渲染好的完整配乐）
  let audioCtx = null;
  let audioBuffer = null;
  let audioSource = null;
  let audioGain = null;
  let audioReadyPromise = null;

  function ensureAudio() {
    if (!audioReadyPromise) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      audioGain = audioCtx.createGain();
      audioGain.gain.value = muted ? 0 : 1;
      audioGain.connect(audioCtx.destination);
      audioReadyPromise = renderSoundtrackBuffer(TOTAL_DURATION).then((buf) => {
        audioBuffer = buf;
        return buf;
      });
    }
    return audioReadyPromise;
  }

  function stopAudio() {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch {}
      audioSource.disconnect();
      audioSource = null;
    }
  }

  function startAudioAt(t) {
    stopAudio();
    if (!audioBuffer || !audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioGain);
    src.start(0, clamp(t, 0, TOTAL_DURATION - 0.05));
    audioSource = src;
  }

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4, "0");
    return `${String(m).padStart(2, "0")}:${s}`;
  };

  // 构建五幕跳转按钮
  const actButtons = ACTS.map((act) => {
    const b = document.createElement("button");
    b.className = "hud-act";
    b.textContent = act.name;
    b.addEventListener("click", () => seekTo(act.start));
    hudActs.appendChild(b);
    return { act, el: b };
  });

  function updateHud(t) {
    hudTime.textContent = `${fmtTime(t)} / ${fmtTime(TOTAL_DURATION)}`;
    hudScrubber.value = t.toFixed(2);
    const { act } = getActAt(t);
    for (const item of actButtons) {
      item.el.classList.toggle("is-current", item.act.id === act.id);
    }
  }

  function seekTo(t) {
    currentTime = clamp(t, 0, TOTAL_DURATION);
    renderAt(currentTime);
    updateHud(currentTime);
    if (playing) startAudioAt(currentTime);
  }

  async function play() {
    startOverlay.classList.add("hidden");
    if (currentTime >= TOTAL_DURATION - 0.05) currentTime = 0;
    playing = true;
    btnPlay.textContent = "暂停";
    lastPerf = performance.now();
    await ensureAudio();
    if (playing) startAudioAt(currentTime);
    tick();
  }

  function pause() {
    playing = false;
    btnPlay.textContent = "播放";
    stopAudio();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick() {
    if (!playing) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastPerf) / 1000);
    lastPerf = now;
    currentTime += dt;
    if (currentTime >= TOTAL_DURATION) {
      currentTime = TOTAL_DURATION;
      renderAt(currentTime);
      updateHud(currentTime);
      pause();
      return;
    }
    renderAt(currentTime);
    updateHud(currentTime);
    rafId = requestAnimationFrame(tick);
  }

  startOverlay.addEventListener("click", () => play());
  btnPlay.addEventListener("click", () => (playing ? pause() : play()));
  btnReset.addEventListener("click", () => {
    seekTo(0);
    if (!playing) play();
  });
  btnMute.addEventListener("click", () => {
    muted = !muted;
    btnMute.textContent = muted ? "取消静音" : "静音";
    if (audioGain) audioGain.gain.value = muted ? 0 : 1;
  });
  hudScrubber.addEventListener("input", () => {
    seekTo(Number(hudScrubber.value));
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      playing ? pause() : play();
    } else if (e.code === "ArrowRight") {
      seekTo(currentTime + 2);
    } else if (e.code === "ArrowLeft") {
      seekTo(currentTime - 2);
    } else if (e.key === "r" || e.key === "R") {
      seekTo(0);
    } else if (e.key === "m" || e.key === "M") {
      btnMute.click();
    }
  });

  updateHud(0);
}
