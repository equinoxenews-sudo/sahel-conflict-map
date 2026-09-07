/**
 * Curated, per-zone lists of open, reputable domains to restrict article
 * search to (via GDELT DOC 2.0's `domain:` filter). GDELT DOC rejects
 * overly long queries ("Your query was too short or too long"), so each
 * zone gets a short, regionally relevant list rather than one shared list
 * of every source for every query.
 */
const GENERAL_WIRES = ["reuters.com", "apnews.com", "bbc.com", "aljazeera.com", "france24.com"];

export const ZONE_NEWS_DOMAINS: Record<string, string[]> = {
  afrique: [...GENERAL_WIRES, "jeuneafrique.com", "africanews.com", "radiookapi.net"],
  europe: [...GENERAL_WIRES, "understandingwar.org"],
  "moyen-orient": [...GENERAL_WIRES, "middleeasteye.net", "al-monitor.com"],
  indopacifique: [...GENERAL_WIRES, "taipeitimes.com"],
  "amerique-du-sud": [...GENERAL_WIRES, "insightcrime.org", "riotimesonline.com"],
};
