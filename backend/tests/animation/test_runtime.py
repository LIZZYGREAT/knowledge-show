"""Publication tests inject a renderer receipt; browser checks run separately in E2E."""
import asyncio
import copy
import json
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from api.app import create_app
from animation.api import child_environment
from animation.director import PROFILES, direct_scene, preferred_profile_id, resolve_profile, validate_program
from animation.seed import seed_pn
from animation.service import AnimationService
from workflow.animation import AnimationManifestCandidateStore
from workflow.jobs import JobStore
from workflow.revisions import RevisionRequestStore
from workflow.service import read_knowledge_package, read_production_script
from workflow.state import ProjectStateStore, ProjectStateConflict

@pytest.fixture
def anyio_backend(): return 'asyncio'

@pytest.fixture
def runtime(tmp_path):
    projects=ProjectStateStore(tmp_path/'projects')
    project=seed_pn(projects=projects,knowledge_dir=tmp_path/'knowledge',script_dir=tmp_path/'script')
    candidates=AnimationManifestCandidateStore(tmp_path/'candidates',resource_root=tmp_path/'resources')
    service=AnimationService(projects,candidates,validator=lambda *_:{'status':'validated'})
    package=read_knowledge_package(project['project_id'],project['artifacts']['knowledge_package'],export_dir=tmp_path/'knowledge')
    script=read_production_script(project['project_id'],project['artifacts']['production_script'],project=project,package=package,export_dir=tmp_path/'script')
    return projects,project,script,service

def request_for(project,ref,problem='这里的粒子运动减慢一点'):
    return dict(project_id=project['project_id'],request_id='RR_TEST',base_project_revision=project['revision'],source='user',target_layer='animation',target_artifact={'kind':'animation_manifest',**ref},anchors=[{'kind':'render_element','id':'EL_S01_CARRIERS'},{'kind':'clip','id':'CL_S02'}],scope='local',problem=problem,desired_change=problem,original_user_feedback=problem,preserve=['脚本事实与时刻'])

@pytest.mark.anyio
async def test_local_revision_reuses_six_resources_and_old_version_can_be_activated(runtime):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    old=service.load(project['project_id'],first['artifact_ref'])
    project=projects.load(project['project_id'])
    second=await service.revise(project,request_for(project,first['artifact_ref']))
    new=service.load(project['project_id'],second['artifact_ref'])
    assert [a['scene_id'] for a,b in zip(old['manifest']['clips'],new['manifest']['clips']) if a['resource_ref']!=b['resource_ref']]==['S02']
    assert service.load(project['project_id'],first['artifact_ref'])==old
    activated=service.activate(project['project_id'],first['artifact_ref'],second['project_revision'])
    assert projects.load(project['project_id'])['artifacts']['animation_manifest']==first['artifact_ref']
    assert activated['project_revision']==second['project_revision']+1

@pytest.mark.anyio
async def test_failed_render_and_stale_cas_do_not_replace_current(runtime):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    project=projects.load(project['project_id'])
    service.validator=lambda *_:{'status':'failed'}
    with pytest.raises(ValueError): await service.generate(project,script,style_id='paper-editorial')
    assert projects.load(project['project_id'])['artifacts']['animation_manifest']==first['artifact_ref']
    service.validator=lambda *_:{'status':'validated'}
    second=await service.generate(project,script,style_id='modern-graphic')
    assert second['artifact_ref']['revision']==3 # failed immutable candidate is never overwritten
    with pytest.raises(ProjectStateConflict): await service.generate(project,script)
    assert projects.load(project['project_id'])['artifacts']['animation_manifest']==second['artifact_ref']

@pytest.mark.anyio
async def test_missing_or_tampered_resource_disables_ready(runtime):
    projects,project,script,service=runtime
    result=await service.generate(project,script)
    bundle=service.load(project['project_id'],result['artifact_ref'])
    file=service.resources/next(iter(bundle['resources']))
    file.write_text('{}')
    assert service.preview(projects.load(project['project_id']))['status']=='not_ready'

