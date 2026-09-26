import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const PARAGUAY: CountryProfile = {
  id: "paraguay",
  slug: "paraguay",
  zoneSlug: "amerique-du-sud",
  name: "Paraguay",
  iso3: "PRY",
  capital: "Asunción",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol","Guarani"],
  currency: "Guarani",
  government: "République présidentielle",

  overview: {
    summary: "Le Paraguay est une économie agricole enclavée d'Amérique du Sud. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Argentine","Bolivie","Brésil"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Argentine","Bolivie","Brésil"],
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
    languages: ["Espagnol","Guarani"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Paraguay", type: "Government", country: "Paraguay", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "paraguay-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
