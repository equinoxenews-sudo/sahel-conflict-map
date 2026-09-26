import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const NORVEGE: CountryProfile = {
  id: "norvege",
  slug: "norvege",
  zoneSlug: "europe",
  name: "Norvège",
  iso3: "NOR",
  capital: "Oslo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Norvégien"],
  currency: "Couronne norvégienne",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "La Norvège est un État scandinave membre de l'OTAN mais hors Union européenne, important producteur d'hydrocarbures. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Biélorussie","Danemark","Estonie","Finlande","Lituanie","Lettonie","Suède","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Biélorussie","Danemark","Estonie","Finlande","Lituanie"],
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
    languages: ["Norvégien"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Norvège", type: "Government", country: "Norvège", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "norvege-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
