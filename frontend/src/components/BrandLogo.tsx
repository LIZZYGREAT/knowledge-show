import { useId } from "react";

/**
 * Knowledge.Show(me) — Origami Prism-K Monogram
 * Three interlocking geometric glass planes forming a sculpted "K" and a forward
 * optical Play-Prism "▷" with a curved 4-point caustic aperture at its refractive core.
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
          <stop offset="56%" stopColor="#f2fbf8" />
          <stop offset="100%" stopColor="#fdf6e9" />
        </linearGradient>
        <linearGradient id={`${id}-spine`} x1="18" y1="14" x2="34" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a2824" />
          <stop offset="100%" stopColor="#175c52" />
        </linearGradient>
        <linearGradient id={`${id}-upper`} x1="40" y1="16" x2="86" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1ed0ae" />
          <stop offset="58%" stopColor="#0e9f87" />
          <stop offset="100%" stopColor="#0b7f76" />
        </linearGradient>
        <linearGradient id={`${id}-lower`} x1="38" y1="50" x2="84" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0e9888" />
          <stop offset="50%" stopColor="#1c80d6" />
          <stop offset="100%" stopColor="#2664c4" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="38" y1="36" x2="82" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.68" />
          <stop offset="48%" stopColor="#ffe7b5" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#8df4e1" stopOpacity="0.24" />
        </linearGradient>
      </defs>

      {/* Architectural porcelain tile */}
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="26"
        fill={`url(#${id}-tile)`}
        stroke="#0f967d"
        strokeOpacity="0.22"
        strokeWidth="2.4"
      />

      {/* Plane 1: Left Obsidian-Teal "K" Pillar */}
      <path
        d="M19 25 C19 19.5 23 16 28.5 16 C32 16 34.5 18.4 34.5 22 L34.5 78 C34.5 81.6 32 84 28.5 84 C23 84 19 80.5 19 75 Z"
        fill={`url(#${id}-spine)`}
      />
      <path
        d="M23.5 23 L23.5 77"
        stroke="#42d9bd"
        strokeOpacity="0.32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Plane 2: Upper Origami Jade Wing */}
      <path
        d="M39.5 47.5 L51.5 19 C53.2 15.2 58.2 14.3 61.2 17.2 L85.5 43.2 C88.2 46.1 86.2 49.5 82.2 49.5 L41.5 49.5 C39.7 49.5 38.8 49 39.5 47.5 Z"
        fill={`url(#${id}-upper)`}
      />

      {/* Plane 3: Lower Sapphire-Teal Optical Wing */}
      <path
        d="M39.5 52.5 L51.5 81 C53.2 84.8 58.2 85.7 61.2 82.8 L85.5 56.8 C88.2 53.9 86.2 50.5 82.2 50.5 L41.5 50.5 C39.7 50.5 38.8 51 39.5 52.5 Z"
        fill={`url(#${id}-lower)`}
      />

      {/* Overlapping Optical Glass Refraction Diamond */}
      <path
        d="M40.5 50 L60.5 32.5 L84.5 50 L60.5 67.5 Z"
        fill={`url(#${id}-core)`}
      />
      <path
        d="M41.5 50 L83.5 50"
        stroke="#ffffff"
        strokeOpacity="0.78"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Curved 4-point Optical Starlight Aperture */}
      <path
        d="M60.5 40.5 Q60.5 50 70 50 Q60.5 50 60.5 59.5 Q60.5 50 51 50 Q60.5 50 60.5 40.5 Z"
        fill="#fffaf0"
      />
      <circle cx="60.5" cy="50" r="2.6" fill="#ee9a38" />
    </svg>
  );
}
