// Suivi des appels à l'API Anthropic dans la table ai_usage (supabase/add-ai-usage.sql)
// et contrôle du budget mensuel. Serveur uniquement (clé de service).
//
// Honnêteté sur les limites : le coût est une ESTIMATION d'après les jetons et les
// recherches web renvoyés par l'API et les tarifs publics (lib/aiBudget.ts). La
// Console Anthropic reste la référence. Le budget n'est imposé que pour les appels
// passant par ces fonctions : une clé utilisée ailleurs n'est pas vue. Si la table
// est absente ou illisible, les traitements continuent (le site ne s'arrête pas pour
// un défaut de suivi) mais un avertissement l'indique clairement.
import {
  budgetLevel,
  estimateCostUsd,
  jobAllowed,
  limitsFromEnv,
  pricingFromEnv,
  type AiJob,
  type AiUsage,
  type BudgetLevel,
} from "./aiBudget";
import { getSupabaseAdmin } from "./supabaseAdmin";

interface RecordInput {
  job: AiJob;
  zoneSlug?: string | null;
  model?: string | null;
  usage: AiUsage;
  ok?: boolean;
  note?: string;
}

/** Enregistre un appel. Ne lève jamais : un défaut de journal ne doit pas bloquer une synthèse. */
export async function recordUsage(input: RecordInput): Promise<void> {
  try {
    const cost = estimateCostUsd(input.usage, pricingFromEnv());
    const { error } = await getSupabaseAdmin().from("ai_usage").insert({
      job: input.job,
      zone_slug: input.zoneSlug ?? null,
      model: input.model ?? null,
      input_tokens: input.usage.inputTokens,
      output_tokens: input.usage.outputTokens,
      web_searches: input.usage.webSearches,
      cost_usd: Number(cost.toFixed(5)),
      ok: input.ok ?? true,
      note: input.note?.slice(0, 300) ?? null,
    });
    if (error) console.warn(`Journal des appels IA indisponible : ${error.message}`);
  } catch (err) {
    console.warn("Journal des appels IA indisponible :", err instanceof Error ? err.message : err);
  }
}

export interface MonthSpend {
  /** false : table absente ou illisible, les chiffres ne sont pas fiables. */
  known: boolean;
  spentUsd: number;
  webSearches: number;
  calls: number;
}

function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getMonthSpend(now = new Date()): Promise<MonthSpend> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("ai_usage")
      .select("cost_usd, web_searches")
      .gte("created_at", monthStartIso(now))
      .limit(20000);
    if (error) return { known: false, spentUsd: 0, webSearches: 0, calls: 0 };
    const rows = (data ?? []) as { cost_usd: number | string; web_searches: number }[];
    return {
      known: true,
      spentUsd: rows.reduce((sum, row) => sum + Number(row.cost_usd), 0),
      webSearches: rows.reduce((sum, row) => sum + row.web_searches, 0),
      calls: rows.length,
    };
  } catch {
    return { known: false, spentUsd: 0, webSearches: 0, calls: 0 };
  }
}

export interface BudgetCheck {
  allowed: boolean;
  level: BudgetLevel;
  spend: MonthSpend;
  message: string;
}

/** À appeler avant un traitement IA : dit s'il peut tourner et pourquoi. */
export async function checkBudget(job: AiJob): Promise<BudgetCheck> {
  const spend = await getMonthSpend();
  const limits = limitsFromEnv();
  if (!spend.known) {
    return {
      allowed: true,
      level: "ok",
      spend,
      message:
        "Budget IA non vérifiable (table ai_usage absente : exécuter supabase/add-ai-usage.sql). Le traitement continue, sans plafond imposé.",
    };
  }
  const level = budgetLevel(spend.spentUsd, limits);
  const allowed = jobAllowed(job, level);
  const spent = `${spend.spentUsd.toFixed(2)} $ estimés ce mois-ci (avertissement ${limits.warn} $, suspension ${limits.stop} $)`;
  const message =
    level === "ok"
      ? spent
      : level === "warn"
        ? `Seuil d'avertissement atteint : ${spent}.`
        : allowed
          ? `Budget dépassé : ${spent}. Traitements non essentiels suspendus, celui-ci est maintenu.`
          : `Budget dépassé : ${spent}. Traitement ${job} suspendu jusqu'au mois prochain ou jusqu'à relèvement du plafond.`;
  return { allowed, level, spend, message };
}
