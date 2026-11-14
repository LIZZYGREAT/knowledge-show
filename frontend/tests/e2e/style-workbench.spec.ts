import { expect, test } from '@playwright/test';
import original from '../fixtures/soap-style-lab/style-paper-editorial.json' with { type: 'json' };
const base = '/api/projects/P_SOAP_LAB';
async function project(page: any, versions = [1]) {
  const bundle = structuredClone(original);
  await page.route(`${base}/preview`, (route: any) => route.fulfill({ json: { status:'ready', artifact_ref:{artifact_id:'AM_SOAP_LAB',revision:1} } }));
  await page.route(`${base}/animations/versions`, (route: any) => route.fulfill({ json: { versions:versions.map(revision => ({artifact_id:'AM_SOAP_LAB',revision})) } }));
  await page.route(`${base}/animations/AM_SOAP_LAB/r*/bundle`, (route: any) => {
    const revision = Number(route.request().url().match(/\/r(\d+)\//)[1]);
    const version = structuredClone(bundle); version.manifest.revision = revision;
    if (revision === 2) Object.values(version.resources).forEach(r => r.style.id = 'modern-graphic');
    return route.fulfill({ json:version });
  });
  await page.goto('/workbench.html?project_id=P_SOAP_LAB');
  await page.waitForFunction(() => (window as any).workbench?.getBundle());
  await page.locator('#stylePanel summary').click();
}
test('browsing styles costs no jobs; apply submits once with preference and preserves old playback on failure', async ({ page }) => {
  let requests: any[] = [];
  await page.route(`${base}/animations`, async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json:{job_id:'AJ_STYLE',status:'queued'} });
  });
  let finish = false;
  await page.route(`${base}/animations/jobs/AJ_STYLE`, route => route.fulfill({ json:finish ? {status:'failed',message:'制作失败，旧版保留。'} : {status:'running'} }));
  await project(page);
  for (const style of ['modern-graphic','precision-science','narrative-collage','modern-graphic']) await page.locator('#styleSelect').selectOption(style);
  expect(requests).toHaveLength(0);
  await page.locator('#stylePreference').fill('保持几何形态，少用深色');
  await page.getByText('使用模型修改', {exact:true}).click();
  await page.locator('#revisionApiKey').fill('IN_MEMORY_KEY');
  await page.evaluate(() => { document.getElementById('applyStyle')!.click(); document.getElementById('applyStyle')!.click(); });
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({style_id:'modern-graphic',art_preference:'保持几何形态，少用深色',api_key:'IN_MEMORY_KEY'});
  await expect(page.locator('#applyStyle')).toBeDisabled();
  await page.locator('#playBtn').click();
  await expect.poll(() => page.evaluate(() => (document.getElementById('player') as HTMLIFrameElement).contentWindow!.animationBridge!.getCurrentTimeMs())).toBeGreaterThan(100);
  expect(await page.evaluate(() => (window as any).workbench.getBundle().manifest.revision)).toBe(1);
  finish = true;
  await expect(page.locator('#statusMessage')).toContainText('制作失败');
  await expect(page.locator('#applyStyle')).toBeEnabled();
  await expect(page.locator('#styleSelect')).toHaveValue('modern-graphic');
  expect(await page.evaluate(() => (window as any).workbench.getBundle().manifest.revision)).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage)+JSON.stringify(sessionStorage))).not.toContain('IN_MEMORY_KEY');
});
test('completed style switches exact version only after publication and rollback remains available', async ({ page }) => {
  let jobs = 0, done = false;
  await page.route(`${base}/animations`, route => { jobs++; return route.fulfill({ json:{job_id:'AJ_STYLE',status:'queued'} }); });
  await page.route(`${base}/animations/jobs/AJ_STYLE`, route => route.fulfill({ json:done ? {status:'completed',artifact_ref:{artifact_id:'AM_SOAP_LAB',revision:2}} : {status:'running'} }));
  const activated: number[] = [];
  await page.route(`${base}/animations/activate`, route => { const body = route.request().postDataJSON(); activated.push(body.artifact_ref.revision); return route.fulfill({json:{artifact_ref:body.artifact_ref}}); });
  await project(page);
  await page.locator('#styleSelect').selectOption('modern-graphic'); await page.locator('#applyStyle').click();
  await expect.poll(() => jobs).toBe(1);
  expect(await page.evaluate(() => (window as any).workbench.getBundle().manifest.revision)).toBe(1);
  done = true;
  await expect(page.locator('#versionBadge')).toContainText('r2');
  await page.locator('#rollback').click(); await expect(page.locator('#versionBadge')).toContainText('r1');
  expect(activated).toEqual([1]);
});
test('matching published style reuses its version without creating a model job', async ({ page }) => {
  let jobs = 0, activations = 0;
  await page.route(`${base}/animations`, route => { jobs++; return route.fulfill({status:500,json:{}}); });
  await page.route(`${base}/animations/activate`, route => { activations++; return route.fulfill({json:{artifact_ref:route.request().postDataJSON().artifact_ref}}); });
  await project(page,[1,2]);
  await page.locator('#styleSelect').selectOption('modern-graphic'); await page.locator('#applyStyle').click();
  await expect(page.locator('#versionBadge')).toContainText('r2');
  expect(jobs).toBe(0); expect(activations).toBe(1);
});
test('old PN demo selection is inert until explicitly applied', async ({ page }) => {
  await page.goto('/workbench.html?demo=pn'); await page.waitForFunction(() => (window as any).workbench?.getBundle());
  await page.locator('#stylePanel summary').click(); await page.locator('#styleSelect').selectOption('paper-editorial');
  expect(await page.evaluate(() => Object.values((window as any).workbench.getBundle().resources).map((r:any) => r.style.id)[0])).toBe('precision-science');
  await page.locator('#applyStyle').click();
  await expect.poll(() => page.evaluate(() => Object.values((window as any).workbench.getBundle().resources).map((r:any) => r.style.id)[0])).toBe('paper-editorial');
});
