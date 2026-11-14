import { expect, test } from '@playwright/test';
async function ready(page: any) {
  await page.goto('/workbench.html?demo=pn');
  await page.waitForFunction(() => (window as any).workbench?.getBundle());
}
test('real clips, global seeking and current-frame selection survive scene boundaries', async ({ page }) => {
  await ready(page);
  await expect(page.locator('.lane').first().locator('.clip')).toHaveCount(7);
  const result = await page.evaluate(async () => {
    const api=(window as any).workbench;
    const frames=[];
    for(const t of [14999,15000,16000,25000,37000,42999,43000,165000]) {
      await api.seek(t);
      const p=(document.getElementById('player') as HTMLIFrameElement).contentWindow!.animationBridge!;
      frames.push({ time:p.getCurrentTimeMs(), body:p.getElementBounds('EL_S01_JUNCTION'), text:p.getElementBounds('T02') });
    }
    return frames;
  });
  expect(result.every(f=>!!f.body)).toBe(true);
  expect(result.find(f=>f.time===16000)!.text).not.toBeNull();
  expect(result.find(f=>f.time===25000)!.text).toBeNull();
  await page.locator('#tabAnim').click();
  await page.locator('.clip[data-id="EL_PN_BARRIER"]').first().click();
  await expect(page.locator('#selectionOverlay')).toBeVisible();
  await page.evaluate(() => (window as any).workbench.seek(0));
  await expect(page.locator('#selectionOverlay')).toBeHidden();
});
test('selection chips preserve exact manifest version and full revision anchors', async ({ page }) => {
  await ready(page); await page.locator('#tabAnim').click();
  await page.locator('.clip[data-id="EL_S01_CARRIERS"]').nth(1).click();
  const request=await page.evaluate(() => {
    const w=(window as any).workbench; w.addChip(w.getSelection()); return w.requestFor('这里粒子慢一点');
  });
  expect(request.target_artifact).toEqual({kind:'animation_manifest',artifact_id:'AM_PN_DEMO',revision:1});
  expect(request.anchors.some((a:any)=>a.kind==='render_element'&&a.id==='EL_S01_CARRIERS')).toBe(true);
  expect(request.anchors.some((a:any)=>a.kind==='clip'&&a.id==='CL_S02')).toBe(true);
  expect(request.anchors.some((a:any)=>a.kind==='time_range'&&a.start_ms===15000&&a.end_ms===43000)).toBe(true);
});
test('scene frames are independent of seek history throughout the 165-second sample', async ({ page }) => {
  await ready(page);
  const snapshots=await page.evaluate(async()=>{
    const w=(window as any).workbench; const frames=[];
    for(const before of [0,165000,100000]) {
      await w.seek(before); await w.seek(37000);
      const root=(document.getElementById('player') as HTMLIFrameElement).contentDocument!.getElementById('stage')!;
      frames.push(root.querySelector('div')!.shadowRoot!.querySelector('svg')!.outerHTML);
    }
    return frames;
  });
  expect(new Set(snapshots).size).toBe(1);
});
for (const width of [375,1280,1920]) test(`workbench responsive ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000}); await ready(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const frame=await page.locator('#frame').boundingBox(); expect(frame!.width/frame!.height).toBeCloseTo(16/9,2);
});
test('generated vector programs share deterministic playback and exact script text identity', async ({page}) => {
  await ready(page);
  const bundle=await page.evaluate(() => (window as any).workbench.getBundle());
  bundle.manifest.selectable_elements=[{id:'EL_ORIGINAL_ACTOR'},...bundle.script.scenes.flatMap((s:any)=>s.timed_text.map((t:any)=>({id:t.id,source_ref:{kind:'timed_text',id:t.id}})))];
  for(const clip of bundle.manifest.clips) {
    const scene=bundle.script.scenes.find((s:any)=>s.scene_id===clip.scene_id);
    const keyframes=[{time_ms:0,x:200,y:400,scale:1,opacity:1,rotation:0},{time_ms:scene.duration_ms,x:1200,y:400,scale:1,opacity:1,rotation:0}];
    const old=bundle.resources[clip.resource_ref];
    bundle.resources[clip.resource_ref]={...old,kind:'vector-scene',objects:[{id:'EL_ORIGINAL_ACTOR',label:'知识对象',shape:'circle',radius:50,fill:'#ffcc00',keyframes},...scene.timed_text.map((t:any)=>({id:t.id,label:t.text,shape:'text',text:t.text,fill:'#ffffff',keyframes:[{...keyframes[0],x:300,y:150},{...keyframes[1],x:300,y:150}]}))]};
  }
  const url='/api/projects/P_VECTOR/animations/AM_VECTOR/r1/bundle';
  await page.route(url,route=>route.fulfill({json:bundle}));
  await page.goto('/animation-render.html?bundle='+encodeURIComponent(url));
  await page.waitForFunction(()=>window.animationBridge);
  const frames=await page.evaluate(async()=>{
    const p=window.animationBridge!; const results=[];
    for(const previous of [0,165000,25000]) {
      await p.seekAndWaitForFrame(previous); await p.seekAndWaitForFrame(16000);
      results.push({actor:p.getElementBounds('EL_ORIGINAL_ACTOR'),text:p.getElementBounds('T02')});
    }
    await p.seekAndWaitForFrame(25000);
    return {results,hidden:p.getElementBounds('T02')};
  });
  expect(frames.results[0].actor).not.toBeNull();
  expect(frames.results.every(f=>JSON.stringify(f)===JSON.stringify(frames.results[0]))).toBe(true);
  expect(frames.results[0].text).not.toBeNull(); expect(frames.hidden).toBeNull();
});
test('S01 local speed revision changes real particles while preserving the polarity schedule', async({page})=>{
  await ready(page);
  const original=await page.evaluate(async()=>{
    await (window as any).workbench.seek(5000);
    const iframe=document.getElementById('player') as HTMLIFrameElement;
    const root=iframe.contentDocument!.querySelector('#stage div')!.shadowRoot!;
    return {cx:root.querySelector('[data-particle]')!.getAttribute('cx'),bundle:structuredClone((window as any).workbench.getBundle())};
  });
  const resource=original.bundle.resources[original.bundle.manifest.clips[0].resource_ref]; resource.parameters.speed=.5;
  const url='/api/projects/P_SPEED/animations/AM_SPEED/r1/bundle';
  await page.route(url,route=>route.fulfill({json:original.bundle}));
  await page.goto('/animation-render.html?bundle='+encodeURIComponent(url));await page.waitForFunction(()=>window.animationBridge);
  const result=await page.evaluate(async()=>{
    const p=window.animationBridge!;await p.seekAndWaitForFrame(5000);
    const root=document.querySelector('#stage div')!.shadowRoot!;
    const cx=root.querySelector('[data-particle]')!.getAttribute('cx');
    await p.seekAndWaitForFrame(8000);
    return {cx,rotation:root.querySelector('[data-assembly]')!.getAttribute('transform')};
  });
  expect(result.cx).not.toBe(original.cx);
  expect(result.rotation).toBe('rotate(180 760 465)');
});
