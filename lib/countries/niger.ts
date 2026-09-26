import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const NIGER: CountryProfile = {
  id: "niger",
  slug: "niger",
  zoneSlug: "afrique",
  name: "Niger",
  iso3: "NER",
  capital: "Niamey",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français"],
  currency: "Franc CFA (BCEAO)",
  government: "Régime militaire de transition",

  overview: {
    summary: "Le Niger est dirigé par une junte militaire depuis le coup d'État de juillet 2023, dans un contexte d'insurrections jihadistes au Sahel. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Benin","Burkina Faso","République centrafricaine","Cameroun","Algérie","Ghana","Libye","Mali","Nigeria","Tchad","Togo"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Régime militaire de transition",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Benin","Burkina Faso","République centrafricaine","Cameroun","Algérie"],
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

  keyActors: [{ name: "Gouvernement de Niger", type: "Government", country: "Niger", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "niger-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
