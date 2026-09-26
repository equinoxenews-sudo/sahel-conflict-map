import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GABON: CountryProfile = {
  id: "gabon",
  slug: "gabon",
  zoneSlug: "afrique",
  name: "Gabon",
  iso3: "GAB",
  capital: "Libreville",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BEAC)",
  government: "République présidentielle (transition militaire depuis 2023)",

  overview: {
    summary: "Le Gabon est un producteur pétrolier d'Afrique centrale dirigé par une junte militaire depuis le coup d'État d'août 2023. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Angola","République centrafricaine","Cameroun","République démocratique du Congo","République du Congo","Guinée équatoriale"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle (transition militaire depuis 2023)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Angola","République centrafricaine","Cameroun","République démocratique du Congo","République du Congo"],
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

  keyActors: [{ name: "Gouvernement de Gabon", type: "Government", country: "Gabon", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "gabon-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
