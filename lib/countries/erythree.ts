import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ERYTHREE: CountryProfile = {
  id: "erythree",
  slug: "erythree",
  zoneSlug: "afrique",
  name: "Érythrée",
  iso3: "ERI",
  capital: "Asmara",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Tigrigna","Arabe"],
  currency: "Nakfa",
  government: "République à parti unique (régime autoritaire)",

  overview: {
    summary: "L'Érythrée est un État très fermé de la Corne de l'Afrique, en conflit larvé avec l'Éthiopie. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Djibouti","Éthiopie","Arabie saoudite","Soudan","Somalie","Yémen"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République à parti unique (régime autoritaire)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Djibouti","Éthiopie","Arabie saoudite","Soudan","Somalie"],
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
    languages: ["Tigrigna","Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Érythrée", type: "Government", country: "Érythrée", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "erythree-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
