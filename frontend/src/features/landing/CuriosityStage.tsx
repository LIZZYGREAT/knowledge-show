import { useId, useRef } from "react";
import { BrandLogo } from "../../components/BrandLogo";
import "./curiosity-stage.css";
import { useFlowMotion } from "./useFlowMotion";
import {
  SHOWREEL_ACTS,
  SHOWREEL_DURATION,
  STATIC_SHOWREEL_TIME,
  SPECTRAL_BANDS,
  actOpacities,
  activeActAt,
  easeOutBack,
  easeOutCubic,
  lerp,
  logoOvertureState,
  sharedBeadState,
  showreelCycle,
  smoothstep,
  spectralWavePath,
} from "./showreelMotion";

const DIE_PIPS: Record<number, readonly [number, number][]> = {
  3: [
    [-20, -20],
    [0, 0],
    [20, 20],
  ],
  4: [
    [-20, -20],
    [20, -20],
    [-20, 20],
    [20, 20],
  ],
};

function DaylightDie({
  x,
  y,
  value,
  mint = false,
  enter,
  tilt,
}: {
  x: number;
  y: number;
  value: 3 | 4;
  mint?: boolean;
  enter: number;
  tilt: number;
}) {
  const bounce = easeOutBack(enter);
  const dropY = lerp(-42, 0, bounce);
  const scale = lerp(0.74, 1, bounce);
  const rot = lerp(tilt * 2.4, tilt, easeOutCubic(enter));
  return (
    <g
      className="stage-die"
      transform={`translate(${x} ${y + dropY}) rotate(${rot}) scale(${scale})`}
      opacity={smoothstep(enter, 0, 0.35)}
    >
      <ellipse
        cy="54"
        rx="42"
        ry="9"
        fill="#13423b"
        opacity={0.09 * bounce}
      />
      <rect
        x="-42"
        y="-42"
        width="84"
        height="84"
        rx="20"
        fill={mint ? "#e5f8f2" : "#fffcf6"}
        stroke={mint ? "#4fb7a2" : "#dfd3bc"}
        strokeWidth="2"
      />
      <rect
        x="-36"
        y="-36"
        width="72"
        height="72"
        rx="15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.85"
      />
      {DIE_PIPS[value].map(([px, py], i) => (
        <circle
          key={i}
          cx={px}
          cy={py}
          r="6.2"
          fill={mint ? "#0f8c74" : "#d96c4a"}
        />
      ))}
    </g>
  );
}

