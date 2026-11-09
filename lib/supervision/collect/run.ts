// Supervision V1, Lot 4 : un passage de collecte pour UNE Supervision. SANS IA : recherche Google Actualités (flux RSS public),
// correspondance déterministe, rangement idempotent, journal.
//
// Garanties :
//  - l'ouverture du passage est atomique (sv_begin_collection) : propriétaire vérifié, pas de passage simultané, intervalle minimal ;
//  - relancer un passage ne crée jamais de doublon (publication unique par adresse canonique, rattachement unique par Supervision) ;
//  - chaque passage laisse une ligne de journal, même en cas d'échec ;
//  - un flux en panne n'arrête pas les autres : le passage est alors « partiel », jamais présenté comme complet.

import { COUNTRY_CODES } from "../../countryCodes";
import { fetchFeed as realFetchFeed, type FeedItem } from "../../rss";
import { GEO_SOURCE, candidateKeys, locate, type Located, type PlaceRow } from "../geo/gazetteer";
import { StoreError, adminDb, callRpc, getScopeSnapshot, getSupervision, type Db, type FailureCode } from "../core/store";
import { matchItem } from "./match";
import { normalizeFeedItem, type ItemRow } from "./normalize";
import { buildQueries, type SearchQuery } from "./queries";

export const DEFAULT_MIN_INTERVAL_MINUTES = 15;
/** Ancienneté maximale d'une publication rangée. */
export const MAX_AGE_DAYS = 30;
const MAX_MATCHED_PER_RUN = 600;
const FETCH_CONCURRENCY = 3;
const CHUNK = 150;

export interface CollectStats {
  queries: number;
  failedQueries: number;
  fetched: number;
  skipped: Record<string, number>;
  rejected: number;
  matched: number;
  newItems: number;
  newMatches: number;
  /** Publications retenues auxquelles un lieu a été trouvé dans le texte (dictionnaire GeoNames, sans IA). */
  located: number;
  /** Faux si le dictionnaire de lieux n'est pas installé dans cette base : rien n'est localisé. */
  locationAvailable: boolean;
  truncated: boolean;
}

export type CollectOutcome =
  | { ok: true; runId: string; status: "ok" | "partial" | "failed"; stats: CollectStats }
  | { ok: false; code: FailureCode | "no_queries" | "collect_failed"; detail: Record<string, unknown> };

export interface CollectDeps {
  db?: Db;
  fetchFeed?: (url: string) => Promise<FeedItem[]>;
  now?: Date;
}

async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const missingTable = (error: { code?: string; message?: string }) => error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");

/** Lieux du dictionnaire dont le nom figure dans les textes, pour les pays donnés. Table absente : « indisponible », sans erreur. */
async function loadPlaceRows(db: Db, texts: readonly string[], countries: readonly string[]): Promise<{ available: boolean; rows: PlaceRow[] }> {
  if (countries.length === 0) return { available: false, rows: [] };
  const rows: PlaceRow[] = [];
  const keys = candidateKeys(texts);
  for (let start = 0; start < keys.length; start += 150) {
    const { data, error } = await db.from("sv_place_names").select("geoname_id, name_key, name, country, latitude, longitude, feature_code, population, is_main").in("country", [...countries]).in("name_key", keys.slice(start, start + 150));
    if (error) {
      if (missingTable(error)) return { available: false, rows: [] };
      throw new StoreError("Lecture des lieux : " + error.message, error);
    }
    rows.push(...((data ?? []) as PlaceRow[]));
  }
  return { available: true, rows };
}

const chunks = <T,>(values: readonly T[], size: number): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

