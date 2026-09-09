import { fetchArticleSummary } from "./articleSummary";
import { mapWithConcurrency } from "./gdelt";
import { searchArticles } from "./gdeltDoc";
import { ZONE_NEWS_DOMAINS } from "./newsSources";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { synthesizeBriefs, type SourceArticle } from "./synthesizeBriefs";
import { getZone } from "./zones";
import { ZONE_KEYWORDS } from "./zoneKeywords";

const ARTICLES_PER_ZONE = 12;
const SUMMARY_FETCH_CONCURRENCY = 6;
// Only the top N articles get a real description fetched (and go into the
// AI synthesis prompt) — bounds worst-case time per zone. Kept small
// because the 5 zones' GDELT DOC searches are now deliberately staggered
// ~5.5s apart (see lib/gdeltDoc.ts) to respect its rate limit, which
// already eats into the 60s Vercel function budget before any zone even
// starts its own description-fetch + synthesis work.
const MAX_SUMMARIES_PER_ZONE = 5;

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
): Promise<{ zoneSlug: string; articleCount: number; briefCount: number }> {
  const supabase = getSupabaseAdmin();
  const domains = ZONE_NEWS_DOMAINS[zoneSlug] ?? [];
  const articles = await searchArticles(keywords, domains, ARTICLES_PER_ZONE);

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

  // Best-effort: fetch a real description for a bounded subset of the
  // articles, then hand the batch to the AI synthesis step. Both stay
  // silent no-ops (empty result, never throw) when there's nothing to
  // summarize or ANTHROPIC_API_KEY isn't configured yet.
  const toSummarize = articles.slice(0, MAX_SUMMARIES_PER_ZONE);
  const sourceArticles: SourceArticle[] = await mapWithConcurrency(
    toSummarize,
    SUMMARY_FETCH_CONCURRENCY,
    async (a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      summary: await fetchArticleSummary(a.url),
    })
  );

  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const briefs = await synthesizeBriefs(zoneName, sourceArticles);

  if (briefs.length > 0) {
    const { error } = await supabase.from("zone_briefs").insert(
      briefs.map((b) => ({
        zone_slug: zoneSlug,
        title: b.title,
        summary: b.summary,
        source_urls: b.sourceUrls,
        source_domains: b.sourceDomains,
      }))
    );

    if (error) {
      console.error(`Failed to insert briefs for ${zoneSlug}:`, error.message);
    }
  }

  return { zoneSlug, articleCount: rows.length, briefCount: briefs.length };
}

/**
 * Pulls a handful of recent real article headlines per zone from GDELT
 * DOC 2.0 (restricted to lib/newsSources.ts's curated domain list),
 * upserts them into Supabase, then groups a subset into short AI-written
 * briefs (lib/synthesizeBriefs.ts) that cite their source articles.
 *
 * api.gdeltproject.org (unlike the CDN-backed bulk export host) can be
 * slow — sequential queries with an 8s timeout each still blew the 60s
 * function budget across 5 zones. Querying all zones concurrently instead
 * means the total time is roughly the slowest single zone's time, not the
 * sum — a zone whose request errors or times out is simply skipped for
 * today and picked up on tomorrow's run.
 */
export async function syncArticles() {
  const zoneSlugs = Object.keys(ZONE_KEYWORDS);

  const results = await Promise.allSettled(
    zoneSlugs.map((zoneSlug) => syncZone(zoneSlug, ZONE_KEYWORDS[zoneSlug]))
  );

  const summary: Record<string, { articles: number; briefs: number } | -1> = {};
  results.forEach((result, i) => {
    const zoneSlug = zoneSlugs[i];
    if (result.status === "fulfilled") {
      summary[zoneSlug] = { articles: result.value.articleCount, briefs: result.value.briefCount };
    } else {
      console.error(`Article sync failed for ${zoneSlug}:`, result.reason);
      summary[zoneSlug] = -1;
    }
  });

  return summary;
}
