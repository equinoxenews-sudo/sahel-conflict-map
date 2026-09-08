import { COUNTRY_TO_ISO3 } from "./countryToIso3";
import type { CountryRisk, RiskTier } from "./countryRisk";
import { supabase } from "./supabaseClient";

const LOOKBACK_DAYS = 90;

/**
 * Computes a red/orange/yellow risk tier per country from real
 * conflict_events data (last 90 days), instead of the old hand-picked
 * list. Countries are ranked by event count and split into thirds —
 * this adapts automatically as coverage grows, rather than relying on
 * fixed count thresholds tuned for today's data volume.
 */
export async function computeCountryRiskFromEvents(): Promise<Record<string, CountryRisk>> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await supabase
      .from("conflict_events")
      .select("country")
      .gte("event_date", since);

    if (error || !data) {
      console.error("Failed to compute country risk:", error?.message);
      return {};
    }

    const counts = new Map<string, number>();
    for (const row of data as { country: string }[]) {
      counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
    }

    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) return {};

    const tierForRank = (rank: number, total: number): RiskTier => {
      const fraction = (rank + 1) / total;
      if (fraction <= 1 / 3) return "critical";
      if (fraction <= 2 / 3) return "danger";
      return "watch";
    };

    const result: Record<string, CountryRisk> = {};
    ranked.forEach(([country, count], rank) => {
      const isoCodes = COUNTRY_TO_ISO3[country];
      if (!isoCodes) return;
      const tier = tierForRank(rank, ranked.length);
      const label = `${count} événement${count > 1 ? "s" : ""} recensé${count > 1 ? "s" : ""} — 90 derniers jours`;
      for (const iso of isoCodes) {
        result[iso] = { tier, label };
      }
    });

    return result;
  } catch (err) {
    console.error("Failed to reach Supabase for country risk:", err);
    return {};
  }
}
