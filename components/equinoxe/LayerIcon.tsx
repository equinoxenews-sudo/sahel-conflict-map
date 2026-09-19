import type { LayerKey } from "@/lib/layers/types";

interface LayerIconProps {
  layerKey: LayerKey;
  color?: string;
}

// Minimal line icons, hand-drawn to roughly match each layer's concept —
// not a full icon library dependency for just nine glyphs.
export default function LayerIcon({ layerKey, color }: LayerIconProps) {
  if (layerKey === "risk") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <circle cx="12" cy="12" r="6" fill={color ?? "currentColor"} />
      </svg>
    );
  }

  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (layerKey) {
    case "aircraft":
      return (
        <svg {...common}>
          <path d="M2 16l20-6-20-6v5l13 1-13 1z" />
        </svg>
      );
    case "satellites":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <line x1="4" y1="4" x2="9" y2="9" />
          <line x1="20" y1="4" x2="15" y2="9" />
          <line x1="4" y1="4" x2="4" y2="8" />
          <line x1="20" y1="4" x2="20" y2="8" />
          <line x1="15" y1="15" x2="18" y2="19" />
        </svg>
      );
    case "vessels":
      return (
        <svg {...common}>
          <path d="M4 17h16l-2 4H6z" />
          <line x1="12" y1="17" x2="12" y2="3" />
          <path d="M12 4l6 6h-6z" />
        </svg>
      );
    case "earthquakes":
      return (
        <svg {...common}>
          <path d="M2 13h4l2-6 4 12 2-10 2 6h6" />
        </svg>
      );
    case "wildfires":
      return (
        <svg {...common}>
          <path d="M12 2c-3 4-5 6-5 10a5 5 0 0 0 10 0c0-1.5-.6-2.5-1.3-3.3.1 1.6-.7 2.6-1.5 2.6.8-2.3-.5-5-2.2-9.3z" />
        </svg>
      );
    case "storms":
      return (
        <svg {...common}>
          <path d="M7 16a4 4 0 1 1 .9-7.9A5 5 0 0 1 17 10a3.2 3.2 0 0 1-1 6.2H7z" />
          <line x1="9" y1="19" x2="9" y2="21" />
          <line x1="13" y1="19" x2="13" y2="21" />
        </svg>
      );
    case "volcanoes":
      return (
        <svg {...common}>
          <path d="M12 3 21 20H3Z" />
          <path d="M9 13l1.5-2.5L12 13l1-1.5L15 13" />
        </svg>
      );
    case "floods":
      return (
        <svg {...common}>
          <path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          <path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        </svg>
      );
    case "launches":
      return (
        <svg {...common}>
          <path d="M12 2c3 3 4 7 4 11 0 2-1 4-4 6-3-2-4-4-4-6 0-4 1-8 4-11z" />
          <circle cx="12" cy="9" r="1.4" fill="currentColor" stroke="none" />
          <path d="M8 15l-3 4M16 15l3 4" />
        </svg>
      );
    default:
      return null;
  }
}
