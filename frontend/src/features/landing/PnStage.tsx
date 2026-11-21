import { useId } from "react";
import { easeBetween, pnState, SILK_ENDPOINT } from "./curiosityMotion";

// Luminous precision-science PN junction demonstration synchronized to the landing clock.
export function PnStage({ time }: { time: number }) {
  const id = useId().replace(/:/g, "");
  const p = pnState(time);
  const seconds = p.sceneMs / 1000;
  const reverse = easeBetween(seconds, 6, 7.25);
  const split = easeBetween(seconds, 10, 11.7);
  const current = easeBetween(seconds, 0, 1.5) * (1 - reverse * 0.965);
  const mode = seconds < 6 ? "forward" : seconds < 10 ? "reverse" : "compare";
  const textOpacity = 1 - easeBetween(p.cycle, 33.8, 34.4);
  const shellOpacity = 1 - easeBetween(p.cycle, 34.1, 35.15);
  const instrumentOpacity = 1 - easeBetween(p.cycle, 34, 34.85);

  function device(comparison = false) {
    const rotation = comparison ? 0 : reverse * 180;
    const flow = comparison ? 0.95 : current;
    const deviceScale = 1 - split * 0.4;
    const deviceX = split * (comparison ? -20 : 350);
    const deviceY = split * 133;
    const angle = (-rotation * Math.PI) / 180;
    const tx = (SILK_ENDPOINT[0] - deviceX) / deviceScale - 380;
    const ty = (SILK_ENDPOINT[1] - deviceY) / deviceScale - 332.5;
    const targetX = 380 + tx * Math.cos(angle) - ty * Math.sin(angle);
    const targetY = 332.5 + tx * Math.sin(angle) + ty * Math.cos(angle);
    const t = comparison ? 5.8 : Math.min(seconds, 10);

    return (
      <g
        data-pn-device={comparison ? "comparison" : "main"}
        opacity={comparison ? split : 1}
        transform={
          comparison
            ? `translate(${-split * 20} ${split * 133}) scale(${1 - split * 0.4})`
            : `translate(${split * 350} ${split * 133}) scale(${1 - split * 0.4})`
        }
      >
        <path
          opacity={instrumentOpacity}
          d="M590 332.5H627.5"
          stroke="#577a96"
          strokeWidth="1.8"
        />
        <g data-pn-assembly="true" transform={`rotate(${rotation} 380 332.5)`}>
          <g
            data-pn-shell="true"
            opacity={shellOpacity}
            transform={`translate(380 332.5) scale(${1 - 0.07 * easeBetween(p.cycle, 34.1, 35.15)}) translate(-380 -332.5)`}
          >
            <path
              d="M170 332.5H260M500 332.5H590"
              stroke={`url(#${id}-wire)`}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle
              cx="170"
              cy="332.5"
              r="11"
              fill="#132132"
              stroke="#6ea3ba"
              strokeWidth="1.2"
            />
            <path
              d="M165 332.5h10m-5-5v10"
              stroke="#ffd48c"
              strokeWidth="1.4"
            />
            <circle
              cx="590"
              cy="332.5"
              r="11"
              fill="#132132"
              stroke="#6ea3ba"
              strokeWidth="1.2"
            />
            <path d="M585 332.5h10" stroke="#7fead9" strokeWidth="1.4" />
            <rect
              x="258"
              y="278"
              width="244"
              height="122"
              rx="18"
              fill="#000000"
              opacity=".42"
            />
            <rect
              x="260"
              y="272.5"
              width="240"
              height="120"
              rx="16"
              fill={`url(#${id}-ceramic)`}
              stroke="#4d728f"
              strokeWidth="1.2"
            />
            <rect
              x="269"
              y="281"
              width="222"
              height="102"
              rx="11"
              fill={`url(#${id}-tint)`}
            />
            <path
              d="M277 282H482"
              stroke="#b7e2f4"
              strokeWidth="1.2"
              strokeOpacity=".45"
            />
            <rect
              x="361"
              y="283"
              width="38"
              height="98"
              fill={`url(#${id}-contact)`}
            />
            <path
              d="M272 385H488"
              stroke="#97c0dc"
              strokeOpacity=".2"
            />
          </g>
          {Array.from({ length: 32 }, (_, i) => {
            const initial = (i * 37 + 900) % 1150;
            const age = Math.max(0, t - 6);
            let x = 165 + ((i * 37 + t * 150) % 1150);
            if (!comparison && t >= 6 && initial < 595) {
              const travel = initial + age * 150;
              x =
                165 +
                (travel < 595
                  ? travel
                  : travel % 1190 <= 595
                    ? travel % 1190
                    : 1190 - (travel % 1190));
            }
            if (!comparison && t >= 6 && i % 15 === 0) {
              x = 165 + ((i * 37 + 900 + age * 70) % 1150);
            }
            const body =
              Math.max(0, Math.min(1, (x - 520) / 90)) *
              Math.max(0, Math.min(1, (1000 - x) / 90));
            const y =
              465 + body * (((i % 5) - 2) * 25 + Math.sin(i * 2.1 + t * 2) * 4);
            const opacity =
              !comparison && t >= 6 && initial >= 595 && i % 15 !== 0
                ? Math.max(0, 1 - age / 1.3)
                : 0.96;
            const gather = easeBetween(
              p.cycle,
              34.35 + (i % 8) * 0.025 + (comparison ? 0.06 : 0),
              35.95,
            );
            const bend =
              Math.sin(gather * Math.PI) *
              (comparison ? -1 : 1) *
              (18 + (i % 4) * 6);
            const px = x * 0.5 + (targetX - x * 0.5) * gather;
            const py = 100 + y * 0.5 + (targetY - 100 - y * 0.5) * gather + bend;
            const source = i % 2 ? [102, 232, 245] : [255, 138, 122];
            const gold = [245, 198, 120];
            const color = `rgb(${source
              .map((v, channel) => Math.round(v + (gold[channel] - v) * gather))
              .join(",")})`;
            return (
              <circle
                key={i}
                data-pn-particle="true"
                cx={px}
                cy={py}
                r={(i % 2 ? 2.7 : 3.2) * (1 - gather * 0.65)}
                fill={color}
                stroke="#ffffff"
                strokeWidth={0.45 * (1 - gather)}
                opacity={opacity * (i % 3 ? 1 - gather * 0.72 : 1)}
              />
            );
          })}
        </g>
        <g data-pn-meter="true" opacity={instrumentOpacity}>
          <circle
            cx="680"
            cy="332.5"
            r="53"
            fill="#0d1726"
            stroke="#4c6f8d"
            strokeWidth="1.2"
          />
          <circle cx="680" cy="332.5" r="48" fill={`url(#${id}-dial)`} />
          {Array.from({ length: 25 }, (_, i) => {
            const a = ((200 + (i * 140) / 24) * Math.PI) / 180;
            const r = i % 4 === 0 ? 38.5 : 41;
            return (
              <path
                key={i}
                d={`M${680 + Math.cos(a) * r} ${332.5 + Math.sin(a) * r}L${680 + Math.cos(a) * 45} ${332.5 + Math.sin(a) * 45}`}
                stroke={i % 4 === 0 ? "#85b8d4" : "#4b6982"}
                strokeWidth={i % 4 === 0 ? ".9" : ".65"}
              />
            );
          })}
          <text x="642" y="342" className="pn-meter-label">
            0
          </text>
          <path
            data-pn-needle="true"
            d="M680 332.5L643 319"
            stroke="#f5c678"
            strokeWidth="2.1"
            strokeLinecap="round"
            transform={`rotate(${flow * 140} 680 332.5)`}
          />
          <circle cx="680" cy="332.5" r="4" fill="#f5c678" />
          <text x="680" y="362" textAnchor="middle" className="pn-meter-label">
            电流
          </text>
        </g>
      </g>
    );
  }

  const reverseTitle = easeBetween(seconds, 5.7, 6.3);
  const compareTitle = easeBetween(seconds, 10, 10.6);

  return (
    <g
      className="stage-pn"
      opacity={p.opacity}
      data-scene-ms={p.sceneMs.toFixed(0)}
      data-pn-mode={mode}
    >
      <defs>
        <linearGradient id={`${id}-ceramic`} x2=".2" y2="1">
          <stop stopColor="#1e3148" />
          <stop offset=".55" stopColor="#152437" />
          <stop offset="1" stopColor="#0f1b2b" />
        </linearGradient>
        <linearGradient id={`${id}-tint`}>
          <stop stopColor="#ff8b7b" stopOpacity=".24" />
          <stop offset=".48" stopColor="#1c2f44" stopOpacity=".14" />
          <stop offset="1" stopColor="#52d6ec" stopOpacity=".28" />
        </linearGradient>
        <linearGradient id={`${id}-contact`}>
          <stop stopColor="#f5c678" stopOpacity="0" />
          <stop offset=".5" stopColor="#f5c678" stopOpacity=".3" />
          <stop offset="1" stopColor="#f5c678" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-wire`} x2="0" y2="1">
          <stop stopColor="#8bb6cf" />
          <stop offset="1" stopColor="#466982" />
        </linearGradient>
        <radialGradient id={`${id}-dial`}>
          <stop stopColor="#16263a" />
          <stop offset="1" stopColor="#0b1422" />
        </radialGradient>
      </defs>
      {(
        [
          ["同一个结，电流畅行", 1 - reverseTitle],
          ["接法一换，电流受阻", reverseTitle * (1 - compareTitle)],
          ["同一个结，两个方向", compareTitle],
        ] as const
      ).map(([text, opacity]) => (
        <text
          key={text}
          x="400"
          y="97"
          textAnchor="middle"
          className="pn-question"
          opacity={Number(opacity) * textOpacity}
        >
          {text}
        </text>
      ))}
      {device()}
      {device(true)}
      <g opacity={(1 - split) * textOpacity}>
        <text
          x="380"
          y="441"
          textAnchor="middle"
          className="pn-explanation"
          opacity={1 - reverseTitle}
        >
          载流子通过，指针随之偏转
        </text>
        <text
          x="380"
          y="441"
          textAnchor="middle"
          className="pn-explanation"
          opacity={reverseTitle}
        >
          大部分载流子折返，只剩微弱电流
        </text>
      </g>
    </g>
  );
}