@pytest.mark.anyio
async def test_semantic_feedback_routes_upstream_without_changing_resources(runtime):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    project=projects.load(project['project_id'])
    result=await service.revise(project,request_for(project,first['artifact_ref'],'修改电场方向和知识结论'))
    assert result['status']=='upstream_required'
    assert projects.load(project['project_id'])==project


@pytest.mark.anyio
async def test_unselected_unknown_scope_defaults_to_global_visual_feedback(runtime):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    current=projects.load(project['project_id'])
    request=request_for(current,first['artifact_ref'],'整体慢一点')
    request['anchors']=[]
    request['scope']='unknown'
    assert not service.requires_model(current,request)
    result=await service.revise(current,request)
    bundle=service.load(project['project_id'],result['artifact_ref'])
    assert result['status']=='published'
    assert all(bundle['resources'][clip['resource_ref']]['parameters']['speed']==.5 for clip in bundle['manifest']['clips'])


@pytest.mark.anyio
async def test_camera_turnaround_feedback_is_not_routed_upstream(runtime):
    projects,project,script,service=runtime
    script=copy.deepcopy(script)
    script['scenes'][0]['objective']='A distinct non-sample visual scene.'
    class Client:
        async def generate_json(self,**kwargs):
            return SimpleNamespace(value=program(kwargs['data']['scene']))
    first=await service.generate(project,script,client=Client())
    current=projects.load(project['project_id'])
    request=request_for(current,first['artifact_ref'],'镜头转过来，让画面从另一侧看')
    request['anchors']=[]
    request['scope']='global'
    assert service.requires_model(current,request)
    result=await service.revise(current,request,client=Client())
    assert result['status']=='published'

@pytest.mark.anyio
async def test_model_receives_only_selected_scene_and_can_adjust_appearance(runtime):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    project=projects.load(project['project_id'])
    class Client:
        async def generate_json(self,**kwargs):
            assert kwargs['data']['scene']['scene_id']=='S02'
            assert 'api_key' not in kwargs['data']
            return SimpleNamespace(value={'speed':1,'particleScale':1.5,'particleOpacity':.8})
    result=await service.revise(project,request_for(project,first['artifact_ref'],'载流子更清楚一些'),client=Client())
    bundle=service.load(project['project_id'],result['artifact_ref'])
    clip=bundle['manifest']['clips'][1]
    assert bundle['resources'][clip['resource_ref']]['parameters']['particleScale']==1.5

@pytest.mark.anyio
async def test_api_validates_anchors_before_accepting_and_keeps_credentials_private(runtime,tmp_path):
    projects,project,script,service=runtime
    first=await service.generate(project,script)
    revisions=RevisionRequestStore(tmp_path/'requests')
    app=create_app(state_store=projects,job_store=JobStore(tmp_path/'jobs'),revision_store=revisions,animation_manifest_store=service.candidates,knowledge_export_dir=tmp_path/'knowledge',script_export_dir=tmp_path/'script')
    app.state.animation_runtime.validator=lambda *_:{'status':'validated'}
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://testclient') as client:
        current=projects.load(project['project_id'])
        request=request_for(current,first['artifact_ref'])
        request['anchors'][0]['id']='EL_MISSING'
        response=await client.post(f"/api/projects/{project['project_id']}/animations/revise",json={'request':request,'api_key':'DO_NOT_PERSIST'})
        assert response.status_code==409
        assert not list(revisions.root_dir.glob('**/*.json'))
        request=request_for(current,first['artifact_ref'],'修改知识结论')
        response=await client.post(f"/api/projects/{project['project_id']}/animations/revise",json={'request':request})
        assert response.json()['status']=='upstream_required'
        saved=[json.loads(p.read_text()) for p in revisions.root_dir.glob('**/*.json')]
        assert {r['target_layer'] for r in saved}=={'knowledge','animation'}
        assert 'DO_NOT_PERSIST' not in json.dumps(saved)
        request['base_project_revision']-=1
        assert (await client.post(f"/api/projects/{project['project_id']}/animations/revise",json={'request':request})).status_code==409

