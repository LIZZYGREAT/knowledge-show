import type {
  SceneResource,
  ScriptScene,
  VectorObject,
} from "../runtime/BundleTypes";
import { profiles, type StyleProfile } from "../styles/profiles";
import {
  buildAnalogGauge,
  buildCarrierChamber,
  buildCausalCards,
  buildConceptNetwork,
  buildEditorialCaption,
  buildMetricBars,
  buildOrbitModel,
  buildWaveBand,
  type ComponentId,
} from "./componentLibrary";

export const TEMPLATE_DEMO_DURATION_MS = 12000;

export type TemplateDemoSpec = {
  styleId: string;
  tagline: string;
  sampleTopic: string;
  demoTitle: string;
  demoSubtitle: string;
  scene: ScriptScene;
  resource: SceneResource;
};

function findProfile(styleId: string): StyleProfile {
  return profiles.find((item) => item.id === styleId) ?? profiles[0];
}

export function buildTemplateDemo(styleId: string): TemplateDemoSpec {
  const style = findProfile(styleId);
  const d = TEMPLATE_DEMO_DURATION_MS;

  if (style.id === "precision-science") {
    const objects: VectorObject[] = [
      ...buildEditorialCaption(style, d, {
        idPrefix: "TPL_SCI",
        title: "半导体截面与实时电流响应",
        subtitle: "精密科学风 · 磨砂截面 + 定向粒子流 + 同步仪表",
        x: 96,
        y: 112,
      }),
      ...buildCarrierChamber(style, d, { idPrefix: "SCI_CH", x: 110, y: 280 }),
      ...buildAnalogGauge(style, d, { idPrefix: "SCI_GA", x: 1180, y: 390 }),
      ...buildWaveBand(style, d, { idPrefix: "SCI_WV", x: 120, y: 580 }),
      {
        id: "T_SCI_01",
        label: "机制说明字幕",
        shape: "text",
        x: 800,
        y: 836,
        text: "载流子穿过势垒，电流表与波形同步响应",
        fill: style.palette.ink,
        fontSize: 30,
        fontWeight: 600,
        textAnchor: "middle",
        zIndex: 12,
        keyframes: [
          { time_ms: 0, x: 800, y: 842, opacity: 0, scale: 1, rotation: 0 },
          { time_ms: 1200, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
          { time_ms: d, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
        ],
      },
    ];
    return {
      styleId: style.id,
      tagline: "结构截面 · 物理实验 · 仪器联动",
      sampleTopic: "同一个 PN 结，为什么正向导通而反向截止？",
      demoTitle: "半导体截面与实时电流响应",
      demoSubtitle: "适用于物理、化学、生物机制与工程原理讲解",
      scene: {
        scene_id: "DEMO_SCI",
        start_ms: 0,
        duration_ms: d,
        objective: "演示精密科学风下的截面装置、粒子流与仪表联动",
        timed_text: [
          {
            id: "T_SCI_01",
            kind: "subtitle",
            text: "载流子穿过势垒，电流表与波形同步响应",
            offset_ms: 1000,
            duration_ms: 10000,
          },
        ],
        events: [
          {
            id: "EV_SCI",
            offset_ms: 0,
            duration_ms: d,
            description: "演示精密科学风截面舱与仪器联动",
          },
        ],
      },
      resource: {
        kind: "vector-scene",
        sceneId: "DEMO_SCI",
        style,
        parameters: { speed: 1 },
        objects,
      },
    };
  }

  if (style.id === "paper-editorial") {
    const objects: VectorObject[] = [
      ...buildEditorialCaption(style, d, {
        idPrefix: "TPL_PAP",
        title: "为什么 23 个人就很可能撞生日？",
        subtitle: "纸艺编辑风 · 纤维纸层 + 柔和投影 + 概率分布生长",
        x: 96,
        y: 112,
      }),
      ...buildMetricBars(style, d, { idPrefix: "PAP_BAR", x: 110, y: 310, peakIndex: 3 }),
      ...buildCausalCards(style, d, { idPrefix: "PAP_CRD", x: 830, y: 330 }),
      {
        id: "T_PAP_01",
        label: "概率直觉字幕",
        shape: "text",
        x: 800,
        y: 836,
        text: "23 人可形成 253 组两两配对，重合概率迅速跨过 50%",
        fill: style.palette.ink,
        fontSize: 30,
        fontWeight: 600,
        textAnchor: "middle",
        zIndex: 12,
        keyframes: [
          { time_ms: 0, x: 800, y: 842, opacity: 0, scale: 1, rotation: 0 },
          { time_ms: 1200, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
          { time_ms: d, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
        ],
      },
    ];
    return {
      styleId: style.id,
      tagline: "剪纸叠层 · 温暖编辑 · 百科画册",
      sampleTopic: "为什么只要 23 个人，就很可能出现相同的生日？",
      demoTitle: "为什么 23 个人就很可能撞生日？",
      demoSubtitle: "适用于通识科普、人文社科、认知心理学与生活直觉",
      scene: {
        scene_id: "DEMO_PAP",
        start_ms: 0,
        duration_ms: d,
        objective: "演示纸艺编辑风下的叠纸卡片与概率分布变化",
        timed_text: [
          {
            id: "T_PAP_01",
            kind: "subtitle",
            text: "23 人可形成 253 组两两配对，重合概率迅速跨过 50%",
            offset_ms: 1000,
            duration_ms: 10000,
          },
        ],
        events: [
          {
            id: "EV_PAP",
            offset_ms: 0,
            duration_ms: d,
            description: "演示纸艺编辑风叠纸与分布变化",
          },
        ],
      },
      resource: {
        kind: "vector-scene",
        sceneId: "DEMO_PAP",
        style,
        parameters: { speed: 1 },
        objects,
      },
    };
  }

  if (style.id === "modern-graphic") {
    const objects: VectorObject[] = [
      ...buildEditorialCaption(style, d, {
        idPrefix: "TPL_MOD",
        title: "AI 注意力如何读懂一句话？",
        subtitle: "现代图形风 · 大胆几何色块 + 权重连线网络 + 峰值对照",
        x: 96,
        y: 112,
      }),
      ...buildConceptNetwork(style, d, { idPrefix: "MOD_NET", x: 160, y: 310 }),
      ...buildMetricBars(style, d, { idPrefix: "MOD_BAR", x: 920, y: 300, peakIndex: 4 }),
      {
        id: "T_MOD_01",
        label: "注意力权重字幕",
        shape: "text",
        x: 800,
        y: 836,
        text: "每个词动态计算与其他词的关联权重，把焦点聚合到关键语境",
        fill: style.palette.ink,
        fontSize: 30,
        fontWeight: 600,
        textAnchor: "middle",
        zIndex: 12,
        keyframes: [
          { time_ms: 0, x: 800, y: 842, opacity: 0, scale: 1, rotation: 0 },
          { time_ms: 1200, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
          { time_ms: d, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
        ],
      },
    ];
    return {
      styleId: style.id,
      tagline: "明快几何 · 数据视觉 · 节奏利落",
      sampleTopic: "AI 的注意力机制，是怎样理解一句话的？",
      demoTitle: "AI 注意力如何读懂一句话？",
      demoSubtitle: "适用于统计概率、AI 算法、经济规律与清晰模型对比",
      scene: {
        scene_id: "DEMO_MOD",
        start_ms: 0,
        duration_ms: d,
        objective: "演示现代图形风下的概念权重网络与数据直方图",
        timed_text: [
          {
            id: "T_MOD_01",
            kind: "subtitle",
            text: "每个词动态计算与其他词的关联权重，把焦点聚合到关键语境",
            offset_ms: 1000,
            duration_ms: 10000,
          },
        ],
        events: [
          {
            id: "EV_MOD",
            offset_ms: 0,
            duration_ms: d,
            description: "演示现代图形风权重网络与柱图",
          },
        ],
      },
      resource: {
        kind: "vector-scene",
        sceneId: "DEMO_MOD",
        style,
        parameters: { speed: 1 },
        objects,
      },
    };
  }

  // narrative-collage
  const objects: VectorObject[] = [
    ...buildEditorialCaption(style, d, {
      idPrefix: "TPL_NAR",
      title: "时间为什么只能向前流动？",
      subtitle: "叙事拼贴风 · 印刷网点 + 周期轨道 + 粒子熵增扩散",
      x: 96,
      y: 112,
    }),
    ...buildOrbitModel(style, d, { idPrefix: "NAR_ORB", x: 380, y: 465 }),
    ...buildCarrierChamber(style, d, { idPrefix: "NAR_CH", x: 760, y: 345 }),
    {
      id: "T_NAR_01",
      label: "熵增叙事字幕",
      shape: "text",
      x: 800,
      y: 836,
      text: "微观规律可逆，但宏观系统总是从有序走向更可能出现的无序",
      fill: style.palette.ink,
      fontSize: 30,
      fontWeight: 600,
      textAnchor: "middle",
      zIndex: 12,
      keyframes: [
        { time_ms: 0, x: 800, y: 842, opacity: 0, scale: 1, rotation: 0 },
        { time_ms: 1200, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
        { time_ms: d, x: 800, y: 836, opacity: 1, scale: 1, rotation: 0 },
      ],
    },
  ];

  return {
    styleId: style.id,
    tagline: "印刷网点 · 手作故事 · 历史演变",
    sampleTopic: "时间为什么不能倒流？",
    demoTitle: "时间为什么只能向前流动？",
    demoSubtitle: "适用于科学史故事、思想演变、悬念叙事与人文纪录感",
    scene: {
      scene_id: "DEMO_NAR",
      start_ms: 0,
      duration_ms: d,
      objective: "演示叙事拼贴风下的印刷网点材质、轨道与粒子演化",
      timed_text: [
        {
          id: "T_NAR_01",
          kind: "subtitle",
          text: "微观规律可逆，但宏观系统总是从有序走向更可能出现的无序",
          offset_ms: 1000,
          duration_ms: 10000,
        },
      ],
      events: [
        {
          id: "EV_NAR",
          offset_ms: 0,
          duration_ms: d,
          description: "演示叙事拼贴风网点材质与粒子扩散",
        },
      ],
    },
    resource: {
      kind: "vector-scene",
      sceneId: "DEMO_NAR",
      style,
      parameters: { speed: 1 },
      objects,
    },
  };
}

export function buildComponentPreview(
  componentId: ComponentId,
  styleId: string,
): { scene: ScriptScene; resource: SceneResource } {
  const style = findProfile(styleId);
  const d = 8000;
  let objects: VectorObject[] = [];

  switch (componentId) {
    case "metric-bars":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_BAR",
          title: "动态概率 / 指标柱状图",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildMetricBars(style, d, { idPrefix: "CMP_B", x: 540, y: 340, peakIndex: 3 }),
      ];
      break;
    case "carrier-chamber":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_CH",
          title: "微观机制截面舱 + 粒子流",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildCarrierChamber(style, d, { idPrefix: "CMP_C", x: 520, y: 360 }),
      ];
      break;
    case "wave-band":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_WV",
          title: "连续波动与色散轨迹",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildWaveBand(style, d, { idPrefix: "CMP_W", x: 520, y: 390 }),
      ];
      break;
    case "analog-gauge":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_GA",
          title: "实时指针仪表盘",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildAnalogGauge(style, d, { idPrefix: "CMP_G", x: 800, y: 470 }),
      ];
      break;
    case "concept-network":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_NET",
          title: "注意力与概念关系网",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildConceptNetwork(style, d, { idPrefix: "CMP_N", x: 580, y: 370 }),
      ];
      break;
    case "causal-cards":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_CRD",
          title: "层叠状态演化卡片",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildCausalCards(style, d, { idPrefix: "CMP_K", x: 500, y: 390 }),
      ];
      break;
    case "orbit-model":
      objects = [
        ...buildEditorialCaption(style, d, {
          idPrefix: "CMP_ORB",
          title: "同心轨道与周期运动",
          subtitle: `${style.name} · 1:1 真实渲染组件预览`,
          x: 110,
          y: 120,
        }),
        ...buildOrbitModel(style, d, { idPrefix: "CMP_O", x: 800, y: 490 }),
      ];
      break;
    case "editorial-caption":
    default:
      objects = buildEditorialCaption(style, d, {
        idPrefix: "CMP_CAP",
        title: "模板级主标题与标注引导",
        subtitle: `${style.name} · 字体、配色与引导线随模板自动适配`,
        x: 220,
        y: 380,
      });
      break;
  }

  const sceneId = `CMP_${componentId.replace(/-/g, "_").toUpperCase()}`;
  return {
    scene: {
      scene_id: sceneId,
      start_ms: 0,
      duration_ms: d,
      objective: `组件 1:1 预览：${componentId}`,
      timed_text: [],
      events: [
        {
          id: "EV_CMP",
          offset_ms: 0,
          duration_ms: d,
          description: `组件 1:1 实时预览：${componentId}`,
        },
      ],
    },
    resource: {
      kind: "vector-scene",
      sceneId,
      style,
      parameters: { speed: 1 },
      objects,
    },
  };
}
