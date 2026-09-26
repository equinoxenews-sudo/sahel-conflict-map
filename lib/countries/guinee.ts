import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GUINEE: CountryProfile = {
  id: "guinee",
  slug: "guinee",
  zoneSlug: "afrique",
  name: "Guinée",
  iso3: "GIN",
  capital: "Conakry",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc guinéen",
  government: "Régime militaire de transition",

  overview: {
    summary: "La Guinée est dirigée par une junte militaire depuis le coup d'État de 2021. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Côte d'Ivoire","Guinée-Bissau","Liberia","Mali","Sénégal","Sierra Leone"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Régime militaire de transition",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Côte d'Ivoire","Guinée-Bissau","Liberia","Mali","Sénégal"],
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

  keyActors: [{ name: "Gouvernement de Guinée", type: "Government", country: "Guinée", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "guinee-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
