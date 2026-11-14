import { useEffect, useState } from "react";
import {
  getJob,
  getProductionScript,
  type JobSnapshot,
  type ProductionScriptSummary,
} from "../../common/api";
import { stageNames, stageOrder } from "../../common/progress";

const stageCopy: Record<string, string> = {
  pending: "尚未开始",
  running: "正在进行",
  completed: "已准备",
  failed: "暂时中断",
};

export function TaskProgress({
  jobId,
  topic,
  hasApiKey,
  onBack,
  onRetry,
  onOpenSettings,
}: {
  jobId: string;
  topic: string;
  hasApiKey: boolean;
  onBack: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [jobError, setJobError] = useState("");
  const [scriptError, setScriptError] = useState("");
  const [script, setScript] = useState<ProductionScriptSummary | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptReadAttempt, setScriptReadAttempt] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    setJob(null);
    setJobError("");
    setScript(null);
    setScriptError("");
    setLoadingScript(false);
    setScriptReadAttempt(0);

    async function poll() {
      try {
        const latest = await getJob(jobId);
        if (stopped) return;
        setJob(latest);
        setJobError("");
        if (["queued", "running"].includes(latest.status)) {
          timer = window.setTimeout(poll, 1500);
        }
      } catch (error) {
        if (!stopped) {
          setJobError((error as Error).message);
          timer = window.setTimeout(poll, 2500);
        }
      }
    }

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [jobId]);

  const scriptRef = job?.artifacts.production_script;
  useEffect(() => {
    if (job?.status !== "script_ready" || !scriptRef) {
      setScript(null);
      setScriptError("");
      setLoadingScript(false);
      return;
    }
    let active = true;
    setScript(null);
    setScriptError("");
    setLoadingScript(true);
    void getProductionScript(job.project_id, scriptRef)
      .then((overview) => {
        if (active) setScript(overview);
      })
      .catch((error) => {
        if (active) setScriptError((error as Error).message);
      })
      .finally(() => {
        if (active) setLoadingScript(false);
      });
    return () => {
      active = false;
    };
  }, [job?.status, job?.project_id, scriptRef?.artifact_id, scriptRef?.revision, scriptReadAttempt]);

  const failed = job?.status === "failed" || job?.status === "interrupted";
  const ready = job?.status === "script_ready";
  const active = job?.status === "running" || job?.status === "queued";

  return (
    <main className="generation page-enter">
      <p className="eyebrow">A STORY IN THE MAKING</p>
      <h1>
        {failed
          ? "我们在这里停一下。"
          : ready
            ? "讲述主线已经准备好。"
            : "正在把你的问题理清楚。"}
      </h1>
      <p className="generation-topic">{topic || "你的创作项目"}</p>
      <ol className="creation-timeline">
        {stageOrder.map((stage, index) => {
          const state = job?.stages[stage] ?? "pending";
          return (
            <li
              key={stage}
              className={state}
              aria-current={state === "running" ? "step" : undefined}
            >
              <span className="stage-node">
                {state === "completed" ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{stageNames[stage]}</h2>
                <p>
                  {stage === "animation" && ready
                    ? "等待动画制作"
                    : stageCopy[state] ?? "尚未开始"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={`progress-scene real-progress-scene ${failed || ready ? "paused" : ""}`}>
        <svg viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 180 C160 180 160 50 330 100 S550 240 680 120 S880 80 1000 70" />
        </svg>
        <div className="event-bubbles" aria-live="polite">
          <div className="event-bubble bubble-0">
            <span />
            {job?.message ?? "正在连接本地创作服务"}
          </div>
        </div>
      </div>
      <p className="current-action" role="status">
        {jobError ||
          scriptError ||
          job?.message ||
          "正在读取任务状态。"}
      </p>
      {ready && script && (
        <section className="script-overview" aria-label="脚本概览">
          <p className="eyebrow">SCRIPT OVERVIEW</p>
          <h2>{script.core_message}</h2>
          <p>
            {script.scenes.length} 个场景 · {Math.round(script.total_duration_ms / 1000)} 秒
          </p>
        </section>
      )}
      {ready && (
        <p className="quiet">
          脚本已正式保存，当前项目还没有可播放的动画资源，因此不能进入视频预览或工作台。
        </p>
      )}
      <div className="progress-actions">
        <button className="secondary" onClick={onBack}>
          {failed ? "返回修改" : "返回创作页"}
        </button>
        {failed ? (
          hasApiKey ? (
            <button className="primary" onClick={onRetry}>
              重试未完成步骤 →
            </button>
          ) : (
            <button className="primary" onClick={onOpenSettings}>
              重新配置 API Key →
            </button>
          )
        ) : ready && scriptError ? (
          <button
            className="secondary"
            onClick={() => setScriptReadAttempt((attempt) => attempt + 1)}
            disabled={loadingScript}
          >
            {loadingScript ? "正在读取脚本…" : "重新读取脚本"}
          </button>
        ) : active && jobError ? (
          <button className="secondary" onClick={() => window.location.reload()}>
            重新连接任务
          </button>
        ) : null}
      </div>
    </main>
  );
}
