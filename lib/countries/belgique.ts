import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const BELGIQUE: CountryProfile = {
  id: "belgique",
  slug: "belgique",
  zoneSlug: "europe",
  name: "Belgique",
  iso3: "BEL",
  capital: "Bruxelles",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Néerlandais","Français","Allemand"],
  currency: "Euro",
  government: "Monarchie constitutionnelle fédérale parlementaire",

  overview: {
    summary: "La Belgique est un État fédéral d'Europe occidentale, siège de nombreuses institutions européennes et de l'OTAN. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Allemagne","France","Luxembourg","Pays-Bas"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle fédérale parlementaire",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Allemagne","France","Luxembourg","Pays-Bas"],
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
    languages: ["Néerlandais","Français","Allemand"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Belgique", type: "Government", country: "Belgique", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "belgique-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
