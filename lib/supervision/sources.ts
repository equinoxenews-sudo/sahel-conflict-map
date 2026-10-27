import type { FeedItem } from "../rss";
import { canonicalUrl } from "../veilleOsint";
import type { Candidate } from "./match";

// Conversion des contenus déjà collectés par Équinoxe (flux RSS, messages Telegram, événements GDELT, synthèses des
// analystes) en « publications » comparables, rangées dans supervision_items. Module pur : les lectures en base sont dans
// collect.ts. Rien n'est inventé : un lieu n'est renseigné que s'il vient de la source elle-même.

export type SourceKind = "rss" | "telegram" | "gdelt" | "zone_brief";

export interface ItemRow {
  url_canonical: string;
  url: string;
  title: string;
  excerpt: string | null;
  language: string | null;
  source_kind: SourceKind;
  source_name: string | null;
  published_at: string | null;
  latitude: number | null;
  longitude: number | null;
  geo_precision: "exact" | "ville" | "zone" | "aucune";
  geo_place: string | null;
  geo_confidence: number | null;
  geo_checked: boolean;
}

/** Une publication prête à être comparée aux veilles, avec le pays dont elle parle quand la source le dit. */
export interface SourcedItem extends Candidate {
  row: ItemRow;
}

const TITLE_MAX = 200;
const EXCERPT_MAX = 600;

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

const NO_PLACE = { latitude: null, longitude: null, geo_precision: "aucune" as const, geo_place: null, geo_confidence: null, geo_checked: false };

function wrap(row: ItemRow, country: string | null = null): SourcedItem {
  return { title: row.title, excerpt: row.excerpt, latitude: row.latitude, longitude: row.longitude, country, row };
}

export function fromFeedItem(item: FeedItem): SourcedItem | null {
  if (!item.url || !item.title.trim()) return null;
  return wrap({
    url_canonical: canonicalUrl(item.url),
    url: item.url,
    title: clip(item.title, TITLE_MAX),
    excerpt: item.excerpt ? clip(item.excerpt, EXCERPT_MAX) : null,
    language: null,
    source_kind: "rss",
    source_name: item.domain || null,
    published_at: isoOrNull(item.publishedAt),
    ...NO_PLACE,
  });
}

export interface TelegramRow {
  channel: string;
  url: string;
  text: string;
  published_at: string | null;
}

export function fromTelegramRow(row: TelegramRow): SourcedItem | null {
  const text = row.text.trim();
  if (!row.url || !text) return null;
  const firstLine = text.split(/\n+/)[0] ?? text;
  return wrap({
    url_canonical: canonicalUrl(row.url),
    url: row.url,
    title: clip(firstLine, 160),
    excerpt: clip(text, EXCERPT_MAX),
    language: null,
    source_kind: "telegram",
    source_name: `Telegram · ${row.channel}`,
    published_at: isoOrNull(row.published_at),
    ...NO_PLACE,
  });
}

const CATEGORY_FR: Record<string, string> = {
  Battles: "Combats",
  "Explosions/Remote violence": "Explosions et frappes à distance",
  "Violence against civilians": "Violences contre des civils",
  Protests: "Manifestations",
  Riots: "Émeutes",
  "Strategic developments": "Développements stratégiques",
};

export interface GdeltEventRow {
  external_id: string;
  event_date: string;
  country: string;
  latitude: number;
  longitude: number;
  category: string;
  source: string | null;
  summary: string | null;
}

/** Événement extrait automatiquement par GDELT : lieu au niveau de la localité, jamais présenté comme un fait vérifié. */
export function fromGdeltEvent(row: GdeltEventRow): SourcedItem | null {
  if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) return null;
  const label = CATEGORY_FR[row.category] ?? row.category;
  const url = row.source && /^https?:\/\//i.test(row.source) ? row.source : `gdelt:${row.external_id}`;
  const summary = row.summary?.trim() ?? "";
  return wrap(
    {
      url_canonical: canonicalUrl(url),
      url,
      title: summary ? clip(summary, 160) : `${label} — ${row.country}`,
      excerpt: summary ? clip(summary, EXCERPT_MAX) : null,
      language: null,
      source_kind: "gdelt",
      source_name: "GDELT",
      published_at: isoOrNull(row.event_date),
      latitude: row.latitude,
      longitude: row.longitude,
      geo_precision: "ville",
      geo_place: row.country,
      geo_confidence: 40,
      geo_checked: true,
    },
    row.country,
  );
}

export interface BriefRow {
  id: number;
  title: string;
  summary: string;
  published_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  place_country: string | null;
  geo_precision: string | null;
  confidence: number | null;
}

/** Synthèse d'un analyste Équinoxe : déjà localisée (ville citée, à défaut capitale marquée comme telle). */
export function fromBrief(row: BriefRow): SourcedItem | null {
  if (!row.title.trim()) return null;
  const located = row.latitude != null && row.longitude != null;
  // Une position « capitale » est une information d'ordre national, pas le lieu de l'événement : on ne s'en sert pas.
  const usable = located && row.geo_precision !== "capitale";
  return wrap(
    {
      url_canonical: `equinoxe:brief:${row.id}`,
      url: `/briefs/${row.id}`,
      title: clip(row.title, TITLE_MAX),
      excerpt: clip(row.summary, EXCERPT_MAX),
      language: "fr",
      source_kind: "zone_brief",
      source_name: "Équinoxe",
      published_at: isoOrNull(row.published_at),
      latitude: usable ? row.latitude : null,
      longitude: usable ? row.longitude : null,
      geo_precision: usable ? "ville" : "aucune",
      geo_place: row.place_name,
      geo_confidence: usable ? row.confidence : null,
      geo_checked: true,
    },
    row.place_country,
  );
}
