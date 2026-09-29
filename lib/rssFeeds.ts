/** Flux RSS contrôlés le 25 septembre 2026 ; complétés et re-vérifiés
 * individuellement (contenu XML réel consulté) le 29 septembre 2026. Leur
 * disponibilité doit être surveillée. Écartés faute de droits de
 * réutilisation clairs pour un site public : CNA (usage personnel non
 * commercial déclaré), RNZ (republication soumise à autorisation),
 * ReliefWeb (aucun flux exploitable trouvé). */
export const ZONE_RSS_FEEDS: Record<string, string[]> = {
  afrique: [
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "https://www.france24.com/en/africa/rss",
    "https://www.africanews.com/feed/rss",
    "https://www.jeuneafrique.com/feed/",
    "https://www.rfi.fr/fr/afrique/rss",
    "https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml",
    "https://rss.dw.com/xml/rss-en-africa",
  ],
  europe: [
    "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    "https://www.france24.com/en/europe/rss",
    "https://www.rfi.fr/fr/europe/rss",
    "https://rss.dw.com/xml/rss-en-world",
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
    "https://thediplomat.com/feed/",
  ],
  "amerique-du-sud": [
    "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "https://www.france24.com/en/americas/rss",
    "https://insightcrime.org/feed/",
    "https://en.mercopress.com/rss",
    "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
  ],
};
