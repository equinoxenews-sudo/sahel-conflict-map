import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ITALIE: CountryProfile = {
  id: "italie",
  slug: "italie",
  zoneSlug: "europe",
  name: "Italie",
  iso3: "ITA",
  capital: "Rome",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Italien"],
  currency: "Euro",
  government: "République parlementaire",

  overview: {
    summary: "L'Italie est une puissance économique majeure d'Europe du Sud, membre fondateur de l'Union européenne. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Albanie","Autriche","Bosnie-Herzégovine","Suisse","Allemagne","Algérie","France","Croatie","Hongrie","Malte","Monténégro","Serbie","Slovaquie","Slovénie","Tunisie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Albanie","Autriche","Bosnie-Herzégovine","Suisse","Allemagne"],
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
    languages: ["Italien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Italie", type: "Government", country: "Italie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "italie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
