"""Local animation production endpoints, using existing project and artifact contracts."""
from __future__ import annotations
import asyncio
import copy
import json
import os
import re
import shutil
import signal
import uuid
from pathlib import Path
from typing import Any, Callable
from jsonschema import Draft202012Validator
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from .director import PROFILES, is_pn_script, resolve_profile
from .service import AnimationService, encoded, ROOT, ID
from workflow.service import read_knowledge_package, read_production_script, WorkflowError
from workflow.state import ProjectStateConflict


def child_environment() -> dict[str,str]:
    allowed={'PATH','HOME','USER','TMPDIR','LANG','LC_ALL','LD_LIBRARY_PATH','FONTCONFIG_FILE','FONTCONFIG_PATH','XDG_CACHE_HOME','PLAYWRIGHT_BROWSERS_PATH','ANIMATION_FFMPEG','ANIMATION_FFPROBE'}
    return {key:value for key,value in os.environ.items() if key in allowed}


def install_animation_routes(app: FastAPI, *, projects, candidates, revisions, services_factory: Callable, active_tasks: set, knowledge_export_dir=None, script_export_dir=None) -> AnimationService:
    service=AnimationService(projects,candidates)
    active: set[str]=set()
    app.state.animation_runtime=service
    for path in service.root.glob('*/jobs/*.json'):
        try:
            state=json.loads(path.read_text())
            if state.get('status') in ['queued','running']:
                state.update(status='interrupted',message='服务重启，中断的动画没有替换当前成果。'); path.write_bytes(encoded(state))
        except (OSError,ValueError): continue
    for path in service.root.glob('*/exports/*/state.json'):
        try:
            state=json.loads(path.read_text())
            if state.get('status') in ['queued','rendering']:
                state.update(status='failed',message='服务重启，未完成的视频需要重新导出。'); path.write_bytes(encoded(state))
        except (OSError,ValueError): continue
    def failure(code: int, text: str): return JSONResponse(status_code=code,content={'error':{'code':'animation_error','message':text}})
    def script_for(project_id: str):
        project=projects.load(project_id)
        package=read_knowledge_package(project_id,project['artifacts'].get('knowledge_package'),export_dir=knowledge_export_dir)
        script=read_production_script(project_id,project['artifacts'].get('production_script'),project=project,package=package,export_dir=script_export_dir)
        return project,script
    def job_path(project_id: str, job_id: str):
        if not ID.fullmatch(project_id) or not ID.fullmatch(job_id): raise ValueError('任务编号无效。')
        return service.root/project_id/'jobs'/f'{job_id}.json'
    def write_job(path: Path, value: dict[str,Any]):
        path.parent.mkdir(parents=True,exist_ok=True)
        temporary=path.with_suffix('.tmp'); temporary.write_bytes(encoded(value)); os.replace(temporary,path)
    async def run_generation(project_id, job_id, project, script, body):
        path=job_path(project_id,job_id); clients=None
        write_job(path,{'job_id':job_id,'status':'running','message':'正在构思并制作动画场景。'})
        try:
            client=None
            key=body.get('api_key')
            if key:
                clients=services_factory(key); client=clients.script
            style_id=body.get('style_id','auto'); custom=body.get('custom_profile')
            preference=project['brief']['user_input'].get('art_style','')
            if style_id=='auto' and preference:
                match=next((p for p in PROFILES if preference in [p['id'],p['name']]),None)
                if match: style_id=match['id']
                elif client is None: raise ValueError('你的美术偏好需要模型构思，请配置本次 API Key。')
                else:
                    response=await client.generate_json(instructions='Create one original video art StyleProfile JSON matching the example shape. Obey the user art preference. Use exactly eight #RRGGBB palette keys and plain ASCII CSS font names. Do not define scene layouts or events.',data={'user_preference':preference,'example_shape':PROFILES[0]},max_output_tokens=2200)
                    custom=resolve_profile('custom',response.value); style_id='custom'
            result=await service.generate(project,script,style_id=style_id,custom=custom,client=client)
            write_job(path,{**result,'job_id':job_id,'status':'completed','message':'动画已通过实际播放检查并发布。'})
        except asyncio.CancelledError:
            write_job(path,{'job_id':job_id,'status':'interrupted','message':'服务停止，未完成的动画没有替换当前成果。'}); raise
        except Exception:
            write_job(path,{'job_id':job_id,'status':'failed','message':'动画制作未完成；请检查创作要求、模型连接或本地渲染环境后重试。旧成果已保留。'})
        finally:
            active.discard(project_id)
            if clients is not None: await clients.close()

    @app.get('/api/projects/{project_id}/animations/status')
    async def animation_status(project_id: str):
        try:
            project=projects.load(project_id)
            preview=service.preview(project)
            paths=list((service.root/project_id/'jobs').glob('*.json'))
            latest=max(paths,key=lambda p:p.stat().st_mtime_ns) if paths else None
            return {'preview':preview,'job':json.loads(latest.read_text()) if latest else None}
        except (OSError,ValueError,LookupError): return failure(404,'项目动画状态不存在。')

    @app.get('/api/projects/{project_id}/animations/versions')
    async def versions(project_id: str):
        try:
            project=projects.load(project_id); refs=[]
            for path in (service.root/project_id).glob('AM_*-r*.json'):
                try:
                    value=json.loads(path.read_text()); ref=service.ref(value['manifest'])
                    value=service.load(project_id,ref)
                    if value['manifest']['production_script_ref']==project['artifacts'].get('production_script') and value['manifest']['brief_revision']==project['brief']['revision']: refs.append(ref)
                except (OSError,ValueError,KeyError): continue
            return {'versions':sorted(refs,key=lambda r:r['revision']),'current':project['artifacts'].get('animation_manifest')}
        except (OSError,ValueError,LookupError): return failure(404,'项目动画版本不存在。')

    @app.get('/api/animation/styles')
    async def styles(): return {'profiles':PROFILES}

    @app.post('/api/projects/{project_id}/animations',status_code=202)
    async def generate(project_id: str, body: dict[str,Any]):
        try:
            project,script=script_for(project_id)
            if project_id in active: return failure(409,'这个项目正在制作动画，请等待本次任务完成。')
            if body.get('expected_project_revision')!=project['revision']: return failure(409,'项目已更新，请刷新后重新制作。')
            resolve_profile(body.get('style_id','auto'),body.get('custom_profile'))
            if not is_pn_script(script) and not body.get('api_key'): return failure(422,'新脚本的动画构思需要本次使用的 API Key。')
            if body.get('api_key') is not None and (not isinstance(body['api_key'],str) or not 1<=len(body['api_key'])<=512): return failure(422,'模型凭证格式不正确。')
            job_id=f"AJ_{uuid.uuid4().hex}"; active.add(project_id)
            write_job(job_path(project_id,job_id),{'job_id':job_id,'status':'queued','message':'动画任务已创建。'})
            task=asyncio.create_task(run_generation(project_id,job_id,project,script,body)); active_tasks.add(task); task.add_done_callback(active_tasks.discard)
            return {'job_id':job_id,'status':'queued'}
        except (ValueError,LookupError,OSError,WorkflowError): return failure(409,'当前项目尚无可交接的精确脚本，或美术档案无效。')

    @app.get('/api/projects/{project_id}/animations/jobs/{job_id}')
    async def generation_job(project_id: str, job_id: str):
        try: return json.loads(job_path(project_id,job_id).read_text())
        except (OSError,ValueError): return failure(404,'没有找到这个动画任务。')

    @app.get('/api/projects/{project_id}/animations/{artifact_id}/r{revision}/bundle')
    async def bundle(project_id: str, artifact_id: str, revision: int):
        try:
            result=copy.deepcopy(service.load(project_id,{'artifact_id':artifact_id,'revision':revision}))
            result['projectRevision']=projects.load(project_id)['revision']
            return result
        except (ValueError,LookupError,OSError): return failure(404,'这个动画版本不存在、资源缺失或尚未通过检查。')

    @app.post('/api/projects/{project_id}/animations/activate')
    async def activate(project_id: str, body: dict[str,Any]):
        try: return service.activate(project_id,body['artifact_ref'],body['expected_project_revision'])
        except (ValueError,LookupError,OSError,KeyError,ProjectStateConflict): return failure(409,'项目版本已更新，或旧动画与当前脚本不匹配。')

    @app.post('/api/projects/{project_id}/animations/revise')
    async def revise(project_id: str, body: dict[str,Any]):
        clients=None
        try:
            project=projects.load(project_id); request=body['request']
            if not Draft202012Validator(json.loads(revisions.schema_path.read_text())).is_valid(request): raise ValueError('修改请求格式无效。')
            if request['target_artifact']['kind']!='animation_manifest': raise ValueError('修改目标必须是动画。')
            original=service.load(project_id,service.ref(request['target_artifact']))
            available={e['id'] for e in original['manifest'].get('selectable_elements',[])}
            clips={c['clip_id'] for c in original['manifest']['clips']}
            scenes={s['scene_id'] for s in original['script']['scenes']}
            for a in request['anchors']:
                if a['kind']=='render_element' and a['id'] not in available or a['kind']=='clip' and a['id'] not in clips or a['kind']=='scene' and a['id'] not in scenes: raise ValueError('修订目标不存在。')
                if a['kind']=='time_range' and not 0<=a['start_ms']<a['end_ms']<=original['manifest']['total_duration_ms']: raise ValueError('修订时间范围无效。')
            if body.get('api_key') and (not isinstance(body['api_key'],str) or not 1<=len(body['api_key'])<=512): raise ValueError('凭证格式不正确。')
            revisions.accept(project,request)
            if body.get('api_key'):
                if not isinstance(body['api_key'],str) or not 1<=len(body['api_key'])<=512: raise ValueError('凭证格式不正确。')
                clients=services_factory(body['api_key'])
            result=await service.revise(project,request,client=clients.script if clients else None)
            if result['status']=='upstream_required':
                upstream=copy.deepcopy(request)
                upstream['request_id']=request['request_id'][:60]+'_UP'
                upstream['target_layer']='knowledge' if re.search(r'知识|事实|结论|knowledge',request['problem']+' '+request.get('desired_change',''),re.I) else 'script'
                revisions.accept(project,upstream)
                result['upstream_request_id']=upstream['request_id']
            return result
        except (ValueError,LookupError,OSError,KeyError,ProjectStateConflict): return failure(409,'修改目标已过期、引用无效，或这条意见需要模型支持；当前动画保持原版本。')
        except Exception: return failure(503,'模型或本地渲染暂时没有完成这条修改，当前动画保持原版本。')
        finally:
            if clients is not None: await clients.close()

    async def run_export(project_id, export_id, ref):
        output=service.root/project_id/'exports'/export_id
        output.mkdir(parents=True,exist_ok=True)
        path=output/'state.json'
        write_job(path,{'status':'rendering'})
        try:
            service.load(project_id,ref)
            ffmpeg=os.getenv('ANIMATION_FFMPEG') or shutil.which('ffmpeg')
            ffprobe=os.getenv('ANIMATION_FFPROBE') or shutil.which('ffprobe')
            if not ffmpeg or not ffprobe: raise ValueError('编码器缺失。')
            command=['node',str(ROOT/'frontend/scripts/render-video.mjs'),'--bundle',str(service._version(project_id,ref['artifact_id'],ref['revision'])),'--output',str(output),'--ffmpeg',ffmpeg,'--ffprobe',ffprobe]
            process=await asyncio.create_subprocess_exec(*command,cwd=ROOT/'frontend',env=child_environment(),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,start_new_session=True)
            try:
                await asyncio.wait_for(process.communicate(),timeout=3600)
            except BaseException:
                try: os.killpg(process.pid,signal.SIGTERM)
                except ProcessLookupError: pass
                await process.wait(); raise
            if process.returncode: raise ValueError('视频渲染或编码失败。')
            write_job(path,{'status':'completed','artifact_ref':ref})
        except BaseException:
            write_job(path,{'status':'failed','message':'视频导出未完成，请检查本地浏览器与编码器环境后重试。预览版本仍保留。'})

    @app.post('/api/projects/{project_id}/animations/export',status_code=202)
    async def export(project_id: str, body: dict[str,Any]):
        try:
            project=projects.load(project_id); ref=body['artifact_ref']; service.load(project_id,ref)
            if ref!=project['artifacts'].get('animation_manifest'): return failure(409,'请先切换到项目当前动画版本，再进行导出。')
            export_id=f"EX_{uuid.uuid4().hex}"
            write_job(service.root/project_id/'exports'/export_id/'state.json',{'status':'queued','artifact_ref':ref})
            task=asyncio.create_task(run_export(project_id,export_id,ref)); active_tasks.add(task); task.add_done_callback(active_tasks.discard)
            return {'export_id':export_id,'status':'queued'}
        except (ValueError,LookupError,OSError,KeyError): return failure(409,'动画资源尚未就绪。')

    def export_folder(project_id,export_id):
        if not ID.fullmatch(project_id) or not ID.fullmatch(export_id): raise ValueError('导出编号无效。')
        return service.root/project_id/'exports'/export_id

    @app.get('/api/projects/{project_id}/animations/exports/{export_id}')
    async def export_status(project_id: str, export_id: str):
        try:
            folder=export_folder(project_id,export_id); state=json.loads((folder/'state.json').read_text())
            progress=json.loads((folder/'progress.json').read_text()) if (folder/'progress.json').exists() else {}
            if state['status']=='completed': return {**progress,**state,'download_url':f'/api/projects/{project_id}/animations/exports/{export_id}/video'}
            return {**progress,**state}
        except (OSError,ValueError): return failure(404,'导出任务尚未开始或不存在。')

    @app.get('/api/projects/{project_id}/animations/exports/{export_id}/video')
    async def download(project_id: str, export_id: str):
        try:
            folder=export_folder(project_id,export_id)
            if json.loads((folder/'state.json').read_text())['status']!='completed': return failure(409,'视频尚未编码完成。')
            if not (folder/'video.mp4').is_file(): return failure(404,'视频文件已不可用，请重新导出。')
            return FileResponse(folder/'video.mp4',media_type='video/mp4',filename=f'{project_id}-{export_id}.mp4')
        except (OSError,ValueError): return failure(404,'视频文件不存在。')
    return service
