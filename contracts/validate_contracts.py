#!/usr/bin/env python3
"""Check five public contract objects and their cross-artifact consistency.

Install: python -m pip install 'jsonschema>=4.18'
Run:     python validate_contracts.py
This checks structural integrity, not facts, cinematic quality, or actual rendering.
"""
from __future__ import annotations
import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT=Path(__file__).resolve().parent
NAMES=('project-state','knowledge-package','production-script','animation-manifest','revision-request')


def samples():
    return {name:json.loads((ROOT/'examples'/f'{name}.example.json').read_text(encoding='utf-8')) for name in NAMES}

def check(ok,why):
    if not ok:raise ValueError(why)

def unique(records,key,kind):
    ids=[row[key] for row in records]
    check(len(ids)==len(set(ids)),f'duplicate {kind} identifiers')

def check_schemas(objects):
    for name,instance in objects.items():
        schema=json.loads((ROOT/'schemas'/f'{name}.schema.json').read_text(encoding='utf-8'))
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(instance)

def check_links(objects):
    project,kp,script,am,feedback=(objects[x] for x in NAMES)
    check(len({x['project_id'] for x in objects.values()})==1,'project_id mismatch')
    # Do not silently substitute an inferred preference for an explicit input.
    user=project['brief']['user_input']; resolved=project['brief']['effective']
    for field in ('creative_mode','knowledge_depth','aspect_ratio','art_style'):
        if field in user and user[field]!='auto':
            check(user[field]==resolved.get(field),f'explicit user preference overridden: {field}')
    if user.get('creative_mode')=='custom':
        check(bool(resolved.get('creative_mode_notes')),'custom creative mode notes not propagated')
    check(kp['brief_revision']==project['brief']['revision'],'knowledge package based on stale brief')
    check(script['brief_revision']==project['brief']['revision'],'script based on stale brief')
    check(am['brief_revision']==project['brief']['revision'],'animation based on stale brief')
    for kind,obj in [('knowledge_package',kp),('production_script',script),('animation_manifest',am)]:
        if kind in project['artifacts']:
            check(project['artifacts'][kind]=={k:obj[k] for k in ('artifact_id','revision')},f'published {kind} ref mismatch')
    check(script['knowledge_package_ref']=={k:kp[k] for k in ('artifact_id','revision')},'script knowledge package ref mismatch')
    check(am['production_script_ref']=={k:script[k] for k in ('artifact_id','revision')},'animation script ref mismatch')
    if 'direction_id' in project['decisions']:
        check(project['decisions']['direction_id']==script['direction_id'],'script direction conflicts with global decision')
    check(am['total_duration_ms']==script['total_duration_ms'],'animation total duration differs from script')
    # Knowledge source and logical dependencies
    directions,units,evidences=kp['directions'],kp['knowledge_units'],kp['evidence']
    for rows,label in ((directions,'direction'),(units,'knowledge unit'),(evidences,'evidence')):unique(rows,'id',label)
    d_ids={d['id'] for d in directions}; unit_map={u['id']:u for u in units}; e_ids={e['id'] for e in evidences}
    check(kp['recommended_direction_id'] in d_ids,'unknown recommended direction')
    check(script['direction_id'] in d_ids,'script selected an unknown direction')
    for direction in directions:
        check(set(direction['knowledge_refs'])<=set(unit_map),f'{direction["id"]}: unknown knowledge ref')
        check(all(unit_map[k]['verification_status']=='verified' for k in direction['knowledge_refs']),f'{direction["id"]}: candidate relies on unverified knowledge')
    for unit in units:
        check(set(unit.get('depends_on',[]))<=set(unit_map),f'{unit["id"]}: unknown dependency')
        check(set(unit['evidence_refs'])<=e_ids,f'{unit["id"]}: unknown evidence')
        if unit['verification_status']=='verified':
            check(len(unit['evidence_refs'])>0,f'{unit["id"]}: verified without evidence')
    visited=set(); active=set()
    def dfs(kid):
        check(kid not in active,f'knowledge dependency cycle at {kid}')
        if kid in visited:return
        active.add(kid)
        for dep in unit_map[kid].get('depends_on',[]):dfs(dep)
        active.remove(kid);visited.add(kid)
    for kid in unit_map:dfs(kid)
    required=set(kp['constraints']['required_knowledge_refs'])
    check(required<=set(unit_map),'unknown required knowledge ref')
    check(all(unit_map[k]['verification_status']=='verified' for k in required),'required knowledge not verified')
    for direction in directions:
        check(required<=set(direction['knowledge_refs']),f'{direction["id"]}: global required knowledge is not available in every direction')
    # Script references. Relative timing within each scene; no voice track requirement.
    scenes=script['scenes'];unique(scenes,'scene_id','scene')
    scene_map={s['scene_id']:s for s in scenes}
    event_map={};text_map={};used=set();time_end=0
    for scene in scenes:
        sid=scene['scene_id'];end=time_end+scene['duration_ms']
        check(scene['start_ms']==time_end,'scene timeline not contiguous')
        time_end=end
        knowledge_ids=set(scene['knowledge_refs'])
        check(knowledge_ids<=set(unit_map),f'{sid}: unknown knowledge ref')
        used|=knowledge_ids
        check(all(unit_map[x]['verification_status']=='verified' for x in knowledge_ids),f'{sid}: script uses unverified knowledge')
        last=-1
        for e in scene['events']:
            check(e['id'] not in event_map,'duplicate script event id')
            check(e['offset_ms']>=last,f'{sid}: events not sorted')
            check(e['offset_ms']<scene['duration_ms'],f'{sid}: event offset outside scene')
            if 'duration_ms' in e:
                check(e['offset_ms']+e['duration_ms']<=scene['duration_ms'],f'{sid}: event duration outside scene')
            check(set(e.get('knowledge_refs',[]))<=knowledge_ids,f'{sid}: event references knowledge absent from scene')
            event_map[e['id']]=sid
            last=e['offset_ms']
        last=-1;subtitle_end=-1
        for t in scene.get('timed_text',[]):
            check(t['id'] not in text_map,'duplicate timed_text id')
            check(t['offset_ms']>=last,f'{sid}: timed_text not sorted')
            check(t['offset_ms']+t['duration_ms']<=scene['duration_ms'],f'{sid}: timed_text outside scene')
            if t.get('kind','subtitle')=='subtitle':
                check(t['offset_ms']>=subtitle_end,f'{sid}: overlapping subtitles')
                subtitle_end=t['offset_ms']+t['duration_ms']
            text_map[t['id']]=sid
            last=t['offset_ms']
    check(time_end==script['total_duration_ms'],'script scene coverage differs from total_duration_ms')
    target_duration=project['brief']['effective']['target_duration_ms']
    check(abs(script['total_duration_ms']-target_duration)<=target_duration*0.1,'script total duration deviates from target by more than 10%')
    check(required<=used,'required knowledge missing from script')
    # Animation clips form a contiguous timeline; 1 scene can own multiple clips.
    clips=am['clips'];unique(clips,'clip_id','clip')
    clip_map={c['clip_id']:c for c in clips};clip_events={};cursor=0
    for clip in clips:
        check(clip['start_ms']==cursor,'animation clip timeline not contiguous')
        cursor+=clip['duration_ms']
        sid=clip['scene_id']
        check(sid in scene_map,'clip references unknown scene')
        parent=scene_map[sid]
        check(clip['start_ms']>=parent['start_ms'] and cursor<=parent['start_ms']+parent['duration_ms'],f'clip {clip["clip_id"]} crosses scene boundary')
        for e in clip.get('script_event_refs',[]):
            check(event_map.get(e)==sid,f'clip {clip["clip_id"]} references foreign script event')
        last=-1
        for ev in clip.get('internal_events',[]):
            check(ev['id'] not in clip_events,'duplicate internal animation event')
            check(ev['offset_ms']>=last,'internal events not sorted')
            check(ev['offset_ms']<clip['duration_ms'],'internal animation event outside clip')
            if 'duration_ms' in ev:
                check(ev['offset_ms']+ev['duration_ms']<=clip['duration_ms'],'internal event duration outside clip')
            for id_ in ev.get('script_event_refs',[]):
                check(event_map.get(id_)==sid,'internal event references foreign script event')
            clip_events[ev['id']]=clip['clip_id'];last=ev['offset_ms']
    check(cursor==am['total_duration_ms'],'clips do not cover whole animation')
    # Feedback targets may refer to older historical artifact. This bundled example targets current.
    check(feedback['base_project_revision']<=project['revision'],'feedback based on future project revision')
    targets={'project_state':project,'knowledge_package':kp,'production_script':script,'animation_manifest':am}
    target=targets[feedback['target_artifact']['kind']]
    expected=project['project_id'] if feedback['target_artifact']['kind']=='project_state' else target['artifact_id']
    check(feedback['target_artifact']['artifact_id']==expected,'unknown artifact in feedback')
    check(feedback['target_artifact']['revision']==target['revision'],'example feedback targets mismatched revision')
    ids={'direction':d_ids,'knowledge_unit':set(unit_map),'scene':set(scene_map),'script_event':set(event_map),'timed_text':set(text_map),'clip':set(clip_map),'clip_event':set(clip_events)}
    for anchor in feedback['anchors']:
        kind=anchor['kind']
        if kind in ids:check(anchor['id'] in ids[kind],f'unknown feedback anchor {kind}')
        if kind=='time_range':
            check(anchor['start_ms']<anchor['end_ms']<=am['total_duration_ms'],'invalid feedback time range')
        if kind=='whole_artifact':check('id' not in anchor,'whole_artifact must not contain id')


