import { searchArticles } from "./gdeltDoc";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { ZONE_KEYWORDS } from "./zoneKeywords";

function toIsoDate(seenDate: string): string | null {
  // seenDate is YYYYMMDDTHHMMSSZ
  const match = seenDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

/**
 * Pulls a handful of recent real article headlines per zone from GDELT
 * DOC 2.0 (restricted to lib/newsSources.ts's curated domain list) and
 * upserts them into Supabase. GDELT DOC asks for >=5s between requests, so
 * zones are queried sequentially with a delay — this only works because
 * the cron runs once a day, not on every request.
 */
export async function syncArticles() {
  const supabase = getSupabaseAdmin();
  const summary: Record<string, number> = {};

  const zoneSlugs = Object.keys(ZONE_KEYWORDS);
  for (let i = 0; i < zoneSlugs.length; i++) {
    const zoneSlug = zoneSlugs[i];
    const keywords = ZONE_KEYWORDS[zoneSlug];

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 6000));
    }

    try {
      const articles = await searchArticles(keywords, 5);

      const rows = articles.map((a) => ({
        zone_slug: zoneSlug,
        title: a.title,
        url: a.url,
        domain: a.domain,
        published_at: toIsoDate(a.seenDate),
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from("articles")
          .upsert(rows, { onConflict: "zone_slug,url" });

        if (error) {
          throw new Error(`Supabase upsert failed for ${zoneSlug}: ${error.message}`);
        }
      }

      summary[zoneSlug] = rows.length;
    } catch (err) {
      console.error(`Article sync failed for ${zoneSlug}:`, err);
      summary[zoneSlug] = -1; // signals failure for this zone without aborting the rest
    }
  }

  return summary;
}
