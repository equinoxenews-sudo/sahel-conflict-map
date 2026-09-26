import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ANGOLA: CountryProfile = {
  id: "angola",
  slug: "angola",
  zoneSlug: "afrique",
  name: "Angola",
  iso3: "AGO",
  capital: "Luanda",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Kwanza",
  government: "République présidentielle",

  overview: {
    summary: "L'Angola est un grand producteur de pétrole d'Afrique australe, sorti d'une longue guerre civile en 2002. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Botswana","République démocratique du Congo","République du Congo","Gabon","Namibie","Zambie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Botswana","République démocratique du Congo","République du Congo","Gabon","Namibie"],
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

  keyActors: [{ name: "Gouvernement de Angola", type: "Government", country: "Angola", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "angola-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
