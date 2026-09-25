import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const JORDANIE: CountryProfile = {
  id: "jordanie",
  slug: "jordanie",
  zoneSlug: "moyen-orient",
  name: "Jordanie",
  officialName: "Royaume hachémite de Jordanie",
  iso2: "JO",
  iso3: "JOR",
  capital: "Amman",
  population: "≈ 11,3 millions (estimation, donnée de démonstration)",
  area: "89 342 km²",
  languages: ["Arabe"],
  currency: "Dinar jordanien",
  government: "Monarchie constitutionnelle",
  timezone: "UTC+3",

  overview: {
    summary:
      "La Jordanie occupe une position charnière au Moyen-Orient, accueillant d'importantes populations réfugiées (syriennes, palestiniennes) et jouant un rôle stabilisateur reconnu par ses partenaires occidentaux, malgré des ressources naturelles limitées.",
    majorCities: ["Amman", "Zarqa", "Irbid", "Aqaba"],
    neighbors: ["Syrie", "Irak", "Arabie saoudite", "Israël", "Palestine"],
    coastline: "Accès limité à la mer Rouge (Aqaba)",
    territorialOrganization: "12 gouvernorats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle",
    headOfState: "Roi (Maison hachémite) — placeholder",
    headOfGovernment: "Premier ministre, nommé par le roi — placeholder",
    parliament: "Assemblée nationale (Chambre des députés + Sénat)",
    actors: [{ name: "Gouvernement royal", type: "Government", role: "Exécutif" }],
    foreignRelations: ["États-Unis", "Arabie saoudite", "Israël", "Syrie", "Union européenne"],
  },

  security: {
    overview: "Contexte sécuritaire globalement stable, rôle de tampon régional — donnée de démonstration, à sourcer.",
    conflicts: ["Gestion des flux réfugiés (frontière syrienne)", "Vigilance antiterroriste régionale"],
    armedActors: [{ name: "Forces armées jordaniennes", type: "Military", role: "Armée régulière" }],
    foreignPresence: [{ name: "Coopération militaire américaine", type: "Foreign actor", country: "États-Unis", role: "Soutien et entraînement" }],
    hotspots: [{ name: "Frontière syrienne", note: "Gestion des flux et sécurité frontalière" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Services", "Tourisme", "Textile", "Agriculture"],
    resources: ["Phosphates", "Potasse"],
    constraints: ["Rareté de l'eau", "Dépendance aux importations énergétiques", "Charge budgétaire liée à l'accueil de réfugiés"],
  },

  infrastructures: [
    { name: "Port d'Aqaba", type: "Port", location: "Aqaba", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international Reine Alia", type: "Aéroport", location: "Amman", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Forte proportion de population réfugiée (syrienne, palestinienne, irakienne) — donnée de démonstration.",
    urbanization: "≈ 92 % de population urbaine (estimation, placeholder)",
    displacement: "Importantes populations réfugiées accueillies (chiffres à sourcer)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam sunnite (majoritaire)", "Christianisme"],
  },

  environment: {
    overview: "Pays parmi les plus pauvres en ressources hydriques au monde — donnée de démonstration.",
    risks: ["Stress hydrique sévère", "Désertification", "Sécheresse récurrente"],
  },

  keyActors: [
    { name: "Gouvernement jordanien", type: "Government", country: "Jordanie", role: "Exécutif" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire stratégique et militaire" },
  ],
  relatedEvents: [],
  sources: [
    { id: "jordanie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
