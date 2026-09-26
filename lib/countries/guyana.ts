import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GUYANA: CountryProfile = {
  id: "guyana",
  slug: "guyana",
  zoneSlug: "amerique-du-sud",
  name: "Guyana",
  iso3: "GUY",
  capital: "Georgetown",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais"],
  currency: "Dollar guyanien",
  government: "République présidentielle",

  overview: {
    summary: "Le Guyana connaît un essor pétrolier rapide depuis les découvertes offshore de la fin des années 2010. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Brésil","Suriname","Venezuela"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Brésil","Suriname","Venezuela"],
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
    languages: ["Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Guyana", type: "Government", country: "Guyana", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "guyana-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
