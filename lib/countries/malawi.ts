import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MALAWI: CountryProfile = {
  id: "malawi",
  slug: "malawi",
  zoneSlug: "afrique",
  name: "Malawi",
  iso3: "MWI",
  capital: "Lilongwe",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais","Chichewa"],
  currency: "Kwacha malawite",
  government: "République présidentielle",

  overview: {
    summary: "Le Malawi est l'un des pays les plus pauvres d'Afrique australe. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Mozambique","Tanzanie","Zambie","Zimbabwe"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Mozambique","Tanzanie","Zambie","Zimbabwe"],
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
    languages: ["Anglais","Chichewa"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Malawi", type: "Government", country: "Malawi", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "malawi-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
