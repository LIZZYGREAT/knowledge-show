import { CuriosityStage } from "./CuriosityStage";

const quickSparks = [
  ["生日悖论", "为什么只要 23 个人，就很可能出现相同的生日？"],
  ["注意力机制", "AI 的注意力机制，是怎样理解一句话的？"],
  ["PN 结单向导电", "同一个 PN 结，为什么换个接法电流就截然不同？"],
] as const;

export function LandingHero({
  onStart,
  onStartWithTopic,
}: {
  onStart: () => void;
  onStartWithTopic?: (topic: string) => void;
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
          <span className="hero-badge-dot" aria-hidden="true" />
          <span className="eyebrow">KNOWLEDGE, SHOW ME · AI 知识动画工坊</span>
        </div>
        <h1>
          让知识，
          <br />
          <span className="highlight">动起来。</span>
        </h1>
        <p className="hero-subtitle">
          把一个好奇的问题，变成一支看得见机制与连续变化的知识动画——告别静态
          PPT 轮播，让直觉在画面里自然发生。
        </p>
        <div className="hero-cta-row">
          <button className="primary hero-cta" onClick={onStart}>
            开始创作 <span>↗</span>
          </button>
          <a
            className="secondary hero-sample-link"
            href="/workbench.html?demo=pn"
          >
            <span className="play-triangle" aria-hidden="true">
              ▶
            </span>
            体验样片工作台
          </a>
        </div>
        {onStartWithTopic && (
          <div className="hero-sparks" aria-label="快捷灵感主题">
            <span className="hero-sparks-label">一键试问</span>
            <div className="hero-sparks-list">
              {quickSparks.map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  className="hero-spark-chip"
                  onClick={() => onStartWithTopic(prompt)}
                >
                  <span className="spark-dot" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="quiet hero-note">
          只要一个想法，研究、脚本、动画与可视化微调交给我们。
        </p>
      </div>
      <CuriosityStage pose={pose} />
      <footer className="landing-footer">
        <span>好奇心，是所有好故事的开始。</span>
        <span>
          知识探索 <i /> 脚本编排 <i /> 机制动画 <i /> 可视化微调
        </span>
      </footer>
    </main>
  );
}
