import { fetchArticleContent } from "./articleSummary";
import { mapWithConcurrency } from "./gdelt";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { synthesizeBriefs, type PreviousBrief, type SourceArticle } from "./synthesizeBriefs";
import { getZone } from "./zones";
import { ZONE_KEYWORDS } from "./zoneKeywords";

const ARTICLES_PER_ZONE = 8;
const SUMMARY_FETCH_CONCURRENCY = 6;
interface StoredArticle {
  id: number;
  title: string;
  url: string;
  domain: string | null;
  published_at: string | null;
}

async function briefZone(
  zoneSlug: string
): Promise<{ zoneSlug: string; articleCount: number; briefCount: number }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, domain, published_at")
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
    async (a) => {
      const { summary, imageUrl, bodyText } = await fetchArticleContent(a.url);
      return {
        title: a.title,
        url: a.url,
        domain: a.domain ?? new URL(a.url).hostname,
        summary,
        bodyText,
        imageUrl,
        publishedAt: a.published_at,
      };
    }
  );

  const { data: previousData, error: previousError } = await supabase
    .from("zone_briefs")
    .select("id, title, summary, sections, source_urls, source_domains, published_at")
    .eq("zone_slug", zoneSlug)
    .gte("published_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("published_at", { ascending: false }).limit(20);
  // Fail closed: without the previous briefs, a retry could create duplicates.
  if (previousError) throw new Error(`Cannot load previous briefs: ${previousError.message}`);
  const previous = (previousData ?? []) as PreviousBrief[];
  const alreadyCited = new Set(previous.flatMap((brief) => brief.source_urls));
  const acknowledgedIds = articles.filter((article) => alreadyCited.has(article.url)).map((article) => article.id);
  if (acknowledgedIds.length) {
    const { error: retryError } = await supabase.from("articles").update({ used_in_brief: true }).in("id", acknowledgedIds);
    if (retryError) throw new Error(`Failed to acknowledge existing citations: ${retryError.message}`);
  }
  const pendingSources = sourceArticles.filter((article) => !alreadyCited.has(article.url));
  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const briefs = await synthesizeBriefs(zoneName, pendingSources, previous);

  // Only acknowledge sources after their corresponding brief was persisted.
  // A missing API key, malformed JSON or failed API request must not consume them.
  for (const brief of briefs) {
    const row = {
      zone_slug: zoneSlug, title: brief.title, summary: brief.excerpt,
      sections: brief.sections, category: brief.category,
      source_urls: brief.sourceUrls, source_domains: brief.sourceDomains,
      updated_at: new Date().toISOString(),
      ...(brief.imageCandidates[0] ? { image_url: brief.imageCandidates[0] } : {}),
    };
    const result = brief.existingBriefId == null
      ? await supabase.from("zone_briefs").insert(row).select("id").single()
      : await supabase.from("zone_briefs").update(row).eq("id", brief.existingBriefId)
        .eq("zone_slug", zoneSlug).select("id").single();
    if (result.error) throw new Error(`Failed to persist brief: ${result.error.message}`);
    const citedIds = articles.filter((article) => brief.newSourceUrls.includes(article.url)).map((article) => article.id);
    const { error: acknowledgeError } = await supabase.from("articles")
      .update({ used_in_brief: true }).in("id", citedIds);
    if (acknowledgeError) throw new Error(`Failed to acknowledge sources: ${acknowledgeError.message}`);
  }

  return { zoneSlug, articleCount: articles.length, briefCount: briefs.length };
}

/**
 * Groups a batch of already-stored raw articles (lib/syncArticles.ts) per
 * zone into AI-written briefs (lib/synthesizeBriefs.ts) — each drawing on
 * the real extracted body text of its sources, not just a one-line
 * description, so the result can be a genuine short or long-form piece
 * depending on how much material is actually available. Reads only from
 * Supabase and the individual source URLs — no GDELT DOC calls here, so
 * it does not depend on GDELT DOC. Monitor execution time and API cost:
 * all zones run concurrently, but upstream latency can exceed the budget.
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
