export interface NewsItem {
  date: string;
  title: string;
  summary: string;
}

/**
 * Sélection manuelle de quelques faits d'actualité pour la démo — à
 * remplacer par un flux réel (agrégation de sources + validation éditoriale)
 * une fois le pipeline de contenu en place.
 */
export const AFRICA_NEWS: NewsItem[] = [
  {
    date: "Août 2026",
    title: "Soudan — poursuite des combats entre l'armée et les FSR",
    summary:
      "Le conflit entre l'armée soudanaise et les Forces de soutien rapide continue de provoquer des déplacements massifs de population, notamment autour du Darfour et de Khartoum.",
  },
  {
    date: "Août 2026",
    title: "RDC — progression du M23 dans l'est du pays",
    summary:
      "Les combats entre le groupe armé M23 et les forces congolaises se poursuivent dans les provinces du Nord et du Sud-Kivu, avec des tensions régionales persistantes avec le Rwanda.",
  },
  {
    date: "Juillet 2026",
    title: "Sahel — persistance de l'insurrection jihadiste",
    summary:
      "Au Mali, au Burkina Faso et au Niger, les groupes affiliés à Al-Qaïda (JNIM) et à l'État islamique continuent de mener des attaques contre les forces de sécurité et les populations civiles.",
  },
  {
    date: "Juillet 2026",
    title: "Mozambique — regain de tension à Cabo Delgado",
    summary:
      "La province de Cabo Delgado reste marquée par l'activité de groupes armés affiliés à l'État islamique, malgré la présence de forces régionales de stabilisation.",
  },
];
