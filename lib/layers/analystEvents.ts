import { supabase } from "../supabaseClient";
import type { AnalystEvent } from "./analystRisk";

export { countryRiskFromAnalystEvents, type AnalystEvent } from "./analystRisk";

// Événements des analystes (articles géolocalisés des cinq zones) pour le globe d'accueil,
// et niveau de risque des pays calculé à partir d'eux. Aucun appel d'IA : lecture seule
// des articles déjà rédigés chaque matin.

export const ANALYST_EVENTS_DAYS = 30;
const PAGE = 1000;
const MAX_ROWS = 5000;


interface Row {
  id: number;
  zone_slug: string;
  title: string;
  published_at: string;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  place_country: string | null;
  confidence: number | null;
  confidence_label: string | null;
  claimed_by: string | null;
  importance: string | null;
  primary_theme: string | null;
  event_type: string | null;
  geo_precision: string | null;
  image_url: string | null;
}

const COLUMNS =
  "id, zone_slug, title, published_at, latitude, longitude, place_name, place_country, confidence, confidence_label, claimed_by, importance, primary_theme, event_type, geo_precision, image_url";

/** Articles géolocalisés des 30 derniers jours (lecture paginée : jamais tronquée à 1 000). */
export async function fetchAnalystEvents(now = Date.now()): Promise<AnalystEvent[]> {
  const since = new Date(now - ANALYST_EVENTS_DAYS * 86_400_000).toISOString();
  const out: AnalystEvent[] = [];
  try {
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from("zone_briefs")
        .select(COLUMNS)
        .gte("published_at", since)
        .not("latitude", "is", null)
        .order("published_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("Failed to load analyst events:", error.message);
        break;
      }
      for (const r of (data ?? []) as Row[]) {
        if (r.latitude == null || r.longitude == null) continue;
        out.push({
          id: r.id,
          zone: r.zone_slug,
          title: r.title,
          publishedAt: r.published_at,
          lat: r.latitude,
          lon: r.longitude,
          place: r.place_name,
          country: r.place_country,
          confidence: r.confidence,
          confidenceLabel: r.confidence_label,
          claimedBy: r.claimed_by,
          importance: r.importance === "high" || r.importance === "low" ? r.importance : "medium",
          theme: r.primary_theme,
          eventType: r.event_type,
          precision: r.geo_precision,
          imageUrl: r.image_url,
        });
      }
      if ((data ?? []).length < PAGE) break;
    }
  } catch (err) {
    console.error("Failed to reach Supabase for analyst events:", err);
  }
  return out;
}
