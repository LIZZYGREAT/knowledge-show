import { AnimationHandoff, type AnimationPhase } from './AnimationHandoff';
import { useEffect, useRef, useState } from "react";
import { ProgressEventScene, type ProgressSceneStatus } from "./ProgressEventScene";
import {
  getJob,
  getProductionScript,
  type JobSnapshot,
  type ProductionScriptSummary,
} from "../../common/api";
import {
  adaptDisplayEvents,
  displayEventsAfter,
  latestDisplayEventSeq,
  stageNames,
  stageOrder,
  type ProgressSceneEvent,
  type Stage,
} from "../../common/progress";

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
  apiKey,
  continueToPreview,
  artPreference,
  styleChangePending,
  animationJobId,
  onBack,
  onRetry,
  onOpenSettings,
  onAnimationJobCreated,
}: {
  jobId: string;
  topic: string;
  hasApiKey: boolean;
  apiKey?: string | null;
  continueToPreview: boolean;
  artPreference?: string;
  styleChangePending: boolean;
  animationJobId?: string;
  onBack: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
  onAnimationJobCreated: (jobId: string) => void;
}) {
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [jobError, setJobError] = useState("");
  const [scriptError, setScriptError] = useState("");
  const [script, setScript] = useState<ProductionScriptSummary | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptReadAttempt, setScriptReadAttempt] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("checking");
  const [animationMessage, setAnimationMessage] = useState("正在核对动画资源。");
  const [recentDisplayEvents, setRecentDisplayEvents] = useState<ProgressSceneEvent[]>([]);
  const [incomingDisplayEvents, setIncomingDisplayEvents] = useState<ProgressSceneEvent[]>([]);
  const displayEventCursor = useRef<{ jobId: string; seq: number } | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    setJob(null);
    setJobError("");
    setScript(null);
    setScriptError("");
    setLoadingScript(false);
    setScriptReadAttempt(0);
    setAnimationPhase("checking");
    setAnimationMessage("正在核对动画资源。");
    setRecentDisplayEvents([]);
    setIncomingDisplayEvents([]);
    displayEventCursor.current = null;

    async function poll() {
      try {
        const latest = await getJob(jobId);
        if (stopped) return;
        setJob(latest);
        setJobError("");
        const displayEvents = adaptDisplayEvents(jobId, latest.display_events);
        setRecentDisplayEvents(displayEvents.slice(-2));
        const cursor = displayEventCursor.current;
        if (!cursor || cursor.jobId !== jobId) {
          displayEventCursor.current = { jobId, seq: latestDisplayEventSeq(displayEvents) };
          setIncomingDisplayEvents([]);
        } else {
          const arriving = displayEventsAfter(displayEvents, cursor.seq);
          if (arriving.length) {
            cursor.seq = latestDisplayEventSeq(displayEvents);
            setIncomingDisplayEvents((current) => {
              const ids = new Set(current.map((event) => event.id));
              return [...current, ...arriving.filter((event) => !ids.has(event.id))].slice(-12);
            });
          }
        }
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
  const animationReady = animationPhase === "ready";
  const animationRunning = animationPhase === "running";
  const animationFailed = animationPhase === "failed";
  const sceneStage: Stage = ready ? "animation" : job?.current_stage ?? "knowledge";
  const stageStatus = job?.stages[sceneStage];
  const normalizedStageStatus: ProgressSceneStatus = ["pending", "running", "completed", "failed"].includes(stageStatus ?? "")
    ? stageStatus as ProgressSceneStatus
    : "pending";
  const sceneStatus: ProgressSceneStatus = failed
    ? "failed"
    : sceneStage === "animation" && ready
      ? animationReady ? "completed" : animationRunning ? "running" : animationFailed ? "failed" : "pending"
      : normalizedStageStatus;
  const latestDisplayEvent = recentDisplayEvents.at(-1);
  const latestDisplayText = latestDisplayEvent?.stage === sceneStage ? latestDisplayEvent.text : undefined;
  const currentMessage = ready
    ? jobError || scriptError || animationMessage
    : jobError
      || scriptError
      || (failed ? job?.message : latestDisplayText)
      || job?.message
      || "正在读取任务状态。";

  return (
    <main className="generation page-enter">
      <p className="eyebrow">A STORY IN THE MAKING</p>
      <h1>
        {failed
          ? "我们在这里停一下。"
          : ready
            ? animationReady
              ? "预览已经准备好。"
              : animationRunning
                ? "动画正在制作。"
                : "讲述主线已经准备好。"
            : "正在把你的问题理清楚。"}
      </h1>
      <p className="generation-topic">{topic || "你的创作项目"}</p>
      <ol className="creation-timeline">
        {stageOrder.map((stage, index) => {
          const state = stage === "animation" && ready
            ? animationReady ? "completed" : animationRunning ? "running" : animationFailed ? "failed" : "pending"
            : job?.stages[stage] ?? "pending";
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
                    ? animationMessage
                    : stageCopy[state] ?? "尚未开始"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <ProgressEventScene
        stage={sceneStage}
        status={sceneStatus}
        streamKey={jobId}
        recentEvents={recentDisplayEvents}
        incomingEvents={incomingDisplayEvents}
      />
      <p className="current-action" role="status">
        {currentMessage}
      </p>
      {ready && script && (
        <section className="script-overview" aria-label="脚本概览">
          <div className="script-overview-head">
            <p className="eyebrow">SCRIPT STORYBOARD</p>
            <span className="script-meta-pill">
              {script.scenes.length} 个场景 · {Math.round(script.total_duration_ms / 1000)} 秒
            </span>
          </div>
          <h2>{script.core_message}</h2>
          {script.scenes.length > 0 && (
            <ol className="script-scenes" aria-label="分幕主线">
              {script.scenes.map((scene) => (
                <li key={scene.scene_id} className="script-scene-item">
                  <span className="script-scene-id">{scene.scene_id}</span>
                  <span className="script-scene-objective">{scene.objective}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      {ready && job && (
        <AnimationHandoff
          projectId={job.project_id}
          apiKey={apiKey}
          hasApiKey={hasApiKey}
          continueToPreview={continueToPreview}
          artPreference={artPreference}
          styleChangePending={styleChangePending}
          animationJobId={animationJobId}
          onOpenSettings={onOpenSettings}
          onJobCreated={onAnimationJobCreated}
          onState={(phase, message) => {
            setAnimationPhase(phase);
            setAnimationMessage(message);
          }}
        />
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
