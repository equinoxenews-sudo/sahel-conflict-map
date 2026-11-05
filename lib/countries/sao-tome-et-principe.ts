import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SAO_TOME_ET_PRINCIPE: CountryProfile = {
  id: "sao-tome-et-principe",
  slug: "sao-tome-et-principe",
  zoneSlug: "afrique",
  name: "São Tomé-et-Príncipe",
  iso3: "STP",
  iso2: "ST",
  capital: "São Tomé",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Dobra",
  government: "République semi-présidentielle",

  overview: {
    summary: "São Tomé-et-Príncipe est un archipel du golfe de Guinée, indépendant depuis 1975. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Gabon", "Guinée équatoriale"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Portugal", "Gabon"],
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
    languages: ["Portugais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de São Tomé-et-Príncipe", type: "Government", country: "São Tomé-et-Príncipe", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "sao-tome-et-principe-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-11-05", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-11-05",
};
