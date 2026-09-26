import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const PAYS_BAS: CountryProfile = {
  id: "pays-bas",
  slug: "pays-bas",
  zoneSlug: "europe",
  name: "Pays-Bas",
  iso3: "NLD",
  capital: "Amsterdam",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Néerlandais"],
  currency: "Euro",
  government: "Monarchie constitutionnelle parlementaire",

  overview: {
    summary: "Les Pays-Bas sont un État fondateur de l'Union européenne, siège de plusieurs juridictions internationales à La Haye. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Belgique","Allemagne","France"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Belgique","Allemagne","France"],
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
    languages: ["Néerlandais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Pays-Bas", type: "Government", country: "Pays-Bas", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "pays-bas-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
