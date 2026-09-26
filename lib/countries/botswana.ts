import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BOTSWANA: CountryProfile = {
  id: "botswana",
  slug: "botswana",
  zoneSlug: "afrique",
  name: "Botswana",
  iso3: "BWA",
  capital: "Gaborone",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais","Tswana"],
  currency: "Pula",
  government: "République parlementaire",

  overview: {
    summary: "Le Botswana est une démocratie stable d'Afrique australe, grand producteur de diamants. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Angola","Mozambique","Namibie","Afrique du Sud","Zambie","Zimbabwe"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Angola","Mozambique","Namibie","Afrique du Sud","Zambie"],
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
    languages: ["Anglais","Tswana"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Botswana", type: "Government", country: "Botswana", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "botswana-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
