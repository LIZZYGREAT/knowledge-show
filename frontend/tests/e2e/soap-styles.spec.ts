import paper from '../fixtures/soap-style-lab/style-paper-editorial.json' with { type: 'json' };
import science from '../fixtures/soap-style-lab/style-precision-science.json' with { type: 'json' };
import modern from '../fixtures/soap-style-lab/style-modern-graphic.json' with { type: 'json' };
import collage from '../fixtures/soap-style-lab/style-narrative-collage.json' with { type: 'json' };
const fixtures: Record<string, unknown> = { 'paper-editorial': paper, 'precision-science': science, 'modern-graphic': modern, 'narrative-collage': collage };
import { expect, test } from '@playwright/test';
const styles = ['paper-editorial', 'precision-science', 'modern-graphic', 'narrative-collage'];
for (const style of styles) test(`soap style ${style} loads materials and tracks logical objects`, async ({ page }) => {
  const bundle = fixtures[style];
  await page.route('/bundle.json', route => route.fulfill({ json: bundle }));
  await page.goto('/animation-render.html?bundle=/bundle.json');
  await page.waitForFunction(() => window.animationBridge || window.animationRenderError);
  expect(await page.evaluate(() => window.animationRenderError)).toBeUndefined();
  const result = await page.evaluate(async () => {
    const player = window.animationBridge!;
    const snapshots = [];
    for (const previous of [0, 27000, 11000]) {
      await player.seekAndWaitForFrame(previous);
      await player.seekAndWaitForFrame(13500);
      const svg = document.querySelector('#stage > div')!.shadowRoot!.querySelector('svg')!;
      snapshots.push({ html: svg.outerHTML, oil: player.getElementBounds('EL_OIL'), head: player.getElementBounds('EL_HEAD_2'), text: player.getElementBounds('T_S02') });
    }
    return snapshots;
  });
  expect(result[0].oil).not.toBeNull(); expect(result[0].head).not.toBeNull(); expect(result[0].text).not.toBeNull();
  expect(result.every(r => JSON.stringify(r) === JSON.stringify(result[0]))).toBe(true);
});

test('soap style real playback, backward stroke reveal and SVG node reuse', async ({ page }) => {
  await page.route('/bundle.json', route => route.fulfill({ json: paper }));
  await page.goto('/animation-render.html?bundle=/bundle.json'); await page.waitForFunction(() => window.animationBridge);
  const result = await page.evaluate(async () => {
    const p = window.animationBridge!;
    await p.seekAndWaitForFrame(9500);
    const svg = document.querySelector('#stage > div')!.shadowRoot!.querySelector('svg')!;
    const path = svg.querySelector('[data-element-id="EL_FLOW_0"] path')!;
    const first = path.getAttribute('stroke-dashoffset');
    await p.seekAndWaitForFrame(12000); const after = path.getAttribute('stroke-dashoffset');
    await p.seekAndWaitForFrame(9500);
    return { sameNode: path === svg.querySelector('[data-element-id="EL_FLOW_0"] path'), first, after, back: path.getAttribute('stroke-dashoffset') };
  });
  expect(result.sameNode).toBe(true); expect(result.first).toBe(result.back); expect(result.first).not.toBe(result.after);
  await page.evaluate(() => window.animationBridge!.play());
  await expect.poll(() => page.evaluate(() => window.animationBridge!.getCurrentTimeMs())).toBeGreaterThan(9800);
  await page.evaluate(() => window.animationBridge!.pause());
});
