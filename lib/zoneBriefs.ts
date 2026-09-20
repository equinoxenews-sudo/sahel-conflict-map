import { supabase } from "./supabaseClient";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";

export async function getZoneBriefs(zoneSlug: string, limit = 12): Promise<ZoneBrief[]> {
  try {
    const { data, error } = await supabase
      .from("zone_briefs")
      .select("id, zone_slug, title, category, summary, source_urls, source_domains, image_url, published_at")
      .eq("zone_slug", zoneSlug)
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
