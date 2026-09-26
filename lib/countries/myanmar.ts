import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MYANMAR: CountryProfile = {
  id: "myanmar",
  slug: "myanmar",
  zoneSlug: "indopacifique",
  name: "Myanmar",
  iso3: "MMR",
  capital: "Naypyidaw",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Birman"],
  currency: "Kyat",
  government: "Régime militaire (junte depuis 2021)",

  overview: {
    summary: "Le Myanmar est un pays en guerre civile depuis le coup d'État militaire de 2021. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Bangladesh","Bhutan","China","India","Cambodia","Laos","Thailand","Vietnam"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Régime militaire (junte depuis 2021)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Bangladesh","Bhutan","China","India","Cambodia"],
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
    languages: ["Birman"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Myanmar", type: "Government", country: "Myanmar", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "myanmar-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
