import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CHINE: CountryProfile = {
  id: "chine",
  slug: "chine",
  zoneSlug: "indopacifique",
  name: "Chine",
  iso3: "CHN",
  capital: "Pékin",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Mandarin"],
  currency: "Yuan renminbi",
  government: "République socialiste à parti unique",

  overview: {
    summary: "La Chine est une grande puissance industrielle, démographique et militaire d'Asie de l'Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Afghanistan","Bangladesh","Bhoutan","Inde","Japon","Kazakhstan","Kirghizistan","Cambodge","Corée du Sud","Laos","Myanmar","Mongolie","Népal","Pakistan","Philippines","Corée du Nord","Russie","Thaïlande","Tadjikistan","Taïwan","Ouzbékistan","Vietnam"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République socialiste à parti unique",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Afghanistan","Bangladesh","Bhoutan","Inde","Japon"],
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
    languages: ["Mandarin"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Chine", type: "Government", country: "Chine", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "chine-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
