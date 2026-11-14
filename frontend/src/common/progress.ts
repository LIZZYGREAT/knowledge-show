export type Stage = "knowledge" | "script" | "animation";
export const stageNames: Record<Stage, string> = {
  knowledge: "知识探索",
  script: "脚本编排",
  animation: "动画制作",
};
export const stageOrder: Stage[] = ["knowledge", "script", "animation"];
export type Progress = {
  stages: Record<Stage, "pending" | "running" | "completed" | "failed">;
  messages: { id: number; text: string }[];
  error: boolean;
};
export const emptyProgress = (): Progress => ({
  stages: { knowledge: "pending", script: "pending", animation: "pending" },
  messages: [],
  error: false,
});
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
    messages: [
      ...state.messages,
      { id: (state.messages.at(-1)?.id ?? 0) + 1, text: e.text },
    ].slice(-4),
  };
}
