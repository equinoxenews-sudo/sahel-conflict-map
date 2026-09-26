import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const INDONESIE: CountryProfile = {
  id: "indonesie",
  slug: "indonesie",
  zoneSlug: "indopacifique",
  name: "Indonésie",
  iso3: "IDN",
  capital: "Jakarta",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Indonésien"],
  currency: "Roupie indonésienne",
  government: "République présidentielle",

  overview: {
    summary: "L'Indonésie est le plus vaste archipel du monde et la première économie d'Asie du Sud-Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Australie","Brunei","Inde","Malaisie","Philippines","Papouasie-Nouvelle-Guinée","Thaïlande","Timor oriental"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Australie","Brunei","Inde","Malaisie","Philippines"],
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
    languages: ["Indonésien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Indonésie", type: "Government", country: "Indonésie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "indonesie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
