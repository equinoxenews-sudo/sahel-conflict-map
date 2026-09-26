import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const REPUBLIQUE_DU_CONGO: CountryProfile = {
  id: "republique-du-congo",
  slug: "republique-du-congo",
  zoneSlug: "afrique",
  name: "République du Congo",
  iso3: "COG",
  capital: "Brazzaville",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BEAC)",
  government: "République présidentielle",

  overview: {
    summary: "La République du Congo est un État pétrolier d'Afrique centrale. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Angola","République centrafricaine","Cameroun","République démocratique du Congo","Gabon","Guinée équatoriale","Nigeria"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Angola","République centrafricaine","Cameroun","République démocratique du Congo","Gabon"],
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
    languages: ["Français"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de République du Congo", type: "Government", country: "République du Congo", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "republique-du-congo-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
