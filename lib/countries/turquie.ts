import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const TURQUIE: CountryProfile = {
  id: "turquie",
  slug: "turquie",
  zoneSlug: "moyen-orient",
  name: "Turquie",
  officialName: "République de Turquie",
  iso2: "TR",
  iso3: "TUR",
  capital: "Ankara",
  population: "≈ 85 millions (estimation, donnée de démonstration)",
  area: "783 562 km²",
  languages: ["Turc"],
  currency: "Livre turque",
  government: "République présidentielle",
  timezone: "UTC+3",

  overview: {
    summary:
      "La Turquie occupe une position charnière entre Europe et Moyen-Orient, membre de l'OTAN, engagée militairement dans le Nord syrien et irakien face aux forces kurdes, et acteur diplomatique actif sur plusieurs dossiers régionaux (Syrie, Libye, Caucase).",
    majorCities: ["Ankara", "Istanbul", "Izmir", "Antalya"],
    neighbors: ["Grèce", "Bulgarie", "Géorgie", "Arménie", "Iran", "Irak", "Syrie"],
    coastline: "Méditerranée, mer Égée, mer Noire",
    territorialOrganization: "81 provinces",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    headOfState: "Président de la République — placeholder",
    parliament: "Grande Assemblée nationale de Turquie",
    actors: [{ name: "Gouvernement présidentiel", type: "Government", role: "Exécutif" }],
    foreignRelations: ["OTAN", "Union européenne", "Syrie", "Irak", "Russie (relation pragmatique)"],
  },

  security: {
    overview: "Opérations militaires actives dans le Nord syrien et irakien contre des groupes kurdes armés — donnée de démonstration, à sourcer.",
    conflicts: ["Conflit avec le PKK et forces kurdes affiliées (Syrie, Irak)", "Tensions en mer Égée avec la Grèce"],
    armedActors: [
      { name: "Forces armées turques", type: "Military", role: "Membre de l'OTAN, opérations transfrontalières" },
      { name: "PKK (Parti des travailleurs du Kurdistan)", type: "Armed group", role: "Groupe classé terroriste par la Turquie" },
    ],
    hotspots: [{ name: "Frontière syrienne (zones d'opérations)", note: "Opérations militaires transfrontalières" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — inflation structurellement élevée ces dernières années",
    mainSectors: ["Industrie manufacturière", "Textile", "Tourisme", "Agriculture"],
    resources: ["Ressources minières diverses", "Position de transit énergétique stratégique"],
    constraints: ["Inflation élevée", "Volatilité de la livre turque"],
  },

  infrastructures: [
    { name: "Port d'Istanbul", type: "Port", location: "Istanbul", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Détroits du Bosphore et des Dardanelles", type: "Route", location: "Istanbul / Çanakkale", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport d'Istanbul", type: "Aéroport", location: "Istanbul", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société marquée par une forte diaspora, un clivage laïcité/religion et une importante minorité kurde — donnée de démonstration.",
    urbanization: "≈ 77 % de population urbaine (estimation, placeholder)",
    displacement: "Importante population réfugiée syrienne accueillie (chiffres à sourcer)",
    languages: ["Turc (officiel)", "Kurde"],
    religions: ["Islam sunnite (majoritaire)", "Alévisme"],
    communities: ["Turcs", "Kurdes", "Réfugiés syriens"],
  },

  environment: {
    overview: "Exposition sismique élevée et stress hydrique croissant en Anatolie — donnée de démonstration.",
    risks: ["Risque sismique élevé", "Stress hydrique croissant", "Incendies de forêt estivaux"],
  },

  keyActors: [
    { name: "Gouvernement turc", type: "Government", country: "Turquie", role: "Exécutif" },
    { name: "OTAN", type: "Foreign actor", role: "Alliance militaire d'appartenance" },
    { name: "PKK", type: "Armed group", country: "Turquie", role: "Groupe armé kurde, classé terroriste" },
  ],
  relatedEvents: [],
  sources: [
    { id: "turquie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
