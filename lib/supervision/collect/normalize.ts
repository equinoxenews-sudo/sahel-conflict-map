// Supervision V1, Lot 4 : de l'élément de flux à la publication rangée en base. Module PUR, testé.
// Rien n'est inventé : pas de lieu, pas de résumé fabriqué ; une publication sans date n'est pas rangée (elle ne peut pas figurer
// dans une chronologie honnête).

import type { FeedItem } from "../../rss";

export interface ItemRow {
  url_canonical: string;
  url: string;
  title: string;
  excerpt: string | null;
  source_kind: "gnews" | "rss";
  source_name: string | null;
  published_at: string;
}

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$|source$|r$|s$)/i;
const TITLE_MAX = 220;
const EXCERPT_MAX = 600;

/** Adresse sans marques de suivi ni ancre ni barre finale : sert à reconnaître une publication déjà rangée. La casse du chemin est conservée. */
export function canonicalItemUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Google Actualités ajoute « - Éditeur » au titre et ne donne comme résumé que ce même titre. */
export function splitGoogleNewsTitle(title: string): { title: string; publisher: string | null } {
  const index = title.lastIndexOf(" - ");
  if (index <= 0 || index >= title.length - 3) return { title, publisher: null };
  const publisher = title.slice(index + 3).trim();
  return publisher.length > 0 && publisher.length <= 60 ? { title: title.slice(0, index).trim(), publisher } : { title, publisher: null };
}

export interface NormalizeOptions {
  kind: "gnews" | "rss";
  now: Date;
  /** Une publication plus ancienne n'est pas rangée. */
  maxAgeDays: number;
}

export type NormalizeResult = { ok: true; row: ItemRow } | { ok: false; reason: "no_url" | "no_title" | "no_date" | "too_old" | "future" };

export function normalizeFeedItem(item: FeedItem, options: NormalizeOptions): NormalizeResult {
  const canonical = item.url ? canonicalItemUrl(item.url) : null;
  if (!canonical) return { ok: false, reason: "no_url" };
  const rawTitle = item.title?.trim() ?? "";
  if (!rawTitle) return { ok: false, reason: "no_title" };
  const time = item.publishedAt ? Date.parse(item.publishedAt) : Number.NaN;
  if (!Number.isFinite(time)) return { ok: false, reason: "no_date" };
  if (time > options.now.getTime() + 3_600_000) return { ok: false, reason: "future" }; // une date dans le futur est une erreur de la source
  if (time < options.now.getTime() - options.maxAgeDays * 86_400_000) return { ok: false, reason: "too_old" };

  const google = options.kind === "gnews" || item.domain === "news.google.com";
  const split = google ? splitGoogleNewsTitle(rawTitle) : { title: rawTitle, publisher: null };
  const repeatsTitle = google && (!item.excerpt || item.excerpt.replace(/\s+/g, " ").trim().startsWith(split.title.slice(0, 40)));
  return {
    ok: true,
    row: {
      url_canonical: canonical,
      url: item.url.trim(),
      title: clip(split.title, TITLE_MAX),
      excerpt: item.excerpt && !repeatsTitle ? clip(item.excerpt, EXCERPT_MAX) : null,
      source_kind: options.kind,
      source_name: split.publisher ?? (item.domain || null),
      published_at: new Date(time).toISOString(),
    },
  };
}
