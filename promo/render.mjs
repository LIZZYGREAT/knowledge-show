#!/usr/bin/env node
/*
 * Knowledge.Show(me) 宣传片 v2 离线确定性渲染与 FFmpeg 合成管线
 * 用法：
 *   node render.mjs --keyframes                              # 截取全片 24 个关键帧与无缝衔接点 (1920x1080)
 *   node render.mjs --audio-only                             # 仅离线合成 48kHz 立体声 promo-audio.wav
 *   node render.mjs --fps 60 --width 1920 --height 1080      # 导出 B 站高码率成片 knowledge-show-promo-v2.mp4
 *   node render.mjs --start 0 --end 22 --fps 30 --out hook.mp4  # 片段快速抽检
 */
import http from "node:http";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { chromium } from "../frontend/node_modules/playwright/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const keyframesOnly = hasFlag("--keyframes");
const audioOnly = hasFlag("--audio-only");
const reuseAudio = hasFlag("--reuse-audio");
const fps = Number(opt("--fps", "60"));
const width = Number(opt("--width", "1920"));
const height = Number(opt("--height", "1080"));
const dpr = Number(opt("--dpr", "1"));
const workers = Math.max(1, Number(opt("--workers", "1")));
const crf = opt("--crf", "15");
const preset = opt("--preset", "slow");
const startOpt = opt("--start", null);
const endOpt = opt("--end", null);
const outDir = path.resolve(__dirname, opt("--out-dir", "output"));
const outName = opt("--out", "knowledge-show-promo-v2.mp4");

function buildBrowserEnv() {
  const env = { ...process.env };
  const ksLibDir = "/tmp/ks-libs/root/usr/lib/x86_64-linux-gnu";
  if (existsSync(ksLibDir)) {
    env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH
      ? `${ksLibDir}:${env.LD_LIBRARY_PATH}`
      : ksLibDir;
  }
  const ksFontConf = "/tmp/ks-libs/fc/fonts.conf";
  if (!env.FONTCONFIG_FILE && existsSync(ksFontConf)) {
    env.FONTCONFIG_FILE = ksFontConf;
  }
  return env;
}

function findFfmpeg() {
  const explicit = opt("--ffmpeg", process.env.PROMO_FFMPEG || process.env.ANIMATION_FFMPEG);
  if (explicit && existsSync(explicit)) return explicit;
  try {
    const sys = execFileSync("which", ["ffmpeg"], { encoding: "utf8" }).trim();
    if (sys && existsSync(sys)) return sys;
  } catch {}
  const cacheDir = path.join(os.homedir(), ".cache", "ms-playwright");
  if (existsSync(cacheDir)) {
    const found = execFileSync("find", [cacheDir, "-maxdepth", "3", "-name", "ffmpeg-linux"], { encoding: "utf8" }).trim().split("\n")[0];
    if (found && existsSync(found)) return found;
  }
  return null;
}

