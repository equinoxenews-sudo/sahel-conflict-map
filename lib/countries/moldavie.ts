import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const MOLDAVIE: CountryProfile = {
  id: "moldavie",
  slug: "moldavie",
  zoneSlug: "europe",
  name: "Moldavie",
  iso3: "MDA",
  capital: "Chisinau",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Roumain"],
  currency: "Leu moldave",
  government: "République parlementaire",

  overview: {
    summary: "La Moldavie est un État candidat à l'Union européenne, dont la région séparatiste de Transnistrie échappe à son contrôle. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Roumanie","Ukraine"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Roumanie","Ukraine"],
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
    languages: ["Roumain"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Moldavie", type: "Government", country: "Moldavie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "moldavie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
