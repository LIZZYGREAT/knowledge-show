/*
 * 宣传片配乐：用 Web Audio 离线合成，确定性生成，与画面时间轴逐拍对齐（120 BPM）。
 * 不依赖任何音频素材文件。
 */
(function () {
  "use strict";
  const KS = (window.KS = window.KS || {});
  const SR = 44100;
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function makeNoise(ctx, seconds = 2) {
    const buf = ctx.createBuffer(1, SR * seconds, SR);
    const d = buf.getChannelData(0);
    const r = KS.rng(7);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    return buf;
  }
  function makeImpulse(ctx, seconds = 2.8, decay = 3.2) {
    const len = SR * seconds;
    const buf = ctx.createBuffer(2, len, SR);
    const r = KS.rng(11);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  KS.buildSoundtrack = async function (duration) {
    const ctx = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
    const noise = makeNoise(ctx);

    const master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
    // 整体淡出
    master.gain.setValueAtTime(0.9, duration - 3.2);
    master.gain.linearRampToValueAtTime(0, duration - 0.15);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet).connect(master);
    const dry = ctx.createGain();
    dry.connect(master);
    // 侧链式“呼吸”：伴奏在每拍底鼓处被压低
    const duck = ctx.createGain();
    duck.connect(dry);
    duck.connect(reverb);

    const send = (node, amt = 1, toDuck = true) => {
      const g = ctx.createGain();
      g.gain.value = amt;
      node.connect(g).connect(toDuck ? duck : dry);
      if (!toDuck) {
        const r = ctx.createGain();
        r.gain.value = amt * 0.7;
        node.connect(r).connect(reverb);
      }
      return g;
    };

    function tone({ t, dur, freq, type = "sine", gain = 0.2, attack = 0.01, release = 0.3, cutoff = 0, q = 0.7, detune = 0, pan = 0, toDuck = true, glide = 0 }) {
      if (t > duration) return;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (cutoff) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = cutoff;
        f.Q.value = q;
        node.connect(f);
        node = f;
      }
      node.connect(g);
      let out = g;
      if (pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        out = p;
      }
      send(out, 1, toDuck);
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    function noiseHit({ t, dur, gain = 0.2, type = "highpass", freq = 6000, freqEnd = 0, q = 0.8, attack = 0.002, toDuck = false, pan = 0 }) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g);
      let out = g;
      if (pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        out = p;
      }
      send(out, 1, toDuck);
      s.start(t, (t * 0.37) % 1.5);
      s.stop(t + dur + 0.05);
    }

    function kick(t, gain = 0.9) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g).connect(dry);
      o.start(t);
      o.stop(t + 0.45);
      // 伴奏让位
      duck.gain.setValueAtTime(0.45, t);
      duck.gain.linearRampToValueAtTime(1, t + 0.32);
    }
    function impact(t, size = 1) {
      kick(t, 1.0);
      tone({ t, dur: 2.6, freq: 41, type: "sine", gain: 0.5 * size, attack: 0.005, release: 2.2, toDuck: false, glide: 32 });
      noiseHit({ t, dur: 2.8 * size, gain: 0.22 * size, type: "highpass", freq: 3000, freqEnd: 9000 });
      noiseHit({ t, dur: 0.6, gain: 0.3 * size, type: "lowpass", freq: 900, freqEnd: 120 });
    }
    function riser(t0, t1, gain = 0.16) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2.5;
      f.frequency.setValueAtTime(300, t0);
      f.frequency.exponentialRampToValueAtTime(9000, t1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t1 - 0.02);
      g.gain.linearRampToValueAtTime(0, t1 + 0.02);
      s.connect(f).connect(g);
      send(g, 1, false);
      s.start(t0);
      s.stop(t1 + 0.1);
    }
    function whoosh(t, gain = 0.14) {
      noiseHit({ t: t - 0.35, dur: 0.75, gain, type: "bandpass", freq: 600, freqEnd: 5000, q: 1.6, attack: 0.3 });
    }
    function click(t, gain = 0.06) {
      noiseHit({ t, dur: 0.035, gain, type: "highpass", freq: 4500, toDuck: false });
      tone({ t, dur: 0.05, freq: 1800, type: "sine", gain: gain * 0.6, attack: 0.001, release: 0.04, toDuck: false });
    }
    function bell(t, m, gain = 0.12, pan = 0) {
      tone({ t, dur: 2.4, freq: midi(m), type: "sine", gain, attack: 0.003, release: 2.3, pan, toDuck: false });
      tone({ t, dur: 1.2, freq: midi(m) * 2.76, type: "sine", gain: gain * 0.25, attack: 0.002, release: 1.1, pan, toDuck: false });
    }

    // —— A：黑暗中的好奇心（0–5s）——
    [45, 52, 57, 60, 64].forEach((m, i) =>
      tone({ t: 0, dur: 5.4, freq: midi(m), type: "triangle", gain: 0.05, attack: 2.2, release: 1.2, cutoff: 900, detune: (i - 2) * 6, toDuck: false })
    );
    const pent = [81, 84, 86, 88, 91, 93, 96];
    const rr = KS.rng(99);
    for (let i = 0; i < 14; i++) {
      const t = 0.4 + i * 0.31 + rr() * 0.12;
      bell(t, pent[Math.floor(rr() * pent.length)], 0.035 + rr() * 0.03, rr() * 1.4 - 0.7);
    }
    riser(2.6, 5.0, 0.2);
    noiseHit({ t: 3.9, dur: 1.1, gain: 0.12, type: "highpass", freq: 2000, freqEnd: 8000, attack: 1.05 });

    // —— B：主律动（5–55.5s）——
    // 和弦进行（每小节 2s）：Fmaj7 – G6 – Em7 – Am7
    const prog = [
      { root: 41, notes: [53, 57, 60, 64] },
      { root: 43, notes: [55, 59, 62, 64] },
      { root: 40, notes: [52, 55, 59, 62] },
      { root: 45, notes: [57, 60, 64, 67] },
    ];
    const beat = 0.5;
    const t0 = 5.0;
    const tEnd = 55.5;
    const energy = (t) => {
      if (t < 12) return 0.55;
      if (t < 17.5) return 0.75;
      if (t < 45) return 1;
      if (t < 51.5) return 0.8;
      return 0.95;
    };
    for (let bar = 0; t0 + bar * 2 < tEnd; bar++) {
      const tb = t0 + bar * 2;
      const ch = prog[bar % 4];
      const en = energy(tb);
      // pad
      ch.notes.forEach((m, i) => {
        tone({ t: tb, dur: 2.15, freq: midi(m), type: "sawtooth", gain: 0.018 * en, attack: 0.25, release: 0.6, cutoff: 1400 + en * 600, detune: -7, pan: -0.3 + i * 0.2 });
        tone({ t: tb, dur: 2.15, freq: midi(m), type: "sawtooth", gain: 0.018 * en, attack: 0.25, release: 0.6, cutoff: 1400 + en * 600, detune: 7, pan: 0.3 - i * 0.2 });
      });
      for (let b = 0; b < 4; b++) {
        const t = tb + b * beat;
        if (t >= tEnd) break;
        // bass：八分音符
        tone({ t, dur: 0.22, freq: midi(ch.root), type: "triangle", gain: 0.2 * en, attack: 0.005, release: 0.15, cutoff: 600 });
        tone({ t: t + 0.25, dur: 0.2, freq: midi(ch.root + 12), type: "triangle", gain: 0.11 * en, attack: 0.005, release: 0.14, cutoff: 700 });
        if (t >= 12 || b % 2 === 0) kick(t, 0.75 * en);
        if (t >= 17.5 && (b === 1 || b === 3) && !(t >= 45 && t < 51.5 && b === 1)) {
          noiseHit({ t, dur: 0.22, gain: 0.13, type: "bandpass", freq: 1800, q: 0.9, toDuck: false });
          tone({ t, dur: 0.12, freq: 190, type: "triangle", gain: 0.08, attack: 0.002, release: 0.1, toDuck: false });
        }
        // hats
        noiseHit({ t: t + 0.25, dur: 0.06, gain: 0.05 * en, type: "highpass", freq: 8000, pan: 0.25 });
        if (t >= 17.5) noiseHit({ t: t + 0.125, dur: 0.03, gain: 0.022, type: "highpass", freq: 9000, pan: -0.25 });
        if (t >= 17.5) noiseHit({ t: t + 0.375, dur: 0.03, gain: 0.022, type: "highpass", freq: 9000, pan: -0.25 });
      }
      // 拨弦琶音：十六分音符
      const arp = [0, 1, 2, 3, 2, 1, 3, 0];
      for (let k = 0; k < 16; k++) {
        const t = tb + k * 0.125;
        if (t >= tEnd) break;
        const m = ch.notes[arp[k % 8]] + 12 + (k >= 8 && k % 3 === 0 ? 12 : 0);
        tone({ t, dur: 0.28, freq: midi(m), type: "triangle", gain: 0.055 * en, attack: 0.003, release: 0.25, cutoff: 3200, pan: k % 2 ? 0.35 : -0.35 });
        tone({ t, dur: 0.18, freq: midi(m + 12), type: "sine", gain: 0.02 * en, attack: 0.002, release: 0.16, pan: k % 2 ? -0.2 : 0.2 });
      }
    }

    // —— 重音与转场 ——
    impact(5.0, 1.1);
    [72, 76, 79, 84].forEach((m, i) => bell(5.0 + i * 0.06, m, 0.06));
    riser(10.6, 12.0, 0.12);
    impact(12.0, 0.8);
    [84, 88, 91, 96].forEach((m, i) => bell(12.15 + i * 0.12, m, 0.07, (i - 1.5) * 0.4));
    bell(14.5, 100, 0.05);
    [17.5, 25.5, 31.5, 39.5, 42.2, 45.0, 51.5].forEach((t) => whoosh(t));
    // 打字声与点击
    const typed = Array.from("为什么两个骰子最容易掷出 7？");
    typed.forEach((_, i) => click(18.0 + i * 0.11, 0.045));
    click(20.0, 0.09);
    bell(24.2, 88, 0.05);
    // 骰子落地
    [32.55, 32.75].forEach((t) => noiseHit({ t, dur: 0.12, gain: 0.12, type: "bandpass", freq: 1200, q: 1.5 }));
    // 组合飞入柱状图时的颗粒音
    for (let i = 0; i < 36; i++) {
      const t = 35.6 + i * 0.07;
      tone({ t, dur: 0.12, freq: midi(76 + (i % 7) * 2), type: "sine", gain: 0.025, attack: 0.002, release: 0.1, pan: (i % 5) / 2.5 - 0.8, toDuck: false });
    }
    bell(38.5, 91, 0.08);
    // 工作台
    click(46.0, 0.07);
    click(47.0, 0.07);
    Array.from("把 7 这一列再突出一点").forEach((_, i) => click(47.25 + i * 0.09, 0.03));
    click(48.3, 0.09);
    [84, 88, 91].forEach((m, i) => bell(49.2 + i * 0.08, m, 0.05));
    click(52.0, 0.09);
    // 收尾的大和弦
    riser(53.5, 55.5, 0.2);
    for (let i = 0; i < 8; i++) noiseHit({ t: 54.5 + i * 0.125, dur: 0.1, gain: 0.04 + i * 0.012, type: "bandpass", freq: 1800, toDuck: false });
    impact(55.5, 1.2);
    [41, 53, 57, 60, 64, 67, 72].forEach((m, i) =>
      tone({ t: 55.5, dur: 7.2, freq: midi(m), type: i < 1 ? "sine" : "triangle", gain: i < 1 ? 0.18 : 0.045, attack: 0.04, release: 5.5, cutoff: 2600, toDuck: false, pan: (i - 3) * 0.12 })
    );
    [84, 88, 91, 96, 100].forEach((m, i) => bell(55.6 + i * 0.1, m, 0.06, (i - 2) * 0.35));
    for (let i = 0; i < 10; i++) bell(57.0 + i * 0.42, pent[i % pent.length] + 12, 0.025, Math.sin(i) * 0.6);

    return ctx.startRendering();
  };

  /** AudioBuffer -> 16 位 WAV（ArrayBuffer） */
  KS.encodeWav = function (buffer) {
    const ch = buffer.numberOfChannels, len = buffer.length, sr = buffer.sampleRate;
    const out = new ArrayBuffer(44 + len * ch * 2);
    const v = new DataView(out);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, "data");
    v.setUint32(40, len * ch * 2, true);
    const data = [];
    for (let c = 0; c < ch; c++) data.push(buffer.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++)
      for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, data[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    return out;
  };
})();
