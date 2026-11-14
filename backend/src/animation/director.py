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
Optional appearance fields: stroke (#RRGGBB), strokeWidth (0..30), cornerRadius (0..500, rect), fillOpacity (0..1), lineCap (butt/round/square), materialKey (flat/paper-layer/frosted/ink-print), fontSize (8..160), fontWeight (100..900), textAnchor (start/middle/end), zIndex (-100..100). Materials are rendered as safe SVG: paper-layer has fibers and a soft raised edge, frosted uses translucent highlights, ink-print uses halftone dots, flat is a solid graphic. Use them selectively on meaningful actors; do not place textures on every label. Text may include newline breaks; no markup. Keep subtitles inside the frame with readable spacing.
Each keyframe may have easing: smoothstep (legacy default), linear, ease-in-cubic, ease-out-cubic, ease-in-out-cubic. Easing on a frame controls the outgoing segment. Optional drawProgress (0..1, path only, default 1) reveals the stroke using normalized path length; use fillOpacity:0 for drawn lines. All properties are computed from absolute time, never live CSS animations. Example path frames: [{"time_ms":0,"x":200,"y":400,"opacity":1,"scale":1,"rotation":0,"drawProgress":0,"easing":"ease-out-cubic"},{"time_ms":9000,"x":400,"y":400,"opacity":1,"scale":1,"rotation":0,"drawProgress":1}]. Camera, groups, arbitrary CSS and custom scripts are not supported; coordinated actors can share transform trajectories while keeping their own IDs.
Objects must be recognizable knowledge actors whose states change continuously in response to the script, not slides of titles. Do not make a field of meaningless particles. Object identity persists across keyframes. Supply every timed_text object with exact ID and exact text; its visibility is enforced by the runtime.
For every anchor:true event include its exact offset in anchor_times_ms and a keyframe at that offset. Preserve script facts, semantic constraints and all event times. Never silently rewrite upstream content.
Use scene_context for the whole-film message, neighboring scene goals, verified facts, prior object identities and the user's visual preference. Keep the facts and stable object meanings consistent across scenes. Respect the user's visual preference while using the art profile as a concrete material and motion reference. Art profile guides materials, light and motion, not object composition. For a local revision change only requested appearance or animation parameters and preserve object IDs and all required text. Use at most 60 objects and 64 keyframes per object. Paths use only SVG path commands and finite numbers.'''


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
    anchors={e['offset_ms'] for e in scene['events'] if e.get('anchor')}
    if not anchors.issubset(set(program.get('anchor_times_ms',[]))): raise ValueError('关键事件未在真实时间登记。')
    if not anchors.issubset({f['time_ms'] for o in objects for f in o['keyframes']}): raise ValueError('关键事件缺少对应关键帧。')
    return copy.deepcopy(objects)


class SceneProgramError(ValueError):
    """The model returned a scene program that failed local contract checks."""


async def direct_scene(client: Any, scene: dict[str,Any], profile: dict[str,Any], *, previous: dict[str,Any] | None=None, feedback: str | None=None, scene_context: dict[str,Any] | None=None, format_feedback: str | None=None) -> dict[str,Any]:
    instructions=DIRECTOR
    if format_feedback:
        instructions += '\nCorrect the previous format/validation error and return one complete valid JSON scene program. Do not change the script facts or event schedule.'
    response=await client.generate_json(instructions=instructions,data={'scene':scene,'scene_context':scene_context or {},'style_profile':profile,'previous_resource':previous,'feedback':feedback,'format_feedback':format_feedback},max_output_tokens=14000)
    program=response.value
    try:
        objects=validate_program(scene,program)
        if previous and {o['id'] for o in previous.get('objects',[])} != {o['id'] for o in objects}: raise ValueError('局部修订不得替换对象身份。')
    except ValueError as error:
        raise SceneProgramError(str(error)) from error
    return {'kind':'vector-scene','sceneId':scene['scene_id'],'style':profile,'parameters':{'speed':1},'objects':objects}
