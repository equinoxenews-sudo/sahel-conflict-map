import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const AFRIQUE_DU_SUD: CountryProfile = {
  id: "afrique-du-sud",
  slug: "afrique-du-sud",
  zoneSlug: "afrique",
  name: "Afrique du Sud",
  iso3: "ZAF",
  capital: "Pretoria (exécutif) / Le Cap (législatif) / Bloemfontein (judiciaire)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais","Zoulou","Afrikaans","Xhosa"],
  currency: "Rand",
  government: "République parlementaire",

  overview: {
    summary: "L'Afrique du Sud est la puissance économique la plus industrialisée d'Afrique australe. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Botswana","Lesotho","Mozambique","Namibie","Eswatini","Zimbabwe"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Botswana","Lesotho","Mozambique","Namibie","Eswatini"],
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
    languages: ["Anglais","Zoulou","Afrikaans","Xhosa"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Afrique du Sud", type: "Government", country: "Afrique du Sud", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "afrique-du-sud-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
