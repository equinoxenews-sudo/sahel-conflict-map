import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CAP_VERT: CountryProfile = {
  id: "cap-vert",
  slug: "cap-vert",
  zoneSlug: "afrique",
  name: "Cap-Vert",
  iso3: "CPV",
  iso2: "CV",
  capital: "Praia",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Portugais"],
  currency: "Escudo cap-verdien",
  government: "République semi-présidentielle",

  overview: {
    summary: "Le Cap-Vert est un archipel de l'Atlantique, au large du Sénégal, indépendant depuis 1975. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Sénégal", "Mauritanie"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République semi-présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Sénégal", "Portugal"],
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
    languages: ["Portugais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement du Cap-Vert", type: "Government", country: "Cap-Vert", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "cap-vert-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-11-05", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-11-05",
};
