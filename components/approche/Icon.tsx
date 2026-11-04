import { ICON_PATHS } from "@/lib/approche/icons";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

// Pictogramme du jeu partagé (lib/approche/icons.ts) ; décoratif : le texte voisin porte le sens.
export default function Icon({ name, size = 18, className }: IconProps) {
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
      aria-hidden="true"
      focusable="false"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? ICON_PATHS.dot }}
    />
  );
}
