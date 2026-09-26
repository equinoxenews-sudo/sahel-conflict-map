import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const LUXEMBOURG: CountryProfile = {
  id: "luxembourg",
  slug: "luxembourg",
  zoneSlug: "europe",
  name: "Luxembourg",
  iso3: "LUX",
  capital: "Luxembourg",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Luxembourgeois","Français","Allemand"],
  currency: "Euro",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "Le Luxembourg est un petit État d'Europe occidentale, place financière majeure et siège d'institutions européennes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Belgique","Allemagne","France"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Belgique","Allemagne","France"],
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
    languages: ["Luxembourgeois","Français","Allemand"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Luxembourg", type: "Government", country: "Luxembourg", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "luxembourg-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
