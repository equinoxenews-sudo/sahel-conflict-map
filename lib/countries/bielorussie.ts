import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BIELORUSSIE: CountryProfile = {
  id: "bielorussie",
  slug: "bielorussie",
  zoneSlug: "europe",
  name: "Biélorussie",
  iso3: "BLR",
  capital: "Minsk",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Biélorusse","Russe"],
  currency: "Rouble biélorusse",
  government: "République présidentielle (régime autoritaire)",

  overview: {
    summary: "La Biélorussie est un allié politique et militaire proche de la Russie, dirigé par Alexandre Loukachenko depuis 1994. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Lituanie","Lettonie","Pologne","Suède","Ukraine","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle (régime autoritaire)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Lituanie","Lettonie","Pologne","Suède","Ukraine"],
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
    languages: ["Biélorusse","Russe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Biélorussie", type: "Government", country: "Biélorussie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "bielorussie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
