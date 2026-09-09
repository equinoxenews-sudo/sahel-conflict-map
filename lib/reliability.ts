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

// Baseline trust per outlet — a single BBC/France24-sourced brief is more
// reliable than one sourced from an unrated site cited three times. All
// domains here are ones lib/rssFeeds.ts actually pulls from; anything else
// (shouldn't normally occur) gets the neutral default below.
const DOMAIN_BASE_RELIABILITY: Record<string, ReliabilityScore> = {
  "bbc.co.uk": 5,
  "bbc.com": 5,
  "france24.com": 5,
  "reuters.com": 5,
  "apnews.com": 5,
  "aljazeera.com": 5,
  "africanews.com": 4,
  "jeuneafrique.com": 4,
  "middleeasteye.net": 4,
  "insightcrime.org": 4,
};
const DEFAULT_DOMAIN_RELIABILITY: ReliabilityScore = 3;

/**
 * Derives a 1-5 reliability score for a synthesized brief from the
 * reputation of the outlets it cites, not just how many there are — one
 * article from a well-established wire/broadcaster is more trustworthy
 * than several from an unrated site. Corroboration across *independent*
 * outlets still nudges the score up, but source quality is the primary
 * signal (domains array should be pre-deduplicated by the caller only if
 * it wants that; here it's deduplicated internally either way).
 */
export function computeBriefReliability(domains: string[]): ReliabilityScore {
  const unique = [...new Set(domains)];
  if (unique.length === 0) return DEFAULT_DOMAIN_RELIABILITY;

  const baseline = Math.max(
    ...unique.map((d) => DOMAIN_BASE_RELIABILITY[d] ?? DEFAULT_DOMAIN_RELIABILITY)
  );
  const corroborationBonus = unique.length >= 2 ? 1 : 0;

  return clampReliability(baseline + corroborationBonus);
}
