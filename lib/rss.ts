import { XMLParser } from "fast-xml-parser";
import { normalizeImageUrl } from "./imageUrls";

export interface FeedItem {
  title: string;
  url: string;
  domain: string;
  publishedAt: string | null;
  /** Image fournie par le flux lui-même (media:content, enclosure, <img> du résumé). */
  imageUrl: string | null;
}

const FETCH_TIMEOUT_MS = 8000;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function linkOf(value: unknown): string {
  // RSS 2.0: <link>https://...</link> (plain text).
  // Atom: <link href="https://..." /> (attribute) — fast-xml-parser exposes
  // it as an object with "@_href", or an array of those for multiple links.
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const alt = value.find((v) => !v?.["@_rel"] || v["@_rel"] === "alternate");
    return String(alt?.["@_href"] ?? value[0]?.["@_href"] ?? "");
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj["@_href"] ?? obj["#text"] ?? "");
  }
  return "";
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;

interface ImageCandidate {
  url: string;
  width: number;
}

/**
 * Image d'un article d'après son entrée de flux. Les flux en fournissent
 * presque toujours une (media:content, media:thumbnail, enclosure) et elle ne
 * dépend pas du téléchargement de la page, que certains sites refusent aux
 * serveurs. À défaut, première <img> du résumé HTML.
 */
export function imageOfFeedItem(record: Record<string, unknown>, baseUrl: string): string | null {
  const candidates: ImageCandidate[] = [];
  const collect = (node: unknown, trustUntyped: boolean) => {
    for (const entry of Array.isArray(node) ? node : [node]) {
      if (!entry || typeof entry !== "object") continue;
      const attrs = entry as Record<string, unknown>;
      const url = typeof attrs["@_url"] === "string" ? attrs["@_url"] : null;
      if (!url) continue;
      const type = String(attrs["@_type"] ?? "");
      const medium = String(attrs["@_medium"] ?? "");
      if (type && !type.startsWith("image/")) continue;
      if (medium && medium !== "image") continue;
      if (!type && !medium && !trustUntyped && !IMAGE_EXT.test(url)) continue;
      candidates.push({ url, width: Number(attrs["@_width"]) || 0 });
    }
  };

  collect(record["media:content"], false);
  collect(record["media:thumbnail"], true);
  collect(record.enclosure, false);
  const group = record["media:group"];
  if (group && typeof group === "object") {
    collect((group as Record<string, unknown>)["media:content"], false);
    collect((group as Record<string, unknown>)["media:thumbnail"], true);
  }

  // La plus large d'abord : une miniature de 144 px est floue dans une carte.
  for (const candidate of candidates.sort((a, b) => b.width - a.width)) {
    const url = normalizeImageUrl(candidate.url, baseUrl);
    if (url) return url;
  }

  for (const key of ["content:encoded", "content", "description", "summary"]) {
    const html = textOf(record[key]);
    for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      const url = normalizeImageUrl(match[1], baseUrl);
      if (url) return url;
    }
  }
  return null;
}

/**
 * Fetches and parses one RSS 2.0 or Atom feed. Best-effort: returns an
 * empty list on any failure (network, timeout, malformed XML) rather than
 * throwing, so one broken feed never blocks the others.
 */
export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EquinoxeNewsBot/1.0)" },
    });
    if (!res.ok) {
      console.error(`RSS ${url}: HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const data = parser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
      feed?: { entry?: unknown };
    };

    if (!data.rss?.channel && !data.feed) {
      console.error(`RSS ${url}: document non RSS/Atom`);
      return [];
    }
    const raw = data.rss?.channel?.item ?? data.feed?.entry ?? [];
    const items = Array.isArray(raw) ? raw : [raw];

    return items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const title = textOf(record.title).trim();
        const link = linkOf(record.link).trim();
        const publishedAt = parseDate(record.pubDate ?? record.published ?? record.updated);
        return { title, url: link, domain: getDomain(link), publishedAt, imageUrl: imageOfFeedItem(record, link) };
      })
      .filter((item) => item.title && item.url);
  } catch (err) {
    console.error(`Failed to fetch RSS feed ${url}:`, err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
