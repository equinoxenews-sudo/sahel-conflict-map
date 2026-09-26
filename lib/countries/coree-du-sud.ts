import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const COREE_DU_SUD: CountryProfile = {
  id: "coree-du-sud",
  slug: "coree-du-sud",
  zoneSlug: "indopacifique",
  name: "Corée du Sud",
  iso3: "KOR",
  capital: "Séoul",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Coréen"],
  currency: "Won sud-coréen",
  government: "République présidentielle",

  overview: {
    summary: "La Corée du Sud est une économie industrielle avancée, en tension permanente avec son voisin du Nord. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["China","Japan","North Korea"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["China","Japan","North Korea"],
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
    languages: ["Coréen"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Corée du Sud", type: "Government", country: "Corée du Sud", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "coree-du-sud-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
