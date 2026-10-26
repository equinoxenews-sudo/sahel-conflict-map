import type { EspaceSection } from "@/lib/espace";

// Icônes du menu de « Mon espace » : traits fins, une seule teinte (celle du texte), même famille que celles du site.
export default function EspaceIcon({ name }: { name: EspaceSection }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;

  switch (name) {
    case "menu":
      // Quatre tuiles : la vue d'ensemble.
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
        </svg>
      );
    case "notes":
      // Une feuille au coin replié, avec ses lignes.
      return (
        <svg {...common}>
          <path d="M6.5 3.5h7l4 4v13h-11z" />
          <path d="M13.5 3.5v4h4" />
          <path d="M9 12h6M9 15.5h6M9 9h2" />
        </svg>
      );
    case "graph":
      // Trois nœuds reliés : le graphe de relations.
      return (
        <svg {...common}>
          <circle cx="12" cy="5.5" r="2.4" />
          <circle cx="5.5" cy="18" r="2.4" />
          <circle cx="18.5" cy="18" r="2.4" />
          <path d="M12 8v3.6M12 11.6l-5 4.4M12 11.6l5 4.4" />
        </svg>
      );
    case "investigation":
      // Une loupe : la recherche.
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5.5 5.5" />
          <path d="M8 10.5h5M10.5 8v5" />
        </svg>
      );
    case "supervision":
      // Un œil : la veille.
      return (
        <svg {...common}>
          <path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "tracking":
      // Un viseur : le suivi d'un navire ou d'un avion.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
        </svg>
      );
    case "outils":
      // Une boîte à outils.
      return (
        <svg {...common}>
          <rect x="3.5" y="8" width="17" height="11.5" rx="2" />
          <path d="M9 8V6.2A1.2 1.2 0 0 1 10.2 5h3.6A1.2 1.2 0 0 1 15 6.2V8" />
          <path d="M3.5 13.2h17M10.5 13.2v2.2h3v-2.2" />
        </svg>
      );
  }
}
