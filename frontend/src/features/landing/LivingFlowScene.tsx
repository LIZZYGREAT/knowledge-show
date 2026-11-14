import { useId, useRef, type CSSProperties } from "react";
import "./flow-scene.css";
import { useFlowMotion } from "./useFlowMotion";
import { clamp, flowMesh, flowState, pathThrough, surfaceAt } from "./flowGeometry";

export function IdeaSeed({ style }: { style?: CSSProperties }) {
  return <span className="idea-seed" style={style} aria-hidden="true"><span className="seed-core" /></span>;
}

function FlowArtwork({ time, id, compact }: { time: number; id: string; compact: boolean }) {
  const mesh = flowMesh(time, compact);
  const { extent } = flowState(time);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-silk`} x1="240" y1="490" x2="567" y2="135" gradientUnits="userSpaceOnUse">
          <stop stopColor="#184f49" />
          <stop offset=".29" stopColor="#087d79" />
          <stop offset=".57" stopColor="#239c94" />
          <stop offset=".79" stopColor="#80ccb2" />
          <stop offset="1" stopColor="#d4e9b6" />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="165" y1="445" x2="620" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b1d9b2" stopOpacity=".12" />
          <stop offset=".42" stopColor="#dbf9df" stopOpacity=".85" />
          <stop offset=".73" stopColor="#b6ebcf" stopOpacity=".24" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity=".96" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="170" y1="410" x2="590" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cfad72" stopOpacity=".08" />
          <stop offset=".55" stopColor="#dfc789" stopOpacity=".8" />
          <stop offset="1" stopColor="#cfad72" stopOpacity=".22" />
        </linearGradient>
        <radialGradient id={`${id}-wash`}>
          <stop stopColor="#9ddcc5" stopOpacity=".15" />
          <stop offset="1" stopColor="#bce1c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="433" cy="333" rx="335" ry="268" fill={`url(#${id}-wash)`} />
      <g className="flow-surface" opacity={0.55 + clamp(time / 1.5) * 0.45}>
        <path className="flow-body" d={mesh.silhouette} fill={`url(#${id}-silk)`} />
        {mesh.bands.map((d, i) => {
          const v = i / mesh.bands.length;
          const light = Math.pow((Math.cos(v * Math.PI * 3.3 + 0.5) + 1) / 2, 3);
          return <path key={i} d={d} fill={light > 0.34 ? `url(#${id}-light)` : "#064c49"} opacity={light > 0.34 ? light * 0.63 : (0.34 - light) * 1.05} />;
        })}
        <g fill="none" strokeWidth=".65">
          {mesh.threads.map((d, i) => <path key={i} d={d} stroke={i === 8 || i === 47 ? "#e4d09a" : i % 5 === 0 ? "#073e3a" : `url(#${id}-light)`} opacity={i === 8 || i === 47 ? ".6" : i % 5 === 0 ? ".22" : ".46"} />)}
        </g>
      </g>
      <g fill="none" strokeWidth=".75" strokeLinecap="round">
        {mesh.wisps.map((d, i) => <path key={i} d={d} stroke={i === 2 || i === 7 ? `url(#${id}-gold)` : "#539e8f"} opacity={0.44 - (i % 5) * 0.065} />)}
      </g>
      <g className="flow-glints" fill="none" stroke={`url(#${id}-light)`} strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => {
          const u = (i * 0.137 + time * 0.045) % 1;
          const v = -0.82 + i % 4 * 0.46;
          const end = Math.min(extent, u + 0.085);
          if (u >= end) return null;
          const points = Array.from({ length: 18 }, (_, j) => surfaceAt(u + (end - u) * j / 17, v, time));
          return <path key={i} d={pathThrough(points)} strokeWidth="1.8" opacity={Math.sin(u * Math.PI) ** 2 * .6} />;
        })}
      </g>
      <g className="flow-motes">
        {Array.from({ length: compact ? 18 : 30 }, (_, i) => {
          const u = (i * 0.6180339 + time * (0.018 + i % 3 * 0.003)) % 1;
          const v = (i % 2 ? -1 : 1) * (0.7 + i % 5 * 0.19);
          const [x, y] = surfaceAt(u, v, time);
          const opacity = Math.sin(u * Math.PI) ** 2 * clamp((extent - u) * 16);
          const bubble = i % 7 === 0;
          return <g key={i} opacity={opacity * 0.8}>
            <circle cx={x} cy={y} r={bubble ? 4.5 : 0.85 + i % 3 * 0.45} fill={bubble ? "#f7f7f2" : i % 4 === 0 ? "#cfad72" : "#d2edca"} fillOpacity={bubble ? ".38" : ".9"} stroke={bubble ? "#83bca4" : "none"} strokeWidth=".7" />
            {bubble && <circle cx={x - 1.2} cy={y - 1.2} r="1" fill="#fffef2" />}
          </g>;
        })}
      </g>
    </>
  );
}

export function LivingFlowScene({ pose }: { pose?: number }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useFlowMotion(ref, pose === undefined);
  const time = pose === undefined ? motion.time : clamp(pose) * 5.5;
  const progress = clamp(time / 5.5);
  const id = useId().replace(/:/g, "");
  const seedU = Math.min(0.88, flowState(time).extent);
  const [seedX, seedY] = surfaceAt(seedU, -0.84, time);
  return (
    <figure ref={ref} className="living-flow-scene" data-pose={progress.toFixed(3)} data-time={time.toFixed(3)} data-paused={motion.paused} data-settled={progress === 1}>
      <div className="flow-theatre">
        <svg className="flow-artwork" viewBox="0 0 800 640" aria-hidden="true" focusable="false">
          <FlowArtwork time={time} id={id} compact={motion.compact} />
        </svg>
        <IdeaSeed style={{ left: `${seedX / 8}%`, top: `${seedY / 6.4}%` }} />
      </div>
      <figcaption><span />好奇心，让知识有了流动的形状。<span /></figcaption>
    </figure>
  );
}
