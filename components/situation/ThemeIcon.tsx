import type { ThemeKey } from "@/lib/themes";

// Pictogrammes au trait (24 x 24), un par thématique de la taxonomie Équinoxe.
const PATHS: Record<ThemeKey, React.ReactNode> = {
  // Viseur
  conflicts: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
    </>
  ),
  // Triangle d'alerte
  terrorism: (
    <>
      <path d="M12 3.5 21.5 20h-19z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  // Mégaphone
  civil_unrest: (
    <>
      <path d="M3 10v4h3l6 4V6L6 10z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  // Bâtiment à colonnes
  politics: (
    <>
      <path d="M3 9.5 12 4l9 5.5z" />
      <path d="M5.5 11v7M9.5 11v7M14.5 11v7M18.5 11v7M3 20.5h18" />
    </>
  ),
  // Globe
  diplomacy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3.5 3.2 3.5 14.8 0 18M12 3c-3.5 3.2-3.5 14.8 0 18" />
    </>
  ),
  // Bouclier
  defense_security: <path d="M12 3 20 6v6c0 4.8-3.4 7.8-8 9-4.6-1.2-8-4.2-8-9V6z" />,
  // Œil
  intelligence_influence: (
    <>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  // Terminal
  cyber_technology: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7.5 9.5 3 2.5-3 2.5M12.5 15h4" />
    </>
  ),
  // Courbe en hausse
  economy: (
    <>
      <path d="M4 4v16h16" />
      <path d="m8 15 3.5-4 3 2.5L19 7" />
    </>
  ),
  // Éclair
  energy_resources: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  // Colis
  infrastructure_logistics: (
    <>
      <path d="m21 8-9-5-9 5v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </>
  ),
  // Nuage
  climate_disasters: <path d="M7 18.5a4.2 4.2 0 0 1-.6-8.3 5.6 5.6 0 0 1 10.8-.9A4.7 4.7 0 0 1 17 18.5z" />,
  // Croix médicale
  humanitarian_health: <path d="M9 3.5h6V9h5.5v6H15v5.5H9V15H3.5V9H9z" />,
  // Cadenas
  crime_trafficking: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  // Boussole
  strategic_development: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5z" />
    </>
  ),
};

interface ThemeIconProps {
  theme: ThemeKey | null;
  size?: number;
}

export default function ThemeIcon({ theme, size = 16 }: ThemeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {theme ? PATHS[theme] : <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
