"""Zero-model director for the style lab. Run from repo root with .venv/bin/python."""
import json
import math
import sys
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend/src'))
from animation.director import PROFILES, validate_program

OUT = ROOT / 'frontend/tests/fixtures/soap-style-lab'
OUT.mkdir(parents=True, exist_ok=True)
script = dict(project_id='P_SOAP_LAB', artifact_id='PS_SOAP_LAB', revision=1, brief_revision=1,
              knowledge_package_ref=dict(artifact_id='KP_SOAP_LAB', revision=1), direction_id='D_SOAP', total_duration_ms=27000,
              core_message='表面活性剂在油水界面定向排列，在搅动与冲洗中帮助油污分散并被水带走。', scenes=[])
for i, (goal, caption, constraint) in enumerate([
    ('水流经过，油污仍附着', '只用水，为什么油污还在？', '水与油接触；水流不直接令油消失。'),
    ('看清分子两端在油水界面的方向', '亲水端朝水，亲油端伸向油', '头部朝水，尾部伸向油；界面排列是示意，不是瞬间规则球壳。'),
    ('搅动使油污分散，再随冲洗水流离开', '搅动、分散，再随水流带走', '油没有化学消失；小油滴需经历分散与冲洗，保留运动连续性。'),
]):
    sid = f'S0{i+1}'
    script['scenes'].append(dict(scene_id=sid, start_ms=i*9000, duration_ms=9000, objective=goal,
        role=['hook', 'explain', 'payoff'][i], knowledge_refs=['K_SOAP_INTERFACE'],
        semantic_constraints=[constraint], visual_notes=['油污及分子保持可追踪身份；无音轨的抽象示意。'],
        events=[dict(id=f'EV_{sid}', offset_ms=4500, anchor=True, description=goal, knowledge_refs=['K_SOAP_INTERFACE'])],
        timed_text=[dict(id=f'T_{sid}', offset_ms=0, duration_ms=9000, text=caption, kind='subtitle')]))
Draft202012Validator(json.loads((ROOT/'contracts/schemas/production-script.schema.json').read_text())).validate(script)
(OUT/'production-script.json').write_text(json.dumps(script, ensure_ascii=False, indent=2)+'\n')


def frame(t, x, y, scale=1, rotation=0, opacity=1):
    return dict(time_ms=t,x=round(x,3),y=round(y,3),scale=scale,rotation=rotation,opacity=opacity)


