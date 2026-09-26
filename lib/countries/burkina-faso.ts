import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BURKINA_FASO: CountryProfile = {
  id: "burkina-faso",
  slug: "burkina-faso",
  zoneSlug: "afrique",
  name: "Burkina Faso",
  iso3: "BFA",
  capital: "Ouagadougou",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BCEAO)",
  government: "Régime militaire de transition",

  overview: {
    summary: "Le Burkina Faso est en proie depuis 2015 à une insurrection jihadiste et a connu plusieurs coups d'État militaires depuis 2022. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Benin","Côte d'Ivoire","Ghana","Mali","Mauritanie","Niger","Nigeria","Togo"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Régime militaire de transition",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Benin","Côte d'Ivoire","Ghana","Mali","Mauritanie"],
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

  keyActors: [{ name: "Gouvernement de Burkina Faso", type: "Government", country: "Burkina Faso", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "burkina-faso-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
