import { fetchArticleContent } from "./articleSummary";
import { mapWithConcurrency } from "./gdelt";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { synthesizeBriefs, type SourceArticle } from "./synthesizeBriefs";
import { getZone } from "./zones";
import { ZONE_KEYWORDS } from "./zoneKeywords";

const ARTICLES_PER_ZONE = 8;
const SUMMARY_FETCH_CONCURRENCY = 6;
// How many extra (not-yet-fetched) articles to try, purely for their
// photo, when a brief still has no image after both the brief's own
// cited sources AND the rest of the zone's batch come up empty — rare
// (needs the whole 8-article batch to lack an image), so a handful of
// extra fetches here is cheap insurance against a brief shipping with no
// illustration at all.
const FALLBACK_IMAGE_CANDIDATES = 5;

interface StoredArticle {
  id: number;
  title: string;
  url: string;
  domain: string | null;
}

// How far back to look for images already on display — deep enough to
// cover everything still visible on the homepage and a zone's Actualité
// list, so a brief never silently duplicates a photo a reader can already see.
const RECENT_IMAGE_LOOKBACK = 100;

async function recentlyUsedImages(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("zone_briefs")
    .select("image_url")
    .not("image_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(RECENT_IMAGE_LOOKBACK);

  if (error) {
    console.error("Failed to load recent brief images:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.image_url as string));
}

/**
 * Last-resort image source for a brief that still has none after trying
 * its own cited sources and the rest of the zone's already-fetched batch
 * (see briefZone) — fetches a handful of OTHER articles from the same
 * zone, not otherwise involved in this run, purely to read their
 * og:image/twitter:image. `excludeIds` keeps it from re-fetching
 * articles already tried in this batch.
 */
async function findFallbackImage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  zoneSlug: string,
  excludeIds: number[],
  usedImages: Set<string>
): Promise<string | null> {
  let query = supabase
    .from("articles")
    .select("url")
    .eq("zone_slug", zoneSlug)
    .order("published_at", { ascending: false })
    .limit(FALLBACK_IMAGE_CANDIDATES);
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }
  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;

  for (const row of data as { url: string }[]) {
    const { imageUrl } = await fetchArticleContent(row.url);
    if (imageUrl && !usedImages.has(imageUrl)) return imageUrl;
  }
  return null;
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
    async (a) => {
      const { summary, imageUrl, bodyText } = await fetchArticleContent(a.url);
      return {
        title: a.title,
        url: a.url,
        domain: a.domain ?? new URL(a.url).hostname,
        summary,
        bodyText,
        imageUrl,
      };
    }
  );

  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const briefs = await synthesizeBriefs(zoneName, sourceArticles);

  if (briefs.length > 0) {
    const usedImages = await recentlyUsedImages(supabase);
    // Pooled across the WHOLE zone batch, not just each brief's own
    // cited sources — a brief on a topic whose sources happened to have
    // no photo can still borrow one from another article fetched in the
    // same run (still on-topic: same zone, same batch) rather than
    // shipping with no illustration at all.
    const zoneImagePool = sourceArticles.map((a) => a.imageUrl).filter((u): u is string => !!u);

    const rows = [];
    for (const b of briefs) {
      let imageUrl =
        b.imageCandidates.find((url) => !usedImages.has(url)) ??
        zoneImagePool.find((url) => !usedImages.has(url)) ??
        null;
      if (!imageUrl) {
        imageUrl = await findFallbackImage(
          supabase,
          zoneSlug,
          articles.map((a) => a.id),
          usedImages
        );
      }
      if (imageUrl) usedImages.add(imageUrl);
      rows.push({
        zone_slug: zoneSlug,
        title: b.title,
        summary: b.excerpt,
        sections: b.sections,
        category: b.category,
        source_urls: b.sourceUrls,
        source_domains: b.sourceDomains,
        image_url: imageUrl,
      });
    }

    const { error: insertError } = await supabase.from("zone_briefs").insert(rows);

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
 * zone into AI-written briefs (lib/synthesizeBriefs.ts) — each drawing on
 * the real extracted body text of its sources, not just a one-line
 * description, so the result can be a genuine short or long-form piece
 * depending on how much material is actually available. Reads only from
 * Supabase and the individual source URLs — no GDELT DOC calls here, so
 * it's unaffected by that service's rate limit or reliability, and can
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
