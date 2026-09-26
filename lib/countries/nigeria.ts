import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const NIGERIA: CountryProfile = {
  id: "nigeria",
  slug: "nigeria",
  zoneSlug: "afrique",
  name: "Nigeria",
  iso3: "NGA",
  capital: "Abuja",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais"],
  currency: "Naira",
  government: "République fédérale présidentielle",

  overview: {
    summary: "Le Nigeria est la première économie et le pays le plus peuplé d'Afrique, confronté à l'insurrection jihadiste de Boko Haram/ISWAP dans le Nord-Est. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Benin","Burkina Faso","République centrafricaine","Cameroun","République démocratique du Congo","République du Congo","Mali","Niger","Tchad","Togo"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Benin","Burkina Faso","République centrafricaine","Cameroun","République démocratique du Congo"],
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
    languages: ["Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Nigeria", type: "Government", country: "Nigeria", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "nigeria-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
