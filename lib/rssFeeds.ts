/**
 * Curated RSS feeds per zone — replaces GDELT DOC 2.0 as the article
 * discovery source (see lib/rss.ts). RSS has no rate limit worth worrying
 * about and is far more reliable than GDELT DOC's small research-project
 * server; each feed is already region-scoped by the outlet's own
 * editorial categorization, so no query-string keyword search is needed
 * here — lib/syncArticles.ts still applies a light keyword filter
 * (lib/zoneKeywords.ts) afterwards to drop off-topic items (sports,
 * business, ...) that a broad regional feed inevitably includes.
 *
 * A couple of candidates were tried and dropped: understandingwar.org and
 * taipeitimes.com both blocked/returned empty results on direct fetch.
 */
export const ZONE_RSS_FEEDS: Record<string, string[]> = {
  afrique: [
    "http://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "https://www.france24.com/en/africa/rss",
    "https://www.africanews.com/feed/rss",
    "https://www.jeuneafrique.com/feed/",
  ],
  europe: [
    "http://feeds.bbci.co.uk/news/world/europe/rss.xml",
    "https://www.france24.com/en/europe/rss",
  ],
  "moyen-orient": [
    "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "https://www.france24.com/en/middle-east/rss",
    "https://www.middleeasteye.net/rss",
  ],
  indopacifique: [
    "http://feeds.bbci.co.uk/news/world/asia/rss.xml",
    "https://www.france24.com/en/asia-pacific/rss",
  ],
  "amerique-du-sud": [
    "http://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "https://www.france24.com/en/americas/rss",
    "https://insightcrime.org/feed/",
  ],
};
