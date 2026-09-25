import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — this is the first prototype country
// profile (prompt: "fiche pays Syrie"), meant to validate the template
// (CountryProfilePage) before any other country is added. Every figure
// below is illustrative, not researched/verified, and must not be
// presented to a reader as sourced unless a real CountrySource backs it —
// hence the deliberately small, clearly-labeled `sources` list.
export const SYRIA: CountryProfile = {
  id: "syria",
  slug: "syrie",
  zoneSlug: "moyen-orient",
  name: "Syrie",
  officialName: "République arabe syrienne",
  iso2: "SY",
  iso3: "SYR",
  capital: "Damas",
  population: "≈ 23 millions (estimation, données de démonstration)",
  area: "185 180 km²",
  languages: ["Arabe"],
  currency: "Livre syrienne",
  government: "République (statut institutionnel en évolution — à vérifier)",
  timezone: "UTC+3",

  overview: {
    summary:
      "La Syrie reste marquée par les conséquences d'une guerre prolongée, une fragmentation territoriale, une forte présence d'acteurs extérieurs et une situation économique très dégradée. Le territoire présente des dynamiques sécuritaires différenciées selon les zones, tandis que les relations avec les États voisins et les puissances extérieures demeurent structurantes.",
    majorCities: ["Damas", "Alep", "Homs", "Lattaquié", "Deir ez-Zor", "Idlib"],
    neighbors: ["Turquie", "Irak", "Jordanie", "Liban", "Israël"],
    coastline: "Façade méditerranéenne (Lattaquié, Tartous)",
    territorialOrganization: "14 gouvernorats (muhafazat)",
    context: [
      "Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée.",
      "Le territoire reste divisé entre plusieurs autorités de fait, avec des dynamiques propres à chaque zone.",
    ],
  },

  politics: {
    system: "République — cadre institutionnel en transition (placeholder)",
    headOfState: "À déterminer / donnée de démonstration",
    headOfGovernment: "À déterminer / donnée de démonstration",
    parliament: "Assemblée du peuple (structure antérieure — statut à vérifier)",
    constitution: "En cours de refonte (placeholder)",
    actors: [
      { name: "Autorités de transition", type: "Government", role: "Administration centrale" },
      { name: "Administration autonome du Nord-Est", type: "Government", role: "Autorité locale de fait" },
      { name: "Conseils locaux (Nord-Ouest)", type: "Government", role: "Gouvernance locale" },
    ],
    foreignRelations: ["Russie", "Iran", "Turquie", "Irak", "Liban", "Israël", "États-Unis", "Pays du Golfe"],
  },

  security: {
    overview:
      "Contexte sécuritaire différencié selon les zones — donnée de démonstration, à remplacer par une évaluation sourcée et datée.",
    conflicts: ["Poches résiduelles jihadistes", "Tensions Nord-Est / Nord-Ouest", "Frappes israéliennes ponctuelles"],
    armedActors: [
      { name: "Forces de sécurité de transition", type: "Military", role: "Contrôle du territoire central" },
      { name: "Forces démocratiques syriennes (FDS)", type: "Armed group", role: "Contrôle du Nord-Est" },
      { name: "Cellules jihadistes résiduelles", type: "Armed group", role: "Activité résiduelle, zones désertiques" },
    ],
    foreignPresence: [
      { name: "Forces turques", type: "Foreign actor", country: "Turquie", role: "Présence militaire Nord" },
      { name: "Forces américaines", type: "Foreign actor", country: "États-Unis", role: "Présence résiduelle Nord-Est" },
      { name: "Forces russes", type: "Foreign actor", country: "Russie", role: "Bases côtières" },
    ],
    hotspots: [
      { name: "Idlib", note: "Zone de tensions résiduelles" },
      { name: "Frontière turco-syrienne", note: "Opérations transfrontalières" },
      { name: "Vallée de l'Euphrate", note: "Présence de cellules résiduelles" },
    ],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    growth: "Donnée de démonstration — à compléter",
    inflation: "Donnée de démonstration — à compléter",
    mainSectors: ["Agriculture", "Hydrocarbures", "Industrie légère", "Commerce"],
    resources: ["Pétrole", "Gaz naturel", "Phosphates", "Agriculture (coton, blé, olives)"],
    constraints: [
      "Infrastructures dégradées par la guerre",
      "Régime de sanctions internationales",
      "Accès limité aux financements internationaux",
      "Forte dépendance aux importations",
    ],
  },

  infrastructures: [
    {
      name: "Port de Lattaquié",
      type: "Port",
      location: "Lattaquié",
      importance: "Stratégique",
      status: "Actif",
      source: "Donnée de démonstration",
    },
    {
      name: "Port de Tartous",
      type: "Port",
      location: "Tartous",
      importance: "Stratégique",
      status: "Actif",
      source: "Donnée de démonstration",
    },
    {
      name: "Aéroport international de Damas",
      type: "Aéroport",
      location: "Damas",
      importance: "Stratégique",
      status: "Actif",
      source: "Donnée de démonstration",
    },
    {
      name: "Aéroport d'Alep",
      type: "Aéroport",
      location: "Alep",
      importance: "Régionale",
      status: "Endommagé",
      source: "Donnée de démonstration",
    },
    {
      name: "Oléoduc Kirkouk-Baniyas",
      type: "Pipeline",
      location: "Baniyas — frontière irakienne",
      importance: "Stratégique",
      status: "Hors service",
      source: "Donnée de démonstration",
    },
  ],

  society: {
    overview: "Donnée de démonstration — à remplacer par une analyse sourcée.",
    urbanization: "≈ 55 % de population urbaine (estimation, placeholder)",
    displacement: "Population déplacée interne et réfugiée à l'étranger (chiffres à sourcer)",
    languages: ["Arabe (officiel)", "Kurde", "Arménien", "Syriaque"],
    religions: ["Musulmans sunnites", "Alaouites", "Chrétiens", "Druzes", "Ismaéliens"],
    communities: ["Arabes", "Kurdes", "Assyriens/Syriaques", "Arméniens", "Turkmènes", "Druzes"],
  },

  environment: {
    overview:
      "Stress hydrique croissant et dégradation des infrastructures agricoles — donnée de démonstration, à sourcer.",
    risks: ["Stress hydrique", "Sécheresse récurrente", "Sécurité alimentaire fragile", "Désertification"],
  },

  keyActors: [
    { name: "Autorités de transition", type: "Government", country: "Syrie", role: "Administration centrale" },
    { name: "Forces démocratiques syriennes", type: "Armed group", country: "Syrie", role: "Autorité de fait, Nord-Est" },
    { name: "Turquie", type: "Foreign actor", country: "Turquie", role: "Acteur militaire et politique" },
    { name: "Iran", type: "Foreign actor", country: "Iran", role: "Soutien à des réseaux locaux" },
    { name: "Russie", type: "Foreign actor", country: "Russie", role: "Présence militaire, soutien diplomatique" },
  ],

  // Mocked, not fetched from any real feed (per the brief: no API wired up
  // yet) — reuses the project's existing ConflictEvent shape (types/event.ts)
  // so this slots into a real feed later without a type change.
  relatedEvents: [
    {
      id: -1,
      external_id: "demo-syr-1",
      event_date: "2026-09-20",
      country: "Syrie",
      latitude: 35.93,
      longitude: 36.63,
      category: "Strategic developments",
      fatalities: 0,
      source: "Exemple (placeholder)",
      summary: "Exemple d'événement de démonstration — non connecté à une source réelle.",
      reliability: 3,
    },
    {
      id: -2,
      external_id: "demo-syr-2",
      event_date: "2026-09-16",
      country: "Syrie",
      latitude: 36.2,
      longitude: 37.16,
      category: "Battles",
      fatalities: 0,
      source: "Exemple (placeholder)",
      summary: "Exemple d'événement de démonstration — non connecté à une source réelle.",
      reliability: 3,
    },
    {
      id: -3,
      external_id: "demo-syr-3",
      event_date: "2026-09-09",
      country: "Syrie",
      latitude: 33.51,
      longitude: 36.28,
      category: "Protests",
      fatalities: 0,
      source: "Exemple (placeholder)",
      summary: "Exemple d'événement de démonstration — non connecté à une source réelle.",
      reliability: 3,
    },
  ],

  sources: [
    {
      id: "syria-demo-1",
      title: "Exemple de source institutionnelle (placeholder)",
      publisher: "À déterminer",
      type: "institutional",
      accessedAt: "2026-09-25",
      reliability: 3,
      notes: "Source fictive — à remplacer avant publication de données réelles.",
    },
    {
      id: "syria-demo-2",
      title: "Exemple de source médias (placeholder)",
      publisher: "À déterminer",
      type: "media",
      accessedAt: "2026-09-25",
      reliability: 3,
      notes: "Source fictive — à remplacer avant publication de données réelles.",
    },
  ],

  updatedAt: "2026-09-25",
};
