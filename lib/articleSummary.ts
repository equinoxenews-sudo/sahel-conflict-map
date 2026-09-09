const FETCH_TIMEOUT_MS = 4000;
const MAX_SUMMARY_LENGTH = 260;

const DESCRIPTION_PATTERNS = [
  /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
];

const IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
];

export interface ArticleMeta {
  summary: string | null;
  imageUrl: string | null;
}

function extractMeta(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Fetches an article's og:description (a short blurb already written by
 * the outlet's own editors — a real, non-fabricated summary) and its
 * og:image (a representative photo). Best-effort: returns nulls on any
 * failure (timeout, non-200, no meta tag found) rather than throwing,
 * since a missing summary/image shouldn't block the rest of a sync.
 */
export async function fetchArticleMeta(url: string): Promise<ArticleMeta> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0)" },
    });
    if (!res.ok) return { summary: null, imageUrl: null };

    const html = await res.text();

    const rawSummary = extractMeta(html, DESCRIPTION_PATTERNS);
    const decoded = rawSummary ? decodeHtmlEntities(rawSummary).trim() : null;
    const summary = decoded
      ? decoded.length > MAX_SUMMARY_LENGTH
        ? `${decoded.slice(0, MAX_SUMMARY_LENGTH).trimEnd()}…`
        : decoded
      : null;

    const rawImage = extractMeta(html, IMAGE_PATTERNS);
    const imageUrl = rawImage ? decodeHtmlEntities(rawImage).trim() || null : null;

    return { summary, imageUrl };
  } catch {
    return { summary: null, imageUrl: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
