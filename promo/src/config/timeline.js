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
 * 克制的刊物旁白字幕时间表（严禁传统课程大字报与 01/02/03 报幕条）
 */
export const CAPTIONS = [
  {
    start: 14.3,
    end: 21.4,
    text: "把一个问题变成动画，已经不稀奇了；但如果动画里的每一个念头，你都能伸手去拨动呢？",
  },
  {
    start: 42.6,
    end: 51.0,
    text: "从一句随口的好奇开始，先理清底层机制，再把它们编排成有起承转合的动态剧本。",
  },
  {
    start: 74.4,
    end: 82.6,
    text: "不止一种讲述方式，同一个机制，可以在不同审美语境里自由生长。",
  },
  {
    start: 93.4,
    end: 99.6,
    text: "但如果初稿里有一处细节不够称心呢？不需要像盲盒抽卡一样，把整支作品推倒重来。",
  },
  {
    start: 120.2,
    end: 136.5,
    text: "点选你想改的那一处，告诉工作台你的想法。其余的一切原地不动，只有你关心的细节精准生长。",
  },
  {
    start: 142.2,
    end: 150.4,
    text: "你在工作台里调好的每一帧，就是最终成片的每一帧。",
  },
];

/**
 * 音画 0ms 精确对齐的事件标记（供 soundEngine.js 与画面共用）
 */
export const AUDIO_CUES = {
  paperBreeze: 0.4,
  dotTremble: 5.8,
  origamiPop: 7.2,
  glassClink: 8.6,
  melodyEnter: 9.2,
  hookPause: 14.0,
  violetPinch: 15.1,
  violetPluck: 16.4,
  rewindSweep: 19.7,
  cursorLand: 21.8,
  typingStart: 23.4,
  modeClick: 27.6,
  submitClick: 29.2,
  prismSplit: 31.8,
  mythFlick: 37.8,
  rulerTighten: 43.2,
  arcSlice: 51.1,
  microWaveChime: 54.5,
  panoramaBloom: 64.2,
  pageFlip1: 74.2,
  pageFlip2: 78.7,
  morphSoap: 83.2,
  morphPn: 86.2,
  morphDice: 89.2,
  workbenchPullback: 93.0,
  bracketSnap: 101.6,
  revTypeStart: 107.4,
  revApplyClick: 114.6,
  rippleBurst: 115.2,
  v2BadgeFlip: 117.6,
  tracingWipe: 124.2,
  microSnap1: 130.5,
  microSnap2: 134.0,
  exportClick: 138.8,
  rulerSweepStart: 140.2,
  exportStamp: 148.6,
  ribbonMerge: 152.0,
  spineDraw: 156.8,
  logoClose: 159.4,
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
 * 获取当前应显示的字幕文本和透明度
 */
export function getActiveCaption(t) {
  const fade = 0.45;
  for (const c of CAPTIONS) {
    if (t >= c.start && t <= c.end) {
      const fadeIn = Math.min(1, (t - c.start) / fade);
      const fadeOut = Math.min(1, (c.end - t) / fade);
      return { text: c.text, alpha: Math.min(fadeIn, fadeOut) };
    }
  }
  return null;
}
