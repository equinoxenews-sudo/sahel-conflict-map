import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SERBIE: CountryProfile = {
  id: "serbie",
  slug: "serbie",
  zoneSlug: "europe",
  name: "Serbie",
  iso3: "SRB",
  capital: "Belgrade",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Serbe"],
  currency: "Dinar serbe",
  government: "République parlementaire",

  overview: {
    summary: "La Serbie est un État des Balkans candidat à l'Union européenne, qui ne reconnaît pas l'indépendance du Kosovo. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Albanie","Bulgarie","Bosnie-Herzégovine","Croatie","Hongrie","Italie","Kosovo","Macédoine du Nord","Monténégro","Roumanie","Ukraine"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Albanie","Bulgarie","Bosnie-Herzégovine","Croatie","Hongrie"],
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
    languages: ["Serbe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Serbie", type: "Government", country: "Serbie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "serbie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
