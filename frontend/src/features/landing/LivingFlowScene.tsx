import { useId, useRef, type CSSProperties } from "react";
import "./flow-scene.css";
import { useFlowMotion } from "./useFlowMotion";
import { clamp, flowMesh, flowState, pathThrough, surfaceAt } from "./flowGeometry";

export function IdeaSeed({ style }: { style?: CSSProperties }) {
  return (
    <span className="idea-seed" style={style} aria-hidden="true">
      <span className="seed-core" />
    </span>
  );
}

export function FlowArtwork({
  time,
  id,
  compact,
  revealFrom = 0,
}: {
  time: number;
  id: string;
  compact: boolean;
  revealFrom?: number;
}) {
  const mesh = flowMesh(time, compact, revealFrom);
  const { extent } = flowState(time);
  return (
    <>
      <defs>
        <linearGradient
          id={`${id}-silk`}
          x1="230"
          y1="500"
          x2="585"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0f495c" />
          <stop offset=".28" stopColor="#128a8c" />
          <stop offset=".58" stopColor="#28cfb8" />
          <stop offset=".82" stopColor="#7cf0d8" />
          <stop offset="1" stopColor="#f8d489" />
        </linearGradient>
        <linearGradient
          id={`${id}-light`}
          x1="165"
          y1="445"
          x2="620"
          y2="180"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6be8d6" stopOpacity=".14" />
          <stop offset=".42" stopColor="#d8fff6" stopOpacity=".88" />
          <stop offset=".73" stopColor="#86f2de" stopOpacity=".28" />
          <stop offset="1" stopColor="#ffebb8" stopOpacity=".98" />
        </linearGradient>
        <linearGradient
          id={`${id}-gold`}
          x1="170"
          y1="410"
          x2="590"
          y2="190"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f0b96b" stopOpacity=".12" />
          <stop offset=".55" stopColor="#ffe1a0" stopOpacity=".9" />
          <stop offset="1" stopColor="#f0b96b" stopOpacity=".26" />
        </linearGradient>
        <radialGradient id={`${id}-wash`}>
          <stop stopColor="#38d9c0" stopOpacity=".22" />
          <stop offset=".58" stopColor="#1e5e73" stopOpacity=".08" />
          <stop offset="1" stopColor="#0b1522" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="433" cy="333" rx="340" ry="270" fill={`url(#${id}-wash)`} />
      <g className="flow-surface" opacity={0.6 + clamp(time / 1.5) * 0.4}>
        <path className="flow-body" d={mesh.silhouette} fill={`url(#${id}-silk)`} />
        {mesh.bands.map((d, i) => {
          const v = i / mesh.bands.length;
          const light = Math.pow((Math.cos(v * Math.PI * 3.3 + 0.5) + 1) / 2, 3);
          return (
            <path
              key={i}
              d={d}
              fill={light > 0.34 ? `url(#${id}-light)` : "#082838"}
              opacity={light > 0.34 ? light * 0.58 : (0.34 - light) * 1.15}
            />
          );
        })}
        <g fill="none" strokeWidth=".7">
          {mesh.threads.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke={
                i === 8 || i === 47
                  ? "#ffe09a"
                  : i % 5 === 0
                    ? "#072030"
                    : `url(#${id}-light)`
              }
              opacity={i === 8 || i === 47 ? ".76" : i % 5 === 0 ? ".35" : ".44"}
            />
          ))}
        </g>
      </g>
      <g fill="none" strokeWidth=".85" strokeLinecap="round">
        {mesh.wisps.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={i === 2 || i === 7 ? `url(#${id}-gold)` : "#4de3cc"}
            opacity={0.5 - (i % 5) * 0.07}
          />
        ))}
      </g>
      <g
        className="flow-glints"
        fill="none"
        stroke={`url(#${id}-light)`}
        strokeLinecap="round"
      >
        {Array.from({ length: 7 }, (_, i) => {
          const u = (i * 0.137 + time * 0.045) % 1;
          const v = -0.82 + (i % 4) * 0.46;
          const end = Math.min(extent, u + 0.085);
          const start = Math.max(u, revealFrom);
          if (start >= end) return null;
          const points = Array.from({ length: 18 }, (_, j) =>
            surfaceAt(start + ((end - start) * j) / 17, v, time, revealFrom),
          );
          return (
            <path
              key={i}
              d={pathThrough(points)}
              strokeWidth="2"
              opacity={Math.sin(u * Math.PI) ** 2 * 0.72}
            />
          );
        })}
      </g>
      <g className="flow-motes">
        {Array.from({ length: compact ? 18 : 30 }, (_, i) => {
          const u = (i * 0.6180339 + time * (0.018 + (i % 3) * 0.003)) % 1;
          const v = (i % 2 ? -1 : 1) * (0.7 + (i % 5) * 0.19);
          const [x, y] = surfaceAt(u, v, time, revealFrom);
          const opacity =
            Math.sin(u * Math.PI) ** 2 *
            clamp((extent - u) * 16) *
            (revealFrom > 0 ? clamp((u - revealFrom) * 16) : 1);
          const bubble = i % 7 === 0;
          return (
            <g key={i} opacity={opacity * 0.88}>
              <circle
                cx={x}
                cy={y}
                r={bubble ? 4.5 : 0.95 + (i % 3) * 0.45}
                fill={
                  bubble ? "#d6fff7" : i % 4 === 0 ? "#f7cb79" : "#80f0dc"
                }
                fillOpacity={bubble ? ".24" : ".92"}
                stroke={bubble ? "#76ebd8" : "none"}
                strokeWidth=".75"
              />
              {bubble && <circle cx={x - 1.2} cy={y - 1.2} r="1.1" fill="#ffffff" />}
            </g>
          );
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
    <figure
      ref={ref}
      className="living-flow-scene"
      data-pose={progress.toFixed(3)}
      data-time={time.toFixed(3)}
      data-paused={motion.paused}
      data-settled={progress === 1}
    >
      <div className="flow-theatre">
        <svg
          className="flow-artwork"
          viewBox="0 0 800 640"
          aria-hidden="true"
          focusable="false"
        >
          <FlowArtwork time={time} id={id} compact={motion.compact} />
        </svg>
        <IdeaSeed style={{ left: `${seedX / 8}%`, top: `${seedY / 6.4}%` }} />
      </div>
      <figcaption>
        <span />
        好奇心，让知识有了流动的形状。
        <span />
      </figcaption>
    </figure>
  );
}
