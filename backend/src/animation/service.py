"""Immutable animation resources and published versions backed by real browser checks."""
from __future__ import annotations
import asyncio
import copy
import hashlib
import json
import os
import re
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Any
from knowledge.config import repository_root
from workflow.animation import AnimationManifestCandidateStore
from workflow.state import ProjectStateStore
from .director import direct_scene, is_pn_script, resolve_profile

ROOT = repository_root()
ID = re.compile(r'^[A-Za-z][A-Za-z0-9_-]{0,63}$')
_LOCK = threading.RLock()


def encoded(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2).encode()


def immutable_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.animation-', suffix='.tmp')
    try:
        with os.fdopen(fd,'wb') as file: file.write(data); file.flush(); os.fsync(file.fileno())
        try: os.link(name,path)
        except FileExistsError:
            if path.read_bytes()!=data: raise ValueError('动画版本已存在，不能覆盖。')
    finally: Path(name).unlink(missing_ok=True)


class AnimationService:
    def __init__(self, projects: ProjectStateStore, candidates: AnimationManifestCandidateStore, *, validator=None):
        self.projects, self.candidates = projects, candidates
        self.resources = candidates.resource_root
        self.root = candidates.root_dir.parent / 'animation-runtime'
        self.validator = validator or self._browser_validate

    def _version(self, project_id: str, artifact_id: str, revision: int) -> Path:
        if not ID.fullmatch(project_id) or not ID.fullmatch(artifact_id) or not isinstance(revision,int) or isinstance(revision,bool) or revision<1: raise ValueError('动画版本引用无效。')
        return self.root / project_id / f'{artifact_id}-r{revision}.json'

    def load(self, project_id: str, ref: dict[str,Any]) -> dict[str,Any]:
        if not isinstance(ref,dict) or set(ref)!={'artifact_id','revision'} or not isinstance(ref['artifact_id'],str): raise ValueError('动画版本引用无效。')
        bundle=json.loads(self._version(project_id,ref['artifact_id'],ref['revision']).read_text())
        if bundle['manifest']['project_id']!=project_id or self.ref(bundle['manifest'])!=ref: raise ValueError('动画版本身份无效。')
        for resource_ref, resource in bundle['resources'].items():
            file=(self.resources/resource_ref).resolve(strict=True)
            if self.resources.resolve() not in file.parents or file.read_bytes()!=encoded(resource): raise ValueError('动画资源缺失或已被改写。')
        receipt=self.root/project_id/f"{ref['artifact_id']}-r{ref['revision']}.checked.json"
        if not receipt.exists() or json.loads(receipt.read_text())['bundle_sha256']!=hashlib.sha256(encoded(bundle)).hexdigest(): raise ValueError('动画版本尚未通过真实播放器检查。')
        return bundle

    @staticmethod
    def ref(artifact: dict[str,Any]) -> dict[str,Any]:
        return {'artifact_id':artifact['artifact_id'],'revision':artifact['revision']}

    def preview(self, project: dict[str,Any]) -> dict[str,Any]:
        ref=project['artifacts'].get('animation_manifest')
        if not ref: return {'status':'not_ready','message':'动画尚未发布。'}
        try:
            bundle=self.load(project['project_id'],ref)
            if bundle['manifest']['production_script_ref']!=project['artifacts'].get('production_script') or bundle['manifest']['brief_revision']!=project['brief']['revision']: raise ValueError('动画所用脚本已失效。')
        except (OSError,ValueError,KeyError): return {'status':'not_ready','message':'动画版本或资源暂时无法加载，请重新生成。'}
        return {'status':'ready','artifact_ref':ref,'project_revision':project['revision'],'preview_ref':bundle['manifest']['preview_ref'],
                'workbench_url':f"/workbench.html?project_id={project['project_id']}", 'bundle_url':self.bundle_url(project['project_id'],ref)}

    @staticmethod
    def bundle_url(project_id: str, ref: dict[str,Any]) -> str:
        return f"/api/projects/{project_id}/animations/{ref['artifact_id']}/r{ref['revision']}/bundle"

    async def generate(self, project: dict[str,Any], script: dict[str,Any], *, style_id='auto', custom=None, client=None) -> dict[str,Any]:
        profile=resolve_profile(style_id, custom)
        resources={}
        pn=is_pn_script(script)
        if not pn and client is None: raise ValueError('这份新脚本需要模型构思动画，请提供本次使用的 API Key。')
        for scene in script['scenes']:
            resources[scene['scene_id']] = {'kind':'pn-scene','sceneId':scene['scene_id'],'style':profile,'parameters':{'speed':1}} if pn else await direct_scene(client,scene,profile)
        return await self._publish_async(project,script,resources)

    async def _publish_async(self, project, script, resources):
        cancelled=threading.Event()
        try: return await asyncio.to_thread(self.publish,project,script,resources,cancelled=cancelled)
        except asyncio.CancelledError:
            cancelled.set()
            raise

    def publish(self, project: dict[str,Any], script: dict[str,Any], scene_resources: dict[str,Any], *, cancelled=None) -> dict[str,Any]:
        with _LOCK:
            artifact_id=f"AM_{project['project_id']}"[:64]
            folder=self.root/project['project_id']
            versions=[int(p.stem.rsplit('-r',1)[1]) for p in (list(folder.glob(f'{artifact_id}-r*.json')) + list((self.candidates.root_dir/project['project_id']).glob(f'{artifact_id}-r*.json')) + list((self.resources/project['project_id']/'previews').glob(f'{artifact_id}-r*.json'))) if re.fullmatch(re.escape(artifact_id)+r'-r[1-9][0-9]*',p.stem)]
            revision=max(versions,default=0)+1
            resources={}; clips=[]; elements={}
            for scene in script['scenes']:
                resource=scene_resources[scene['scene_id']]
                data=encoded(resource); digest=hashlib.sha256(data).hexdigest()[:24]
                reference=f"{project['project_id']}/resources/{scene['scene_id']}-{digest}.json"
                immutable_write(self.resources/reference,data); resources[reference]=copy.deepcopy(resource)
                clips.append({'clip_id':f"CL_{scene['scene_id']}",'scene_id':scene['scene_id'],'start_ms':scene['start_ms'],'duration_ms':scene['duration_ms'],'resource_ref':reference,
                              'script_event_refs':[e['id'] for e in scene['events']], 'internal_events':[{'id':f"IE_{e['id']}",'offset_ms':e['offset_ms'],'description':e['description'],'script_event_refs':[e['id']]} for e in scene['events']]})
                if resource['kind']=='pn-scene':
                    for key in ['EL_S01_JUNCTION','EL_S01_CARRIERS','EL_S01_METER','EL_PN_FIXED_IONS','EL_PN_BARRIER','EL_PN_FIELD','EL_PN_WAVES']: elements[key]={'id':key}
                else:
                    for obj in resource['objects']: elements[obj['id']]={'id':obj['id']}
                for text in scene.get('timed_text',[]): elements[text['id']]={'id':text['id'],'source_ref':{'kind':'timed_text','id':text['id']}}
            manifest={'project_id':project['project_id'],'artifact_id':artifact_id,'revision':revision,'brief_revision':project['brief']['revision'], 'production_script_ref':self.ref(script),
                      'total_duration_ms':script['total_duration_ms'],'clips':clips,'selectable_elements':list(elements.values()),'preview_ref':f"{project['project_id']}/previews/{artifact_id}-r{revision}.json"}
            bundle={'manifest':manifest,'script':copy.deepcopy(script),'resources':resources,'projectRevision':project['revision']+1}
            path=self.resources/manifest['preview_ref']; immutable_write(path,encoded(bundle))
            # Reuse public Schema/ref validation before doing a real browser render.
            self.candidates.accept(project,script,manifest)
            receipt=self.validator(path,self.root/project['project_id']/f'check-r{revision}')
            if receipt.get('status')!='validated': raise ValueError('实际播放器检查未通过，保留原动画版本。')
            immutable_write(self._version(project['project_id'],artifact_id,revision),encoded(bundle))
            checked={'bundle_sha256':hashlib.sha256(encoded(bundle)).hexdigest(),'receipt':receipt}
            immutable_write(self.root/project['project_id']/f'{artifact_id}-r{revision}.checked.json',encoded(checked))
            if cancelled is not None and cancelled.is_set(): raise ValueError('动画任务已取消，保留原版本。')
            updated=self.projects.publish_artifact_ref(project['project_id'],project['revision'],'animation_manifest',self.ref(manifest))
            return {'artifact_ref':self.ref(manifest),'project_revision':updated['revision'],'status':'published'}

    def activate(self, project_id: str, ref: dict[str,Any], expected_revision: int) -> dict[str,Any]:
        project=self.projects.load(project_id); bundle=self.load(project_id,ref)
        if bundle['manifest']['production_script_ref']!=project['artifacts'].get('production_script') or bundle['manifest']['brief_revision']!=project['brief']['revision']: raise ValueError('旧动画引用了不同脚本或创作要求，无法回退为当前版本。')
        updated=self.projects.publish_artifact_ref(project_id,expected_revision,'animation_manifest',ref)
        return {'status':'published','artifact_ref':ref,'project_revision':updated['revision']}

    async def revise(self, project: dict[str,Any], request: dict[str,Any], *, client=None) -> dict[str,Any]:
        original=self.load(project['project_id'],self.ref(request['target_artifact']))
        text=request['problem']+'\n'+request.get('desired_change','')
        if re.search(r'知识|事实|极性|接法|时长|脚本|事件时间|删.*场景|改.*结论|电场方向|正负|电流方向|反转|颠倒|改.*方向|knowledge|duration|polarity|reverse.*field',text,re.I):
            return {'status':'upstream_required','message':'这条意见涉及知识或脚本约束，已保留请求，需要上游确认；当前动画未改变。'}
        anchors=request['anchors']; clip_ids={a['id'] for a in anchors if a['kind']=='clip'}
        scene_ids={a['id'] for a in anchors if a['kind']=='scene'}
        ranges=[a for a in anchors if a['kind']=='time_range']
        element_ids={a['id'] for a in anchors if a['kind']=='render_element'}
        if element_ids and not clip_ids and not scene_ids and not ranges:
            clip_ids={c['clip_id'] for c in original['manifest']['clips'] if element_ids.intersection({o['id'] for o in original['resources'][c['resource_ref']].get('objects',[])}) or original['resources'][c['resource_ref']]['kind']=='pn-scene'}
        affected=[c for c in original['manifest']['clips'] if request['scope']=='global' or c['clip_id'] in clip_ids or c['scene_id'] in scene_ids or any(r['start_ms']<c['start_ms']+c['duration_ms'] and r['end_ms']>c['start_ms'] for r in ranges)]
        if not affected: raise ValueError('请先选择需要修改的片段或时间范围。')
        resources={c['scene_id']:copy.deepcopy(original['resources'][c['resource_ref']]) for c in original['manifest']['clips']}
        for clip in affected:
            scene=next(s for s in original['script']['scenes'] if s['scene_id']==clip['scene_id'])
            old=resources[scene['scene_id']]
            if re.search(r'慢|减速|slower|slow',text,re.I) and old['kind']=='pn-scene': old['parameters']['speed']=max(.1,old['parameters']['speed']*.5)
            elif re.search(r'快|加速|faster|fast',text,re.I) and old['kind']=='pn-scene': old['parameters']['speed']=min(3,old['parameters']['speed']*1.5)
            elif client is not None and old['kind']=='pn-scene' and scene['scene_id']!='S01':
                response=await client.generate_json(instructions='Adjust only the selected PN scene visual parameters according to user feedback. Return JSON with speed (0.1..3), particleScale (0.5..2) and particleOpacity (0.3..1). Do not change facts, event schedules, object IDs, text, geometry, field polarity or barrier mechanism. Reject requests needing those changes by returning {"upstream_required":true}.',data={'scene':scene,'style_profile':old['style'],'parameters':old['parameters'],'feedback':text},max_output_tokens=800)
                values=response.value
                if values.get('upstream_required'): return {'status':'upstream_required','message':'这条意见涉及上游约束，已保留请求；当前动画未改变。'}
                for key,low,high in [('speed',.1,3),('particleScale',.5,2),('particleOpacity',.3,1)]:
                    value=values.get(key)
                    if isinstance(value,bool) or not isinstance(value,(int,float)) or not low<=value<=high: raise ValueError('动画参数无效。')
                old['parameters']={key:values[key] for key in ['speed','particleScale','particleOpacity']}
            elif client is not None and old['kind']=='vector-scene': resources[scene['scene_id']]=await direct_scene(client,scene,old['style'],previous=old,feedback=text)
            else: raise ValueError('这条局部美术修改需要模型支持，请提供本次 API Key；当前版本未改变。')
        return await self._publish_async(project,original['script'],resources)

    def _browser_validate(self, path: Path, output: Path) -> dict[str,Any]:
        from .api import child_environment
        result=subprocess.run(['node',str(ROOT/'frontend/scripts/render-video.mjs'),'--bundle',str(path),'--output',str(output),'--validate-only'],cwd=ROOT/'frontend',capture_output=True,text=True,timeout=120,env=child_environment())
        if result.returncode: raise ValueError('动画实际渲染检查失败，请检查场景实现与浏览器依赖。')
        return json.loads((output/'validation.json').read_text())
