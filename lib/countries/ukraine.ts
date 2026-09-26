import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const UKRAINE: CountryProfile = {
  id: "ukraine",
  slug: "ukraine",
  zoneSlug: "europe",
  name: "Ukraine",
  iso3: "UKR",
  capital: "Kiev",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Ukrainien"],
  currency: "Hryvnia",
  government: "République semi-présidentielle",

  overview: {
    summary: "L'Ukraine est en guerre depuis l'invasion russe de février 2022, après l'annexion de la Crimée en 2014. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Bulgarie","Biélorussie","Géorgie","Hongrie","Kosovo","Moldavie","Pologne","Roumanie","Serbie","Slovaquie","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Bulgarie","Biélorussie","Géorgie","Hongrie","Kosovo"],
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
    languages: ["Ukrainien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Ukraine", type: "Government", country: "Ukraine", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "ukraine-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
