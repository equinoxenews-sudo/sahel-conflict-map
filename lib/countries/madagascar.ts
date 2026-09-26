import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MADAGASCAR: CountryProfile = {
  id: "madagascar",
  slug: "madagascar",
  zoneSlug: "afrique",
  name: "Madagascar",
  iso3: "MDG",
  capital: "Antananarivo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Malgache","Français"],
  currency: "Ariary malgache",
  government: "République présidentielle",

  overview: {
    summary: "Madagascar est une grande île de l'océan Indien confrontée à une pauvreté endémique et à des crises politiques récurrentes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: [],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: [],
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
    languages: ["Malgache","Français"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Madagascar", type: "Government", country: "Madagascar", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "madagascar-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
