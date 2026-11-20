import { useId } from "react";

/**
 * Knowledge.Show(me) signature emblem:
 * Architectural "K" pillar opening into a faceted emerald-sapphire Play-Prism,
 * hinged by the warm golden "." curiosity spark and framed by an optical ")" lens arc.
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
        <linearGradient id={`${id}-bg`} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ebfaf5" />
          <stop offset="55%" stopColor="#f5fafe" />
          <stop offset="100%" stopColor="#fff5e2" />
        </linearGradient>
        <linearGradient id={`${id}-prism`} x1="14" y1="9" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#16b898" />
          <stop offset="52%" stopColor="#0e937b" />
          <stop offset="100%" stopColor="#267bd4" />
        </linearGradient>
        <linearGradient id={`${id}-facet`} x1="15" y1="10" x2="27" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#8ff2df" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Clean daylight studio tile */}
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="11.5"
        fill={`url(#${id}-bg)`}
        stroke="#0f967d"
        strokeOpacity="0.28"
        strokeWidth="1.2"
      />
      {/* Left architectural "K" pillar */}
      <rect x="8.5" y="9.5" width="4.4" height="21" rx="2.2" fill="#122926" />
      {/* Sculpted Play-Prism emerging from K */}
      <path
        d="M15.2 11.4 C15.2 9.8 17 8.8 18.4 9.7 L30.2 17.9 C31.5 18.8 31.5 21.2 30.2 22.1 L18.4 30.3 C17 31.2 15.2 30.2 15.2 28.6 Z"
        fill={`url(#${id}-prism)`}
      />
      {/* Optical glass upper bevel */}
      <path
        d="M16.1 11.8 C16.1 10.9 17.1 10.4 17.9 10.9 L28.4 18.3 L16.1 20 Z"
        fill={`url(#${id}-facet)`}
      />
      {/* Golden "." curiosity spark at the K-to-Show hinge */}
      <circle cx="15.2" cy="20" r="3.1" fill="#fff7e2" />
      <circle cx="15.2" cy="20" r="2.2" fill="#ee9a38" />
      {/* Subtle optical ")" lens arc echoing (me) */}
      <path
        d="M32.8 12.2 C35.2 16.5 35.2 23.5 32.8 27.8"
        stroke="#e08d30"
        strokeOpacity="0.72"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
