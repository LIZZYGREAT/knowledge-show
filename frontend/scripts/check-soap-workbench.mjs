// Run with serve-soap-acceptance.py and Vite. This uses actual local HTTP routes.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const args=process.argv.slice(2);
const option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const output=option('--output','/tmp/ks-soap-chain-review');
const origin=option('--origin','http://127.0.0.1:5173');
const base='/api/projects/P_SOAP_LAB';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function api(path,body) {
    const response=body ? await page.request.post(origin+path,{data:body}) : await page.request.get(origin+path);
    const result=await response.json();if(!response.ok()) throw new Error(JSON.stringify(result));return result;
  }
  const project=await api(base);
  const job=await api(base+'/animations',{expected_project_revision:project.revision,style_id:'paper-editorial',api_key:'SOAP_FAKE'});
  let state;
  do { await page.waitForTimeout(700);state=await api(base+'/animations/jobs/'+job.job_id); } while(['queued','running'].includes(state.status));
  if(state.status!=='completed') throw new Error(JSON.stringify(state));
  const first=state.artifact_ref; const nextRevision=first.revision+1;
  await page.goto(origin+'/workbench.html?project_id=P_SOAP_LAB');
  await page.waitForFunction(()=>window.workbench?.getBundle());
  await page.locator('#tabAnim').click();await page.locator('.clip[data-id="EL_OIL"]').nth(1).click();
  if(!await page.locator('#selectionOverlay').isVisible()) throw new Error('Missing oil bbox');
  await page.screenshot({path:output+'/selected-oil.png'});
  await page.getByText('使用模型修改',{exact:true}).click();await page.locator('#revisionApiKey').fill('SOAP_FAKE');
  await page.locator('#chatInput').fill('选中油污的描边加粗一点');await page.locator('#sendRevision').click();
  await page.waitForFunction(revision=>window.workbench?.getBundle()?.manifest.revision===revision,nextRevision,{timeout:60000});
  const updated=await page.evaluate(()=>window.workbench.getBundle());
  const original=await api(`${base}/animations/${first.artifact_id}/r${first.revision}/bundle`);
  const changed=original.manifest.clips.filter((c,i)=>c.resource_ref!==updated.manifest.clips[i].resource_ref).map(c=>c.scene_id);
  if(JSON.stringify(changed)!=='["S02"]') throw new Error('Revision affected wrong scenes: '+JSON.stringify(changed));
  await page.locator('#rollback').click();await page.waitForFunction(revision=>window.workbench.getBundle()?.manifest.revision===revision,first.revision);
  const revision=await page.evaluate(()=>window.workbench.getBundle().projectRevision);
  await api(base+'/animations/activate',{artifact_ref:{artifact_id:first.artifact_id,revision:nextRevision},expected_project_revision:revision});
  await page.reload();await page.waitForFunction(revision=>window.workbench?.getBundle()?.manifest.revision===revision,nextRevision);
  await page.evaluate(()=>window.workbench.seek(13500));await page.screenshot({path:output+'/revised-workbench.png'});
  await page.locator('#exportVideo').click();
  await page.getByRole('link',{name:'下载 MP4'}).waitFor({timeout:240000});
  const download=await page.getByRole('link',{name:'下载 MP4'}).getAttribute('href');
  const video=await page.request.get(origin+download);if(!video.ok()) throw new Error('MP4 download failed');
  await fs.writeFile(output+'/soap-paper.mp4',await video.body());
  const final=await api(`${base}/animations/${first.artifact_id}/r${nextRevision}/bundle`);
  await fs.writeFile(output+'/checked-bundle.json',JSON.stringify(final,null,2));
  const report={initial:first,final:{artifact_id:first.artifact_id,revision:nextRevision},changed_scenes:changed,rollback:true,download,errors,model_api_calls:0};
  await fs.writeFile(output+'/workflow.json',JSON.stringify(report,null,2));
  if(errors.length) throw new Error(JSON.stringify(errors));
  process.stdout.write(JSON.stringify(report)+'\n');
} finally { await browser.close(); }
