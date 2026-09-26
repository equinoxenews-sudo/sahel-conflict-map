import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ESWATINI: CountryProfile = {
  id: "eswatini",
  slug: "eswatini",
  zoneSlug: "afrique",
  name: "Eswatini",
  iso3: "SWZ",
  capital: "Mbabane (siège du gouvernement) / Lobamba (siège législatif et royal)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Swati","Anglais"],
  currency: "Lilangeni",
  government: "Monarchie absolue",

  overview: {
    summary: "L'Eswatini (ex-Swaziland) est la dernière monarchie absolue d'Afrique. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Mozambique","Afrique du Sud"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie absolue",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Mozambique","Afrique du Sud"],
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
    languages: ["Swati","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Eswatini", type: "Government", country: "Eswatini", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "eswatini-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