export function CuriosityStage({
  pose,
  onTryTopic,
}: {
  pose?: number;
  onTryTopic?: (prompt: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const motion = useFlowMotion(ref, pose === undefined, STATIC_SHOWREEL_TIME);
  const time = pose === undefined ? motion.time : pose * SHOWREEL_DURATION;
  const cycle = showreelCycle(time);
  const act = activeActAt(cycle);
  const opacity = actOpacities(cycle);
  const logo = logoOvertureState(cycle);
  const id = useId().replace(/:/g, "");

  // Act 1 sub-timings (6.4..16.0)
  const dieEnterA = smoothstep(cycle, 6.1, 7.2);
  const dieEnterB = smoothstep(cycle, 6.3, 7.4);
  const histReveal = smoothstep(cycle, 10.6, 11.9);
  const gridOpacity =
    smoothstep(cycle, 6.7, 7.6) * (1 - smoothstep(cycle, 10.2, 11.2));

  // Act 2 sub-timings (16.0..25.4)
  const prismReveal = smoothstep(cycle, 15.7, 17.1);
  const beamReveal = smoothstep(cycle, 16.1, 17.4);
  const spectrumReveal = smoothstep(cycle, 17.0, 18.6);

  // Act 3 sub-timings (25.4..34.4)
  const pnLocal = Math.max(0, cycle - 25.4);
  const reverse = smoothstep(pnLocal, 4.2, 5.3);
  const currentLevel = smoothstep(pnLocal, 0.3, 1.5) * (1 - reverse * 0.94);
  const barrierWidth = lerp(34, 124, reverse);
  const needleAngle = lerp(-62, 62, currentLevel);
  const wireDashOffset = -pnLocal * 38;

  // Optical sheen position & subtle 3-plane unfold separation during exit
  const sheenX = lerp(-40, 145, logo.sheenProgress);
  const exitSpread = lerp(0, 16, logo.emblemExit);

  return (
    <figure
      ref={ref}
      className="curiosity-stage"
      data-time={time.toFixed(3)}
      data-paused={pose !== undefined || motion.paused}
      data-pose={(cycle / SHOWREEL_DURATION).toFixed(3)}
      data-act={act.id}
      aria-label="Knowledge.Show(me) 折光棱镜品牌序幕与知识机制动态演示：从三面折光玻璃棱镜与字标丝滑构图展开，无缝衔接骰子概率钟形分布、白光三棱镜色散波动，以及 PN 结正反向单向导电机制。"
    >
      <div className="curiosity-viewport">
        <div className="curiosity-chrome">
          <span className="curiosity-live-pill" aria-hidden="true">
            <BrandLogo size={16} />
            <span>LIVE</span>
          </span>
          <div className="curiosity-chapters" role="group" aria-label="切换知识演示章节">
            {SHOWREEL_ACTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`curiosity-chapter-btn ${act.id === item.id ? "is-active" : ""}`}
                disabled={pose !== undefined}
                onClick={() => motion.seek(item.seekTo)}
              >
                <em>{item.index}</em>
                <span>{item.label}</span>
              </button>
            ))}
            {pose === undefined && (
              <button
                type="button"
                className="curiosity-pause-btn"
                aria-label={motion.userPaused ? "继续播放演示" : "暂停演示"}
                title={motion.userPaused ? "继续播放" : "暂停"}
                onClick={motion.togglePause}
              >
                {motion.userPaused ? "▶" : "❚❚"}
              </button>
            )}
          </div>
        </div>

        <div className="curiosity-theatre">
          <svg
            className="curiosity-artwork"
            viewBox="0 0 800 560"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <radialGradient id={`${id}-sunwash`} cx="50%" cy="46%" r="58%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="68%" stopColor="#f4faf7" />
                <stop offset="100%" stopColor="#ebf4f1" />
              </radialGradient>
              {/* Soft gallery daylight iridescent caustic aura behind the Origami Prism-K */}
              <radialGradient id={`${id}-caustic-mint`} cx="42%" cy="42%" r="54%">
                <stop offset="0%" stopColor="#32e8c2" stopOpacity=".28" />
                <stop offset="52%" stopColor="#4f83f2" stopOpacity=".14" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${id}-caustic-gold`} cx="60%" cy="54%" r="48%">
                <stop offset="0%" stopColor="#ffaa70" stopOpacity=".28" />
                <stop offset="56%" stopColor="#f5c96e" stopOpacity=".12" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${id}-floor-caustic`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#35d4b6" stopOpacity=".22" />
                <stop offset="48%" stopColor="#587af2" stopOpacity=".14" />
                <stop offset="78%" stopColor="#f5b35d" stopOpacity=".12" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              {/* Luminous Prismatic Origami-K jewel-glass gradients */}
              <linearGradient id={`${id}-k-spine`} x1="20" y1="15" x2="36" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0f3c42" />
                <stop offset="55%" stopColor="#146368" />
                <stop offset="100%" stopColor="#1b8480" />
              </linearGradient>
              <linearGradient id={`${id}-k-upper`} x1="36" y1="14" x2="88" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#35ecc6" />
                <stop offset="52%" stopColor="#10b8a0" />
                <stop offset="100%" stopColor="#1e8ae0" />
              </linearGradient>
              <linearGradient id={`${id}-k-lower`} x1="36" y1="50" x2="88" y2="84" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#269be8" />
                <stop offset="55%" stopColor="#4f6ef2" />
                <stop offset="100%" stopColor="#7b5ae6" />
              </linearGradient>
              <linearGradient id={`${id}-k-core`} x1="37" y1="32" x2="84" y2="66" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" stopOpacity=".88" />
                <stop offset="44%" stopColor="#ffd28a" stopOpacity=".72" />
                <stop offset="76%" stopColor="#ff9a7b" stopOpacity=".42" />
                <stop offset="100%" stopColor="#92f7e5" stopOpacity=".28" />
              </linearGradient>
              <linearGradient id={`${id}-word-show`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0eb398" />
                <stop offset="56%" stopColor="#2a83e8" />
                <stop offset="100%" stopColor="#6d5ce6" />
              </linearGradient>
              <linearGradient id={`${id}-logo-rule`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#12b89e" stopOpacity="0" />
                <stop offset="28%" stopColor="#12b89e" stopOpacity=".4" />
                <stop offset="50%" stopColor="#eb9a38" stopOpacity=".85" />
                <stop offset="72%" stopColor="#6d5ce6" stopOpacity=".4" />
                <stop offset="100%" stopColor="#6d5ce6" stopOpacity="0" />
              </linearGradient>
              {/* Exact clip silhouette of the two origami glass wings for silky diagonal sheen */}
              <clipPath id={`${id}-wings-clip`}>
                <path d="M36.8 47.4 L50.8 17.8 C52.6 14 57.6 13.1 60.8 16 L86.6 43 C89.3 45.8 87.3 49.4 83.2 49.4 L38.6 49.4 C37 49.4 36.2 48.7 36.8 47.4 Z M36.8 52.6 L50.8 82.2 C52.6 86 57.6 86.9 60.8 84 L86.6 57 C89.3 54.2 87.3 50.6 83.2 50.6 L38.6 50.6 C37 50.6 36.2 51.3 36.8 52.6 Z" />
              </clipPath>
              {/* Baseline curtain clip mask for Apple/Pentagram editorial wordmark reveal */}
              <clipPath id={`${id}-word-curtain`}>
                <rect x="80" y="308" width="640" height="72" />
              </clipPath>
              <linearGradient id={`${id}-prism`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity=".95" />
                <stop offset="48%" stopColor="#d9f4ef" stopOpacity=".74" />
                <stop offset="100%" stopColor="#cfe7fa" stopOpacity=".86" />
              </linearGradient>
              <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f5b95b" stopOpacity=".12" />
                <stop offset="50%" stopColor="#f3a940" stopOpacity=".78" />
                <stop offset="100%" stopColor="#fff3d2" stopOpacity=".95" />
              </linearGradient>
              <linearGradient id={`${id}-pn-glass`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff2ee" />
                <stop offset="46%" stopColor="#ffffff" />
                <stop offset="54%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ecf6fe" />
              </linearGradient>
              <linearGradient id={`${id}-pn-frame`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d5e5e0" />
                <stop offset="100%" stopColor="#a7c4bc" />
              </linearGradient>
              <linearGradient id={`${id}-barrier`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbe3b4" stopOpacity=".24" />
                <stop offset="50%" stopColor="#efb65a" stopOpacity=".42" />
                <stop offset="100%" stopColor="#fbe3b4" stopOpacity=".24" />
              </linearGradient>
              <radialGradient id={`${id}-electron`} cx="34%" cy="30%" r="72%">
                <stop offset="0%" stopColor="#8ed4ff" />
                <stop offset="55%" stopColor="#2f8ce6" />
                <stop offset="100%" stopColor="#1b65b8" />
              </radialGradient>
              <radialGradient id={`${id}-dial-face`} cx="50%" cy="35%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f2f7f5" />
              </radialGradient>
            </defs>

            <rect width="800" height="560" fill={`url(#${id}-sunwash)`} />

            {/* Subtle architectural reference guide circles */}
            <circle cx="400" cy="300" r="218" fill="none" stroke="#0f967d" strokeOpacity=".055" strokeDasharray="3 8" />
            <circle cx="400" cy="300" r="142" fill="none" stroke="#e08d30" strokeOpacity=".06" strokeDasharray="2 7" />

            {/* Shared C1-continuous caustic halo across Act 3 end (34.45..36) <-> Act 00 (0..6.15) */}
            {logo.auraOpacity > 0.005 && (
              <g opacity={logo.auraOpacity}>
                <ellipse cx="386" cy="204" rx="188" ry="132" fill={`url(#${id}-caustic-mint)`} />
                <ellipse cx="428" cy="212" rx="154" ry="110" fill={`url(#${id}-caustic-gold)`} />
              </g>
            )}

            {/* ── ACT 00: LUXURY ORIGAMI PRISM-K & Knowledge.Show(me) OVERTURE ── */}
            {logo.opacity > 0.005 && (
              <g className="stage-logo-overture" opacity={logo.opacity}>
                {/* Whisper-thin Apple-style 45° architectural construction hairlines (fade out cleanly once built) */}
                {logo.guideOpacity > 0.01 && (
                  <g
                    transform="translate(400 204)"
                    opacity={logo.guideOpacity}
                    stroke="#0f967d"
                    strokeWidth="0.75"
                    fill="none"
                  >
                    <line
                      x1="-120"
                      y1="0"
                      x2="120"
                      y2="0"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={1 - logo.guideDraw}
                    />
                    <line
                      x1="-44"
                      y1="-96"
                      x2="-44"
                      y2="96"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={1 - logo.guideDraw}
                    />
                    <path
                      d="M-24,0 L4,-68 L74,0 L4,68 Z"
                      stroke="#d99438"
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={1 - logo.guideDraw}
                    />
                  </g>
                )}

                {/* Delicate drifting starlight dust motes around the luminous crystal */}
                <g opacity={logo.coreIn * logo.wordmarkOpacity}>
                  {[
                    [270, 152, 5.2, "#19c9ab", 0.0],
                    [536, 146, 6.0, "#6d5ce6", 1.2],
                    [558, 244, 4.4, "#f09c38", 2.3],
                    [246, 256, 4.2, "#38a3f1", 3.4],
                    [494, 114, 3.6, "#f09c38", 4.1],
                    [308, 118, 3.8, "#19c9ab", 5.0],
                  ].map(([sx, sy, sr, scolor, phase], idx) => {
                    const dy = Math.sin(cycle * 2.1 + Number(phase)) * 5;
                    const s = Number(sr);
                    return (
                      <g key={idx} transform={`translate(${sx} ${(Number(sy) + dy).toFixed(1)})`}>
                        <path
                          d={`M0,${-s} Q0,0 ${s},0 Q0,0 0,${s} Q0,0 ${-s},0 Q0,0 0,${-s} Z`}
                          fill={String(scolor)}
                          opacity="0.72"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Sculpted Hero Luminous Prismatic Origami-K (100x100 grid scaled 1.85x, centered at 400, 204) */}
                <g
                  transform={`translate(400 ${(204 + logo.floatY).toFixed(2)}) scale(${(1.85 * logo.emblemScale).toFixed(3)}) translate(-54 -50)`}
                  opacity={logo.emblemOpacity}
                >
                  {/* Luminous iridescent caustic floor reflection (replaces dull gray shadow!) */}
                  <ellipse
                    cx="55"
                    cy="94"
                    rx="42"
                    ry="7.5"
                    fill={`url(#${id}-floor-caustic)`}
                    opacity={logo.lowerWingIn}
                  />

                  {/* Plane 1: Slender Crystal K-Pillar */}
                  <g
                    transform={`translate(${(-exitSpread * 0.7).toFixed(2)} ${lerp(18, 0, logo.spineIn).toFixed(2)})`}
                    opacity={logo.spineIn}
                  >
                    <path
                      d="M21 23.5 C21 19.2 24.4 16 28.8 16 C31.6 16 33.4 18 33.4 20.8 L33.4 79.2 C33.4 82 31.6 84 28.8 84 C24.4 84 21 80.8 21 76.5 Z"
                      fill={`url(#${id}-k-spine)`}
                    />
                    <path
                      d="M24.8 22.5 L24.8 77.5"
                      stroke="#7efae3"
                      strokeOpacity="0.46"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Plane 2: Upper Luminous Aurora-Emerald Glass Wing */}
                  <g
                    transform={`translate(${(lerp(-14, 0, logo.upperWingIn) + exitSpread * 0.45).toFixed(2)} ${(lerp(12, 0, logo.upperWingIn) - exitSpread * 0.55).toFixed(2)})`}
                    opacity={logo.upperWingIn}
                  >
                    <path
                      d="M36.8 47.4 L50.8 17.8 C52.6 14 57.6 13.1 60.8 16 L86.6 43 C89.3 45.8 87.3 49.4 83.2 49.4 L38.6 49.4 C37 49.4 36.2 48.7 36.8 47.4 Z"
                      fill={`url(#${id}-k-upper)`}
                    />
                    <path
                      d="M53.5 18.2 L83.5 46.2"
                      stroke="#ffffff"
                      strokeOpacity="0.62"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Plane 3: Lower Luminous Cerulean-Violet Glass Wing */}
                  <g
                    transform={`translate(${(lerp(-14, 0, logo.lowerWingIn) + exitSpread * 0.45).toFixed(2)} ${(lerp(-12, 0, logo.lowerWingIn) + exitSpread * 0.55).toFixed(2)})`}
                    opacity={logo.lowerWingIn}
                  >
                    <path
                      d="M36.8 52.6 L50.8 82.2 C52.6 86 57.6 86.9 60.8 84 L86.6 57 C89.3 54.2 87.3 50.6 83.2 50.6 L38.6 50.6 C37 50.6 36.2 51.3 36.8 52.6 Z"
                      fill={`url(#${id}-k-lower)`}
                    />
                    <path
                      d="M53.5 81.8 L83.5 53.8"
                      stroke="#d0c8ff"
                      strokeOpacity="0.48"
                      strokeWidth="1.15"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Overlapping Sunburst-Gold Optical Glass Heart + Horizon Ridge */}
                  <g opacity={logo.coreIn * (1 - logo.emblemExit)}>
                    <path
                      d="M37.8 50 L59.5 31 L85.5 50 L59.5 69 Z"
                      fill={`url(#${id}-k-core)`}
                    />
                    <path
                      d="M39 50 L84.5 50"
                      stroke="#ffffff"
                      strokeOpacity="0.92"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    {/* Curved 4-point Starlight Aperture at refractive heart */}
                    <g
                      transform={`translate(59.5 50) rotate(${logo.starTwist.toFixed(1)}) scale(${lerp(0.25, 1, logo.coreIn).toFixed(3)})`}
                    >
                      <path
                        d="M0,-11 Q0,0 11,0 Q0,0 0,11 Q0,0 -11,0 Q0,0 0,-11 Z"
                        fill="#ffffff"
                      />
                      <circle r="2.1" fill="#f09c38" />
                    </g>
                  </g>

                  {/* Silky diagonal glass specular sheen sweeping across the two wings during hold */}
                  {logo.sheenProgress > 0.01 && logo.sheenProgress < 0.99 && (
                    <g clipPath={`url(#${id}-wings-clip)`}>
                      <polygon
                        points={`${sheenX - 18},8 ${sheenX + 4},8 ${sheenX - 20},92 ${sheenX - 42},92`}
                        fill="#ffffff"
                        opacity=".5"
                      />
                    </g>
                  )}
                </g>

                {/* Masked Baseline Curtain Editorial Lockup: Knowledge . Show(me) */}
                <g opacity={logo.wordmarkOpacity}>
                  <g clipPath={`url(#${id}-word-curtain)`}>
                    <g transform={`translate(0 ${logo.wordmarkExitY.toFixed(1)})`}>
                      {/* "Knowledge" rising seamlessly out of baseline curtain */}
                      <text
                        x="384"
                        y={lerp(408, 364, logo.knowledgeIn)}
                        textAnchor="end"
                        className="logo-word-knowledge"
                        opacity={logo.knowledgeIn}
                      >
                        Knowledge
                      </text>

                      {/* "Show(me)" with native SVG <tspan> kerning (zero overlap on any OS!) */}
                      <text
                        x="412"
                        y={lerp(408, 364, logo.showIn)}
                        textAnchor="start"
                        opacity={logo.showIn}
                      >
                        <tspan className="logo-word-show" fill={`url(#${id}-word-show)`}>
                          Show
                        </tspan>
                        <tspan className="logo-word-paren" dx="5" fillOpacity={logo.meIn}>
                          (
                        </tspan>
                        <tspan className="logo-word-me" dx="1" fillOpacity={logo.meIn}>
                          me
                        </tspan>
                        <tspan className="logo-word-paren" dx="1" fillOpacity={logo.meIn}>
                          )
                        </tspan>
                      </text>

                      {/* Sculpted Champagne-Gold "." Diamond Jewel on exact baseline (vanishes cleanly before Act 1!) */}
                      {logo.dotOpacity > 0.01 && (
                        <g
                          transform={`translate(398 356) rotate(${(45 + logo.dotRotation).toFixed(1)}) scale(${logo.dotScale.toFixed(3)})`}
                          opacity={logo.dotOpacity}
                        >
                          <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.8" fill="#e5942d" />
                          <rect x="-1.8" y="-1.8" width="3.6" height="3.6" rx="0.8" fill="#fff7e2" />
                        </g>
                      )}
                    </g>
                  </g>

                  {/* Delicate editorial rule & manifesto */}
                  <g
                    transform={`translate(0 ${(logo.wordmarkExitY * 0.6).toFixed(1)})`}
                    opacity={logo.taglineIn}
                  >
                    <line
                      x1="268"
                      y1="396"
                      x2="532"
                      y2="396"
                      stroke={`url(#${id}-logo-rule)`}
                      strokeWidth="1.2"
                    />
                    <text
                      x="400"
                      y={lerp(432, 424, logo.taglineIn)}
                      textAnchor="middle"
                      className="logo-tagline"
                    >
                      让 抽 象 知 识 ， 成 为 看 得 见 的 直 觉
                    </text>
                  </g>
                </g>
              </g>
            )}

            {/* Shared C1-continuous 4-point Starlight Seed across loop seam (34.65..36.0 -> 0.0..1.85) */}
            {logo.seamStarOpacity > 0.005 && (
              <g
                transform={`translate(${logo.seamStarX.toFixed(1)} 204) scale(${logo.seamStarScale.toFixed(3)})`}
                opacity={logo.seamStarOpacity}
              >
                <circle r="30" fill={`url(#${id}-caustic-gold)`} opacity=".6" />
                <path
                  d="M0,-21 Q0,0 21,0 Q0,0 0,21 Q0,0 -21,0 Q0,0 0,-21 Z"
                  fill="#ffffff"
                  stroke="#f0a43b"
                  strokeOpacity=".35"
                  strokeWidth="1"
                />
                <circle r="4" fill="#f09c38" />
                <circle cx="-1" cy="-1" r="1.4" fill="#fffaf0" />
              </g>
            )}

            {/* ── ACT 01: BALANCED DICE PROBABILITY & GAUSSIAN ENVELOPE ─── */}
            <g opacity={opacity.dice}>
              <text x="400" y="72" textAnchor="middle" className="stage-question">
                {SHOWREEL_ACTS[1].question}
              </text>

              <DaylightDie x={156} y={222} value={3} enter={dieEnterA} tilt={-8} />
              <DaylightDie x={262} y={248} value={4} mint enter={dieEnterB} tilt={7} />

              <g opacity={smoothstep(cycle, 7.0, 7.7) * (1 - smoothstep(cycle, 14.6, 15.2))}>
                <rect x="134" y="318" width="148" height="36" rx="18" fill="#ffffff" stroke="#d5e5df" />
                <text x="208" y="342" textAnchor="middle" className="stage-equation">
                  3 + 4 = 7
                </text>
              </g>

              {/* 6 winning sum-7 combinations card filling lower-left balance cleanly */}
              <g opacity={histReveal}>
                <rect x="82" y="378" width="252" height="106" rx="18" fill="#ffffff" fillOpacity=".86" stroke="#d9e8e3" strokeWidth="1.2" />
                <text x="208" y="402" textAnchor="middle" className="stage-micro" fill="#b96d14">
                  和为 7 的 6 种等可能组合
                </text>
                {["1 + 6", "2 + 5", "3 + 4", "4 + 3", "5 + 2", "6 + 1"].map((pair, idx) => {
                  const col = idx % 3;
                  const row = Math.floor(idx / 3);
                  const px = 104 + col * 74;
                  const py = 416 + row * 30;
                  const active = idx === 2;
                  return (
                    <g key={pair} transform={`translate(${px} ${py})`}>
                      <rect
                        width="62"
                        height="22"
                        rx="11"
                        fill={active ? "#fef0d4" : "#f4faf7"}
                        stroke={active ? "#e59a38" : "#d3e4de"}
                        strokeWidth={active ? "1.3" : "1"}
                      />
                      <text
                        x="31"
                        y="15"
                        textAnchor="middle"
                        fontSize="11.5"
                        fontWeight={active ? "700" : "500"}
                        fill={active ? "#b96d14" : "#3a5c57"}
                      >
                        {pair}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* 6x6 matrix lattice guides (centered vertically) */}
              <g opacity={gridOpacity}>
                {[1, 2, 3, 4, 5, 6].map((n, i) => (
                  <g key={n} className="stage-axis">
                    <text x={432 + i * 44} y="148" textAnchor="middle">{n}</text>
                    <text x="392" y={183 + i * 38} textAnchor="middle">{n}</text>
                  </g>
                ))}
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6);
                  const c = i % 6;
                  const win = r + c + 2 === 7;
                  return (
                    <circle
                      key={i}
                      cx={432 + c * 44}
                      cy={178 + r * 38}
                      r="12"
                      fill={win ? "#fef2dd" : "none"}
                      stroke={win ? "#e59a38" : "#c7dad3"}
                      strokeWidth={win ? "1.4" : "1"}
                    />
                  );
                })}
              </g>

              {/* Elevated, balanced bell-curve histogram + probability grid + Gaussian envelope */}
              <g opacity={histReveal}>
                {/* Subtle horizontal probability reference guides */}
                {[
                  { y: 274, label: "6/36 · 16.7%" },
                  { y: 356, label: "3/36" },
                  { y: 412, label: "1/36" },
                ].map((guide) => (
                  <g key={guide.label}>
                    <line
                      x1="376"
                      y1={guide.y}
                      x2="736"
                      y2={guide.y}
                      stroke="#cfe2dc"
                      strokeWidth="1"
                      strokeDasharray="3 5"
                    />
                    <text x="372" y={guide.y + 4} textAnchor="end" fontSize="10.5" fill="#7d9a95">
                      {guide.label}
                    </text>
                  </g>
                ))}
                <line x1="376" y1="460" x2="736" y2="460" stroke="#b5ccc5" strokeWidth="1.5" />
                {Array.from({ length: 11 }, (_, i) => {
                  const sum = i + 2;
                  const count = 6 - Math.abs(sum - 7);
                  const barH = count * 27 + 16;
                  return (
                    <g key={sum}>
                      <rect
                        x={381 + i * 32}
                        y={460 - barH * histReveal}
                        width="26"
                        height={barH * histReveal}
                        rx="13"
                        fill={sum === 7 ? "#fef0d4" : "#eaf6f2"}
                        stroke={sum === 7 ? "#e59a38" : "#cbe2da"}
                        strokeWidth={sum === 7 ? "1.5" : "1"}
                      />
                      <text
                        x={394 + i * 32}
                        y="482"
                        textAnchor="middle"
                        className={sum === 7 ? "stage-axis stage-gold" : "stage-axis"}
                      >
                        {sum}
                      </text>
                    </g>
                  );
                })}
                {/* Smooth Gaussian bell-curve envelope gliding above the 11 columns */}
                <path
                  d="M394,412 C448,380 500,264 554,264 C608,264 660,380 714,412"
                  fill="none"
                  stroke="#e59a38"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="1"
                  pathLength="1"
                  strokeDashoffset={1 - histReveal}
                  opacity="0.72"
                />
                {/* Crisp peak badge positioned cleanly at y = 216 */}
                <g transform={`translate(554 ${lerp(244, 218, histReveal)})`}>
                  <rect x="-56" y="-16" width="112" height="30" rx="15" fill="#e69238" />
                  <text y="3.5" textAnchor="middle" className="stage-pill-text">
                    7 · 峰值 6/36
                  </text>
                </g>
              </g>
            </g>

            {/* ── ACT 02: PRISM REFRACTION (ECHOING BRAND LOGO PRISM) ──── */}
            <g opacity={opacity.prism}>
              <text x="400" y="76" textAnchor="middle" className="stage-question">
                {SHOWREEL_ACTS[2].question}
              </text>

              {/* Incoming sunlight beam */}
              <path
                d="M72,350 L360,312"
                stroke={`url(#${id}-beam)`}
                strokeWidth="13"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - beamReveal}
              />
              <path
                d="M72,350 L360,312"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - beamReveal}
              />
              <text x="164" y="312" textAnchor="middle" className="stage-small" opacity={beamReveal}>
                混合白光
              </text>

              {/* Internal refracted fan inside glass */}
              <polygon
                points="356,312 438,292 454,340"
                fill="#fff6df"
                opacity={0.78 * spectrumReveal}
              />

              {/* 5 continuous undulating spectral waves */}
              {SPECTRAL_BANDS.map((band, index) => (
                <g key={band.color} opacity={spectrumReveal}>
                  <path
                    d={spectralWavePath(index, cycle, spectrumReveal)}
                    fill="none"
                    stroke={band.color}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    opacity="0.22"
                  />
                  <path
                    d={spectralWavePath(index, cycle, spectrumReveal)}
                    fill="none"
                    stroke={band.color}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  {(index === 0 || index === 4) && (
                    <text
                      x="726"
                      y={band.yEnd + 5}
                      className="stage-micro"
                      fill={band.color}
                    >
                      {band.label}
                    </text>
                  )}
                </g>
              ))}

              {/* Frosted crystal prism */}
              <g
                transform={`translate(400 ${lerp(340, 314, easeOutBack(prismReveal))}) scale(${lerp(0.86, 1, easeOutCubic(prismReveal))})`}
              >
                <ellipse cy="112" rx="96" ry="13" fill="#0f7c6b" opacity=".09" />
                <polygon
                  points="0,-116 -104,92 104,92"
                  fill={`url(#${id}-prism)`}
                  stroke="#3db4a0"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <polygon
                  points="0,-108 -96,86 0,14"
                  fill="#ffffff"
                  opacity=".38"
                />
                <path
                  d="M-6,-94 L-84,78 M2,-96 L78,78"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeOpacity=".88"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* ── ACT 03: HIGH-CRAFT PN JUNCTION APPARATUS ──────────────── */}
            <g opacity={opacity.pn}>
              <text x="400" y="76" textAnchor="middle" className="stage-question">
                {reverse > 0.5 ? "反向接通：耗尽层加宽，电流截止" : SHOWREEL_ACTS[3].question}
              </text>

              {/* Floating P / N region badges cleanly ABOVE the chamber (zero overlap!) */}
              <g>
                <rect x="140" y="156" width="128" height="30" rx="15" fill="#fff2ee" stroke="#f0b7ac" strokeWidth="1.2" />
                <text x="204" y="176" textAnchor="middle" className="stage-micro" fill="#c74b3b">
                  P 区 · 空穴 (+)
                </text>
                <rect x="384" y="156" width="128" height="30" rx="15" fill="#ebf5fe" stroke="#a8cff5" strokeWidth="1.2" />
                <text x="448" y="176" textAnchor="middle" className="stage-micro" fill="#216db8">
                  N 区 · 电子 (−)
                </text>
              </g>

              {/* Lead wires + live current-flow pulse dashes */}
              <path
                d="M54,286 H116 M536,286 H600"
                stroke="#9fbcb4"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {currentLevel > 0.25 && (
                <path
                  d="M54,286 H116 M536,286 H600"
                  stroke="#12a68a"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="6 14"
                  strokeDashoffset={wireDashOffset}
                  opacity={currentLevel}
                />
              )}

              {/* Polarity terminal badges */}
              <g>
                <circle
                  cx="82"
                  cy="286"
                  r="17"
                  fill="#ffffff"
                  stroke={reverse > 0.5 ? "#2f8ce6" : "#e35d4b"}
                  strokeWidth="2.2"
                />
                <text
                  x="82"
                  y="292"
                  textAnchor="middle"
                  className="stage-polarity"
                  fill={reverse > 0.5 ? "#2f8ce6" : "#e35d4b"}
                >
                  {reverse > 0.5 ? "−" : "+"}
                </text>
                <circle
                  cx="566"
                  cy="286"
                  r="17"
                  fill="#ffffff"
                  stroke={reverse > 0.5 ? "#e35d4b" : "#2f8ce6"}
                  strokeWidth="2.2"
                />
                <text
                  x="566"
                  y="292"
                  textAnchor="middle"
                  className="stage-polarity"
                  fill={reverse > 0.5 ? "#e35d4b" : "#2f8ce6"}
                >
                  {reverse > 0.5 ? "+" : "−"}
                </text>
              </g>

              {/* Metallic left & right electrode end-caps */}
              <rect x="114" y="228" width="22" height="116" rx="8" fill="#dfe9e6" stroke="#9eb8b1" strokeWidth="1.5" />
              <rect x="516" y="228" width="22" height="116" rx="8" fill="#dfe9e6" stroke="#9eb8b1" strokeWidth="1.5" />

              {/* Layered glass chamber */}
              <rect x="132" y="214" width="390" height="164" rx="28" fill="#13423b" opacity=".08" />
              <rect
                x="128"
                y="204"
                width="396"
                height="164"
                rx="26"
                fill={`url(#${id}-pn-glass)`}
                stroke={`url(#${id}-pn-frame)`}
                strokeWidth="2.4"
              />
              <path
                d="M154,212 H498"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                opacity=".9"
              />

              {/* Breathing depletion barrier with etched fixed lattice ions */}
              <g>
                <rect
                  x={326 - barrierWidth / 2}
                  y="212"
                  width={barrierWidth}
                  height="148"
                  rx="14"
                  fill={`url(#${id}-barrier)`}
                  stroke="#e09a38"
                  strokeDasharray="4 4"
                  strokeWidth="1.3"
                />
                {[-1, 1].map((side) =>
                  [0, 1, 2].map((row) => {
                    const ix = 326 + side * Math.max(10, barrierWidth * 0.25);
                    const iy = 244 + row * 42;
                    return (
                      <g key={`${side}-${row}`} opacity={0.35 + reverse * 0.55}>
                        <circle
                          cx={ix}
                          cy={iy}
                          r="7"
                          fill="#fff8eb"
                          stroke="#d99a3d"
                          strokeWidth="1"
                        />
                        <text
                          x={ix}
                          y={iy + 3.5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill="#b8761c"
                        >
                          {side < 0 ? "−" : "+"}
                        </text>
                      </g>
                    );
                  }),
                )}
              </g>

              {/* Bottom caption pill below chamber */}
              <g transform="translate(326 404)">
                <rect x="-126" y="-15" width="252" height="30" rx="15" fill="#ffffff" stroke="#d5e5df" />
                <text y="4" textAnchor="middle" className="stage-small">
                  {reverse > 0.5 ? "耗尽层变宽 · 形成单向阻挡墙" : "耗尽层变窄 · 载流子顺畅穿过"}
                </text>
              </g>

              {/* High-Craft Precision Ammeter Gauge with integrated hub */}
              <g transform="translate(674 286)">
                <circle r="76" fill="#13423b" opacity=".06" cy="5" />
                <circle r="74" fill={`url(#${id}-dial-face)`} stroke="#bfd6cf" strokeWidth="2.2" />
                <circle r="66" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                {Array.from({ length: 17 }, (_, i) => {
                  const deg = -115 + (i * 230) / 16;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const inner = i % 4 === 0 ? 48 : 53;
                  const outer = 60;
                  return (
                    <line
                      key={i}
                      x1={Math.cos(rad) * inner}
                      y1={Math.sin(rad) * inner}
                      x2={Math.cos(rad) * outer}
                      y2={Math.sin(rad) * outer}
                      stroke={i % 4 === 0 ? "#688983" : "#b5cbc5"}
                      strokeWidth={i % 4 === 0 ? "1.6" : "1"}
                      strokeLinecap="round"
                    />
                  );
                })}
                <path
                  d="M-43,20 A47,47 0 1,1 43,20"
                  fill="none"
                  stroke="#e3efeb"
                  strokeWidth="7.5"
                  strokeLinecap="round"
                />
                <path
                  d="M-43,20 A47,47 0 1,1 43,20"
                  fill="none"
                  stroke={currentLevel > 0.25 ? "#129e84" : "#e08d30"}
                  strokeWidth="7.5"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - currentLevel}
                />
                <g transform={`rotate(${needleAngle})`}>
                  <path d="M-2.2,10 L0,-44 L2.2,10 Z" fill="#122926" />
                </g>
                <circle r="7.2" fill="#122926" stroke="#f0a43b" strokeWidth="2.4" />
                <circle r="2.2" fill="#fff7e2" />
                <text y="44" textAnchor="middle" className="stage-micro" fill={currentLevel > 0.25 ? "#0d856f" : "#b86c1c"}>
                  {currentLevel > 0.25 ? "导通 · 电流强" : "截止 · 电流 ≈ 0"}
                </text>
              </g>
            </g>

            {/* ── SHARED CONTINUOUS KNOWLEDGE ACTORS (LOGO -> DICE -> PRISM -> PN -> LOGO) ── */}
            <g className="stage-shared-beads">
              {Array.from({ length: 36 }, (_, i) => {
                const b = sharedBeadState(i, cycle);
                if (b.opacity <= 0.01) return null;
                if (b.kind === "hole") {
                  return (
                    <g
                      key={i}
                      data-combination={`${Math.floor(i / 6) + 1}+${(i % 6) + 1}`}
                      transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
                      opacity={b.opacity}
                    >
                      <circle r={b.r + 3.2} fill="#e35d4b" opacity=".12" />
                      <circle r={b.r} fill="#fff8f6" stroke="#e35d4b" strokeWidth="2.1" />
                      <path d="M-3,0 H3 M0,-3 V3" stroke="#d14634" strokeWidth="1.4" strokeLinecap="round" />
                    </g>
                  );
                }
                if (b.kind === "electron") {
                  return (
                    <g
                      key={i}
                      data-combination={`${Math.floor(i / 6) + 1}+${(i % 6) + 1}`}
                      transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
                      opacity={b.opacity}
                    >
                      <circle r={b.r + 3} fill="#2f8ce6" opacity=".14" />
                      <circle r={b.r} fill={`url(#${id}-electron)`} stroke="#ffffff" strokeWidth="1.1" />
                      <circle cx="-1.9" cy="-1.9" r="1.7" fill="#ffffff" opacity=".88" />
                    </g>
                  );
                }
                return (
                  <g
                    key={i}
                    data-combination={`${Math.floor(i / 6) + 1}+${(i % 6) + 1}`}
                    transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
                    opacity={b.opacity}
                  >
                    {b.highlight && (
                      <circle r={b.r + 4} fill="none" stroke="#f0a43b" strokeWidth="1.2" opacity=".45" />
                    )}
                    <circle
                      r={b.r}
                      fill={b.fill}
                      stroke={b.stroke}
                      strokeWidth="1.2"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="curiosity-footer-bar">
          <span className="curiosity-takeaway">{act.caption}</span>
          {onTryTopic && (
            <button
              type="button"
              className="curiosity-try-btn"
              onClick={() => onTryTopic(act.prompt)}
            >
              以此题创作 →
            </button>
          )}
        </div>
        <div className="curiosity-rail" aria-hidden="true">
          <span
            className="curiosity-rail-fill"
            style={{ width: `${(cycle / SHOWREEL_DURATION) * 100}%` }}
          />
        </div>
      </div>
    </figure>
  );
}
