import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BOSNIE_HERZEGOVINE: CountryProfile = {
  id: "bosnie-herzegovine",
  slug: "bosnie-herzegovine",
  zoneSlug: "europe",
  name: "Bosnie-Herzégovine",
  iso3: "BIH",
  capital: "Sarajevo",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Bosnien","Serbe","Croate"],
  currency: "Mark convertible",
  government: "République fédérale parlementaire",

  overview: {
    summary: "La Bosnie-Herzégovine reste marquée par les équilibres institutionnels issus des accords de Dayton. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Albanie","Croatie","Italie","Monténégro","Serbie","Slovénie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Albanie","Croatie","Italie","Monténégro","Serbie"],
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
    languages: ["Bosnien","Serbe","Croate"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Bosnie-Herzégovine", type: "Government", country: "Bosnie-Herzégovine", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "bosnie-herzegovine-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
