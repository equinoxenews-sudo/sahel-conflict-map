export interface LacTchadPoint {
  id: string;
  label: string;
  country: string;
  lat: number;
  lon: number;
  keyword: string;
}

/**
 * Démo statique pour "Mon espace" — zone du lac Tchad, thématique Boko
 * Haram / ISWAP / JAS. Points réels mais génériques (pas d'incident
 * précis inventé), même principe que les autres jeux de données seed.
 */
export const LAC_TCHAD_POINTS: LacTchadPoint[] = [
  { id: "lt-1", label: "Baga", country: "Nigeria", lat: 10.66, lon: 13.32, keyword: "Boko Haram" },
  { id: "lt-2", label: "Maiduguri", country: "Nigeria", lat: 11.85, lon: 13.16, keyword: "Boko Haram" },
  { id: "lt-3", label: "Diffa", country: "Niger", lat: 13.32, lon: 12.61, keyword: "ISWAP" },
  { id: "lt-4", label: "Bosso", country: "Niger", lat: 13.72, lon: 13.3, keyword: "ISWAP" },
  { id: "lt-5", label: "Ngouboua", country: "Tchad", lat: 13.48, lon: 14.06, keyword: "JAS" },
  { id: "lt-6", label: "Kolofata", country: "Cameroun", lat: 10.83, lon: 14.18, keyword: "JAS" },
];

export const LAC_TCHAD_CENTER: [number, number] = [12.3, 13.5];

export interface DemoArticle {
  date: string;
  title: string;
  summary: string;
}

/**
 * Placeholder pour la génération IA à venir — contenu d'exemple, pas de
 * pipeline réel branché.
 */
export const LAC_TCHAD_ARTICLES: DemoArticle[] = [
  {
    date: "Sept. 2026",
    title: "Regain d'activité de Boko Haram autour de Baga",
    summary:
      "Plusieurs signalements font état d'une présence accrue de combattants dans la zone riveraine du lac, sans confirmation indépendante à ce stade.",
  },
  {
    date: "Sept. 2026",
    title: "ISWAP consolide sa présence côté nigérien",
    summary:
      "La zone de Diffa/Bosso reste sous surveillance, avec des mouvements de population signalés vers des zones plus sûres.",
  },
  {
    date: "Août 2026",
    title: "JAS actif sur la rive tchadienne et camerounaise",
    summary:
      "Des incidents localisés continuent d'être rapportés autour de Ngouboua et Kolofata, freinant le retour des populations déplacées.",
  },
];

export const LAC_TCHAD_SUMMARY =
  "La zone du lac Tchad reste classée en tension élevée : les trois groupes suivis (Boko Haram, ISWAP, JAS) restent actifs sur leurs zones respectives, sans signe de désescalade notable ces dernières semaines. Le niveau de menace est maintenu en position « critique » sur l'indicateur ci-dessus.";
