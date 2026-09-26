import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const THAILANDE: CountryProfile = {
  id: "thailande",
  slug: "thailande",
  zoneSlug: "indopacifique",
  name: "Thaïlande",
  iso3: "THA",
  capital: "Bangkok",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Thaï"],
  currency: "Baht",
  government: "Monarchie constitutionnelle",

  overview: {
    summary: "La Thaïlande est une économie touristique et industrielle majeure d'Asie du Sud-Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Chine","Indonésie","Inde","Cambodge","Laos","Myanmar","Malaisie","Vietnam"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Chine","Indonésie","Inde","Cambodge","Laos"],
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
    languages: ["Thaï"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Thaïlande", type: "Government", country: "Thaïlande", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "thailande-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
