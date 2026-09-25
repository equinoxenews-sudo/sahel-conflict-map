export type ReliabilityScore = 1 | 2 | 3 | 4 | 5;

/**
 * 1 = peu fiable (rouge) ... 5 = très fiable (vert). Matches the
 * functional map palette in app/globals.css (--status-*) — kept as
 * literal hex since these feed inline styles / Cesium color APIs, not CSS.
 */
export const RELIABILITY_COLORS: Record<ReliabilityScore, string> = {
  1: "#d94a4a",
  2: "#e87932",
  3: "#e0b44c",
  4: "#35b779",
  5: "#35b779",
};

/**
 * Derives a 1-5 reliability score from GDELT's mention count — how many
 * independent source articles reported the same event. A single-mention
 * extraction is the least corroborated (and most likely to be a
 * geocoding/categorization false positive); events picked up by many
 * outlets are the most corroborated.
 */
export function computeReliability(numMentions: number): ReliabilityScore {
  if (numMentions >= 20) return 5;
  if (numMentions >= 10) return 4;
  if (numMentions >= 6) return 3;
  if (numMentions >= 3) return 2;
  return 1;
}

export function clampReliability(value: number | null | undefined): ReliabilityScore {
  const n = Math.round(value ?? 3);
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as ReliabilityScore;
}

/** Indice de couverture documentaire, pas une probabilité de véracité.
 * Plusieurs domaines peuvent reprendre la même dépêche. Aucun score 5
 * n'est attribué automatiquement ; l'indépendance n'est pas vérifiée.
 */
export function computeBriefReliability(domains: string[]): ReliabilityScore {
  const unique = new Set(domains.map((domain) => domain.trim().toLowerCase()
    .replace(/^www\./, "").replace(/^bbc\.co\.uk$/, "bbc.com")).filter(Boolean));
  if (unique.size === 0) return 1;
  if (unique.size === 1) return 2;
  if (unique.size === 2) return 3;
  return 4;
}
