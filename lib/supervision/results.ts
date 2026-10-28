import { getSupabaseAdmin } from "../supabaseAdmin";
import type { ReportContent } from "./synthesis";
import { SupervisionError } from "./store";

// Résultats d'une veille : les publications retenues avec la raison, l'état du dernier passage et les retours de
// l'utilisateur. Toutes les lectures filtrent sur le propriétaire ET sur la veille.

export type FeedbackKind = "relevant" | "irrelevant" | "duplicate" | "wrong_location" | "comment";
export const FEEDBACK_KINDS: readonly FeedbackKind[] = ["relevant", "irrelevant", "duplicate", "wrong_location", "comment"];

export interface ResultItem {
  id: number;
  url: string;
  title: string;
  excerpt: string | null;
  sourceKind: string;
  sourceName: string | null;
  publishedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  geoPrecision: string | null;
  geoPlace: string | null;
  score: number;
  reason: string | null;
  /** Image fournie par la source elle-même. */
  imageUrl: string | null;
  /** Titre et résumé rédigés en français par le tri éditorial (null : on affiche le titre d'origine). */
  titleFr: string | null;
  summaryFr: string | null;
  themes: string[];
  country: string | null;
  /** 0-100 : pertinence pour la veille d'après le tri éditorial ; null si la publication n'a pas encore été triée. */
  relevance: number | null;
  judged: boolean;
  judgeNote: string | null;
  /** Retour déjà donné par l'utilisateur sur cette publication (le plus récent). */
  feedback: FeedbackKind | null;
}

export interface RunInfo {
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error";
  error: string | null;
  stats: Record<string, unknown>;
}

export interface ReportView {
  day: string;
  content: ReportContent;
  createdAt: string;
  costUsd: number;
}

/** Une publication écartée par le tri éditorial, avec la raison : pour vérifier que le tri n'est pas trop sévère. */
export interface DroppedItem {
  id: number;
  url: string;
  title: string;
  titleFr: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  note: string | null;
}

export interface Results {
  /** Publications écartées par le tri (les plus récentes d'abord, 80 au plus). */
  dropped: DroppedItem[];
  items: ResultItem[];
  lastRun: RunInfo | null;
  /** Dernière synthèse quotidienne, si elle a été rédigée. */
  report: ReportView | null;
  /** Publications masquées par un retour « non pertinent » ou « doublon ». */
  hidden: number;
}

const MAX_ITEMS = 300;

interface MatchRow {
  score: number;
  reason: string | null;
  verdict?: string | null;
  relevance?: number | null;
  judged?: boolean | null;
  judge_note?: string | null;
  supervision_items: {
    id: number;
    url: string;
    title: string;
    excerpt: string | null;
    source_kind: string;
    source_name: string | null;
    published_at: string | null;
    latitude: number | null;
    longitude: number | null;
    geo_precision: string | null;
    geo_place: string | null;
    image_url?: string | null;
    title_fr?: string | null;
    summary_fr?: string | null;
    themes?: string[] | null;
    country?: string | null;
  } | null;
}

