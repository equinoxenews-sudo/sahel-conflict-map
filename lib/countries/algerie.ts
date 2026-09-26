import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ALGERIE: CountryProfile = {
  id: "algerie",
  slug: "algerie",
  zoneSlug: "afrique",
  name: "Algérie",
  iso3: "DZA",
  capital: "Alger",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe","Tamazight"],
  currency: "Dinar algérien",
  government: "République présidentielle",

  overview: {
    summary: "L'Algérie est un grand producteur d'hydrocarbures d'Afrique du Nord. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Espagne","Italie","Libye","Maroc","Mali","Mauritanie","Niger","Portugal","Sahara occidental","Tchad","Tunisie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Espagne","Italie","Libye","Maroc","Mali"],
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

  keyActors: [{ name: "Gouvernement de Algérie", type: "Government", country: "Algérie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "algerie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
