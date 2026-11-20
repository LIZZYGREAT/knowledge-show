import { PnStage } from "./PnStage";
import { StageDie } from "./StageDie";
import { useId, useRef } from "react";
import { FlowArtwork, IdeaSeed } from "./LivingFlowScene";
import { flowState, surfaceAt } from "./flowGeometry";
import "./curiosity-stage.css";
import { useFlowMotion } from "./useFlowMotion";
import {
  combinationState,
  stageState,
  inkState,
  inkContour,
  STAGE_DURATION,
  STATIC_STAGE_TIME,
  pnState,
  pnCarrier,
  easeBetween,
  stageCycle,
} from "./curiosityMotion";

export function CuriosityStage({ pose }: { pose?: number }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useFlowMotion(ref, pose === undefined, STATIC_STAGE_TIME);
  const time = pose === undefined ? motion.time : pose * STAGE_DURATION;
  const { t, unfold, result, roll } = stageState(time);

  const ink = inkState(time);
  const pn = pnState(time);
  const cycle = stageCycle(time);
  const pnCaption = pn.opacity * (1 - easeBetween(pn.cycle, 33.8, 34.4));
  const diceOpacity = 1 - easeBetween(pn.cycle, 19.5, 20.7);
  const diceDetails = 1 - easeBetween(pn.cycle, 16.8, 18);
  const contour = inkContour(ink.bloom);
  const seedU = ink.returning
    ? ink.revealFrom
    : Math.min(0.88, flowState(ink.flowTime).extent);
  const [tipX, tipY] = surfaceAt(seedU, -0.84, ink.flowTime, ink.revealFrom);
  const seedX = ink.returning
    ? tipX
    : 400 - ink.fold * 40 + (tipX - 400) * ink.scale;
  const seedY = ink.returning
    ? tipY
    : 320 - ink.fold * 15 + (tipY - 320) * ink.scale;
  const seedLeft = motion.compact ? (seedX - 140) / 5.6 : seedX / 8;
  const seedTop = motion.compact ? (seedY - 65) / 4.8 : seedY / 6.4;
  const id = useId().replace(/:/g, "");

  const currentAct =
    pn.opacity > 0.35
      ? { index: "03", title: "物理机制 · PN 结单向导电" }
      : ink.bloom > 0.35
        ? { index: "02", title: "概率直觉 · 为什么 7 最常见" }
        : { index: "01", title: "思想流纹 · 好奇心成形" };

  return (
    <figure
      ref={ref}
      className="curiosity-stage"
      data-time={time.toFixed(3)}
      data-paused={pose !== undefined || motion.paused}
      data-pose={(cycle / STAGE_DURATION).toFixed(3)}
      data-ink={ink.bloom.toFixed(3)}
      aria-label="知识动画演示：两个公平六面骰子共有36种等可能的有序组合，其中6种点数和为7，比其他点数和的组合都多。随后演示同一个PN结在两种接法下的红蓝粒子与仪表变化，最终回到流纹丝带。"
    >
      <div className="curiosity-viewport">
        <div className="curiosity-chrome" aria-hidden="true">
          <span className="curiosity-live-pill">
            <i />
            LIVE SHOWCASE
          </span>
          <span className="curiosity-act-label">
            <em>{currentAct.index}</em>
            {currentAct.title}
          </span>
        </div>
        <div className="curiosity-theatre">
          <svg
            className="curiosity-artwork"
            viewBox={motion.compact ? "140 65 560 480" : "0 0 800 640"}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id={`${id}-ivory`} x2=".8" y2="1">
                <stop stopColor="#fff7e3" />
                <stop offset="1" stopColor="#decda9" />
              </linearGradient>
              <linearGradient id={`${id}-green`} x2="1" y2="1">
                <stop stopColor="#4ad8c4" />
                <stop offset="1" stopColor="#145661" />
              </linearGradient>
              <radialGradient id={`${id}-ink-wash`}>
                <stop stopColor="#163247" stopOpacity=".86" />
                <stop offset=".7" stopColor="#0f2336" stopOpacity=".52" />
                <stop offset="1" stopColor="#38d9c0" stopOpacity="0" />
              </radialGradient>
              <filter
                id={`${id}-wet-edge`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation={motion.compact ? 2 : 3.5} />
              </filter>
              <mask
                id={`${id}-ink-reveal`}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="800"
                height="640"
              >
                <path
                  className="stage-ink-mask"
                  d={contour}
                  fill="white"
                  filter={`url(#${id}-wet-edge)`}
                />
              </mask>
            </defs>
            <g
              className="stage-silk"
              data-reveal-from={ink.revealFrom.toFixed(4)}
              opacity={ink.silkOpacity}
              transform={`translate(${400 - ink.fold * 40} ${320 - ink.fold * 15}) scale(${ink.scale}) translate(-400 -320)`}
            >
              {ink.silkOpacity > 0 && (
                <FlowArtwork
                  time={ink.flowTime}
                  id={`${id}-flow`}
                  compact={motion.compact}
                  revealFrom={ink.revealFrom}
                />
              )}
            </g>
            <g className="stage-ink-wash" opacity={ink.bloom}>
              <path
                d={contour}
                fill={`url(#${id}-ink-wash)`}
                filter={`url(#${id}-wet-edge)`}
              />
              <path
                d={contour}
                fill="none"
                stroke="#38d9c0"
                strokeWidth="1.2"
                strokeOpacity={(1 - ink.bloom) * 0.42}
                filter={`url(#${id}-wet-edge)`}
              />
            </g>
            <text
              x="403"
              y="97"
              textAnchor="middle"
              className="stage-question"
              opacity={ink.question}
              transform={`translate(0 ${6 * (1 - ink.question)})`}
            >
              为什么 7 最常见？
            </text>
            <g className="stage-knowledge" mask={`url(#${id}-ink-reveal)`}>
              <g
                opacity={diceOpacity}
                data-die="ivory"
                transform={`translate(${(310 - unfold * 76) * (1 - pn.transfer) + 320 * pn.transfer} ${(306 - unfold * 67) * (1 - pn.transfer) + 332.5 * pn.transfer}) rotate(${-8 * (1 - pn.transfer)}) scale(${(1.25 - unfold * 0.42) * (1 - pn.transfer) + 1.82 * pn.transfer})`}
              >
                <StageDie time={t} morph={pn.transfer} />
              </g>
              <g
                opacity={diceOpacity}
                data-die="green"
                transform={`translate(${(443 - unfold * 120) * (1 - pn.transfer) + 440 * pn.transfer} ${(320 - unfold * 68) * (1 - pn.transfer) + 332.5 * pn.transfer}) rotate(${8 * (1 - pn.transfer)}) scale(${(1.25 - unfold * 0.42) * (1 - pn.transfer) + 1.82 * pn.transfer})`}
              >
                <StageDie time={t} green morph={pn.transfer} />
              </g>
              <text
                x={380 - unfold * 102}
                y={405 - unfold * 76}
                opacity={(roll > 0.2 ? 0 : 1) * diceDetails}
                textAnchor="middle"
                className="stage-equation"
              >
                3 + 4 = 7
              </text>
              <path
                opacity={unfold * diceOpacity}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - unfold}
                d="M341 278Q383 269 405 229"
                fill="none"
                stroke="#f0b96b"
                strokeWidth="1.2"
              />
              <g
                className="stage-matrix"
                opacity={0.08 + Math.max(unfold, pn.transfer) * 0.92}
              >
                {[1, 2, 3, 4, 5, 6].map((n, i) => (
                  <g
                    key={n}
                    className="stage-axis"
                    opacity={(0.25 + unfold * 0.75) * (1 - pn.transfer)}
                  >
                    <text x={435 + i * 34} y="197" textAnchor="middle">
                      {n}
                    </text>
                    <text x="408" y={233 + i * 30} textAnchor="middle">
                      {n}
                    </text>
                  </g>
                ))}
                {Array.from({ length: 36 }, (_, i) => {
                  const row = Math.floor(i / 6);
                  const col = i % 6;
                  const point = combinationState(i, time);
                  const carrier = pnCarrier(i);
                  const targetColor = i % 2 ? [102, 232, 245] : [255, 138, 122];
                  const carrierColor = `rgb(${[88, 174, 194]
                    .map((v, channel) =>
                      Math.round(v + (targetColor[channel] - v) * pn.transfer),
                    )
                    .join(",")})`;
                  const px = point.x + (carrier.x - point.x) * pn.transfer;
                  const py =
                    point.y +
                    (carrier.y - point.y) * pn.transfer -
                    Math.sin(pn.transfer * Math.PI) * 38;
                  return (
                    <g key={i} data-combination={`${row + 1}+${col + 1}`}>
                      <circle
                        cx={435 + col * 34}
                        cy={228 + row * 30}
                        r="10"
                        fill={
                          point.win && point.gather > 0.5
                            ? "rgba(240, 185, 107, 0.24)"
                            : "none"
                        }
                        stroke={point.win ? "#f0b96b" : "#3a5f75"}
                        opacity={
                          (point.win
                            ? 0.24 + point.highlight * 0.72
                            : 0.22 + unfold * 0.28) *
                          (1 - pn.transfer)
                        }
                      />
                      <g
                        data-moving-point="true"
                        transform={`translate(${px} ${py})`}
                        opacity={point.opacity * (1 - pn.carriers)}
                      >
                        <circle
                          r={
                            point.radius * (1 - pn.transfer) +
                            (i % 2 ? 2.7 : 3.2) * pn.transfer
                          }
                          fill={
                            pn.transfer > 0
                              ? carrierColor
                              : point.highlight > 0.5
                                ? "#f5c678"
                                : "#254d61"
                          }
                          strokeOpacity={1 - pn.transfer}
                          stroke={point.highlight > 0.5 ? "#ffe3a4" : "#56b5c4"}
                          strokeWidth=".9"
                        />
                        <circle
                          r={3 * (1 - pn.transfer)}
                          fill={point.highlight > 0.5 ? "#fff6dc" : "#80f0dc"}
                        />
                        <circle
                          r={point.radius + 3.5}
                          fill="none"
                          stroke="#f5c678"
                          strokeWidth="1.3"
                          opacity={
                            point.highlight *
                            (1 - point.gather) *
                            (1 - pn.transfer)
                          }
                        />
                      </g>
                    </g>
                  );
                })}
              </g>
              <g
                className="stage-result"
                opacity={result * diceOpacity}
                transform={`translate(0 ${12 * (1 - result)})`}
              >
                <text x="251" y="435" textAnchor="middle" className="stage-seven">
                  7
                </text>
                <text x="297" y="413" className="stage-result-label">
                  有 6 种可能
                </text>
                <text x="297" y="438" className="stage-small">
                  比其他点数和都多
                </text>
              </g>
              <g className="stage-distribution" opacity={result * diceOpacity}>
                {Array.from({ length: 11 }, (_, i) => {
                  const sum = i + 2;
                  return (
                    <g key={sum}>
                      <text
                        data-sum={sum}
                        x={427 + i * 20}
                        y="485"
                        textAnchor="middle"
                        className={
                          sum === 7 ? "stage-axis stage-gold" : "stage-axis"
                        }
                      >
                        {sum}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
            <PnStage time={time} />
          </svg>
          <IdeaSeed
            style={{
              left: `${seedLeft}%`,
              top: `${seedTop}%`,
              opacity: ink.seedOpacity,
            }}
          />
        </div>
        <div className="curiosity-rail" aria-hidden="true">
          <span
            className="curiosity-rail-fill"
            style={{ width: `${(cycle / STAGE_DURATION) * 100}%` }}
          />
        </div>
      </div>
      <figcaption
        style={{
          opacity: Math.max(ink.question, pnCaption),
          transform: `translateY(${6 * (1 - Math.max(ink.question, pnCaption))}px)`,
        }}
      >
        <span style={{ opacity: ink.question }}>
          36 种等可能的组合，6 种相加为 7。
        </span>
        <span style={{ opacity: pnCaption }}>
          同一个 PN 结，两个方向，不同的电流。
        </span>
      </figcaption>
    </figure>
  );
}
