const FETCH_TIMEOUT_MS = 6000;
const MAX_SUMMARY_LENGTH = 260;
// Keeps the prompt sent to the AI bounded even when several articles all
// have substantial body text — long enough for a real analytical piece,
// short enough that 8 articles' worth still fits comfortably in context.
const MAX_BODY_LENGTH = 4000;
const MIN_PARAGRAPH_LENGTH = 40;

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

export interface ArticleContent {
  summary: string | null;
  imageUrl: string | null;
  /** Extracted <p> text — real body content for the AI to draw on, not a fabricated summary. */
  bodyText: string | null;
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
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    // Must run last: the numeric/named entities above can themselves
    // decode to a literal "&", which a leading &amp; replace would double-escape.
    .replace(/&amp;/g, "&");
}

function extractBodyText(html: string): string | null {
  const withoutBoilerplate = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");

  const paragraphs = [...withoutBoilerplate.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((p) => p.length > MIN_PARAGRAPH_LENGTH);

  if (paragraphs.length === 0) return null;

  const text = paragraphs.join("\n\n");
  return text.length > MAX_BODY_LENGTH ? text.slice(0, MAX_BODY_LENGTH) : text;
}

/**
 * Fetches an article's og:description, og:image, and extracted body
 * paragraph text — all from a single request, since we need the full
 * HTML anyway to find the meta tags. The body text lets the AI synthesis
 * step (lib/synthesizeBriefs.ts) write a real, non-fabricated piece
 * grounded in what the source actually says, rather than a one-line
 * description. Best-effort throughout: returns nulls on any failure
 * (timeout, non-200, nothing found) rather than throwing.
 */
export async function fetchArticleContent(url: string): Promise<ArticleContent> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0)" },
    });
    if (!res.ok) return { summary: null, imageUrl: null, bodyText: null };

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

    const bodyText = extractBodyText(html);

    return { summary, imageUrl, bodyText };
  } catch {
    return { summary: null, imageUrl: null, bodyText: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
