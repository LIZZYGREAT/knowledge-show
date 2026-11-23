/*
 * Knowledge.Show(me) 长视频宣传片 v2 — 全局时间轴与音画同步事件表
 * 总时长：165.0 秒（2 分 45 秒），60 fps = 9900 帧
 */

export const TOTAL_DURATION = 165.0;

export const ACTS = [
  {
    id: "act01",
    index: 1,
    name: "第一幕 · 破纸而出",
    shortName: "破纸而出",
    start: 0.0,
    end: 22.0,
    shots: {
      staticHandout: [0.0, 6.0],
      popupAwaken: [6.0, 14.0],
      violetHook: [14.0, 19.6],
      rewindToCursor: [19.6, 22.0],
    },
  },
  {
    id: "act02",
    index: 2,
    name: "第二幕 · 提问生光",
    shortName: "提问生光",
    start: 22.0,
    end: 52.0,
    shots: {
      composerEntry: [22.0, 30.0],
      opticalBreakdown: [30.0, 42.0],
      tensionArc: [42.0, 52.0],
    },
  },
  {
    id: "act03",
    index: 3,
    name: "第三幕 · 万物剧场",
    shortName: "万物剧场",
    start: 52.0,
    end: 92.0,
    shots: {
      microRefraction: [52.0, 64.0],
      panoramaRainbow: [64.0, 74.0],
      styleFlip1: [74.0, 78.5],
      styleFlip2: [78.5, 83.0],
      morphSoap: [83.0, 86.0],
      morphPn: [86.0, 89.0],
      morphDice: [89.0, 92.0],
    },
  },
  {
    id: "act04",
    index: 4,
    name: "第四幕 · 创作者主权",
    shortName: "创作者主权",
    start: 92.0,
    end: 140.0,
    shots: {
      pullbackWorkbench: [92.0, 100.0],
      bracketSelect: [100.0, 107.0],
      typeRevision: [107.0, 114.5],
      inkRippleApply: [114.5, 119.0],
      v2Inspect: [119.0, 124.0],
      tracingCompare: [124.0, 129.0],
      microEdits: [129.0, 137.0],
      clickExport: [137.0, 140.0],
    },
  },
  {
    id: "act05",
    index: 5,
    name: "第五幕 · 所见即成片",
    shortName: "所见即成片",
    start: 140.0,
    end: 165.0,
    shots: {
      rulerSweep: [140.0, 151.0],
      ribbonGather: [151.0, 156.5],
      logoAssemble: [156.5, 162.5],
      tailBreath: [162.5, 165.0],
    },
  },
];

/**
 * 帧感知刊物旁白字幕时间表：
 * 每条字幕按当前镜头的黄金留白区、画风语境（暖纸刊物 / 包豪斯 / 手工拼贴 / 工作台轻注）
 * 动态定制落位、对齐、装帧样式、字号层级与关键词异色高亮，彻底杜绝遮挡画面文字与核心视觉！
 */
