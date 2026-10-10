// Derniers articles (synthèses) de chaque zone, pour le carrousel de l'introduction.
// Lecture seule, avec la clé publique, comme la page d'accueil du site.
import { supabase } from "@/lib/supabaseClient";
import { isSportsTitle } from "@/lib/sportsFilter";
import { ZONE_ORDER, type ZoneSlug } from "./zoneMap";

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
  rows: { id: number; zone_slug: string; title: string; image_url: string | null; published_at: string | null; veracity: string | null }[],
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

export async function getZoneBriefs(): Promise<ZoneBriefsByZone> {
  try {
    const { data, error } = await supabase
      .from("zone_briefs")
      .select("id, zone_slug, title, image_url, published_at, veracity")
      .gte("published_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
      .order("published_at", { ascending: false })
      .limit(120);
    if (error) {
      console.error("Failed to load zone briefs:", error.message);
      return groupBriefsByZone([]);
    }
    return groupBriefsByZone(data ?? []);
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return groupBriefsByZone([]);
  }
}
