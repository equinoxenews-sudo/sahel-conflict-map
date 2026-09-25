import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const QATAR: CountryProfile = {
  id: "qatar",
  slug: "qatar",
  zoneSlug: "moyen-orient",
  name: "Qatar",
  officialName: "État du Qatar",
  iso2: "QA",
  iso3: "QAT",
  capital: "Doha",
  population: "≈ 2,7 millions (estimation, donnée de démonstration)",
  area: "11 586 km²",
  languages: ["Arabe"],
  currency: "Riyal qatari",
  government: "Monarchie absolue (émirat)",
  timezone: "UTC+3",

  overview: {
    summary:
      "Le Qatar combine d'immenses ressources gazières, une diplomatie active de médiation régionale (Afghanistan, Gaza, dossiers syriens) et une politique étrangère qui a pu le placer en tension avec certains voisins du Golfe, notamment lors de la crise diplomatique de 2017-2021.",
    majorCities: ["Doha", "Al Rayyan", "Al Wakrah"],
    neighbors: ["Arabie saoudite"],
    coastline: "Péninsule entièrement bordée par le golfe Persique",
    territorialOrganization: "8 municipalités",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Monarchie absolue (émirat)",
    headOfState: "Émir — placeholder",
    actors: [{ name: "Gouvernement de l'émirat", type: "Government", role: "Exécutif" }],
    foreignRelations: ["États-Unis", "Turquie", "Iran (relation pragmatique)", "Arabie saoudite (normalisée depuis 2021)"],
  },

  security: {
    overview: "Contexte sécuritaire stable, rôle actif de médiation régionale — donnée de démonstration, à sourcer.",
    conflicts: ["Vigilance régionale liée aux tensions du Golfe"],
    armedActors: [{ name: "Forces armées qataries", type: "Military", role: "Armée régulière" }],
    foreignPresence: [{ name: "Base aérienne d'Al Udeid", type: "Foreign actor", country: "États-Unis", role: "Plus grande base militaire américaine de la région" }],
  },

  economy: {
    gdp: "Donnée de démonstration — PIB par habitant parmi les plus élevés au monde",
    mainSectors: ["Gaz naturel liquéfié (dominant)", "Finance", "Événementiel international"],
    resources: ["Gaz naturel (parmi les premières réserves mondiales, gisement de North Field)"],
    constraints: ["Forte dépendance au gaz naturel", "Population active très majoritairement étrangère"],
  },

  infrastructures: [
    { name: "Port de Hamad", type: "Port", location: "Doha", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Aéroport international Hamad", type: "Aéroport", location: "Doha", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Gisement gazier North Field", type: "Énergie", location: "Offshore, golfe Persique", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Population résidente très majoritairement composée de travailleurs étrangers — donnée de démonstration.",
    urbanization: "≈ 99 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)", "Anglais (usage courant)"],
    religions: ["Islam (majoritaire)"],
    communities: ["Citoyens qataris (minoritaires)", "Importante main-d'œuvre étrangère (Asie du Sud, monde arabe)"],
  },

  environment: {
    overview: "Environnement désertique, dépendance totale au dessalement, forte empreinte carbone liée au gaz — donnée de démonstration.",
    risks: ["Stress hydrique extrême", "Vagues de chaleur", "Empreinte carbone élevée"],
  },

  keyActors: [
    { name: "Gouvernement qatari", type: "Government", country: "Qatar", role: "Exécutif" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire militaire majeur" },
    { name: "Turquie", type: "Foreign actor", country: "Turquie", role: "Partenaire stratégique rapproché" },
  ],
  relatedEvents: [],
  sources: [
    { id: "qatar-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
