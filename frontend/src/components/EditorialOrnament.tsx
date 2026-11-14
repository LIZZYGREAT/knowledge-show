import { useId } from "react";
import "./editorial-ornament.css";

type Leaf = readonly [number, number, number, number];
function Leaves({ leaves }: { leaves: readonly Leaf[] }) {
  return <>{leaves.map(([x, y, rotate, scale], i) => (
    <g key={i} transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path className="ornament-leaf" d="M0 0 C-8 -8 -8 -22 0 -31 C10 -21 10 -8 0 0Z" />
      <path className="ornament-vein" d="M0 -1 Q2 -13 0 -27" />
    </g>
  ))}</>;
}

export function EditorialOrnament({ variant = "river", className = "" }: {
  variant?: "river" | "sprig" | "hem"; className?: string;
}) {
  const id = useId().replace(/:/g, "");
  if (variant === "sprig") return (
    <svg className={`editorial-ornament ornament-sprig ${className}`} viewBox="0 0 180 110" aria-hidden="true" focusable="false">
      <path className="ornament-stem" d="M8 102 C61 96 112 63 161 12 M38 94 Q61 67 62 43 M76 77 Q104 76 130 83 M112 53 Q115 30 110 14" />
      <Leaves leaves={[[41, 92, -62, .7], [56, 78, -18, .85], [65, 62, 32, .58], [79, 76, 65, .8], [101, 61, -34, .9], [119, 45, 56, .78], [137, 29, -13, .64], [116, 79, 105, .48]]} />
      <path className="ornament-gold" d="M20 107 C72 106 120 73 158 38" />
      <circle className="ornament-gold-dot" cx="163" cy="26" r="2.5" />
      <circle className="ornament-dot" cx="88" cy="43" r="1.6" />
      <path className="ornament-tick" d="M139 62l5 4m2-14 6 2m-16 18 3 4" />
    </svg>
  );
  if (variant === "hem") return (
    <svg className={`editorial-ornament ornament-hem ${className}`} viewBox="0 0 300 40" aria-hidden="true" focusable="false">
      <path className="ornament-stem" d="M4 24 C56 9 96 36 149 22 S236 10 296 22" />
      <path className="ornament-gold" d="M36 30 Q97 38 160 26 T268 27" />
      <path className="ornament-stem" d="M179 17 Q195 12 209 2" />
      <Leaves leaves={[[185, 15, -45, .43], [198, 10, 28, .43], [217, 15, 80, .34]]} />
      <circle className="ornament-gold-dot" cx="24" cy="22" r="2" />
      <path className="ornament-tick" d="M239 8v-3m9 5 1-4m9 7 2-3" />
    </svg>
  );
  return (
    <div className={`creation-flourish ${className}`} aria-hidden="true">
      <svg className="editorial-ornament ornament-river" viewBox="0 0 1000 100" fill="none" focusable="false">
        <defs>
          <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#9abda4" stopOpacity="0" />
            <stop offset=".32" stopColor="#9abda4" stopOpacity=".22" />
            <stop offset=".65" stopColor="#b9d1a6" stopOpacity=".35" />
            <stop offset="1" stopColor="#9abda4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 58 C140 20 192 84 347 54 S540 34 650 53 820 84 1000 43 L1000 52 C820 96 751 74 649 65 S477 31 348 65 140 36 0 67Z" fill={`url(#${id}-wash)`} />
        {[0, 5, 10].map((y, i) => <path key={y} className="ornament-current" opacity={.65 - i * .17} transform={`translate(0 ${y})`} d="M0 54 C140 16 192 80 347 50 S540 30 650 49 820 80 1000 39" />)}
        <path className="ornament-gold flourish-gold" d="M85 62 C199 90 290 66 380 49 S533 41 590 52 M675 64 Q799 91 934 56" />
        <g className="river-botanical">
          <path className="ornament-stem" d="M122 48 Q176 36 219 5 M171 32 Q178 13 178 4 M788 63 Q830 47 866 12 M822 48 Q845 49 864 43" />
          <Leaves leaves={[[145, 43, -67, .56], [167, 34, -35, .65], [186, 25, 42, .65], [204, 15, -13, .48], [803, 58, -45, .62], [822, 48, 64, .69], [842, 34, -20, .68], [854, 46, 85, .48]]} />
          <path className="ornament-tick" d="m267 41 1-5m10 3 2-6m10 2 3-4m405 38 1 5m9-4 2 5m9-4 2 4" />
          <circle className="ornament-gold-dot" cx="241" cy="38" r="2.4" />
          <circle className="ornament-dot" cx="763" cy="70" r="2.2" />
          <circle className="ornament-dot" cx="748" cy="76" r="1.2" />
          <path className="ornament-gold" d="m488 43 4-5 4 5-4 5Z" />
        </g>
        <g className="river-mobile">
          <path className="ornament-stem" d="M630 48 Q662 33 680 15" />
          <Leaves leaves={[[649, 37, -35, .55], [666, 28, 42, .55]]} />
        </g>
      </svg>
    </div>
  );
}
