import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const KOWEIT: CountryProfile = {
  id: "koweit",
  slug: "koweit",
  zoneSlug: "moyen-orient",
  name: "Koweït",
  officialName: "État du Koweït",
  iso2: "KW",
  iso3: "KWT",
  capital: "Koweït City",
  population: "≈ 4,3 millions (estimation, donnée de démonstration)",
  area: "17 818 km²",
  languages: ["Arabe"],
  currency: "Dinar koweïtien",
  government: "Monarchie constitutionnelle (émirat)",
  timezone: "UTC+3",

  overview: {
    summary:
      "Le Koweït est un petit État pétrolier du golfe Persique, doté d'un parlement relativement actif pour la région et d'une politique étrangère prudente, cherchant à préserver son rôle de médiateur entre ses voisins du Golfe.",
    majorCities: ["Koweït City", "Al Ahmadi", "Hawalli"],
    neighbors: ["Irak", "Arabie saoudite"],
    coastline: "Golfe Persique",
    territorialOrganization: "6 gouvernorats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie constitutionnelle (émirat)",
    headOfState: "Émir — placeholder",
    parliament: "Assemblée nationale (majlis al-oumma)",
    actors: [{ name: "Gouvernement de l'émirat", type: "Government", role: "Exécutif" }],
    foreignRelations: ["Arabie saoudite", "États-Unis", "Irak", "Iran"],
  },

  security: {
    overview: "Contexte sécuritaire stable, hôte de bases militaires américaines — donnée de démonstration, à sourcer.",
    conflicts: ["Vigilance régionale liée aux tensions Iran/Golfe"],
    armedActors: [{ name: "Forces armées koweïtiennes", type: "Military", role: "Armée régulière" }],
    foreignPresence: [{ name: "Bases militaires américaines", type: "Foreign actor", country: "États-Unis", role: "Présence logistique régionale" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Hydrocarbures (dominant)", "Services financiers"],
    resources: ["Pétrole (réserves importantes)"],
    constraints: ["Forte dépendance aux revenus pétroliers", "Diversification économique encore limitée"],
  },

  infrastructures: [
    { name: "Port de Shuwaikh", type: "Port", location: "Koweït City", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international du Koweït", type: "Aéroport", location: "Koweït City", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Population majoritairement composée de résidents étrangers — donnée de démonstration.",
    urbanization: "≈ 100 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam (majoritaire)"],
    communities: ["Citoyens koweïtiens", "Importante population de travailleurs étrangers (Asie du Sud, monde arabe)"],
  },

  environment: {
    overview: "Environnement désertique, dépendance totale au dessalement — donnée de démonstration.",
    risks: ["Stress hydrique extrême", "Vagues de chaleur", "Pollution liée à l'industrie pétrolière"],
  },

  keyActors: [
    { name: "Gouvernement koweïtien", type: "Government", country: "Koweït", role: "Exécutif" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire militaire" },
  ],
  relatedEvents: [],
  sources: [
    { id: "koweit-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
