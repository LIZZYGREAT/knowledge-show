import { useId, useRef, type CSSProperties } from "react";
import "./flow-scene.css";
import { useFlowMotion } from "./useFlowMotion";

type Point = readonly [number, number];

function pointAt(u: number, phase: number): Point {
  const t = Math.max(0, Math.min(1, u));
  const x =
    394 +
    137 * Math.sin(t * Math.PI * 2.65 - 0.8 + phase * 0.12) +
    49 * Math.sin(t * Math.PI * 5.3 + 0.45 + phase * 0.21);
  return [x, 55 + t * 530];
}

function ribbonPath(phase: number, widthScale = 1, drift = 0) {
  const left: Point[] = [];
  const right: Point[] = [];
  const steps = 120;
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const [x, y] = pointAt(u, phase + drift);
    const [nextX, nextY] = pointAt(Math.min(1, u + 0.002), phase + drift);
    const [prevX, prevY] = pointAt(Math.max(0, u - 0.002), phase + drift);
    const dx = nextX - prevX;
    const dy = nextY - prevY;
    const length = Math.hypot(dx, dy) || 1;
    const width =
      (7 + 67 * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.72)) *
      widthScale;
    const nx = -dy / length;
    const ny = dx / length;
    left.push([x + nx * width + drift * 2, y + ny * width]);
    right.push([x - nx * width + drift * 2, y - ny * width]);
  }
  const outline = [...left, ...right.reverse()];
  return `${outline.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;
}

function centerPath(phase: number, offset = 0, drift = 0) {
  return Array.from({ length: 91 }, (_, index) => {
    const [x, y] = pointAt(index / 90, phase + drift);
    return `${index ? "L" : "M"}${(x + offset + drift * 2).toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

export function IdeaSeed({ style }: { style?: CSSProperties }) {
  return (
    <span className="idea-seed" style={style} aria-hidden="true">
      <span className="seed-core" />
    </span>
  );
}

function FlowArtwork({ phase, id }: { phase: number; id: string }) {
  const bubbles = Array.from({ length: 13 }, (_, index) => {
    const u = 0.13 + index * 0.058;
    const [x, y] = pointAt(u, phase + 0.15);
    const side = index % 2 ? 1 : -1;
    const radius = 2.3 + (index % 4) * 1.25;
    return { x: x + side * (22 + (index % 3) * 13), y, radius, index };
  });
  const [seedX, seedY] = pointAt(0.68, phase);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-body`} x1="190" y1="480" x2="640" y2="115" gradientUnits="userSpaceOnUse">
          <stop stopColor="#17634f" />
          <stop offset=".48" stopColor="var(--ks-flow)" />
          <stop offset=".78" stopColor="var(--ks-flow-light)" />
          <stop offset="1" stopColor="#a4d0b7" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="250" y1="500" x2="604" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a2d5c0" stopOpacity=".08" />
          <stop offset=".5" stopColor="#d9f0dc" stopOpacity=".32" />
          <stop offset="1" stopColor="#f6e4b5" stopOpacity=".36" />
        </linearGradient>
        <radialGradient id={`${id}-pool`} cx="0" cy="0" r="1" gradientTransform="matrix(167 0 0 190 514 293)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c1e1c3" stopOpacity=".68" />
          <stop offset="1" stopColor="#c1e1c3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="504" cy="300" rx="170" ry="194" fill={`url(#${id}-pool)`} opacity=".45" />
      <path d={ribbonPath(phase, 1, 0)} fill={`url(#${id}-body)`} opacity=".96" />
      <path d={ribbonPath(phase, 0.62, 0)} fill={`url(#${id}-sheen)`} opacity=".8" />
      <path d={ribbonPath(phase, 0.3, 0)} fill="#d6ead0" opacity=".11" />
      <g fill="none" strokeLinecap="round">
        <path d={centerPath(phase, -57, -0.12)} stroke="#d4ead9" strokeWidth="1.35" opacity=".62" />
        <path d={centerPath(phase, -29, 0.08)} stroke="#d5f0df" strokeWidth="1" opacity=".66" />
        <path d={centerPath(phase, 0, -0.02)} stroke="#174d43" strokeWidth="1.3" opacity=".45" />
        <path d={centerPath(phase, 34, 0.12)} stroke="#d7efe0" strokeWidth="1" opacity=".58" />
        <path d={centerPath(phase, 62, -0.1)} stroke="#155a4a" strokeWidth="1.1" opacity=".34" />
        <path d={centerPath(phase, -8, 0.24)} stroke="#b6d8c6" strokeWidth=".75" opacity=".42" />
      </g>
      <g className="flow-bubbles">
        {bubbles.map(({ x, y, radius, index }) => (
          <g key={index} className={`flow-bubble flow-bubble-${index % 4}`}>
            <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={radius.toFixed(1)} fill={index % 5 === 0 ? "#cfad72" : "#e7f2dd"} opacity={index % 5 === 0 ? ".68" : ".56"} />
            {index % 3 === 0 && <circle cx={(x - 1).toFixed(1)} cy={(y - 1).toFixed(1)} r={(radius * 0.28).toFixed(1)} fill="#fffdf4" opacity=".8" />}
          </g>
        ))}
      </g>
      <circle className="flow-seed-halo" cx={seedX.toFixed(1)} cy={seedY.toFixed(1)} r="18" fill="#d5ead3" opacity=".32" />
    </>
  );
}

export function LivingFlowScene({ pose }: { pose?: number }) {
  const ref = useRef<HTMLElement>(null);
  const motion = useFlowMotion(ref, pose === undefined);
  const time = pose === undefined ? motion.time : pose * 5.5;
  const progress = pose ?? Math.min(1, time / 5.5);
  const phase = time < 5.5 ? time * 0.82 : 4.51 + (time - 5.5) * 0.15;
  const id = useId().replace(/:/g, "");
  const [seedX, seedY] = pointAt(0.68, phase);
  const scale = 0.32 + 0.68 * Math.min(1, time / 2.2);
  const displayedSeedX = 400 + (seedX - 400) * scale;
  const displayedSeedY = 320 + (seedY - 320) * scale;
  return (
    <figure
      ref={ref}
      className="living-flow-scene"
      data-pose={progress.toFixed(3)}
      data-paused={motion.paused}
      data-settled={progress === 1}
    >
      <div className="flow-theatre">
        <svg
          className="flow-artwork"
          style={{
            opacity: Math.min(1, time / 0.8),
            transform: `scale(${scale})`,
          }}
          viewBox="0 0 800 640"
          aria-hidden="true"
          focusable="false"
        >
          <FlowArtwork phase={phase} id={id} />
        </svg>
        <IdeaSeed style={{ left: `${(displayedSeedX / 800) * 100}%`, top: `${(displayedSeedY / 640) * 100}%` }} />
      </div>
      <figcaption>好奇心，让知识有了流动的形状。</figcaption>
    </figure>
  );
}
