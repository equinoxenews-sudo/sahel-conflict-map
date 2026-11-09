// Supervision V1, Lot 4 : un passage de collecte pour UNE Supervision. SANS IA : recherche Google Actualités (flux RSS public),
// correspondance déterministe, rangement idempotent, journal.
//
// Garanties :
//  - l'ouverture du passage est atomique (sv_begin_collection) : propriétaire vérifié, pas de passage simultané, intervalle minimal ;
//  - relancer un passage ne crée jamais de doublon (publication unique par adresse canonique, rattachement unique par Supervision) ;
//  - chaque passage laisse une ligne de journal, même en cas d'échec ;
//  - un flux en panne n'arrête pas les autres : le passage est alors « partiel », jamais présenté comme complet.

import { fetchFeed as realFetchFeed, type FeedItem } from "../../rss";
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
    const stats: CollectStats = { queries: queries.length, failedQueries: feeds.filter((items) => items.length === 0).length, fetched: 0, skipped: {}, rejected: 0, matched: 0, newItems: 0, newMatches: 0, truncated: false };

    // 2. Normalisation, dédoublonnage par adresse canonique, correspondance.
    const matched = new Map<string, { row: ItemRow; score: number; reason: string; terms: string[]; theme: string }>();
    for (const items of feeds) {
      for (const item of items) {
        stats.fetched++;
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
    const links = kept.flatMap((entry) => {
      const itemId = idByCanonical.get(entry.row.url_canonical);
      return itemId && !alreadyMatched.has(itemId) ? [{ supervision_id: supervisionId, item_id: itemId, score: entry.score, reason: entry.reason, terms: entry.terms, theme: entry.theme, matched_at: now.toISOString() }] : [];
    });
    for (const part of chunks(links, CHUNK)) {
      const { error } = await db.from("sv_matches").upsert(part, { onConflict: "supervision_id,item_id", ignoreDuplicates: true });
      if (error) throw new StoreError(`Rattachement des publications : ${error.message}`, error);
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