export const CAPTIONS = [
  // 第一幕 14.3–21.4s：右上角大片午后留白区，刊物引语无框排印（0% 遮挡左下紫光选框与波列）
  {
    id: "act1_hook",
    start: 14.3,
    end: 21.4,
    variant: "editorial-quote",
    x: 1120,
    y: 158,
    align: "left",
    kicker: "01 · LIVING KNOWLEDGE",
    accent: "#12948D",
    accent2: "#F2994A",
    lines: [
      {
        text: "把一个问题变成动画，已经不稀奇了；",
        size: 26,
        weight: 500,
        family: "serif",
        color: "#5B6B73",
      },
      {
        text: "但如果动画里的每一个念头，",
        size: 33,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [{ word: "每一个念头", color: "#0E7C7B", underline: true }],
      },
      {
        text: "你都能伸手去拨动呢？",
        size: 33,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [{ word: "伸手去拨动", color: "#D47528", underline: true }],
      },
    ],
  },

  // 第二幕 42.6–51.0s：叙事弧线下方开阔留白区，典雅双行无框居下排印
  {
    id: "act2_arc",
    start: 42.6,
    end: 51.0,
    variant: "editorial-band",
    x: 960,
    y: 868,
    align: "center",
    kicker: "02 · STORY ARC",
    accent: "#12948D",
    accent2: "#4E7CF6",
    lines: [
      {
        text: "从一句随口的好奇开始，先理清底层机制，",
        size: 25,
        weight: 500,
        family: "serif",
        color: "#5B6B73",
      },
      {
        text: "再把它们编排成有起承转合的动态剧本。",
        size: 31,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [
          { word: "起承转合", color: "#0E7C7B", underline: true },
          { word: "动态剧本", color: "#3B6AE8", underline: true },
        ],
      },
    ],
  },

  // 第三幕 A 74.5–78.6s（现代图形风 Bauhaus）：左下棱镜下方纯净留白，化身为包豪斯几何海报风字幕！
  {
    id: "act3_bauhaus",
    start: 74.5,
    end: 78.6,
    fadeIn: 0.35,
    fadeOut: 0.25,
    variant: "bauhaus-poster",
    x: 84,
    y: 736,
    align: "left",
    kicker: "STYLE · MODERN GRAPHIC",
    accent: "#EC4B53",
    accent2: "#2262C4",
    lines: [
      {
        text: "不止一种讲述方式——",
        size: 21,
        weight: 700,
        family: "sans",
        color: "#515A6E",
      },
      {
        text: "同一个机制，能换上利落的几何语言；",
        size: 25,
        weight: 700,
        family: "sans",
        color: "#202638",
        highlights: [{ word: "几何语言", color: "#EC4B53" }],
      },
    ],
  },

  // 第三幕 B 78.9–82.5s（手工叙事拼贴风 Collage）：中上圆环与色卡之间的纯棉纸留白，化身为和纸胶带手作便签！
  {
    id: "act3_collage",
    start: 78.9,
    end: 82.5,
    fadeIn: 0.35,
    fadeOut: 0.35,
    variant: "collage-note",
    x: 1038,
    y: 148,
    align: "left",
    kicker: "HANDMADE · COLLAGE",
    accent: "#C4523A",
    accent2: "#B88648",
    lines: [
      {
        text: "也能落进手作拼贴，",
        size: 22,
        weight: 600,
        family: "serif",
        color: "#6B5842",
      },
      {
        text: "在不同审美语境里自由生长。",
        size: 25,
        weight: 700,
        family: "serif",
        color: "#2C2B29",
        highlights: [{ word: "自由生长", color: "#C4523A", underline: true }],
      },
    ],
  },

  // 第四幕 A 93.6–99.6s（工作台退镜与巡检）：精准落位画幅窗内右上角纯净暖纸留白（0% 遮挡底部时间轴与右侧面板！）
  {
    id: "act4_no_gacha",
    start: 93.6,
    end: 99.6,
    variant: "studio-whisper",
    x: 1312,
    y: 118,
    align: "right",
    kicker: "CO-DIRECTOR · 创作者主权",
    accent: "#12948D",
    accent2: "#F2994A",
    lines: [
      {
        text: "如果初稿里有一处细节不够称心？",
        size: 23,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
      },
      {
        text: "不必像盲盒抽卡一样，整支推倒重来。",
        size: 21,
        weight: 500,
        family: "sans",
        color: "#5B6B73",
        highlights: [{ word: "盲盒抽卡", color: "#D47528" }],
      },
    ],
  },

  // 第四幕 B 103.0–113.5s（点选波浪带与输入自然语言指令）：画幅窗右上留白，语意与画面动作 100% 同步
  {
    id: "act4_pick_intent",
    start: 103.0,
    end: 113.5,
    variant: "studio-whisper",
    x: 1304,
    y: 110,
    align: "right",
    kicker: "01 · 精准点选对象",
    accent: "#12948D",
    accent2: "#4E7CF6",
    lines: [
      {
        text: "点选你想改的那一处，",
        size: 24,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [{ word: "点选", color: "#0E7C7B", underline: true }],
      },
      {
        text: "直接告诉工作台你的想法。",
        size: 21,
        weight: 500,
        family: "sans",
        color: "#5B6B73",
      },
    ],
  },

  // 第四幕 C 120.2–136.2s（v2 生效 -> 描图纸对比 -> v3 棱镜 -> v4 圆环）：
  // 随镜头缩放与对象徽章平滑动态让位，全程 0% 遮挡 v1/v2 对比标签与测角环徽章！
  {
    id: "act4_local_grow",
    start: 120.2,
    end: 136.2,
    variant: "studio-whisper",
    x: 1324,
    y: 162,
    posAt(t) {
      // 132.4–133.6s 随 v4 测角环锁定徽章出现，字幕轻盈右移至放大后的画幅窗右缘，彻底拉开呼吸间距
      const u = segProgress(t, 132.4, 133.6);
      const ease = u * u * (3 - 2 * u);
      return { x: 1324 + 62 * ease, y: 162 - 12 * ease };
    },
    align: "right",
    kicker: "02 · 其余锁定 · 局部生长",
    accent: "#12948D",
    accent2: "#F2994A",
    lines: [
      {
        text: "其余的一切原地不动，",
        size: 21,
        weight: 500,
        family: "sans",
        color: "#5B6B73",
      },
      {
        text: "只有你关心的细节精准生长。",
        size: 23,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [{ word: "精准生长", color: "#0E7C7B", underline: true }],
      },
    ],
  },

  // 第五幕 145.6–151.6s（标尺扫出满屏精修画幅后）：右上角纯净日光区，与第一幕开场引语遥相呼应，0% 遮挡彩虹与顶部印章
  {
    id: "act5_wysiwyg",
    start: 145.6,
    end: 151.6,
    variant: "editorial-quote",
    x: 1120,
    y: 196,
    align: "left",
    kicker: "05 · WHAT YOU SEE IS WHAT YOU SHIP",
    accent: "#12948D",
    accent2: "#F2994A",
    lines: [
      {
        text: "你在工作台里调好的每一帧，",
        size: 28,
        weight: 500,
        family: "serif",
        color: "#5B6B73",
      },
      {
        text: "就是最终成片的每一帧。",
        size: 34,
        weight: 600,
        family: "serif",
        color: "#1C2A30",
        highlights: [{ word: "最终成片", color: "#0E7C7B", underline: true }],
      },
    ],
  },
];

