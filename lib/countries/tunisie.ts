import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const TUNISIE: CountryProfile = {
  id: "tunisie",
  slug: "tunisie",
  zoneSlug: "afrique",
  name: "Tunisie",
  iso3: "TUN",
  capital: "Tunis",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe"],
  currency: "Dinar tunisien",
  government: "République présidentielle",

  overview: {
    summary: "La Tunisie, berceau des printemps arabes de 2011, a connu depuis 2021 un recul démocratique sous la présidence de Kaïs Saïed. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Algérie","Italie","Libye"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Algérie","Italie","Libye"],
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

  keyActors: [{ name: "Gouvernement de Tunisie", type: "Government", country: "Tunisie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "tunisie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
