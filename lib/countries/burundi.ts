import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BURUNDI: CountryProfile = {
  id: "burundi",
  slug: "burundi",
  zoneSlug: "afrique",
  name: "Burundi",
  iso3: "BDI",
  capital: "Gitega",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Kirundi","Français"],
  currency: "Franc burundais",
  government: "République présidentielle",

  overview: {
    summary: "Le Burundi est un petit État des Grands Lacs marqué par des crises politiques et ethniques récurrentes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["République démocratique du Congo","Rwanda","Tanzanie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["République démocratique du Congo","Rwanda","Tanzanie"],
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
    languages: ["Kirundi","Français"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Burundi", type: "Government", country: "Burundi", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "burundi-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