export async function collectForSupervision(
  ownerId: string,
  supervisionId: string,
  options: { trigger: "manual" | "scheduled"; minIntervalMinutes?: number; deps?: CollectDeps },
): Promise<CollectOutcome> {
  const db = options.deps?.db ?? adminDb();
  const fetchFeed = options.deps?.fetchFeed ?? realFetchFeed;
  const now = options.deps?.now ?? new Date();

  const begun = await callRpc<{ run_id: string }>(db, "sv_begin_collection", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_trigger: options.trigger,
    p_min_interval_minutes: options.minIntervalMinutes ?? DEFAULT_MIN_INTERVAL_MINUTES,
    p_now: now.toISOString(),
  });
  if (!begun.ok) return { ok: false, code: begun.code, detail: begun.detail };
  const runId = begun.run_id;

  const finish = async (status: "ok" | "partial" | "failed", stats: Partial<CollectStats>, queries: string[], error: string | null) => {
    await db.from("sv_collection_runs").update({ finished_at: new Date().toISOString(), status, stats, queries, error }).eq("id", runId);
  };

  try {
    const supervision = await getSupervision(ownerId, supervisionId, db);
    const snapshot = supervision?.currentScopeVersionId ? await getScopeSnapshot(ownerId, supervisionId, supervision.currentScopeVersionId, db) : null;
    if (!supervision || !snapshot) {
      await finish("failed", {}, [], "Périmètre introuvable.");
      return { ok: false, code: "not_found", detail: {} };
    }
    const queries: SearchQuery[] = buildQueries(snapshot);
    if (queries.length === 0) {
      await finish("failed", {}, [], "Aucune requête : zone non prise en charge pour la collecte.");
      return { ok: false, code: "no_queries", detail: {} };
    }

    // 1. Recherche : un flux en panne donne une liste vide (fetchFeed ne lève pas) ; on compte les requêtes sans aucun résultat.
    const feeds = await mapPool(queries, FETCH_CONCURRENCY, (query) => fetchFeed(query.url));
    const stats: CollectStats = { queries: queries.length, failedQueries: feeds.filter((items) => items.length === 0).length, fetched: 0, skipped: {}, rejected: 0, matched: 0, newItems: 0, newMatches: 0, located: 0, locationAvailable: false, truncated: false };

    // 2. Normalisation, dédoublonnage par adresse canonique, correspondance.
    const matched = new Map<string, { row: ItemRow; score: number; reason: string; terms: string[]; theme: string }>();
    // Une même publication remonte souvent par plusieurs recherches : « fetched » compte les remontées, le reste compte chaque publication UNE fois.
    const seen = new Set<string>();
    for (const items of feeds) {
      for (const item of items) {
        stats.fetched++;
        if (item.url) {
          if (seen.has(item.url)) continue;
          seen.add(item.url);
        }
        const normalized = normalizeFeedItem(item, { kind: "gnews", now, maxAgeDays: MAX_AGE_DAYS });
        if (!normalized.ok) {
          stats.skipped[normalized.reason] = (stats.skipped[normalized.reason] ?? 0) + 1;
          continue;
        }
        if (matched.has(normalized.row.url_canonical)) continue;
        const verdict = matchItem({ title: normalized.row.title, excerpt: normalized.row.excerpt }, snapshot);
        if (!verdict.matched) {
          stats.rejected++;
          continue;
        }
        matched.set(normalized.row.url_canonical, { row: normalized.row, score: verdict.score, reason: verdict.reason, terms: verdict.terms, theme: verdict.theme });
      }
    }
    let kept = [...matched.values()].sort((a, b) => b.row.published_at.localeCompare(a.row.published_at));
    if (kept.length > MAX_MATCHED_PER_RUN) {
      kept = kept.slice(0, MAX_MATCHED_PER_RUN);
      stats.truncated = true;
    }
    stats.matched = kept.length;

    // 2b. Localisation d'après les noms de lieux du texte (dictionnaire GeoNames, sans IA) : aucun lieu reconnu ou lieu ambigu = pas de position.
    const zone = snapshot.scope.primaryZone;
    const iso2 = zone.kind === "countries" ? zone.codes.flatMap((code) => COUNTRY_CODES.find((entry) => entry.iso3 === code)?.iso2 ?? []) : [];
    const places = await loadPlaceRows(db, kept.flatMap((entry) => [entry.row.title, entry.row.excerpt ?? ""]), iso2);
    stats.locationAvailable = places.available;
    const located = new Map<string, Located>();
    if (places.available) {
      for (const entry of kept) {
        const found = locate(entry.row.title, entry.row.excerpt, places.rows);
        if (found) located.set(entry.row.url_canonical, found);
      }
    }
    stats.located = located.size;

    // 3. Rangement idempotent : publications (partagées), puis rattachements (propres à la Supervision).
    const canonicals = kept.map((entry) => entry.row.url_canonical);
    const known = new Set<string>();
    for (const part of chunks(canonicals, CHUNK)) {
      const { data, error } = await db.from("sv_items").select("url_canonical").in("url_canonical", part);
      if (error) throw new StoreError(`Lecture des publications : ${error.message}`, error);
      for (const row of (data ?? []) as { url_canonical: string }[]) known.add(row.url_canonical);
    }
    const fresh = kept.filter((entry) => !known.has(entry.row.url_canonical));
    for (const part of chunks(fresh, CHUNK)) {
      const { error } = await db.from("sv_items").upsert(part.map((entry) => entry.row), { onConflict: "url_canonical", ignoreDuplicates: true });
      if (error) throw new StoreError(`Rangement des publications : ${error.message}`, error);
    }
    stats.newItems = fresh.length;

    const idByCanonical = new Map<string, string>();
    for (const part of chunks(canonicals, CHUNK)) {
      const { data, error } = await db.from("sv_items").select("id, url_canonical").in("url_canonical", part);
      if (error) throw new StoreError(`Lecture des publications : ${error.message}`, error);
      for (const row of (data ?? []) as { id: string; url_canonical: string }[]) idByCanonical.set(row.url_canonical, row.id);
    }
    const alreadyMatched = new Set<string>();
    const itemIds = [...idByCanonical.values()];
    for (const part of chunks(itemIds, CHUNK)) {
      const { data, error } = await db.from("sv_matches").select("item_id").eq("supervision_id", supervisionId).in("item_id", part);
      if (error) throw new StoreError(`Lecture des rattachements : ${error.message}`, error);
      for (const row of (data ?? []) as { item_id: string }[]) alreadyMatched.add(row.item_id);
    }
    // Position : seulement si le dictionnaire est installé (sinon les colonnes de position n'existent peut-être pas encore).
    const geoFields = (entry: (typeof kept)[number]) => {
      if (!places.available) return {};
      const found = located.get(entry.row.url_canonical);
      return { place_name: found?.name ?? null, latitude: found?.latitude ?? null, longitude: found?.longitude ?? null, geo_precision: found?.precision ?? null, geo_source: found ? GEO_SOURCE : null };
    };
    const links = kept.flatMap((entry) => {
      const itemId = idByCanonical.get(entry.row.url_canonical);
      return itemId && !alreadyMatched.has(itemId) ? [{ supervision_id: supervisionId, item_id: itemId, score: entry.score, reason: entry.reason, terms: entry.terms, theme: entry.theme, matched_at: now.toISOString(), ...geoFields(entry) }] : [];
    });
    for (const part of chunks(links, CHUNK)) {
      const { error } = await db.from("sv_matches").upsert(part, { onConflict: "supervision_id,item_id", ignoreDuplicates: true });
      if (error) throw new StoreError("Rattachement des publications : " + error.message, error);
    }
    // Rattachements déjà connus : leur position est mise à jour (dictionnaire enrichi depuis), rien d'autre ne change.
    if (places.available) {
      const known = kept.flatMap((entry) => {
        const itemId = idByCanonical.get(entry.row.url_canonical);
        return itemId && alreadyMatched.has(itemId) ? [{ supervision_id: supervisionId, item_id: itemId, ...geoFields(entry) }] : [];
      });
      for (const part of chunks(known, CHUNK)) {
        const { error } = await db.from("sv_matches").upsert(part, { onConflict: "supervision_id,item_id" });
        if (error) throw new StoreError("Mise à jour des positions : " + error.message, error);
      }
    }
    stats.newMatches = links.length;

    // 4. Journal : « partiel » dès qu'une requête n'a rien rendu, « échec » si plus rien n'a répondu.
    const status = stats.failedQueries === 0 ? "ok" : stats.failedQueries === stats.queries ? "failed" : "partial";
    await finish(status, stats, queries.map((query) => query.query), status === "failed" ? "Aucune recherche n'a répondu." : null);
    return { ok: true, runId, status, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Erreur inconnue.";
    await finish("failed", {}, [], message).catch(() => undefined);
    return { ok: false, code: "collect_failed", detail: { message } };
  }
}
