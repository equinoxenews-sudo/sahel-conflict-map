import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const AZERBAIDJAN: CountryProfile = {
  id: "azerbaidjan",
  slug: "azerbaidjan",
  zoneSlug: "europe",
  name: "Azerbaïdjan",
  iso3: "AZE",
  capital: "Bakou",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Azéri"],
  currency: "Manat azerbaïdjanais",
  government: "République présidentielle",

  overview: {
    summary: "L'Azerbaïdjan est un État du Caucase du Sud, exportateur d'hydrocarbures, en conflit récurrent avec l'Arménie. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Arménie","Géorgie","Iran","Kazakhstan","Turquie","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Arménie","Géorgie","Iran","Kazakhstan","Turquie"],
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
    languages: ["Azéri"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Azerbaïdjan", type: "Government", country: "Azerbaïdjan", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "azerbaidjan-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
