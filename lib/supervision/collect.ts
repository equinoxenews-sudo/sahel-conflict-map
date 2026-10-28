import { mapWithConcurrency } from "../gdelt";
import { fetchFeed } from "../rss";
import { ZONE_RSS_FEEDS } from "../rssFeeds";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { fetchChannel } from "../telegram";
import { countryNames, foldName } from "./geo";
import { locateMatchedItems } from "./locate";
import { matchCandidate } from "./match";
import { placeWordsFor } from "./nearby";
import { allWorldCountryFeatures } from "../worldGeo";
import type { Supervision } from "./model";
import {
  fromBrief,
  fromFeedItem,
  fromGdeltEvent,
  fromTelegramRow,
  type BriefRow,
  type GdeltEventRow,
  type ItemRow,
  type SourcedItem,
  type TelegramRow,
} from "./sources";
import { listActiveForCollection } from "./store";

// Collecte d'une veille : les contenus sont téléchargés UNE fois pour toutes les veilles actives, puis chaque veille
// garde ce qui lui correspond (zone, mots-clés, entités, exclusions). Aucun appel IA ici : la correspondance est
// déterministe, avec la raison écrite. Les publications retenues sont rangées dans supervision_items (partagées) et
// rattachées à la veille dans supervision_matches. Rien n'est inventé : une publication sans lieu reste « non localisée ».

/** Ancienneté maximale d'une publication retenue. */
const MAX_AGE_DAYS = 30;
const FEED_CONCURRENCY = 6;
const PAGE = 1000;
const CHUNK = 200;

export interface CollectSummary {
  supervisionId: string;
  ownerId: string;
  fetched: { rss: number; telegram: number; events: number; briefs: number };
  matched: number;
  /** Publications dont le lieu a été précisé / écartées parce que leur lieu est hors zone (voir locate.ts). */
  located: { asked: number; placed: number; excluded: number; note: string | null };
  error: string | null;
}

type Db = ReturnType<typeof getSupabaseAdmin>;
type Page = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

