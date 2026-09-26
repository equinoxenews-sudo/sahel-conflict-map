import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const PHILIPPINES: CountryProfile = {
  id: "philippines",
  slug: "philippines",
  zoneSlug: "indopacifique",
  name: "Philippines",
  iso3: "PHL",
  capital: "Manille",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Filipino","Anglais"],
  currency: "Peso philippin",
  government: "République présidentielle",

  overview: {
    summary: "Les Philippines sont un archipel exposé aux tensions en mer de Chine méridionale et aux catastrophes naturelles. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Chine","Indonésie","Malaisie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Chine","Indonésie","Malaisie"],
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
    languages: ["Filipino","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Philippines", type: "Government", country: "Philippines", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "philippines-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
