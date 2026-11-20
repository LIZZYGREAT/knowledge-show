import { stageNames, stageOrder, type Stage } from "../../common/progress";

export type StageState = "pending" | "running" | "completed" | "failed";

const TOTAL_TICKS = 30;
const MAJOR_TICKS = new Set([0, 10, 20, 30]);

export function computeFineProgress(
  stages: Record<Stage, StageState>,
  eventCounts: Partial<Record<Stage, number>> = {},
): number {
  const knowledgeWeight =
    stages.knowledge === "completed"
      ? 1
      : stages.knowledge === "running" || stages.knowledge === "failed"
        ? Math.min(0.88, 0.22 + (eventCounts.knowledge ?? 0) * 0.17)
        : 0;
  const scriptWeight =
    stages.script === "completed"
      ? 1
      : stages.script === "running" || stages.script === "failed"
        ? Math.min(0.88, 0.28 + (eventCounts.script ?? 0) * 0.22)
        : 0;
  const animationWeight =
    stages.animation === "completed"
      ? 1
      : stages.animation === "running" || stages.animation === "failed"
        ? Math.min(0.92, 0.26 + (eventCounts.animation ?? 0) * 0.18)
        : 0;

  return Math.max(
    0,
    Math.min(1, (knowledgeWeight + scriptWeight + animationWeight) / 3),
  );
}

export function GraduatedStageBar({
  stages,
  progress,
  statusCopy,
  animationDetail,
}: {
  stages: Record<Stage, StageState>;
  progress: number;
  statusCopy: Record<StageState, string>;
  animationDetail?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const percent = Math.round(clamped * 100);
  const failed = stageOrder.some((stage) => stages[stage] === "failed");

  return (
    <section className={`graduated-stage-bar ${failed ? "is-failed" : ""}`} aria-label="制作阶段与精细进度">
      <div className="graduated-bar-header">
        <ol className="creation-timeline-wide">
          {stageOrder.map((stage, index) => {
            const state = stages[stage];
            const subtitle =
              stage === "animation" && animationDetail
                ? animationDetail
                : statusCopy[state];
            return (
              <li
                key={stage}
                className={`timeline-stage-item state-${state} stage-${stage}`}
                aria-current={state === "running" ? "step" : undefined}
              >
                <span className="stage-node">
                  {state === "completed" ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                <div className="timeline-stage-copy">
                  <div className="timeline-stage-title-row">
                    <h2>{stageNames[stage]}</h2>
                    <span className="timeline-stage-pill">{subtitle}</span>
                  </div>
                  <p className="timeline-stage-range">
                    {stage === "knowledge"
                      ? "0% – 33% · 主题核验与核心洞察"
                      : stage === "script"
                        ? "33% – 66% · 分幕编排与节奏设计"
                        : "66% – 100% · 动态渲染与画面质检"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="graduated-percent-readout" aria-live="polite">
          <strong>{percent}</strong>
          <span>%</span>
        </div>
      </div>

      {/* Precision 30-tick graduated progress ruler */}
      <div className="graduated-ruler" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="graduated-ruler-track">
          <div
            className="graduated-ruler-fill"
            style={{ width: `${clamped * 100}%` }}
          >
            {clamped > 0.01 && <span className="graduated-ruler-head" />}
          </div>
        </div>
        <div className="graduated-ticks" aria-hidden="true">
          {Array.from({ length: TOTAL_TICKS + 1 }, (_, index) => {
            const ratio = index / TOTAL_TICKS;
            const passed = clamped + 0.004 >= ratio && clamped > 0.005;
            const major = MAJOR_TICKS.has(index);
            return (
              <span
                key={index}
                className={`graduated-tick ${major ? "is-major" : ""} ${passed ? "is-passed" : ""}`}
              />
            );
          })}
        </div>
        <div className="graduated-scale-labels" aria-hidden="true">
          <span>起点</span>
          <span>知识就绪 · 33%</span>
          <span>脚本定稿 · 66%</span>
          <span>成片就绪 · 100%</span>
        </div>
      </div>
    </section>
  );
}
