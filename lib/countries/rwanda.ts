import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const RWANDA: CountryProfile = {
  id: "rwanda",
  slug: "rwanda",
  zoneSlug: "afrique",
  name: "Rwanda",
  iso3: "RWA",
  capital: "Kigali",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Kinyarwanda","Français","Anglais"],
  currency: "Franc rwandais",
  government: "République présidentielle",

  overview: {
    summary: "Le Rwanda est accusé de soutenir des groupes armés dans l'Est de la RD Congo voisine. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Burundi","République démocratique du Congo","Tanzanie","Ouganda"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Burundi","République démocratique du Congo","Tanzanie","Ouganda"],
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
    languages: ["Kinyarwanda","Français","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Rwanda", type: "Government", country: "Rwanda", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "rwanda-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
