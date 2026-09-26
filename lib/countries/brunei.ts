import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BRUNEI: CountryProfile = {
  id: "brunei",
  slug: "brunei",
  zoneSlug: "indopacifique",
  name: "Brunei",
  iso3: "BRN",
  capital: "Bandar Seri Begawan",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Malais"],
  currency: "Dollar de Brunei",
  government: "Monarchie absolue (sultanat)",

  overview: {
    summary: "Brunei est un petit sultanat pétrolier de Bornéo. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Indonésie","Malaisie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie absolue (sultanat)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Indonésie","Malaisie"],
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
    languages: ["Malais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Brunei", type: "Government", country: "Brunei", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "brunei-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
