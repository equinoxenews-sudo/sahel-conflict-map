/**
 * Statut de véracité d'une synthèse, choisi par l'IA de rédaction
 * (lib/synthesizeBriefs.ts) à partir des sources citées — pas un calcul
 * automatique. Remplace l'ancien indice de couverture documentaire (nombre
 * de domaines) et la note de fiabilité source (A-E) : plus simple, une
 * seule mention par synthèse.
 */
export const VERACITY_LEVELS = [
  "Confirmé",
  "Très probable",
  "Revendiqué",
  "Possible",
  "Peu probable",
  "Non confirmé",
] as const;

export type Veracity = (typeof VERACITY_LEVELS)[number];

export function isValidVeracity(value: unknown): value is Veracity {
  return typeof value === "string" && (VERACITY_LEVELS as readonly string[]).includes(value);
}

/** vert foncé / vert clair / jaune / rouge — Revendiqué et Possible
 * partagent le jaune, Peu probable et Non confirmé partagent le rouge. */
export const VERACITY_COLORS: Record<Veracity, string> = {
  "Confirmé": "#1c7a45",
  "Très probable": "#35b779",
  "Revendiqué": "#e0b44c",
  "Possible": "#e0b44c",
  "Peu probable": "#d94a4a",
  "Non confirmé": "#d94a4a",
};
