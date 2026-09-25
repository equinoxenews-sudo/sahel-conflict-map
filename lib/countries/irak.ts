import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const IRAK: CountryProfile = {
  id: "irak",
  slug: "irak",
  zoneSlug: "moyen-orient",
  name: "Irak",
  officialName: "République d'Irak",
  iso2: "IQ",
  iso3: "IRQ",
  capital: "Bagdad",
  population: "≈ 43 millions (estimation, donnée de démonstration)",
  area: "438 317 km²",
  languages: ["Arabe", "Kurde"],
  currency: "Dinar irakien",
  government: "République fédérale parlementaire",
  timezone: "UTC+3",

  overview: {
    summary:
      "L'Irak reste marqué par une reconstruction post-conflit inégale, une fédération complexe avec la région autonome du Kurdistan, et une exposition directe aux rivalités entre l'Iran et les États-Unis sur son sol. Les revenus pétroliers structurent l'essentiel de l'économie nationale.",
    majorCities: ["Bagdad", "Bassora", "Mossoul", "Erbil", "Najaf"],
    neighbors: ["Turquie", "Iran", "Koweït", "Arabie saoudite", "Jordanie", "Syrie"],
    territorialOrganization: "18 gouvernorats, dont la région autonome du Kurdistan",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale parlementaire",
    headOfState: "Président de la République — placeholder",
    headOfGovernment: "Premier ministre — placeholder",
    parliament: "Conseil des représentants",
    actors: [
      { name: "Gouvernement fédéral", type: "Government", role: "Exécutif central" },
      { name: "Gouvernement régional du Kurdistan (GRK)", type: "Government", role: "Autorité autonome du Nord" },
    ],
    foreignRelations: ["Iran", "États-Unis", "Turquie", "Arabie saoudite", "Koweït"],
  },

  security: {
    overview: "Contexte sécuritaire différencié selon les zones, présence de milices affiliées à l'Iran — donnée de démonstration, à sourcer.",
    conflicts: ["Cellules résiduelles de Daech", "Tensions intercommunautaires ponctuelles", "Rivalité Iran / États-Unis sur le territoire irakien"],
    armedActors: [
      { name: "Forces de sécurité irakiennes", type: "Military", role: "Armée et police fédérales" },
      { name: "Unités de mobilisation populaire (Hachd al-Chaabi)", type: "Armed group", role: "Milices affiliées à divers courants" },
      { name: "Peshmerga", type: "Military", role: "Forces du Kurdistan irakien" },
    ],
    foreignPresence: [{ name: "Coalition internationale anti-Daech", type: "Foreign actor", role: "Présence résiduelle" }],
    hotspots: [{ name: "Zones disputées Nord (Kirkouk)", note: "Tensions territoriales Bagdad/Erbil" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Hydrocarbures (dominant)", "Agriculture", "Construction"],
    resources: ["Pétrole (réserves majeures)", "Gaz naturel"],
    constraints: ["Dépendance quasi totale aux revenus pétroliers", "Infrastructures à reconstruire", "Corruption institutionnelle"],
  },

  infrastructures: [
    { name: "Port de Bassora (Umm Qasr)", type: "Port", location: "Bassora", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international de Bagdad", type: "Aéroport", location: "Bagdad", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Oléoduc Kirkouk-Ceyhan", type: "Pipeline", location: "Nord — frontière turque", importance: "Stratégique", status: "Inconnu", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société multiethnique et multiconfessionnelle, avec une population déplacée encore significative — donnée de démonstration.",
    urbanization: "≈ 71 % de population urbaine (estimation, placeholder)",
    displacement: "Population déplacée interne résiduelle depuis le conflit contre Daech (chiffres à sourcer)",
    languages: ["Arabe (officiel)", "Kurde (officiel)"],
    religions: ["Islam chiite (majoritaire)", "Islam sunnite", "Christianisme", "Yézidisme"],
    communities: ["Arabes", "Kurdes", "Turkmènes", "Assyriens/Chaldéens", "Yézidis"],
  },

  environment: {
    overview: "Stress hydrique croissant lié à la gestion transfrontalière du Tigre et de l'Euphrate — donnée de démonstration.",
    risks: ["Stress hydrique", "Désertification", "Tempêtes de sable croissantes"],
  },

  keyActors: [
    { name: "Gouvernement fédéral irakien", type: "Government", country: "Irak", role: "Exécutif central" },
    { name: "Gouvernement régional du Kurdistan", type: "Government", country: "Irak", role: "Autorité autonome" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Influence politique et milices affiliées" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Présence militaire résiduelle" },
  ],
  relatedEvents: [],
  sources: [
    { id: "irak-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
