import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const LAOS: CountryProfile = {
  id: "laos",
  slug: "laos",
  zoneSlug: "indopacifique",
  name: "Laos",
  iso3: "LAO",
  capital: "Vientiane",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Lao"],
  currency: "Kip",
  government: "République socialiste à parti unique",

  overview: {
    summary: "Le Laos est un État enclavé d'Asie du Sud-Est, fortement dépendant des investissements chinois. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Chine","Cambodge","Myanmar","Thaïlande","Vietnam"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République socialiste à parti unique",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Chine","Cambodge","Myanmar","Thaïlande","Vietnam"],
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
    languages: ["Lao"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Laos", type: "Government", country: "Laos", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "laos-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
