import { supabase } from "./supabaseClient";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";

export const BRIEF_HISTORY_DAYS = 90;

const BRIEF_COLUMNS =
  "id, zone_slug, title, category, primary_theme, secondary_themes, event_type, importance, veracity, summary, source_urls, source_domains, image_url, published_at";

/** Synthèses récentes d'une zone ; l'historique est conservé en base, `days`
 * borne seulement la fenêtre affichée (90 jours par défaut). */
export async function getZoneBriefs(zoneSlug: string, limit = 12, days = BRIEF_HISTORY_DAYS): Promise<ZoneBrief[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase
      .from("zone_briefs")
      .select(BRIEF_COLUMNS)
      .eq("zone_slug", zoneSlug)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to load zone_briefs:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export async function getZoneArticles(zoneSlug: string, limit = 6): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("title, url, domain, published_at")
      .eq("zone_slug", zoneSlug)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to load articles:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}
