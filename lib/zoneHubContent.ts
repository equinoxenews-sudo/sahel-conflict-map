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

  europe: {
    description: "Un espace stratégique au cœur des équilibres mondiaux.",
    stats: [
      { icon: "◎", value: "44", label: "Pays" },
      { icon: "◈", value: "749 M", label: "Habitants" },
      { icon: "⬡", value: "22 %", label: "PIB mondial" },
      { icon: "❖", value: "2", label: "Alliances majeures (UE / OTAN)" },
    ],
    quote: {
      text: "Un continent en première ligne des défis de notre temps.",
      body: "Sécurité, énergie, démocratie, transformations économiques : l'Europe est un acteur central dans la recomposition de l'ordre international.",
    },
    categories: [],
  },

  "moyen-orient": {
    description: "Un carrefour géopolitique au centre des rivalités mondiales.",
    stats: [
      { icon: "◎", value: "18", label: "Pays" },
      { icon: "◈", value: "410 M", label: "Habitants" },
      { icon: "⬡", value: "48 %", label: "Réserves mondiales d'hydrocarbures" },
      { icon: "❖", value: "4", label: "Grands ensembles régionaux" },
    ],
    quote: {
      text: "Une région sous haute tension, au cœur des équilibres mondiaux.",
      body: "Énergie, sécurité, influences régionales : le Moyen-Orient reste un théâtre décisif pour la stabilité internationale.",
    },
    categories: [],
  },

  "amerique-du-sud": {
    description:
      "Ressources stratégiques, instabilités politiques et nouveaux équilibres sur la scène internationale.",
    stats: [
      { icon: "◎", value: "12", label: "Pays" },
      { icon: "◈", value: "442 M", label: "Habitants" },
      { icon: "⬡", value: "24 %", label: "Réserves mondiales de ressources critiques" },
      { icon: "❖", value: "3", label: "Grands ensembles régionaux" },
    ],
    quote: {
      text: "Un continent de ressources et d'opportunités.",
      body: "Entre transitions politiques, richesses naturelles et influences extérieures, l'Amérique du Sud s'impose comme un acteur clé du XXIe siècle.",
    },
    categories: [],
  },

  indopacifique: {
    description: "Un espace stratégique au cœur des rivalités globales.",
    stats: [
      { icon: "◎", value: "36", label: "Pays et territoires" },
      { icon: "◈", value: "4,2 Md", label: "Habitants (~ 55 % de la population mondiale)" },
      { icon: "⬡", value: "62 %", label: "PIB mondial" },
      { icon: "❖", value: "5", label: "Grands axes maritimes (détroits stratégiques)" },
    ],
    quote: {
      text: "Un espace maritime et terrestre décisif pour l'équilibre du XXIe siècle.",
      body: "Puissances, routes maritimes, technologies, ressources et tensions : l'Indopacifique dessine les rapports de force de demain.",
    },
    categories: [],
  },
};

export function getZoneHubContent(slug: string): ZoneHubContent | undefined {
  return ZONE_HUB_CONTENT[slug];
}
