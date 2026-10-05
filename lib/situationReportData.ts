import { supabase } from "./supabaseClient";
import type { SituationReport } from "./situationReport";

const COLUMNS =
  "id, zone_slug, status, period_start, period_end, title, items, conclusion, image_url, brief_ids, model, created_at, updated_at, published_at";

/** Points de situation publiés d'une zone, du plus récent au plus ancien.
 * La lecture publique ne voit jamais les brouillons (politique RLS). */
export async function getPublishedReports(zoneSlug: string, limit = 200): Promise<SituationReport[]> {
  try {
    const { data, error } = await supabase
      .from("situation_reports")
      .select(COLUMNS)
      .eq("zone_slug", zoneSlug)
      .eq("status", "published")
      .order("period_end", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("Failed to load situation_reports:", error.message);
      return [];
    }
    return (data ?? []) as SituationReport[];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export async function getPublishedReport(zoneSlug: string, id: number): Promise<SituationReport | null> {
  try {
    const { data, error } = await supabase
      .from("situation_reports")
      .select(COLUMNS)
      .eq("id", id)
      .eq("zone_slug", zoneSlug)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      console.error("Failed to load situation report:", error.message);
      return null;
    }
    return (data as SituationReport | null) ?? null;
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return null;
  }
}
