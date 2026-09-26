import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const LETTONIE: CountryProfile = {
  id: "lettonie",
  slug: "lettonie",
  zoneSlug: "europe",
  name: "Lettonie",
  iso3: "LVA",
  capital: "Riga",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Letton"],
  currency: "Euro",
  government: "République parlementaire",

  overview: {
    summary: "La Lettonie est un État balte membre de l'Union européenne et de l'OTAN, frontalier de la Russie. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Biélorussie","Estonie","Lituanie","Norvège","Suède","Russie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Biélorussie","Estonie","Lituanie","Norvège","Suède"],
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
    languages: ["Letton"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Lettonie", type: "Government", country: "Lettonie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "lettonie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
