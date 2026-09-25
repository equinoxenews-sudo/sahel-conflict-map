/**
 * Real-world search keywords per zone, for full-text article search
 * (GDELT DOC 2.0). Distinct from lib/zones.ts's `countries` (which are
 * FIPS-mapped labels used to filter the structured Event table) — this
 * needs plain English terms a search engine would match against article
 * text.
 */
export const ZONE_KEYWORDS: Record<string, string[]> = {
  afrique: ["Mali", "Burkina Faso", "Niger", "DRC", "Sudan", "Mozambique", "Nigeria", "Somalia", "Soudan", "Somalie", "RDC", "Congo", "Sahel", "Afrique", "Africa"],
  europe: ["Ukraine", "Kosovo", "Serbia", "Serbie", "Europe", "Russie", "Russia"],
  "moyen-orient": ["Israel", "Gaza", "Syria", "Yemen", "Lebanon", "Liban", "Syrie", "Israël", "Yémen", "Iran", "Irak", "Iraq"],
  indopacifique: ["Myanmar", "Philippines", "Taiwan", "North Korea"],
  "amerique-du-sud": ["Colombia", "Venezuela", "Peru", "Ecuador", "Haiti", "Brazil", "Mexico"],
};
