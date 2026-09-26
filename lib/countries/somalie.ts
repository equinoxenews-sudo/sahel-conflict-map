import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SOMALIE: CountryProfile = {
  id: "somalie",
  slug: "somalie",
  zoneSlug: "afrique",
  name: "Somalie",
  iso3: "SOM",
  capital: "Mogadiscio",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Somali","Arabe"],
  currency: "Shilling somalien",
  government: "République fédérale présidentielle",

  overview: {
    summary: "La Somalie lutte depuis des décennies contre l'insurrection jihadiste des Chabab, avec un État fédéral aux institutions fragiles. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Djibouti","Érythrée","Éthiopie","Kenya","Somaliland","Tanzanie","Yémen"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Djibouti","Érythrée","Éthiopie","Kenya","Somaliland"],
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
    languages: ["Somali","Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Somalie", type: "Government", country: "Somalie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "somalie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
