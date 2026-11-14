// Use the normal Player in /style-lab.html. Local screenshots and video stay outside Git.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const dir = option('--output', '/tmp/ks-soap-style-review');
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width:1800, height:1500 }, recordVideo: { dir:dir+'/playback', size:{ width:1800, height:1500 } } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(option('--url', 'http://127.0.0.1:5173/style-lab.html'));
  await page.waitForFunction(() => window.styleLab); await page.evaluate(() => document.fonts.ready);
  for (const [name, time] of [['problem',4500],['approach',11000],['mechanism',13500],['result',22500]]) {
    await page.evaluate(t => window.styleLab.seek(t), time);
    await page.screenshot({ path:`${dir}/comparison-${name}.png`, fullPage:true });
    for (const style of ['paper-editorial','precision-science','modern-graphic','narrative-collage']) await page.locator(`#${style} .stage`).screenshot({ path:`${dir}/${style}-${name}.png` });
  }
  await page.evaluate(() => window.styleLab.seek(0)); await page.locator('#play').click(); await page.waitForTimeout(27500);
  const times = await page.evaluate(() => window.styleLab.players.map(p => p.getCurrentTimeMs()));
  if (times.some(time => time !== 27000) || errors.length) throw new Error(JSON.stringify({times, errors}));
  await page.close(); await context.close();
  await fs.writeFile(dir+'/playback.json', JSON.stringify({times,errors,model_api_calls:0}, null, 2));
  process.stdout.write(JSON.stringify({dir,times,errors})+'\n');
} finally { await browser.close(); }
