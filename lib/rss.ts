import { XMLParser } from "fast-xml-parser";

export interface FeedItem {
  title: string;
  url: string;
  domain: string;
  publishedAt: string | null;
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
    if (!res.ok) return [];

    const xml = await res.text();
    const data = parser.parse(xml) as {
      rss?: { channel?: { item?: unknown } };
      feed?: { entry?: unknown };
    };

    const raw = data.rss?.channel?.item ?? data.feed?.entry ?? [];
    const items = Array.isArray(raw) ? raw : [raw];

    return items
      .map((item) => {
        const record = item as Record<string, unknown>;
        const title = textOf(record.title).trim();
        const link = linkOf(record.link).trim();
        const publishedAt = parseDate(record.pubDate ?? record.published ?? record.updated);
        return { title, url: link, domain: getDomain(link), publishedAt };
      })
      .filter((item) => item.title && item.url);
  } catch (err) {
    console.error(`Failed to fetch RSS feed ${url}:`, err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
