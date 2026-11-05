/** Flux RSS contrôlés le 25 septembre 2026 ; complétés et re-vérifiés
 * individuellement (contenu XML réel consulté) le 29 septembre 2026. Leur
 * disponibilité doit être surveillée. Écartés faute de droits de
 * réutilisation clairs pour un site public : CNA (usage personnel non
 * commercial déclaré), RNZ (republication soumise à autorisation),
 * ReliefWeb (aucun flux exploitable trouvé).
 *
 * Ajoutés le 5 novembre 2026 à la demande de Nicolas, flux consultés ce jour-là (contenu XML réel) : Iran International, Haaretz et
 * Al-Monitor (Moyen-Orient), Kyiv Independent (Europe), The Hindu et The Straits Times, édition Asie (Indo-Pacifique). Leurs
 * conditions de réutilisation n'ont PAS été examinées, contrairement aux autres : à valider avant tout lancement commercial. Haaretz
 * est à abonnement : le texte complet des articles n'est souvent pas lisible, la synthèse s'appuie alors sur le titre et le chapô. */
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
    "https://kyivindependent.com/news-archive/rss/",
  ],
  "moyen-orient": [
    "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "https://www.france24.com/en/middle-east/rss",
    "https://www.middleeasteye.net/rss",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.iranintl.com/en/feed",
    "https://www.haaretz.com/srv/haaretz-latest-headlines",
    "https://www.al-monitor.com/rss",
  ],
  indopacifique: [
    "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    "https://www.france24.com/en/asia-pacific/rss",
    "https://thediplomat.com/feed/",
    "https://www.thehindu.com/news/international/feeder/default.rss",
    "https://www.straitstimes.com/news/asia/rss.xml",
  ],
  "amerique-du-sud": [
    "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    "https://www.france24.com/en/americas/rss",
    "https://insightcrime.org/feed/",
    "https://en.mercopress.com/rss",
    "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
  ],
};
