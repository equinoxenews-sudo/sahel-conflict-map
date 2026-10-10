// Derniers articles (synthèses) de chaque zone, pour le carrousel de l'introduction.
// Lecture seule, avec la clé publique, comme la page d'accueil du site.
import { supabase } from "@/lib/supabaseClient";
import { groupBriefsByZone, type ZoneBriefsByZone } from "../homeZones";

export { groupBriefsByZone } from "../homeZones";
export type { ZoneBriefCard, ZoneBriefsByZone } from "../homeZones";

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
