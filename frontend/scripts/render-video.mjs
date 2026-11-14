import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const bundlePath = option('--bundle'), output = option('--output');
if (!bundlePath || !output) throw new Error('A bundle and output directory are required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const bundle = JSON.parse(await fs.readFile(bundlePath, 'utf8'));
await fs.mkdir(output, { recursive: true });
const progressPath = path.join(output, 'progress.json');
async function progress(value) { await fs.writeFile(progressPath + '.tmp', JSON.stringify(value)); await fs.rename(progressPath + '.tmp', progressPath); }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/bundle.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(bundle)); return; }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser, encoder;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/animation-render.html?bundle=/bundle.json`);
  await page.waitForFunction(() => window.animationBridge || window.animationRenderError, { timeout: 15000 });
  const error = await page.evaluate(() => window.animationRenderError);
  if (error) throw new Error(error);
  await page.evaluate(() => document.fonts.ready);
  const stage = page.locator('#stage');
  const samples = [...new Set([0, bundle.manifest.total_duration_ms, ...bundle.manifest.clips.flatMap(c => [c.start_ms, c.start_ms + Math.min(1500, c.duration_ms / 2), c.start_ms + c.duration_ms - 1]), ...bundle.script.scenes.flatMap(s => s.events.filter(e => e.anchor).map(e => s.start_ms + e.offset_ms))])].sort((a, b) => a - b);
  for (const time of samples) {
    const result = await page.evaluate(async time => {
      const p = window.animationBridge;
      await p.seekAndWaitForFrame(time);
      return { renderedTimeMs: p.getCurrentTimeMs(), anyVisible: p.getSelectableElements().some(e => e.sourceRef?.kind !== 'timed_text' && !!p.getElementBounds(e.id)) };
    }, time);
    if (result.renderedTimeMs !== time || !result.anyVisible) throw new Error(`Unrenderable frame at ${time}`);
  }
  for (const scene of bundle.script.scenes) for (const text of scene.timed_text ?? []) {
    const time = scene.start_ms + text.offset_ms + text.duration_ms / 2;
    const visible = await page.evaluate(async ({time, id}) => {
      await window.animationBridge.seekAndWaitForFrame(time);
      return !!window.animationBridge.getElementBounds(id);
    }, {time, id: text.id});
    if (!visible) throw new Error(`Missing script text ${text.id} at ${time}`);
  }
  if (errors.length) throw new Error('Browser render failed');
  const receipt = { status: 'validated', artifact_ref: { artifact_id: bundle.manifest.artifact_id, revision: bundle.manifest.revision }, checked_times_ms: samples };
  await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify(receipt, null, 2));
  if (!args.includes('--validate-only')) {
    const fps = Number(option('--fps') ?? 24);
    if (![12, 24, 30].includes(fps)) throw new Error('Unsupported frame rate');
    const frames = Math.ceil(bundle.manifest.total_duration_ms / 1000 * fps);
    const file = path.join(output, 'video.mp4');
    encoder = spawn(option('--ffmpeg') ?? 'ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',file], { stdio: ['pipe', 'ignore', 'pipe'] });
    let encoderError = ''; encoder.stderr.on('data', data => { encoderError = (encoderError + data).slice(-4000); });
    const finished = new Promise((resolve, reject) => { encoder.on('error', reject); encoder.on('close', code => code === 0 ? resolve() : reject(new Error(encoderError || 'Encoding failed'))); });
    // Attach rejection handling immediately, even while frames are still being fed.
    finished.catch(() => {});
    for (let frame = 0; frame < frames; frame++) {
      const time = frame * 1000 / fps;
      await page.evaluate(t => window.animationBridge.seekAndWaitForFrame(t), time);
      const png = await stage.screenshot({ type: 'png', animations: 'disabled' });
      if (frame % fps === 0) {
        await fs.writeFile(path.join(output, `sample-${Math.round(time)}.png`), png);
        await progress({ status: 'rendering', rendered_frames: frame + 1, total_frames: frames });
      }
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
    }
    encoder.stdin.end(); await finished;
    const probe = JSON.parse(execFileSync(option('--ffprobe') ?? 'ffprobe', ['-v','error','-show_format','-show_streams','-of','json',file], { encoding: 'utf8', maxBuffer: 1000000 }));
    const video = probe.streams.find(s => s.codec_type === 'video');
    if (!video || video.width !== 1280 || video.height !== 720 || Math.abs(Number(probe.format.duration) - bundle.manifest.total_duration_ms / 1000) > 1 / fps + .002) throw new Error('Encoded video does not match the scene timeline');
    await fs.writeFile(path.join(output, 'ffprobe.json'), JSON.stringify(probe, null, 2));
    await progress({ status: 'completed', rendered_frames: frames, total_frames: frames, duration_ms: bundle.manifest.total_duration_ms, width: 1280, height: 720, fps });
  }
  process.stdout.write(JSON.stringify(receipt) + '\n');
} finally {
  encoder?.kill(); await browser?.close(); await new Promise(resolve => server.close(resolve));
}
