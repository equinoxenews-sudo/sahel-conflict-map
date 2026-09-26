import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ROYAUME_UNI: CountryProfile = {
  id: "royaume-uni",
  slug: "royaume-uni",
  zoneSlug: "europe",
  name: "Royaume-Uni",
  iso3: "GBR",
  capital: "Londres",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Anglais"],
  currency: "Livre sterling",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "Le Royaume-Uni est une puissance nucléaire ayant quitté l'Union européenne en 2020 (Brexit). Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["France","Irlande"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["France","Irlande"],
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

  keyActors: [{ name: "Gouvernement de Royaume-Uni", type: "Government", country: "Royaume-Uni", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "royaume-uni-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
