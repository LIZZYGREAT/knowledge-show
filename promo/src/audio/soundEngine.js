/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 48kHz 立体声确定性 Web Audio 离线合成引擎
 * 声学美学：暖木马林巴 + 原声拨弦木吉他 + 柔和毡琴和声 + 纸张/折页/玻璃/响指/合页拟音
 * 严格绑定 timeline.js 中的 AUDIO_CUES 时间戳，音画误差 0 ms
 */

import { TOTAL_DURATION, AUDIO_CUES } from "../config/timeline.js";
import { mulberry32, clamp } from "../core/math.js";

const SAMPLE_RATE = 48000;
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function createNoiseBuffer(ctx, seconds = 2.0, seed = 2026) {
  const len = Math.floor(SAMPLE_RATE * seconds);
  const buf = ctx.createBuffer(1, len, SAMPLE_RATE);
  const data = buf.getChannelData(0);
  const rand = mulberry32(seed);
  // 柔和粉红化白噪，更接近真实纸张纤维与空气感
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = rand() * 2 - 1;
    b0 = 0.997 * b0 + w * 0.029;
    b1 = 0.985 * b1 + w * 0.032;
    b2 = 0.950 * b2 + w * 0.048;
    data[i] = clamp((b0 + b1 + b2 + w * 0.18) * 1.4, -1, 1);
  }
  return buf;
}

function createWarmRoomImpulse(ctx, seconds = 2.1, decay = 3.4) {
  const len = Math.floor(SAMPLE_RATE * seconds);
  const buf = ctx.createBuffer(2, len, SAMPLE_RATE);
  const rand = mulberry32(9917);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, decay);
      const raw = (rand() * 2 - 1) * env;
      lp = lp * 0.68 + raw * 0.32; // 温暖书房木质混响，抑制刺耳高频
      d[i] = lp;
    }
  }
  return buf;
}

/**
 * 离线合成完整 165s 48kHz 立体声 AudioBuffer
 */
