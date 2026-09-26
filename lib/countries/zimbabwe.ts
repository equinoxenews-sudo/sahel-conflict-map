import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ZIMBABWE: CountryProfile = {
  id: "zimbabwe",
  slug: "zimbabwe",
  zoneSlug: "afrique",
  name: "Zimbabwe",
  iso3: "ZWE",
  capital: "Harare",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais"],
  currency: "Dollar zimbabwéen",
  government: "République présidentielle",

  overview: {
    summary: "Le Zimbabwe reste marqué par une crise économique chronique héritée de l'ère Mugabe. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Botswana","Mozambique","Malawi","Namibie","Afrique du Sud","Zambie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Botswana","Mozambique","Malawi","Namibie","Afrique du Sud"],
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
    languages: ["Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Zimbabwe", type: "Government", country: "Zimbabwe", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "zimbabwe-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
