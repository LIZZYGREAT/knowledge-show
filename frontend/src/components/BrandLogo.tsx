import { useId } from "react";

/**
 * knowledge.show signature emblem:
 * An optical prism / play silhouette enclosing a warm golden curiosity spark,
 * uniting "Knowledge" (clarity through a prism), "Show" (motion & play),
 * and the spark of curiosity.
 */
export function BrandLogo({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="brand-logo-svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e8faf4" />
          <stop offset="55%" stopColor="#f3f9fd" />
          <stop offset="100%" stopColor="#fff4e0" />
        </linearGradient>
        <linearGradient id={`${id}-prism`} x1="11" y1="8" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16b394" />
          <stop offset="55%" stopColor="#0f967d" />
          <stop offset="100%" stopColor="#2d82d6" />
        </linearGradient>
        <linearGradient id={`${id}-facet`} x1="12" y1="10" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#7ef0da" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {/* Rounded studio tile */}
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="11.5"
        fill={`url(#${id}-bg)`}
        stroke="#0f967d"
        strokeOpacity="0.24"
        strokeWidth="1.2"
      />
      {/* Delicate orbital arc */}
      <path
        d="M8.5 29.5 C11.5 34.2 28.5 34.5 32.5 25.5"
        stroke="#e08d30"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      {/* Sculpted play-prism body */}
      <path
        d="M12.5 11.2 C12.5 9.3 14.6 8.2 16.2 9.2 L30.4 17.8 C32 18.8 32 21.2 30.4 22.2 L16.2 30.8 C14.6 31.8 12.5 30.7 12.5 28.8 Z"
        fill={`url(#${id}-prism)`}
      />
      {/* Optical glass top facet */}
      <path
        d="M13.6 11.6 C13.6 10.5 14.8 9.9 15.7 10.4 L28.4 18.2 L13.6 20 Z"
        fill={`url(#${id}-facet)`}
      />
      {/* Warm golden curiosity 4-point spark at prism heart */}
      <path
        d="M19.8 15.2 L20.9 18.7 L24.4 19.8 L20.9 20.9 L19.8 24.4 L18.7 20.9 L15.2 19.8 L18.7 18.7 Z"
        fill="#fff8e6"
      />
      <circle cx="19.8" cy="19.8" r="1.6" fill="#f0a43b" />
    </svg>
  );
}