@pytest.mark.anyio
async def test_revision_request_reads_exact_checked_published_manifest(runtime,tmp_path):
    projects,project,script,service=runtime
    published=await service.generate(project,script)
    project=projects.load(project['project_id'])
    revisions=RevisionRequestStore(tmp_path/'requests')
    app=create_app(state_store=projects,job_store=JobStore(tmp_path/'jobs'),revision_store=revisions,
                   animation_manifest_store=service.candidates,knowledge_export_dir=tmp_path/'knowledge',
                   script_export_dir=tmp_path/'script')
    request=request_for(project,published['artifact_ref'])
    request['request_id']='RR_CHECKED_PUBLISHED_MANIFEST'
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://testclient') as client:
        response=await client.post(f"/api/projects/{project['project_id']}/revision-requests",json=request)
    assert response.status_code==202, response.text
    assert response.json()['status']=='received'
    assert revisions.root_dir.joinpath(project['project_id'],f"{request['request_id']}.json").exists()


def program(scene):
    frames=[dict(time_ms=t,x=200,y=200,opacity=1,scale=1,rotation=0) for t in sorted({0,scene['duration_ms'],*[e['offset_ms'] for e in scene['events'] if e.get('anchor')]})]
    objects=[dict(id='EL_ACTOR',label='actor',shape='circle',fill='#abcdef',radius=10,keyframes=frames),dict(id='EL_REFERENCE',label='reference',shape='circle',fill='#123456',radius=5,keyframes=copy.deepcopy(frames))]
    objects += [dict(id=t['id'],label=t['text'],shape='text',text=t['text'],fill='#ffffff',keyframes=copy.deepcopy(frames)) for t in scene['timed_text']]
    return {'objects':objects,'anchor_times_ms':[e['offset_ms'] for e in scene['events'] if e.get('anchor')]}


def test_program_checks_text_anchors_geometry_and_executable_payloads(runtime):
    scene=copy.deepcopy(runtime[2]['scenes'][1]); scene['events'][0]['anchor']=True; valid=program(scene)
    assert len(validate_program(scene,valid))>=2
    bad=copy.deepcopy(valid);bad['objects'][0]['keyframes'][0]['x']=float('nan')
    with pytest.raises(ValueError): validate_program(scene,bad)
    bad=copy.deepcopy(valid);next(o for o in bad['objects'] if o['shape']=='text')['text']='changed facts'
    with pytest.raises(ValueError): validate_program(scene,bad)
    bad=copy.deepcopy(valid);bad['anchor_times_ms']=[]
    with pytest.raises(ValueError): validate_program(scene,bad)
    bad=copy.deepcopy(valid);bad['objects'][0].update(shape='path',path='<script>alert(1)</script>')
    with pytest.raises(ValueError): validate_program(scene,bad)
    bad=copy.deepcopy(valid);bad['objects'][0]['html']='<script>alert(1)</script>'
    with pytest.raises(ValueError,match='不支持的字段'): validate_program(scene,bad)
    bad=copy.deepcopy(valid)
    caption=next(text for text in scene['timed_text'] if text['kind']=='subtitle')
    bad['objects'].append(dict(id='EL_DUPLICATE_CAPTION',label='重复字幕',shape='text',text=caption['text'],fill='#ffffff',keyframes=copy.deepcopy(valid['objects'][0]['keyframes'])))
    with pytest.raises(ValueError,match='字幕不得.*重复'): validate_program(scene,bad)


def test_profiles_and_child_environment_are_independent_of_app_secrets(monkeypatch):
    assert len({resolve_profile(p['id'])['name'] for p in PROFILES})==4
    custom=copy.deepcopy(PROFILES[0]);custom['id']='my-art'
    assert resolve_profile('custom',custom)['id']=='my-art'
    custom['palette']['ink']='url(https://example.com)'
    with pytest.raises(ValueError): resolve_profile('custom',custom)
    monkeypatch.setenv('DEEPSEEK_API_KEY','DO_NOT_PASS')
    monkeypatch.setenv('DATABASE_PASSWORD','DO_NOT_PASS')
    assert 'DEEPSEEK_API_KEY' not in child_environment()
    assert 'DATABASE_PASSWORD' not in child_environment()


