// Page entry. One page, two modes sharing the same engine:
//   preview (default): real-time, t comes from the <audio> clock (or the seek bar when paused). t is SONG time: the film
//                      starts at -safety.preroll with a silent warning page, so the seek bar starts there too
//   export (?mode=export&w=..&h=..): no UI; Node drives window.__mv frame by frame
import { createEngine, loadSteps } from './engine/engine.js';
import { timecode } from './engine/util.js';

const qs = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const urlOf = (p) => '/' + p.split('/').map(encodeURIComponent).join('/');
const getJson = async (p) => {
  const r = await fetch(urlOf(p));
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
};
const isExport = qs.get('mode') === 'export';

// ---- loading (preview only): a bar over the picture, one step per file, font and silhouette ------------------------
const boot = (() => {
  if (isExport) return { expect() {}, step() {}, fail() {}, done() {} };
  let total = 1, n = 0;
  return {
    expect(k) { total += k; },
    /** One more thing is loaded. Resolves once the page had the chance to repaint, so the bar is seen to move. */
    step(label) {
      n++;
      $('loadFill').style.width = `${(100 * n / total).toFixed(1)}%`;
      $('loadText').textContent = `${String(n).padStart(2, ' ')} / ${total}   ${label}`;
      if (document.visibilityState !== 'visible') return undefined;         // nobody is looking: nothing to wait for
      return new Promise((res) => { const id = setTimeout(res, 80); requestAnimationFrame(() => { clearTimeout(id); res(); }); });
    },
    fail(e) { $('loading').classList.add('failed'); $('loadText').textContent = `could not start: ${e.message}`; },
    done() { $('loading').hidden = true; },
  };
})();

let cfg, engine, width, height;
try {
  cfg = await getJson('config.json');
  boot.expect(2 + loadSteps(cfg));
  boot.step('config.json');
  const [featuresData, lyricsData] = await Promise.all([
    getJson(cfg.paths.features).then((d) => (boot.step('audio features'), d)),
    getJson(cfg.paths.lyrics).then((d) => (boot.step('lyric lines'), d)),
  ]);
  width = +qs.get('w') || cfg.video.previewWidth;
  height = +qs.get('h') || cfg.video.previewHeight;
  // ?lab=<set> renders the check cards of src/scenes/lab.js instead of the film (node export/export.mjs --lab <set> --sheet ...)
  engine = await createEngine({ canvas: $('view'), width, height, cfg, featuresData, lyricsData, flipY: isExport, lab: qs.get('lab'), onStep: isExport ? null : boot.step });
} catch (e) { boot.fail(e); throw e; }

if (isExport) setupExport(); else setupPreview();

// ---------------------------------------------------------------------------------
function setupExport() {
  document.body.classList.add('export');
  const buf = new Uint8Array(width * height * 4);
  // One WebSocket carries all frames; the Node side acks each frame once ffmpeg has consumed it.
  const ws = new WebSocket(`ws://${location.host}/__frames`);
  const opened = new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('frame socket failed')); });
  const send = (data) => new Promise((res, rej) => {
    ws.onmessage = res;
    ws.onclose = () => rej(new Error('frame socket closed'));
    ws.send(data);
  });
  window.__mv = {
    ready: true,
    duration: engine.duration,
    renderer: engine.rendererInfo(),
    /** Render stills at arbitrary times (QA contact sheets). */
    async exportTimes(times) {
      await opened;
      for (const t of times) { engine.renderFrame(t); engine.readPixels(buf); await send(buf); }
      return times.length;
    },
    /** Render frames [from, to) at `fps` and send each one (raw RGBA) to the Node side, in order. */
    async exportRange(from, to, fps) {
      await opened;
      const ms = { render: 0, read: 0, send: 0 };       // profiling only; never affects the frames
      for (let i = from; i < to; i++) {
        const a = performance.now();
        engine.renderFrame(i / fps);
        const b = performance.now();
        engine.readPixels(buf);
        const c = performance.now();
        await send(buf);
        ms.render += b - a; ms.read += c - b; ms.send += performance.now() - c;
      }
      for (const k in ms) ms[k] = +(ms[k] / (to - from)).toFixed(1);
      return ms;
    },
  };
}

