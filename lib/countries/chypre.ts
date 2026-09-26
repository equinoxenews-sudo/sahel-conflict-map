import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CHYPRE: CountryProfile = {
  id: "chypre",
  slug: "chypre",
  zoneSlug: "europe",
  name: "Chypre",
  iso3: "CYP",
  capital: "Nicosie",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Grec","Turc"],
  currency: "Euro",
  government: "République présidentielle",

  overview: {
    summary: "Chypre est une île divisée depuis 1974 entre la République de Chypre et la partie nord occupée par la Turquie. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Chypre du Nord (non reconnue)"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Chypre du Nord (non reconnue)"],
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
    languages: ["Grec","Turc"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Chypre", type: "Government", country: "Chypre", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "chypre-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
