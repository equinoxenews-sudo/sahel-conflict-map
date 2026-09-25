import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const EGYPTE: CountryProfile = {
  id: "egypte",
  slug: "egypte",
  zoneSlug: "moyen-orient",
  name: "Égypte",
  officialName: "République arabe d'Égypte",
  iso2: "EG",
  iso3: "EGY",
  capital: "Le Caire",
  population: "≈ 112 millions (estimation, donnée de démonstration)",
  area: "1 001 450 km²",
  languages: ["Arabe"],
  currency: "Livre égyptienne",
  government: "République présidentielle",
  timezone: "UTC+2",

  overview: {
    summary:
      "L'Égypte est le pays le plus peuplé du monde arabe, acteur central de la médiation dans le dossier israélo-palestinien (contrôle du point de passage de Rafah) et confrontée à des défis économiques structurels ainsi qu'à des tensions sécuritaires résiduelles dans le Sinaï.",
    majorCities: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Assouan"],
    neighbors: ["Libye", "Soudan", "Israël", "Palestine (Gaza)"],
    coastline: "Méditerranée et mer Rouge, contrôle du canal de Suez",
    territorialOrganization: "27 gouvernorats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République présidentielle",
    headOfState: "Président de la République — placeholder",
    parliament: "Chambre des représentants",
    actors: [{ name: "Gouvernement présidentiel", type: "Government", role: "Exécutif" }],
    foreignRelations: ["États-Unis", "Israël (traité de paix)", "Arabie saoudite", "Soudan", "Union européenne"],
  },

  security: {
    overview: "Insurrection résiduelle dans le Sinaï, rôle clé dans la médiation à Gaza — donnée de démonstration, à sourcer.",
    conflicts: ["Insurrection résiduelle dans le Sinaï", "Gestion de la frontière avec Gaza (Rafah)"],
    armedActors: [
      { name: "Forces armées égyptiennes", type: "Military", role: "Armée régulière, l'une des plus importantes de la région" },
      { name: "Cellules affiliées à Daech (Sinaï)", type: "Armed group", role: "Activité résiduelle, péninsule du Sinaï" },
    ],
    hotspots: [{ name: "Péninsule du Sinaï", note: "Zone d'opérations antiterroristes" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — pressions inflationnistes récentes",
    mainSectors: ["Canal de Suez (revenus de transit)", "Tourisme", "Agriculture (vallée du Nil)", "Industrie textile"],
    resources: ["Gaz naturel (champ de Zohr)", "Position de transit stratégique (canal de Suez)"],
    constraints: ["Dette extérieure importante", "Croissance démographique rapide", "Dépendance aux importations de blé"],
  },

  infrastructures: [
    { name: "Canal de Suez", type: "Route", location: "Ismaïlia — isthme de Suez", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Port de Port-Saïd", type: "Port", location: "Port-Saïd", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
    { name: "Champ gazier de Zohr", type: "Énergie", location: "Offshore, Méditerranée", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Pays le plus peuplé du monde arabe, forte concentration démographique le long du Nil — donnée de démonstration.",
    urbanization: "≈ 43 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam sunnite (majoritaire)", "Christianisme copte (minorité significative)"],
  },

  environment: {
    overview: "Dépendance quasi totale au Nil pour l'eau douce, tensions autour du barrage éthiopien (GERD) — donnée de démonstration.",
    risks: ["Stress hydrique lié au différend sur le Nil (barrage de la Renaissance)", "Désertification", "Élévation du niveau de la mer (delta du Nil)"],
  },

  keyActors: [
    { name: "Gouvernement égyptien", type: "Government", country: "Égypte", role: "Exécutif" },
    { name: "Forces armées égyptiennes", type: "Military", country: "Égypte", role: "Institution centrale de l'État" },
    { name: "États-Unis", type: "Foreign actor", country: "États-Unis", role: "Partenaire militaire et diplomatique" },
  ],
  relatedEvents: [],
  sources: [
    { id: "egypte-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