def main():
    originals=samples();check_schemas(originals);check_links(originals)
    # Expected failures, to ensure checks are not cosmetic.
    negatives={
      'unverified fact cited by script':lambda d:d['production-script']['scenes'][1]['knowledge_refs'].append('K05'),
      'subtitle time overflow':lambda d:d['production-script']['scenes'][0]['timed_text'][0].update(duration_ms=40000),
      'invalid scene role':lambda d:d['production-script']['scenes'][0].update(role='voice_actor'),
      'broken animation coverage':lambda d:d['animation-manifest']['clips'][1].update(start_ms=13000),
      'stale upstream ref':lambda d:d['production-script']['knowledge_package_ref'].update(revision=2),
      'overridden explicit creative mode':lambda d:d['project-state']['brief']['effective'].update(creative_mode='story'),
      'unknown timed text anchor':lambda d:d['revision-request']['anchors'].append({'kind':'timed_text','id':'T_UNKNOWN'}),
      'bad status':lambda d:d['knowledge-package']['knowledge_units'][0].update(verification_status='maybe'),
      'invalid duration fit':lambda d:d['knowledge-package']['directions'][0]['duration_fit'].update(status='perfect'),
    }
    for name,mutate in negatives.items():
        d=copy.deepcopy(originals);mutate(d)
        try:check_schemas(d);check_links(d)
        except Exception:pass
        else:raise AssertionError(f'negative test not caught: {name}')
    switched=copy.deepcopy(originals)
    package=switched['knowledge-package'];script=switched['production-script'];project=switched['project-state']
    alternative=next(direction for direction in package['directions'] if direction['id']!=package['recommended_direction_id'])
    script['direction_id']=alternative['id'];project['decisions']['direction_id']=alternative['id']
    selected_ref=alternative['knowledge_refs'][0]
    for scene in script['scenes']:
        scene['knowledge_refs']=[selected_ref]
        for event in scene['events']:
            if 'knowledge_refs' in event:event['knowledge_refs']=[]
    check_schemas(switched);check_links(switched)
    invalid_internal_review=copy.deepcopy(originals)
    invalid_internal_review['knowledge-package']['evidence'].append({
        'id':'E_INTERNAL_INVALID','kind':'internal_review','title':'内部检查'
    })
    try:
        check_schemas(invalid_internal_review);check_links(invalid_internal_review)
    except Exception:
        pass
    else:
        raise AssertionError('internal_review without details must fail')
    blank_internal_review=copy.deepcopy(originals)
    blank_internal_review['knowledge-package']['evidence'].append({
        'id':'E_INTERNAL_BLANK','kind':'internal_review','title':'空白检查','details':'  \n  '
    })
    try:
        check_schemas(blank_internal_review);check_links(blank_internal_review)
    except Exception:
        pass
    else:
        raise AssertionError('internal_review with blank details must fail')
    print('PASS: five schemas, five linked examples, cross-stage checks, eleven negative cases, alternate direction')

if __name__=='__main__':main()
