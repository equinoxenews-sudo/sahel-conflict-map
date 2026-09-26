import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ALLEMAGNE: CountryProfile = {
  id: "allemagne",
  slug: "allemagne",
  zoneSlug: "europe",
  name: "Allemagne",
  iso3: "DEU",
  capital: "Berlin",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Allemand"],
  currency: "Euro",
  government: "République fédérale parlementaire",

  overview: {
    summary: "L'Allemagne est la première puissance économique d'Europe. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Autriche","Belgique","Suisse","Tchéquie","Danemark","France","Italie","Luxembourg","Pays-Bas","Pologne","Slovénie","Suède"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Autriche","Belgique","Suisse","Tchéquie","Danemark"],
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
    languages: ["Allemand"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Allemagne", type: "Government", country: "Allemagne", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "allemagne-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
