import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ARMENIE: CountryProfile = {
  id: "armenie",
  slug: "armenie",
  zoneSlug: "europe",
  name: "Arménie",
  iso3: "ARM",
  capital: "Erevan",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arménien"],
  currency: "Dram arménien",
  government: "République parlementaire",

  overview: {
    summary: "L'Arménie est un État du Caucase du Sud, marqué par le conflit du Haut-Karabakh avec l'Azerbaïdjan. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Azerbaïdjan","Géorgie","Iran","Kazakhstan","Turquie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Azerbaïdjan","Géorgie","Iran","Kazakhstan","Turquie"],
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
    languages: ["Arménien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Arménie", type: "Government", country: "Arménie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "armenie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
