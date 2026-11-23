"""Generate internal vector scene programs; never execute model-authored JavaScript."""
from __future__ import annotations
import copy
import json
import math
import re
from typing import Any
from knowledge.config import repository_root
from .components import compile_components

ROOT = repository_root()
PROFILES = json.loads((ROOT / 'frontend/src/animation/styles/profiles/profiles.json').read_text())
DIRECTOR = '''You are the Animation Director for a knowledge video. Create an original, coherent, publication-grade SVG scene program from the exact script scene, selected art profile, knowledge constraints and event schedule.
Return JSON {"components": [...], "objects": [...], "anchor_times_ms": [...]}. ("components" is optional; you may combine high-level components with custom objects.) No HTML, JS, URLs, network, secrets or external assets.

1. STRICT 1600x900 THREE-ZONE SAFE LAYOUT (ZERO OVERLAP):
- Header Zone (y: 55..145): optional short scene title only. Never put moving shapes here.
- Main Mechanism Stage (x: 100..1500, y: 185..710): all visual actors, chambers, charts, waves, networks and short pinned labels. NEVER place text labels inside a moving-particle region—place labels cleanly above or below containers!
- Subtitle Safe Zone (x: 800, y: 815, textAnchor: "middle"): reserve y >= 760 exclusively for timed_text subtitles so captions never collide with diagrams.

2. HIGH-LEVEL REUSABLE COMPONENTS (STRONGLY RECOMMENDED FOR CLEAN MECHANISMS):
You may include up to 4 entries in "components", compiled deterministically with the exact style_profile palette & zero text overlap:
- {"type":"bar_chart","id_prefix":"PROB","x":140,"y":230,"width":620,"height":360,"bars":[{"label":"2","value":1},{"label":"7","value":6,"highlight":true}],"reveal_start_ms":800,"reveal_end_ms":4200}
- {"type":"carrier_chamber","id_prefix":"CH","x":140,"y":290,"width":640,"height":240,"left_label":"P区","right_label":"N区","mode":"flip","flip_ms":6000,"particle_count":10}
- {"type":"wave_band","id_prefix":"WV","x":160,"y":270,"width":620,"waves":[{"label":"长波","frequency":1.0,"color_role":"red"},{"label":"短波","frequency":2.4,"color_role":"blue"}]}
- {"type":"analog_gauge","id_prefix":"GA","x":1220,"y":410,"radius":92,"label":"电流强度","readings":[{"time_ms":0,"value":0.1},{"time_ms":5000,"value":0.92},{"time_ms":10000,"value":0.08}]}
- {"type":"concept_network","id_prefix":"NET","x":220,"y":240,"width":580,"height":320,"nodes":[{"label":"词A","color_role":"red"},{"label":"词B","color_role":"blue"}],"edges":[[0,1,true]]}
- {"type":"orbit_model","id_prefix":"ORB","x":500,"y":440,"core_label":"引力源","orbits":[{"radius":92,"turns":2,"color_role":"red"},{"radius":156,"turns":1,"color_role":"blue"}]}

3. CUSTOM OBJECTS & MOTION CONTINUITY:
Each custom object in "objects" needs: id (stable EL_... or exact timed_text ID), label, shape (circle/rect/path/text), x,y,width,height,radius,path,text,fill (#RRGGBB), keyframes. Every fill and stroke must be a six-digit hex color (#RRGGBB), strictly preferring style_profile.palette. Never use color names, #RGB, rgb()/rgba(), hsl(), transparent, gradients or CSS syntax.
Keyframes need time_ms,x,y,opacity (0..1),scale (>0),rotation. Sorted, include time 0 and scene duration. Optional fields: stroke, strokeWidth (0..30), cornerRadius (0..500), fillOpacity (0..1), lineCap (butt/round/square), materialKey (flat/paper-layer/frosted/ink-print), fontSize (8..160), fontWeight (100..900), textAnchor (start/middle/end), zIndex (-100..100), easing (smoothstep/linear/ease-in-cubic/ease-out-cubic/ease-in-out-cubic), drawProgress (0..1, path only, use fillOpacity:0 for drawn strokes).
Use scene_context.previous_ending_actors to smoothly continue recurring visual actors from their exact ending coordinates/colors in the previous scene instead of abruptly resetting the stage.
NON-PPT RULE: At least several non-text visual actors must exhibit real, causal continuous motion (position, scale, rotation, or path drawProgress) tied to the script's knowledge mechanism—never return static text cards!
Supply every timed_text object in "objects" with exact ID and exact text (placed in the bottom subtitle safe zone y: 810..845 unless it is a title in y: 85..135). Do not repeat timed_text in a second text object.
For every anchor:true event include its exact offset in anchor_times_ms and a keyframe at that offset. Preserve script facts and event times. Total compiled objects (components + objects) must be 1..60, max 64 keyframes per object.'''


