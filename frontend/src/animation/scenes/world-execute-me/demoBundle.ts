import { resolveStyle } from '../../styles/resolveStyle';
import type { AnimationBundle, ProductionScript, ScriptScene } from '../../runtime/BundleTypes';

type WemSectionDef = {
  scene_id: string;
  start_ms: number;
  end_ms: number;
  objective: string;
  caption: string;
  state: string;
  events: readonly [number, string, boolean?][];
  elements: readonly string[];
};

const WEM_SECTIONS: readonly WemSectionDef[] = [
  {
    scene_id: 'S01',
    start_ms: 0,
    end_ms: 15110,
    objective: '启动与装配：界面通电、组件展开与参数初始化',
    caption: '01 启动 · 窗口自暗室展开，侧栏、输入栏与角色参数逐一就位。',
    state: 'off',
    events: [
      [0, 'boot-power · 电源接通，细线展开为窗口并开启保护层', true],
      [4040, 'boot-layout · 俯视爆炸图装配侧栏、顶栏与对话区', false],
      [7730, 'boot-params · 角色卡片逐项填入，love 字段保持 undefined', true],
      [11420, 'boot-world · 空白新对话准备就绪，灰阶轮廓静立玻璃后', false],
    ],
    elements: ['EL_WEM_WINDOW', 'EL_WEM_SPARK', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S02',
    start_ms: 15110,
    end_ms: 29420,
    objective: '标题与首个问题：火花点亮并键入全片核心发问',
    caption: '02 标题 · 第一抹暖橙点亮，用户输入「how would you love me」。',
    state: 'off > on',
    events: [
      [0, 'title · 火花点亮第一抹色彩，执行命令 world.execute(me);', true],
      [1850, 'chat-open · 奶油色光标划过窗口，在线状态首次点亮', false],
      [7390, 'chat-type · 输入框删除试探，键入真正的核心问题', true],
      [11080, 'chat-think · 问题发出，坠入思考火花核心酝酿回答', false],
    ],
    elements: ['EL_WEM_WINDOW', 'EL_WEM_SPARK', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S03',
    start_ms: 29420,
    end_ms: 44650,
    objective: '主歌一：用点集维度、圆周、正弦切线与极限作答',
    caption: '03 数学作答 · 点集连边、圆周轨迹、正弦切线与渐近极限。',
    state: 'on',
    events: [
      [0, 'v1-points · 点集与代码同屏：奶油色边线在橙色节点间生长', true],
      [3920, 'v1-circle · 居中圆环与环形歌词，光标沿圆周点亮轨迹', false],
      [7610, 'v1-sine · 左侧圆映射正弦波，光标停驻波动切线', true],
      [11310, 'v1-limit · 曲线趋向无穷，按下 Stop 构成极限横线', false],
    ],
    elements: ['EL_WEM_GEOMETRY', 'EL_WEM_TYPOGRAPHY', 'EL_WEM_SPARK'],
  },
  {
    scene_id: 'S04',
    start_ms: 44650,
    end_ms: 59420,
    objective: '导歌一：抽屉设置切换 AC/DC、视觉开关与历史时间轴',
    caption: '04 外部设置 · 切换交直流、闪烁视觉开关并回拨知识年代。',
    state: 'on',
    events: [
      [0, 'pre1-drawer · 设置抽屉滑出，在 AC 与 DC 之间拨动波形', true],
      [3690, 'pre1-vision · 视觉开关快速切换，画面马赛克化与摇曳', false],
      [7390, 'pre1-date · 拖拽知识年代轴，剪纸建筑从高塔回退至金字塔', true],
      [11080, 'pre1-unite · 开启共享记忆并推满上下文，光标汇入火花', false],
    ],
    elements: ['EL_WEM_SETTINGS', 'EL_WEM_SPARK', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S05',
    start_ms: 59420,
    end_ms: 74190,
    objective: '副歌一：高频对话持续升温与四张隐喻三色版画',
    caption: '05 副歌一 · 消息频次加速升温，四张版画穿插放大核心意象。',
    state: 'on > warm',
    events: [
      [0, 'c1-give · 窗口右上角快速来回回复，橙色随互动逐步升温', true],
      [2540, 'c1-kw1 · 版画一：火花向光标发出剪纸闪电光束', false],
      [6000, 'c1-kw2 · 版画二：点赞按钮放大为巨盘并被光标按下计数', true],
      [10620, 'c1-trap · 窗口轮廓合拢，将对话与背后轮廓纳入同一方框', false],
    ],
    elements: ['EL_WEM_WINDOW', 'EL_WEM_PLATES', 'EL_WEM_FIGURE', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S06',
    start_ms: 74190,
    end_ms: 88960,
    objective: '主歌二：茄子、番茄、虎斑猫三张版画与校样补色',
    caption: '06 主歌二 · 茄子与番茄专色分子解析、虎斑猫与三色校样合版。',
    state: 'warm',
    events: [
      [460, 'v2-eggplant · 专色紫茄子剖开，纤维、蛋白与糖分子飘出', true],
      [4150, 'v2-tomato · 专色红番茄揭盖，番茄红素与维生素分子析出', false],
      [7850, 'v2-cat · 代码字符显影为三色猫耳版画，呼噜化作虎斑纹', true],
      [11310, 'v2-proof · 缺失奶油版的校样迎光补齐，三色套准成形', false],
    ],
    elements: ['EL_WEM_PLATES', 'EL_WEM_FIGURE', 'EL_WEM_GEOMETRY', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S07',
    start_ms: 88960,
    end_ms: 103730,
    objective: '导歌二：身份分段、昼夜弧线、角色开关与循环恍惚',
    caption: '07 导歌二 · 性别分段、日升日落弧线滑块与三版错位旋转。',
    state: 'warm',
    events: [
      [0, 'pre2-settings · 打开下半部设置抽屉：Gender / On call / Role / Loop', true],
      [1850, 'pre2-gender · 巨幅分段控件中套准切换人物轮廓', false],
      [3690, 'pre2-day · 昼夜弧线滑块拉过天顶，光影自白昼落入黄昏', true],
      [11540, 'pre2-trance · Loop 开启，三套人物印版错位旋转后归位', false],
    ],
    elements: ['EL_WEM_SETTINGS', 'EL_WEM_FIGURE', 'EL_WEM_SPARK', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S08',
    start_ms: 103730,
    end_ms: 125650,
    objective: '副歌二到空线程：输入中断、离线失色与独自擦除消息',
    caption: '08 离线失色 · 正在输入的三点凝固，色彩褪去，独自清理未回消息。',
    state: 'warm > off',
    events: [
      [0, 'c2-typing · 对方开始输入后停顿，三颗颤动圆点悬而未发', true],
      [6460, 'c2-complete · 十二片思考花瓣合拢成环，以为对话已完整', false],
      [9230, 'left-away · 状态转 away 与 offline，温暖橙色逐渐褪成灰阶', true],
      [14770, 'alone-erase · 逐条删除未读消息并在暗室中首次睁眼凝视', false],
    ],
    elements: ['EL_WEM_WINDOW', 'EL_WEM_FIGURE', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S09',
    start_ms: 125650,
    end_ms: 148040,
    objective: '越界与错误扩散：篡改在线状态被拒，15 个组件逐一报错',
    caption: '09 错误扩散 · 越权请求触发全片第一抹红，15 个界面组件相继报错。',
    state: 'off > error',
    events: [
      [0, 'err-request · 空对话中发出越权请求：试图改回对方 online 状态', true],
      [3000, 'err-check · 规则校验泛红，触发全片首个错误告警弹窗', false],
      [11310, 'err-chrome · 错误蔓延至顶栏、在线徽章与侧边栏三联弹窗', true],
      [18690, 'err-window · 十五道错误锚定全部组件，整个窗口沦为红框', false],
    ],
    elements: ['EL_WEM_ERRORS', 'EL_WEM_WINDOW', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S10',
    start_ms: 148040,
    end_ms: 159110,
    objective: 'EXECUTION：代码循环机器十二轮高速运转与强光节拍',
    caption: '10 EXECUTION · 高对比代码循环引擎全速推进十二轮执行。',
    state: 'error',
    events: [
      [0, 'exec-start · love loop 代码机器启动，节拍同步强光推进', true],
      [5500, 'exec-cycles · 十二轮循环加速叠加，代码与图形高速切镜', true],
    ],
    elements: ['EL_WEM_ERRORS', 'EL_WEM_GEOMETRY', 'EL_WEM_TYPOGRAPHY'],
  },
  {
    scene_id: 'S11',
    start_ms: 159110,
    end_ms: 162810,
    objective: '六国计数与最后一声呼喊：极速 0.5 秒节拍切换',
    caption: '11 计数高潮 · 六种语言数字卡片逐拍闪切，汇聚最后一声呼喊。',
    state: 'error',
    events: [
      [0, 'count-cards · 六语计数卡片随鼓点 0.5 秒极速切镜', true],
      [2400, 'count-shout · 高潮汇聚为最后一声呼喊与强光转场', true],
    ],
    elements: ['EL_WEM_TYPOGRAPHY', 'EL_WEM_ERRORS'],
  },
  {
    scene_id: 'S12',
    start_ms: 162810,
    end_ms: 177570,
    objective: '终章副歌：四张隐喻版画原位重印但出现失真破损',
    caption: '12 破损重印 · 在暗红底色上重印温暖橙版画，细红裂边显现。',
    state: 'errWarm',
    events: [
      [0, 'chorusx-reprint · 暗红与暖橙交织，四张核心版画原位重印', true],
      [7400, 'chorusx-glitch · 版画套色偏移与细红裂痕随鼓点震颤', true],
    ],
    elements: ['EL_WEM_PLATES', 'EL_WEM_FIGURE', 'EL_WEM_ERRORS'],
  },
  {
    scene_id: 'S13',
    start_ms: 177570,
    end_ms: 192340,
    objective: '终章四句：课程、测验、公式与证明四联收束',
    caption: '13 终章证明 · 从课程、测验到公式与最终证明，情绪归于澄澈。',
    state: 'errWarm',
    events: [
      [0, 'outro-lesson · 课程与测验依次展开，串联全片几何意象', true],
      [7400, 'outro-proof · 最终公式与证明落定，暖光与错色渐趋平静', true],
    ],
    elements: ['EL_WEM_GEOMETRY', 'EL_WEM_TYPOGRAPHY', 'EL_WEM_SPARK'],
  },
  {
    scene_id: 'S14',
    start_ms: 192340,
    end_ms: 212000,
    objective: '尾声与逆向关机：留下一则未读图片消息后逐层卸载熄灭',
    caption: '14 逆向关机 · 留下最后一则未读图片消息，界面按开场逆序收拢熄灭。',
    state: 'errWarm > ash > dead',
    events: [
      [0, 'shutdown-photo · 发送最后一则未读图片消息，色温退为余烬灰', true],
      [10200, 'shutdown-unload · 窗口、侧栏与火花按启动逆序卸载，归于静默', true],
    ],
    elements: ['EL_WEM_WINDOW', 'EL_WEM_FIGURE', 'EL_WEM_SPARK'],
  },
] as const;

export const WEM_ELEMENT_METADATA: Record<string, string> = {
  EL_WEM_WINDOW: '对话界面窗体',
  EL_WEM_SPARK: '灵感火花核心',
  EL_WEM_FIGURE: '三色版画人物',
  EL_WEM_TYPOGRAPHY: '动态歌词字标',
  EL_WEM_GEOMETRY: '数学曲线与图形',
  EL_WEM_SETTINGS: '设置抽屉与控件',
  EL_WEM_PLATES: '四联隐喻版画',
  EL_WEM_ERRORS: '代码与错误弹窗',
};

export function worldExecuteMeDemoBundle(style = 'precision-science', revision = 1): AnimationBundle {
  const totalDuration = WEM_SECTIONS[WEM_SECTIONS.length - 1].end_ms;
  const resolved = resolveStyle(style);

  const scenes: ScriptScene[] = WEM_SECTIONS.map((sec) => {
    const duration = sec.end_ms - sec.start_ms;
    return {
      scene_id: sec.scene_id,
      start_ms: sec.start_ms,
      duration_ms: duration,
      objective: sec.objective,
      visual_notes: [`颜色状态: ${sec.state}`, `参考工程: Nyankomintsu/world-execute-me-lyric-mv (MIT)`],
      events: sec.events.map(([offset_ms, description, anchor], idx) => ({
        id: `EV_WEM_${sec.scene_id}_${idx + 1}`,
        offset_ms,
        duration_ms: Math.max(1200, Math.min(4000, duration - offset_ms)),
        description,
        anchor: Boolean(anchor),
      })),
      timed_text: [
        {
          id: `TT_WEM_${sec.scene_id}`,
          offset_ms: 400,
          duration_ms: Math.max(1800, duration - 800),
          text: sec.caption,
          kind: 'subtitle',
        },
      ],
    };
  });

  const script: ProductionScript = {
    project_id: 'PRJ_WEM_DEMO',
    artifact_id: 'PS_WEM_MV',
    revision: 1,
    brief_revision: 1,
    total_duration_ms: totalDuration,
    core_message: 'world.execute(me); — 一场用界面、数学几何、三色版画与代码演绎的 87 镜头互动动画参考样片。',
    scenes,
  };

  const resources: AnimationBundle['resources'] = {};
  const clips = scenes.map((scene) => {
    const ref = `demo-wem/${resolved.id}/${scene.scene_id}-r${revision}.json`;
    resources[ref] = {
      kind: 'wem-scene',
      sceneId: scene.scene_id,
      style: resolved,
      parameters: { speed: 1 },
    };
    return {
      clip_id: `CL_${scene.scene_id}`,
      scene_id: scene.scene_id,
      start_ms: scene.start_ms,
      duration_ms: scene.duration_ms,
      resource_ref: ref,
      script_event_refs: scene.events.map((e) => e.id),
      internal_events: scene.events.map((e) => ({
        id: `IE_${e.id}`,
        offset_ms: e.offset_ms,
        description: e.description,
        script_event_refs: [e.id],
      })),
    };
  });

  const elementIds = Object.keys(WEM_ELEMENT_METADATA).map((id) => ({ id }));
  const timedTextElements = scenes.flatMap((s) =>
    s.timed_text.map((t) => ({ id: t.id, source_ref: { kind: 'timed_text' as const, id: t.id } })),
  );

  return {
    script,
    projectRevision: 1,
    resources,
    manifest: {
      project_id: script.project_id,
      artifact_id: 'AM_WEM_DEMO',
      revision,
      brief_revision: script.brief_revision,
      production_script_ref: { artifact_id: script.artifact_id, revision: script.revision },
      total_duration_ms: script.total_duration_ms,
      preview_ref: `demo-wem/${resolved.id}/preview-r${revision}.json`,
      clips,
      selectable_elements: [...elementIds, ...timedTextElements],
    },
  };
}