/**
 * 音画 0ms 精确对齐的事件标记（供 soundEngine.js 与画面共用）
 */
export const AUDIO_CUES = {
  // 第一幕：星盘破晓 -> 日光揭幕 -> 落笔句号 -> 敲击三角 -> 立体书弹起 -> 紫光钩子 -> 倒卷光标
  openSeedChime: 0.1,
  openBeamBloom: 0.36,
  openIrisUnveil: 0.9,
  openDotKiss: 3.22,
  tapTriangle1: 5.65,
  tapTriangle2: 6.3,
  origamiPop: 7.05,
  glassClink: 8.5,
  melodyEnter: 9.2,
  hookPause: 14.0,
  violetPinch: 15.0,
  violetPluck: 16.2,
  rewindSweep: 19.65,
  cursorLand: 21.8,
  // 第二幕：打字 -> 模式 -> 确认 -> 色散 -> 弹飞误区 -> 标尺 -> 划开舞台
  typingStart: 23.4,
  modeClick: 27.6,
  submitClick: 29.2,
  prismSplit: 31.8,
  mythFlick: 37.8,
  rulerTighten: 43.2,
  arcSlice: 51.1,
  // 第三幕：空气直线波 -> 玻璃滑入实时偏折 -> 放大镜 -> 7色游标扫频 -> 两次翻页 -> 邮戳 -> 跨主题 -> 骰子折页返回
  glassSlideIn: 54.2,
  loupePop: 57.8,
  panoramaBloom: 64.4,
  vernierScanStart: 67.6,
  pageFlip1: 74.2,
  pageFlip2: 78.7,
  collageStamp: 80.85,
  morphSoap: 82.8,
  morphPn: 86.2,
  pnBulbGlow: 86.8,
  morphDice: 88.8,
  diceFoldBack: 90.18,
  // 第四幕：退镜 -> 三形态巡检 -> 波浪带精修 v2 -> 描图纸对比 -> 棱锥精修 v3 -> 圆环精修 v4 -> 导出
  workbenchPullback: 93.2,
  hoverPrism: 97.5,
  hoverRing: 99.4,
  bracketSnap: 101.4,
  revTypeStart: 107.4,
  revApplyClick: 114.6,
  rippleBurst: 115.2,
  v2BadgeFlip: 117.35,
  tracingWipe: 124.2,
  prismLockV3: 129.15,
  prismShimmerV3: 130.35,
  v3BadgeFlip: 131.65,
  ringLockV4: 133.45,
  ringSweepV4: 134.55,
  v4BadgeFlip: 135.85,
  exportClick: 138.8,
  // 第五幕：标尺扫屏 -> 导出印章 -> 丝带溶解编织 -> 品牌合拢落版
  rulerSweepStart: 140.2,
  exportStamp: 148.45,
  ribbonMerge: 152.0,
  spineDraw: 156.6,
  logoClose: 159.25,
  bookClose: 162.1,
};

/**
 * 根据全局时间 t 返回当前幕信息及局部进度
 */
export function getActAt(t) {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION, t));
  for (let i = 0; i < ACTS.length; i++) {
    const act = ACTS[i];
    if (clamped < act.end || i === ACTS.length - 1) {
      const localT = Math.max(0, clamped - act.start);
      const dur = act.end - act.start;
      return {
        act,
        localT,
        progress: Math.max(0, Math.min(1, localT / dur)),
      };
    }
  }
  const last = ACTS[ACTS.length - 1];
  return { act: last, localT: last.end - last.start, progress: 1 };
}

/**
 * 局部子区间归一化进度 helper
 */
export function segProgress(t, start, end) {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}

/**
 * 获取当前应显示的帧感知字幕完整配置、透明度及出入场微动进度
 */
export function getActiveCaption(t) {
  for (const c of CAPTIONS) {
    if (t >= c.start && t <= c.end) {
      const fadeInDur = c.fadeIn ?? 0.48;
      const fadeOutDur = c.fadeOut ?? 0.45;
      const enterP = Math.max(0, Math.min(1, (t - c.start) / fadeInDur));
      const exitP = Math.max(0, Math.min(1, (c.end - t) / fadeOutDur));
      const alpha = Math.min(enterP, exitP);
      const localT = t - c.start;
      const dynPos = typeof c.posAt === "function" ? c.posAt(t) : null;
      return {
        ...c,
        x: dynPos?.x ?? c.x,
        y: dynPos?.y ?? c.y,
        alpha,
        enterP,
        exitP,
        localT,
      };
    }
  }
  return null;
}
