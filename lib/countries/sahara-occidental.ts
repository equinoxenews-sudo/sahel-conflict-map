import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SAHARA_OCCIDENTAL: CountryProfile = {
  id: "sahara-occidental",
  slug: "sahara-occidental",
  zoneSlug: "afrique",
  name: "Sahara occidental",
  iso3: "ESH",
  capital: "Laâyoune (administrée par le Maroc)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe"],
  currency: "Dirham marocain",
  government: "Territoire non autonome disputé",

  overview: {
    summary: "Le Sahara occidental est un territoire disputé entre le Maroc et le Front Polisario, sur la liste ONU des territoires non autonomes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Algérie","Maroc","Mali","Mauritanie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Territoire non autonome disputé",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Algérie","Maroc","Mali","Mauritanie"],
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
    languages: ["Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Sahara occidental", type: "Government", country: "Sahara occidental", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "sahara-occidental-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
