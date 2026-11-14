import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/animation-preview.html');
  await expect(page.getByRole('heading', { name: '同一个结，两个方向。' })).toBeVisible();
});

test('seek is deterministic across forward and backward paths, with stable identities', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const player = window.__animationPreview!;
    const stage = () => document.querySelector('[data-testid="video-stage"] > div')!.shadowRoot!.querySelector('svg')!;
    const ids = player.getSelectableElements();
    const frames: string[] = [];
    for (const previous of [0, 15000, 10000]) {
      await player.seekAndWaitForFrame(previous);
      await player.seekAndWaitForFrame(6200);
      frames.push(stage().outerHTML);
    }
    return { equal: frames.every(frame => frame === frames[0]), ids, after: player.getSelectableElements() };
  });
  expect(result.equal).toBe(true);
  expect(result.after).toEqual(result.ids);
  expect(result.ids.map(e => e.id)).toContain('EL_S01_JUNCTION');
});

test('actual frame bounds reflect subtitle timing, zoom, split and resize', async ({ page }) => {
  for (const width of [375, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const t of [0, 6000, 10000, 15000]) {
      const bounds = await page.evaluate(async t => {
        const player = window.__animationPreview!;
        await player.seekAndWaitForFrame(t);
        return { body: player.getElementBounds('EL_S01_JUNCTION'), subtitle: player.getElementBounds('T01'), missing: player.getElementBounds('unknown') };
      }, t);
      expect(bounds.body).not.toBeNull();
      expect(bounds.body!.x).toBeGreaterThanOrEqual(0);
      expect(bounds.body!.x + bounds.body!.width).toBeLessThanOrEqual(1.00001);
      expect(bounds.missing).toBeNull();
      expect(!!bounds.subtitle).toBe(t === 10000);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('video ignores hostile website CSS, rapid seek cancels old results, destroy is idempotent', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const player = window.__animationPreview!;
    const svg = document.querySelector('[data-testid="video-stage"] > div')!.shadowRoot!.querySelector('svg')!;
    await player.seekAndWaitForFrame(10000);
    const before = svg.outerHTML;
    const css = document.createElement('style');
    css.textContent = 'svg { background: magenta !important; font-size: 99px !important; } text { fill: lime !important; } :root { --ks-ink: red; }';
    document.head.append(css);
    await player.seekAndWaitForFrame(10000);
    const unchanged = before === svg.outerHTML && getComputedStyle(svg).backgroundColor === 'rgb(17, 30, 48)';
    const old = player.seekAndWaitForFrame(6000).then(() => 'bad', e => e.name);
    const last = await player.seekAndWaitForFrame(10000);
    const stale = await old;
    const pending = player.seekAndWaitForFrame(4000).catch(e => e.name);
    player.destroy(); player.destroy();
    return { unchanged, stale, last, destroyed: await pending, nodes: document.querySelector('[data-testid="video-stage"]')!.childElementCount };
  });
  expect(result).toEqual({ unchanged: true, stale: 'AbortError', last: { renderedTimeMs: 10000 }, destroyed: 'AbortError', nodes: 0 });
});

test('plays actual frames, pauses without drift, and can restart after reaching the end', async ({ page }) => {
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__animationPreview!.getCurrentTimeMs())).toBeGreaterThan(150);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const time = await page.evaluate(() => window.__animationPreview!.getCurrentTimeMs());
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__animationPreview!.getCurrentTimeMs())).toBe(time);
  await page.getByRole('button', { name: '15s', exact: true }).click();
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__animationPreview!.getCurrentTimeMs())).toBeLessThan(1000);
});
