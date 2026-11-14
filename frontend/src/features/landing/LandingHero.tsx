import { LivingFlowScene } from "./LivingFlowScene";
export function LandingHero({ onStart }: { onStart: () => void }) {
  const rawPose = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("flow-pose")
    : null;
  const pose = rawPose !== null && rawPose.trim() !== "" && Number.isFinite(Number(rawPose))
    ? Math.max(0, Math.min(1, Number(rawPose)))
    : undefined;
  return (
    <main className="landing">
      <div className="hero-copy">
        <p className="eyebrow">FROM AN IDEA TO A MOVING STORY</p>
        <h1>
          让知识，
          <br />
          <span className="highlight">动起来。</span>
        </h1>
        <p className="hero-subtitle">把好奇变成一支值得看完的动画。</p>
        <button className="primary hero-cta" onClick={onStart}>
          开始创作 <span>↗</span>
        </button>
        <p className="quiet">只要一个想法，剩下的交给我们。</p>
      </div>
      <LivingFlowScene pose={pose} />
      <footer className="landing-footer">
        <span>好奇心，是所有好故事的开始。</span>
        <span>
          知识探索 <i /> 脚本编排 <i /> 动画制作
        </span>
      </footer>
    </main>
  );
}
