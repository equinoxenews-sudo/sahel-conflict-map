import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const REPUBLIQUE_DEMOCRATIQUE_DU_CONGO: CountryProfile = {
  id: "republique-democratique-du-congo",
  slug: "republique-democratique-du-congo",
  zoneSlug: "afrique",
  name: "République démocratique du Congo",
  iso3: "COD",
  capital: "Kinshasa",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc congolais",
  government: "République présidentielle",

  overview: {
    summary: "La RD Congo est le théâtre de conflits armés persistants dans l'Est, alimentés par le contrôle des ressources minières. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Angola","Burundi","République centrafricaine","Cameroun","République du Congo","Gabon","Guinée équatoriale","Mozambique","Malawi","Nigeria","Rwanda","Soudan du Sud","Tanzanie","Ouganda","Zambie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Angola","Burundi","République centrafricaine","Cameroun","République du Congo"],
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

  keyActors: [{ name: "Gouvernement de République démocratique du Congo", type: "Government", country: "République démocratique du Congo", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "republique-democratique-du-congo-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
