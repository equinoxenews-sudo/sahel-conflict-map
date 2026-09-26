import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const RUSSIE: CountryProfile = {
  id: "russie",
  slug: "russie",
  zoneSlug: "europe",
  name: "Russie",
  iso3: "RUS",
  capital: "Moscou",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Russe"],
  currency: "Rouble russe",
  government: "République fédérale semi-présidentielle (pouvoir centralisé)",

  overview: {
    summary: "La Russie est une puissance nucléaire dont l'invasion de l'Ukraine en 2022 a bouleversé l'ordre sécuritaire européen. Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["Norvège","Finlande","Estonie","Lettonie","Lituanie","Pologne","Biélorussie","Ukraine","Géorgie","Azerbaïdjan","Kazakhstan","Chine","Mongolie","Corée du Nord"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République fédérale semi-présidentielle (pouvoir centralisé)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Norvège","Finlande","Estonie","Lettonie","Lituanie"],
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
    languages: ["Russe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Russie", type: "Government", country: "Russie", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "russie-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