export async function loadResults(ownerId: string, supervisionId: string, sinceDays?: number): Promise<Results> {
  const db = getSupabaseAdmin();
  const base = "id, url, title, excerpt, source_kind, source_name, published_at, latitude, longitude, geo_precision, geo_place";
  const query = (select: string) => db.from("supervision_matches").select(select).eq("owner_id", ownerId).eq("supervision_id", supervisionId).limit(2000);
  let { data, error } = await query(`score, reason, verdict, relevance, judged, judge_note, supervision_items(${base}, image_url, title_fr, summary_fr, themes, country)`);
  if (error && /column|schema cache/i.test(error.message)) {
    // Colonnes du tri éditorial pas encore ajoutées (supabase/add-supervision-curation.sql) : résultats sans tri.
    ({ data, error } = await query(`score, reason, supervision_items(${base})`));
  }
  if (error) throw new SupervisionError(error.message, "error");

  const { data: feedbackRows, error: feedbackError } = await db
    .from("supervision_feedback")
    .select("target_id, kind, created_at")
    .eq("owner_id", ownerId)
    .eq("supervision_id", supervisionId)
    .eq("target_type", "item")
    .order("created_at", { ascending: true });
  if (feedbackError) throw new SupervisionError(feedbackError.message, "error");
  const latest = new Map<string, FeedbackKind>();
  for (const row of (feedbackRows ?? []) as { target_id: string; kind: FeedbackKind }[]) {
    if (row.kind !== "comment") latest.set(row.target_id, row.kind);
  }

  const cutoff = sinceDays ? Date.now() - sinceDays * 86_400_000 : null;
  let hidden = 0;
  const dropped: DroppedItem[] = [];
  const items: ResultItem[] = [];
  for (const row of (data ?? []) as unknown as MatchRow[]) {
    const item = row.supervision_items;
    if (!item) continue;
    if (row.verdict === "drop") {
      dropped.push({ id: item.id, url: item.url, title: item.title, titleFr: item.title_fr ?? null, sourceName: item.source_name, publishedAt: item.published_at, note: row.judge_note ?? null });
      continue;
    }
    const feedback = latest.get(String(item.id)) ?? null;
    if (feedback === "irrelevant" || feedback === "duplicate") {
      hidden += 1;
      continue;
    }
    if (cutoff !== null && item.published_at && Date.parse(item.published_at) < cutoff) continue;
    items.push({
      id: item.id,
      url: item.url,
      title: item.title,
      excerpt: item.excerpt,
      sourceKind: item.source_kind,
      sourceName: item.source_name,
      publishedAt: item.published_at,
      latitude: item.latitude,
      longitude: item.longitude,
      geoPrecision: item.geo_precision,
      geoPlace: item.geo_place,
      score: row.score,
      reason: row.reason,
      imageUrl: item.image_url ?? null,
      titleFr: item.title_fr ?? null,
      summaryFr: item.summary_fr ?? null,
      themes: item.themes ?? [],
      country: item.country ?? null,
      relevance: row.judged ? (row.relevance ?? null) : null,
      judged: row.judged === true,
      judgeNote: row.judge_note ?? null,
      feedback,
    });
  }
  items.sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0") || b.score - a.score);

  const { data: runRows } = await db
    .from("supervision_runs")
    .select("started_at, finished_at, status, error, stats")
    .eq("supervision_id", supervisionId)
    .order("started_at", { ascending: false })
    .limit(1);
  const run = (runRows ?? [])[0] as { started_at: string; finished_at: string | null; status: RunInfo["status"]; error: string | null; stats: Record<string, unknown> } | undefined;
  return {
    items: items.slice(0, MAX_ITEMS),
    hidden,
    dropped: dropped.sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0")).slice(0, 80),
    report: await loadLatestReport(ownerId, supervisionId),
    lastRun: run ? { startedAt: run.started_at, finishedAt: run.finished_at, status: run.status, error: run.error, stats: run.stats ?? {} } : null,
  };
}

/** La synthèse quotidienne la plus récente d'une veille. */
export async function loadLatestReport(ownerId: string, supervisionId: string): Promise<ReportView | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("supervision_reports")
    .select("period_start, content, created_at, cost_usd")
    .eq("owner_id", ownerId)
    .eq("supervision_id", supervisionId)
    .eq("kind", "daily")
    .order("period_start", { ascending: false })
    .limit(1);
  if (error) return null;
  const row = (data ?? [])[0] as { period_start: string; content: ReportContent; created_at: string; cost_usd: number | string } | undefined;
  return row ? { day: row.period_start, content: row.content, createdAt: row.created_at, costUsd: Number(row.cost_usd || 0) } : null;
}

export async function addFeedback(ownerId: string, supervisionId: string, input: { targetType: "item" | "event" | "report"; targetId: string; kind: FeedbackKind; comment?: string }): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("supervision_feedback")
    .insert({
      supervision_id: supervisionId,
      owner_id: ownerId,
      target_type: input.targetType,
      target_id: input.targetId,
      kind: input.kind,
      comment: input.comment ? input.comment.slice(0, 1000) : null,
    });
  if (error) throw new SupervisionError(error.message, "error");
}
