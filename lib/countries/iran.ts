import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const IRAN: CountryProfile = {
  id: "iran",
  slug: "iran",
  zoneSlug: "moyen-orient",
  name: "Iran",
  officialName: "République islamique d'Iran",
  iso2: "IR",
  iso3: "IRN",
  capital: "Téhéran",
  population: "≈ 89 millions (estimation, donnée de démonstration)",
  area: "1 648 195 km²",
  languages: ["Persan"],
  currency: "Rial iranien",
  government: "République islamique",
  timezone: "UTC+3:30",

  overview: {
    summary:
      "L'Iran est un acteur régional majeur du Moyen-Orient, combinant un régime théocratique, un vaste réseau d'alliances et de milices affiliées (« axe de la résistance »), et une économie fortement contrainte par les sanctions internationales liées à son programme nucléaire.",
    majorCities: ["Téhéran", "Mashhad", "Ispahan", "Chiraz", "Tabriz"],
    neighbors: ["Irak", "Turquie", "Pakistan", "Afghanistan", "Turkménistan", "Azerbaïdjan", "Arménie"],
    coastline: "Golfe Persique, mer d'Oman, mer Caspienne",
    territorialOrganization: "31 provinces",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République islamique — double structure (guide suprême + institutions élues)",
    headOfState: "Guide suprême — placeholder",
    headOfGovernment: "Président de la République — placeholder",
    parliament: "Assemblée consultative islamique (Majlis)",
    actors: [
      { name: "Guide suprême et institutions religieuses", type: "Government", role: "Autorité ultime du régime" },
      { name: "Gardiens de la révolution islamique (CGRI)", type: "Military", role: "Force idéologique et économique majeure" },
    ],
    foreignRelations: ["Irak", "Syrie", "Liban (Hezbollah)", "Russie", "Chine", "États-Unis (relation de rupture)"],
  },

  security: {
    overview: "Programme nucléaire et réseau de milices régionales au cœur des tensions — donnée de démonstration, à sourcer.",
    conflicts: ["Tensions avec Israël", "Contentieux nucléaire avec les puissances occidentales", "Soutien à des acteurs armés régionaux"],
    armedActors: [
      { name: "Gardiens de la révolution islamique (CGRI)", type: "Military", role: "Force idéologique, force Al-Qods à l'international" },
      { name: "Force Al-Qods", type: "Military", role: "Opérations extérieures et soutien aux alliés régionaux" },
    ],
    hotspots: [{ name: "Programme nucléaire (sites d'enrichissement)", note: "Sujet de tensions internationales" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — inflation structurellement élevée",
    mainSectors: ["Hydrocarbures", "Pétrochimie", "Agriculture", "Industrie automobile"],
    resources: ["Pétrole (réserves majeures)", "Gaz naturel (parmi les premières réserves mondiales)"],
    constraints: ["Sanctions internationales", "Accès limité au système financier international", "Inflation élevée"],
  },

  infrastructures: [
    { name: "Terminal pétrolier de Kharg", type: "Port", location: "Île de Kharg, golfe Persique", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Détroit d'Ormuz (accès)", type: "Route", location: "Golfe Persique", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Population jeune et urbanisée, tensions sociales récurrentes autour des libertés civiles — donnée de démonstration.",
    urbanization: "≈ 76 % de population urbaine (estimation, placeholder)",
    languages: ["Persan (officiel)", "Azéri", "Kurde", "Arabe"],
    religions: ["Islam chiite (majoritaire, religion d'État)", "Islam sunnite", "Minorités religieuses"],
    communities: ["Persans", "Azéris", "Kurdes", "Baloutches", "Arabes"],
  },

  environment: {
    overview: "Stress hydrique sévère et pollution urbaine importante — donnée de démonstration.",
    risks: ["Stress hydrique sévère", "Pollution atmosphérique urbaine", "Désertification"],
  },

  keyActors: [
    { name: "Guide suprême et institutions religieuses", type: "Government", country: "Iran", role: "Autorité ultime" },
    { name: "Gardiens de la révolution islamique", type: "Military", country: "Iran", role: "Force idéologique et économique" },
    { name: "Hezbollah", type: "Armed group", country: "Liban", role: "Allié régional principal" },
  ],
  relatedEvents: [],
  sources: [
    { id: "iran-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
