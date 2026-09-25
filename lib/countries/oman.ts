import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const OMAN: CountryProfile = {
  id: "oman",
  slug: "oman",
  zoneSlug: "moyen-orient",
  name: "Oman",
  officialName: "Sultanat d'Oman",
  iso2: "OM",
  iso3: "OMN",
  capital: "Mascate",
  population: "≈ 4,6 millions (estimation, donnée de démonstration)",
  area: "309 500 km²",
  languages: ["Arabe"],
  currency: "Rial omanais",
  government: "Monarchie absolue (sultanat)",
  timezone: "UTC+4",

  overview: {
    summary:
      "Oman se distingue par une diplomatie de neutralité active, jouant régulièrement un rôle de médiateur discret entre puissances rivales (Iran/Occident, dossiers yéménites) et contrôlant une position stratégique sur le détroit d'Ormuz et le golfe d'Oman.",
    majorCities: ["Mascate", "Salalah", "Sohar"],
    neighbors: ["Arabie saoudite", "Émirats arabes unis", "Yémen"],
    coastline: "Golfe d'Oman et mer d'Arabie, contrôle partiel du détroit d'Ormuz",
    territorialOrganization: "11 gouvernorats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie absolue (sultanat)",
    headOfState: "Sultan — placeholder",
    actors: [{ name: "Gouvernement du sultanat", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Iran (relation de médiation)", "Arabie saoudite", "États-Unis", "Royaume-Uni"],
  },

  security: {
    overview: "Contexte sécuritaire stable, posture de neutralité active — donnée de démonstration, à sourcer.",
    conflicts: ["Vigilance frontalière liée au conflit yéménite", "Sécurité maritime du détroit d'Ormuz"],
    armedActors: [{ name: "Forces armées omanaises", type: "Military", role: "Armée régulière" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Hydrocarbures", "Logistique portuaire", "Tourisme"],
    resources: ["Pétrole", "Gaz naturel"],
    constraints: ["Diversification économique encore en cours", "Dépendance résiduelle aux hydrocarbures"],
  },

  infrastructures: [
    { name: "Port de Salalah", type: "Port", location: "Salalah", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Port de Duqm", type: "Port", location: "Duqm", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Détroit d'Ormuz (contrôle partiel)", type: "Route", location: "Péninsule de Musandam", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société relativement homogène religieusement (majorité ibadite, spécificité régionale) — donnée de démonstration.",
    urbanization: "≈ 87 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam ibadite (majoritaire, spécificité omanaise)", "Islam sunnite", "Islam chiite"],
  },

  environment: {
    overview: "Diversité climatique notable (désert, montagnes, zone de mousson à Salalah) — donnée de démonstration.",
    risks: ["Cyclones tropicaux occasionnels (côte sud)", "Stress hydrique", "Vagues de chaleur"],
  },

  keyActors: [
    { name: "Gouvernement omanais", type: "Government", country: "Oman", role: "Exécutif" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Partenaire de médiation régionale" },
  ],
  relatedEvents: [],
  sources: [
    { id: "oman-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
