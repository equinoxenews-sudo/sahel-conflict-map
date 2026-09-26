import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BRESIL: CountryProfile = {
  id: "bresil",
  slug: "bresil",
  zoneSlug: "amerique-du-sud",
  name: "Brésil",
  iso3: "BRA",
  capital: "Brasília",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Real brésilien",
  government: "République fédérale présidentielle",

  overview: {
    summary: "Le Brésil est la première économie d'Amérique du Sud et abrite l'essentiel du bassin amazonien. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Argentine","Bolivie","Chili","Colombie","Équateur","Guyane française","Guyana","Panama","Pérou","Paraguay","Suriname","Uruguay","Venezuela"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Argentine","Bolivie","Chili","Colombie","Équateur"],
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

  keyActors: [{ name: "Gouvernement de Brésil", type: "Government", country: "Brésil", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "bresil-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
