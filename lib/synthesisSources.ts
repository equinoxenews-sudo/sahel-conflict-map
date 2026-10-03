/**
 * Domaines que l'agent de synthèse de zone est autorisé à consulter sur le
 * web (liste blanche transmise à l'outil de recherche d'Anthropic). Les
 * sources déjà validées pour les flux RSS, plus quelques sources
 * institutionnelles et d'analyse. À réviser librement : retirer un domaine
 * suffit à l'exclure de la recherche.
 *
 * Retirés le 3 oct. 2026 : bbc.com, bbc.co.uk, dw.com et rfi.fr bloquent le
 * robot de recherche d'Anthropic, qui refuse alors toute la requête. Leurs
 * articles alimentent quand même les synthèses Équinoxe qui servent de base.
 */
export const SYNTHESIS_ALLOWED_DOMAINS = [
  // Médias déjà intégrés aux flux RSS
  "france24.com",
  "aljazeera.com",
  "middleeasteye.net",
  "africanews.com",
  "jeuneafrique.com",
  "mercopress.com",
  "thediplomat.com",
  "insightcrime.org",
  "agenciabrasil.ebc.com.br",
  // Institutionnel et humanitaire
  "news.un.org",
  "reliefweb.int",
  "icrc.org",
  // Analyse de crise
  "crisisgroup.org",
  "acleddata.com",
] as const;
