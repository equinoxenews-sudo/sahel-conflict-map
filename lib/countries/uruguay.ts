import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const URUGUAY: CountryProfile = {
  id: "uruguay",
  slug: "uruguay",
  zoneSlug: "amerique-du-sud",
  name: "Uruguay",
  iso3: "URY",
  capital: "Montevideo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol"],
  currency: "Peso uruguayen",
  government: "République présidentielle",

  overview: {
    summary: "L'Uruguay est l'une des démocraties les plus stables d'Amérique du Sud. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Argentine","Brésil"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Argentine","Brésil"],
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
    languages: ["Espagnol"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Uruguay", type: "Government", country: "Uruguay", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "uruguay-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
