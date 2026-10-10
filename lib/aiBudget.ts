// Maîtrise des dépenses de l'API Anthropic : estimation du coût, seuils d'alerte,
// rotation des synthèses de zone, politique de recherche web et décision de générer.
// Module pur (aucun accès réseau ni base) : les règles sont déterministes et testées.
// Le suivi des appels est dans lib/aiUsage.ts.

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
}

export const EMPTY_USAGE: AiUsage = { inputTokens: 0, outputTokens: 0, webSearches: 0 };

export function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    webSearches: a.webSearches + b.webSearches,
  };
}

/** Lit `usage` d'une réponse de l'API Messages (valeurs absentes = 0). */
export function usageFromResponse(data: unknown): AiUsage {
  const usage = (data as { usage?: Record<string, unknown> } | null)?.usage;
  const tools = usage?.server_tool_use as { web_search_requests?: unknown } | undefined;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  return {
    inputTokens: num(usage?.input_tokens),
    outputTokens: num(usage?.output_tokens),
    webSearches: num(tools?.web_search_requests),
  };
}

// Tarifs publics de Claude Haiku 4.5 (dollars) : estimation, la Console reste la référence.
// Modifiables sans redéploiement par variable d'environnement si les tarifs changent.
export interface Pricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  webSearchPerThousand: number;
}

export const DEFAULT_PRICING: Pricing = {
  inputPerMillionTokens: 1,
  outputPerMillionTokens: 5,
  webSearchPerThousand: 10,
};

function numberFrom(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function pricingFromEnv(env: Record<string, string | undefined> = process.env): Pricing {
  return {
    inputPerMillionTokens: numberFrom(env.AI_PRICE_INPUT_PER_MTOK, DEFAULT_PRICING.inputPerMillionTokens),
    outputPerMillionTokens: numberFrom(env.AI_PRICE_OUTPUT_PER_MTOK, DEFAULT_PRICING.outputPerMillionTokens),
    webSearchPerThousand: numberFrom(env.AI_PRICE_WEB_SEARCH_PER_1000, DEFAULT_PRICING.webSearchPerThousand),
  };
}

export function estimateCostUsd(usage: AiUsage, pricing: Pricing = DEFAULT_PRICING): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillionTokens +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillionTokens +
    (usage.webSearches / 1000) * pricing.webSearchPerThousand
  );
}

// --- Seuils de budget ---------------------------------------------------------------

export type AiJob = "sync-briefs" | "zone-synthesis" | "situation-report";

/** Traitements sans lesquels le site n'affiche plus rien de nouveau : suspendus en dernier. */
export const ESSENTIAL_JOBS: readonly AiJob[] = ["sync-briefs"];

export interface BudgetLimits {
  /** Avertissement (annotation dans les journaux). */
  warn: number;
  /** Suspension des traitements non essentiels. */
  stop: number;
  /** Arrêt de tous les traitements IA : filet contre un emballement. */
  hard: number;
}

export const DEFAULT_LIMITS: BudgetLimits = { warn: 3, stop: 5, hard: 8 };

export function limitsFromEnv(env: Record<string, string | undefined> = process.env): BudgetLimits {
  return {
    warn: numberFrom(env.AI_BUDGET_WARN_USD, DEFAULT_LIMITS.warn),
    stop: numberFrom(env.AI_BUDGET_STOP_USD, DEFAULT_LIMITS.stop),
    hard: numberFrom(env.AI_BUDGET_HARD_USD, DEFAULT_LIMITS.hard),
  };
}

export type BudgetLevel = "ok" | "warn" | "stop" | "hard";

export function budgetLevel(spentUsd: number, limits: BudgetLimits = DEFAULT_LIMITS): BudgetLevel {
  if (spentUsd >= limits.hard) return "hard";
  if (spentUsd >= limits.stop) return "stop";
  if (spentUsd >= limits.warn) return "warn";
  return "ok";
}

/** Un traitement peut-il tourner au niveau de budget atteint ? */
export function jobAllowed(job: AiJob, level: BudgetLevel): boolean {
  if (level === "hard") return false;
  if (level === "stop") return ESSENTIAL_JOBS.includes(job);
  return true;
}

// --- Rotation des synthèses de zone ------------------------------------------------

/** Une zone par jour : mardi Europe … samedi Amérique du Sud. Lundi (points de
 * situation) et dimanche : aucune synthèse de zone. `weekday` : 0 = dimanche. */
const ZONE_BY_WEEKDAY: Record<number, string> = {
  2: "europe",
  3: "moyen-orient",
  4: "afrique",
  5: "indopacifique",
  6: "amerique-du-sud",
};

export function zoneForWeekday(weekday: number): string | null {
  return ZONE_BY_WEEKDAY[weekday] ?? null;
}

// --- Recherche web --------------------------------------------------------------------

export interface WebSearchPolicy {
  /** Recherches maximum par exécution (une synthèse de zone). */
  perRun: number;
  /** Recherches maximum par mois, tous traitements confondus. 0 = désactivée. */
  monthlyCap: number;
}

