import "./ambient-motifs.css";

/**
 * Subtle daylight scientific-atelier visual motifs decorating wide page margins.
 * Strictly non-interactive, hidden from assistive tech, and auto-hidden on smaller screens.
 */
export function AmbientMotifs({ variant = "hero" }: { variant?: "hero" | "studio" }) {
  return (
    <div className={`ambient-motifs ambient-${variant}`} aria-hidden="true">
      {/* Top-left delicate prism + spark */}
      <svg className="motif motif-prism" viewBox="0 0 88 88" fill="none" focusable="false">
        <polygon
          points="44,12 74,66 14,66"
          fill="#e7f8f3"
          fillOpacity="0.65"
          stroke="#15a388"
          strokeOpacity="0.32"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <line x1="44" y1="12" x2="44" y2="66" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
        <path
          d="M62 20 L63.5 24.5 L68 26 L63.5 27.5 L62 32 L60.5 27.5 L56 26 L60.5 24.5 Z"
          fill="#e89a38"
          fillOpacity="0.72"
        />
      </svg>

      {/* Bottom-left gentle wave & coordinate ticks */}
      <svg className="motif motif-wave" viewBox="0 0 120 56" fill="none" focusable="false">
        <path
          d="M6 30 Q26 8 46 30 T86 30 T114 26"
          stroke="#2d82d6"
          strokeOpacity="0.28"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6 38 Q26 18 46 38 T86 38 T114 34"
          stroke="#16a88c"
          strokeOpacity="0.22"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
        <circle cx="46" cy="30" r="3.2" fill="#f0a43b" fillOpacity="0.7" />
        <circle cx="86" cy="30" r="2.6" fill="#16a88c" fillOpacity="0.6" />
      </svg>

      {/* Top-right orbital atom ring */}
      <svg className="motif motif-orbit" viewBox="0 0 96 96" fill="none" focusable="false">
        <ellipse
          cx="48"
          cy="48"
          rx="36"
          ry="16"
          transform="rotate(-24 48 48)"
          stroke="#0f967d"
          strokeOpacity="0.24"
          strokeWidth="1.2"
          strokeDasharray="3 5"
        />
        <ellipse
          cx="48"
          cy="48"
          rx="26"
          ry="12"
          transform="rotate(32 48 48)"
          stroke="#e08d30"
          strokeOpacity="0.26"
          strokeWidth="1.2"
        />
        <circle cx="48" cy="48" r="4.5" fill="#fef0d4" stroke="#e08d30" strokeWidth="1.4" />
        <circle cx="77" cy="35" r="3" fill="#2d82d6" fillOpacity="0.65" />
        <circle cx="23" cy="60" r="2.5" fill="#16a88c" fillOpacity="0.7" />
      </svg>
    </div>
  );
}
