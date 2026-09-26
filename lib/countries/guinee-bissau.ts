import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GUINEE_BISSAU: CountryProfile = {
  id: "guinee-bissau",
  slug: "guinee-bissau",
  zoneSlug: "afrique",
  name: "Guinée-Bissau",
  iso3: "GNB",
  capital: "Bissau",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Franc CFA (BCEAO)",
  government: "République semi-présidentielle",

  overview: {
    summary: "La Guinée-Bissau est marquée par une forte instabilité politique et le narcotrafic transatlantique. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Guinée","Sénégal"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Guinée","Sénégal"],
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

  keyActors: [{ name: "Gouvernement de Guinée-Bissau", type: "Government", country: "Guinée-Bissau", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "guinee-bissau-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
