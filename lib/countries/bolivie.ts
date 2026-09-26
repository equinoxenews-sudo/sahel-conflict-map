import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BOLIVIE: CountryProfile = {
  id: "bolivie",
  slug: "bolivie",
  zoneSlug: "amerique-du-sud",
  name: "Bolivie",
  iso3: "BOL",
  capital: "Sucre (capitale constitutionnelle) / La Paz (siège du gouvernement)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Espagnol","Langues autochtones officielles"],
  currency: "Boliviano",
  government: "République présidentielle plurinationale",

  overview: {
    summary: "La Bolivie est un pays andin enclavé, riche en ressources minières (lithium, gaz), à forte population autochtone. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Argentine","Brésil","Chili","Pérou","Paraguay"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle plurinationale",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Argentine","Brésil","Chili","Pérou","Paraguay"],
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
    languages: ["Espagnol","Langues autochtones officielles"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Bolivie", type: "Government", country: "Bolivie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "bolivie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
