import { AFRICA_NEWS, type NewsItem } from "./africaNews";

/**
 * Manually curated per-zone selection for the demo — same caveat as
 * africaNews.ts: not sourced from a live feed yet.
 */
const EUROPE_NEWS: NewsItem[] = [
  {
    date: "Sept. 2026",
    title: "Ukraine — pas de cessez-le-feu confirmé sur le front",
    summary:
      "Les combats se poursuivent le long de la ligne de front, sans accord de cessez-le-feu durable malgré plusieurs tentatives de médiation.",
  },
  {
    date: "Août 2026",
    title: "Balkans — tensions persistantes autour du Kosovo",
    summary:
      "Les relations entre Belgrade et Pristina restent tendues, avec des incidents sporadiques dans le nord du Kosovo.",
  },
];

const MOYEN_ORIENT_NEWS: NewsItem[] = [
  {
    date: "Sept. 2026",
    title: "Proche-Orient — tensions persistantes autour de Gaza",
    summary:
      "La situation humanitaire et sécuritaire reste précaire, avec des négociations toujours fragiles sur un cadre de sortie de crise durable.",
  },
  {
    date: "Août 2026",
    title: "Syrie — instabilité post-transition",
    summary:
      "La transition politique post-Assad reste marquée par des tensions sectaires et une autorité centrale encore fragile sur certaines régions.",
  },
  {
    date: "Juillet 2026",
    title: "Yémen — poursuite de la guerre civile",
    summary:
      "Le conflit entre le gouvernement reconnu internationalement et les forces houthies continue d'affecter la population civile.",
  },
];

const INDOPACIFIQUE_NEWS: NewsItem[] = [
  {
    date: "Août 2026",
    title: "Myanmar — poursuite de la guerre civile",
    summary:
      "Les affrontements entre la junte militaire et les forces de résistance restent actifs sur plusieurs fronts du pays.",
  },
  {
    date: "Juillet 2026",
    title: "Détroit de Taïwan — tensions militaires persistantes",
    summary:
      "Les incursions aériennes et navales autour de Taïwan continuent d'alimenter les tensions entre Taipei et Pékin.",
  },
  {
    date: "Juillet 2026",
    title: "Philippines — insurrection résiduelle à Mindanao",
    summary:
      "Des groupes armés résiduels restent actifs dans le sud de l'archipel malgré les accords de paix successifs.",
  },
];

const AMERIQUE_DU_SUD_NEWS: NewsItem[] = [
  {
    date: "Août 2026",
    title: "Colombie — violence des groupes armés résiduels",
    summary:
      "Les dissidences des FARC et l'ELN restent actifs dans plusieurs régions rurales malgré les processus de paix engagés.",
  },
  {
    date: "Juillet 2026",
    title: "Venezuela — crise politique persistante",
    summary:
      "La situation politique et économique reste tendue, avec des mouvements de contestation réguliers.",
  },
];

export const ZONE_NEWS: Record<string, NewsItem[]> = {
  afrique: AFRICA_NEWS,
  europe: EUROPE_NEWS,
  "moyen-orient": MOYEN_ORIENT_NEWS,
  indopacifique: INDOPACIFIQUE_NEWS,
  "amerique-du-sud": AMERIQUE_DU_SUD_NEWS,
};
