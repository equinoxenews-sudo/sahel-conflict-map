import { fetchFeed, type FeedItem } from "./rss";
import { ZONE_RSS_FEEDS } from "./rssFeeds";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { ZONE_KEYWORDS } from "./zoneKeywords";

// Country-name keyword matching alone lets sports coverage through (e.g.
// "L'Irlande bat Israël 3-0" matches the moyen-orient keyword "Israël").
// A scoreline pattern or a named sport/competition is a strong signal an
// article is off-topic for a security/geopolitics feed regardless of
// which country it mentions.
const SPORTS_SCORELINE = /\b\d{1,2}\s*-\s*\d{1,2}\b/;
const SPORTS_KEYWORDS = [
  "football", "soccer", "rugby", "tennis", "basketball", "handball", "volley-ball",
  "athlétisme", "cyclisme", "natation", "jeux olympiques", " jo ", "coupe du monde",
  "ligue des champions", "ligue 1", "ligue 2", "premier league", "bundesliga", "serie a",
  "buteur", "gardien de but", "carton rouge", "carton jaune", "penalty", "mi-temps",
  "sélectionneur", "fifa", "uefa", "ballon d'or", "match nul", "s'impose face à",
  "l'emporte face à",
];

function isSports(title: string): boolean {
  const lower = title.toLowerCase();
  return SPORTS_KEYWORDS.some((keyword) => lower.includes(keyword)) || SPORTS_SCORELINE.test(lower);
}

// A zone's feeds are region-scoped by the outlet's own editorial
// categorization (e.g. BBC's Africa feed), but still carry off-topic
// items (sports, business...) and other tracked-region countries. This
// keeps only items that actually mention one of the zone's countries.
function isRelevant(item: FeedItem, keywords: string[]): boolean {
  const title = item.title.toLowerCase();
  if (isSports(title)) return false;
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
