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

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "").replace(/^bbc\.co\.uk$/, "bbc.com");
}

/** Indice de couverture documentaire, pas une probabilité de véracité :
 * le nombre brut de domaines de presse distincts qui citent la synthèse
 * (1 domaine = score 1, 7 domaines = score 7, non plafonné au-delà).
 * Plusieurs domaines peuvent reprendre la même dépêche — l'indépendance
 * éditoriale des sources n'est pas vérifiée par ce chiffre. */
export function computeCoverageScore(domains: string[]): number {
  const unique = new Set(domains.map(normalizeDomain).filter(Boolean));
  return Math.max(1, unique.size);
}

/** rouge(1) -> orange(2) -> jaune(3-4) -> vert clair(5) -> vert foncé(6+). */
export function coverageColor(score: number): string {
  if (score <= 1) return "#d94a4a";
  if (score === 2) return "#e87932";
  if (score <= 4) return "#e0b44c";
  if (score === 5) return "#35b779";
  return "#1c7a45";
}
