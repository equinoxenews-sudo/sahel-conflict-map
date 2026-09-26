import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const TIMOR_ORIENTAL: CountryProfile = {
  id: "timor-oriental",
  slug: "timor-oriental",
  zoneSlug: "indopacifique",
  name: "Timor oriental",
  iso3: "TLS",
  capital: "Dili",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Tetum","Portugais"],
  currency: "Dollar américain",
  government: "République semi-présidentielle",

  overview: {
    summary: "Le Timor oriental est un jeune État d'Asie du Sud-Est, indépendant depuis 2002. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Indonesia"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Indonesia"],
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
    languages: ["Tetum","Portugais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Timor oriental", type: "Government", country: "Timor oriental", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "timor-oriental-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
