import { searchArticles } from "./gdeltDoc";
import { ZONE_NEWS_DOMAINS } from "./newsSources";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { ZONE_KEYWORDS } from "./zoneKeywords";

function toIsoDate(seenDate: string): string | null {
  // seenDate is YYYYMMDDTHHMMSSZ
  const match = seenDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

async function syncZone(
  zoneSlug: string,
  keywords: string[]
): Promise<{ zoneSlug: string; count: number }> {
  const supabase = getSupabaseAdmin();
  const domains = ZONE_NEWS_DOMAINS[zoneSlug] ?? [];
  const articles = await searchArticles(keywords, domains, 5);

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

  return { zoneSlug, count: rows.length };
}

/**
 * Pulls a handful of recent real article headlines per zone from GDELT
 * DOC 2.0 (restricted to lib/newsSources.ts's curated domain list) and
 * upserts them into Supabase.
 *
 * api.gdeltproject.org (unlike the CDN-backed bulk export host) can be
 * slow — sequential queries with an 8s timeout each still blew the 60s
 * function budget across 5 zones. Querying all zones concurrently instead
 * means the total time is roughly the slowest single request, not the
 * sum — a zone whose request errors or times out is simply skipped for
 * today and picked up on tomorrow's run.
 */
export async function syncArticles() {
  const zoneSlugs = Object.keys(ZONE_KEYWORDS);

  const results = await Promise.allSettled(
    zoneSlugs.map((zoneSlug) => syncZone(zoneSlug, ZONE_KEYWORDS[zoneSlug]))
  );

  const summary: Record<string, number> = {};
  results.forEach((result, i) => {
    const zoneSlug = zoneSlugs[i];
    if (result.status === "fulfilled") {
      summary[zoneSlug] = result.value.count;
    } else {
      console.error(`Article sync failed for ${zoneSlug}:`, result.reason);
      summary[zoneSlug] = -1;
    }
  });

  return summary;
}
