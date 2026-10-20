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

/** Accueil sans animation d'introduction (retour depuis une page de zone). */
export const HOME_NO_INTRO_HREF = "/?intro=0";

/** Accueil avec la zone au centre du globe et sa fiche ouverte, sans introduction. */
export function zoneHomeHref(slug: string): string {
  return isHomeZone(slug) ? `/?zone=${slug}&intro=0` : HOME_NO_INTRO_HREF;
}

/** Évènement du navigateur : { detail: { zone } } — le menu du haut demande de centrer le globe. */
export const FOCUS_ZONE_EVENT = "equinoxe:focus-zone";

/** Évènement du navigateur : { detail: { zone | null } } — le globe signale la zone affichée
 *  (le menu du haut la surligne en doré). */
export const ZONE_FOCUSED_EVENT = "equinoxe:zone-focused";

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

/** Profondeur du bandeau d'articles d'une zone : les cinq derniers jours (au-delà, on passe par Actualités). */
export const ZONE_BRIEF_DAYS = 5;
/** Plafond par zone : borne la taille de la page, même un jour de forte activité. */
export const ZONE_BRIEFS_MAX = 80;

/** Début de la fenêtre de cinq jours (ISO) pour la requête des articles des zones. */
export function zoneBriefsSince(now = Date.now()): string {
  return new Date(now - ZONE_BRIEF_DAYS * 86_400_000).toISOString();
}

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
  perZone: number = ZONE_BRIEFS_MAX,
): ZoneBriefsByZone {
  const grouped = Object.fromEntries(ZONE_ORDER.map((zone) => [zone, [] as ZoneBriefCard[]])) as ZoneBriefsByZone;
  for (const row of rows) {
    const list = grouped[row.zone_slug as ZoneSlug];
    if (!list || list.length >= perZone || isSportsTitle(row.title)) continue;
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
