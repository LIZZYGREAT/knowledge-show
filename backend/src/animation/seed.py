"""Explicit offline PN acceptance sample, published through the real artifact stores."""
from __future__ import annotations
import json
from knowledge.service import export_knowledge_package
from script.artifacts import export_production_script
from workflow.state import ProjectStateStore
from .service import ROOT


def seed_pn(*, projects=None, knowledge_dir=None, script_dir=None):
    projects=projects or ProjectStateStore()
    project=projects.create({'topic':'PN 结为什么单向导电（固定样片验收）','creative_mode':'visual_explain','knowledge_depth':'intro','aspect_ratio':'16:9'})
    source=ROOT/'docs/work/backend/script/trials/case2-pn-v2'
    package=json.loads((source/'knowledge-package.json').read_text())
    package.update(project_id=project['project_id'],artifact_id=f"KP_{project['project_id']}",brief_revision=project['brief']['revision'])
    # This is an explicitly imported, previously verified fixture, not fresh research.
    export_knowledge_package(package,knowledge_dir or ROOT/'.local/knowledge-exports')
    project=projects.publish_artifact_ref(project['project_id'],project['revision'],'knowledge_package',{'artifact_id':package['artifact_id'],'revision':package['revision']})
    project=projects.update(project['project_id'],project['revision'],decisions={'direction_id':package['recommended_direction_id'],'direction_status':'system_default'})
    script=json.loads((source/'production-script.json').read_text())
    script.update(project_id=project['project_id'],artifact_id=f"PS_{project['project_id']}",brief_revision=project['brief']['revision'],knowledge_package_ref={'artifact_id':package['artifact_id'],'revision':package['revision']})
    export_production_script(script,script_dir or ROOT/'.local/script-exports',project_state=project,knowledge_package=package)
    project=projects.publish_artifact_ref(project['project_id'],project['revision'],'production_script',{'artifact_id':script['artifact_id'],'revision':script['revision']})
    return project

if __name__=='__main__':
    print(json.dumps({'sample':'fixed-pn-v2','project':seed_pn()},ensure_ascii=False))
