// Zones de l'accueil : focus du globe, rattachement des pays à leur zone, derniers
// articles par zone. Module sans accès réseau, utilisable dans le navigateur.
import { isSportsTitle } from "./sportsFilter";
import { ZONE_COUNTRIES } from "./zoneCountries";

/** Les cinq zones de l'accueil, dans l'ordre du menu. */
export const ZONE_ORDER = ["europe", "moyen-orient", "afrique", "indopacifique", "amerique-du-sud"] as const;
export type ZoneSlug = (typeof ZONE_ORDER)[number];

export const ZONE_LABELS: Record<ZoneSlug, string> = {
  europe: "Europe",
  "moyen-orient": "Moyen-Orient",
  afrique: "Afrique",
  indopacifique: "Indopacifique",
  "amerique-du-sud": "Amérique du Sud",
};

/** Évènement du navigateur : { detail: { zone } } — le menu du haut demande de centrer le globe. */
export const FOCUS_ZONE_EVENT = "equinoxe:focus-zone";

export function isHomeZone(slug: string): slug is ZoneSlug {
  return (ZONE_ORDER as readonly string[]).includes(slug);
}

/** Vue de la caméra par zone : point visé et altitude (mètres), pour le globe Cesium. */
export const ZONE_GLOBE_VIEWS: Record<ZoneSlug, { lat: number; lon: number; height: number }> = {
  europe: { lat: 50, lon: 24, height: 5_600_000 },
  "moyen-orient": { lat: 28, lon: 46, height: 5_000_000 },
  afrique: { lat: 2, lon: 20, height: 9_000_000 },
  indopacifique: { lat: 14, lon: 108, height: 10_000_000 },
  "amerique-du-sud": { lat: -18, lon: -60, height: 8_500_000 },
};

/** Code ISO 3 d'un pays → zone. Un clic sur un pays du globe ramène à sa zone. */
export const ISO3_TO_ZONE: Record<string, ZoneSlug> = Object.fromEntries(
  ZONE_ORDER.flatMap((zone) => ZONE_COUNTRIES[zone].map((country) => [country.iso3, zone] as const)),
);

export interface ZoneBriefCard {
  id: number;
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  veracity: string | null;
}

export type ZoneBriefsByZone = Record<ZoneSlug, ZoneBriefCard[]>;

const PER_ZONE = 8;

/** Regroupe des synthèses déjà triées de la plus récente à la plus ancienne. */
export function groupBriefsByZone(
  rows: {
    id: number;
    zone_slug: string;
    title: string;
    image_url: string | null;
    published_at: string | null;
    veracity: string | null;
  }[],
): ZoneBriefsByZone {
  const grouped = Object.fromEntries(ZONE_ORDER.map((zone) => [zone, [] as ZoneBriefCard[]])) as ZoneBriefsByZone;
  for (const row of rows) {
    const list = grouped[row.zone_slug as ZoneSlug];
    if (!list || list.length >= PER_ZONE || isSportsTitle(row.title)) continue;
    list.push({
      id: row.id,
      title: row.title,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      veracity: row.veracity,
    });
  }
  return grouped;
}
