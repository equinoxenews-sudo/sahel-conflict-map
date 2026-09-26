import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const CAMEROUN: CountryProfile = {
  id: "cameroun",
  slug: "cameroun",
  zoneSlug: "afrique",
  name: "Cameroun",
  iso3: "CMR",
  capital: "Yaoundé",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Français","Anglais"],
  currency: "Franc CFA (BEAC)",
  government: "République présidentielle",

  overview: {
    summary: "Le Cameroun fait face à une crise séparatiste dans ses régions anglophones et aux incursions de Boko Haram dans le Nord. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["République centrafricaine","République démocratique du Congo","République du Congo","Gabon","Guinée équatoriale","Niger","Nigeria","Tchad"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["République centrafricaine","République démocratique du Congo","République du Congo","Gabon","Guinée équatoriale"],
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
    languages: ["Français","Anglais"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Cameroun", type: "Government", country: "Cameroun", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "cameroun-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
