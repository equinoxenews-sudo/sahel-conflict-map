import type { NewsItem } from "./africaNews";

/**
 * Global selection for the homepage (ticker + left column) — same caveat as
 * africaNews.ts: manually curated for the demo, not sourced from a live feed
 * yet.
 */
export const HOME_NEWS: NewsItem[] = [
  {
    date: "Sept. 2026",
    title: "Ukraine — pas de cessez-le-feu confirmé sur le front",
    summary:
      "Les combats se poursuivent le long de la ligne de front, sans accord de cessez-le-feu durable malgré plusieurs tentatives de médiation.",
  },
  {
    date: "Sept. 2026",
    title: "Proche-Orient — tensions persistantes autour de Gaza",
    summary:
      "La situation humanitaire et sécuritaire reste précaire, avec des négociations toujours fragiles sur un cadre de sortie de crise durable.",
  },
  {
    date: "Août 2026",
    title: "Soudan — poursuite des combats entre l'armée et les FSR",
    summary:
      "Le conflit continue de provoquer des déplacements massifs de population, notamment autour du Darfour et de Khartoum.",
  },
  {
    date: "Août 2026",
    title: "RDC — progression du M23 dans l'est du pays",
    summary:
      "Les combats entre le groupe armé M23 et les forces congolaises se poursuivent, avec des tensions régionales persistantes avec le Rwanda.",
  },
  {
    date: "Juillet 2026",
    title: "Sahel — persistance de l'insurrection jihadiste",
    summary:
      "Au Mali, au Burkina Faso et au Niger, les groupes affiliés à Al-Qaïda (JNIM) et à l'État islamique continuent de mener des attaques.",
  },
  {
    date: "Juillet 2026",
    title: "Myanmar — poursuite de la guerre civile",
    summary:
      "Les affrontements entre la junte militaire et les forces de résistance restent actifs sur plusieurs fronts du pays.",
  },
];
