import { fetchFeed, type FeedItem } from "./rss";
import { ZONE_RSS_FEEDS } from "./rssFeeds";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { ZONE_KEYWORDS } from "./zoneKeywords";

// A zone's feeds are region-scoped by the outlet's own editorial
// categorization (e.g. BBC's Africa feed), but still carry off-topic
// items (sports, business...) and other tracked-region countries. This
// keeps only items that actually mention one of the zone's countries.
function isRelevant(item: FeedItem, keywords: string[]): boolean {
  const title = item.title.toLowerCase();
  return keywords.some((keyword) => title.includes(keyword.toLowerCase()));
}

async function syncZone(
  zoneSlug: string,
  feedUrls: string[],
  keywords: string[]
): Promise<{ zoneSlug: string; count: number }> {
  const supabase = getSupabaseAdmin();

  const feedResults = await Promise.all(feedUrls.map((url) => fetchFeed(url)));
  const relevant = feedResults.flat().filter((item) => isRelevant(item, keywords));

  const rows = relevant.map((item) => ({
    zone_slug: zoneSlug,
    title: item.title,
    url: item.url,
    domain: item.domain,
    published_at: item.publishedAt,
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
 * Pulls recent real article headlines per zone from a curated list of RSS
 * feeds (lib/rssFeeds.ts) and upserts them into Supabase. Replaces GDELT
 * DOC 2.0 as the discovery source — that small research-project API
 * turned out to be too unreliable in production (rate limits and outright
 * connection failures most days). RSS feeds have no meaningful rate limit
 * and every zone's feeds fetch fully concurrently — no staggering needed.
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
