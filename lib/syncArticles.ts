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
 * upserts them into Supabase.
 *
 * No deliberate inter-request delay here: with a 60s function budget and
 * 5 zones, a fixed 6s wait between every zone (on top of the 429 retry's
 * own 8s backoff) pushed the worst case over the limit and the whole
 * invocation got killed. Zones are just queried back-to-back; the 429
 * retry-once-after-8s in searchArticles is the only backoff, and a zone
 * that still fails is skipped for today and picked up on tomorrow's run.
 */
export async function syncArticles() {
  const supabase = getSupabaseAdmin();
  const summary: Record<string, number> = {};

  const zoneSlugs = Object.keys(ZONE_KEYWORDS);
  for (const zoneSlug of zoneSlugs) {
    const keywords = ZONE_KEYWORDS[zoneSlug];

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
