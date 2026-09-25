import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const YEMEN: CountryProfile = {
  id: "yemen",
  slug: "yemen",
  zoneSlug: "moyen-orient",
  name: "Yémen",
  officialName: "République du Yémen",
  iso2: "YE",
  iso3: "YEM",
  capital: "Sanaa (siège des autorités houthies) / Aden (siège du gouvernement reconnu)",
  population: "≈ 34 millions (estimation, donnée de démonstration)",
  area: "527 968 km²",
  languages: ["Arabe"],
  currency: "Rial yéménite",
  government: "République — autorités concurrentes depuis la guerre civile",
  timezone: "UTC+3",

  overview: {
    summary:
      "Le Yémen traverse depuis 2014 une guerre civile prolongée opposant les autorités houthies (contrôlant Sanaa et le Nord-Ouest) au gouvernement internationalement reconnu (basé à Aden), avec une intervention militaire régionale menée par l'Arabie saoudite. Le pays fait face à l'une des pires crises humanitaires au monde.",
    majorCities: ["Sanaa", "Aden", "Taïz", "Hodeïda"],
    neighbors: ["Arabie saoudite", "Oman"],
    coastline: "Mer Rouge et mer d'Arabie, contrôle partiel du détroit de Bab-el-Mandeb",
    territorialOrganization: "Gouvernorats — administration divisée entre autorités concurrentes",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République — autorité centrale fragmentée",
    actors: [
      { name: "Gouvernement reconnu internationalement", type: "Government", role: "Basé à Aden" },
      { name: "Autorités houthies (Ansar Allah)", type: "Government", role: "Contrôle de fait du Nord-Ouest, dont Sanaa" },
      { name: "Conseil de transition du Sud", type: "Government", role: "Acteur séparatiste au Sud" },
    ],
    foreignRelations: ["Arabie saoudite", "Émirats arabes unis", "Iran (soutien allégué aux Houthis)"],
  },

  security: {
    overview: "Guerre civile prolongée et crise humanitaire majeure — donnée de démonstration, à sourcer.",
    conflicts: ["Guerre civile Houthis / gouvernement reconnu", "Tensions séparatistes au Sud", "Attaques houthies en mer Rouge"],
    armedActors: [
      { name: "Forces houthies (Ansar Allah)", type: "Armed group", role: "Contrôle du Nord-Ouest" },
      { name: "Forces gouvernementales", type: "Military", role: "Gouvernement reconnu, Sud et Est" },
      { name: "Forces du Conseil de transition du Sud", type: "Armed group", role: "Sud séparatiste" },
    ],
    foreignPresence: [{ name: "Coalition menée par l'Arabie saoudite", type: "Foreign actor", country: "Arabie saoudite", role: "Intervention militaire" }],
    hotspots: [
      { name: "Hodeïda", note: "Port stratégique, zone de conflit" },
      { name: "Détroit de Bab-el-Mandeb", note: "Attaques sur le trafic maritime" },
    ],
  },

  economy: {
    gdp: "Donnée de démonstration — économie très affectée par la guerre",
    mainSectors: ["Agriculture de subsistance", "Pêche", "Aide humanitaire"],
    resources: ["Pétrole (production fortement réduite)", "Gaz naturel"],
    constraints: ["Économie de guerre", "Effondrement des infrastructures", "Dépendance à l'aide humanitaire internationale"],
  },

  infrastructures: [
    { name: "Port de Hodeïda", type: "Port", location: "Hodeïda", importance: "Stratégique", status: "Endommagé", source: "Donnée de démonstration" },
    { name: "Port d'Aden", type: "Port", location: "Aden", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "L'une des pires crises humanitaires au monde selon les agences des Nations unies — donnée de démonstration.",
    displacement: "Plusieurs millions de personnes déplacées internes (chiffres à sourcer)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam sunnite (majoritaire)", "Islam zaïdite (chiite, Nord)"],
  },

  environment: {
    overview: "Sécurité alimentaire critique, infrastructures hydriques dégradées par le conflit — donnée de démonstration.",
    risks: ["Sécurité alimentaire critique (risque de famine)", "Stress hydrique sévère", "Infrastructures sanitaires dégradées"],
  },

  keyActors: [
    { name: "Gouvernement reconnu internationalement", type: "Government", country: "Yémen", role: "Autorité reconnue, basée à Aden" },
    { name: "Autorités houthies", type: "Armed group", country: "Yémen", role: "Contrôle de fait du Nord-Ouest" },
    { name: "Arabie saoudite", type: "Foreign actor", country: "Arabie saoudite", role: "Chef de la coalition militaire" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Soutien allégué aux Houthis" },
  ],
  relatedEvents: [],
  sources: [
    { id: "yemen-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
