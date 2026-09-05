export interface Zone {
  slug: string;
  name: string;
  icon: string;
  active: boolean;
}

export const ZONES: Zone[] = [
  { slug: "europe", name: "Europe", icon: "/equinoxe/logo-europe.png", active: false },
  { slug: "moyen-orient", name: "Moyen Orient", icon: "/equinoxe/logo-moyen-orient.png", active: false },
  { slug: "afrique", name: "Afrique", icon: "/equinoxe/logo-afrique.png", active: true },
  { slug: "indopacifique", name: "Indopacifique", icon: "/equinoxe/logo-indopacifique.png", active: false },
  { slug: "amerique-du-sud", name: "Amérique du Sud", icon: "/equinoxe/logo-amerique-sud.png", active: false },
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
