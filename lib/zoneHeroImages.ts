// Night-lights satellite photos for each zone's hero background — real
// image assets (public/equinoxe/hero-*.webp), not placeholders. A zone
// with no entry here just gets the plain dark hero background instead of
// a mismatched or stretched image.
export const ZONE_HERO_IMAGES: Partial<Record<string, string>> = {
  afrique: "/equinoxe/hero-afrique.webp",
  europe: "/equinoxe/hero-europe.webp",
  "moyen-orient": "/equinoxe/hero-moyen-orient.webp",
  indopacifique: "/equinoxe/hero-indopacifique.webp",
  "amerique-du-sud": "/equinoxe/hero-amerique-du-sud.webp",
};

export function getZoneHeroImage(slug: string): string | undefined {
  return ZONE_HERO_IMAGES[slug];
}
