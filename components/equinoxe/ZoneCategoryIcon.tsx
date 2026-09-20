interface ZoneCategoryIconProps {
  categoryKey: string;
}

// Hand-drawn line icons, one per ZoneKnowledgeCategory key (see
// lib/zoneHubContent.ts) — same lightweight approach as LayerIcon.tsx
// rather than pulling in an icon library for a handful of glyphs.
export default function ZoneCategoryIcon({ categoryKey }: ZoneCategoryIconProps) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (categoryKey) {
    case "geopolitique":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.4-3.6-8.5s1.2-6.1 3.6-8.5z" />
        </svg>
      );
    case "groupes-armes":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        </svg>
      );
    case "economie":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.5 15.5c0 1.1 1 2 2.5 2s2.5-.7 2.5-1.8c0-2.4-5-1.4-5-3.8 0-1.1 1-1.8 2.5-1.8s2.5.9 2.5 2M12 7.5v1M12 15.5v1" />
        </svg>
      );
    case "demographie":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8.5" r="2.8" />
          <circle cx="16" cy="9.5" r="2.2" />
          <path d="M3.5 19c.5-3 2.4-4.8 5-4.8s4.5 1.8 5 4.8M14.5 14.8c2 .1 3.5 1.7 4 4.2" />
        </svg>
      );
    case "sante":
      return (
        <svg {...common}>
          <path d="M12 20.5S4 15.8 4 10.2C4 7.3 6.2 5 9 5c1.5 0 2.7.7 3 1.8C12.3 5.7 13.5 5 15 5c2.8 0 5 2.3 5 5.2 0 5.6-8 10.3-8 10.3z" />
          <path d="M9.5 11h2l1-2 1.5 4 1-2h1.5" />
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