def test_auto_profile_uses_script_topic_and_preserves_explicit_choice():
    assert resolve_profile('auto',script={'core_message':'用组合数量理解骰子概率','scenes':[]})['id']=='modern-graphic'
    assert resolve_profile('auto',script={'core_message':'一段古代文明的起源故事','scenes':[]})['id']=='narrative-collage'
    assert resolve_profile('paper-editorial',script={'core_message':'骰子概率','scenes':[]})['id']=='paper-editorial'
    assert preferred_profile_id('纤维纸与柔和投影',{'core_message':'概率','scenes':[]})=='paper-editorial'
    assert preferred_profile_id('敦煌风格的视觉表达',{'core_message':'概率','scenes':[]})=='modern-graphic'

@pytest.mark.anyio
async def test_formal_generation_job_publishes_only_after_renderer_receipt(runtime,tmp_path,monkeypatch):
    projects,project,script,service=runtime
    created=[]
    class Services:
        script=None
        closed=False
        async def close(self): self.closed=True
    def factory(_):
        value=Services();created.append(value);return value
    app=create_app(state_store=projects,job_store=JobStore(tmp_path/'jobs'),revision_store=RevisionRequestStore(tmp_path/'requests'),animation_manifest_store=service.candidates,knowledge_export_dir=tmp_path/'knowledge',script_export_dir=tmp_path/'script',services_factory=factory)
    app.state.animation_runtime.validator=lambda *_:{'status':'validated'}
    captured=[]
    original=app.state.animation_runtime.generate
    async def capture(*args,**kwargs):
        captured.append(kwargs)
        return await original(*args,**kwargs)
    monkeypatch.setattr(app.state.animation_runtime,'generate',capture)
    base=f"/api/projects/{project['project_id']}"
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://testclient') as client:
        response=await client.post(base+'/animations',json={'expected_project_revision':project['revision'],'api_key':'TRANSIENT_TEST_KEY','style_id':'paper-editorial','art_preference':'纸层更有纤维感'})
        assert response.status_code==202
        job=response.json()['job_id']
        for _ in range(100):
            state=(await client.get(base+'/animations/jobs/'+job)).json()
            if state['status'] not in ['queued','running']: break
            await asyncio.sleep(.01)
        assert state['status']=='completed'
        assert captured[0]['style_id']=='paper-editorial'
        assert captured[0]['art_preference']=='纸层更有纤维感'
        assert created[0].closed
        ready=(await client.get(base+'/preview')).json()
        assert ready['status']=='ready'
        assert (await client.get(ready['bundle_url'])).status_code==200
        assert len((await client.get(base+'/animations/versions')).json()['versions'])==1
        assert (await client.post(base+'/animations/revise',json={'request':[]})).status_code==409
    for file in tmp_path.rglob('*.json'):
        assert 'TRANSIENT_TEST_KEY' not in file.read_text()

@pytest.mark.anyio
async def test_generation_restores_interrupted_status_without_publishing(runtime,tmp_path):
    projects,project,script,service=runtime
    folder=service.root/project['project_id']/'jobs';folder.mkdir(parents=True)
    (folder/'AJ_INTERRUPTED.json').write_text(json.dumps({'job_id':'AJ_INTERRUPTED','status':'running'}))
    app=create_app(state_store=projects,job_store=JobStore(tmp_path/'jobs'),animation_manifest_store=service.candidates,knowledge_export_dir=tmp_path/'knowledge',script_export_dir=tmp_path/'script')
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://testclient') as client:
        state=(await client.get(f"/api/projects/{project['project_id']}/animations/status")).json()
        assert state['job']['status']=='interrupted'
        assert state['preview']['status']=='not_ready'
        assert projects.load(project['project_id'])['artifacts'].get('animation_manifest') is None

