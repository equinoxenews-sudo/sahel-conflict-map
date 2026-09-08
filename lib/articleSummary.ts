const FETCH_TIMEOUT_MS = 4000;
const MAX_SUMMARY_LENGTH = 260;

const META_PATTERNS = [
  /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
];

function extractMetaDescription(html: string): string | null {
  for (const pattern of META_PATTERNS) {
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
 * Fetches an article's og:description / meta description — a short blurb
 * already written by the outlet's own editors — as a real, non-fabricated
 * summary of the source article. Best-effort: returns null on any failure
 * (timeout, non-200, no meta tag found) rather than throwing, since a
 * missing summary shouldn't block the rest of an event sync.
 */
export async function fetchArticleSummary(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0)" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const raw = extractMetaDescription(html);
    if (!raw) return null;

    const decoded = decodeHtmlEntities(raw).trim();
    if (!decoded) return null;

    return decoded.length > MAX_SUMMARY_LENGTH
      ? `${decoded.slice(0, MAX_SUMMARY_LENGTH).trimEnd()}…`
      : decoded;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
