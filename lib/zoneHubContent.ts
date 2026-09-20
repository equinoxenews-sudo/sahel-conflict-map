export interface ZoneStat {
  icon: string;
  value: string;
  label: string;
}

export interface ZoneKnowledgeCategory {
  key: string;
  title: string;
  description: string;
}

export interface ZoneQuote {
  text: string;
  body: string;
}

export interface ZoneHubContent {
  description: string;
  stats: ZoneStat[];
  quote: ZoneQuote;
  categories: ZoneKnowledgeCategory[];
}

// Editorial presentation copy for each zone's hub page — hand-written text
// and illustrative stats, not data pulled from any feed/API (see
// ZoneHero/ZoneKnowledgePanel). Filled in progressively per zone; a zone
// with no entry here just gets the sober fallback in ZoneHero/
// ZoneKnowledgePanel instead of fabricated numbers or categories.
export const ZONE_HUB_CONTENT: Partial<Record<string, ZoneHubContent>> = {
  afrique: {
    description:
      "Dynamiques régionales, défis sécuritaires et transformations d'un continent en mouvement.",
    stats: [
      { icon: "◎", value: "54", label: "Pays" },
      { icon: "◈", value: "1,4 Md", label: "Habitants" },
      { icon: "⬡", value: "30 %", label: "Ressources stratégiques mondiales" },
      { icon: "❖", value: "6", label: "Grands espaces régionaux" },
    ],
    quote: {
      text: "Un continent au cœur des équilibres mondiaux.",
      body: "Sécurité, ressources, démographie, transitions politiques : l'Afrique est un acteur clé des dynamiques globales.",
    },
    categories: [
      {
        key: "geopolitique",
        title: "Panorama géopolitique",
        description: "Enjeux, acteurs et équilibres régionaux",
      },
      {
        key: "groupes-armes",
        title: "Acteurs et groupes armés",
        description: "Groupes jihadistes, forces étatiques, alliés et milices",
      },
      {
        key: "economie",
        title: "Économie et ressources",
        description: "Matières premières, énergie, projets stratégiques",
      },
      {
        key: "demographie",
        title: "Démographie et société",
        description: "Population, urbanisation, dynamiques sociales",
      },
      {
        key: "sante",
        title: "Santé et crises humanitaires",
        description: "Épidémies, insécurité alimentaire, déplacements",
      },
      {
        key: "environnement",
        title: "Environnement et climat",
        description: "Eau, désertification, risques naturels",
      },
    ],
  },
};

export function getZoneHubContent(slug: string): ZoneHubContent | undefined {
  return ZONE_HUB_CONTENT[slug];
}
