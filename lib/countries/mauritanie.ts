import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MAURITANIE: CountryProfile = {
  id: "mauritanie",
  slug: "mauritanie",
  zoneSlug: "afrique",
  name: "Mauritanie",
  iso3: "MRT",
  capital: "Nouakchott",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe"],
  currency: "Ouguiya",
  government: "République présidentielle",

  overview: {
    summary: "La Mauritanie constitue un maillon clé de la lutte contre le jihadisme au Sahel malgré une relative stabilité intérieure. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Burkina Faso","Algérie","Gambie","Maroc","Mali","Sahara occidental","Sénégal"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Burkina Faso","Algérie","Gambie","Maroc","Mali"],
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

  keyActors: [{ name: "Gouvernement de Mauritanie", type: "Government", country: "Mauritanie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "mauritanie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
