import { useState } from "react";
import {
  applyEvent,
  emptyProgress,
  knowledgeEvent,
  stageNames,
  stageOrder,
  type UiEvent,
} from "../../common/progress";
const sequence: UiEvent[] = [
  knowledgeEvent({ phase: "brief", event_type: "completed" })!,
  knowledgeEvent({ phase: "research", event_type: "started" })!,
  knowledgeEvent({ phase: "creative", event_type: "started" })!,
  knowledgeEvent({ phase: "verifier", event_type: "started" })!,
  knowledgeEvent({ phase: "delivery", event_type: "completed" })!,
  { stage: "script", kind: "started", text: "正在安排讲述顺序与场景节奏" },
  { stage: "script", kind: "completed", text: "讲述主线已经准备好" },
  { stage: "animation", kind: "started", text: "正在组合动态画面" },
];
export function GenerationStatus({
  topic,
  onBack,
}: {
  topic: string;
  onBack: () => void;
}) {
  const [progress, setProgress] = useState(emptyProgress);
  const [cursor, setCursor] = useState(0);
  const current = stageOrder.find(
    (stage) =>
      progress.stages[stage] === "running" ||
      progress.stages[stage] === "failed",
  );
  const exhausted = cursor === sequence.length;
  function next() {
    if (cursor < sequence.length) {
      setProgress((state) => applyEvent(state, sequence[cursor]));
      setCursor(cursor + 1);
    }
  }
  function fail() {
    setProgress((state) =>
      applyEvent(state, {
        stage: current ?? "knowledge",
        kind: "failed",
        text: "演示：连接中断，这一步暂时没有完成。",
      }),
    );
  }
  function retry() {
    setProgress((state) => ({
      ...state,
      error: false,
      stages: { ...state.stages, [current ?? "knowledge"]: "running" },
      messages: state.messages.filter((m) => !m.text.startsWith("演示：")),
    }));
  }
  return (
    <main className="generation page-enter">
      <p className="demo-label">流程演示 · 模拟事件 · 不调用 API，不生成视频</p>
      <p className="eyebrow">A STORY IN THE MAKING</p>
      <h1>
        {progress.error
          ? "让我们在这里停一下。"
          : "你的想法，正在成为一支动画。"}
      </h1>
      <p className="generation-topic">{topic || "为什么会出现生日悖论？"}</p>
      <ol className="creation-timeline">
        {stageOrder.map((stage, index) => (
          <li
            key={stage}
            className={progress.stages[stage]}
            aria-current={
              progress.stages[stage] === "running" ? "step" : undefined
            }
          >
            <span className="stage-node">
              {progress.stages[stage] === "completed"
                ? "✓"
                : String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{stageNames[stage]}</h2>
              <p>
                {
                  {
                    pending: "尚未开始",
                    running: "正在进行",
                    completed: "已完成（演示）",
                    failed: "暂时中断",
                  }[progress.stages[stage]]
                }
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div
        className={`progress-scene ${progress.error || exhausted ? "paused" : ""}`}
      >
        <svg
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 180 C160 180 160 50 330 100 S550 240 680 120 S880 80 1000 70" />
        </svg>
        <div
          className="event-bubbles"
          aria-live="polite"
          aria-relevant="additions"
        >
          {progress.messages.map((message, index) => (
            <div key={message.id} className={`event-bubble bubble-${index}`}>
              <span />
              {message.text}
            </div>
          ))}
        </div>
      </div>
      <p className="current-action" role="status">
        {progress.error
          ? "演示连接已中断。可以重试这一步，或返回修改想法。"
          : exhausted
            ? "演示到此结束。尚无真实动画资源，暂不能进入工作台。"
            : (progress.messages.at(-1)?.text ??
              "准备好后，推进第一条演示事件。")}
      </p>
      <div className="progress-actions">
        <button className="secondary" onClick={onBack}>
          返回修改
        </button>
        {progress.error ? (
          <button className="primary" onClick={retry}>
            重试此步骤
          </button>
        ) : (
          <>
            <button
              className="text-button"
              onClick={fail}
              disabled={!current || exhausted}
            >
              演示失败
            </button>
            <button className="primary" onClick={next} disabled={exhausted}>
              下一条演示事件 →
            </button>
          </>
        )}
      </div>
    </main>
  );
}
