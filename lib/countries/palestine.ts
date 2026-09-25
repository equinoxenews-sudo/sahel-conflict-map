import type { CountryProfile } from "@/types/country";

// DEMO / PLACEHOLDER CONTENT — see lib/countries/syria.ts.
export const PALESTINE: CountryProfile = {
  id: "palestine",
  slug: "palestine",
  zoneSlug: "moyen-orient",
  name: "Palestine",
  officialName: "État de Palestine",
  iso2: "PS",
  iso3: "PSE",
  capital: "Ramallah (siège administratif) / Jérusalem-Est (revendiquée)",
  population: "≈ 5,4 millions (Cisjordanie + Gaza, estimation, donnée de démonstration)",
  area: "≈ 6 020 km² (Cisjordanie + Gaza)",
  languages: ["Arabe"],
  currency: "Shekel israélien / Dinar jordanien",
  government: "Autorité palestinienne — statut et souveraineté contestés",
  timezone: "UTC+2 / UTC+3 (heure d'été)",

  overview: {
    summary:
      "Le territoire palestinien reste divisé entre la Cisjordanie (administrée par l'Autorité palestinienne, sous contrôle sécuritaire israélien partiel) et la bande de Gaza (contexte de conflit aigu). La situation humanitaire et le statut politique final demeurent au centre des enjeux régionaux.",
    majorCities: ["Ramallah", "Gaza", "Hébron", "Naplouse", "Bethléem"],
    neighbors: ["Israël", "Jordanie", "Égypte"],
    territorialOrganization: "Cisjordanie (zones A/B/C) et bande de Gaza — administrations distinctes",
    context: ["Contenu de démonstration — à remplacer par une analyse vérifiée et sourcée."],
  },

  politics: {
    system: "Autorité palestinienne — reconnaissance internationale partielle en tant qu'État",
    parliament: "Conseil législatif palestinien (institution en suspens)",
    actors: [
      { name: "Autorité palestinienne (Cisjordanie)", type: "Government", role: "Administration civile partielle" },
      { name: "Autorités de fait à Gaza", type: "Government", role: "Administration de la bande de Gaza" },
    ],
    foreignRelations: ["Égypte", "Jordanie", "Israël", "Qatar", "Turquie"],
  },

  security: {
    overview: "Contexte sécuritaire très différencié entre Cisjordanie et Gaza — donnée de démonstration, à sourcer.",
    conflicts: ["Conflit israélo-palestinien", "Tensions internes Cisjordanie/Gaza"],
    armedActors: [
      { name: "Forces de sécurité de l'Autorité palestinienne", type: "Military", role: "Cisjordanie" },
      { name: "Acteurs armés de Gaza", type: "Armed group", role: "Bande de Gaza" },
    ],
    hotspots: [
      { name: "Bande de Gaza", note: "Zone de conflit aigu" },
      { name: "Hébron / colonies de Cisjordanie", note: "Tensions récurrentes" },
    ],
  },

  economy: {
    gdp: "Donnée de démonstration — à compléter",
    mainSectors: ["Agriculture", "Petit commerce", "Aide internationale"],
    resources: ["Agriculture (olives, agrumes)"],
    constraints: ["Restrictions de circulation et d'accès", "Dépendance à l'aide internationale", "Infrastructures endommagées à Gaza"],
  },

  infrastructures: [
    { name: "Point de passage de Rafah", type: "Route", location: "Frontière avec l'Égypte", importance: "Stratégique", status: "Inconnu", source: "Donnée de démonstration" },
    { name: "Point de passage d'Erez", type: "Route", location: "Frontière avec Israël", importance: "Stratégique", status: "Inconnu", source: "Donnée de démonstration" },
  ],

  society: {
    overview: "Population jeune, forte proportion de réfugiés enregistrés — donnée de démonstration.",
    displacement: "Population réfugiée et déplacée importante (chiffres à sourcer)",
    languages: ["Arabe (officiel)"],
    religions: ["Islam (majoritaire)", "Christianisme"],
  },

  environment: {
    overview: "Accès à l'eau et aux infrastructures fortement contraint, en particulier à Gaza — donnée de démonstration.",
    risks: ["Stress hydrique sévère", "Dégradation des infrastructures", "Sécurité alimentaire fragile (Gaza)"],
  },

  keyActors: [
    { name: "Autorité palestinienne", type: "Government", country: "Palestine", role: "Administration civile" },
    { name: "Égypte", type: "Foreign actor", country: "Égypte", role: "Médiation régionale" },
    { name: "Qatar", type: "Foreign actor", country: "Qatar", role: "Soutien financier et médiation" },
  ],
  relatedEvents: [],
  sources: [
    { id: "palestine-demo-1", title: "Exemple de source institutionnelle (placeholder)", type: "institutional", accessedAt: "2026-09-25", reliability: 3, notes: "Source fictive — à remplacer." },
  ],
  updatedAt: "2026-09-25",
};