// ---------------------------------------------------------------------------------
function setupPreview() {
  const audio = $('audio'), seek = $('seek'), playBtn = $('play');
  const PRE = engine.preroll, D = engine.duration;      // the film runs from song time -PRE (silent warning page) to D
  audio.src = urlOf(cfg.paths.audio);
  seek.min = (-PRE).toFixed(3); seek.max = D.toFixed(3);

  const lim = (v) => Math.max(-PRE, Math.min(D, v));
  let t = lim(qs.has('t') ? +qs.get('t') || 0 : -PRE);   // current time while paused
  let lastDrawn = NaN, perf = 0, shown = '';
  // Two clocks (preview transport only: a frame still depends on t alone). While the song sounds, the <audio> element
  // is the clock. Before the song there is no audio clock, and there is none either when the sound cannot be had (no
  // file, the browser will not start it, nothing to play it on): then the preview runs on the wall clock, silently.
  //   wall = { t0, at }       running on the wall clock: song time t0 at performance.now() === at
  //   mute = { why, retry }   the sound is not used, and why; retry = try it again at the next press of play
  //   heard = { t, at }       the last time the audio clock was seen to move
  let wall = null, mute = null, heard = { t: -1, at: 0 };
  audio.currentTime = Math.max(0, t);

  const playing = () => wall !== null || (!audio.paused && !audio.ended);
  const now = () => (wall ? Math.min(mute ? D : 0, wall.t0 + (performance.now() - wall.at) / 1000) : !audio.paused && !audio.ended ? audio.currentTime : t);
  const label = () => { playBtn.textContent = playing() ? 'pause' : 'play'; };
  /** Start the sound at t (>= 0). If it will not start, the picture goes on without it rather than stand still. */
  const start = () => {
    heard = { t: -1, at: performance.now() };
    if (Math.abs(audio.currentTime - t) > 0.02) audio.currentTime = t;      // (the wall clock has run on without it)
    audio.play().catch((e) => {
      if (e.name === 'AbortError' || !audio.paused) return;                 // overtaken by a pause or a seek of ours
      mute = { why: e.name === 'NotAllowedError' ? 'the browser did not let the sound start: press pause, then play' : `no sound (${e.name})`, retry: true };
      wall = { t0: t, at: performance.now() }; label();
    });
  };
  /** Always reached from a click or a key: whatever only the user may start has to be started in here. */
  const play = () => {
    if (mute?.retry) mute = null;
    if (t >= D - 0.05) { t = 0; audio.currentTime = 0; }                    // at the end: once more, from the song
    if (mute) wall = { t0: t, at: performance.now() };
    else if (t < 0) {
      wall = { t0: t, at: performance.now() };
      // The song starts by itself when the page before it is over, and that is no longer inside this click. A browser
      // that lets only the user start sound must have seen this element started by the user once: started here and
      // stopped at once (no sound), it may be started later.
      audio.play().catch(() => {}); audio.pause();
    } else start();
    label();
  };
  const pause = () => { t = now(); wall = null; if (!audio.paused) audio.pause(); label(); };
  const setT = (v) => { const was = playing(); pause(); t = lim(v); audio.currentTime = Math.max(0, t); if (was) play(); };

  playBtn.onclick = () => (playing() ? pause() : play());
  audio.onplay = audio.onpause = () => { if (!wall && audio.paused && !audio.ended) t = audio.currentTime; label(); };
  audio.onended = () => { t = D; label(); };
  audio.onerror = () => {                                 // no file, or one the browser cannot play: the picture alone
    const was = playing();
    pause();
    mute = { why: `no sound: "${cfg.paths.audio}" is missing or cannot be played here`, retry: false };
    if (was) play();
  };
  seek.oninput = () => setT(+seek.value);
  seek.onchange = () => seek.blur();                      // after a drag the keys below are the page's again, not the slider's
  window.addEventListener('keydown', (e) => {
    const dir = e.code === 'ArrowLeft' ? -1 : e.code === 'ArrowRight' ? 1 : 0;
    if (e.code === 'Space') { e.preventDefault(); playBtn.blur(); playBtn.click(); }    // (a focused button would click a second time)
    else if (dir) { e.preventDefault(); setT(now() + dir * (e.shiftKey ? 5 : 1)); }
    else if (e.key === ',') { pause(); setT(t - 1 / 60); }
    else if (e.key === '.') { pause(); setT(t + 1 / 60); }
  });

  const sound = () => (mute ? mute.why
    : audio.readyState < 2 ? 'loading…'
    : !audio.paused && !audio.ended && audio.readyState < 3 ? 'buffering…'
    : `${wall ? 'starts when the page before the song is over' : !audio.paused && !audio.ended ? 'playing' : 'ready'}   ${timecode(audio.duration)}`);

  function draw(now) {
    const t0 = performance.now();
    engine.renderFrame(now);
    perf = perf * 0.9 + (performance.now() - t0) * 0.1;
    const f = engine.features.sample(now - cfg.timing.offset), ly = engine.lyrics.state(now - cfg.timing.offset);
    if (document.activeElement !== seek) seek.value = now;
    $('clock').textContent = `${timecode(now)} / ${timecode(D)}`;
    $('iT').textContent = `${now.toFixed(3)} / ${Math.round(now * 60)}   (film ${timecode(now + PRE)})`;
    $('iLine').textContent = ly.index < 0 ? '-' : `${ly.index + 1} / ${engine.lyrics.lines.length}${ly.active ? '' : ' (ended)'}  "${ly.line.text}"`;
    $('iBeat').textContent = now < 0 ? 'before the song' : `beat ${f.beat} (${f.beatInBar + 1}/4)   bar ${f.bar}   ${engine.features.bpm} BPM`;
    const shot = engine.shotAt(now - cfg.timing.offset);
    $('iScene').textContent = shot ? `${engine.activeScenes(now - cfg.timing.offset).join(' → ')}   [${shot.state}]` : '-';
    $('iMoment').textContent = shot?.moment || '-';
    $('iPerf').textContent = `${perf.toFixed(1)} ms/frame @ ${width}x${height}   GPU: ${engine.rendererInfo()}`;
  }

  // requestAnimationFrame is only a repaint trigger; the frame content depends on t alone.
  function tick() {
    let n = now();
    if (wall && !mute && n >= 0) {                        // the page is over: the song starts
      wall = null; t = 0; n = 0;
      if (audio.currentTime !== 0) audio.currentTime = 0;
      start(); label();
    } else if (wall && n >= D) { wall = null; t = D; label(); }
    if (!wall && !audio.paused && !audio.ended) {         // the audio clock has to be seen to move
      const c = audio.currentTime, w = performance.now(), waiting = audio.seeking || audio.readyState < 3;
      if (c !== heard.t) heard = { t: c, at: w };
      else if (w - heard.at > (waiting ? 4000 : 2500)) {  // it stands still: go on without it rather than freeze
        t = c; audio.pause();
        mute = { why: `the sound ${waiting ? 'does not load' : 'does not advance (no output device?)'}: playing without it; pause, then play, tries again`, retry: true };
        wall = { t0: t, at: w }; label();
      }
    }
    if (n !== lastDrawn) { draw(n); lastDrawn = n; }
    const s = sound();
    if (s !== shown) { $('iAudio').textContent = shown = s; $('iAudio').classList.toggle('warn', !!mute); }
    requestAnimationFrame(tick);
  }
  tick();
  playBtn.disabled = false;
  boot.done();
  window.__preview = { engine, setT };   // handy for debugging from the console
}
