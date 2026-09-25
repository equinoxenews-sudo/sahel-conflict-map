import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts for the note on
// what's factual (geography, institutions) vs. illustrative (KPIs, actors,
// sources), which applies identically here.
export const ISRAEL: CountryProfile = {
  id: "israel",
  slug: "israel",
  zoneSlug: "moyen-orient",
  name: "Israël",
  officialName: "État d'Israël",
  iso2: "IL",
  iso3: "ISR",
  capital: "Jérusalem (revendiquée) / Tel Aviv (siège diplomatique de fait)",
  population: "≈ 9,8 millions (estimation, donnée de démonstration)",
  area: "≈ 22 145 km² (hors territoires contestés)",
  languages: ["Hébreu", "Arabe"],
  currency: "Shekel (ILS)",
  government: "République parlementaire",
  timezone: "UTC+2 / UTC+3 (heure d'été)",

  overview: {
    summary:
      "Israël combine une économie technologique avancée et un contexte sécuritaire structurellement tendu, marqué par le conflit avec les acteurs palestiniens et des dynamiques régionales avec le Liban, la Syrie et l'Iran. Le statut de Jérusalem et des territoires occupés reste au cœur des contentieux diplomatiques.",
    majorCities: ["Jérusalem", "Tel Aviv", "Haïfa", "Beer-Sheva", "Eilat"],
    neighbors: ["Liban", "Syrie", "Jordanie", "Égypte", "Palestine"],
    coastline: "Façade méditerranéenne et accès à la mer Rouge (Eilat)",
    territorialOrganization: "6 districts administratifs",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    headOfState: "Président (rôle largement protocolaire) — placeholder",
    headOfGovernment: "Premier ministre — placeholder",
    parliament: "Knesset (120 sièges)",
    actors: [
      { name: "Coalition gouvernementale", type: "Government", role: "Exécutif" },
      { name: "Opposition parlementaire", type: "Government", role: "Blocs d'opposition à la Knesset" },
    ],
    foreignRelations: ["États-Unis", "Égypte", "Jordanie", "Émirats arabes unis", "Liban", "Syrie", "Iran"],
  },

  security: {
    overview: "Contexte sécuritaire durablement tendu — donnée de démonstration, à sourcer et dater précisément.",
    conflicts: ["Conflit israélo-palestinien", "Tensions avec le Hezbollah (frontière libanaise)", "Confrontation indirecte avec l'Iran"],
    armedActors: [
      { name: "Forces de défense d'Israël (Tsahal)", type: "Military", role: "Armée régulière" },
      { name: "Acteurs armés à Gaza", type: "Armed group", role: "Zone de Gaza" },
    ],
    foreignPresence: [{ name: "Coopération sécuritaire américaine", type: "Foreign actor", country: "États-Unis", role: "Soutien militaire et diplomatique" }],
    hotspots: [
      { name: "Bande de Gaza", note: "Zone de conflit récurrent" },
      { name: "Frontière libanaise", note: "Tensions avec le Hezbollah" },
      { name: "Cisjordanie", note: "Tensions territoriales" },
    ],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    growth: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — à compléter",
    mainSectors: ["Haute technologie", "Services financiers", "Industrie de défense", "Agriculture intensive"],
    resources: ["Gaz naturel offshore (Méditerranée)", "Potasse (mer Morte)"],
    constraints: ["Coût élevé du contexte sécuritaire", "Dépendance aux importations énergétiques historique en évolution"],
  },

  infrastructures: [
    { name: "Port de Haïfa", type: "Port", location: "Haïfa", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport Ben Gourion", type: "Aéroport", location: "Tel Aviv", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Champ gazier Léviathan", type: "Énergie", location: "Méditerranée orientale", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société marquée par une forte diversité religieuse et des clivages politiques internes — donnée de démonstration.",
    urbanization: "≈ 93 % de population urbaine (estimation, placeholder)",
    languages: ["Hébreu (officiel)", "Arabe"],
    religions: ["Judaïsme", "Islam", "Christianisme", "Druzisme"],
    communities: ["Population juive israélienne", "Population arabe israélienne", "Communautés druzes"],
  },

  environment: {
    overview: "Stress hydrique structurel compensé par le dessalement — donnée de démonstration.",
    risks: ["Stress hydrique", "Vagues de chaleur", "Sécheresse régionale"],
  },

  keyActors: [
    { name: "Gouvernement israélien", type: "Government", country: "Israël", role: "Exécutif" },
    { name: "Tsahal", type: "Military", country: "Israël", role: "Forces armées" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Allié stratégique principal" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Rival régional" },
  ],
  relatedEvents: [],
  sources: [
    { id: "israel-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
