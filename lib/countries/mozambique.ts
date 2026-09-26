import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MOZAMBIQUE: CountryProfile = {
  id: "mozambique",
  slug: "mozambique",
  zoneSlug: "afrique",
  name: "Mozambique",
  iso3: "MOZ",
  capital: "Maputo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Metical",
  government: "République présidentielle",

  overview: {
    summary: "Le Mozambique fait face à une insurrection jihadiste dans la province septentrionale du Cabo Delgado. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Botswana","République démocratique du Congo","Malawi","Eswatini","Tanzanie","Afrique du Sud","Zambie","Zimbabwe"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Botswana","République démocratique du Congo","Malawi","Eswatini","Tanzanie"],
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
    languages: ["Portugais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Mozambique", type: "Government", country: "Mozambique", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "mozambique-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