@pytest.mark.anyio
async def test_new_subject_uses_model_programs_and_rewrites_only_selected_scene(runtime):
    projects,project,script,service=runtime
    script=copy.deepcopy(script)
    script['scenes'][0]['objective']='Test a different original scene concept.'
    calls=[]
    class Client:
        async def generate_json(self,**kwargs):
            calls.append(kwargs['data'])
            value=program(kwargs['data']['scene'])
            if kwargs['data']['feedback']: value['objects'][0]['radius']=20
            return SimpleNamespace(value=value)
    first=await service.generate(project,script,client=Client())
    assert len(calls)==7
    assert all('scene' in data and 'scenes' not in data and 'api_key' not in data for data in calls)
    old=service.load(project['project_id'],first['artifact_ref'])
    assert all(r['kind']=='vector-scene' for r in old['resources'].values())
    project=projects.load(project['project_id'])
    request=request_for(project,first['artifact_ref'],'对象再清楚一些')
    request['anchors'][0]['id']='EL_ACTOR'
    second=await service.revise(project,request,client=Client())
    assert len(calls)==8 and calls[-1]['scene']['scene_id']=='S02'
    assert calls[-1]['previous_resource'] is not None
    new=service.load(project['project_id'],second['artifact_ref'])
    assert [a['scene_id'] for a,b in zip(old['manifest']['clips'],new['manifest']['clips']) if a['resource_ref']!=b['resource_ref']]==['S02']


@pytest.mark.anyio
async def test_scene_context_includes_verified_knowledge_neighbors_and_prior_object_identity(runtime):
    projects,project,script,service=runtime
    script=copy.deepcopy(script)
    script['scenes'][0]['knowledge_refs']=['K_ATTENTION']
    script['scenes'][1]['knowledge_refs']=['K_ATTENTION']
    script['core_message']='缩放点积把 query 与 key 的匹配转成注意力权重。'
    units={ref:{'id':ref,'verification_status':'verified','content':'已核验的知识内容。','explanation':'内容解释。','conditions':['适用条件。']} for scene in script['scenes'] for ref in scene.get('knowledge_refs',[])}
    units['K_ATTENTION']={'id':'K_ATTENTION','verification_status':'verified','content':'点积除以 √dₖ 后形成分数。','explanation':'softmax 将分数变成权重。','conditions':['dₖ 是 key 的维度。']}
    package={'knowledge_units':list(units.values())}
    captured=[]
    class Client:
        async def generate_json(self,**kwargs):
            captured.append(kwargs['data'])
            return SimpleNamespace(value=program(kwargs['data']['scene']))
    await service.generate(project,script,client=Client(),knowledge_package=package,art_preference='像纸雕一样分层')
    second=next(data for data in captured if data['scene']['scene_id']=='S02')
    context=second['scene_context']
    assert context['core_message']==script['core_message']
    assert context['user_art_preference']=='像纸雕一样分层'
    assert context['verified_knowledge'][0]['conditions']==['dₖ 是 key 的维度。']
    assert context['neighboring_scene_goals'][0]['scene_id']=='S01'
    assert context['stable_object_ids'][0]['id']=='EL_ACTOR'
    assert 'api_key' not in json.dumps(second)


@pytest.mark.anyio
async def test_invalid_scene_gets_one_bounded_retry_and_valid_scenes_are_cached(runtime):
    projects,project,script,service=runtime
    script=copy.deepcopy(script)
    script['scenes'][0]['objective']='Force a fresh non-sample scene cache entry.'
    calls=[]
    class Client:
        async def generate_json(self,**kwargs):
            calls.append(kwargs)
            if kwargs['data']['scene']['scene_id']=='S01' and kwargs['data']['format_feedback'] is None:
                return SimpleNamespace(value={'objects':[],'anchor_times_ms':[]})
            return SimpleNamespace(value=program(kwargs['data']['scene']))
    await service.generate(project,script,client=Client())
    assert len(calls)==8
    assert calls[1]['data']['format_feedback']
    current=projects.load(project['project_id'])
    await service.generate(current,script,client=Client())
    assert len(calls)==8
    cache_path=next(path for path in (service.root/project['project_id']/'generation-cache').glob('*.json') if json.loads(path.read_text())['resource']['sceneId']=='S02')
    damaged=json.loads(cache_path.read_text())
    damaged['resource']['objects'][0]['label']+=' changed'
    cache_path.write_text(json.dumps(damaged))
    current=projects.load(project['project_id'])
    await service.generate(current,script,client=Client())
    assert len(calls)==9


