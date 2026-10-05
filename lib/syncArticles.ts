import { fetchFeed, type FeedItem } from "./rss";
import { ZONE_RSS_FEEDS } from "./rssFeeds";
import { isSportsTitle } from "./sportsFilter";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { ZONE_KEYWORDS } from "./zoneKeywords";

// A zone's feeds are region-scoped by the outlet's own editorial
// categorization (e.g. BBC's Africa feed), but still carry off-topic
// items (sports, business...) and other tracked-region countries. This
// keeps only items that actually mention one of the zone's countries.
function isRelevant(item: FeedItem, keywords: string[]): boolean {
  const title = item.title.toLowerCase();
  // Country-name matching alone lets sports through ("L'Irlande bat Israël
  // 3-0" contains "Israël") : see lib/sportsFilter.ts.
  if (isSportsTitle(title)) return false;
  return keywords.some((keyword) => title.includes(keyword.toLowerCase()));
}

async function syncZone(
  zoneSlug: string,
  feedUrls: string[],
  keywords: string[]
): Promise<{ zoneSlug: string; count: number }> {
  const supabase = getSupabaseAdmin();

  const feedResults = await Promise.all(feedUrls.map((url) => fetchFeed(url)));
  const relevant = [...new Map(feedResults.flat()
    .filter((item) => isRelevant(item, keywords))
    .map((item) => [item.url, item])).values()];

  const rows = relevant.map((item) => ({
    zone_slug: zoneSlug,
    title: item.title,
    url: item.url,
    domain: item.domain,
    published_at: item.publishedAt,
  }));
  const withImage = relevant
    .filter((item) => item.imageUrl)
    .map((item) => ({ zone_slug: zoneSlug, url: item.url, title: item.title, domain: item.domain, published_at: item.publishedAt, image_url: item.imageUrl }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("articles")
      .upsert(rows, { onConflict: "zone_slug,url" });

    if (error) {
      throw new Error(`Supabase upsert failed for ${zoneSlug}: ${error.message}`);
    }
  }

  // Image du flux, en second passage : une entrée sans image n'écrase jamais
  // celle déjà enregistrée. Sans la colonne (supabase/add-article-images.sql
  // pas encore exécuté), on continue sans image plutôt que d'échouer.
  if (withImage.length > 0) {
    const { error } = await supabase.from("articles").upsert(withImage, { onConflict: "zone_slug,url" });
    if (error && !/image_url/.test(error.message)) {
      throw new Error(`Supabase image upsert failed for ${zoneSlug}: ${error.message}`);
    }
  }

  return { zoneSlug, count: rows.length };
}

/**
 * Pulls recent real article headlines per zone from a curated list of RSS
 * feeds (lib/rssFeeds.ts) and upserts them into Supabase. Replaces GDELT
 * DOC 2.0 as the discovery source — that small research-project API
 * turned out to be too unreliable in production (rate limits and outright
 * connection failures most days). Feed endpoints can rate-limit or fail; all feeds currently fetch concurrently.
 *
 * A zone (or a single feed within it) that errors or times out is simply
 * skipped for today and picked up on tomorrow's run.
 */
export async function syncArticles() {
  const zoneSlugs = Object.keys(ZONE_RSS_FEEDS);

  const results = await Promise.allSettled(
    zoneSlugs.map((zoneSlug) =>
      syncZone(zoneSlug, ZONE_RSS_FEEDS[zoneSlug], ZONE_KEYWORDS[zoneSlug] ?? [])
    )
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
