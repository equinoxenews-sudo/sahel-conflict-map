import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const TANZANIE: CountryProfile = {
  id: "tanzanie",
  slug: "tanzanie",
  zoneSlug: "afrique",
  name: "Tanzanie",
  iso3: "TZA",
  capital: "Dodoma (capitale officielle) / Dar es Salaam (centre économique)",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Swahili","Anglais"],
  currency: "Shilling tanzanien",
  government: "République présidentielle",

  overview: {
    summary: "La Tanzanie est un pôle de stabilité relative en Afrique de l'Est, à proximité de l'insurrection jihadiste du Cabo Delgado voisin. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Burundi","République démocratique du Congo","Kenya","Mozambique","Malawi","Rwanda","Somalie","Ouganda","Zambie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Burundi","République démocratique du Congo","Kenya","Mozambique","Malawi"],
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
    languages: ["Swahili","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Tanzanie", type: "Government", country: "Tanzanie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "tanzanie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
