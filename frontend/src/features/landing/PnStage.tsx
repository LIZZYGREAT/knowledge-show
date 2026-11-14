import { useId } from "react";
import { easeBetween, pnState } from "./curiosityMotion";

// Adapt the existing S01 device, polarity reversal and meter to the homepage's
// paper materials. One clock controls the handoff, particles and instrument.
export function PnStage({ time }: { time: number }) {
  const id = useId().replace(/:/g, "");
  const p = pnState(time);
  const seconds = p.sceneMs / 1000;
  const reverse = easeBetween(seconds, 6, 7.25);
  const split = easeBetween(seconds, 10, 11.7);
  const current = easeBetween(seconds, 0, 1.5) * (1 - reverse * .965);
  const mode = seconds < 6 ? "forward" : seconds < 10 ? "reverse" : "compare";
  function device(comparison = false) {
    const rotation = comparison ? 0 : reverse * 180;
    const flow = comparison ? .95 : current;
    const t = comparison ? 5.8 : Math.min(seconds, 10);
    return <g data-pn-device={comparison ? "comparison" : "main"} opacity={comparison ? split : 1} transform={comparison ? `translate(${-split * 20} ${split * 133}) scale(${1 - split * .4})` : `translate(${split * 350} ${split * 133}) scale(${1 - split * .4})`}>
      <path d="M590 332.5H627.5" stroke="#a6b3a0" strokeWidth="1.5"/>
      <g data-pn-assembly="true" transform={`rotate(${rotation} 380 332.5)`}>
        <path d="M170 332.5H260M500 332.5H590" stroke={`url(#${id}-wire)`} strokeWidth="3" strokeLinecap="round"/>
        <circle cx="170" cy="332.5" r="10.5" fill="#f8f7eb" stroke="#8fa28d"/>
        <path d="M165 332.5h10m-5-5v10" stroke="#52715d" strokeWidth="1.2"/>
        <circle cx="590" cy="332.5" r="10.5" fill="#f8f7eb" stroke="#8fa28d"/>
        <path d="M585 332.5h10" stroke="#52715d" strokeWidth="1.2"/>
        <rect x="260" y="278" width="240" height="120" rx="16" fill="#466454" opacity=".09"/>
        <rect x="260" y="272.5" width="240" height="120" rx="15" fill={`url(#${id}-ceramic)`} stroke="#b6bea7" strokeWidth="1"/>
        <rect x="269" y="281" width="222" height="102" rx="11" fill={`url(#${id}-tint)`}/>
        <path d="M277 282H482" stroke="#fffef3" strokeWidth="1.5" strokeOpacity=".85"/>
        <rect x="361" y="283" width="38" height="98" fill={`url(#${id}-contact)`}/>
        <path d="M272 385H488" stroke="#718470" strokeOpacity=".22"/>
        {Array.from({ length: 32 }, (_, i) => {
          const initial = (i * 37 + 900) % 1150;
          const age = Math.max(0, t - 6);
          let x = 165 + (i * 37 + t * 150) % 1150;
          if (!comparison && t >= 6 && initial < 595) {
            const travel = initial + age * 150;
            x = 165 + (travel < 595 ? travel : travel % 1190 <= 595 ? travel % 1190 : 1190 - travel % 1190);
          }
          if (!comparison && t >= 6 && i % 15 === 0) x = 165 + (i * 37 + 900 + age * 70) % 1150;
          const body = Math.max(0, Math.min(1, (x - 520) / 90)) * Math.max(0, Math.min(1, (1000 - x) / 90));
          const y = 465 + body * ((i % 5 - 2) * 25 + Math.sin(i * 2.1 + t * 2) * 4);
          const opacity = !comparison && t >= 6 && initial >= 595 && i % 15 !== 0 ? Math.max(0, 1 - age / 1.3) : .95;
          return <circle key={i} data-pn-particle="true" cx={x * .5} cy={100 + y * .5} r={i % 2 ? 2.5 : 3} fill={i % 2 ? "#78a8b0" : "#c68e7a"} stroke="#fffbed" strokeWidth=".4" opacity={opacity}/>;
        })}
      </g>
      <g data-pn-meter="true">
        <circle cx="680" cy="332.5" r="52.5" fill="#f3f2e5" stroke="#9eae97" strokeWidth="1"/>
        <circle cx="680" cy="332.5" r="48" fill={`url(#${id}-dial)`}/>
        {Array.from({ length: 25 }, (_, i) => {
          const a = (200 + i * 140 / 24) * Math.PI / 180, r = i % 4 === 0 ? 38.5 : 41;
          return <path key={i} d={`M${680 + Math.cos(a) * r} ${332.5 + Math.sin(a) * r}L${680 + Math.cos(a) * 45} ${332.5 + Math.sin(a) * 45}`} stroke="#879c86" strokeWidth=".65"/>;
        })}
        <text x="642" y="342" className="pn-meter-label">0</text>
        <path data-pn-needle="true" d="M680 332.5L643 319" stroke="#41664f" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${flow * 140} 680 332.5)`}/>
        <circle cx="680" cy="332.5" r="3.5" fill="#bda068"/>
        <text x="680" y="362" textAnchor="middle" className="pn-meter-label">电流</text>
      </g>
    </g>;
  }
  const reverseTitle = easeBetween(seconds, 5.7, 6.3);
  const compareTitle = easeBetween(seconds, 10, 10.6);
  return <g className="stage-pn" opacity={p.opacity} data-scene-ms={p.sceneMs.toFixed(0)} data-pn-mode={mode} transform={`translate(${400 - p.exit * 40} ${332.5 - p.exit * 27.5}) scale(${1 - p.exit * .94}) translate(-400 -332.5)`}>
    <defs>
      <linearGradient id={`${id}-ceramic`} x2=".2" y2="1"><stop stopColor="#fffcef"/><stop offset=".55" stopColor="#e4e8d8"/><stop offset="1" stopColor="#aebfa9"/></linearGradient>
      <linearGradient id={`${id}-tint`}><stop stopColor="#c68e7a" stopOpacity=".24"/><stop offset=".48" stopColor="#f2eedc" stopOpacity=".12"/><stop offset="1" stopColor="#78a8b0" stopOpacity=".3"/></linearGradient>
      <linearGradient id={`${id}-contact`}><stop stopColor="#fffdf1" stopOpacity="0"/><stop offset=".5" stopColor="#fffdf1" stopOpacity=".8"/><stop offset="1" stopColor="#fffdf1" stopOpacity="0"/></linearGradient>
      <linearGradient id={`${id}-wire`} x2="0" y2="1"><stop stopColor="#c5cfb9"/><stop offset="1" stopColor="#78917b"/></linearGradient>
      <radialGradient id={`${id}-dial`}><stop stopColor="#fffdef"/><stop offset="1" stopColor="#e6ead9"/></radialGradient>
    </defs>
    {[["同一个结，电流畅行", 1 - reverseTitle], ["接法一换，电流受阻", reverseTitle * (1 - compareTitle)], ["同一个结，两个方向", compareTitle]].map(([text, opacity]) => <text key={text} x="400" y="97" textAnchor="middle" className="pn-question" opacity={Number(opacity)}>{text}</text>)}
    {device()}{device(true)}
    <g opacity={1 - split}>
      <text x="380" y="441" textAnchor="middle" className="pn-explanation" opacity={1 - reverseTitle}>载流子通过，指针随之偏转</text>
      <text x="380" y="441" textAnchor="middle" className="pn-explanation" opacity={reverseTitle}>大部分载流子折返，只剩微弱电流</text>
    </g>
  </g>;
}
