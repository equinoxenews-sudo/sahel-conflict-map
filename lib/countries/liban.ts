import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const LIBAN: CountryProfile = {
  id: "liban",
  slug: "liban",
  zoneSlug: "moyen-orient",
  name: "Liban",
  officialName: "République libanaise",
  iso2: "LB",
  iso3: "LBN",
  capital: "Beyrouth",
  population: "≈ 5,3 millions (estimation, donnée de démonstration)",
  area: "10 452 km²",
  languages: ["Arabe", "Français"],
  currency: "Livre libanaise",
  government: "République parlementaire confessionnelle",
  timezone: "UTC+2 / UTC+3 (heure d'été)",

  overview: {
    summary:
      "Le Liban combine une gouvernance confessionnelle fragile, une crise économique et financière profonde depuis 2019, et une présence structurante du Hezbollah dans le paysage politique et sécuritaire. La frontière sud reste une zone de tension récurrente avec Israël.",
    majorCities: ["Beyrouth", "Tripoli", "Saïda", "Tyr", "Zahlé"],
    neighbors: ["Syrie", "Israël"],
    coastline: "Façade méditerranéenne complète",
    territorialOrganization: "8 gouvernorats",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "République parlementaire à répartition confessionnelle des pouvoirs",
    headOfState: "Président de la République (traditionnellement chrétien maronite) — placeholder",
    headOfGovernment: "Premier ministre (traditionnellement musulman sunnite) — placeholder",
    parliament: "Assemblée nationale (128 sièges, répartition confessionnelle)",
    actors: [
      { name: "Gouvernement d'union", type: "Government", role: "Exécutif de coalition" },
      { name: "Hezbollah", type: "Armed group", role: "Acteur politique et militaire majeur" },
    ],
    foreignRelations: ["Syrie", "Iran", "Arabie saoudite", "France", "États-Unis"],
  },

  security: {
    overview: "Sécurité intérieure globalement stable hors zone frontalière sud — donnée de démonstration, à sourcer.",
    conflicts: ["Tensions frontalières avec Israël (sud du pays)", "Fragilité institutionnelle liée à la crise économique"],
    armedActors: [
      { name: "Hezbollah", type: "Armed group", role: "Force paramilitaire et politique majeure" },
      { name: "Forces armées libanaises", type: "Military", role: "Armée régulière" },
    ],
    foreignPresence: [{ name: "FINUL (ONU)", type: "Foreign actor", role: "Force d'interposition, sud Liban" }],
    hotspots: [{ name: "Frontière sud (Ligne bleue)", note: "Zone de tension avec Israël" }],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — crise monétaire aiguë depuis 2019",
    mainSectors: ["Services financiers (en crise)", "Commerce", "Tourisme", "Agriculture"],
    resources: ["Potentiel gazier offshore (non encore exploité à grande échelle)"],
    constraints: ["Crise bancaire et monétaire majeure", "Défaut de paiement souverain", "Corruption institutionnelle"],
  },

  infrastructures: [
    { name: "Port de Beyrouth", type: "Port", location: "Beyrouth", importance: "Stratégique", status: "Endommagé", source: "Donnée de démonstration" },
    { name: "Aéroport international de Beyrouth", type: "Aéroport", location: "Beyrouth", importance: "Stratégique", status: "Actif", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Société marquée par une mosaïque confessionnelle et une émigration importante liée à la crise — donnée de démonstration.",
    urbanization: "≈ 89 % de population urbaine (estimation, placeholder)",
    languages: ["Arabe (officiel)", "Français", "Anglais (usage courant)"],
    religions: ["Islam (sunnite, chiite)", "Christianisme (maronite et autres)", "Druzisme"],
    communities: ["Réfugiés syriens", "Réfugiés palestiniens"],
  },

  environment: {
    overview: "Gestion des déchets et de l'électricité fortement dégradée par la crise — donnée de démonstration.",
    risks: ["Crise de gestion des déchets", "Pénuries d'électricité", "Stress hydrique saisonnier"],
  },

  keyActors: [
    { name: "Gouvernement libanais", type: "Government", country: "Liban", role: "Exécutif" },
    { name: "Hezbollah", type: "Armed group", country: "Liban", role: "Acteur politico-militaire" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Soutien au Hezbollah" },
    { name: "France", type: "Foreign actor", country: "France", role: "Médiation et soutien économique" },
  ],
  relatedEvents: [],
  sources: [
    { id: "liban-demo-1", title: "Exemple de source médias (placeholder)", type: "media", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
