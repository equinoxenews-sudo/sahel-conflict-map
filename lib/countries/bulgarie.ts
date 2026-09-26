import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BULGARIE: CountryProfile = {
  id: "bulgarie",
  slug: "bulgarie",
  zoneSlug: "europe",
  name: "Bulgarie",
  iso3: "BGR",
  capital: "Sofia",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Bulgare"],
  currency: "Lev bulgare",
  government: "République parlementaire",

  overview: {
    summary: "La Bulgarie est un État membre de l'Union européenne et de l'OTAN dans les Balkans. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Grèce","Macédoine du Nord","Roumanie","Serbie","Turquie","Ukraine"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Grèce","Macédoine du Nord","Roumanie","Serbie","Turquie"],
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
    languages: ["Bulgare"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Bulgarie", type: "Government", country: "Bulgarie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "bulgarie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
