import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MALI: CountryProfile = {
  id: "mali",
  slug: "mali",
  zoneSlug: "afrique",
  name: "Mali",
  iso3: "MLI",
  capital: "Bamako",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BCEAO)",
  government: "Régime militaire de transition",

  overview: {
    summary: "Le Mali est en proie depuis 2012 à une insurrection jihadiste et a rompu avec la France au profit d'une coopération avec la Russie (Africa Corps). Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Benin","Burkina Faso","Côte d'Ivoire","Algérie","Ghana","Guinée","Maroc","Mauritanie","Niger","Nigeria","Sahara occidental","Sénégal","Sierra Leone","Togo"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Régime militaire de transition",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Benin","Burkina Faso","Côte d'Ivoire","Algérie","Ghana"],
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
    languages: ["Français"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Mali", type: "Government", country: "Mali", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "mali-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
