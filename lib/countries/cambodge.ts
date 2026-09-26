import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CAMBODGE: CountryProfile = {
  id: "cambodge",
  slug: "cambodge",
  zoneSlug: "indopacifique",
  name: "Cambodge",
  iso3: "KHM",
  capital: "Phnom Penh",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Khmer"],
  currency: "Riel",
  government: "Monarchie constitutionnelle",

  overview: {
    summary: "Le Cambodge est une économie en développement d'Asie du Sud-Est, marquée par une gouvernance dominée par un parti unique de fait. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Laos","Thailand","Vietnam"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Laos","Thailand","Vietnam"],
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
    languages: ["Khmer"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Cambodge", type: "Government", country: "Cambodge", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "cambodge-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
