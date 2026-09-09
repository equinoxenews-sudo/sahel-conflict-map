import { fetchArticleSummary } from "./articleSummary";
import { mapWithConcurrency } from "./gdelt";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { synthesizeBriefs, type SourceArticle } from "./synthesizeBriefs";
import { getZone } from "./zones";
import { ZONE_KEYWORDS } from "./zoneKeywords";

const ARTICLES_PER_ZONE = 8;
const SUMMARY_FETCH_CONCURRENCY = 6;

interface StoredArticle {
  id: number;
  title: string;
  url: string;
  domain: string | null;
}

async function briefZone(
  zoneSlug: string
): Promise<{ zoneSlug: string; articleCount: number; briefCount: number }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, domain")
    .eq("zone_slug", zoneSlug)
    .eq("used_in_brief", false)
    .order("published_at", { ascending: false })
    .limit(ARTICLES_PER_ZONE);

  if (error) {
    throw new Error(`Failed to load unbriefed articles for ${zoneSlug}: ${error.message}`);
  }

  const articles = (data ?? []) as StoredArticle[];
  if (articles.length === 0) {
    return { zoneSlug, articleCount: 0, briefCount: 0 };
  }

  const sourceArticles: SourceArticle[] = await mapWithConcurrency(
    articles,
    SUMMARY_FETCH_CONCURRENCY,
    async (a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain ?? new URL(a.url).hostname,
      summary: await fetchArticleSummary(a.url),
    })
  );

  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const briefs = await synthesizeBriefs(zoneName, sourceArticles);

  if (briefs.length > 0) {
    const { error: insertError } = await supabase.from("zone_briefs").insert(
      briefs.map((b) => ({
        zone_slug: zoneSlug,
        title: b.title,
        summary: b.summary,
        source_urls: b.sourceUrls,
        source_domains: b.sourceDomains,
      }))
    );

    if (insertError) {
      throw new Error(`Failed to insert briefs for ${zoneSlug}: ${insertError.message}`);
    }
  }

  // Mark every article we handed to the AI as used, regardless of whether
  // it ended up cited in a brief — it's already been read (and billed
  // for), no point sending it again tomorrow.
  const { error: updateError } = await supabase
    .from("articles")
    .update({ used_in_brief: true })
    .in(
      "id",
      articles.map((a) => a.id)
    );

  if (updateError) {
    console.error(`Failed to mark articles as used for ${zoneSlug}:`, updateError.message);
  }

  return { zoneSlug, articleCount: articles.length, briefCount: briefs.length };
}

/**
 * Groups a batch of already-stored raw articles (lib/syncArticles.ts) per
 * zone into short AI-written briefs (lib/synthesizeBriefs.ts). Reads only
 * from Supabase and the individual source URLs — no GDELT DOC calls here,
 * so it's unaffected by that service's rate limit or reliability, and can
 * safely run all 5 zones fully concurrently within the 60s function
 * budget.
 */
export async function syncBriefs() {
  const zoneSlugs = Object.keys(ZONE_KEYWORDS);

  const results = await Promise.allSettled(zoneSlugs.map((zoneSlug) => briefZone(zoneSlug)));

  const summary: Record<string, { articles: number; briefs: number } | -1> = {};
  results.forEach((result, i) => {
    const zoneSlug = zoneSlugs[i];
    if (result.status === "fulfilled") {
      summary[zoneSlug] = { articles: result.value.articleCount, briefs: result.value.briefCount };
    } else {
      console.error(`Brief sync failed for ${zoneSlug}:`, result.reason);
      summary[zoneSlug] = -1;
    }
  });

  return summary;
}
