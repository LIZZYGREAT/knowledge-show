import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  createProject,
  getProject,
  startAnimationJob,
  startScriptJob,
  testModelConnection,
} from "./common/api";
import {
  fromUserInput,
  initialDraft,
  sameUserInput,
  sameUserInputExceptArtStyle,
  toUserInput,
} from "./common/creation";
import { LandingHero } from "./features/landing/LandingHero";
import { CreationComposer } from "./features/creation/CreationComposer";
import { CreationConfirm } from "./features/creation/CreationConfirm";
import { ApiSettingsDrawer } from "./features/settings/ApiSettingsDrawer";
import { useEphemeralKey } from "./features/settings/EphemeralKeyContext";
import { GenerationStatus } from "./features/progress/GenerationStatus";
import { TaskProgress } from "./features/progress/TaskProgress";

type Page = "landing" | "composing" | "demo" | "working";
type TaskSession = {
  projectId: string;
  jobId: string;
  topic: string;
  continueToPreview: boolean;
  artStyle?: string;
  styleChangePending?: boolean;
  animationJobId?: string;
};
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
      // Old sessions stop at the script instead of unexpectedly starting paid work.
      continueToPreview: value.continueToPreview === true,
      artStyle: typeof value.artStyle === "string" ? value.artStyle : undefined,
      styleChangePending: value.styleChangePending === true,
      animationJobId: typeof value.animationJobId === "string" ? value.animationJobId : undefined,
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
  const initialTaskSession = useRef(taskSession);
  const [restoringProject, setRestoringProject] = useState(Boolean(taskSession));
  const [resumeError, setResumeError] = useState("");
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

  useEffect(() => {
    const session = initialTaskSession.current;
    if (!session) return;
    let active = true;
    void getProject(session.projectId)
      .then((project) => {
        if (!active) return;
        const restored = fromUserInput(project.brief.user_input);
        if (typeof session.artStyle === "string") restored.art_style = session.artStyle;
        setDraft(restored);
        setProjectId(project.project_id);
        setTaskSession((current) => {
          if (!current || current.projectId !== project.project_id) return current;
          const next = { ...current, topic: restored.topic };
          try {
            sessionStorage.setItem(TASK_SESSION_KEY, JSON.stringify(next));
          } catch {
            // The active task remains available in memory for this page session.
          }
          return next;
        });
      })
      .catch(() => {
        if (!active || session.jobId) return;
        setResumeError(
          "无法读取原项目的完整创作要求。请放弃旧项目、重新填写偏好后再开始，避免使用不完整的需求。",
        );
      })
      .finally(() => {
        if (active) setRestoringProject(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    if (restoringProject || resumeError) return;
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

  async function submit(continueToPreview = true) {
    if (restoringProject || resumeError) return;
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
      const userInput = toUserInput(draft);
      const requestedArtStyle = typeof userInput.art_style === "string" ? userInput.art_style : "";
      let targetProjectId = projectId;
      if (targetProjectId) {
        const current = await getProject(targetProjectId);
        const savedArtStyle = (
          taskSession?.artStyle ??
          (typeof current.brief.user_input.art_style === "string" ? current.brief.user_input.art_style : "")
        ).trim();
        const artStyleChanged = requestedArtStyle !== savedArtStyle;
        if (sameUserInputExceptArtStyle(current.brief.user_input, userInput) && jobId) {
          const alreadyRequested = taskSession?.animationJobId && taskSession.artStyle?.trim() === requestedArtStyle;
          if (alreadyRequested || (!artStyleChanged && !(taskSession?.styleChangePending && continueToPreview))) {
            setConfirm(false);
            setError("");
            navigate("working");
            return;
          }
          if (continueToPreview) {
            const started = await startAnimationJob(targetProjectId, connection.key, requestedArtStyle);
            const next: TaskSession = {
              projectId: targetProjectId,
              jobId,
              topic: draft.topic,
              continueToPreview: true,
              artStyle: requestedArtStyle,
              styleChangePending: false,
              animationJobId: started.job_id,
            };
            persistTask(next);
            setJobId(jobId);
            setConfirm(false);
            setError("");
            navigate("working");
            return;
          }
          const next: TaskSession = {
            projectId: targetProjectId,
            jobId,
            topic: draft.topic,
            continueToPreview: false,
            artStyle: requestedArtStyle,
            styleChangePending: true,
          };
          persistTask(next);
          setJobId(jobId);
          setConfirm(false);
          setError("");
          navigate("working");
          return;
        }
        if (!sameUserInput(current.brief.user_input, userInput)) {
          targetProjectId = "";
        }
      }
      if (!targetProjectId) {
        const created = await createProject(userInput);
        targetProjectId = created.project_id;
        setProjectId(targetProjectId);
      }
      setJobId("");
      persistTask({ projectId: targetProjectId, jobId: "", topic: draft.topic, continueToPreview, artStyle: draft.art_style });
      const started = await startScriptJob(targetProjectId, connection.key);
      const next = {
        projectId: targetProjectId,
        jobId: started.job_id,
        topic: draft.topic,
        continueToPreview,
        artStyle: draft.art_style,
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
      persistTask({ ...taskSession, projectId, jobId: started.job_id, topic: draft.topic, continueToPreview: taskSession?.continueToPreview === true });
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

  function startFreshProject() {
    const topic = draft.topic || taskSession?.topic || "";
    clearTask();
    setDraft({ ...initialDraft, topic });
    setResumeError("");
    setError("");
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="site-header-inner">
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
              className={`header-status-pill ${connection.connected ? "is-connected" : ""}`}
            >
              <span
                className={`api-indicator ${connection.connected ? "connected" : ""}`}
                aria-label={connection.connected ? "API 已连接" : "API 未配置"}
              />
              <span>{connection.connected ? "模型已就绪" : "未连接模型"}</span>
            </span>
            <button
              className="settings-button"
              title="API 设置"
              onClick={() => setSettings(true)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
              设置
            </button>
          </div>
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
        ) : page === "composing" && restoringProject ? (
          <main className="generation" role="status">
            正在恢复原项目的创作要求…
          </main>
        ) : page === "composing" && resumeError ? (
          <main className="generation">
            <p className="current-action" role="alert">{resumeError}</p>
            <button className="primary" onClick={startFreshProject}>
              放弃旧项目并重新填写 →
            </button>
          </main>
        ) : page === "composing" ? (
          <CreationComposer
            draft={draft}
            onChange={setDraft}
            onSubmit={review}
            onDemo={() => navigate("demo")}
            onNewProject={projectId ? startFreshProject : undefined}
            error={error}
          />
        ) : page === "demo" ? (
          <GenerationStatus
            topic={draft.topic}
            onBack={() => navigate("composing")}
          />
        ) : jobId ? (
          <TaskProgress
            key={jobId}
            jobId={jobId}
            topic={draft.topic}
            hasApiKey={connection.connected && Boolean(connection.key)}
            apiKey={connection.key}
            continueToPreview={taskSession?.continueToPreview === true}
            onBack={() => {
              navigate("composing");
            }}
            artPreference={taskSession?.artStyle}
            styleChangePending={taskSession?.styleChangePending === true}
            animationJobId={taskSession?.animationJobId}
            onAnimationJobCreated={(animationJobId) => {
              if (!taskSession) return;
              persistTask({
                ...taskSession,
                animationJobId,
                styleChangePending: false,
                continueToPreview: true,
              });
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
          onConfirm={(continueToPreview) => void submit(continueToPreview)}
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
