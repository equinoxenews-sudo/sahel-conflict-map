import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SLOVENIE: CountryProfile = {
  id: "slovenie",
  slug: "slovenie",
  zoneSlug: "europe",
  name: "Slovénie",
  iso3: "SVN",
  capital: "Ljubljana",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Slovène"],
  currency: "Euro",
  government: "République parlementaire",

  overview: {
    summary: "La Slovénie est un État d'Europe centrale, premier des Balkans à avoir rejoint l'Union européenne. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Autriche","Bosnie-Herzégovine","Croatie","Hongrie","Italie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Autriche","Bosnie-Herzégovine","Croatie","Hongrie","Italie"],
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
    languages: ["Slovène"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Slovénie", type: "Government", country: "Slovénie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "slovenie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
