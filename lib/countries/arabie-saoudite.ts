import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const ARABIE_SAOUDITE: CountryProfile = {
  id: "arabie-saoudite",
  slug: "arabie-saoudite",
  zoneSlug: "moyen-orient",
  name: "Arabie saoudite",
  officialName: "Royaume d'Arabie saoudite",
  iso2: "SA",
  iso3: "SAU",
  capital: "Riyad",
  population: "≈ 36 millions (estimation, donnée de démonstration)",
  area: "2 149 690 km²",
  languages: ["Arabe"],
  currency: "Riyal saoudien",
  government: "Monarchie absolue",
  timezone: "UTC+3",

  overview: {
    summary:
      "L'Arabie saoudite est le principal acteur économique et religieux du monde arabe sunnite, engagée dans une stratégie de diversification économique (Vision 2030) tout en restant un acteur central des rivalités régionales, notamment face à l'Iran et dans le dossier yéménite.",
    majorCities: ["Riyad", "Djeddah", "La Mecque", "Médine", "Dammam"],
    neighbors: ["Jordanie", "Irak", "Koweït", "Qatar", "Émirats arabes unis", "Oman", "Yémen"],
    coastline: "Mer Rouge et golfe Persique",
    territorialOrganization: "13 régions administratives",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie absolue",
    headOfState: "Roi — placeholder",
    headOfGovernment: "Prince héritier / Premier ministre — placeholder",
    actors: [{ name: "Famille royale saoudienne", type: "Government", role: "Détentrice du pouvoir exécutif" }],
    foreignRelations: ["États-Unis", "Iran (relation en évolution)", "Émirats arabes unis", "Égypte", "Chine"],
  },

  security: {
    overview: "Acteur militaire majeur de la région du Golfe, engagé au Yémen — donnée de démonstration, à sourcer.",
    conflicts: ["Implication dans le conflit yéménite", "Rivalité stratégique avec l'Iran"],
    armedActors: [{ name: "Forces armées saoudiennes", type: "Military", role: "Armée régulière et coalition régionale" }],
    foreignPresence: [{ name: "Coopération militaire américaine", type: "Foreign actor", country: "États-Unis", role: "Vente d'armement et soutien stratégique" }],
    hotspots: [{ name: "Frontière yéménite", note: "Zone d'opérations militaires" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Hydrocarbures (dominant)", "Pétrochimie", "Tourisme religieux", "Diversification (Vision 2030)"],
    resources: ["Pétrole (premières réserves mondiales)", "Gaz naturel"],
    constraints: ["Forte dépendance historique aux revenus pétroliers", "Marché du travail dépendant de la main-d'œuvre étrangère"],
  },

  infrastructures: [
    { name: "Port de Djeddah", type: "Port", location: "Djeddah", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international Roi Khaled", type: "Aéroport", location: "Riyad", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Projet NEOM", type: "Énergie", location: "Nord-Ouest (mer Rouge)", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société en transformation sociale rapide sous l'effet de la Vision 2030 — donnée de démonstration.",
    urbanization: "≈ 84 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam sunnite (majoritaire, doctrine wahhabite/salafiste officielle)", "Islam chiite (minorité, Est du pays)"],
    communities: ["Population saoudienne", "Importante main-d'œuvre étrangère (Asie du Sud, Afrique, monde arabe)"],
  },

  environment: {
    overview: "Environnement désertique, stress hydrique extrême compensé par le dessalement — donnée de démonstration.",
    risks: ["Stress hydrique extrême", "Dépendance au dessalement", "Vagues de chaleur"],
  },

  keyActors: [
    { name: "Famille royale saoudienne", type: "Government", country: "Arabie saoudite", role: "Pouvoir exécutif" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire stratégique et militaire" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Rival régional" },
  ],
  relatedEvents: [],
  sources: [
    { id: "sau-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