@pytest.mark.anyio
async def test_single_object_scene_is_valid(runtime):
    scene=copy.deepcopy(runtime[2]['scenes'][2])
    value=program(scene)
    value['objects']=[obj for obj in value['objects'] if obj['id']=='EL_ACTOR' or obj['id'] in {text['id'] for text in scene['timed_text']}]
    assert len(validate_program(scene,value))>=1

@pytest.mark.anyio
async def test_model_local_rewrite_cannot_replace_stable_object_ids(runtime):
    scene=runtime[2]['scenes'][1]
    previous={'objects':program(scene)['objects']}
    class Client:
        async def generate_json(self,**kwargs):
            value=program(scene); value['objects'][0]['id']='EL_REPLACED'
            return SimpleNamespace(value=value)
    with pytest.raises(ValueError,match='对象身份'):
        await direct_scene(Client(),scene,PROFILES[0],previous=previous,feedback='请更清楚一些')

@pytest.mark.parametrize('style',['paper-editorial','precision-science','modern-graphic','narrative-collage'])
def test_soap_fixtures_use_validated_internal_programs(style):
    from pathlib import Path
    from jsonschema import Draft202012Validator
    root=Path(__file__).resolve().parents[3]
    fixture=root/'frontend/tests/fixtures/soap-style-lab'
    bundle=json.loads((fixture/f'style-{style}.json').read_text())
    script=json.loads((fixture/'production-script.json').read_text())
    assert bundle['script']==script
    Draft202012Validator(json.loads((root/'contracts/schemas/production-script.schema.json').read_text())).validate(script)
    for scene,resource in zip(script['scenes'],bundle['resources'].values()):
        value={'objects':resource['objects'],'anchor_times_ms':[4500]}
        assert validate_program(scene,value)==resource['objects']
        bad=copy.deepcopy(value);bad['objects'][0]['materialKey']='url(https://invalid)'
        with pytest.raises(ValueError,match='外观'): validate_program(scene,bad)
        bad=copy.deepcopy(value);bad['objects'][0]['strokeWidth']=float('nan')
        with pytest.raises(ValueError,match='外观'): validate_program(scene,bad)

@pytest.mark.anyio
@pytest.mark.parametrize('style',['paper-editorial','precision-science','modern-graphic','narrative-collage'])
async def test_fake_director_emits_supported_materials_and_motion(style):
    from pathlib import Path
    fixture=Path(__file__).resolve().parents[3]/'frontend/tests/fixtures/soap-style-lab'
    bundle=json.loads((fixture/f'style-{style}.json').read_text())
    class FakeDirector:
        async def generate_json(self,**kwargs):
            assert 'materialKey' in kwargs['instructions'] and 'drawProgress' in kwargs['instructions']
            assert '#RRGGBB' in kwargs['instructions'] and 'style_profile.palette' in kwargs['instructions']
            scene=kwargs['data']['scene']
            resource=next(r for r in bundle['resources'].values() if r['sceneId']==scene['scene_id'])
            return SimpleNamespace(value={'objects':resource['objects'],'anchor_times_ms':[4500]})
    for scene in bundle['script']['scenes']:
        resource=await direct_scene(FakeDirector(),scene,resolve_profile(style))
        assert resource['kind']=='vector-scene' and resource['style']['id']==style
        bad={'objects':copy.deepcopy(resource['objects']),'anchor_times_ms':[4500]}
        bad['objects'][0]['keyframes'][0]['easing']='arbitrary-js'
        with pytest.raises(ValueError,match='运动曲线'): validate_program(scene,bad)
        bad['objects'][0]['keyframes'][0].pop('easing')
        bad['objects'][0]['keyframes'][0]['drawProgress']=float('inf')
        with pytest.raises(ValueError,match='路径显现'): validate_program(scene,bad)
