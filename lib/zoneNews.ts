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
  {
    date: "Août 2026",
    title: "Équateur — état de conflit interne face aux gangs",
    summary:
      "Le pays reste sous forte pression sécuritaire depuis la déclaration de « conflit armé interne » contre les groupes criminels liés au narcotrafic.",
  },
  {
    date: "Août 2026",
    title: "Haïti — effondrement sécuritaire persistant",
    summary:
      "Les gangs armés continuent de contrôler de larges portions de Port-au-Prince, malgré le déploiement d'une force internationale de soutien.",
  },
  {
    date: "Juillet 2026",
    title: "Brésil — opérations sécuritaires dans les favelas de Rio",
    summary:
      "Les affrontements entre forces de police et factions criminelles (Comando Vermelho, milices) restent fréquents dans les zones périphériques.",
  },
  {
    date: "Juillet 2026",
    title: "Pérou — instabilité politique persistante",
    summary:
      "Le pays reste marqué par une forte défiance envers les institutions et des mouvements de contestation récurrents dans plusieurs régions.",
  },
  {
    date: "Juillet 2026",
    title: "Pérou — tensions liées au narcotrafic dans le VRAEM",
    summary:
      "La vallée des fleuves Apurímac, Ene et Mantaro reste une zone de tension entre forces de sécurité, cultivateurs de coca et groupes armés résiduels.",
  },
  {
    date: "Juin 2026",
    title: "Chili — tensions dans l'Araucanie",
    summary:
      "Le conflit foncier avec des groupes mapuches continue de générer des incidents sporadiques dans le sud du pays.",
  },
  {
    date: "Juin 2026",
    title: "Mexique — violence persistante des cartels",
    summary:
      "Les affrontements entre cartels et entre cartels et forces de sécurité continuent d'affecter plusieurs États du pays.",
  },
  {
    date: "Juin 2026",
    title: "Honduras — activité des maras et gangs urbains",
    summary:
      "La violence liée aux gangs (MS-13, Barrio 18) reste un défi sécuritaire majeur dans les principales zones urbaines.",
  },
  {
    date: "Mai 2026",
    title: "El Salvador — prolongation du régime d'exception",
    summary:
      "Le régime d'exception contre les gangs reste en vigueur, avec des organisations de défense des droits humains qui continuent d'alerter sur ses effets.",
  },
  {
    date: "Mai 2026",
    title: "Guatemala — insécurité liée aux réseaux criminels",
    summary:
      "La corruption institutionnelle et l'activité de réseaux criminels transnationaux continuent de fragiliser la sécurité intérieure.",
  },
  {
    date: "Mai 2026",
    title: "Bolivie — tensions politiques et sociales",
    summary:
      "Le pays reste traversé par des mobilisations sociales récurrentes et des tensions internes au sein du paysage politique.",
  },
  {
    date: "Avril 2026",
    title: "Argentine — contestation sociale liée à la crise économique",
    summary:
      "Les mesures d'ajustement économique continuent de susciter des mouvements de protestation dans plusieurs grandes villes.",
  },
  {
    date: "Avril 2026",
    title: "Venezuela–Guyana — différend frontalier autour de l'Essequibo",
    summary:
      "Le contentieux territorial autour de la région de l'Essequibo, riche en ressources pétrolières, continue d'alimenter les tensions bilatérales.",
  },
  {
    date: "Avril 2026",
    title: "Paraguay — zone de transit du narcotrafic régional",
    summary:
      "La frontière avec le Brésil reste un point de passage majeur pour le trafic de drogue, avec une présence croissante de groupes criminels transnationaux.",
  },
  {
    date: "Mars 2026",
    title: "Nicaragua — répression politique continue",
    summary:
      "Le gouvernement maintient une pression forte sur l'opposition, la presse indépendante et la société civile.",
  },
  {
    date: "Mars 2026",
    title: "Cuba — crise économique et migratoire",
    summary:
      "Les pénuries persistantes alimentent des mouvements de contestation ponctuels et une émigration soutenue.",
  },
  {
    date: "Mars 2026",
    title: "Amazonie — violences liées à l'orpaillage illégal",
    summary:
      "Les zones frontalières entre le Brésil, la Colombie et le Pérou restent marquées par des conflits armés autour de l'exploitation minière et forestière illégale.",
  },
  {
    date: "Février 2026",
    title: "Colombie — négociations de paix fragilisées",
    summary:
      "Les pourparlers avec plusieurs groupes armés restent instables, entre trêves partielles et reprises ponctuelles des hostilités.",
  },
  {
    date: "Février 2026",
    title: "Brésil — expansion territoriale du PCC",
    summary:
      "Le Premier Commando de la Capitale continue d'étendre son influence au-delà de São Paulo, y compris dans des pays voisins.",
  },
  {
    date: "Janvier 2026",
    title: "Uruguay — vigilance renforcée face au narcotrafic régional",
    summary:
      "Le pays renforce ses contrôles portuaires face à l'utilisation croissante de son territoire comme point de transit pour la cocaïne sud-américaine.",
  },
];

export const ZONE_NEWS: Record<string, NewsItem[]> = {
  afrique: AFRICA_NEWS,
  europe: EUROPE_NEWS,
  "moyen-orient": MOYEN_ORIENT_NEWS,
  indopacifique: INDOPACIFIQUE_NEWS,
  "amerique-du-sud": AMERIQUE_DU_SUD_NEWS,
};