def automatic_profile_id(script: dict[str, Any]) -> str:
    text=' '.join([str(script.get('core_message',''))]+[
        ' '.join(str(scene.get(key,'')) for key in ['role','objective'] )
        for scene in script.get('scenes',[])
    ])
    if re.search(r'历史|人物|传说|文明|文学|起源|故事|演变|战争',text):
        return 'narrative-collage'
    if re.search(r'概率|统计|数据|比例|分布|增长|趋势|对比|比较|数量|计数',text):
        return 'modern-graphic'
    if re.search(r'物理|化学|生物|科学|公式|定理|电流|电场|神经|数学|算法|分子|原子|量子|机制|实验|能量',text):
        return 'precision-science'
    return 'paper-editorial'


def preferred_profile_id(preference: str, script: dict[str, Any]) -> str:
    normalized=preference.strip().lower()
    exact=next((profile['id'] for profile in PROFILES if normalized in {profile['id'].lower(),profile['name'].lower()}),None)
    if exact: return exact
    prefixed=next((profile['id'] for profile in PROFILES if profile['id'].lower() in normalized or profile['name'].lower() in normalized),None)
    if prefixed: return prefixed
    if re.search(r'纸|纸艺|纸张|编辑|剪贴|拼贴|手作',preference):
        return 'narrative-collage' if re.search(r'剪贴|拼贴|手作|复古',preference) else 'paper-editorial'
    if re.search(r'现代|图形|扁平|几何|鲜艳|海报',preference): return 'modern-graphic'
    if re.search(r'精密|科学|实验|理工|科技|金属|仪器',preference): return 'precision-science'
    if re.search(r'叙事|故事|历史|复古|年代|拼贴',preference): return 'narrative-collage'
    return automatic_profile_id(script)


