// Suivi des appels à l'API Anthropic dans la table ai_usage (supabase/add-ai-usage.sql)
// et contrôle du budget mensuel (mode d'après le rythme de la dépense). Serveur uniquement (clé de service).
//
// Honnêteté sur les limites : le coût est une ESTIMATION d'après les jetons et les
// recherches web renvoyés par l'API et les tarifs publics (lib/aiBudget.ts). La
// Console Anthropic reste la référence. Le budget n'est imposé que pour les appels
// passant par ces fonctions : une clé utilisée ailleurs n'est pas vue. Si la table
// est absente ou illisible, les traitements continuent (le site ne s'arrête pas pour
// un défaut de suivi) mais un avertissement l'indique clairement.
import {
  budgetMode,
  decideJob,
  estimateCostUsd,
  MODE_LABELS,
  MODE_POLICIES,
  monthlyBudgetFromEnv,
  pricingFromEnv,
  projectMonthUsd,
  type AiJob,
  type AiUsage,
  type BudgetMode,
  type ModePolicy,
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
    const cost = estimateCostUsd(input.usage, pricingFromEnv(process.env, input.model));
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
  /** Dépense des sept derniers jours (ou depuis le début du mois s'il est plus récent). */
  recentUsd: number;
  webSearches: number;
  calls: number;
}

const UNKNOWN_SPEND: MonthSpend = { known: false, spentUsd: 0, recentUsd: 0, webSearches: 0, calls: 0 };

function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getMonthSpend(now = new Date()): Promise<MonthSpend> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("ai_usage")
      .select("cost_usd, web_searches, created_at")
      .gte("created_at", monthStartIso(now))
      .limit(20000);
    if (error) return UNKNOWN_SPEND;
    const rows = (data ?? []) as { cost_usd: number | string; web_searches: number; created_at: string }[];
    const since = now.getTime() - 7 * 86_400_000;
    return {
      known: true,
      spentUsd: rows.reduce((sum, row) => sum + Number(row.cost_usd), 0),
      recentUsd: rows.filter((row) => new Date(row.created_at).getTime() >= since).reduce((sum, row) => sum + Number(row.cost_usd), 0),
      webSearches: rows.reduce((sum, row) => sum + row.web_searches, 0),
      calls: rows.length,
    };
  } catch {
    return UNKNOWN_SPEND;
  }
}

/** Date du dernier passage de ce traitement qui a réellement appelé le modèle (null si aucun ou illisible). */
async function getLastSuccessfulCall(job: AiJob): Promise<Date | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("ai_usage")
      .select("created_at")
      .eq("job", job)
      .eq("ok", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return new Date((data[0] as { created_at: string }).created_at);
  } catch {
    return null;
  }
}

export interface BudgetCheck {
  allowed: boolean;
  mode: BudgetMode;
  policy: ModePolicy;
  spend: MonthSpend;
  budgetUsd: number;
  projectedUsd: number;
  message: string;
}

/**
 * À appeler avant un traitement IA : dit s'il peut tourner et pourquoi, d'après le rythme de la dépense du mois
 * (voir « Mode du mois » dans lib/aiBudget.ts). `force` : lancement manuel voulu, rien n'est refusé.
 */
export async function checkBudget(job: AiJob, options: { force?: boolean; now?: Date } = {}): Promise<BudgetCheck> {
  const now = options.now ?? new Date();
  const budgetUsd = monthlyBudgetFromEnv();
  const spend = await getMonthSpend(now);
  if (!spend.known) {
    return {
      allowed: true,
      mode: "normal",
      policy: MODE_POLICIES.normal,
      spend,
      budgetUsd,
      projectedUsd: 0,
      message:
        "Budget IA non vérifiable (table ai_usage absente : exécuter supabase/add-ai-usage.sql). Le traitement continue, sans restriction.",
    };
  }
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const projectedUsd = projectMonthUsd({ spentUsd: spend.spentUsd, recentUsd: spend.recentUsd, dayOfMonth, daysInMonth });
  const mode = budgetMode({ spentUsd: spend.spentUsd, projectedUsd, dayOfMonth, budgetUsd });
  const policy = MODE_POLICIES[mode];
  const decision = decideJob(job, policy, now, job === "zone-synthesis" ? await getLastSuccessfulCall(job) : null);
  const allowed = decision.allowed || options.force === true;
  const summary = `mode ${MODE_LABELS[mode]} : ${spend.spentUsd.toFixed(2)} $ estimés ce mois-ci sur ${budgetUsd} $, projection ${projectedUsd.toFixed(0)} $ fin de mois`;
  const message = decision.allowed
    ? summary
    : options.force
      ? `${summary}. ${decision.reason} — passage forcé à la main.`
      : `${summary}. Traitement ${job} non lancé : ${decision.reason}.`;
  return { allowed, mode, policy, spend, budgetUsd, projectedUsd, message };
}
