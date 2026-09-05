import type { Tab } from "./zones";

/**
 * Real photos pulled from the existing equinoxe-news.com (Wix) site.
 * Falls back to a CSS gradient placeholder (see page.module.css) for any
 * zone/tab combination not listed here.
 */
const ZONE_IMAGES: Record<string, string> = {
  "afrique-approche": "/equinoxe/afrique-approche.jpg",
  "afrique-actualite": "/equinoxe/afrique-actualite.jpg",
  "afrique-analyse": "/equinoxe/afrique-analyse.jpg",
  "europe-approche": "/equinoxe/europe-approche.jpg",
  "europe-actualite": "/equinoxe/europe-actualite.png",
  "europe-analyse": "/equinoxe/europe-analyse.jpg",
  "moyen-orient-approche": "/equinoxe/moyen-orient-approche.jpg",
  "moyen-orient-actualite": "/equinoxe/moyen-orient-actualite.jpg",
  "moyen-orient-analyse": "/equinoxe/moyen-orient-analyse.jpg",
  "indopacifique-approche": "/equinoxe/indopacifique-approche.jpg",
  "indopacifique-actualite": "/equinoxe/indopacifique-actualite.jpg",
  "indopacifique-analyse": "/equinoxe/indopacifique-analyse.jpg",
  "amerique-du-sud-approche": "/equinoxe/amerique-du-sud-approche.jpg",
  "amerique-du-sud-actualite": "/equinoxe/amerique-du-sud-actualite.jpg",
  "amerique-du-sud-analyse": "/equinoxe/amerique-du-sud-analyse.jpg",
};

export function getZoneImage(slug: string, tab: Tab): string | undefined {
  return ZONE_IMAGES[`${slug}-${tab}`];
}