def resolve_profile(style_id: str, custom: dict[str, Any] | None = None, *, script: dict[str, Any] | None = None) -> dict[str, Any]:
    if style_id == 'custom':
        profile = copy.deepcopy(custom)
        if not isinstance(profile, dict): raise ValueError('请提供自定义美术档案。')
    else:
        resolved_id = automatic_profile_id(script) if style_id == 'auto' and script is not None else 'precision-science' if style_id == 'auto' else style_id
        profile = next((copy.deepcopy(p) for p in PROFILES if p['id'] == resolved_id), None)
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
    if set(program)-{'objects','anchor_times_ms'}: raise ValueError('场景方案包含不支持的字段。')
    objects = program.get('objects')
    if not isinstance(objects,list) or not 1 <= len(objects) <= 60: raise ValueError('场景需要 1–60 个可检查对象。')
    ids: set[str] = set()
    for obj in objects:
        if not isinstance(obj,dict) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',str(obj.get('id',''))) or obj['id'] in ids: raise ValueError('场景对象 ID 无效或重复。')
        if set(obj)-{'id','label','shape','x','y','width','height','radius','path','text','fill','keyframes','stroke','strokeWidth','cornerRadius','fillOpacity','lineCap','materialKey','fontSize','fontWeight','textAnchor','zIndex'}: raise ValueError('场景对象包含不支持的字段。')
        ids.add(obj['id'])
        if obj.get('shape') not in ['circle','rect','path','text'] or not isinstance(obj.get('label'),str) or not obj['label']: raise ValueError('场景对象类型无效。')
        if not re.fullmatch(r'#[a-fA-F0-9]{6}', str(obj.get('fill',''))): raise ValueError('场景对象颜色无效。')
        for key in ['x','y','width','height','radius']:
            value = obj.get(key,0)
            if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or abs(value)>10000: raise ValueError('场景几何无效。')
        if obj['shape']=='circle' and obj.get('radius',0)<=0 or obj['shape']=='rect' and (obj.get('width',0)<=0 or obj.get('height',0)<=0): raise ValueError('场景对象尺寸必须为正数。')
        if obj['shape']=='path' and (not isinstance(obj.get('path'),str) or len(obj['path'])>20000 or not re.fullmatch(r'[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+\-]*',obj['path'])): raise ValueError('场景路径无效。')
        if obj['shape']=='path' and any(not math.isfinite(float(n)) for n in re.findall(r'[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?',obj['path'])): raise ValueError('路径坐标必须有限。')
        if obj['shape']=='text' and (not isinstance(obj.get('text'),str) or len(obj['text'])>500): raise ValueError('场景文字无效。')
        if 'stroke' in obj and not re.fullmatch(r'#[a-fA-F0-9]{6}',str(obj['stroke'])): raise ValueError('描边颜色无效。')
        for key,allowed in {'materialKey':['flat','paper-layer','frosted','ink-print'],'lineCap':['butt','round','square'],'textAnchor':['start','middle','end']}.items():
            if key in obj and obj[key] not in allowed: raise ValueError('外观标识无效。')
        for key,(low,high) in {'strokeWidth':(0,30),'cornerRadius':(0,500),'fillOpacity':(0,1),'fontSize':(8,160),'fontWeight':(100,900),'zIndex':(-100,100)}.items():
            if key not in obj: continue
            value=obj[key]
            if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or not low<=value<=high: raise ValueError('外观参数无效。')
        frames=obj.get('keyframes')
        if not isinstance(frames,list) or not 2<=len(frames)<=64: raise ValueError('场景关键帧数量无效。')
        previous=-1
        for frame in frames:
            if not isinstance(frame,dict): raise ValueError('关键帧必须是对象。')
            if set(frame)-{'time_ms','x','y','opacity','scale','rotation','easing','drawProgress'}: raise ValueError('关键帧包含不支持的字段。')
            for key in ['time_ms','x','y','opacity','scale','rotation']:
                value=frame.get(key)
                if not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value): raise ValueError('关键帧数据无效。')
            if not previous < frame['time_ms'] <= scene['duration_ms'] or frame['time_ms']<0 or not 0<=frame['opacity']<=1 or not 0<frame['scale']<=10 or max(abs(frame['x']),abs(frame['y']))>10000: raise ValueError('关键帧范围无效。')
            if 'easing' in frame and frame['easing'] not in ['smoothstep','linear','ease-in-cubic','ease-out-cubic','ease-in-out-cubic']: raise ValueError('运动曲线无效。')
            if 'drawProgress' in frame:
                value=frame['drawProgress']
                if obj['shape']!='path' or not isinstance(value,(int,float)) or isinstance(value,bool) or not math.isfinite(value) or not 0<=value<=1: raise ValueError('路径显现参数无效。')
            previous=frame['time_ms']
        if frames[0]['time_ms'] != 0 or frames[-1]['time_ms'] != scene['duration_ms']: raise ValueError('关键帧未覆盖场景。')
    for text in scene.get('timed_text',[]):
        obj=next((o for o in objects if o['id']==text['id']),None)
        if obj is None or obj.get('text') != text['text'] or obj['shape']!='text': raise ValueError('必须保留脚本文字和身份。')
    timed_text_ids={text['id'] for text in scene.get('timed_text',[])}
    timed_text_values={text['text'] for text in scene.get('timed_text',[])}
    if any(obj.get('shape')=='text' and obj['id'] not in timed_text_ids and obj.get('text') in timed_text_values for obj in objects):
        raise ValueError('脚本字幕不得在其他场景对象中重复。')
    anchors={e['offset_ms'] for e in scene['events'] if e.get('anchor')}
    if not anchors.issubset(set(program.get('anchor_times_ms',[]))): raise ValueError('关键事件未在真实时间登记。')
    if not anchors.issubset({f['time_ms'] for o in objects for f in o['keyframes']}): raise ValueError('关键事件缺少对应关键帧。')
    return copy.deepcopy(objects)


