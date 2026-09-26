import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MAROC: CountryProfile = {
  id: "maroc",
  slug: "maroc",
  zoneSlug: "afrique",
  name: "Maroc",
  iso3: "MAR",
  capital: "Rabat",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe","Tamazight"],
  currency: "Dirham marocain",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "Le Maroc administre le Sahara occidental, territoire disputé dont le statut n'est pas reconnu par l'ONU. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Algérie","Espagne","Mali","Mauritanie","Portugal","Sahara occidental"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Algérie","Espagne","Mali","Mauritanie","Portugal"],
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
    languages: ["Arabe","Tamazight"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Maroc", type: "Government", country: "Maroc", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "maroc-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
