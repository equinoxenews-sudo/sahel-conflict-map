/** Flux RSS contrôlés le 25 septembre 2026. Leur disponibilité doit être surveillée. */
export const ZONE_RSS_FEEDS: Record<string, string[]> = {
  afrique: [
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "https://www.france24.com/en/africa/rss",
    "https://www.africanews.com/feed/rss",
    "https://www.jeuneafrique.com/feed/",
    "https://www.rfi.fr/fr/afrique/rss",
    "https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml",
  ],
  europe: [
    "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    "https://www.france24.com/en/europe/rss",
    "https://www.rfi.fr/fr/europe/rss",
  ],
  "moyen-orient": [
    "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "https://www.france24.com/en/middle-east/rss",
    "https://www.middleeasteye.net/rss",
    "https://www.aljazeera.com/xml/rss/all.xml",
  ],
  indopacifique: [
    "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    "https://www.france24.com/en/asia-pacific/rss",
  ],
  "amerique-du-sud": [
    "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "https://www.france24.com/en/americas/rss",
    "https://insightcrime.org/feed/",
  ],
};
