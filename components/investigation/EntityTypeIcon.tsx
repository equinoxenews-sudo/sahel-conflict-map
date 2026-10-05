import type { EntityType } from "@/lib/investigation/types";

// Pictogrammes au trait (24 x 24), affichés dans la pastille d'une fiche sans image.
const PATHS: Record<EntityType, React.ReactNode> = {
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c0-4 3.4-6.6 7.5-6.6s7.5 2.6 7.5 6.6" />
    </>
  ),
  organization: (
    <>
      <path d="M3.5 20.5h17M5.5 20.5V8.5l6.5-4 6.5 4v12" />
      <path d="M9 11.5h1.5M13.5 11.5H15M9 15.5h1.5M13.5 15.5H15" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5h15M6.5 20.5V6.5h11v14" />
      <path d="M9.5 10h1.5M13 10h1.5M9.5 14h1.5M13 14h1.5M11 20.5v-3h2v3" />
    </>
  ),
  equipment: (
    <>
      <path d="m14.5 6.5 3-3 3 3-3 3z" />
      <path d="M16 8 5 19l-1.5-1.5L14.5 6.5" />
      <path d="m5 13 3.5 3.5" />
    </>
  ),
  event: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  document: (
    <>
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M15.2 12v1.4a2.2 2.2 0 0 0 4.4 0V12a7.6 7.6 0 1 0-3 6" />
    </>
  ),
};

export default function EntityTypeIcon({ type, size = 28 }: { type: EntityType; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {PATHS[type]}
    </svg>
  );
}
