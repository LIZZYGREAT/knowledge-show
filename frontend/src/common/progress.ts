export type Stage = "knowledge" | "script" | "animation";
export type DisplayEvent = {
  seq: number;
  stage: Stage;
  code: string;
  text: string;
};
export type ProgressSceneEvent = DisplayEvent & { id: string };
export const stageNames: Record<Stage, string> = {
  knowledge: "知识探索",
  script: "脚本编排",
  animation: "动画制作",
};
export const stageOrder: Stage[] = ["knowledge", "script", "animation"];
const displayEventLimit = 10;
export type Progress = {
  stages: Record<Stage, "pending" | "running" | "completed" | "failed">;
  messages: { id: number; stage: Stage; text: string }[];
  nextMessageId: number;
  error: boolean;
};
export const emptyProgress = (): Progress => ({
  stages: { knowledge: "pending", script: "pending", animation: "pending" },
  messages: [],
  nextMessageId: 1,
  error: false,
});

export function adaptDisplayEvents(jobId: string, raw: unknown): ProgressSceneEvent[] {
  if (!jobId || !Array.isArray(raw)) return [];
  const events = new Map<number, ProgressSceneEvent>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const seq = candidate.seq;
    const stage = candidate.stage;
    const code = candidate.code;
    const text = candidate.text;
    if (
      typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 1 ||
      typeof stage !== "string" || !stageOrder.includes(stage as Stage) ||
      typeof code !== "string" || !code.startsWith(`${stage}.`) ||
      !/^[a-z]+(?:\.[a-z][a-z0-9_]*)+$/.test(code) ||
      typeof text !== "string"
    ) continue;
    const safeText = text.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!safeText || safeText.length > 120 || events.has(seq)) continue;
    events.set(seq, { id: `${jobId}:${seq}`, seq, stage: stage as Stage, code, text: safeText });
  }
  return [...events.values()].sort((left, right) => left.seq - right.seq).slice(-displayEventLimit);
}

export function displayEventsAfter(
  events: ProgressSceneEvent[],
  lastSeq: number,
): ProgressSceneEvent[] {
  return events.filter((event) => event.seq > lastSeq).slice(-12);
}

export function latestDisplayEventSeq(events: ProgressSceneEvent[]): number {
  return events.at(-1)?.seq ?? 0;
}

// Local UI adapter, not a new shared transport contract. Only delivery.completed
// is a published knowledge package; research.completed never completes the stage.
export function knowledgeEvent(raw: unknown): {
  stage: Stage;
  kind: "started" | "completed" | "failed" | "progress";
  text: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const phase = e.phase;
  if (
    typeof phase !== "string" ||
    ![
      "brief",
      "research",
      "search",
      "fetch",
      "creative",
      "verifier",
      "delivery",
    ].includes(phase)
  )
    return null;
  if (
    typeof e.event_type !== "string" ||
    !["started", "completed", "failed", "progress"].includes(e.event_type)
  )
    return null;
  if (e.event_type === "failed")
    return {
      stage: "knowledge",
      kind: "failed",
      text: "这一步暂时没有完成，请重试。",
    };
  if (phase === "brief" && e.event_type !== "completed") return null;
  const messages: Record<string, string> = {
    brief: "已理解你的创作想法",
    research: "正在了解这个主题",
    search: "正在补充关键资料",
    fetch: "正在补充关键资料",
    creative: "正在寻找有趣的讲述角度",
    verifier: "正在确认重要知识",
    delivery: "知识方向已经准备好",
  };
  if (phase === "delivery" && e.event_type !== "completed") return null;
  return {
    stage: "knowledge",
    kind: phase === "delivery" ? "completed" : "progress",
    text:
      e.event_type === "completed"
        ? ((
            {
              research: "主题探索已结束",
              search: "关键资料已补充",
              fetch: "关键资料已补充",
              creative: "讲述角度已整理",
              verifier: "重要知识核查已结束",
            } as Record<string, string>
          )[phase] ?? messages[phase])
        : messages[phase],
  };
}
export type UiEvent = NonNullable<ReturnType<typeof knowledgeEvent>>;
export function applyEvent(state: Progress, e: UiEvent): Progress {
  const index = stageOrder.indexOf(e.stage);
  if (
    index < 0 ||
    stageOrder
      .slice(0, index)
      .some((stage) => state.stages[stage] !== "completed")
  )
    return state;
  if (state.error || state.stages[e.stage] === "completed") return state;
  // Final completion is gated by actual media load, not a stage event.
  if (e.stage === "animation" && e.kind === "completed") return state;
  return {
    ...state,
    error: e.kind === "failed",
    stages: {
      ...state.stages,
      [e.stage]:
        e.kind === "completed"
          ? "completed"
          : e.kind === "failed"
            ? "failed"
            : "running",
    },
    messages: [...state.messages, { id: state.nextMessageId, stage: e.stage, text: e.text }].slice(-4),
    nextMessageId: state.nextMessageId + 1,
  };
}
