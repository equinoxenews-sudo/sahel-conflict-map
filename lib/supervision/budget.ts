import { estimateInputTokens, pricingFromEnv } from "../aiBudget";
import type { Tier } from "../accounts";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { aiCapEur } from "./model";

// Plafond de coût IA par compte : 10 % du prix mensuel affiché de l'offre, pour TOUS les usages IA individuels du
// compte (pas seulement la Supervision). Règle : on ne lance jamais un appel dont le coût maximal raisonnablement
// estimé pourrait dépasser le plafond. Avant l'appel, une ligne « réservée » (coût maximal) est écrite dans ai_usage ;
// après l'appel elle est remplacée par le coût réel. À plafond atteint, la lecture des résultats reste possible : seules
// les nouvelles générations IA attendent le mois suivant. Supprimer une veille ne remet jamais le budget à zéro.

/** Euros → dollars (les appels sont facturés en dollars). 40 € ≈ 46 $ dans le budget du site : 1,15 par défaut. */
export const DEFAULT_USD_PER_EUR = 1.15;
/** Marge de sécurité : on s'arrête à 95 % du plafond pour absorber arrondis, change et facturation. */
export const SAFETY_SHARE = 0.95;

export function usdPerEur(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.AI_USD_PER_EUR);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_USD_PER_EUR;
}

/** Plafond mensuel utilisable, en dollars (null : aucun plafond automatique, fondateur ou contrat Enterprise). */
export function monthlyCapUsd(tier: Tier, rate: number = usdPerEur()): number | null {
  const eur = aiCapEur(tier);
  return eur === null ? null : Math.round(eur * rate * SAFETY_SHARE * 100_000) / 100_000;
}

/** Coût maximal d'un appel : entrée estimée sur la longueur du texte, sortie au maximum autorisé. */
export function maxCallCostUsd(model: string, promptChars: number, maxOutputTokens: number, env: Record<string, string | undefined> = process.env): number {
  const pricing = pricingFromEnv(env, model);
  return (estimateInputTokens(promptChars) / 1_000_000) * pricing.inputPerMillionTokens + (maxOutputTokens / 1_000_000) * pricing.outputPerMillionTokens;
}

export type SpendDecision = { allowed: true } | { allowed: false; reason: string };

/** Peut-on lancer cet appel ? `spentUsd` inclut déjà les réservations en cours. */
export function decideSpend(input: { capUsd: number | null; spentUsd: number; estimateUsd: number }): SpendDecision {
  if (input.capUsd === null) return { allowed: true };
  if (input.spentUsd + input.estimateUsd <= input.capUsd) return { allowed: true };
  const left = Math.max(0, input.capUsd - input.spentUsd);
  return { allowed: false, reason: `Budget IA du mois atteint (il reste ${left.toFixed(3)} $ sur ${input.capUsd.toFixed(3)} $) : la prochaine génération attend le renouvellement.` };
}

/** Début du mois courant (UTC) : la période de facturation du budget. */
export function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function monthlySpendUsd(ownerId: string, now: Date = new Date()): Promise<number> {
  const { data, error } = await getSupabaseAdmin().from("ai_usage").select("cost_usd").eq("owner_id", ownerId).gte("created_at", monthStart(now)).limit(5000);
  if (error) throw new Error(`Suivi du budget IA indisponible : ${error.message}`);
  return ((data ?? []) as { cost_usd: number | string }[]).reduce((sum, row) => sum + Number(row.cost_usd || 0), 0);
}

export interface Reservation {
  id: number;
  estimateUsd: number;
}

/**
 * Réserve le budget d'un appel : refuse (null + raison) si le coût maximal dépasserait le plafond du mois. Sans suivi
 * lisible, on refuse aussi : mieux vaut attendre que dépasser sans le savoir.
 */
export async function reserveBudget(input: {
  ownerId: string;
  tier: Tier;
  supervisionId: string | null;
  job: "supervision-daily" | "supervision-weekly" | "supervision-geo";
  model: string;
  estimateUsd: number;
  now?: Date;
}): Promise<{ reservation: Reservation } | { refused: string }> {
  const now = input.now ?? new Date();
  const cap = monthlyCapUsd(input.tier);
  if (cap !== null) {
    let spent: number;
    try {
      spent = await monthlySpendUsd(input.ownerId, now);
    } catch (error) {
      return { refused: error instanceof Error ? error.message : "Suivi du budget IA indisponible." };
    }
    const decision = decideSpend({ capUsd: cap, spentUsd: spent, estimateUsd: input.estimateUsd });
    if (!decision.allowed) return { refused: decision.reason };
  }
  const { data, error } = await getSupabaseAdmin()
    .from("ai_usage")
    .insert({
      job: input.job,
      model: input.model,
      owner_id: input.ownerId,
      supervision_id: input.supervisionId,
      cost_usd: Number(input.estimateUsd.toFixed(5)),
      status: "reserved",
      note: "réservation avant appel",
    })
    .select("id")
    .single();
  if (error || !data) return { refused: `Réservation du budget impossible : ${error?.message ?? "inconnue"}` };
  return { reservation: { id: (data as { id: number }).id, estimateUsd: input.estimateUsd } };
}

/** Remplace la réservation par le coût réel de l'appel. Ne lève jamais : le journal ne doit pas bloquer le travail. */
export async function settleBudget(reservation: Reservation, outcome: { costUsd: number; inputTokens: number; outputTokens: number; ok: boolean; note?: string }): Promise<void> {
  try {
    await getSupabaseAdmin()
      .from("ai_usage")
      .update({
        cost_usd: Number(outcome.costUsd.toFixed(5)),
        input_tokens: outcome.inputTokens,
        output_tokens: outcome.outputTokens,
        ok: outcome.ok,
        status: "done",
        note: outcome.note?.slice(0, 300) ?? null,
      })
      .eq("id", reservation.id);
  } catch (error) {
    console.warn("Règlement du budget IA impossible :", error instanceof Error ? error.message : error);
  }
}
