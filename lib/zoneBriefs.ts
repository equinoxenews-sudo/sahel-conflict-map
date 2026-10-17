import { isSportsTitle } from "./sportsFilter";
import { supabase } from "./supabaseClient";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";

export const BRIEF_HISTORY_DAYS = 90;

const BRIEF_COLUMNS =
  "id, zone_slug, title, category, primary_theme, secondary_themes, event_type, importance, veracity, summary, source_urls, source_domains, image_url, published_at";

/** Colonnes V2 (indice de confiance, lieu) : ajoutées par supabase/add-analyst-v2.sql. */
export const BRIEF_V2_COLUMNS =
  "confidence, confidence_label, claimed_by, source_count, place_name, place_country, latitude, longitude, geo_precision";

/** Synthèses récentes d'une zone ; l'historique est conservé en base, `days`
 * borne seulement la fenêtre affichée (90 jours par défaut). */
export async function getZoneBriefs(zoneSlug: string, limit = 12, days = BRIEF_HISTORY_DAYS): Promise<ZoneBrief[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const load = (columns: string) =>
      supabase
        .from("zone_briefs")
        .select(columns)
        .eq("zone_slug", zoneSlug)
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(limit);
    // Sans la migration V2, on relit sans les nouvelles colonnes plutôt que d'échouer.
    let { data, error } = await load(`${BRIEF_COLUMNS}, ${BRIEF_V2_COLUMNS}`);
    if (error) ({ data, error } = await load(BRIEF_COLUMNS));

    if (error) {
      console.error("Failed to load zone_briefs:", error.message);
      return [];
    }

    // Synthèses de sport créées avant le filtre : masquées à l'affichage.
    return ((data ?? []) as unknown as ZoneBrief[]).filter((brief) => !isSportsTitle(brief.title));
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
