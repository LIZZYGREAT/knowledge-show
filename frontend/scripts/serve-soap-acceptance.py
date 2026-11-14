"""Isolated no-network acceptance server; never attaches to a user's project store.

.venv/bin/python frontend/scripts/serve-soap-acceptance.py --root /tmp/ks-soap-chain
Use the fixture key SOAP_FAKE in the workbench. It is not a model credential.
"""
import argparse
import copy
import json
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend/src'))
from api.app import create_app
from knowledge.brief import build_brief
from knowledge.service import export_knowledge_package
from script.artifacts import export_production_script
from workflow.animation import AnimationManifestCandidateStore
from workflow.jobs import JobStore
from workflow.revisions import RevisionRequestStore
from workflow.state import ProjectStateStore
import uvicorn

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root',type=Path,required=True)
parser.add_argument('--port',type=int,default=8000)
parser.add_argument('--resume',action='store_true',help='Reopen this harness’s existing isolated fixture folder')
args=parser.parse_args()
folder=args.root.resolve()
if not args.resume and folder.exists() and any(folder.iterdir()): raise SystemExit('Use a new empty acceptance folder; existing files are never overwritten.')
folder.mkdir(parents=True,exist_ok=True)
fixture=ROOT/'frontend/tests/fixtures/soap-style-lab'
script=json.loads((fixture/'production-script.json').read_text())
project_id=script['project_id']
projects=ProjectStateStore(folder/'projects')
if not args.resume:
    # A legal short-duration ProjectState fixture. The product default stays 165 seconds.
    project=dict(project_id=project_id,revision=1,brief=build_brief({'topic':'肥皂去油（无费用研发样片）','creative_mode':'visual_explain','knowledge_depth':'intro','aspect_ratio':'16:9'},effective={'target_duration_ms':27000}),decisions={},artifacts={})
    project_folder=folder/'projects'/project_id;project_folder.mkdir(parents=True)
    (project_folder/'project-r1.json').write_text(json.dumps(project,ensure_ascii=False))
    project=projects.load(project_id)
    source='https://openstax.org/books/chemistry-2e/pages/11-5-colloids'
    package=dict(project_id=project_id,artifact_id='KP_SOAP_LAB',revision=1,brief_revision=1,
        directions=[dict(id='D_SOAP',title='界面如何带走油污',core_question='肥皂为什么帮助冲走油？',hook='水流经过，油却留下。',learning_goal=script['core_message'],knowledge_refs=['K_SOAP_INTERFACE'],duration_fit={'status':'adequate','reason':'专用 27 秒三幕视觉验收，不替代正式短视频。'})],recommended_direction_id='D_SOAP',
        knowledge_units=[dict(id='K_SOAP_INTERFACE',type='principle',content=script['core_message'],explanation='亲水端朝向水相，亲油端朝油相；搅动可将油分散成小滴，冲洗将其带走。',importance='core',verification_status='verified',conditions=['两亲分子在油水界面排列；本样例简化形状、尺度与数量。','分散与冲洗需要流动或搅动，不表示油发生化学消失。'],evidence_refs=['E_SOAP'])],
        evidence=[dict(id='E_SOAP',kind='external_source',title='OpenStax Chemistry 2e §11.5 Soaps and Detergents',locator=source,details='固定研发样例按教材油水界面和两亲分子说明核对，不代表本轮运行了知识研究流程。')],
        constraints=dict(required_knowledge_refs=['K_SOAP_INTERFACE'],must_not_misrepresent=['不得反转分子方向；不得将分散表现为化学消失。']))
    export_knowledge_package(package,folder/'knowledge')
    project=projects.publish_artifact_ref(project_id,project['revision'],'knowledge_package',script['knowledge_package_ref'])
    project=projects.update(project_id,project['revision'],decisions={'direction_id':'D_SOAP','direction_status':'system_default'})
    export_production_script(script,folder/'script',project_state=project,knowledge_package=package)
    project=projects.publish_artifact_ref(project_id,project['revision'],'production_script',{'artifact_id':script['artifact_id'],'revision':1})
else:
    project=projects.load(project_id)

calls_path=folder/'fake-director-calls.json'
calls=json.loads(calls_path.read_text())['fake_calls'] if calls_path.exists() else []
class FakeDirector:
    async def generate_json(self,**kwargs):
        data=kwargs['data'];scene=data['scene'];style=data['style_profile']['id']
        bundle=json.loads((fixture/f'style-{style}.json').read_text())
        resource=copy.deepcopy(data.get('previous_resource') or next(r for r in bundle['resources'].values() if r['sceneId']==scene['scene_id']))
        if data.get('feedback'):
            oil=next(o for o in resource['objects'] if o['id']=='EL_OIL');oil['strokeWidth']=min(30,oil.get('strokeWidth',0)+2)
        calls.append(dict(scene_id=scene['scene_id'],style=style,revision=bool(data.get('feedback'))))
        (folder/'fake-director-calls.json').write_text(json.dumps({'fake_calls':calls,'model_api_calls':0},indent=2))
        return SimpleNamespace(value={'objects':resource['objects'],'anchor_times_ms':[4500]})
class Services:
    def __init__(self,key):
        if key!='SOAP_FAKE': raise ValueError('This isolated server only accepts the SOAP_FAKE fixture key.')
        self.script=FakeDirector()
    async def close(self): pass
app=create_app(state_store=projects,job_store=JobStore(folder/'jobs'),revision_store=RevisionRequestStore(folder/'requests'),animation_manifest_store=AnimationManifestCandidateStore(folder/'candidates',resource_root=folder/'resources'),knowledge_export_dir=folder/'knowledge',script_export_dir=folder/'script',services_factory=Services)
(folder/'connection.json').write_text(json.dumps({'project_id':project_id,'project_revision':project['revision'],'port':args.port,'model_api_calls':0},indent=2))
uvicorn.run(app,host='127.0.0.1',port=args.port,access_log=False)
