import { useId } from "react";
import "./editorial-ornament.css";

export function EditorialOrnament({
  variant = "river",
  className = "",
}: {
  variant?: "river" | "sprig" | "hem";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");

  if (variant === "sprig") {
    return (
      <svg
        className={`editorial-ornament ornament-sprig ${className}`}
        viewBox="0 0 160 88"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="ornament-stem"
          d="M14 70 L14 26 Q14 14 26 14 L76 14"
        />
        <path
          className="ornament-gold"
          d="M28 54 C54 48 82 32 128 18"
        />
        <circle className="ornament-gold-dot" cx="132" cy="17" r="2.6" />
        <circle className="ornament-dot" cx="26" cy="14" r="2" />
        <path
          className="ornament-tick"
          d="M92 14h6m8 0h10M14 40h6m-6 14h4"
        />
      </svg>
    );
  }

  if (variant === "hem") {
    return (
      <svg
        className={`editorial-ornament ornament-hem ${className}`}
        viewBox="0 0 280 26"
        aria-hidden="true"
        focusable="false"
      >
        <path className="ornament-stem" d="M6 13 H122 M158 13 H274" />
        <path className="ornament-gold" d="M132 13 L140 7 L148 13 L140 19 Z" />
        <circle className="ornament-gold-dot" cx="140" cy="13" r="1.8" />
        <circle className="ornament-dot" cx="104" cy="13" r="1.5" />
        <circle className="ornament-dot" cx="176" cy="13" r="1.5" />
      </svg>
    );
  }

  return (
    <div className={`creation-flourish ${className}`} aria-hidden="true">
      <svg
        className="editorial-ornament ornament-river"
        viewBox="0 0 1000 56"
        fill="none"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38d9c0" stopOpacity="0" />
            <stop offset="28%" stopColor="#38d9c0" stopOpacity=".42" />
            <stop offset="50%" stopColor="#f0b96b" stopOpacity=".75" />
            <stop offset="72%" stopColor="#38d9c0" stopOpacity=".42" />
            <stop offset="100%" stopColor="#38d9c0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38d9c0" stopOpacity="0" />
            <stop offset="50%" stopColor="#f0b96b" stopOpacity=".18" />
            <stop offset="100%" stopColor="#38d9c0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M40 28 C210 14 340 42 500 28 C660 14 790 42 960 28"
          stroke={`url(#${id}-glow)`}
          strokeWidth="12"
        />
        <path
          className="ornament-current"
          d="M40 28 C210 14 340 42 500 28 C660 14 790 42 960 28"
          stroke={`url(#${id}-beam)`}
        />
        <path
          className="ornament-gold flourish-gold"
          d="M210 30 C320 40 420 20 500 28 C580 36 680 16 790 30"
        />
        <g className="river-botanical">
          <path
            className="ornament-gold"
            d="M492 28 L500 20 L508 28 L500 36 Z"
          />
          <circle className="ornament-gold-dot" cx="500" cy="28" r="2.2" />
          <circle className="ornament-dot" cx="318" cy="25" r="1.8" />
          <circle className="ornament-dot" cx="682" cy="31" r="1.8" />
          <path
            className="ornament-tick"
            d="M180 28v-5m12 5v-3m628 3v-3m12 3v-5"
          />
        </g>
        <g className="river-mobile">
          <circle className="ornament-gold-dot" cx="500" cy="28" r="2.4" />
        </g>
      </svg>
    </div>
  );
}