class SceneProgramError(ValueError):
    """The model returned a scene program that failed local contract checks."""


def has_real_visual_motion(objects: list[dict[str, Any]]) -> bool:
    for obj in objects:
        if obj.get('shape') == 'text':
            continue
        frames = obj.get('keyframes', [])
        if len(frames) < 2:
            continue
        first = frames[0]
        for frame in frames[1:]:
            if (
                abs(frame['x'] - first['x']) > 4
                or abs(frame['y'] - first['y']) > 4
                or abs(frame['scale'] - first['scale']) > 0.04
                or abs(frame['rotation'] - first['rotation']) > 2
                or abs(frame.get('drawProgress', 1) - first.get('drawProgress', 1)) > 0.05
            ):
                return True
    return False


async def direct_scene(client: Any, scene: dict[str,Any], profile: dict[str,Any], *, previous: dict[str,Any] | None=None, feedback: str | None=None, scene_context: dict[str,Any] | None=None, format_feedback: str | None=None, require_motion: bool | None=None, target_elements: list[dict[str,Any]] | None=None, target_time_ranges: list[dict[str,int]] | None=None) -> dict[str,Any]:
    instructions=DIRECTOR
    if previous and target_elements:
        target_ids=', '.join(str(item['id']) for item in target_elements)
        instructions += f'\nTARGETED OBJECT REVISION: The user explicitly selected ONLY these render_element IDs: [{target_ids}]. Modify ONLY those selected object(s) (and focus changes within target_time_ranges when provided) according to feedback. Keep EVERY other object in previous_resource completely unchanged and preserve all object IDs.'
    if format_feedback:
        instructions += '\nCorrect this format/validation error and return one complete valid JSON scene program: ' + format_feedback + '. Every fill and stroke must be a six-digit hex color (#RRGGBB), preferably a value from style_profile.palette. Do not repeat timed_text in other text objects. Ensure non-text actors exhibit real continuous motion. Do not change script facts or event times.'
    payload={'scene':scene,'scene_context':scene_context or {},'style_profile':profile,'previous_resource':previous,'feedback':feedback,'format_feedback':format_feedback}
    if target_elements:
        payload['target_elements']=target_elements
    if target_time_ranges:
        payload['target_time_ranges']=target_time_ranges
    response=await client.generate_json(instructions=instructions,data=payload,max_output_tokens=14000)
    program=response.value
    enforce_motion = require_motion if require_motion is not None else type(client).__name__ in {'DeepSeekScriptClient', 'DeepSeekClient'}
    try:
        if isinstance(program, dict) and isinstance(program.get('components'), list) and program['components']:
            compiled = compile_components(program['components'], profile, int(scene['duration_ms']))
            raw_objects = list(program.get('objects') or [])
            existing_ids = {obj.get('id') for obj in raw_objects if isinstance(obj, dict)}
            merged = [obj for obj in compiled if obj['id'] not in existing_ids] + raw_objects
            program = {
                'objects': merged[:60],
                'anchor_times_ms': program.get('anchor_times_ms', []),
            }
        elif isinstance(program, dict) and 'components' in program:
            program = {k: v for k, v in program.items() if k != 'components'}
        objects=validate_program(scene,program)
        if enforce_motion and not previous and not has_real_visual_motion(objects):
            raise ValueError('场景缺少真实的动态视觉变化（不能只放置静止图形或文字卡片）。')
        if previous and {o['id'] for o in previous.get('objects',[])} != {o['id'] for o in objects}: raise ValueError('局部修订不得替换对象身份。')
        if previous and target_elements:
            target_id_set={str(item['id']) for item in target_elements}
            previous_by_id={obj['id']:copy.deepcopy(obj) for obj in previous.get('objects',[])}
            objects=[obj if obj['id'] in target_id_set else previous_by_id[obj['id']] for obj in objects]
    except ValueError as error:
        raise SceneProgramError(str(error)) from error
    return {'kind':'vector-scene','sceneId':scene['scene_id'],'style':profile,'parameters':{'speed':1},'objects':objects}
