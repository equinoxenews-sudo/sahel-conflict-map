import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — generated in batch (see project notes on
// lib/countries/syria.ts for the discipline this follows): capital,
// government form, currency and language(s) are real; population, area
// and every analytical section are explicitly marked as demonstration
// content, not researched figures.
export const SOUDAN: CountryProfile = {
  id: "soudan",
  slug: "soudan",
  zoneSlug: "afrique",
  name: "Soudan",
  iso3: "SDN",
  capital: "Khartoum",
  population: "Donnée de démonstration — à compléter",
  area: "Donnée de démonstration — à compléter",
  languages: ["Arabe"],
  currency: "Livre soudanaise",
  government: "Autorités rivales (guerre civile)",

  overview: {
    summary: "Le Soudan est ravagé depuis avril 2023 par une guerre civile opposant l'armée régulière aux Forces de soutien rapide (RSF). Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    neighbors: ["République centrafricaine","Égypte","Érythrée","Éthiopie","Libye","Arabie saoudite","Soudan du Sud","Tchad"],
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Autorités rivales (guerre civile)",
    actors: [{ name: "Gouvernement", type: "Government", role: "Exécutif" }],
    foreignRelations: ["République centrafricaine","Égypte","Érythrée","Éthiopie","Libye"],
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
    languages: ["Arabe"],
  },

  environment: {
    overview: "Donnée de démonstration — à remplacer par une analyse vérifiée et sourcée.",
    risks: ["Donnée de démonstration"],
  },

  keyActors: [{ name: "Gouvernement de Soudan", type: "Government", country: "Soudan", role: "Exécutif" }],
  relatedEvents: [],
  sources: [
    { id: "soudan-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-26", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-26",
};
