#!/usr/bin/env python3
"""V2 sample contract tests: JSON Schema + cross-artifact consistency (not content accuracy)."""
from __future__ import annotations
import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator

BASE = Path(__file__).resolve().parent
NAMES = ('project-state', 'knowledge-package', 'production-script', 'animation-manifest', 'revision-request')

def load(name: str, section: str) -> dict:
    return json.loads((BASE / section / f'{name}.{section[:-1] if False else "schema" if section=="schemas" else "example"}.json').read_text(encoding='utf-8'))

def fixtures():
    return {name: json.loads((BASE/'examples'/f'{name}.example.json').read_text(encoding='utf-8')) for name in NAMES}

def fail(message: str) -> None:
    raise ValueError(message)

def require(cond: bool, message: str) -> None:
    if not cond: fail(message)

def unique(items, key: str, label: str) -> None:
    values = [i[key] for i in items]
    require(len(values)==len(set(values)), f'duplicate {label} IDs')

def check_schema(data: dict) -> None:
    for name in NAMES:
        schema=json.loads((BASE/'schemas'/f'{name}.schema.json').read_text(encoding='utf-8'))
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(data[name])

def check_cross(data: dict) -> None:
    ps,kp,script,am,rr=(data[n] for n in NAMES)
    assert_set={x['project_id'] for x in data.values()}
    require(len(assert_set)==1,'project IDs mismatch')
    require(len({x['schema_version'] for x in data.values()})==1,'schema versions mismatch')
    # User explicitly supplied values are binding. Defaults are not.
    ui,eff=ps['brief']['user_input'],ps['brief']['effective']
    for field in ('creative_mode','knowledge_depth','aspect_ratio','art_style'):
        if field in ui and ui[field]!='auto':
            require(eff.get(field)==ui[field], f'user explicit preference overridden: {field}')
    require(kp['brief_revision']==ps['brief']['revision'], 'knowledge built from stale brief')
    require(script['brief_revision']==ps['brief']['revision'], 'script built from stale brief')
    require(am['brief_revision']==ps['brief']['revision'], 'manifest built from stale brief')
    refs=[('knowledge_package','knowledge-package'),('production_script','production-script'),('animation_manifest','animation-manifest')]
    for field,name in refs:
        if field in ps['artifacts']:
            ref=ps['artifacts'][field]
            require(ref=={k:data[name][k] for k in ('artifact_id','revision')},f'ProjectState.artifacts.{field} mismatch')
    require(script['knowledge_package_ref']=={k:kp[k] for k in ('artifact_id','revision')},'script knowledge ref mismatch')
    require(am['production_script_ref']=={k:script[k] for k in ('artifact_id','revision')},'manifest script ref mismatch')
    if 'direction_id' in ps['decisions']:
        require(script['direction_id']==ps['decisions']['direction_id'],'selected direction mismatch')
    require(script['total_duration_ms']==am['total_duration_ms'],'script/manifest total length mismatch')
    # Knowledge graph
    directions,units,evidence=kp['directions'],kp['knowledge_units'],kp['evidence']
    for seq,k,label in ((directions,'id','direction'),(units,'id','knowledge unit'),(evidence,'id','evidence')): unique(seq,k,label)
    dset={d['id'] for d in directions}; u={v['id']:v for v in units}; eset={e['id'] for e in evidence}
    require(kp['recommended_direction_id'] in dset,'recommended direction absent')
    require(script['direction_id'] in dset,'script direction absent')
    for d in directions:
        require(set(d['knowledge_refs']) <= set(u),f'{d["id"]}: unknown knowledge refs')
    for k in units:
        require(set(k.get('depends_on',[])) <= set(u),f'{k["id"]}: unknown dependency')
        require(set(k['evidence_refs']) <= eset,f'{k["id"]}: unknown evidence')
    require(set(kp['constraints']['required_knowledge_refs']) <= set(u),'unknown required knowledge')
    seen=set(); visiting=set()
    def visit(kid):
        if kid in visiting: fail('circular knowledge dependency')
        if kid in seen:return
        visiting.add(kid)
        for dep in u[kid].get('depends_on',[]):visit(dep)
        visiting.remove(kid);seen.add(kid)
    for kid in u:visit(kid)
    # Script temporal contract
    scenes=script['scenes']; unique(scenes,'scene_id','scene')
    scene_by_id={s['scene_id']:s for s in scenes}
    script_events={}; narrated=set(); end=0; used_k=set()
    for s in scenes:
        require(s['start_ms']==end,'script scenes must form contiguous timeline')
        end+=s['duration_ms']
        require(set(s['knowledge_refs'])<=set(u),f'{s["scene_id"]}: unknown knowledge unit')
        used_k.update(s['knowledge_refs'])
        last=-1
        for ev in s['events']:
            require(ev['id'] not in script_events,'duplicate script event ID')
            require(ev['offset_ms']>=last,'script events not time-sorted')
            require(ev['offset_ms'] < s['duration_ms'],'script event outside scene')
            if 'duration_ms' in ev: require(ev['offset_ms']+ev['duration_ms']<=s['duration_ms'],'script event duration outside scene')
            require(set(ev.get('knowledge_refs',[]))<=set(s['knowledge_refs']), 'event knowledge refs must be in scene')
            script_events[ev['id']]=s['scene_id']; last=ev['offset_ms']
        last=-1
        for seg in s.get('narration_segments',[]):
            require(seg['id'] not in narrated,'duplicate narration segment ID')
            narrated.add(seg['id'])
            require(seg['offset_ms']>=last,'narration segments not time-sorted')
            require(seg['offset_ms']+seg['duration_ms']<=s['duration_ms'],'narration segment outside scene')
            last=seg['offset_ms']
    require(end==script['total_duration_ms'],'script total duration does not match scene endpoints')
    require(set(kp['constraints']['required_knowledge_refs'])<=used_k,'required knowledge missing from script')
    # Animation manifest: clip can be 1:n to scenes; clips cannot cross scene boundary in V2.
    clips=am['clips']; unique(clips,'clip_id','clip')
    clip_by_id={x['clip_id']:x for x in clips}; clip_events={}
    cursor=0
    for c in clips:
        require(c['start_ms']==cursor,'animation clips must form contiguous timeline')
        cursor+=c['duration_ms']
        require(c['scene_id'] in scene_by_id,'clip references unknown scene')
        scene=scene_by_id[c['scene_id']]
        require(c['start_ms']>=scene['start_ms'] and cursor<=scene['start_ms']+scene['duration_ms'],'clip crosses scene boundary')
        for ev in c.get('script_event_refs',[]):
            require(script_events.get(ev)==c['scene_id'],'clip references event outside own scene')
        last=-1
        for ce in c.get('internal_events',[]):
            require(ce['id'] not in clip_events,'duplicate internal event ID')
            require(ce['offset_ms']>=last,'internal events not ordered')
            require(ce['offset_ms']<c['duration_ms'],'internal event outside clip')
            if 'duration_ms' in ce: require(ce['offset_ms']+ce['duration_ms']<=c['duration_ms'],'internal event duration outside clip')
            for er in ce.get('script_event_refs',[]):
                require(script_events.get(er)==c['scene_id'],'internal event references foreign script event')
            clip_events[ce['id']]=c['clip_id'];last=ce['offset_ms']
    require(cursor==am['total_duration_ms'],'animation clips do not cover the video duration')
    # Feedback can address current or historical artifact; this sample references latest.
    require(rr['base_project_revision']<=ps['revision'],'feedback based on future project revision')
    kindmap={'project_state':None,'knowledge_package':'knowledge-package','production_script':'production-script','animation_manifest':'animation-manifest'}
    kind=rr['target_artifact']['kind']
    target=ps if kind=='project_state' else data[kindmap[kind]]
    expected_id=ps['project_id'] if kind=='project_state' else target['artifact_id']
    require(rr['target_artifact']['artifact_id']==expected_id,'feedback references unknown artifact in sample')
    require(rr['target_artifact']['revision']==target['revision'],'feedback sample targets non-current artifact')
    ids={'direction':dset,'knowledge_unit':set(u),'scene':set(scene_by_id),'script_event':set(script_events),'clip':set(clip_by_id),'clip_event':set(clip_events)}
    for a in rr['anchors']:
        if a['kind'] in ids:require(a['id'] in ids[a['kind']],f'feedback unknown anchor: {a["kind"]}')
        if a['kind']=='time_range':require(a['start_ms']<a['end_ms']<=am['total_duration_ms'],'feedback invalid time range')
        if a['kind'] in ('whole_artifact','time_range'):require('id' not in a,'unexpected id on non-object anchor')


def main():
    data=fixtures()
    check_schema(data);check_cross(data)
    failures={
      'invalid knowledge ref':lambda d:d['production-script']['scenes'][0]['knowledge_refs'].append('K_MISSING'),
      'broken clip coverage':lambda d:d['animation-manifest']['clips'][1].update(start_ms=13000),
      'overridden user intent':lambda d:d['project-state']['brief']['effective'].update(creative_mode='creative'),
      'unknown feedback clip':lambda d:d['revision-request']['anchors'][0].update(id='C_UNKNOWN'),
      'stale script dependency':lambda d:d['production-script']['knowledge_package_ref'].update(revision=2),
    }
    for label,change in failures.items():
        bad=copy.deepcopy(data);change(bad)
        try:check_schema(bad);check_cross(bad)
        except Exception:continue
        raise AssertionError(f'negative case unexpectedly passed: {label}')
    print('PASS: 5 schemas + project/knowledge/script/animation/revision cross-checks + 5 negative cases')

if __name__=='__main__':main()
