import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const COTE_D_IVOIRE: CountryProfile = {
  id: "cote-d-ivoire",
  slug: "cote-d-ivoire",
  zoneSlug: "afrique",
  name: "Côte d'Ivoire",
  iso3: "CIV",
  capital: "Yamoussoukro (capitale officielle) / Abidjan (centre économique)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BCEAO)",
  government: "République présidentielle",

  overview: {
    summary: "La Côte d'Ivoire est la première économie d'Afrique de l'Ouest francophone, sortie de crises politico-militaires successives. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Burkina Faso","Ghana","Guinée","Liberia","Mali"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Burkina Faso","Ghana","Guinée","Liberia","Mali"],
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

  keyActors: [{ name: "Gouvernement de Côte d'Ivoire", type: "Government", country: "Côte d'Ivoire", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "cote-d-ivoire-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
