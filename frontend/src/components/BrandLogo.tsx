import { useId } from "react";

/**
 * Knowledge.Show(me) — Luminous Prismatic Origami-K Monogram
 * Sculpted slender crystal pillar interlocked with luminous emerald-cerulean-violet
 * translucent glass ribbons, an additive peach-gold refractive heart, and a curved 4-point starlight aperture.
 */
export function BrandLogo({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="brand-logo-svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="6" y1="6" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#f3fbf9" />
          <stop offset="100%" stopColor="#faf4ff" />
        </linearGradient>
        <linearGradient id={`${id}-spine`} x1="20" y1="15" x2="36" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f3c42" />
          <stop offset="55%" stopColor="#146368" />
          <stop offset="100%" stopColor="#1a827d" />
        </linearGradient>
        <linearGradient id={`${id}-upper`} x1="36" y1="14" x2="88" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#35ecc6" />
          <stop offset="52%" stopColor="#10b8a0" />
          <stop offset="100%" stopColor="#1e8ae0" />
        </linearGradient>
        <linearGradient id={`${id}-lower`} x1="36" y1="50" x2="88" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#269be8" />
          <stop offset="55%" stopColor="#4f6ef2" />
          <stop offset="100%" stopColor="#7b5ae6" />
        </linearGradient>
        <linearGradient id={`${id}-heart`} x1="37" y1="32" x2="84" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.86" />
          <stop offset="44%" stopColor="#ffd28a" stopOpacity="0.72" />
          <stop offset="76%" stopColor="#ff9a7b" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#92f7e5" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {/* Luminous porcelain tile */}
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="26"
        fill={`url(#${id}-tile)`}
        stroke="#10a894"
        strokeOpacity="0.24"
        strokeWidth="2.2"
      />

      {/* Sculpted slender crystal K-pillar (angled prism bevels) */}
      <path
        d="M21 23.5 C21 19.2 24.4 16 28.8 16 C31.6 16 33.4 18 33.4 20.8 L33.4 79.2 C33.4 82 31.6 84 28.8 84 C24.4 84 21 80.8 21 76.5 Z"
        fill={`url(#${id}-spine)`}
      />
      <path
        d="M24.8 22.5 L24.8 77.5"
        stroke="#7efae3"
        strokeOpacity="0.45"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Upper Luminous Aurora-Emerald Glass Ribbon */}
      <path
        d="M36.8 47.4 L50.8 17.8 C52.6 14 57.6 13.1 60.8 16 L86.6 43 C89.3 45.8 87.3 49.4 83.2 49.4 L38.6 49.4 C37 49.4 36.2 48.7 36.8 47.4 Z"
        fill={`url(#${id}-upper)`}
      />

      {/* Lower Luminous Cerulean-Violet Glass Ribbon */}
      <path
        d="M36.8 52.6 L50.8 82.2 C52.6 86 57.6 86.9 60.8 84 L86.6 57 C89.3 54.2 87.3 50.6 83.2 50.6 L38.6 50.6 C37 50.6 36.2 51.3 36.8 52.6 Z"
        fill={`url(#${id}-lower)`}
      />

      {/* Refractive Sunburst-Gold Optical Heart */}
      <path
        d="M37.8 50 L59.5 31 L85.5 50 L59.5 69 Z"
        fill={`url(#${id}-heart)`}
      />
      <path
        d="M39 50 L84.5 50"
        stroke="#ffffff"
        strokeOpacity="0.88"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Curved 4-point Starlight Aperture */}
      <path
        d="M59.5 39.5 Q59.5 50 70 50 Q59.5 50 59.5 60.5 Q59.5 50 49 50 Q59.5 50 59.5 39.5 Z"
        fill="#ffffff"
      />
      <circle cx="59.5" cy="50" r="2.3" fill="#f09c38" />
    </svg>
  );
}
