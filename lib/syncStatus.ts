import { getSupabaseAdmin } from "./supabaseAdmin";

export interface SyncStatus {
  source: string;
  last_success_at: string | null;
  last_attempt_at: string;
  last_error: string | null;
  last_count: number | null;
}

/**
 * Records the outcome of a sync run — always writes `last_attempt_at`,
 * only advances `last_success_at` when the run actually succeeded. Lets
 * the site distinguish "no new data today" (normal) from "this pipeline
 * has been silently broken for days" (needs attention), without ever
 * touching the actual data tables — a failed run just leaves yesterday's
 * events/points on the map instead of wiping anything.
 */
export async function recordSyncStatus(
  source: string,
  result: { ok: true; count: number } | { ok: false; error: string }
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    await supabase.from("sync_status").upsert(
      {
        source,
        last_attempt_at: now,
        ...(result.ok
          ? { last_success_at: now, last_count: result.count, last_error: null }
          : { last_error: result.error }),
      },
      { onConflict: "source" }
    );
  } catch (err) {
    // Status tracking is best-effort — never let it fail the actual sync.
    console.error(`Failed to record sync status for ${source}:`, err);
  }
}
