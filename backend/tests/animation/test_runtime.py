"""Publication tests inject a renderer receipt; browser checks run separately in E2E."""
import asyncio
import copy
import json
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from api.app import create_app
from animation.api import child_environment
from animation.director import PROFILES, direct_scene, resolve_profile, validate_program
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

@pytest.mark.anyio
async def test_formal_generation_job_publishes_only_after_renderer_receipt(runtime,tmp_path):
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
    base=f"/api/projects/{project['project_id']}"
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://testclient') as client:
        response=await client.post(base+'/animations',json={'expected_project_revision':project['revision'],'api_key':'TRANSIENT_TEST_KEY'})
        assert response.status_code==202
        job=response.json()['job_id']
        for _ in range(100):
            state=(await client.get(base+'/animations/jobs/'+job)).json()
            if state['status'] not in ['queued','running']: break
            await asyncio.sleep(.01)
        assert state['status']=='completed'
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
async def test_model_local_rewrite_cannot_replace_stable_object_ids(runtime):
    scene=runtime[2]['scenes'][1]
    previous={'objects':program(scene)['objects']}
    class Client:
        async def generate_json(self,**kwargs):
            value=program(scene); value['objects'][0]['id']='EL_REPLACED'
            return SimpleNamespace(value=value)
    with pytest.raises(ValueError,match='对象身份'):
        await direct_scene(Client(),scene,PROFILES[0],previous=previous,feedback='请更清楚一些')
