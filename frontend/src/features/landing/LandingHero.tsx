import { CuriosityStage } from "./CuriosityStage";
export function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <main className="landing">
      <div className="hero-copy">
        <p className="eyebrow">FROM CURIOSITY TO MOTION</p>
        <h1>
          让知识，
          <br />
          <span className="highlight">动起来。</span>
        </h1>
        <p className="hero-subtitle">把一个好奇的问题，变成一支值得看完的知识动画。</p>
        <button className="primary hero-cta" onClick={onStart}>
          开始创作 <span>↗</span>
        </button>
        <p className="quiet">只要一个想法，剩下的交给我们。</p>
      </div>
      <CuriosityStage />
      <footer className="landing-footer">
        <span>好奇心，是所有好故事的开始。</span>
        <span>
          知识探索 <i /> 脚本编排 <i /> 动画制作
        </span>
      </footer>
    </main>
  );
}
