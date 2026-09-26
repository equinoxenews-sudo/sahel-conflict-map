import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MONTENEGRO: CountryProfile = {
  id: "montenegro",
  slug: "montenegro",
  zoneSlug: "europe",
  name: "Monténégro",
  iso3: "MNE",
  capital: "Podgorica",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Monténégrin"],
  currency: "Euro",
  government: "République parlementaire",

  overview: {
    summary: "Le Monténégro est un État des Balkans membre de l'OTAN depuis 2017, candidat à l'Union européenne. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Albanie","Bosnie-Herzégovine","Grèce","Croatie","Italie","Kosovo","Macédoine du Nord","Roumanie","Serbie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Albanie","Bosnie-Herzégovine","Grèce","Croatie","Italie"],
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
    languages: ["Monténégrin"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Monténégro", type: "Government", country: "Monténégro", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "montenegro-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
