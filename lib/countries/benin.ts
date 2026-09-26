import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BENIN: CountryProfile = {
  id: "benin",
  slug: "benin",
  zoneSlug: "afrique",
  name: "Bénin",
  iso3: "BEN",
  capital: "Porto-Novo (capitale officielle) / Cotonou (siège du gouvernement)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BCEAO)",
  government: "République présidentielle",

  overview: {
    summary: "Le Bénin est une démocratie d'Afrique de l'Ouest confrontée depuis peu à des incursions jihadistes venues du Sahel. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Burkina Faso","Ghana","Mali","Niger","Nigeria","Togo"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Burkina Faso","Ghana","Mali","Niger","Nigeria"],
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

  keyActors: [{ name: "Gouvernement de Bénin", type: "Government", country: "Bénin", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "benin-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
