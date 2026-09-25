export type ApprocheCategoryKey =
  | "geopolitique"
  | "securite"
  | "economie"
  | "infrastructures"
  | "societes"
  | "environnement";

const common = {
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Same hand-drawn line-icon language as ZoneCategoryIcon.tsx (shared
// stroke width/viewBox) — this page's 6 categories don't map 1:1 onto
// that component's key set, so a couple of shapes are reused verbatim
// (globe, shield, people, leaf) and two new ones added (bar chart,
// network) rather than repurposing unrelated keys.
export default function ApprocheCategoryIcon({ categoryKey }: { categoryKey: ApprocheCategoryKey }) {
  switch (categoryKey) {
    case "geopolitique":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.4-3.6-8.5s1.2-6.1 3.6-8.5z" />
        </svg>
      );
    case "securite":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case "economie":
      return (
        <svg {...common}>
          <path d="M4 20V10M11 20V4M18 20v-7" />
          <path d="M3 20h18" />
        </svg>
      );
    case "infrastructures":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="18" cy="6" r="2.2" />
          <circle cx="12" cy="13" r="2.2" />
          <circle cx="6" cy="20" r="2.2" />
          <circle cx="18" cy="20" r="2.2" />
          <path d="M7.7 7.3 10.4 11.4M13.6 11.4 16.3 7.3M11.3 15 7.3 18.2M12.7 15 16.7 18.2" />
        </svg>
      );
    case "societes":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8.5" r="2.8" />
          <circle cx="16" cy="9.5" r="2.2" />
          <path d="M3.5 19c.5-3 2.4-4.8 5-4.8s4.5 1.8 5 4.8M14.5 14.8c2 .1 3.5 1.7 4 4.2" />
        </svg>
      );
    case "environnement":
      return (
        <svg {...common}>
          <path d="M5 19c8 0 14-5 14-14-8 0-14 5-14 14z" />
          <path d="M5 19c2-4 5-7 9-9" />
        </svg>
      );
    default:
      return null;
  }
}
