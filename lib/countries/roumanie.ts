import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ROUMANIE: CountryProfile = {
  id: "roumanie",
  slug: "roumanie",
  zoneSlug: "europe",
  name: "Roumanie",
  iso3: "ROU",
  capital: "Bucarest",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Roumain"],
  currency: "Leu roumain",
  government: "République semi-présidentielle",

  overview: {
    summary: "La Roumanie est un État membre de l'Union européenne et de l'OTAN, frontalier de l'Ukraine et de la Moldavie. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Bulgarie","Bosnie-Herzégovine","Hongrie","Kosovo","Moldavie","Monténégro","Serbie","Slovaquie","Ukraine"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Bulgarie","Bosnie-Herzégovine","Hongrie","Kosovo","Moldavie"],
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
    languages: ["Roumain"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Roumanie", type: "Government", country: "Roumanie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "roumanie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
