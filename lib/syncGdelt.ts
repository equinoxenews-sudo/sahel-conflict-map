import { fetchArticleMeta } from "./articleSummary";
import { categoryForRootCode } from "./gdeltCategory";
import { fetchLatestGdeltEvents, mapWithConcurrency } from "./gdelt";
import { FIPS_TO_COUNTRY } from "./gdeltCountries";
import { computeReliability } from "./reliability";
import { getSupabaseAdmin } from "./supabaseAdmin";

function toEventDate(dateAdded: string): string {
  // dateAdded is YYYYMMDDHHMMSS
  return `${dateAdded.slice(0, 4)}-${dateAdded.slice(4, 6)}-${dateAdded.slice(6, 8)}`;
}

// GDELT's event extraction is fully automated (no human review, unlike
// ACLED/UCDP) and produces real false positives — wrong-country geocoding
// on ambiguous place names, or off-topic articles miscategorized as
// conflict events. Requiring a few independent mentions is a cheap, partial
// noise filter (single-mention extractions are the least reliable) — it
// does not eliminate false positives, just reduces the weakest ones.
const MIN_MENTIONS = 3;

const SUMMARY_FETCH_CONCURRENCY = 6;
// Bounds worst-case time spent fetching article summaries in a single run
// (each fetch has its own timeout too, see lib/articleSummary.ts) — stays
// well under Vercel's serverless function budget. Events skipped this run
// (source unreachable, or the cap hit) are simply retried on the next one,
// since already-summarized events are never re-fetched.
const MAX_SUMMARY_FETCHES_PER_RUN = 40;

type EventRow = {
  external_id: string;
  event_date: string;
  country: string;
  latitude: number;
  longitude: number;
  category: string;
  fatalities: number;
  source: string;
  notes: string;
  num_mentions: number;
  reliability: number;
};

/**
 * Attaches a real, human-written summary (the source article's own
 * og:description/meta description) to each row — skipping rows that
 * already have one stored from a previous run, and capping how many new
 * fetches a single run will attempt.
 */
async function attachSummaries(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: EventRow[]
): Promise<(EventRow & { summary: string | null })[]> {
  if (rows.length === 0) return [];

  const { data: existing } = await supabase
    .from("conflict_events")
    .select("external_id, summary")
    .in(
      "external_id",
      rows.map((r) => r.external_id)
    );

  const knownSummaries = new Map<string, string | null>(
    (existing ?? []).map((r) => [r.external_id as string, r.summary as string | null])
  );

  let fetchesUsed = 0;

  return mapWithConcurrency(rows, SUMMARY_FETCH_CONCURRENCY, async (row) => {
    if (knownSummaries.has(row.external_id)) {
      return { ...row, summary: knownSummaries.get(row.external_id) ?? null };
    }

    if (!row.source.startsWith("http") || fetchesUsed >= MAX_SUMMARY_FETCHES_PER_RUN) {
      return { ...row, summary: null };
    }
    fetchesUsed++;

    const { summary } = await fetchArticleMeta(row.source);
    return { ...row, summary };
  });
}

/**
 * Pulls the latest GDELT 15-minute event batch, keeps only events that
 * fall in one of our tracked countries and map to a conflict-relevant
 * CAMEO root code, and upserts them into Supabase. Meant to run on a
 * frequent cron (e.g. hourly) — each run only sees the most recent 15
 * minutes of global events, so the table builds up real coverage over
 * time rather than being backfilled in one shot.
 */
export async function syncGdeltEvents() {
  const events = await fetchLatestGdeltEvents();
  const supabase = getSupabaseAdmin();

  const rows = events
    .map((e) => {
      const country = FIPS_TO_COUNTRY[e.actionGeoCountryCode];
      if (!country) return null;

      const category = categoryForRootCode(e.eventRootCode);
      if (!category) return null;

      if (e.numMentions < MIN_MENTIONS) return null;

      return {
        external_id: `GDELT-${e.globalEventId}`,
        event_date: toEventDate(e.dateAdded),
        country,
        latitude: e.lat,
        longitude: e.lon,
        category,
        fatalities: 0,
        source: e.sourceUrl || "GDELT",
        notes: `Score Goldstein : ${e.goldsteinScale.toFixed(1)} · ${e.numMentions} mention(s)`,
        num_mentions: e.numMentions,
        reliability: computeReliability(e.numMentions),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const rowsWithSummary = await attachSummaries(supabase, rows);

  if (rowsWithSummary.length > 0) {
    const { error } = await supabase
      .from("conflict_events")
      .upsert(rowsWithSummary, { onConflict: "external_id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  const summary: Record<string, number> = {};
  for (const row of rows) {
    summary[row.country] = (summary[row.country] ?? 0) + 1;
  }

  return { totalGdeltEvents: events.length, matched: rows.length, byCountry: summary };
}