async function readAll<T>(read: (from: number, to: number) => Page, max: number): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await read(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

const sinceIso = (now: number) => new Date(now - MAX_AGE_DAYS * 86_400_000).toISOString();

async function loadEvents(db: Db, now: number): Promise<SourcedItem[]> {
  const since = sinceIso(now).slice(0, 10);
  const rows = await readAll<GdeltEventRow>(
    (from, to) =>
      db
        .from("conflict_events")
        .select("external_id, event_date, country, latitude, longitude, category, source, summary")
        .gte("event_date", since)
        .order("event_date", { ascending: false })
        .range(from, to),
    4000,
  );
  return rows.flatMap((row) => fromGdeltEvent(row) ?? []);
}

async function loadBriefs(db: Db, now: number): Promise<SourcedItem[]> {
  const rows = await readAll<BriefRow>(
    (from, to) =>
      db
        .from("zone_briefs")
        .select("id, title, summary, published_at, latitude, longitude, place_name, place_country, geo_precision, confidence")
        .gte("published_at", sinceIso(now))
        .order("published_at", { ascending: false })
        .range(from, to),
    3000,
  );
  return rows.flatMap((row) => fromBrief(row) ?? []);
}

async function loadStoredTelegram(db: Db, now: number): Promise<SourcedItem[]> {
  const rows = await readAll<TelegramRow>(
    (from, to) =>
      db.from("telegram_posts").select("channel, url, text, published_at").gte("created_at", sinceIso(now)).order("created_at", { ascending: false }).range(from, to),
    3000,
  );
  return rows.flatMap((row) => fromTelegramRow(row) ?? []);
}

/** Publications de chaque flux, par adresse de flux (un flux en panne donne une liste vide, sans arrêter les autres). */
async function loadFeeds(urls: string[]): Promise<Map<string, SourcedItem[]>> {
  const batches = await mapWithConcurrency(urls, FEED_CONCURRENCY, async (url) => [url, (await fetchFeed(url)).flatMap((item) => fromFeedItem(item) ?? [])] as const);
  return new Map(batches);
}

/** Publications de canaux Telegram publics ajoutés par l'utilisateur, par identifiant de canal. */
async function loadChannels(handles: string[]): Promise<Map<string, SourcedItem[]>> {
  const batches = await mapWithConcurrency(handles, 6, async (handle) => {
    const posts = await fetchChannel(handle);
    return [handle, posts.flatMap((post) => fromTelegramRow({ channel: post.channel, url: post.url, text: post.text, published_at: post.publishedAt }) ?? [])] as const;
  });
  return new Map(batches);
}

function enabled(supervision: Supervision, type: "gdelt" | "rss" | "telegram") {
  return supervision.sources.filter((source) => source.type === type && source.enabled);
}

const unique = <T>(values: T[]) => [...new Set(values)];

function recent(item: SourcedItem, since: number): boolean {
  const time = item.row.published_at ? Date.parse(item.row.published_at) : Number.NaN;
  return !Number.isFinite(time) || time >= since;
}

/** Collecte et rattache les publications à une ou plusieurs veilles actives. Une veille en erreur n'arrête pas les autres. */
export async function collectSupervisions(options: { ownerId?: string; supervisionId?: string; now?: number } = {}): Promise<CollectSummary[]> {
  const now = options.now ?? Date.now();
  const since = now - MAX_AGE_DAYS * 86_400_000;
  const db = getSupabaseAdmin();
  const supervisions = await listActiveForCollection({ ownerId: options.ownerId, id: options.supervisionId });
  if (supervisions.length === 0) return [];

  // Un journal de passage par veille : un passage échoué reste visible et peut être relancé sans doublons.
  const runIds = new Map<string, number>();
  for (const supervision of supervisions) {
    const { data } = await db.from("supervision_runs").insert({ supervision_id: supervision.id, kind: "collect" }).select("id").single();
    if (data) runIds.set(supervision.id, (data as { id: number }).id);
  }

  // Téléchargements partagés, une seule fois pour toutes les veilles.
  const wantsEvents = supervisions.some((s) => enabled(s, "gdelt").length > 0);
  const wantsOwnFeeds = supervisions.some((s) => enabled(s, "rss").some((source) => source.ref === ""));
  const wantsOwnTelegram = supervisions.some((s) => enabled(s, "telegram").some((source) => source.ref === ""));
  const customFeeds = unique(supervisions.flatMap((s) => enabled(s, "rss").map((source) => source.ref).filter(Boolean)));
  const customChannels = unique(supervisions.flatMap((s) => enabled(s, "telegram").map((source) => source.ref).filter(Boolean)));

  const failures: string[] = [];
  const guard = async <T>(label: string, empty: T, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      failures.push(`${label} : ${error instanceof Error ? error.message : String(error)}`);
      return empty;
    }
  };
  const none: SourcedItem[] = [];
  const [events, briefs, ownTelegram, ownFeedMap, customFeedMap, channelMap] = await Promise.all([
    wantsEvents ? guard("événements GDELT", none, () => loadEvents(db, now)) : none,
    guard("synthèses Équinoxe", none, () => loadBriefs(db, now)),
    wantsOwnTelegram ? guard("Telegram d'Équinoxe", none, () => loadStoredTelegram(db, now)) : none,
    wantsOwnFeeds ? guard("flux d'Équinoxe", new Map<string, SourcedItem[]>(), () => loadFeeds(unique(Object.values(ZONE_RSS_FEEDS).flat()))) : new Map<string, SourcedItem[]>(),
    guard("flux ajoutés", new Map<string, SourcedItem[]>(), () => loadFeeds(customFeeds)),
    guard("canaux ajoutés", new Map<string, SourcedItem[]>(), () => loadChannels(customChannels)),
  ]);
  const ownFeeds = [...ownFeedMap.values()].flat();

  const summaries: CollectSummary[] = [];
  for (const supervision of supervisions) {
    const summary: CollectSummary = {
      supervisionId: supervision.id,
      ownerId: supervision.ownerId,
      fetched: { rss: 0, telegram: 0, events: 0, briefs: briefs.length },
      matched: 0,
      located: { asked: 0, placed: 0, excluded: 0, note: null },
      error: null,
    };
    try {
      const pool: SourcedItem[] = [...briefs];
      if (enabled(supervision, "gdelt").length > 0) {
        pool.push(...events);
        summary.fetched.events = events.length;
      }
      for (const source of enabled(supervision, "rss")) {
        const items = source.ref === "" ? ownFeeds : (customFeedMap.get(source.ref) ?? []);
        pool.push(...items);
        summary.fetched.rss += items.length;
      }
      for (const source of enabled(supervision, "telegram")) {
        const items = source.ref === "" ? ownTelegram : (channelMap.get(source.ref) ?? []);
        pool.push(...items);
        summary.fetched.telegram += items.length;
      }

      const names = supervision.zone.kind === "countries" ? countryNames(supervision.zone.codes) : undefined;
      // Pays qui touchent la zone : une publication sans lieu doit en citer un (sinon elle parle d'ailleurs).
      let placeWords: Set<string> | null = null;
      try {
        placeWords = placeWordsFor(supervision.zone, allWorldCountryFeatures(), names);
      } catch {
        // Fond de carte illisible : on retombe sur le comportement sans filtre de lieu, signalé dans le journal.
        failures.push("fond de carte des pays illisible : filtre de lieu désactivé");
      }
      const seen = new Set<string>();
      // Le même article arrive souvent par plusieurs flux (média, Google Actualités) avec des adresses différentes : on
      // le reconnaît aussi à son titre normalisé.
      const seenTitles = new Set<string>();
      let kept: { item: SourcedItem; score: number; reason: string }[] = [];
      for (const item of pool) {
        const titleKey = foldName(item.row.title).slice(0, 90);
        if (seen.has(item.row.url_canonical) || (titleKey.length >= 25 && seenTitles.has(titleKey)) || !recent(item, since)) continue;
        seen.add(item.row.url_canonical);
        seenTitles.add(titleKey);
        const result = matchCandidate(item, supervision.zone, supervision.criteria, names, placeWords);
        if (result.matched) kept.push({ item, score: result.score, reason: result.reason });
      }
      // Un lieu déjà précisé lors d'un passage précédent s'applique tout de suite : une publication placée hors zone ne revient pas.
      kept = await applyStoredPlaces(db, supervision, kept, names, placeWords);
      await store(db, supervision, kept);
      summary.located = await locateMatchedItems(supervision, new Date(now));
      summary.matched = Math.max(0, kept.length - summary.located.excluded);
      await db.from("supervisions").update({ last_run_at: new Date(now).toISOString() }).eq("id", supervision.id);
    } catch (error) {
      summary.error = error instanceof Error ? error.message : String(error);
    }
    const note = [summary.error, summary.located.note, ...failures].filter(Boolean).join(" | ") || null;
    const runId = runIds.get(supervision.id);
    if (runId !== undefined) {
      await db
        .from("supervision_runs")
        .update({ finished_at: new Date().toISOString(), status: summary.error ? "error" : "ok", stats: { fetched: summary.fetched, matched: summary.matched, located: summary.located }, error: note })
        .eq("id", runId);
    }
    summaries.push(summary);
  }
  return summaries;
}

