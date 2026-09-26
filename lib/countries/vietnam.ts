import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const VIETNAM: CountryProfile = {
  id: "vietnam",
  slug: "vietnam",
  zoneSlug: "indopacifique",
  name: "Vietnam",
  iso3: "VNM",
  capital: "Hanoï",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Vietnamien"],
  currency: "Dong",
  government: "République socialiste à parti unique",

  overview: {
    summary: "Le Vietnam est une économie manufacturière en forte croissance d'Asie du Sud-Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["China","Cambodia","Laos","Thailand"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République socialiste à parti unique",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["China","Cambodia","Laos","Thailand"],
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
    languages: ["Vietnamien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Vietnam", type: "Government", country: "Vietnam", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "vietnam-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
