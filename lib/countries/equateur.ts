import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const EQUATEUR: CountryProfile = {
  id: "equateur",
  slug: "equateur",
  zoneSlug: "amerique-du-sud",
  name: "Équateur",
  iso3: "ECU",
  capital: "Quito",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol"],
  currency: "Dollar américain",
  government: "République présidentielle",

  overview: {
    summary: "L'Équateur, dollarisé depuis 2000, fait face à une insécurité croissante liée au narcotrafic. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Colombie","Pérou"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Colombie","Pérou"],
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
    languages: ["Espagnol"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Équateur", type: "Government", country: "Équateur", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "equateur-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
