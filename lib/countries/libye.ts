import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const LIBYE: CountryProfile = {
  id: "libye",
  slug: "libye",
  zoneSlug: "afrique",
  name: "Libye",
  iso3: "LBY",
  capital: "Tripoli",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe"],
  currency: "Dinar libyen",
  government: "Transition politique, autorités rivales",

  overview: {
    summary: "La Libye reste divisée depuis 2011 entre gouvernements rivaux à l'Ouest et à l'Est du pays. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Algérie","Égypte","Niger","Soudan","Tchad","Tunisie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Transition politique, autorités rivales",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Algérie","Égypte","Niger","Soudan","Tchad"],
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

  keyActors: [{ name: "Gouvernement de Libye", type: "Government", country: "Libye", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "libye-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
