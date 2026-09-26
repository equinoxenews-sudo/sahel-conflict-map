import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const GEORGIE: CountryProfile = {
  id: "georgie",
  slug: "georgie",
  zoneSlug: "europe",
  name: "Géorgie",
  iso3: "GEO",
  capital: "Tbilissi",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Géorgien"],
  currency: "Lari géorgien",
  government: "République parlementaire",

  overview: {
    summary: "La Géorgie est un État du Caucase du Sud dont une partie du territoire (Abkhazie, Ossétie du Sud) est occupée par la Russie depuis 2008. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Arménie","Azerbaïdjan","Kazakhstan","Turquie","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Arménie","Azerbaïdjan","Kazakhstan","Turquie","Russie"],
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
    languages: ["Géorgien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Géorgie", type: "Government", country: "Géorgie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "georgie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