def make_bundle(profile):
    pid=profile['id']; p=profile['palette']
    paper=pid=='paper-editorial'; science=pid=='precision-science'; modern=pid=='modern-graphic'; collage=pid=='narrative-collage'
    material='paper-layer' if paper else 'frosted' if science else 'ink-print' if collage else 'flat'
    cx=820 if science else 940 if modern else 760; cy=490
    oilpath=('M-170 38 Q-185-50-100-118 Q-10-174 95-115 Q200-46 166 54 Q110 145-28 132 Q-148 128-170 38Z' if paper else
             'M-178 40 C-205-110-65-163 58-140 S220-6 152 100 S-160 142-178 40Z' if collage else
             'M-180 0 A180 145 0 1 0 180 0 A180 145 0 1 0-180 0Z')
    resources={}; clips=[]; elements={}
    for scene in script['scenes']:
        sid=scene['scene_id']; stage=int(sid[-1]); objects=[]
        def obj(oid,label,shape,fill,frames=None,**kw):
            value=dict(id=oid,label=label,shape=shape,x=0,y=0,fill=fill,keyframes=frames or [frame(0,0,0),frame(4500,0,0),frame(9000,0,0)],**kw)
            objects.append(value); elements[oid]={'id':oid}; return value
        def text(oid,label,x,y,size=28,**kw):
            return obj(oid,label,'text',p['ink'],[frame(0,x,y),frame(4500,x,y),frame(9000,x,y)],text=label,fontSize=size,**kw)
        # A liquid cutaway, an editorial sheet, a geometric band or a kitchen plate.
        if science:
            obj('EL_WATER','水相截面','rect',p['blue'],width=1340,height=440,cornerRadius=30,fillOpacity=.13,stroke=p['blue'],strokeWidth=2,frames=[frame(0,130,225),frame(4500,130,225),frame(9000,130,225)])
        elif paper:
            obj('EL_SHEET','剪纸水层','path',p['blue'],path='M0 20 Q400-20 800 12 L1250 0 L1240 410 Q600 450 0 410Z',materialKey=material,fillOpacity=.19,frames=[frame(0,150,240),frame(4500,154,236),frame(9000,150,240)])
        elif modern:
            obj('EL_BAND','几何水域','rect',p['material'],width=1190,height=420,cornerRadius=0,frames=[frame(0,260,240),frame(4500,260,240),frame(9000,260,240)])
            text('EL_CHAPTER','0'+str(stage),130,320,100,fontWeight=800)
        else:
            obj('EL_PLATE','厨房盘子剪贴','circle',p['material'],radius=310,materialKey='paper-layer',stroke=p['shade'],strokeWidth=10,frames=[frame(0,cx,cy),frame(4500,cx,cy),frame(9000,cx,cy)])
            obj('EL_WATER','盘中的水','circle',p['blue'],radius=275,materialKey='ink-print',fillOpacity=.18,frames=[frame(0,cx,cy),frame(4500,cx,cy),frame(9000,cx,cy)])
        obj('EL_SURFACE','附着表面','path',p['shade'],path='M-240 0 Q0 12 240 0 L240 24 L-240 24Z',materialKey=material,frames=[frame(0,cx,cy+147),frame(4500,cx,cy+147),frame(9000,cx,cy+147)])
        # Persistent oil actor shrinks into a transported drop; other drops separate from its interior.
        oilframes=([frame(0,cx,cy),frame(1800,cx+8,cy-8),frame(4500,cx+45,cy-36,.63),frame(6500,cx+170,cy-60,.27),frame(9000,1880,cy-110,.27)] if stage==3 else
                   [frame(0,cx,cy),frame(4500,cx,cy,1,2 if paper or collage else 0),frame(9000,cx,cy)])
        oilkw=dict(width=340,height=270,cornerRadius=48) if modern else dict(path=oilpath)
        # Center a geometric block on the same semantic anchor as other shapes.
        if modern: oilkw=dict(path='M-170-132 L145-132 L175 105 L-145 138Z')
        obj('EL_OIL','油污','path',p['gold'] if not modern else p['red'],oilframes,materialKey=material,stroke=p['ink'] if modern else p['gold'],strokeWidth=6 if modern else 2,**oilkw)
        for j in range(4):
            y=[285,310,335,650][j]
            obj(f'EL_FLOW_{j}','冲洗水流','path',p['blue'],path='M0 0 Q70-18 135 0 T270 0',stroke=p['blue'],strokeWidth=5 if modern else 3,fillOpacity=0,lineCap='round',frames=[frame(0,180+j*50,y,opacity=.4),frame(4500,480+j*50,y-8,opacity=.65),frame(9000,1140+j*50,y,opacity=.3)])
        if stage>=2:
            for j in range(6):
                a=math.radians(205+j*27)
                # Heads remain outside oil, tails terminate inside the interface.
                hx=cx+230*math.cos(a); hy=cy+205*math.sin(a)
                tx=cx+160*math.cos(a); ty=cy+140*math.sin(a)
                startx=hx-140+(j%2)*250; starty=230-(j%2)*50
                endx=cx+[290,425,520,270,405,530][j]; endy=cy+[-170,-140,-55,40,100,135][j]
                def trajectory(x,y):
                    if stage==2:
                        return [frame(0,startx+(x-hx),starty+(y-hy),opacity=.1),frame(1000+j*330,startx+(x-hx),starty+(y-hy),rotation=-8 if collage else 0),frame(4500,x,y),frame(9000,x,y)]
                    return [frame(0,x,y),frame(1800,x+8,y-8),frame(4500,endx+(x-cx)*.35,endy+(y-cy)*.35,.55),frame(6500,endx+200+(x-cx)*.35,endy+(y-cy)*.35,.55),frame(9000,1920+j*90+(x-cx)*.35,endy+(y-cy)*.35,.55)]
                if stage==3:
                    obj(f'EL_DROP_{j}','分散油滴','path',p['gold'] if not modern else p['red'],[frame(0,cx,cy,.01),frame(1800,cx+8,cy-8,.04),frame(4500,endx,endy,.32),frame(6500,endx+200,endy,.32),frame(9000,1920+j*90,endy,.32)],path=oilpath if not modern else 'M-160-120L160-120L160 120L-160 120Z',materialKey=material,stroke=p['ink'] if modern else p['gold'],strokeWidth=3)
                # Tail local path points inward from the hydrophilic head.
                dx=tx-hx; dy=ty-hy
                tailpath=f'M0 0 L{dx*.33:.2f} {dy*.36+5:.2f} L{dx*.66:.2f} {dy*.66-5:.2f} L{dx:.2f} {dy:.2f}'
                obj(f'EL_TAIL_{j}','亲油端（伸向油）','path',p['red'],trajectory(hx,hy),path=tailpath,stroke=p['red'],strokeWidth=10 if paper else 8,lineCap='round',fillOpacity=0,zIndex=3)
                if modern:
                    obj(f'EL_HEAD_{j}','亲水端（朝水）','rect',p['blue'],trajectory(hx,hy),width=28,height=28,cornerRadius=0,stroke=p['ink'],strokeWidth=3,zIndex=4)
                else:
                    obj(f'EL_HEAD_{j}','亲水端（朝水）','circle',p['blue'],trajectory(hx,hy),radius=17,materialKey=material,stroke=p['material'],strokeWidth=2,zIndex=4)
            text('EL_HEAD_LABEL','亲水端 · 朝水',145,490,28)
            text('EL_TAIL_LABEL','亲油端 · 入油',145,535,28)
        text('EL_TITLE','肥皂为什么能带走油污？',110,125,52,fontWeight=700)
        text('EL_STAGE_NOTE',['水经过，油仍附着','油—水界面 · 分子方向示意','搅动 → 分散 → 冲洗'][stage-1],110,190,28)
        text('EL_OIL_LABEL','油',cx-15,cy+35,38,fontWeight=700)
        if stage==3: objects[-1]['keyframes']=oilframes
        text('EL_FOOTNOTE','过程示意 · 油被分散并带走，未发生化学消失',110,835,22)
        if collage:
            obj('EL_CAPTION_PAPER','字幕底衬','rect',p['background'],width=1440,height=85,cornerRadius=4,zIndex=5,frames=[frame(0,80,705),frame(4500,80,705),frame(9000,80,705)])
        timed=scene['timed_text'][0]; text(timed['id'],timed['text'],800,760,38,textAnchor='middle',fontWeight=600)
        elements[timed['id']]['source_ref']={'kind':'timed_text','id':timed['id']}
        for actor in objects:
            if actor['shape']=='text': actor['zIndex']=6
            elif actor['id']=='EL_OIL' or actor['id'].startswith('EL_DROP_'): actor['zIndex']=2
            elif actor['id'].startswith('EL_FLOW_') or actor['id']=='EL_SURFACE': actor['zIndex']=1
            for k,f in enumerate(actor['keyframes']):
                f['easing']='ease-out-cubic' if modern else 'ease-in-out-cubic' if paper else 'ease-in-cubic' if collage else 'smoothstep'
                if actor['id'].startswith('EL_FLOW_'): f['drawProgress']=min(1,.2+f['time_ms']/4500)
            if paper and actor['id'].startswith('EL_HEAD_') and actor['shape']!='text' and stage==2:
                last=actor['keyframes'][-1]; actor['keyframes'].insert(-1,{**last,'time_ms':5200,'rotation':4})
        validate_program(scene,dict(objects=objects,anchor_times_ms=[4500]))
        ref=f'soap-lab/{pid}/{sid}.json'
        resources[ref]=dict(kind='vector-scene',sceneId=sid,style=profile,parameters=dict(speed=1),objects=objects)
        clips.append(dict(clip_id=f'CL_{sid}',scene_id=sid,start_ms=scene['start_ms'],duration_ms=9000,resource_ref=ref,script_event_refs=[f'EV_{sid}'],internal_events=[dict(id=f'IE_{sid}',offset_ms=4500,description=scene['objective'],script_event_refs=[f'EV_{sid}'])]))
    manifest=dict(project_id=script['project_id'],artifact_id='AM_SOAP_LAB',revision=1,brief_revision=1,production_script_ref=dict(artifact_id=script['artifact_id'],revision=1),total_duration_ms=27000,preview_ref=f'soap-lab/{pid}/preview.json',clips=clips,selectable_elements=list(elements.values()))
    return dict(script=script,manifest=manifest,resources=resources,projectRevision=1)

for profile in PROFILES:
    bundle=make_bundle(profile)
    (OUT/f"style-{profile['id']}.json").write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
print('Validated one shared ProductionScript and 12 vector scenes; model API calls: 0')
