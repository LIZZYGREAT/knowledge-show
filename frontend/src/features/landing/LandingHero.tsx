import { CuriosityStage } from "./CuriosityStage";
import { BrandLogo } from "../../components/BrandLogo";
import { TopicIcon, WorkflowStepIcon } from "../../components/StudioIcons";

const quickSparks = [
  ["birthday", "生日悖论", "为什么只要 23 个人，就很可能出现相同的生日？"],
  ["attention", "注意力机制", "AI 的注意力机制，是怎样理解一句话的？"],
  ["rainbow", "彩虹怎么来的", "白光穿过三棱镜后，为什么会散开成彩虹？"],
] as const;

const workflowSteps = [
  ["explore", "知识探索"],
  ["script", "脚本编排"],
  ["animate", "模板动画"],
  ["tune", "工作台微调"],
] as const;

export function LandingHero({
  onStart,
  onStartWithTopic,
  onOpenTemplates,
}: {
  onStart: () => void;
  onStartWithTopic?: (topic: string) => void;
  onOpenTemplates?: () => void;
}) {
  const rawPose = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("stage-pose")
    : null;
  const pose =
    rawPose !== null && rawPose.trim() !== "" && Number.isFinite(Number(rawPose))
      ? Math.max(0, Math.min(1, Number(rawPose)))
      : undefined;

  return (
    <main className="landing">
      <div className="hero-copy">
        <div className="hero-badge">
          <BrandLogo size={20} />
          <span className="eyebrow">KNOWLEDGE, SHOW ME · 清新知识动画工坊</span>
        </div>
        <h1>
          让知识，
          <br />
          <span className="highlight">动起来。</span>
        </h1>
        <p className="hero-subtitle">
          把一个好奇的问题，变成一支看得见对象变化与机制规律的知识动画——告别枯燥文字
          PPT，让直觉在画面中自然生长。
        </p>
        <div className="hero-cta-row">
          <button className="primary hero-cta" onClick={onStart}>
            开始创作 <span>↗</span>
          </button>
          {onOpenTemplates ? (
            <button
              type="button"
              className="secondary hero-sample-link"
              onClick={onOpenTemplates}
            >
              <span className="play-triangle" aria-hidden="true">
                ✦
              </span>
              浏览画风模板与 Demo
            </button>
          ) : (
            <a
              className="secondary hero-sample-link"
              href="/workbench.html?demo=wem"
            >
              <span className="play-triangle" aria-hidden="true">
                ▶
              </span>
              体验样片工作台
            </a>
          )}
        </div>
        {onStartWithTopic && (
          <div className="hero-sparks" aria-label="快捷灵感主题">
            <span className="hero-sparks-label">一键试问</span>
            <div className="hero-sparks-list">
              {quickSparks.map(([iconKey, label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  className="hero-spark-chip"
                  onClick={() => onStartWithTopic(prompt)}
                >
                  <TopicIcon topicKey={iconKey} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="quiet hero-note">
          只要一个想法，研究、脚本、模板动画与可视化微调交给我们。
        </p>
      </div>
      <CuriosityStage pose={pose} onTryTopic={onStartWithTopic} />
      <footer className="landing-footer">
        <span className="landing-footer-quote">好奇心，是所有好故事的开始。</span>
        <ol className="landing-workflow-strip" aria-label="创作流程">
          {workflowSteps.map(([step, label], idx) => (
            <li key={step} className="landing-workflow-item">
              <span className="landing-workflow-icon">
                <WorkflowStepIcon step={step} />
              </span>
              <span>{label}</span>
              {idx < workflowSteps.length - 1 && (
                <span className="landing-workflow-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </footer>
    </main>
  );
}
