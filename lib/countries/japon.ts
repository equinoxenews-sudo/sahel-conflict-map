import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const JAPON: CountryProfile = {
  id: "japon",
  slug: "japon",
  zoneSlug: "indopacifique",
  name: "Japon",
  iso3: "JPN",
  capital: "Tokyo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Japonais"],
  currency: "Yen",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "Le Japon est une puissance économique et technologique majeure d'Asie de l'Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["China","South Korea","North Korea","Russia"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["China","South Korea","North Korea","Russia"],
  },

  security: {
    overview: "Donnée de démonstration — à remplacer par une évaluation vérifiée et datée.",
    hotspots: [],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Donnée de démonstration"],
    resources: ["Donnée de démonstration"],
  },

  infrastructures: [],

  society: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    languages: ["Japonais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Japon", type: "Government", country: "Japon", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "japon-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
