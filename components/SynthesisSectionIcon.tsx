// Petite icône devant le titre d'une section de la synthèse de zone : traits fins, teinte du titre (même famille que
// les icônes de « Mon espace »). Un titre inconnu n'a pas d'icône.
const PATHS: { match: RegExp; shapes: React.ReactNode }[] = [
  {
    // Situation générale : un globe.
    match: /situation/,
    shapes: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
  },
  {
    // Sécurité : un bouclier.
    match: /securit/,
    shapes: <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6z" />,
  },
  {
    // Politique et diplomatie : un bâtiment à colonnes.
    match: /politi|diplo/,
    shapes: <path d="M3 9l9-5 9 5zM6 11v6M10 11v6M14 11v6M18 11v6M4 20h16" />,
  },
  {
    // À surveiller : un œil.
    match: /surveill/,
    shapes: (
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
];

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function SynthesisSectionIcon({ heading, className }: { heading: string; className?: string }) {
  const icon = PATHS.find((entry) => entry.match.test(fold(heading)));
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {icon.shapes}
    </svg>
  );
}
