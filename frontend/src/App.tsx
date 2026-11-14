import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { createProject, startScriptJob, testModelConnection } from "./common/api";
import { initialDraft, toUserInput } from "./common/creation";
import { LandingHero } from "./features/landing/LandingHero";
import { CreationComposer } from "./features/creation/CreationComposer";
import { CreationConfirm } from "./features/creation/CreationConfirm";
import { ApiSettingsDrawer } from "./features/settings/ApiSettingsDrawer";
import { useEphemeralKey } from "./features/settings/EphemeralKeyContext";
import { GenerationStatus } from "./features/progress/GenerationStatus";
import { TaskProgress } from "./features/progress/TaskProgress";

type Page = "landing" | "composing" | "demo" | "working";
type TaskSession = { projectId: string; jobId: string; topic: string };
const TASK_SESSION_KEY = "knowledge-show:active-task";

function readTaskSession(): TaskSession | null {
  try {
    const raw = sessionStorage.getItem(TASK_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<TaskSession>;
    if (typeof value.projectId !== "string" || typeof value.topic !== "string")
      return null;
    return {
      projectId: value.projectId,
      jobId: typeof value.jobId === "string" ? value.jobId : "",
      topic: value.topic,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [taskSession, setTaskSession] = useState(readTaskSession);
  const [page, setPage] = useState<Page>(() =>
    taskSession?.jobId ? "working" : taskSession ? "composing" : "landing",
  );
  const [draft, setDraft] = useState(() => ({
    ...initialDraft,
    topic: taskSession?.topic ?? "",
  }));
  const [projectId, setProjectId] = useState(taskSession?.projectId ?? "");
  const [jobId, setJobId] = useState(taskSession?.jobId ?? "");
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const connection = useEphemeralKey();
  const content = useRef<HTMLDivElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const transition = useRef<ViewTransition | null>(null);

  useEffect(() => () => transition.current?.skipTransition(), []);
  useEffect(() => {
    window.scrollTo(0, 0);
    content.current?.focus();
  }, [page]);

  function navigate(next: Page) {
    if (next === page) return;
    transition.current?.skipTransition();
    if (
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const active = document.startViewTransition(() =>
        flushSync(() => {
          setTransitioning(true);
          setPage(next);
        }),
      );
      transition.current = active;
      void active.finished.finally(() => {
        if (transition.current === active) {
          transition.current = null;
          setTransitioning(false);
        }
      });
    } else {
      setTransitioning(false);
      setPage(next);
    }
  }

  function review() {
    try {
      toUserInput(draft);
      setError("");
      setConfirm(true);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  function persistTask(next: TaskSession) {
    setTaskSession(next);
    try {
      sessionStorage.setItem(TASK_SESSION_KEY, JSON.stringify(next));
    } catch {
      // The active task remains available in memory for this page session.
    }
  }

  function clearTask() {
    setTaskSession(null);
    setProjectId("");
    setJobId("");
    try {
      sessionStorage.removeItem(TASK_SESSION_KEY);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }

  async function submit() {
    if (!connection.connected || !connection.key) {
      setConfirm(false);
      setResumeConfirm(true);
      setSettings(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      let targetProjectId = projectId;
      if (!targetProjectId) {
        const created = await createProject(toUserInput(draft));
        targetProjectId = created.project_id;
        setProjectId(targetProjectId);
        persistTask({ projectId: targetProjectId, jobId: "", topic: draft.topic });
      }
      const started = await startScriptJob(targetProjectId, connection.key);
      const next = {
        projectId: targetProjectId,
        jobId: started.job_id,
        topic: draft.topic,
      };
      setProjectId(targetProjectId);
      setJobId(started.job_id);
      persistTask(next);
      setConfirm(false);
      setError("");
      navigate("working");
    } catch (cause) {
      setError((cause as Error).message || "暂时无法启动创作任务，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryCurrentTask() {
    if (!connection.connected || !connection.key) {
      setSettings(true);
      return;
    }
    if (!projectId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const started = await startScriptJob(projectId, connection.key);
      setJobId(started.job_id);
      persistTask({ projectId, jobId: started.job_id, topic: draft.topic });
    } catch (cause) {
      setError((cause as Error).message || "暂时无法重试任务，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  function closeSettings() {
    setSettings(false);
    if (resumeConfirm) {
      setConfirm(true);
      setResumeConfirm(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <button
          className="brand"
          aria-label="knowledge.show 首页"
          onClick={() => {
            navigate("landing");
            setError("");
          }}
        >
          <span className="brand-mark">
            k<span>·</span>
          </span>
          <span className="brand-wordmark">
            knowledge<span className="brand-dot">.</span>show
          </span>
        </button>
        <div className="header-right">
          <span
            className={`api-indicator ${connection.connected ? "connected" : ""}`}
            aria-label={connection.connected ? "API 已连接" : "API 未配置"}
          />
          <button
            className="settings-button"
            title="API 设置"
            onClick={() => setSettings(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <path d="m9 3-1 3-3 1-2 4 2 2 1 4 4 3 3-1 4-1 3-4-1-3-1-4-4-3z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            设置
          </button>
        </div>
      </header>
      <div
        id="main-content"
        ref={content}
        tabIndex={-1}
        data-transition={transitioning ? "entering" : "idle"}
      >
        {page === "landing" ? (
          <LandingHero onStart={() => navigate("composing")} />
        ) : page === "composing" ? (
          <CreationComposer
            draft={draft}
            onChange={(next) => {
              if (projectId && next.topic !== draft.topic) clearTask();
              setDraft(next);
            }}
            onSubmit={review}
            onDemo={() => navigate("demo")}
            error={error}
          />
        ) : page === "demo" ? (
          <GenerationStatus
            topic={draft.topic}
            onBack={() => navigate("composing")}
          />
        ) : jobId ? (
          <TaskProgress
            jobId={jobId}
            topic={draft.topic}
            hasApiKey={connection.connected && Boolean(connection.key)}
            onBack={() => {
              clearTask();
              navigate("composing");
            }}
            onRetry={() => void retryCurrentTask()}
            onOpenSettings={() => setSettings(true)}
          />
        ) : (
          <main className="generation">
            <p className="current-action">创作项目已建立，请配置连接后继续启动任务。</p>
            <button className="primary" onClick={() => setConfirm(true)}>
              继续创作 →
            </button>
          </main>
        )}
      </div>
      {confirm && (
        <CreationConfirm
          draft={draft}
          onClose={() => {
            setConfirm(false);
            setError("");
          }}
          onConfirm={() => void submit()}
          error={error}
          busy={submitting}
        />
      )}
      {settings && (
        <ApiSettingsDrawer
          onClose={closeSettings}
          testConnection={testModelConnection}
        />
      )}
    </>
  );
}
