import { SAHEL_COUNTRIES } from "@/types/event";
import { fetchAcledEvents } from "./acled";
import { getSupabaseAdmin } from "./supabaseAdmin";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Pulls the last 30 days of ACLED events for the 4 Sahel countries and
 * upserts them into Supabase, keyed on ACLED's own event id so re-running
 * the sync never creates duplicates.
 */
export async function syncAcledEvents() {
  const since = isoDateDaysAgo(30);
  const supabase = getSupabaseAdmin();

  const events = await fetchAcledEvents(SAHEL_COUNTRIES, since);

  const rows = events
    .map((e) => {
      const latitude = Number(e.latitude);
      const longitude = Number(e.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

      return {
        external_id: e.event_id_cnty,
        event_date: e.event_date,
        country: e.country,
        latitude,
        longitude,
        category: e.event_type,
        fatalities: Number(e.fatalities) || 0,
        source: e.source || null,
        notes: e.notes || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const summary: Record<string, number> = Object.fromEntries(
    SAHEL_COUNTRIES.map((c) => [c, 0])
  );
  for (const row of rows) {
    summary[row.country] = (summary[row.country] ?? 0) + 1;
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("conflict_events")
      .upsert(rows, { onConflict: "external_id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  return summary;
}
