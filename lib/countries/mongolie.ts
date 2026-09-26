import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MONGOLIE: CountryProfile = {
  id: "mongolie",
  slug: "mongolie",
  zoneSlug: "indopacifique",
  name: "Mongolie",
  iso3: "MNG",
  capital: "Oulan-Bator",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Mongol"],
  currency: "Tugrik",
  government: "République semi-présidentielle",

  overview: {
    summary: "La Mongolie est un vaste État enclavé entre la Chine et la Russie, à faible densité de population. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Chine","Kazakhstan","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Chine","Kazakhstan","Russie"],
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
    languages: ["Mongol"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Mongolie", type: "Government", country: "Mongolie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "mongolie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