function detectCodecs(ffmpegPath) {
  try {
    const enc = execFileSync(ffmpegPath, ["-hide_banner", "-encoders"], { encoding: "utf8" });
    const dec = execFileSync(ffmpegPath, ["-hide_banner", "-decoders"], { encoding: "utf8" });
    return {
      h264: /\blibx264\b/.test(enc),
      aac: /\baac\b/.test(enc),
      decPng: /\bpng\b/.test(dec),
    };
  } catch {
    return { h264: false, aac: false, decPng: false };
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const file = path.resolve(__dirname, "." + rel);
    if (!file.startsWith(__dirname + path.sep) && file !== __dirname) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not Found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await fs.mkdir(outDir, { recursive: true });

let browser;
let encoder;
try {
  browser = await chromium.launch({
    headless: true,
    env: buildBrowserEnv(),
    args: ["--no-sandbox", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });

  await page.goto(`http://127.0.0.1:${port}/index.html?capture=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__renderFrame && window.__PROMO__), { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const meta = await page.evaluate(() => ({
    duration: window.__PROMO__.duration,
    width: window.__PROMO__.width,
    height: window.__PROMO__.height,
  }));

  if (keyframesOnly) {
    const kfDir = path.join(outDir, "keyframes-v2");
    await fs.mkdir(kfDir, { recursive: true });
    // 36 个全片验收关键帧：覆盖 51.8s 直线波->玻璃滑入实时偏折、引导聚光扫频、居中 PN 电路地形、折页切离骰子、及第四幕三形态矢量选区精修
    const samples = [
      ["01_open_light_seed", 0.1],
      ["02_open_astrolabe_beam", 0.9],
      ["03_open_sunlight_iris", 1.8],
      ["04_open_spark_ribbon", 2.6],
      ["05_act1_rainbow_bloom", 12.2],
      ["06_cut2_slit_straight", 51.8],
      ["07_act3_straight_noglass", 53.0],
      ["08_act3_glass_sliding_in", 55.8],
      ["09_act3_micro_loupe", 59.2],
      ["10_act3_guided_spotlight", 69.8],
      ["11_act3_bauhaus_choreo", 76.8],
      ["12_act3_collage_stamp", 80.8],
      ["13_act3_pn_redesign", 87.8],
      ["14_act3_dice_fold_exit", 90.8],
      ["15_handoff_91_8s_trail", 91.8],
      ["16_handoff_92_1s_trail", 92.1],
      ["17_handoff_92_8s_ease", 92.8],
      ["18_act4_hover_prism_tri", 98.4],
      ["19_act4_hover_ring_circle", 100.2],
      ["20_act4_lock_curved_waves", 103.5],
      ["21_act4_wave_fan_ripple", 115.8],
      ["22_act4_revise_prism_tri", 131.2],
      ["23_act4_revise_ring_circle", 135.2],
      ["24_act5_ruler_sweep", 144.2],
      ["25_act5_dissolve_weave", 153.8],
      ["26_act5_brand_finale", 162.4],
    ];
    for (const [name, t] of samples) {
      const f = Math.round(t * 60);
      await page.evaluate(({ frame }) => window.__renderFrame(frame, 60), { frame: f });
      const png = await page.screenshot({ type: "png", animations: "disabled" });
      await fs.writeFile(path.join(kfDir, `${name}_${t.toFixed(1)}s.png`), png);
      console.log(`[keyframe] ${name} @ ${t.toFixed(1)}s`);
    }
    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
    console.log(`Done! Saved ${samples.length} keyframes to ${kfDir}`);
  } else if (audioOnly) {
    const wavPath = path.join(outDir, "promo-audio.wav");
    console.log("[audio] Synthesizing deterministic 48kHz stereo WAV soundtrack...");
    const wavB64 = await page.evaluate(() => window.__PROMO__.renderAudioWavBase64());
    await fs.writeFile(wavPath, Buffer.from(wavB64, "base64"));
    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
    console.log(`[audio] Saved ${wavPath}`);
  } else {
    const startSec = startOpt !== null ? Math.max(0, Number(startOpt)) : 0;
    const endSec = endOpt !== null ? Math.min(meta.duration, Number(endOpt)) : meta.duration;
    const startFrame = Math.round(startSec * fps);
    const endFrame = Math.round(endSec * fps);
    const totalFrames = Math.max(1, endFrame - startFrame);

    // 1. 离线合成 48kHz 立体声无损音轨（支持 --reuse-audio 复用已有 WAV）
    const wavPath = path.join(outDir, "promo-audio.wav");
    if (reuseAudio && existsSync(wavPath)) {
      console.log(`[audio] Reusing existing ${wavPath}`);
    } else {
      console.log("[audio] Synthesizing deterministic 48kHz stereo soundtrack...");
      const wavB64 = await page.evaluate(() => window.__PROMO__.renderAudioWavBase64());
      await fs.writeFile(wavPath, Buffer.from(wavB64, "base64"));
      console.log(`[audio] Saved ${wavPath}`);
    }

    // 2. 启动 FFmpeg 管道（支持单进程流式或 --workers N 分段并发渲染后无损拼接）
    const ffmpeg = findFfmpeg();
    if (!ffmpeg) throw new Error("No ffmpeg binary found.");
    const enc = detectCodecs(ffmpeg);
    if (!enc.h264 || !enc.decPng) {
      throw new Error(`FFmpeg at ${ffmpeg} requires libx264 and png decoder.`);
    }

    const videoFile = path.join(outDir, outName);

    async function renderSegmentToFile(segPage, segStartFrame, segEndFrame, targetFile, withAudio, label) {
      const segFrames = Math.max(1, segEndFrame - segStartFrame);
      const ffArgs = [
        "-hide_banner", "-loglevel", "error", "-y",
        "-f", "image2pipe", "-vcodec", "png", "-framerate", String(fps), "-i", "pipe:0",
      ];
      if (withAudio && enc.aac) {
        ffArgs.push(
          "-ss", String(segStartFrame / fps),
          "-t", String(segFrames / fps),
          "-i", wavPath,
          "-c:v", "libx264", "-preset", preset, "-profile:v", "high", "-level", "4.2",
          "-crf", String(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart",
          "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
          "-shortest",
          targetFile
        );
      } else {
        ffArgs.push(
          "-an",
          "-c:v", "libx264", "-preset", preset, "-profile:v", "high", "-level", "4.2",
          "-crf", String(crf), "-pix_fmt", "yuv420p",
          targetFile
        );
      }

      const proc = spawn(ffmpeg, ffArgs, { stdio: ["pipe", "ignore", "pipe"] });
      let errText = "";
      let exited = false;
      proc.stderr.on("data", (d) => { errText = (errText + d.toString()).slice(-4000); });
      proc.stdin.on("error", () => {});
      const done = new Promise((resolve, reject) => {
        proc.on("error", (e) => { exited = true; reject(e); });
        proc.on("close", (code) => {
          exited = true;
          code === 0 ? resolve() : reject(new Error(errText || `ffmpeg exited ${code}`));
        });
      });
      done.catch(() => {});

      const tStart = Date.now();
      for (let i = 0; i < segFrames; i++) {
        if (exited) break;
        const f = segStartFrame + i;
        await segPage.evaluate(({ frame, rate }) => window.__renderFrame(frame, rate), { frame: f, rate: fps });
        const buf = await segPage.screenshot({ type: "png", animations: "disabled" });
        if (exited) break;
        if (!proc.stdin.write(buf)) {
          await Promise.race([once(proc.stdin, "drain"), done]);
        }
        if ((i + 1) % (fps * 2) === 0 || i === segFrames - 1) {
          const pct = (((i + 1) / segFrames) * 100).toFixed(1);
          const sec = ((Date.now() - tStart) / 1000).toFixed(1);
          const eta = (((Date.now() - tStart) / (i + 1)) * (segFrames - i - 1) / 1000).toFixed(0);
          console.log(`[${label}] ${i + 1}/${segFrames} (${pct}%) - ${sec}s elapsed, ~${eta}s left`);
        }
      }
      proc.stdin.end();
      await done;
    }

    if (workers <= 1 || totalFrames < workers * 4) {
      console.log(`[video] Rendering frames ${startFrame}..${endFrame - 1} (${totalFrames} frames, ${width}x${height} @ ${fps}fps, CRF ${crf}, preset ${preset}) -> ${videoFile}`);
      await renderSegmentToFile(page, startFrame, endFrame, videoFile, true, "video");
    } else {
      const segDir = path.join(outDir, ".segments");
      await fs.mkdir(segDir, { recursive: true });
      const chunkSize = Math.ceil(totalFrames / workers);
      const segments = [];
      for (let wIdx = 0; wIdx < workers; wIdx++) {
        const sF = startFrame + wIdx * chunkSize;
        const eF = Math.min(endFrame, sF + chunkSize);
        if (sF >= eF) break;
        segments.push({ wIdx, sF, eF, file: path.join(segDir, `seg_${String(wIdx).padStart(2, "0")}.mp4`) });
      }
      console.log(`[video] Parallel rendering ${totalFrames} frames across ${segments.length} workers (${width}x${height} @ ${fps}fps, CRF ${crf}, preset ${preset})`);
      await Promise.all(
        segments.map(async (seg) => {
          const wPage = seg.wIdx === 0
            ? page
            : await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
          if (seg.wIdx !== 0) {
            wPage.on("pageerror", (err) => pageErrors.push(err.message));
            await wPage.goto(`http://127.0.0.1:${port}/index.html?capture=1`, { waitUntil: "networkidle" });
            await wPage.waitForFunction(() => Boolean(window.__renderFrame), { timeout: 15000 });
            await wPage.evaluate(() => document.fonts.ready);
          }
          await renderSegmentToFile(wPage, seg.sF, seg.eF, seg.file, false, `worker-${seg.wIdx + 1}`);
          if (seg.wIdx !== 0) await wPage.close();
        })
      );

      // 使用 concat demuxer 无损拼接分段并封装 48kHz AAC 音轨
      const listPath = path.join(segDir, "concat.txt");
      await fs.writeFile(
        listPath,
        segments.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join("\n") + "\n"
      );
      const muxArgs = [
        "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", listPath,
        "-ss", String(startSec),
        "-t", String(endSec - startSec),
        "-i", wavPath,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
        "-movflags", "+faststart",
        "-shortest",
        videoFile,
      ];
      execFileSync(ffmpeg, muxArgs);
      await fs.rm(segDir, { recursive: true, force: true });
    }

    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
    console.log(`[done] Video: ${videoFile}`);
  }
} finally {
  encoder?.kill();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
