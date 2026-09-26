import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const FRANCE: CountryProfile = {
  id: "france",
  slug: "france",
  zoneSlug: "europe",
  name: "France",
  iso3: "FRA",
  capital: "Paris",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Euro",
  government: "République semi-présidentielle",

  overview: {
    summary: "La France est une puissance nucléaire et membre permanent du Conseil de sécurité de l'ONU. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Autriche","Belgique","Suisse","Allemagne","Espagne","Royaume-Uni","Italie","Luxembourg","Pays-Bas"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Autriche","Belgique","Suisse","Allemagne","Espagne"],
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

  keyActors: [{ name: "Gouvernement de France", type: "Government", country: "France", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "france-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
