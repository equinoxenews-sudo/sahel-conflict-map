import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const EMIRATS_ARABES_UNIS: CountryProfile = {
  id: "emirats-arabes-unis",
  slug: "emirats-arabes-unis",
  zoneSlug: "moyen-orient",
  name: "Émirats arabes unis",
  officialName: "Émirats arabes unis",
  iso2: "AE",
  iso3: "ARE",
  capital: "Abou Dabi",
  population: "≈ 9,5 millions (estimation, donnée de démonstration)",
  area: "83 600 km²",
  languages: ["Arabe"],
  currency: "Dirham émirati",
  government: "Fédération de sept monarchies (émirats)",
  timezone: "UTC+4",

  overview: {
    summary:
      "Les Émirats arabes unis constituent une fédération de sept émirats, dominée politiquement et économiquement par Abou Dabi, avec Dubaï comme centre financier et logistique régional. Le pays a diversifié son économie au-delà des hydrocarbures et joue un rôle diplomatique et militaire actif dans la région.",
    majorCities: ["Abou Dabi", "Dubaï", "Sharjah"],
    neighbors: ["Arabie saoudite", "Oman"],
    coastline: "Golfe Persique et golfe d'Oman",
    territorialOrganization: "Fédération de 7 émirats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Fédération de monarchies absolues",
    headOfState: "Président (traditionnellement l'émir d'Abou Dabi) — placeholder",
    actors: [
      { name: "Conseil suprême fédéral", type: "Government", role: "Instance suprême, dirigeants des 7 émirats" },
      { name: "Gouvernement d'Abou Dabi", type: "Government", role: "Émirat dominant politiquement et économiquement" },
    ],
    foreignRelations: ["États-Unis", "Arabie saoudite", "Israël (accords d'Abraham)", "Iran (relation pragmatique)"],
  },

  security: {
    overview: "Acteur militaire actif dans la région (Yémen, Corne de l'Afrique) — donnée de démonstration, à sourcer.",
    conflicts: ["Implication passée dans le conflit yéménite", "Vigilance régionale liée aux tensions du Golfe"],
    armedActors: [{ name: "Forces armées émiraties", type: "Military", role: "Armée régulière, projection régionale" }],
    foreignPresence: [{ name: "Coopération militaire américaine", type: "Foreign actor", country: "États-Unis", role: "Partenariat stratégique" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Hydrocarbures", "Finance et immobilier (Dubaï)", "Logistique et transport aérien", "Tourisme"],
    resources: ["Pétrole (concentré à Abou Dabi)", "Gaz naturel"],
    constraints: ["Diversification avancée mais revenus pétroliers encore structurants pour Abou Dabi"],
  },

  infrastructures: [
    { name: "Port Jebel Ali", type: "Port", location: "Dubaï", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international de Dubaï", type: "Aéroport", location: "Dubaï", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Centrale nucléaire de Barakah", type: "Énergie", location: "Abou Dabi", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Population très majoritairement composée de résidents étrangers — donnée de démonstration.",
    urbanization: "≈ 87 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)", "Anglais (usage courant)"],
    religions: ["Islam (majoritaire)"],
    communities: ["Citoyens émiratis (minoritaires)", "Importante main-d'œuvre étrangère (Asie du Sud, monde arabe, Occident)"],
  },

  environment: {
    overview: "Environnement désertique, dépendance au dessalement, investissements dans les énergies renouvelables — donnée de démonstration.",
    risks: ["Stress hydrique extrême", "Vagues de chaleur", "Élévation du niveau de la mer (zones côtières basses)"],
  },

  keyActors: [
    { name: "Gouvernement d'Abou Dabi", type: "Government", country: "Émirats arabes unis", role: "Émirat dominant" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire militaire" },
    { name: "Israël", type: "Foreign actor", country: "Israël", role: "Partenaire diplomatique (accords d'Abraham)" },
  ],
  relatedEvents: [],
  sources: [
    { id: "are-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
