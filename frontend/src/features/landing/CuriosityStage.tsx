import { useId } from "react";
import { IdeaSeed } from "./LivingFlowScene";
import { flowMesh } from "./flowGeometry";
import "./curiosity-stage.css";

const ribbon = flowMesh(5.5, true);
const pips: Record<number, number[][]> = {
  1: [[0, 0]], 2: [[-16, -16], [16, 16]],
  3: [[-16, -16], [0, 0], [16, 16]],
  4: [[-16, -16], [16, -16], [-16, 16], [16, 16]],
  5: [[-16, -16], [16, -16], [0, 0], [-16, 16], [16, 16]],
  6: [[-16, -16], [16, -16], [-16, 0], [16, 0], [-16, 16], [16, 16]],
};

function Die({ value, id, green = false }: { value: number; id: string; green?: boolean }) {
  return <g className="stage-die">
    <ellipse cy="44" rx="43" ry="10" fill="#254f4220" />
    <path d="M-37-26 Q-37-34-29-37 L26-46 Q33-47 38-39 L47 17 Q48 25 40 30 L-17 43 Q-25 45-30 37Z" fill={green ? "#416b60" : "#c9c5b4"} />
    <path d="M-29-37 26-46 Q33-47 38-39 L29-29-29-19Z" fill={green ? "#9ab9a1" : "#fffef3"} />
    <rect x="-37" y="-31" width="70" height="70" rx="10" fill={`url(#${id}-${green ? "green" : "ivory"})`} stroke={green ? "#608575" : "#d9d4c3"} />
    <path d="M-28-27H22" stroke="#fff" strokeOpacity=".5" strokeLinecap="round" />
    {pips[value].map(([x, y], i) => <g key={i} transform={`translate(${x - 2} ${y + 3})`}>
      <circle cy="1" r="4.6" fill={green ? "#244d42" : "#c5c0af"} />
      <circle r="4.2" fill={green ? "#fff8dd" : "#315f52"} />
    </g>)}
  </g>;
}

export function CuriosityStage() {
  const id = useId().replace(/:/g, "");
  return <figure className="curiosity-stage" aria-label="知识动画演示：两个公平六面骰子共有36种等可能的有序组合，其中6种点数和为7，比其他点数和的组合都多。">
    <div className="curiosity-theatre">
      <svg className="curiosity-artwork" viewBox="0 0 800 640" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-paper`} x2=".8" y2="1"><stop stopColor="#fffef8"/><stop offset="1" stopColor="#eceee2"/></linearGradient>
          <linearGradient id={`${id}-ivory`} x2=".8" y2="1"><stop stopColor="#fffef4"/><stop offset="1" stopColor="#e8e3ce"/></linearGradient>
          <linearGradient id={`${id}-green`} x2="1" y2="1"><stop stopColor="#8bab94"/><stop offset="1" stopColor="#426e60"/></linearGradient>
          <linearGradient id={`${id}-silk`}><stop stopColor="#176f63"/><stop offset=".5" stopColor="#8dbda1"/><stop offset="1" stopColor="#e3cd94"/></linearGradient>
          <radialGradient id={`${id}-wash`}><stop stopColor="#c8d9b8" stopOpacity=".38"/><stop offset="1" stopColor="#e7eadb" stopOpacity="0"/></radialGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="15" stdDeviation="15" floodColor="#334b36" floodOpacity=".10"/></filter>
        </defs>
        <ellipse cx="415" cy="342" rx="365" ry="280" fill={`url(#${id}-wash)`}/>
        <g className="stage-ribbon" transform="translate(0 130) scale(1 .72)">
          <path d={ribbon.silhouette} fill={`url(#${id}-silk)`} opacity=".32"/>
          {ribbon.threads.filter((_, i) => i % 6 === 0).map((d, i) => <path key={i} d={d} fill="none" stroke={i % 3 ? "#eef5d7" : "#608e72"} strokeWidth=".8" opacity=".55"/>)}
        </g>
        <g filter={`url(#${id}-shadow)`}>
          <path d="M147 206Q142 181 171 177L625 145Q650 144 658 170L702 475Q705 496 680 501L203 542Q181 543 177 521Z" fill="#dddcc9"/>
          <path d="M145 197Q142 174 168 171L623 139Q649 138 653 164L696 467Q700 489 676 493L200 534Q178 535 175 513Z" fill={`url(#${id}-paper)`} stroke="#e1dfce"/>
        </g>
        <path d="M180 190 615 159M210 514 663 476" stroke="#b6bca4" strokeOpacity=".35" fill="none"/>
        <text x="403" y="97" textAnchor="middle" className="stage-question">为什么 7 最常见？</text>
        <g transform="translate(234 239) rotate(-12) scale(.83)"><Die value={3} id={id}/></g>
        <g transform="translate(323 252) rotate(12) scale(.83)"><Die value={4} id={id} green/></g>
        <text x="278" y="329" textAnchor="middle" className="stage-equation">3 + 4 = 7</text>
        <path d="M341 278Q383 269 405 229" fill="none" stroke="#b7a269" strokeWidth="1"/>
        <g className="stage-matrix">
          {[1, 2, 3, 4, 5, 6].map((n, i) => <g key={n} className="stage-axis"><text x={435 + i * 34} y="197" textAnchor="middle">{n}</text><text x="408" y={233 + i * 30} textAnchor="middle">{n}</text></g>)}
          {Array.from({ length: 36 }, (_, i) => {
            const row = Math.floor(i / 6), col = i % 6, win = row + col === 5;
            return <g key={i} data-combination={`${row + 1}+${col + 1}`} transform={`translate(${435 + col * 34} ${228 + row * 30})`}>
              <circle r="11" fill={win ? "#ead8a6" : "#dbe3d4"} stroke={win ? "#b18a3e" : "#a5bba4"} strokeWidth={win ? 1.5 : .6}/>
              <circle r="3" fill={win ? "#987435" : "#729080"}/>
            </g>;
          })}
        </g>
        <g className="stage-result">
          <text x="251" y="435" textAnchor="middle" className="stage-seven">7</text>
          <text x="297" y="413" className="stage-result-label">有 6 种可能</text>
          <text x="297" y="438" className="stage-small">比其他点数和都多</text>
        </g>
        <g className="stage-distribution">
          {Array.from({ length: 11 }, (_, i) => {
            const sum = i + 2, count = 6 - Math.abs(7 - sum);
            return <g key={sum}>
              {Array.from({ length: count }, (_, j) => <circle key={j} cx={427 + i * 20} cy={466 - j * 10} r="3.4" fill={sum === 7 ? "#b58b40" : "#8ea696"}/>)}
              <text x={427 + i * 20} y="485" textAnchor="middle" className={sum === 7 ? "stage-axis stage-gold" : "stage-axis"}>{sum}</text>
            </g>;
          })}
        </g>
        <path d="M99 394Q146 462 189 438" fill="none" stroke="#bfa56d" strokeWidth=".8"/>
        <circle cx="108" cy="405" r="3" fill="#c9a75f"/>
      </svg>
      <IdeaSeed style={{ left: "18%", top: "65%" }}/>
    </div>
    <figcaption>36 种等可能的组合，6 种相加为 7。</figcaption>
  </figure>;
}