type Kept = { item: SourcedItem; score: number; reason: string };

/**
 * Applique aux publications retenues le lieu déjà précisé lors d'un passage précédent (table supervision_items), puis
 * refait la correspondance : une publication dont le lieu connu est hors zone est écartée au lieu de revenir à chaque collecte.
 */
async function applyStoredPlaces(db: Db, supervision: Supervision, kept: Kept[], names: Set<string> | undefined, placeWords: Set<string> | null): Promise<Kept[]> {
  const known = new Map<string, { latitude: number | null; longitude: number | null; geo_precision: ItemRow["geo_precision"]; geo_place: string | null }>();
  const canonicals = kept.map(({ item }) => item.row.url_canonical);
  for (let start = 0; start < canonicals.length; start += CHUNK) {
    const { data, error } = await db
      .from("supervision_items")
      .select("url_canonical, latitude, longitude, geo_precision, geo_place, geo_checked")
      .in("url_canonical", canonicals.slice(start, start + CHUNK))
      .eq("geo_checked", true);
    if (error) throw new Error(`lecture des lieux connus : ${error.message}`);
    for (const row of (data ?? []) as { url_canonical: string; latitude: number | null; longitude: number | null; geo_precision: ItemRow["geo_precision"]; geo_place: string | null }[]) {
      known.set(row.url_canonical, row);
    }
  }
  const refined: Kept[] = [];
  for (const entry of kept) {
    const place = known.get(entry.item.row.url_canonical);
    if (!place) {
      refined.push(entry);
      continue;
    }
    entry.item.latitude = place.latitude;
    entry.item.longitude = place.longitude;
    Object.assign(entry.item.row, { latitude: place.latitude, longitude: place.longitude, geo_precision: place.geo_precision, geo_place: place.geo_place, geo_checked: true });
    const result = matchCandidate(entry.item, supervision.zone, supervision.criteria, names, placeWords);
    if (result.matched) refined.push({ item: entry.item, score: result.score, reason: result.reason });
  }
  return refined;
}

/** Range les publications retenues (partagées) puis les rattache à la veille, sans jamais créer de doublon. */
async function store(db: Db, supervision: Supervision, kept: { item: SourcedItem; score: number; reason: string }[]): Promise<void> {
  if (kept.length === 0) return;
  const rows: ItemRow[] = kept.map(({ item }) => item.row);
  for (let start = 0; start < rows.length; start += CHUNK) {
    // Une publication déjà connue garde son état (lieu éventuellement précisé depuis).
    const { error } = await db.from("supervision_items").upsert(rows.slice(start, start + CHUNK), { onConflict: "url_canonical", ignoreDuplicates: true });
    if (error) throw new Error(`enregistrement des publications : ${error.message}`);
  }
  const ids = new Map<string, number>();
  const canonicals = rows.map((row) => row.url_canonical);
  for (let start = 0; start < canonicals.length; start += CHUNK) {
    const { data, error } = await db.from("supervision_items").select("id, url_canonical").in("url_canonical", canonicals.slice(start, start + CHUNK));
    if (error) throw new Error(`lecture des publications : ${error.message}`);
    for (const row of (data ?? []) as { id: number; url_canonical: string }[]) ids.set(row.url_canonical, row.id);
  }
  const matches = kept.flatMap(({ item, score, reason }) => {
    const itemId = ids.get(item.row.url_canonical);
    return itemId === undefined ? [] : [{ supervision_id: supervision.id, owner_id: supervision.ownerId, item_id: itemId, score, reason }];
  });
  for (let start = 0; start < matches.length; start += CHUNK) {
    const { error } = await db.from("supervision_matches").upsert(matches.slice(start, start + CHUNK), { onConflict: "supervision_id,item_id" });
    if (error) throw new Error(`rattachement à la veille : ${error.message}`);
  }
}
