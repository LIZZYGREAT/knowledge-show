// Compare exact 24fps encoded frames to the same normal Player at matching times.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
const args=process.argv.slice(2);
const option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const bundlePath=option('--bundle'),video=option('--video'),output=option('--output');
if(!bundlePath||!video||!output) throw new Error('--bundle, --video and --output are required');
const bundle=JSON.parse(await fs.readFile(bundlePath,'utf8'));
const ffmpeg=process.env.ANIMATION_FFMPEG??'ffmpeg';
const probe=JSON.parse(execFileSync(process.env.ANIMATION_FFPROBE??'ffprobe',['-v','error','-show_streams','-show_format','-of','json',video],{encoding:'utf8'}));
const stream=probe.streams.find(s=>s.codec_type==='video');
const fps=Number(stream.avg_frame_rate.split('/')[0])/Number(stream.avg_frame_rate.split('/')[1]);
await fs.mkdir(output,{recursive:true});const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:stream.width,height:stream.height},deviceScaleFactor:1});
  await page.route(url=>url.pathname==='/bundle.json',route=>route.fulfill({json:bundle}));
  await page.goto(option('--origin','http://127.0.0.1:5184')+'/animation-render.html?bundle=/bundle.json');
  await page.waitForFunction(()=>window.animationBridge);await page.evaluate(()=>document.fonts.ready);
  const samples=[];
  for(const scene of bundle.script.scenes) {
    const frame=Math.round((scene.start_ms+scene.duration_ms/2)/1000*fps),time=frame/fps*1000;
    await page.evaluate(t=>window.animationBridge.seekAndWaitForFrame(t),time);
    const preview=`${output}/preview-${time}.png`,encoded=`${output}/encoded-${time}.png`;
    await page.locator('#stage').screenshot({path:preview});
    execFileSync(ffmpeg,['-v','error','-y','-i',video,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',encoded]);
    const check=spawnSync(ffmpeg,['-hide_banner','-i',preview,'-i',encoded,'-lavfi','ssim','-f','null','-'],{encoding:'utf8'});
    const ssim=Number(check.stderr.match(/All:([\d.]+)/)?.[1]);
    if(check.status!==0||!Number.isFinite(ssim)||ssim<.98) throw new Error('Preview/export mismatch at '+time+': '+check.stderr);
    samples.push({time_ms:time,frame,ssim});
  }
  const report={duration_seconds:Number(probe.format.duration),width:stream.width,height:stream.height,fps,frames:Number(stream.nb_frames),samples};
  await fs.writeFile(output+'/preview-export.json',JSON.stringify(report,null,2));process.stdout.write(JSON.stringify(report)+'\n');
} finally {await browser.close();}
