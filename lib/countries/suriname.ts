import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SURINAME: CountryProfile = {
  id: "suriname",
  slug: "suriname",
  zoneSlug: "amerique-du-sud",
  name: "Suriname",
  iso3: "SUR",
  capital: "Paramaribo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Néerlandais"],
  currency: "Dollar surinamais",
  government: "République présidentielle",

  overview: {
    summary: "Le Suriname, ancienne colonie néerlandaise, mise sur ses ressources pétrolières offshore récemment découvertes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Brésil","Guyane française","Guyana"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Brésil","Guyane française","Guyana"],
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
    languages: ["Néerlandais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Suriname", type: "Government", country: "Suriname", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "suriname-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
