import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MACEDOINE_DU_NORD: CountryProfile = {
  id: "macedoine-du-nord",
  slug: "macedoine-du-nord",
  zoneSlug: "europe",
  name: "Macédoine du Nord",
  iso3: "MKD",
  capital: "Skopje",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Macédonien"],
  currency: "Denar macédonien",
  government: "République parlementaire",

  overview: {
    summary: "La Macédoine du Nord est un État des Balkans occidentaux candidat à l'Union européenne. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Albanie","Bulgarie","Grèce","Kosovo","Monténégro","Serbie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Albanie","Bulgarie","Grèce","Kosovo","Monténégro"],
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
    languages: ["Macédonien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Macédoine du Nord", type: "Government", country: "Macédoine du Nord", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "macedoine-du-nord-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
