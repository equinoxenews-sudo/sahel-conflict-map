import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const TCHAD: CountryProfile = {
  id: "tchad",
  slug: "tchad",
  zoneSlug: "afrique",
  name: "Tchad",
  iso3: "TCD",
  capital: "N'Djamena",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français","Arabe"],
  currency: "Franc CFA (BEAC)",
  government: "République présidentielle (transition militaire)",

  overview: {
    summary: "Le Tchad joue un rôle pivot dans la lutte contre le jihadisme au Sahel et au lac Tchad, dans un contexte de transition politique interne. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["République centrafricaine","Cameroun","Égypte","Libye","Niger","Nigeria","Soudan","Soudan du Sud"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle (transition militaire)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["République centrafricaine","Cameroun","Égypte","Libye","Niger"],
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
    languages: ["Français","Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Tchad", type: "Government", country: "Tchad", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "tchad-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
