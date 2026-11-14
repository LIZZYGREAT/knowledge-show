import { useId, useRef, type CSSProperties } from "react";
import "./paper-stage.css";
import { usePaperMotion } from "./usePaperMotion";

type Point = readonly [number, number];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const points = (p: Point[]) => p.map((v) => v.join(",")).join(" ");
// One sheet, fixed hinges. A normalized pose can be reviewed independently of time.
export function paperPose(progress: number) {
  const spread = ease(progress / 0.6);
  const unfold = ease((progress - 0.18) / 0.55);
  const pop = ease((progress - 0.48) / 0.48);
  const left: Point = [lerp(165, 70, spread), 350];
  const back: Point = [360, lerp(260, 220, spread)];
  const right: Point = [lerp(555, 650, spread), 350];
  const front: Point = [360, lerp(440, 495, spread)];
  const rise = 180 * unfold;
  // The bead reaches the crease before the pop-up unfolds, then rolls to the front.
  const roll = ease((progress - 0.32) / 0.68);
  return {
    spread,
    unfold,
    pop,
    left,
    back,
    right,
    front,
    rise,
    seed: [
      lerp(225, 532, roll),
      lerp(317, 365, roll) - Math.sin(roll * Math.PI) * 60,
    ] as Point,
  };
}
export function IdeaSeed({ style }: { style?: CSSProperties }) {
  return (
    <span className="idea-seed" style={style} aria-hidden="true">
      <span className="seed-core" />
    </span>
  );
}
export function PaperShape({ progress }: { progress: number }) {
  const id = useId().replace(/:/g, "");
  const p = paperPose(progress);
  const [a, b, c, d] = [p.left, p.back, p.right, p.front];
  return (
    <svg
      className="paper-shape"
      viewBox="0 0 720 560"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-floor`}
          x1="150"
          y1="250"
          x2="500"
          y2="480"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffef6" />
          <stop offset="1" stopColor="#e4e6d4" />
        </linearGradient>
        <linearGradient
          id={`${id}-wall`}
          x1="100"
          y1="130"
          x2="370"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f5f0de" />
          <stop offset="1" stopColor="#d9dbc6" />
        </linearGradient>
        <linearGradient
          id={`${id}-green`}
          x1="300"
          y1="230"
          x2="470"
          y2="390"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#639078" />
          <stop offset="1" stopColor="#234e39" />
        </linearGradient>
        <linearGradient
          id={`${id}-gold`}
          x1="390"
          y1="140"
          x2="610"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dfc795" />
          <stop offset="1" stopColor="#bc9b5e" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-30%"
          y="-100%"
          width="160%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <ellipse
        className="paper-ground-shadow"
        cx="365"
        cy="453"
        rx={lerp(170, 244, p.spread)}
        ry={lerp(20, 34, p.unfold)}
        fill="#44513d"
        opacity=".14"
        filter={`url(#${id}-shadow)`}
      />
      <g className="paper-sheet">
        <polygon
          points={points([a, b, c, d])}
          transform="translate(0 7)"
          fill="#c4cbb8"
        />
        <polygon
          points={points([a, b, c, d])}
          fill={`url(#${id}-floor)`}
          stroke="#d1d6c4"
        />
        <polygon
          points={points([a, [b[0], b[1] - p.rise], b])}
          fill="#c4c9b2"
        />
        <polygon
          points={points([a, [a[0], a[1] - p.rise], [b[0], b[1] - p.rise], b])}
          fill={`url(#${id}-wall)`}
          stroke="#d2d4be"
          strokeWidth="1.2"
        />
        <polygon
          points={points([
            b,
            [b[0], b[1] - p.rise],
            [c[0], c[1] - p.rise * 0.78],
            c,
          ])}
          fill="#eeead8"
          stroke="#d7d6c2"
        />
        <path
          d={`M${b[0]} ${b[1] - p.rise} V${b[1]} L${d[0]} ${d[1]}`}
          stroke="#aebaa3"
          strokeOpacity=".6"
        />
        <path
          d={`M${a.join(" ")} L${c.join(" ")}`}
          stroke="#c1c9b5"
          strokeDasharray="3 5"
        />
        <g opacity={p.unfold}>
          <path
            d={`M115 ${310 - p.rise * 0.8} L310 ${220 - p.rise * 0.8}`}
            stroke="#b9bea5"
            strokeWidth="1"
          />
          <path
            d={`M115 ${326 - p.rise * 0.65} L245 ${266 - p.rise * 0.65}`}
            stroke="#b9bea5"
            strokeWidth="1"
          />
        </g>
        <g
          transform={`translate(360 350) scale(${lerp(0.65, 1, p.spread)}) translate(-360 -350)`}
        >
          <polygon
            points={`360,220 456,${lerp(266, 122, p.pop)} 600,326 507,365`}
            fill={`url(#${id}-gold)`}
          />
          <path
            d={`M456 ${lerp(266, 122, p.pop)} L507 365`}
            stroke="#aa894f"
            opacity=".55"
          />
          <polygon
            points={`230,326 342,${lerp(280, 135, p.pop)} 440,364 340,414`}
            fill={`url(#${id}-green)`}
          />
          <polygon
            points={`342,${lerp(280, 135, p.pop)} 440,364 340,414`}
            fill="#244e38"
            opacity=".55"
          />
          <path
            d={`M342 ${lerp(280, 135, p.pop)} L340 414`}
            stroke="#9eb29a"
            opacity=".5"
          />
          <path
            d="M178 366 Q240 398 282 376"
            stroke="#93a487"
            strokeWidth="1.5"
            opacity={p.pop * 0.7}
          />
        </g>
        <ellipse
          cx={p.seed[0] + 9}
          cy={p.seed[1] + 30}
          rx="36"
          ry="12"
          fill="#36513b"
          opacity=".16"
        />
        <path
          d={`M${a.join(" ")} L${d.join(" ")} L${c.join(" ")}`}
          stroke="#fffff6"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
export function LivingPaperStage({ pose }: { pose?: number }) {
  const ref = useRef<HTMLElement>(null);
  const motion = usePaperMotion(ref, pose === undefined);
  const progress = pose ?? motion.progress;
  const p = paperPose(progress);
  return (
    <figure
      ref={ref}
      className="living-paper-stage"
      data-pose={progress.toFixed(3)}
      data-paused={motion.paused}
      data-settled={progress === 1}
    >
      <div className="paper-theatre">
        <PaperShape progress={progress} />
        <IdeaSeed
          style={{ left: `${p.seed[0] / 7.2}%`, top: `${p.seed[1] / 5.6}%` }}
        />
      </div>
      <figcaption>一个想法，展开一个会动的世界。</figcaption>
    </figure>
  );
}
