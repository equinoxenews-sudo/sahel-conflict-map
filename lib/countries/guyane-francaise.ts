import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GUYANE_FRANCAISE: CountryProfile = {
  id: "guyane-francaise",
  slug: "guyane-francaise",
  zoneSlug: "amerique-du-sud",
  name: "Guyane française",
  iso3: "GUF",
  capital: "Cayenne",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Euro",
  government: "Collectivité territoriale française d'outre-mer",

  overview: {
    summary: "La Guyane française est un territoire français d'outre-mer, hôte du centre spatial de Kourou. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Brésil","Suriname"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Collectivité territoriale française d'outre-mer",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Brésil","Suriname"],
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

  keyActors: [{ name: "Gouvernement de Guyane française", type: "Government", country: "Guyane française", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "guyane-francaise-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
