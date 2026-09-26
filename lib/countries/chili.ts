import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CHILI: CountryProfile = {
  id: "chili",
  slug: "chili",
  zoneSlug: "amerique-du-sud",
  name: "Chili",
  iso3: "CHL",
  capital: "Santiago",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol"],
  currency: "Peso chilien",
  government: "République présidentielle",

  overview: {
    summary: "Le Chili est une économie stable et exportatrice de cuivre, étirée sur une bande étroite entre Andes et Pacifique. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Argentine","Bolivie","Brésil","Pérou"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Argentine","Bolivie","Brésil","Pérou"],
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

  keyActors: [{ name: "Gouvernement de Chili", type: "Government", country: "Chili", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "chili-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
