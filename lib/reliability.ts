export type ReliabilityScore = 1 | 2 | 3 | 4 | 5;

/** 1 = peu fiable (rouge) ... 5 = très fiable (vert). */
export const RELIABILITY_COLORS: Record<ReliabilityScore, string> = {
  1: "#e53935",
  2: "#fb8c00",
  3: "#fdd835",
  4: "#9ccc65",
  5: "#43a047",
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

/**
 * Derives a 1-5 reliability score for a synthesized brief from how many
 * distinct outlets it cites — several *independent* sources agreeing is a
 * much stronger corroboration signal than several articles from the same
 * outlet (already deduplicated by the caller before counting).
 */
export function computeBriefReliability(uniqueSourceCount: number): ReliabilityScore {
  if (uniqueSourceCount >= 4) return 5;
  if (uniqueSourceCount === 3) return 4;
  if (uniqueSourceCount === 2) return 3;
  return 2;
}
