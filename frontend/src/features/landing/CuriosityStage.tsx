import { useId, useRef } from "react";
import { FlowArtwork, IdeaSeed } from "./LivingFlowScene";
import { inkVortex } from "./inkVortex";
import { InkDie } from "./InkDie";
import { surfaceAt } from "./flowGeometry";
import "./curiosity-stage.css";
import { useFlowMotion } from "./useFlowMotion";
import { combinationState, easeBetween, stageState, inkState, inkContour, STAGE_DURATION, STATIC_STAGE_TIME } from "./curiosityMotion";

export function CuriosityStage({ pose }: { pose?: number }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useFlowMotion(ref, pose === undefined, STATIC_STAGE_TIME);
  const time = pose === undefined ? motion.time : pose * STAGE_DURATION;
  const { t, unfold, result, roll } = stageState(time);
  const wobble = Math.sin(t * 15) * roll;
  const ink = inkState(time);
  const tumble = easeBetween(t, 1.4, 3.2) * Math.PI * 2;
  const dieTurn = ink.turn + tumble;
  const contour = inkContour(ink.bloom);
  const [tipX, tipY] = surfaceAt(.88, -.84, ink.flowTime);
  const seedX = 400 - ink.fold * 40 + (tipX - 400) * ink.scale;
  const seedY = 320 - ink.fold * 15 + (tipY - 320) * ink.scale;
  const seedLeft = motion.compact ? (seedX - 140) / 5.6 : seedX / 8;
  const seedTop = motion.compact ? (seedY - 65) / 4.8 : seedY / 6.4;
  function dieTransform(x: number, y: number, rotation: number, arc: number) {
    const travel = ink.travel;
    const px = seedX + (x - seedX) * travel;
    const py = seedY + (y - seedY) * travel - Math.sin(travel * Math.PI) * arc;
    const size = (1.25 - unfold * .42) * (.2 + ink.form * .8);
    const stretch = Math.sin(travel * Math.PI) * (1 - ink.form) * .18;
    return `translate(${px} ${py}) rotate(${rotation * ink.form}) scale(${size * (1 - stretch)} ${size * (1 + stretch)})`;
  }
  const vortex = inkVortex({ x: 376.5 - unfold * 98, y: 313 - unfold * 67,
    sourceX: seedX, sourceY: seedY, travel: ink.travel, lift: ink.lift, turn: dieTurn, unfold });
  function vortexLines(paths: string[]) {
    return paths.map((d, i) => <g key={i}>
      <path d={d} stroke="#46927c" strokeWidth="4" strokeOpacity=".10"/>
      <path d={d} stroke={i % 3 ? "#5e9985" : "#bca16c"} strokeWidth={i % 3 ? 1.3 : .9} strokeOpacity=".65"/>
    </g>);
  }
  const id = useId().replace(/:/g, "");
  return <figure ref={ref} className="curiosity-stage" data-time={time.toFixed(3)} data-paused={pose !== undefined || motion.paused} data-pose={((time % STAGE_DURATION) / STAGE_DURATION).toFixed(3)} data-ink={ink.bloom.toFixed(3)} aria-label="知识动画演示：两个公平六面骰子共有36种等可能的有序组合，其中6种点数和为7，比其他点数和的组合都多。">
    <div className="curiosity-theatre">
      <svg className="curiosity-artwork" viewBox={motion.compact ? "140 65 560 480" : "0 0 800 640"} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-ink-wash`}>
            <stop stopColor="#d8e5d3" stopOpacity=".55"/>
            <stop offset=".72" stopColor="#d8e5d3" stopOpacity=".32"/>
            <stop offset="1" stopColor="#7fa58d" stopOpacity="0"/>
          </radialGradient>
          <filter id={`${id}-wet-edge`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={motion.compact ? 2 : 3.5}/>
          </filter>
          <mask id={`${id}-ink-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="640">
            <path className="stage-ink-mask" d={contour} fill="white" filter={`url(#${id}-wet-edge)`}/>
          </mask>
        </defs>
        <g className="stage-silk" opacity={ink.silkOpacity} transform={`translate(${400 - ink.fold * 40} ${320 - ink.fold * 15}) scale(${ink.scale}) translate(-400 -320)`}>
          {ink.silkOpacity > 0 && <FlowArtwork time={ink.flowTime} id={`${id}-flow`} compact={motion.compact}/>}
        </g>
        <g className="stage-ink-wash" opacity={ink.bloom}>
          <path d={contour} fill={`url(#${id}-ink-wash)`} filter={`url(#${id}-wet-edge)`}/>
          <path d={contour} fill="none" stroke="#6b9380" strokeWidth="1.2" strokeOpacity={(1 - ink.bloom) * .22} filter={`url(#${id}-wet-edge)`}/>
        </g>
        <text x="403" y="97" textAnchor="middle" className="stage-question">为什么 7 最常见？</text>
        <g className="stage-ink-ripples stage-vortex-back" data-lift={ink.lift.toFixed(3)} opacity={ink.vortexOpacity * .7} fill="none" strokeLinecap="round">
          {vortexLines(vortex.back)}
        </g>
        <g className="stage-knowledge">
        <g data-die="ivory" opacity={ink.presence} transform={dieTransform(310 - unfold * 76, 306 - unfold * 67 - Math.abs(wobble) * 12, -12 + wobble * 22, 42)}><InkDie form={ink.form} turn={dieTurn} tumble={tumble}/></g>
        <g data-die="green" opacity={ink.presence} transform={dieTransform(443 - unfold * 120, 320 - unfold * 68 - Math.abs(wobble) * 9, 12 - wobble * 26, 60)}><InkDie form={ink.form} turn={dieTurn} tumble={tumble} green/></g>
        <g className="stage-vortex-front" opacity={ink.vortexOpacity} fill="none" strokeLinecap="round">
          {vortexLines(vortex.front)}
        </g>
        <g className="stage-explanation" opacity={ink.form} mask={`url(#${id}-ink-reveal)`}>
        <text x={380 - unfold * 102} y={405 - unfold * 76} opacity={1 - easeBetween(roll, 0, .2)} textAnchor="middle" className="stage-equation">3 + 4 = 7</text>
        <path opacity={unfold} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - unfold} d="M341 278Q383 269 405 229" fill="none" stroke="#b7a269" strokeWidth="1"/>
        <g className="stage-matrix" opacity={.08 + unfold * .92}>
          {[1, 2, 3, 4, 5, 6].map((n, i) => <g key={n} className="stage-axis" opacity={.25 + unfold * .75}><text x={435 + i * 34} y="197" textAnchor="middle">{n}</text><text x="408" y={233 + i * 30} textAnchor="middle">{n}</text></g>)}
          {Array.from({ length: 36 }, (_, i) => {
            const row = Math.floor(i / 6), col = i % 6;
            const point = combinationState(i, time);
            return <g key={i} data-combination={`${row + 1}+${col + 1}`}>
              <circle cx={435 + col * 34} cy={228 + row * 30} r="10" fill={point.win && point.gather > .5 ? "#ead8a6" : "none"} stroke={point.win ? "#b18a3e" : "#a5bba4"} opacity={point.win ? .16 + point.highlight * .65 : .16 + unfold * .18}/>
              <g data-moving-point="true" transform={`translate(${point.x} ${point.y})`} opacity={point.opacity}>
                <circle r={point.radius} fill={point.highlight > .5 ? "#ead8a6" : "#dbe3d4"} stroke={point.highlight > .5 ? "#b18a3e" : "#a5bba4"} strokeWidth=".8"/>
                <circle r="3" fill={point.highlight > .5 ? "#987435" : "#729080"}/>
                <circle r={point.radius + 3} fill="none" stroke="#b18a3e" strokeWidth="1.2" opacity={point.highlight * (1 - point.gather)} />
              </g>
            </g>;
          })}
        </g>
        <g className="stage-result" opacity={result} transform={`translate(0 ${12 * (1 - result)})`}>
          <text x="251" y="435" textAnchor="middle" className="stage-seven">7</text>
          <text x="297" y="413" className="stage-result-label">有 6 种可能</text>
          <text x="297" y="438" className="stage-small">比其他点数和都多</text>
        </g>
        <g className="stage-distribution" opacity={result}>
          {Array.from({ length: 11 }, (_, i) => {
            const sum = i + 2;
            return <g key={sum}>
              <text data-sum={sum} x={427 + i * 20} y="485" textAnchor="middle" className={sum === 7 ? "stage-axis stage-gold" : "stage-axis"}>{sum}</text>
            </g>;
          })}
        </g>
        </g>
        </g>
      </svg>
      <IdeaSeed style={{ left: `${seedLeft}%`, top: `${seedTop}%`, opacity: 1 - ink.bloom }}/>
    </div>
    <figcaption>36 种等可能的组合，6 种相加为 7。</figcaption>
  </figure>;
}