export async function renderSoundtrackBuffer(duration = TOTAL_DURATION) {
  const totalSamples = Math.ceil(SAMPLE_RATE * duration);
  const ctx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE);
  const noiseBuf = createNoiseBuffer(ctx, 2.5, 4201);

  // 总线 + 柔缓压缩 + 结尾 2.5s 干净自然收束
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.86, 0);
  master.gain.setValueAtTime(0.86, Math.max(0, duration - 2.6));
  master.gain.linearRampToValueAtTime(0.0, Math.max(0.1, duration - 0.15));

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 2.8;
  comp.attack.value = 0.008;
  comp.release.value = 0.22;
  master.connect(comp).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = createWarmRoomImpulse(ctx);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.28;
  reverb.connect(wetGain).connect(master);

  const dryGain = ctx.createGain();
  dryGain.connect(master);

  const route = (node, pan = 0, wetAmt = 0.5) => {
    let out = node;
    if (Math.abs(pan) > 0.01) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      out.connect(p);
      out = p;
    }
    out.connect(dryGain);
    if (wetAmt > 0.01) {
      const wg = ctx.createGain();
      wg.gain.value = wetAmt;
      out.connect(wg).connect(reverb);
    }
  };

  // ── 乐器 1：温暖花梨木马林巴（主旋律主角） ─────────────────────────────
  const playMarimba = (t, midi, vel = 0.22, dur = 0.65, pan = 0) => {
    if (t < 0 || t >= duration - 0.08) return;
    const f0 = midiToHz(midi);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(f0, t);

    // 马林巴标志性第 4 泛音（2 个八度处极短木质敲击泛音）
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(f0 * 3.98, t);

    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.linearRampToValueAtTime(vel, t + 0.006);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(vel * 0.24, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

    osc1.connect(g1);
    osc2.connect(g2);
    route(g1, pan, 0.42);
    route(g2, pan, 0.2);

    osc1.start(t);
    osc1.stop(t + dur + 0.04);
    osc2.start(t);
    osc2.stop(t + 0.08);
  };

  // ── 乐器 2：原声木吉他指弹（温暖分解和弦基底） ─────────────────────────
  const playGuitar = (t, midi, vel = 0.14, dur = 1.4, pan = -0.18) => {
    if (t < 0 || t >= duration - 0.1) return;
    const f0 = midiToHz(midi);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f0, t);

    const oscSub = ctx.createOscillator();
    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(f0 * 2, t);

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(Math.min(4200, f0 * 7.5), t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(380, f0 * 1.9), t + dur * 0.75);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const gSub = ctx.createGain();
    gSub.gain.value = 0.18;

    osc.connect(filt);
    oscSub.connect(gSub).connect(filt);
    filt.connect(g);
    route(g, pan, 0.35);

    osc.start(t);
    osc.stop(t + dur + 0.05);
    oscSub.start(t);
    oscSub.stop(t + dur + 0.05);
  };

  // ── 乐器 3：暖纸空气毡琴铺底（极克制、烘托情绪呼吸） ───────────────────
  const playFeltPad = (t, midis, vel = 0.045, dur = 4.2) => {
    if (t < 0 || t >= duration - 0.5) return;
    for (let i = 0; i < midis.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(midiToHz(midis[i]), t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel, t + Math.min(1.1, dur * 0.32));
      g.gain.setValueAtTime(vel * 0.85, t + Math.max(1.2, dur - 1.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      route(g, (i - (midis.length - 1) * 0.5) * 0.25, 0.65);
      osc.start(t);
      osc.stop(t + dur + 0.06);
    }
  };

  // ── 拟音工具：纸张摩擦 / 折纸翻页 / 玻璃轻叩 / 响指 / 按键 ───────────────
  const playPaperWhoosh = (t, dur = 0.32, freqStart = 900, freqEnd = 2400, vel = 0.16, pan = 0) => {
    if (t < 0 || t >= duration - 0.05) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.Q.value = 1.6;
    filt.frequency.setValueAtTime(freqStart, t);
    filt.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + dur * 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filt).connect(g);
    route(g, pan, 0.22);
    src.start(t, 0.1, dur + 0.05);
  };

  const playGlassChime = (t, freq = 1318.5, vel = 0.14, dur = 1.15, pan = 0) => {
    if (t < 0 || t >= duration - 0.05) return;
    [1, 2.756].forEach((ratio, idx) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * ratio, t);
      const g = ctx.createGain();
      const v = idx === 0 ? vel : vel * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (idx + 1));
      o.connect(g);
      route(g, pan, 0.58);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  };

  const playClick = (t, freq = 1850, vel = 0.12, pan = 0) => {
    if (t < 0 || t >= duration - 0.04) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.35, t + 0.032);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
    o.connect(g);
    route(g, pan, 0.12);
    o.start(t);
    o.stop(t + 0.045);
  };

  const playSnap = (t, vel = 0.18, pan = 0) => {
    playPaperWhoosh(t, 0.055, 2200, 4200, vel, pan);
    playClick(t + 0.004, 2400, vel * 0.85, pan);
  };

  // =========================================================================
  // 一、全片主旋律与和声编排（F 大调 / D 小调温暖刊物室内乐，108 BPM，beat=0.5556s）
  // =========================================================================
  const beat = 60 / 108;
  // 温暖和弦进行：Fmaj7 -> Dm9 -> Bbmaj7 -> C6/9
  const CHORDS = [
    { bass: 53, arp: [60, 64, 69, 72, 76], pad: [53, 60, 64, 69] },
    { bass: 50, arp: [57, 60, 64, 69, 72], pad: [50, 57, 60, 64] },
    { bass: 46, arp: [53, 57, 62, 65, 69], pad: [46, 53, 57, 62] },
    { bass: 48, arp: [55, 60, 62, 67, 72], pad: [48, 55, 60, 64] },
  ];

  // 从 9.2s（立体书彩虹绽放瞬间）精准入拍，直至 159.5s 收束（14.0-15.1s 钩子处轻巧停顿半拍！）
  const startBarTime = AUDIO_CUES.melodyEnter;
  const barDur = beat * 4;
  const numBars = Math.floor((159.4 - startBarTime) / barDur);

  const marimbaPattern = [
    [0, 3, 0.22],
    [1, 4, 0.16],
    [1.5, 2, 0.18],
    [2.5, 3, 0.20],
    [3.0, 1, 0.15],
    [3.5, 4, 0.17],
  ];

  for (let b = 0; b < numBars; b++) {
    const tBar = startBarTime + b * barDur;
    const ch = CHORDS[b % CHORDS.length];

    // 钩子停顿窗口（14.0 – 15.1s）保持俏皮安静，突出捏改紫光的停顿反差
    if (tBar >= 13.6 && tBar < 15.0) continue;

    // 段落能量曲线：第三幕彩虹高光与第四幕精修微调饱满温暖，第二幕输入与第五幕尾声更轻柔透气
    let energy = 1.0;
    if (tBar >= 21.5 && tBar < 31.2) energy = 0.56;
    else if (tBar >= 52.0 && tBar < 83.0) energy = 1.15;
    else if (tBar >= 92.0 && tBar < 101.0) energy = 0.78;
    else if (tBar >= 115.0 && tBar < 139.0) energy = 1.12;
    else if (tBar >= 151.0) energy = 0.65;

    // 温暖原声木吉他低音与分解和弦
    playGuitar(tBar, ch.bass, 0.14 * energy, barDur * 0.95, -0.22);
    playGuitar(tBar + beat * 1.0, ch.arp[0], 0.10 * energy, beat * 2.2, -0.14);
    playGuitar(tBar + beat * 2.0, ch.arp[1], 0.11 * energy, beat * 2.1, 0.16);
    playGuitar(tBar + beat * 3.0, ch.arp[2], 0.10 * energy, beat * 1.9, 0.22);

    // 轻柔毡琴和声每两小节呼吸一次
    if (b % 2 === 0 && tBar < 156.0) {
      playFeltPad(tBar, ch.pad, 0.036 * energy, barDur * 1.9);
    }

    // 灵动花梨木马林巴主旋律
    const activeMarimba = tBar < 152.0;
    if (activeMarimba) {
      for (const [bOff, noteIdx, vel] of marimbaPattern) {
        const tn = tBar + bOff * beat;
        if (tn >= 13.95 && tn <= 15.15) continue;
        const idx = (noteIdx + (b % 2 === 1 ? 1 : 0)) % ch.arp.length;
        const octave = (b % 4 === 2 && bOff >= 2.5) ? 12 : 0;
        playMarimba(
          tn,
          ch.arp[idx] + octave,
          vel * energy * 0.78,
          0.55,
          (bOff - 1.75) * 0.16
        );
      }
    }
  }

  // =========================================================================
  // 二、0ms 精准同步拟音与高光时刻事件（对齐 AUDIO_CUES）
  // =========================================================================

  // 第一幕：0:00.15 单点破晓清音 -> 暖光展开纸风 -> 墨滴唤醒句号 -> 折纸弹起 -> 玻璃轻叩 -> 拨动紫光 -> 倒卷光标
  playGlassChime(0.15, 1396.9, 0.13, 1.8, 0.0);
  playPaperWhoosh(0.65, 1.5, 420, 1240, 0.085, 0.0);
  playGlassChime(2.95, 1760.0, 0.11, 1.0, -0.15);
  playClick(3.95, 1420, 0.09, -0.1);
  // 立体书清脆弹起
  playPaperWhoosh(AUDIO_CUES.origamiPop, 0.28, 650, 2600, 0.24, 0.05);
  playSnap(AUDIO_CUES.origamiPop + 0.08, 0.16, 0.1);
  // 温润玻璃棱镜轻叩
  playGlassChime(AUDIO_CUES.glassClink, 1396.9, 0.18, 1.4, 0.0);
  playGlassChime(AUDIO_CUES.glassClink + 0.12, 1760.0, 0.12, 1.2, 0.2);
  // 钩子：捏住紫光并拨弦
  playSnap(AUDIO_CUES.violetPinch, 0.14, 0.25);
  playGuitar(AUDIO_CUES.violetPluck, 77, 0.22, 1.1, 0.28);
  playGlassChime(AUDIO_CUES.violetPluck + 0.06, 1567.98, 0.12, 0.9, 0.25);
  // 彩虹倒卷回光标
  playPaperWhoosh(AUDIO_CUES.rewindSweep, 1.1, 2200, 560, 0.14, 0);
  playClick(AUDIO_CUES.cursorLand, 1680, 0.12, -0.15);

  // 第二幕：打字键入 -> 点选模式 -> 确认 -> 光学色散 -> 弹飞误区 -> 游丝绷直 -> 划开舞台
  for (let i = 0; i < 14; i++) {
    playClick(AUDIO_CUES.typingStart + i * 0.22, 1720 + (i % 4) * 140, 0.075, -0.12 + i * 0.02);
  }
  playClick(AUDIO_CUES.modeClick, 1950, 0.13, 0.18);
  playSnap(AUDIO_CUES.submitClick, 0.16, 0.28);
  // 光学拆解三音和弦
  playGlassChime(AUDIO_CUES.prismSplit, 1046.5, 0.14, 1.3, -0.2);
  playGlassChime(AUDIO_CUES.prismSplit + 0.14, 1318.5, 0.13, 1.3, 0.0);
  playGlassChime(AUDIO_CUES.prismSplit + 0.28, 1568.0, 0.13, 1.4, 0.24);
  // 弹飞误区纸签
  playPaperWhoosh(AUDIO_CUES.mythFlick, 0.34, 900, 3400, 0.22, 0.35);
  playSnap(AUDIO_CUES.mythFlick, 0.18, 0.2);
  // 游丝绷直与波峰划开
  playPaperWhoosh(AUDIO_CUES.rulerTighten, 0.45, 700, 1800, 0.12, 0);
  playPaperWhoosh(AUDIO_CUES.arcSlice, 0.48, 1100, 2900, 0.19, 0);
  playGlassChime(AUDIO_CUES.arcSlice + 0.05, 1396.9, 0.13, 1.2, 0);

  // 第三幕：微观入镜 -> 全景彩虹 -> 两次厚纸中轴翻页 -> 跨主题变奏
  playGlassChime(AUDIO_CUES.microWaveChime, 1174.6, 0.12, 1.4, -0.1);
  playGlassChime(AUDIO_CUES.panoramaBloom, 1396.9, 0.15, 1.8, 0);
  // 厚杂志纸页两次优雅翻折
  playPaperWhoosh(AUDIO_CUES.pageFlip1, 0.56, 520, 2100, 0.24, 0.15);
  playPaperWhoosh(AUDIO_CUES.pageFlip1 + 0.32, 0.24, 1600, 680, 0.16, -0.25);
  playPaperWhoosh(AUDIO_CUES.pageFlip2, 0.56, 540, 2200, 0.24, 0.15);
  playPaperWhoosh(AUDIO_CUES.pageFlip2 + 0.32, 0.24, 1650, 720, 0.16, -0.25);
  // 跨主题：肥皂泡、PN 结、骰子
  playGlassChime(AUDIO_CUES.morphSoap, 1568.0, 0.14, 0.9, 0);
  playSnap(AUDIO_CUES.morphPn, 0.18, 0);
  playMarimba(AUDIO_CUES.morphPn + 0.06, 77, 0.22, 0.5, 0.2);
  playClick(AUDIO_CUES.morphDice, 1420, 0.15, -0.15);
  playClick(AUDIO_CUES.morphDice + 0.11, 1680, 0.14, 0.18);

  // 第四幕：退镜入台 -> BRACKET 咬合 -> 输入指令 -> 框内水墨涟漪 -> v2 翻转 -> 描图纸 -> 微调二连击 -> 点击导出
  playPaperWhoosh(AUDIO_CUES.workbenchPullback, 0.85, 1400, 520, 0.13, 0);
  playSnap(AUDIO_CUES.bracketSnap, 0.22, -0.1);
  playGlassChime(AUDIO_CUES.bracketSnap + 0.03, 1396.9, 0.10, 0.7, -0.1);
  for (let i = 0; i < 24; i++) {
    playClick(AUDIO_CUES.revTypeStart + i * 0.25, 1650 + (i % 5) * 130, 0.065, 0.45);
  }
  playClick(AUDIO_CUES.revApplyClick, 2100, 0.15, 0.45);
  // 框内暖杏水墨涟漪爆发（温暖清脆的水墨泛音和弦）
  playPaperWhoosh(AUDIO_CUES.rippleBurst, 0.72, 620, 1950, 0.18, -0.12);
  playGlassChime(AUDIO_CUES.rippleBurst + 0.05, 1046.5, 0.17, 1.4, -0.18);
  playGlassChime(AUDIO_CUES.rippleBurst + 0.18, 1396.9, 0.16, 1.5, 0.0);
  playGlassChime(AUDIO_CUES.rippleBurst + 0.32, 1760.0, 0.16, 1.6, 0.18);
  // v2 纸签清脆翻转
  playSnap(AUDIO_CUES.v2BadgeFlip, 0.17, -0.32);
  playMarimba(AUDIO_CUES.v2BadgeFlip + 0.03, 81, 0.24, 0.7, -0.25);
  // 描图纸轻划对比
  playPaperWhoosh(AUDIO_CUES.tracingWipe, 1.15, 780, 1750, 0.14, 0);
  playPaperWhoosh(AUDIO_CUES.tracingWipe + 2.2, 1.1, 1650, 760, 0.12, 0);
  // 快节奏微调二连击（响指 + 木琴）
  playSnap(AUDIO_CUES.microSnap1, 0.20, -0.15);
  playMarimba(AUDIO_CUES.microSnap1 + 0.04, 79, 0.24, 0.55, -0.1);
  playSnap(AUDIO_CUES.microSnap2, 0.20, 0.15);
  playMarimba(AUDIO_CUES.microSnap2 + 0.04, 84, 0.24, 0.55, 0.12);
  // 点击「导出 MP4」
  playSnap(AUDIO_CUES.exportClick, 0.18, 0.45);

  // 第五幕：双色标尺扫屏 -> 印章落定 -> 丝带汇聚 -> 品牌图标合拢 -> 清澈木琴泛音与轻微合页声
  playPaperWhoosh(AUDIO_CUES.rulerSweepStart, 2.2, 680, 1900, 0.12, -0.4);
  playGlassChime(AUDIO_CUES.rulerSweepStart + 0.6, 1046.5, 0.11, 2.2, -0.2);
  playGlassChime(AUDIO_CUES.rulerSweepStart + 3.4, 1396.9, 0.11, 2.2, 0.2);
  playSnap(AUDIO_CUES.exportStamp, 0.16, 0.4);
  playGlassChime(AUDIO_CUES.exportStamp + 0.04, 1760.0, 0.14, 1.3, 0.35);

  // 2:31.5–2:36.2 原画丝滑编织消融和声泛音过渡
  playPaperWhoosh(152.0, 2.6, 980, 420, 0.09, 0.0);
  playGlassChime(153.2, 1046.5, 0.10, 2.4, -0.18);
  playGlassChime(154.6, 1318.5, 0.11, 2.2, 0.15);

  // 品牌收尾：清澈温暖的 Fmaj9 木琴泛音 + 柔和合页声
  playMarimba(AUDIO_CUES.spineDraw, 69, 0.22, 1.4, -0.15);
  playMarimba(AUDIO_CUES.logoClose, 77, 0.26, 2.2, 0.0);
  playMarimba(AUDIO_CUES.logoClose + 0.16, 81, 0.22, 2.3, 0.12);
  playGlassChime(AUDIO_CUES.logoClose + 0.28, 1396.9, 0.16, 2.6, 0.0);
  playFeltPad(AUDIO_CUES.logoClose, [53, 60, 64, 69, 72], 0.048, 3.8);
  // 轻微优雅的精装刊物合页声
  playPaperWhoosh(AUDIO_CUES.bookClose, 0.36, 720, 260, 0.15, 0);
  playClick(AUDIO_CUES.bookClose + 0.26, 420, 0.09, 0);

  return ctx.startRendering();
}

/**
 * 将 AudioBuffer 编码为标准 16-bit PCM WAV Uint8Array（48kHz 立体声）
 */
export function encodeWavBytes(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) channels.push(audioBuffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = clamp(channels[c][i], -1, 1);
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}

/**
 * 分块转 Base64（避免大 WAV 文件触发栈溢出）
 */
export function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    parts.push(String.fromCharCode.apply(null, sub));
  }
  return btoa(parts.join(""));
}

export async function renderAudioWavBase64(duration = TOTAL_DURATION) {
  const buf = await renderSoundtrackBuffer(duration);
  const wav = encodeWavBytes(buf);
  return bytesToBase64(wav);
}
