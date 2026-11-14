export function KnowledgeScene({ small = false }: { small?: boolean }) {
  return (
    <div
      className={`knowledge-scene ${small ? "scene-small" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 600 540" fill="none">
        <defs>
          <path
            id="idea-orbit"
            d="M 145 305 C 30 160 250 65 390 172 C 550 295 375 482 235 375 C 130 290 265 175 365 251 C 455 327 350 392 295 325"
          />
        </defs>
        <circle className="scene-halo" cx="300" cy="270" r="184" />
        <circle className="orbit-ring" cx="300" cy="270" r="225" />
        <path className="scene-axis" d="M55 270H545M300 25V515" />
        <use href="#idea-orbit" className="idea-path" />
        <path
          className="branch-path"
          d="M235 375Q130 415 105 375M390 172Q430 80 490 95"
        />
        <circle cx="145" cy="305" r="6" className="node-green" />
        <circle cx="390" cy="172" r="8" className="node-light" />
        <circle cx="235" cy="375" r="7" className="node-green" />
        <circle cx="105" cy="375" r="4" className="node-gold" />
        <circle cx="490" cy="95" r="5" className="node-gold" />
        <circle r="12" className="moving-node">
          <animateMotion dur="14s" repeatCount="indefinite">
            <mpath href="#idea-orbit" />
          </animateMotion>
        </circle>
        <circle cx="295" cy="325" r="12" className="still-node" />
        <text x="355" y="456">
          a question. a connection. a discovery.
        </text>
        <text x="52" y="245" className="scene-coordinate">
          01 — THE SPARK
        </text>
      </svg>
      <span className="scene-caption">一个问题，生长为一次发现。</span>
    </div>
  );
}
export function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <main className="landing page-enter">
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
      <KnowledgeScene />
      <footer className="landing-footer">
        <span>好奇心，是所有好故事的开始。</span>
        <span>
          知识探索 <i /> 脚本编排 <i /> 动画制作
        </span>
      </footer>
    </main>
  );
}
