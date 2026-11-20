import { useEffect, useRef, useState } from "react";

type Preview = {
  status: string;
  message?: string;
  workbench_url?: string;
  bundle_url?: string;
};
type AnimationJob = { job_id?: string; status: string; message?: string } | null;
export type AnimationPhase =
  | "checking"
  | "pending"
  | "running"
  | "ready"
  | "failed"
  | "needs_key";

async function call(path: string, body?: unknown) {
  const response = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error?.message ?? "动画暂时无法读取。");
  return value;
}

export function AnimationHandoff({
  projectId,
  apiKey,
  hasApiKey,
  continueToPreview,
  artPreference,
  styleChangePending,
  animationJobId,
  onOpenSettings,
  onState,
  onJobCreated,
}: {
  projectId: string;
  apiKey?: string | null;
  hasApiKey: boolean;
  continueToPreview: boolean;
  artPreference?: string;
  styleChangePending: boolean;
  animationJobId?: string;
  onOpenSettings: () => void;
  onState: (phase: AnimationPhase, message: string) => void;
  onJobCreated: (jobId: string) => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("正在核对动画资源。");
  const [statusError, setStatusError] = useState(false);
  const [phase, setPhase] = useState<AnimationPhase>("checking");
  const attemptedAutoStart = useRef(false);
  const startInFlight = useRef(false);
  const onStateRef = useRef(onState);
  const onJobCreatedRef = useRef(onJobCreated);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);
  useEffect(() => {
    onJobCreatedRef.current = onJobCreated;
  }, [onJobCreated]);

  function report(phase: AnimationPhase, nextMessage: string) {
    setPhase(phase);
    setMessage(nextMessage);
    onStateRef.current(phase, nextMessage);
  }

  async function startAnimation(allowFailedRetry: boolean, forceStyle = false) {
    if (startInFlight.current) return;
    startInFlight.current = true;
    setBusy(true);
    try {
      // Check the durable state immediately before creating a potentially paid job.
      const current = await call(`/api/projects/${projectId}/animations/status`);
      const currentPreview = current.preview as Preview;
      const currentJob = current.job as AnimationJob;
      if (!forceStyle && currentPreview.status === "ready" && currentPreview.bundle_url) {
        await call(currentPreview.bundle_url);
        setPreview(currentPreview);
        report("ready", "动画已准备好，可以预览和调整。");
        return;
      }
      if (currentJob && ["queued", "running"].includes(currentJob.status)) {
        if (!forceStyle && typeof currentJob.job_id === "string") {
          onJobCreatedRef.current(currentJob.job_id);
        }
        report("running", currentJob.message ?? "正在制作动画。");
        setRefresh((value) => value + 1);
        return;
      }
      if (
        currentJob &&
        ["failed", "interrupted", "completed"].includes(currentJob.status) &&
        !allowFailedRetry && !forceStyle
      ) {
        report("failed", currentJob.message ?? "动画任务已结束，但预览不可用。检查后可以选择重试。");
        return;
      }
      if (!hasApiKey || !apiKey) {
        report("needs_key", "请重新连接 API Key，再继续制作动画。");
        return;
      }
      const handoff = await call(`/api/projects/${projectId}/handoff/animation`);
      const started = await call(`/api/projects/${projectId}/animations`, {
        expected_project_revision: handoff.project_revision,
        style_id: "auto",
        api_key: apiKey,
        ...(artPreference !== undefined ? { art_preference: artPreference } : {}),
      });
      if (typeof started.job_id === "string") onJobCreatedRef.current(started.job_id);
      report("running", "正在制作动画，完成检查后即可预览。");
      setRefresh((value) => value + 1);
    } catch (error) {
      report("failed", (error as Error).message);
    } finally {
      startInFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const { preview: value, job } = await call(
          `/api/projects/${projectId}/animations/status`,
        );
        const currentPreview = value as Preview;
        const currentJob = job as AnimationJob;
        if (stopped) return;
        setPreview(currentPreview);
        setStatusError(false);
        if (animationJobId) {
          const tracked = await call(`/api/projects/${projectId}/animations/jobs/${encodeURIComponent(animationJobId)}`);
          if (stopped) return;
          if (["queued", "running"].includes(tracked.status)) {
            report("running", tracked.message ?? "正在制作动画。");
            timer = setTimeout(() => void check(), 1200);
            return;
          }
          if (["failed", "interrupted"].includes(tracked.status)) {
            report("failed", tracked.message ?? "动画制作中断，可以选择重试。");
            return;
          }
          if (tracked.status === "completed" && currentPreview.status === "ready" && currentPreview.bundle_url) {
            await call(currentPreview.bundle_url);
            if (stopped) return;
            report("ready", "动画已准备好，可以预览和调整。");
            return;
          }
          report("failed", tracked.message ?? "动画任务已结束，但预览不可用。检查后可以选择重试。");
          return;
        }
        if (currentJob && ["queued", "running"].includes(currentJob.status)) {
          report("running", currentJob.message ?? "正在制作动画。");
          timer = setTimeout(() => void check(), 1200);
          return;
        }
        if (currentPreview.status === "ready" && currentPreview.bundle_url) {
          await call(currentPreview.bundle_url);
          if (stopped) return;
          if (styleChangePending) {
            report("pending", "当前预览仍可使用。确认后会按新的美术偏好制作一个版本。");
          } else {
            report("ready", "动画已准备好，可以预览和调整。");
          }
          return;
        }
        if (currentJob && ["failed", "interrupted"].includes(currentJob.status)) {
          report("failed", currentJob.message ?? "动画制作中断，可以选择重试。");
          return;
        }
        if (currentJob?.status === "completed") {
          report("failed", "动画任务已结束，但预览不可用。检查后可以选择重试。");
          return;
        }
        if (continueToPreview) {
          if (!hasApiKey || !apiKey) {
            report("needs_key", "脚本已保存。重新连接 API Key 后即可继续制作动画。");
            return;
          }
          if (!attemptedAutoStart.current) {
            attemptedAutoStart.current = true;
            await startAnimation(false);
            if (!stopped) timer = setTimeout(() => void check(), 1200);
            return;
          }
        }
        report("pending", "脚本已保存，你可以预览脚本或继续制作动画。");
      } catch (error) {
        if (stopped) return;
        setStatusError(true);
        report("checking", (error as Error).message);
      }
    }

    void check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // The API key only enables continuation after reconnecting in this page session.
  }, [projectId, refresh, continueToPreview, hasApiKey, apiKey, artPreference, styleChangePending, animationJobId]);

  const canRetry = hasApiKey && Boolean(apiKey);
  return (
    <section
      aria-label="动画制作"
      className={`handoff-card handoff-${phase}`}
    >
      <p className="handoff-status" role="status">
        <span className="handoff-dot" aria-hidden="true" />
        {message}
      </p>
      <div className="progress-actions">
        {preview?.status === "ready" && preview.workbench_url ? (
          <>
          <a className="primary" href={preview.workbench_url}>
            进入工作台 →
          </a>
          {styleChangePending && (canRetry ? (
            <button
              className="secondary"
              onClick={() => {
                attemptedAutoStart.current = true;
                void startAnimation(true, true);
              }}
              disabled={busy}
            >
              制作新的美术版本 →
            </button>
          ) : (
            <button className="secondary" onClick={onOpenSettings}>
              连接 API Key 后制作新版本 →
            </button>
          ))}
          {phase === "failed" && !styleChangePending && (canRetry ? (
            <button
              className="secondary"
              onClick={() => void startAnimation(true, Boolean(animationJobId || artPreference))}
              disabled={busy}
            >
              重试动画制作 →
            </button>
          ) : (
            <button className="secondary" onClick={onOpenSettings}>
              重新连接 API Key →
            </button>
          ))}
          </>
        ) : statusError ? (
          <button
            className="secondary"
            onClick={() => setRefresh((value) => value + 1)}
          >
            重新检查状态
          </button>
        ) : busy || phase === "running" || phase === "checking" ? null :
          phase === "needs_key" ? (
            <button className="primary" onClick={onOpenSettings}>
              重新连接 API Key →
            </button>
          ) : styleChangePending && canRetry ? (
            <button
              className="primary"
              onClick={() => {
                attemptedAutoStart.current = true;
                void startAnimation(true, true);
              }}
              disabled={busy}
            >
              制作新的美术版本 →
            </button>
          ) : phase === "failed" && canRetry ? (
            <button
              className="primary"
              onClick={() => {
                attemptedAutoStart.current = true;
                void startAnimation(true, Boolean(animationJobId || artPreference));
              }}
              disabled={busy}
            >
              重试动画制作 →
            </button>
          ) : canRetry ? (
            <button
              className="primary"
              onClick={() => void startAnimation(true)}
              disabled={busy}
            >
              开始制作动画 →
            </button>
          ) : (
            <button className="primary" onClick={onOpenSettings}>
              连接 API Key 后制作动画 →
            </button>
          )}
      </div>
    </section>
  );
}