export const DEFAULT_WEB_POLICY: WebSearchPolicy = { perRun: 3, monthlyCap: 0 };

export function webPolicyFromEnv(env: Record<string, string | undefined> = process.env): WebSearchPolicy {
  return {
    perRun: Math.floor(numberFrom(env.AI_WEB_SEARCHES_PER_RUN, DEFAULT_WEB_POLICY.perRun)),
    monthlyCap: Math.floor(numberFrom(env.AI_WEB_SEARCH_MONTHLY_CAP, DEFAULT_WEB_POLICY.monthlyCap)),
  };
}

export interface WebCandidateBrief {
  importance: string | null;
  veracity: string | null;
  source_domains: string[];
}

const UNSETTLED_VERACITY = new Set(["Revendiqué", "Possible", "Peu probable", "Non confirmé"]);

export interface WebDecision {
  allowed: boolean;
  maxUses: number;
  reason: string;
}

/** Autorise la recherche web seulement quand elle apporte quelque chose :
 *  - une information jugée importante dont la véracité reste à établir, ou
 *  - une information importante reposant sur une seule source.
 *  Le plafond mensuel (0 par défaut) a toujours le dernier mot. */
export function decideWebSearch(
  briefs: WebCandidateBrief[],
  usedThisMonth: number,
  policy: WebSearchPolicy = DEFAULT_WEB_POLICY,
  forced = false,
): WebDecision {
  const remaining = policy.monthlyCap - usedThisMonth;
  if (policy.monthlyCap <= 0 && !forced) {
    return { allowed: false, maxUses: 0, reason: "recherche web désactivée (plafond mensuel à 0)" };
  }
  if (!forced && remaining <= 0) {
    return { allowed: false, maxUses: 0, reason: `plafond mensuel atteint (${usedThisMonth}/${policy.monthlyCap})` };
  }
  const important = briefs.filter((b) => b.importance === "high");
  const unsettled = important.some((b) => b.veracity !== null && UNSETTLED_VERACITY.has(b.veracity));
  const thin = important.some((b) => new Set(b.source_domains).size <= 1);
  if (!forced && !unsettled && !thin) {
    return { allowed: false, maxUses: 0, reason: "rien d'important à vérifier : sources déjà suffisantes" };
  }
  const cap = forced ? policy.perRun : Math.min(policy.perRun, remaining);
  return {
    allowed: cap > 0,
    maxUses: Math.max(cap, 0),
    reason: forced ? "recherche web demandée à la main" : unsettled ? "information importante non établie" : "information importante à source unique",
  };
}

// --- Génération conditionnelle des synthèses quotidiennes ---------------------------

/** Termes d'événements graves : un seul article suffit à déclencher une synthèse. */
const MAJOR_EVENT_PATTERN =
  /attentat|coup d['’]état|massacre|offensive|bombardement|assassinat|prise d['’]otages?|cessez-le-feu|invasion|\bcoup attempt|airstrike|ceasefire|hostages?\b|assassination|terror attack/i;

export interface PendingArticle {
  title: string;
  publishedAt: string | null;
}

export interface GenerationDecision {
  generate: boolean;
  reason: string;
}

export interface GenerationRules {
  /** Nombre d'articles en attente à partir duquel une synthèse est justifiée. */
  minNew: number;
  /** Au-delà, un article en attente déclenche la synthèse même isolé (pas de famine). */
  maxAgeHours: number;
}

export const DEFAULT_GENERATION_RULES: GenerationRules = { minNew: 3, maxAgeHours: 36 };

export function generationRulesFromEnv(env: Record<string, string | undefined> = process.env): GenerationRules {
  return {
    minNew: Math.max(1, Math.floor(numberFrom(env.AI_MIN_NEW_ARTICLES, DEFAULT_GENERATION_RULES.minNew))),
    maxAgeHours: numberFrom(env.AI_MAX_PENDING_AGE_HOURS, DEFAULT_GENERATION_RULES.maxAgeHours),
  };
}

/** Décision déterministe : appeler le modèle uniquement si le lot en attente le justifie. */
export function shouldGenerateBriefs(
  pending: PendingArticle[],
  now: Date = new Date(),
  rules: GenerationRules = DEFAULT_GENERATION_RULES,
): GenerationDecision {
  if (pending.length === 0) return { generate: false, reason: "aucun article en attente" };
  if (pending.some((a) => MAJOR_EVENT_PATTERN.test(a.title))) {
    return { generate: true, reason: "événement majeur détecté dans les titres" };
  }
  if (pending.length >= rules.minNew) return { generate: true, reason: `${pending.length} articles en attente` };
  const oldest = Math.min(
    ...pending.map((a) => (a.publishedAt ? new Date(a.publishedAt).getTime() : now.getTime())),
  );
  const ageHours = (now.getTime() - oldest) / 3_600_000;
  if (ageHours >= rules.maxAgeHours) {
    return { generate: true, reason: `articles en attente depuis ${Math.round(ageHours)} h` };
  }
  return {
    generate: false,
    reason: `${pending.length} article(s) en attente, sous le seuil de ${rules.minNew} et récents : report`,
  };
}
