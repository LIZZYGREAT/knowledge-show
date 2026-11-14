import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { initialDraft, toUserInput } from "./common/creation";
import { LandingHero } from "./features/landing/LandingHero";
import { CreationComposer } from "./features/creation/CreationComposer";
import { CreationConfirm } from "./features/creation/CreationConfirm";
import { ApiSettingsDrawer } from "./features/settings/ApiSettingsDrawer";
import { useEphemeralKey } from "./features/settings/EphemeralKeyContext";
import { GenerationStatus } from "./features/progress/GenerationStatus";
export default function App() {
  const [page, setPage] = useState<"landing" | "composing" | "demo">("landing");
  const [draft, setDraft] = useState(initialDraft);
  const [settings, setSettings] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [error, setError] = useState("");
  const connection = useEphemeralKey();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    content.current?.focus();
  }, [page]);
  function navigate(next: typeof page) {
    if (
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.startViewTransition(() => flushSync(() => setPage(next)));
    } else setPage(next);
  }
  function review() {
    try {
      toUserInput(draft);
      setError("");
      setConfirm(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function submit() {
    if (!connection.connected) {
      setConfirm(false);
      setResumeConfirm(true);
      setSettings(true);
      return;
    }
    setError("生成服务尚未接入，创作要求已保留。可以返回查看流程演示。");
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
          knowledge<span className="brand-dot">.</span>show
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
      <div id="main-content" ref={content} tabIndex={-1}>
        {page === "landing" ? (
          <LandingHero onStart={() => navigate("composing")} />
        ) : page === "composing" ? (
          <CreationComposer
            draft={draft}
            onChange={setDraft}
            onSubmit={review}
            onDemo={() => navigate("demo")}
            error={error}
          />
        ) : (
          <GenerationStatus
            topic={draft.topic}
            onBack={() => navigate("composing")}
          />
        )}
      </div>
      {confirm && (
        <CreationConfirm
          draft={draft}
          onClose={() => {
            setConfirm(false);
            setError("");
          }}
          onConfirm={submit}
          error={error}
        />
      )}
      {settings && <ApiSettingsDrawer onClose={closeSettings} />}
    </>
  );
}
