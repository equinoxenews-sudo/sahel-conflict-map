import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GUINEE_EQUATORIALE: CountryProfile = {
  id: "guinee-equatoriale",
  slug: "guinee-equatoriale",
  zoneSlug: "afrique",
  name: "Guinée équatoriale",
  iso3: "GNQ",
  capital: "Malabo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol","Français"],
  currency: "Franc CFA (BEAC)",
  government: "République présidentielle (régime autoritaire)",

  overview: {
    summary: "La Guinée équatoriale est un petit État pétrolier d'Afrique centrale dirigé par la même famille depuis 1979. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Cameroun","République du Congo","Gabon"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle (régime autoritaire)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Cameroun","République du Congo","Gabon"],
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
    languages: ["Espagnol","Français"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Guinée équatoriale", type: "Government", country: "Guinée équatoriale", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "guinee-equatoriale-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
