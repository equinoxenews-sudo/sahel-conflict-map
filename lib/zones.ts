export interface Zone {
  slug: string;
  name: string;
  icon: string;
  active: boolean;
  /** Countries whose events (in Supabase) belong on this zone's map. */
  countries: string[];
}

export const ZONES: Zone[] = [
  {
    slug: "europe",
    name: "Europe",
    icon: "/equinoxe/logo-europe.png",
    active: true,
    countries: ["Ukraine", "Serbie", "Kosovo"],
  },
  {
    slug: "moyen-orient",
    name: "Moyen Orient",
    icon: "/equinoxe/logo-moyen-orient.png",
    active: true,
    countries: ["Israel / Palestine", "Syrie", "Yemen", "Liban"],
  },
  {
    slug: "afrique",
    name: "Afrique",
    icon: "/equinoxe/logo-afrique.png",
    active: true,
    countries: [
      "Mali",
      "Burkina Faso",
      "Niger",
      "RD Congo",
      "Soudan",
      "Mozambique",
      "Nigeria",
      "Somalie",
    ],
  },
  {
    slug: "indopacifique",
    name: "Indopacifique",
    icon: "/equinoxe/logo-indopacifique.png",
    active: true,
    countries: ["Myanmar", "Philippines", "Taiwan", "Coree du Nord"],
  },
  {
    slug: "amerique-du-sud",
    name: "Amérique du Sud",
    icon: "/equinoxe/logo-amerique-sud.png",
    active: true,
    countries: ["Colombie", "Venezuela", "Perou"],
  },
  {
    slug: "tracking",
    name: "Tracking",
    icon: "/equinoxe/logo-tracking.png",
    active: true,
    countries: [],
  },
];

export const TABS = ["approche", "actualite", "analyse"] as const;
export type Tab = (typeof TABS)[number];

export const TAB_LABELS: Record<Tab, string> = {
  approche: "Approche",
  actualite: "Actualité",
  analyse: "Analyse",
};

export function getZone(slug: string): Zone | undefined {
  return ZONES.find((z) => z.slug === slug);
}
