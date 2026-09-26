import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const ETHIOPIE: CountryProfile = {
  id: "ethiopie",
  slug: "ethiopie",
  zoneSlug: "afrique",
  name: "Éthiopie",
  iso3: "ETH",
  capital: "Addis-Abeba",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Amharique"],
  currency: "Birr éthiopien",
  government: "République fédérale parlementaire",

  overview: {
    summary: "L'Éthiopie sort d'une guerre civile dévastatrice au Tigré (2020-2022) et reste confrontée à des tensions régionales internes. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Djibouti","Érythrée","Kenya","Soudan","Soudan du Sud","Somaliland","Somalie","Ouganda","Yémen"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Djibouti","Érythrée","Kenya","Soudan","Soudan du Sud"],
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
    languages: ["Amharique"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Éthiopie", type: "Government", country: "Éthiopie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "ethiopie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
