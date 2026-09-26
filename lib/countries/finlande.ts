import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const FINLANDE: CountryProfile = {
  id: "finlande",
  slug: "finlande",
  zoneSlug: "europe",
  name: "Finlande",
  iso3: "FIN",
  capital: "Helsinki",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Finnois","Suédois"],
  currency: "Euro",
  government: "République parlementaire",

  overview: {
    summary: "La Finlande a rejoint l'OTAN en 2023 après des décennies de non-alignement, en raison de la guerre en Ukraine. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Estonie","Norvège","Suède","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Estonie","Norvège","Suède","Russie"],
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
    languages: ["Finnois","Suédois"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Finlande", type: "Government", country: "Finlande", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "finlande-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
