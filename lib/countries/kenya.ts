import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const KENYA: CountryProfile = {
  id: "kenya",
  slug: "kenya",
  zoneSlug: "afrique",
  name: "Kenya",
  iso3: "KEN",
  capital: "Nairobi",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Swahili","Anglais"],
  currency: "Shilling kényan",
  government: "République présidentielle",

  overview: {
    summary: "Le Kenya est un pôle économique et diplomatique majeur d'Afrique de l'Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Éthiopie","Soudan du Sud","Somalie","Tanzanie","Ouganda"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Éthiopie","Soudan du Sud","Somalie","Tanzanie","Ouganda"],
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
    languages: ["Swahili","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Kenya", type: "Government", country: "Kenya", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "kenya-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
