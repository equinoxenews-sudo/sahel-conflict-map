import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const COREE_DU_NORD: CountryProfile = {
  id: "coree-du-nord",
  slug: "coree-du-nord",
  zoneSlug: "indopacifique",
  name: "Corée du Nord",
  iso3: "PRK",
  capital: "Pyongyang",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Coréen"],
  currency: "Won nord-coréen",
  government: "République à parti unique (régime autoritaire)",

  overview: {
    summary: "La Corée du Nord est un État isolé au programme nucléaire militaire, au cœur des tensions régionales. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["China","Japan","South Korea","Russia"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République à parti unique (régime autoritaire)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["China","Japan","South Korea","Russia"],
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
    languages: ["Coréen"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Corée du Nord", type: "Government", country: "Corée du Nord", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "coree-du-nord-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
