"""Generate internal vector scene programs; never execute model-authored JavaScript."""
from __future__ import annotations
import copy
import json
import math
import re
from typing import Any
from knowledge.config import repository_root

ROOT = repository_root()
PROFILES = json.loads((ROOT / 'frontend/src/animation/styles/profiles/profiles.json').read_text())
DIRECTOR = '''You are the Animation Director for a knowledge video. Create an original, coherent SVG scene program from the exact script scene, selected art profile, knowledge constraints and event schedule.
Return JSON {"objects": [...], "anchor_times_ms": [...]}. No HTML, JS, URLs, network, secrets or external assets.
Use 1600x900 logical coordinates. Each object needs: id (stable EL_... or exact timed_text ID), label, shape (circle/rect/path/text), x,y,width,height,radius,path,text,fill (#RRGGBB), keyframes.
Keyframes need time_ms,x,y,opacity (0..1),scale (>0),rotation. Sorted, include time 0 and scene duration. Values interpolate smoothly and deterministically.
Objects must be recognizable knowledge actors whose states change continuously in response to the script, not slides of titles. Do not make a field of meaningless particles. Object identity persists across keyframes. Supply every timed_text object with exact ID and exact text; its visibility is enforced by the runtime.
For every anchor:true event include its exact offset in anchor_times_ms and a keyframe at that offset. Preserve script facts, semantic constraints and all event times. Never silently rewrite upstream content.
Art profile guides materials, light and motion, not object composition. For a local revision change only requested appearance or animation parameters and preserve object IDs and all required text. No more than 60 objects or 64 keyframes per object. Paths use only SVG path commands and finite numbers.'''


def resolve_profile(style_id: str, custom: dict[str, Any] | None = None) -> dict[str, Any]:
    if style_id == 'custom':
        profile = copy.deepcopy(custom)
        if not isinstance(profile, dict): raise ValueError('请提供自定义美术档案。')
    else:
        profile = next((copy.deepcopy(p) for p in PROFILES if p['id'] == ('precision-science' if style_id == 'auto' else style_id)), None)
        if profile is None: raise ValueError('未知的视频风格。')
    for key in ['id','name','intent','materials','typography','spatialLanguage','lighting','motionCharacter','decorativeGuidance','consistencyRules','avoid','palette']:
        if key not in profile: raise ValueError('美术档案不完整。')
    if any(not isinstance(profile[k],str) or not 1<=len(profile[k])<=1000 for k in ['id','name','intent','spatialLanguage','lighting','motionCharacter']): raise ValueError('美术描述无效。')
    for key in ['materials','decorativeGuidance','consistencyRules','avoid']:
        if not isinstance(profile[key],list) or len(profile[key])>30 or any(not isinstance(v,str) or len(v)>1000 for v in profile[key]): raise ValueError('美术指导无效。')
    if not isinstance(profile['palette'],dict) or set(profile['palette']) != {'background','ink','muted','red','blue','material','shade','gold'} or any(not isinstance(c,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',c) for c in profile['palette'].values()): raise ValueError('美术色值无效。')
    if not isinstance(profile['typography'],dict) or any(not isinstance(profile['typography'].get(k),str) or not re.fullmatch(r'[A-Za-z0-9\s,\.\'"_-]{1,200}',profile['typography'][k]) for k in ['display','body']): raise ValueError('字体档案无效。')
    return profile


def is_pn_script(script: dict[str, Any]) -> bool:
    source = json.loads((ROOT / 'docs/work/backend/script/trials/case2-pn-v2/production-script.json').read_text())
    return script['scenes'] == source['scenes'] and script['total_duration_ms'] == source['total_duration_ms']


def validate_program(scene: dict[str, Any], program: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(program,dict): raise ValueError('场景方案必须是对象。')
    objects = program.get('objects')
    if not isinstance(objects,list) or not 2 <= len(objects) <= 60: raise ValueError('场景需要 2–60 个可检查对象。')
    ids: set[str] = set()
    for obj in objects:
        if not isinstance(obj,dict) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',str(obj.get('id',''))) or obj['id'] in ids: raise ValueError('场景对象 ID 无效或重复。')
        ids.add(obj['id'])
        if obj.get('shape') not in ['circle','rect','path','text'] or not isinstance(obj.get('label'),str) or not obj['label']: raise ValueError('场景对象类型无效。')
        if not re.fullmatch(r'#[a-fA-F0-9]{6}', str(obj.get('fill',''))): raise ValueError('场景对象颜色无效。')
        for key in ['x','y','width','height','radius']:
            value = obj.get(key,0)
            if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or abs(value)>10000: raise ValueError('场景几何无效。')
        if obj['shape']=='circle' and obj.get('radius',0)<=0 or obj['shape']=='rect' and (obj.get('width',0)<=0 or obj.get('height',0)<=0): raise ValueError('场景对象尺寸必须为正数。')
        if obj['shape']=='path' and (not isinstance(obj.get('path'),str) or len(obj['path'])>20000 or not re.fullmatch(r'[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+\-]*',obj['path'])): raise ValueError('场景路径无效。')
        if obj['shape']=='text' and (not isinstance(obj.get('text'),str) or len(obj['text'])>500): raise ValueError('场景文字无效。')
        frames=obj.get('keyframes')
        if not isinstance(frames,list) or not 2<=len(frames)<=64: raise ValueError('场景关键帧数量无效。')
        previous=-1
        for frame in frames:
            if not isinstance(frame,dict): raise ValueError('关键帧必须是对象。')
            for key in ['time_ms','x','y','opacity','scale','rotation']:
                value=frame.get(key)
                if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value): raise ValueError('关键帧数据无效。')
            if not previous < frame['time_ms'] <= scene['duration_ms'] or frame['time_ms']<0 or not 0<=frame['opacity']<=1 or not 0<frame['scale']<=10 or max(abs(frame['x']),abs(frame['y']))>10000: raise ValueError('关键帧范围无效。')
            previous=frame['time_ms']
        if frames[0]['time_ms'] != 0 or frames[-1]['time_ms'] != scene['duration_ms']: raise ValueError('关键帧未覆盖场景。')
    for text in scene.get('timed_text',[]):
        obj=next((o for o in objects if o['id']==text['id']),None)
        if obj is None or obj.get('text') != text['text'] or obj['shape']!='text': raise ValueError('必须保留脚本文字和身份。')
    anchors={e['offset_ms'] for e in scene['events'] if e.get('anchor')}
    if not anchors.issubset(set(program.get('anchor_times_ms',[]))): raise ValueError('关键事件未在真实时间登记。')
    if not anchors.issubset({f['time_ms'] for o in objects for f in o['keyframes']}): raise ValueError('关键事件缺少对应关键帧。')
    return copy.deepcopy(objects)


async def direct_scene(client: Any, scene: dict[str,Any], profile: dict[str,Any], *, previous: dict[str,Any] | None=None, feedback: str | None=None) -> dict[str,Any]:
    response=await client.generate_json(instructions=DIRECTOR,data={'scene':scene,'style_profile':profile,'previous_resource':previous,'feedback':feedback},max_output_tokens=14000)
    program=response.value
    objects=validate_program(scene,program)
    if previous and {o['id'] for o in previous.get('objects',[])} != {o['id'] for o in objects}: raise ValueError('局部修订不得替换对象身份。')
    return {'kind':'vector-scene','sceneId':scene['scene_id'],'style':profile,'parameters':{'speed':1},'objects':objects}
