import { useId, useRef } from "react";
import { IdeaSeed } from "./LivingFlowScene";
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
  seedPositionAt,
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
  const [seedX, seedY] = seedPositionAt(cycle);
  const id = useId().replace(/:/g, "");

  // Act 1 sub-timings
  const dieEnterA = smoothstep(cycle, 0.05, 1.15);
  const dieEnterB = smoothstep(cycle, 0.25, 1.35);
  const histReveal = smoothstep(cycle, 5.2, 6.4);
  const gridOpacity =
    smoothstep(cycle, 1.5, 2.3) * (1 - smoothstep(cycle, 4.9, 5.8));

  // Act 2 sub-timings
  const prismReveal = smoothstep(cycle, 9.7, 11.1);
  const beamReveal = smoothstep(cycle, 10.1, 11.4);
  const spectrumReveal = smoothstep(cycle, 11.0, 12.6);

  // Act 3 sub-timings
  const pnLocal = Math.max(0, cycle - 20);
  const reverse = smoothstep(pnLocal, 4.4, 5.5);
  const currentLevel = smoothstep(pnLocal, 0.3, 1.5) * (1 - reverse * 0.94);
  const barrierWidth = lerp(34, 124, reverse);
  const needleAngle = lerp(-62, 62, currentLevel);
  const wireDashOffset = -pnLocal * 38;

  return (
    <figure
      ref={ref}
      className="curiosity-stage"
      data-time={time.toFixed(3)}
      data-paused={pose !== undefined || motion.paused}
      data-pose={(cycle / SHOWREEL_DURATION).toFixed(3)}
      data-act={act.id}
      aria-label="知识机制动态演示：依次无缝呈现骰子概率钟形分布、白光三棱镜色散波动，以及 PN 结正反向单向导电机制。"
    >
      <div className="curiosity-viewport">
        <div className="curiosity-chrome">
          <span className="curiosity-live-pill" aria-hidden="true">
            <i />
            LIVE MECHANISM
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
            <circle cx="400" cy="300" r="218" fill="none" stroke="#0f967d" strokeOpacity=".06" strokeDasharray="3 8" />
            <circle cx="400" cy="300" r="142" fill="none" stroke="#e08d30" strokeOpacity=".07" strokeDasharray="2 7" />

            {/* ── ACT 01: DICE PROBABILITY ──────────────────────────────── */}
            <g opacity={opacity.dice}>
              <text x="400" y="76" textAnchor="middle" className="stage-question">
                {SHOWREEL_ACTS[0].question}
              </text>

              <DaylightDie x={182} y={268} value={3} enter={dieEnterA} tilt={-8} />
              <DaylightDie x={288} y={294} value={4} mint enter={dieEnterB} tilt={7} />

              <g opacity={smoothstep(cycle, 1.0, 1.7) * (1 - smoothstep(cycle, 8.6, 9.2))}>
                <rect x="160" y="366" width="148" height="36" rx="18" fill="#ffffff" stroke="#d5e5df" />
                <text x="234" y="390" textAnchor="middle" className="stage-equation">
                  3 + 4 = 7
                </text>
              </g>

              {/* 6x6 matrix lattice guides */}
              <g opacity={gridOpacity}>
                {[1, 2, 3, 4, 5, 6].map((n, i) => (
                  <g key={n} className="stage-axis">
                    <text x={432 + i * 42} y="176" textAnchor="middle">{n}</text>
                    <text x="396" y={209 + i * 34} textAnchor="middle">{n}</text>
                  </g>
                ))}
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6);
                  const c = i % 6;
                  const win = r + c + 2 === 7;
                  return (
                    <circle
                      key={i}
                      cx={432 + c * 42}
                      cy={204 + r * 34}
                      r="11"
                      fill={win ? "#fef2dd" : "none"}
                      stroke={win ? "#e59a38" : "#c7dad3"}
                      strokeWidth={win ? "1.3" : "1"}
                    />
                  );
                })}
              </g>

              {/* Histogram baseline, axes & golden 7 peak callout */}
              <g opacity={histReveal}>
                <line x1="378" y1="494" x2="722" y2="494" stroke="#bdd3cc" strokeWidth="1.4" />
                {Array.from({ length: 11 }, (_, i) => {
                  const sum = i + 2;
                  const count = 6 - Math.abs(sum - 7);
                  const barH = count * 22 + 12;
                  return (
                    <g key={sum}>
                      <rect
                        x={386 + i * 30}
                        y={494 - barH * histReveal}
                        width="24"
                        height={barH * histReveal}
                        rx="12"
                        fill={sum === 7 ? "#fef0d4" : "#eaf6f2"}
                        stroke={sum === 7 ? "#e59a38" : "#cbe2da"}
                        strokeWidth={sum === 7 ? "1.4" : "1"}
                      />
                      <text
                        x={398 + i * 30}
                        y="516"
                        textAnchor="middle"
                        className={sum === 7 ? "stage-axis stage-gold" : "stage-axis"}
                      >
                        {sum}
                      </text>
                    </g>
                  );
                })}
                {/* Subtle golden stem linking the crowning IdeaSeed to the 7 badge */}
                <line x1="548" y1="292" x2="548" y2="306" stroke="#e59a38" strokeWidth="1.4" strokeDasharray="2 3" />
                <g transform={`translate(548 ${lerp(334, 318, histReveal)})`}>
                  <rect x="-46" y="-15" width="92" height="28" rx="14" fill="#e69238" />
                  <text y="3" textAnchor="middle" className="stage-pill-text">
                    7 · 占 6/36
                  </text>
                </g>
              </g>
            </g>

            {/* ── ACT 02: PRISM REFRACTION & BRAND LOGO FUSION ──────────── */}
            <g opacity={opacity.prism}>
              <text x="400" y="76" textAnchor="middle" className="stage-question">
                {SHOWREEL_ACTS[1].question}
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

              {/* Frosted crystal prism echoing our knowledge.show BrandLogo */}
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
                {/* Optical inner facet highlight */}
                <polygon
                  points="0,-108 -96,86 0,14"
                  fill="#ffffff"
                  opacity=".34"
                />
                <path
                  d="M-6,-94 L-84,78 M2,-96 L78,78"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeOpacity=".85"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* ── ACT 03: HIGH-CRAFT PN JUNCTION APPARATUS ──────────────── */}
            <g opacity={opacity.pn}>
              <text x="400" y="76" textAnchor="middle" className="stage-question">
                {reverse > 0.5 ? "反向接通：耗尽层加宽，电流截止" : SHOWREEL_ACTS[2].question}
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

              {/* Copper/silver lead wires + live current-flow pulse dashes */}
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

              {/* Layered glass chamber shadow + outer frame + inner crystal well */}
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
              {/* Top specular glass highlight */}
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
                {/* Etched fixed ion lattice sites (visible especially as depletion widens) */}
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

              {/* High-Craft Precision Ammeter Gauge (pivot matches IdeaSeed at 674, 286!) */}
              <g transform="translate(674 286)">
                <circle r="76" fill="#13423b" opacity=".06" cy="5" />
                <circle r="74" fill={`url(#${id}-dial-face)`} stroke="#bfd6cf" strokeWidth="2.2" />
                <circle r="66" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                {/* 17 fine radial graduation ticks */}
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
                {/* Background & live progress arc */}
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
                {/* Tapered precision needle */}
                <g transform={`rotate(${needleAngle})`}>
                  <path
                    d="M-2.2,10 L0,-44 L2.2,10 Z"
                    fill="#122926"
                  />
                </g>
                <text y="44" textAnchor="middle" className="stage-micro" fill={currentLevel > 0.25 ? "#0d856f" : "#b86c1c"}>
                  {currentLevel > 0.25 ? "导通 · 电流强" : "截止 · 电流 ≈ 0"}
                </text>
              </g>
            </g>

            {/* ── SHARED CONTINUOUS KNOWLEDGE ACTORS ACROSS ALL 3 ACTS ─── */}
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
          <IdeaSeed
            style={{
              left: `${(seedX / 800) * 100}%`,
              top: `${(seedY / 560) * 100}%`,
            }}
          />
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
