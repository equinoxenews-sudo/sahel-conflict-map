import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const DJIBOUTI: CountryProfile = {
  id: "djibouti",
  slug: "djibouti",
  zoneSlug: "afrique",
  name: "Djibouti",
  iso3: "DJI",
  capital: "Djibouti",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français","Arabe"],
  currency: "Franc djiboutien",
  government: "République présidentielle",

  overview: {
    summary: "Djibouti est un petit État stratégique de la Corne de l'Afrique, hôte de plusieurs bases militaires étrangères dont une française et une chinoise. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Érythrée","Éthiopie","Somaliland","Somalie","Yémen"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Érythrée","Éthiopie","Somaliland","Somalie","Yémen"],
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
    languages: ["Français","Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Djibouti", type: "Government", country: "Djibouti", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "djibouti-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
