import type { ReactNode } from "react";

/**
 * Crisp, high-contrast brand micro-illustrations integrated directly into real UI slots
 * (topic spark chips, workflow steps, and narrative mode cards).
 * Never used as pale floating corner stickers.
 */

export function TopicIcon({ topicKey }: { topicKey: "birthday" | "attention" | "rainbow" | "time" }) {
  switch (topicKey) {
    case "birthday":
      return (
        <svg className="ui-micro-icon" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2.5" y="4" width="15" height="13.5" rx="3.5" fill="#fff7ed" stroke="#d97a29" strokeWidth="1.5" />
          <path d="M2.5 8.2 H17.5" stroke="#d97a29" strokeWidth="1.4" />
          <path d="M6.5 2.5 V5.2 M13.5 2.5 V5.2" stroke="#0f967d" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="7.4" cy="12.6" r="2.1" fill="#e35d4b" />
          <circle cx="12.6" cy="12.6" r="2.1" fill="#0f967d" />
          <path d="M9.4 12.6 H10.6" stroke="#d97a29" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "attention":
      return (
        <svg className="ui-micro-icon" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4.5 14.5 L10 5.2 L15.5 14.5" stroke="#2b80d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 14.5 L15.5 14.5" stroke="#0f967d" strokeWidth="1.4" strokeDasharray="2 2.2" />
          <circle cx="10" cy="5.2" r="2.8" fill="#f0a43b" stroke="#b96d14" strokeWidth="1.1" />
          <circle cx="4.5" cy="14.5" r="2.2" fill="#2b80d4" />
          <circle cx="15.5" cy="14.5" r="2.2" fill="#0f967d" />
        </svg>
      );
    case "rainbow":
      return (
        <svg className="ui-micro-icon" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2 12.2 L7.8 10.6" stroke="#e08d30" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12.2 8.8 L18 6" stroke="#e35d4b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12.8 10.4 L18 10.4" stroke="#12a68a" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12.2 12 L18 14.8" stroke="#2b80d4" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="9.6,4.2 14.2,14.8 5,14.8" fill="#dff6f0" stroke="#0f967d" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "time":
      return (
        <svg className="ui-micro-icon" width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.2" fill="#eef9f5" stroke="#0f967d" strokeWidth="1.6" />
          <path d="M10 5.6 V10 L13.4 11.8" stroke="#122926" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="10" r="1.4" fill="#e08d30" />
        </svg>
      );
  }
}

export function WorkflowStepIcon({ step }: { step: "explore" | "script" | "animate" | "tune" }) {
  switch (step) {
    case "explore":
      return (
        <svg className="ui-micro-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9.2" cy="9.2" r="5.6" fill="#e8faf4" stroke="#0f967d" strokeWidth="1.7" />
          <path d="M13.5 13.5 L17.2 17.2" stroke="#0f967d" strokeWidth="2" strokeLinecap="round" />
          <path d="M9.2 6.4 L9.9 8.5 L12 9.2 L9.9 9.9 L9.2 12 L8.5 9.9 L6.4 9.2 L8.5 8.5 Z" fill="#e08d30" />
        </svg>
      );
    case "script":
      return (
        <svg className="ui-micro-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2.8" y="3.5" width="14.4" height="13" rx="3" fill="#fff7ea" stroke="#d9822b" strokeWidth="1.6" />
          <path d="M6.2 7.6 H13.8 M6.2 10.6 H11.5 M6.2 13.4 H9.6" stroke="#122926" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13.8" cy="13.2" r="1.5" fill="#0f967d" />
        </svg>
      );
    case "animate":
      return (
        <svg className="ui-micro-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5.2 4.6 C5.2 3.4 6.5 2.7 7.5 3.3 L15.8 8.7 C16.8 9.3 16.8 10.7 15.8 11.3 L7.5 16.7 C6.5 17.3 5.2 16.6 5.2 15.4 Z"
            fill="#119e84"
          />
          <path d="M9.5 7.4 L10.2 9.3 L12.1 10 L10.2 10.7 L9.5 12.6 L8.8 10.7 L6.9 10 L8.8 9.3 Z" fill="#fff7e2" />
        </svg>
      );
    case "tune":
      return (
        <svg className="ui-micro-icon" width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 6.2 H16.5 M3.5 13.8 H16.5" stroke="#2b80d4" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7.5" cy="6.2" r="2.4" fill="#ffffff" stroke="#0f967d" strokeWidth="1.7" />
          <circle cx="13" cy="13.8" r="2.4" fill="#ffffff" stroke="#e08d30" strokeWidth="1.7" />
        </svg>
      );
  }
}

export function NarrativeModeIcon({ mode }: { mode: string }): ReactNode {
  switch (mode) {
    case "auto":
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5 L11.8 8.2 L17.5 10 L11.8 11.8 L10 17.5 L8.2 11.8 L2.5 10 L8.2 8.2 Z" fill="#e08d30" />
          <circle cx="10" cy="10" r="2" fill="#fff8e8" />
        </svg>
      );
    case "creative":
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <polygon points="10,2.8 16.8,14.8 3.2,14.8" fill="#e5f8f3" stroke="#0f967d" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="10" cy="10.8" r="2.1" fill="#e08d30" />
        </svg>
      );
    case "visual_explain":
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.8" fill="#edf6fe" stroke="#2b80d4" strokeWidth="1.6" />
          <circle cx="10" cy="10" r="3" fill="#0f967d" />
          <path d="M10 3.2 V5.4 M10 14.6 V16.8 M3.2 10 H5.4 M14.6 10 H16.8" stroke="#2b80d4" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "knowledge_dense":
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3.2 L16.8 6.8 L10 10.4 L3.2 6.8 Z" fill="#dff6f0" stroke="#0f967d" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3.2 10.4 L10 14 L16.8 10.4" stroke="#2b80d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.2 13.8 L10 17.2 L16.8 13.8" stroke="#e08d30" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "story":
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.2 14.5 C6.2 14.5 6.8 5.8 10.5 5.8 C13.6 5.8 14.2 11.4 16.8 11.4" stroke="#e35d4b" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="4" cy="14.5" r="2.1" fill="#0f967d" />
          <circle cx="10.5" cy="5.8" r="2.3" fill="#e08d30" />
          <circle cx="16.4" cy="11.4" r="2.1" fill="#2b80d4" />
        </svg>
      );
    default:
      return (
        <svg className="mode-svg-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M13.8 3.6 L16.4 6.2 L7.6 15 L4 16 L5 12.4 Z" fill="#fff4e0" stroke="#c8781c" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
  }
}
