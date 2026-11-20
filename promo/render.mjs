#!/usr/bin/env node
/*
 * Knowledge.Show(me) 宣传片离线渲染脚本
 * 用法：
 *   node render.mjs --keyframes                      # 截取全片 16 个关键帧到 output/keyframes/
 *   node render.mjs --fps 30 --width 1280 --height 720  # 逐帧导出完整视频与配乐
 *   node render.mjs --fps 30 --width 1920 --height 1080 # 全高清 1080p 导出
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
const fps = Number(opt("--fps", "30"));
const width = Number(opt("--width", "1280"));
const height = Number(opt("--height", "720"));
const outDir = path.resolve(__dirname, opt("--out-dir", "output"));

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
      vp9: /\blibvpx-vp9\b/.test(enc),
      opus: /\blibopus\b/.test(enc),
      decPng: /\bpng\b/.test(dec),
      decMjpeg: /\bmjpeg\b/.test(dec),
    };
  } catch {
    return { h264: false, aac: false, vp9: false, opus: false, decPng: false, decMjpeg: false };
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
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
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/index.html?capture=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__PROMO__), { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const meta = await page.evaluate(() => ({
    duration: window.__PROMO__.duration,
    width: window.__PROMO__.width,
    height: window.__PROMO__.height,
  }));

  if (keyframesOnly) {
    const kfDir = path.join(outDir, "keyframes");
    await fs.mkdir(kfDir, { recursive: true });
    const samples = [
      ["01_spark_mid", 2.4],
      ["02_spark_burst", 4.75],
      ["03_ppt_slides", 6.95],
      ["04_ppt_shatter", 7.85],
      ["05_slogan_move", 10.2],
      ["06_logo_hero", 14.9],
      ["07_explore_input", 19.7],
      ["08_explore_graph", 24.2],
      ["09_script_timeline", 29.2],
      ["10_show_dice_hist", 38.8],
      ["11_show_prism", 41.2],
      ["12_show_pn_fwd", 43.1],
      ["13_show_pn_rev", 44.3],
      ["14_workbench_rev", 49.9],
      ["15_export_done", 54.15],
      ["16_finale_hero", 59.0],
    ];
    for (const [name, t] of samples) {
      await page.evaluate((time) => window.__PROMO__.renderAt(time), t);
      const png = await page.locator("#stage").screenshot({ type: "png" });
      await fs.writeFile(path.join(kfDir, `${name}_${t.toFixed(2)}s.png`), png);
      console.log(`[keyframe] ${name} @ ${t}s`);
    }
    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
    console.log(`Done! Saved ${samples.length} keyframes to ${kfDir}`);
  } else {
    // 1. 离线合成配乐 WAV
    const wavPath = path.join(outDir, "soundtrack.wav");
    console.log("[audio] Synthesizing deterministic Web Audio soundtrack...");
    const wavB64 = await page.evaluate(() => window.__PROMO__.renderAudioWavBase64());
    await fs.writeFile(wavPath, Buffer.from(wavB64, "base64"));
    console.log(`[audio] Saved ${wavPath}`);

    // 2. 选择编码器与输入解码器并逐帧推流
    const ffmpeg = findFfmpeg();
    if (!ffmpeg) throw new Error("No ffmpeg binary found. Install ffmpeg or pass --ffmpeg /path/to/ffmpeg");
    const enc = detectCodecs(ffmpeg);
    const useJpeg = !enc.decPng && enc.decMjpeg;
    if (!enc.decPng && !enc.decMjpeg) throw new Error(`FFmpeg at ${ffmpeg} has neither png nor mjpeg decoder`);
    const totalFrames = Math.ceil(meta.duration * fps);
    const useMp4 = enc.h264;
    const videoFile = path.join(outDir, useMp4 ? "knowledge-show-promo.mp4" : "knowledge-show-promo.webm");

    const ffArgs = [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe", "-vcodec", useJpeg ? "mjpeg" : "png", "-framerate", String(fps), "-i", "pipe:0",
    ];
    if (useMp4 && enc.aac) {
      ffArgs.push("-i", wavPath, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", videoFile);
    } else if (useMp4) {
      ffArgs.push("-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", videoFile);
    } else if (enc.vp9) {
      ffArgs.push("-an", "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-threads", "4", "-b:v", "4500k", "-pix_fmt", "yuv420p", videoFile);
    } else {
      throw new Error(`Unsupported ffmpeg encoder set at ${ffmpeg}`);
    }

    console.log(`[video] Rendering ${totalFrames} frames (${width}x${height} @ ${fps}fps, pipe=${useJpeg ? "mjpeg" : "png"}) -> ${videoFile}`);
    encoder = spawn(ffmpeg, ffArgs, { stdio: ["pipe", "ignore", "pipe"] });
    let errText = "";
    let encoderExited = false;
    encoder.stderr.on("data", (d) => { errText = (errText + d.toString()).slice(-4000); });
    encoder.stdin.on("error", () => {});
    const done = new Promise((resolve, reject) => {
      encoder.on("error", (e) => { encoderExited = true; reject(e); });
      encoder.on("close", (code) => {
        encoderExited = true;
        code === 0 ? resolve() : reject(new Error(errText || `ffmpeg exited ${code}`));
      });
    });
    done.catch(() => {});

    const stage = page.locator("#stage");
    const tStart = Date.now();
    for (let f = 0; f < totalFrames; f++) {
      if (encoderExited) break;
      const t = Math.min(meta.duration, f / fps);
      await page.evaluate(({ time, idx }) => window.__PROMO__.renderAt(time, idx), { time: t, idx: f });
      const buf = useJpeg
        ? await stage.screenshot({ type: "jpeg", quality: 94, animations: "disabled" })
        : await stage.screenshot({ type: "png", animations: "disabled" });
      if (encoderExited) break;
      if (!encoder.stdin.write(buf)) {
        await Promise.race([once(encoder.stdin, "drain"), done]);
      }
      if ((f + 1) % (fps * 3) === 0 || f === totalFrames - 1) {
        const pct = (((f + 1) / totalFrames) * 100).toFixed(1);
        const sec = ((Date.now() - tStart) / 1000).toFixed(1);
        const eta = (((Date.now() - tStart) / (f + 1)) * (totalFrames - f - 1) / 1000).toFixed(0);
        console.log(`[video] ${f + 1}/${totalFrames} (${pct}%) - ${sec}s elapsed, ~${eta}s left`);
      }
    }
    encoder.stdin.end();
    await done;
    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
    console.log(`[done] Video: ${videoFile}`);
    if (!useMp4 || !enc.aac) {
      console.log(`[note] Current ffmpeg lacks AAC/H.264 muxing; soundtrack saved separately at ${wavPath}`);
    }
  }
} finally {
  encoder?.kill();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
