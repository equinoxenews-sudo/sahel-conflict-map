import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const PEROU: CountryProfile = {
  id: "perou",
  slug: "perou",
  zoneSlug: "amerique-du-sud",
  name: "Pérou",
  iso3: "PER",
  capital: "Lima",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol","Quechua"],
  currency: "Sol péruvien",
  government: "République présidentielle",

  overview: {
    summary: "Le Pérou combine instabilité politique récurrente et importantes ressources minières andines. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Bolivie","Brésil","Chili","Colombie","Équateur","Venezuela"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Bolivie","Brésil","Chili","Colombie","Équateur"],
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
    languages: ["Espagnol","Quechua"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Pérou", type: "Government", country: "Pérou", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "perou-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
