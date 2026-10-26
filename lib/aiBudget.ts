// Maîtrise des dépenses de l'API Anthropic : estimation du coût, mode du mois (rythme de la dépense),
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

// Tarifs publics par famille de modèles (dollars par million de jetons, relevés le
// 17/10/2026 sur la documentation d'Anthropic). Chaque appel est estimé au tarif du
// modèle réellement utilisé : Opus coûte 4 fois Haiku 4.5, Haiku 5.5 dix fois moins.
const MODEL_PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /opus/i, input: 4, output: 20 },
  { match: /sonnet/i, input: 2, output: 10 },
  { match: /haiku-5/i, input: 0.1, output: 0.5 },
  { match: /haiku-4/i, input: 1, output: 5 },
  { match: /fable|mythos/i, input: 10, output: 50 },
];

/** Tarif d'un modèle ; les variables AI_PRICE_* restent prioritaires si elles sont définies. */
export function pricingFromEnv(env: Record<string, string | undefined> = process.env, model?: string | null): Pricing {
  const known = model ? MODEL_PRICES.find((p) => p.match.test(model)) : undefined;
  return {
    inputPerMillionTokens: numberFrom(env.AI_PRICE_INPUT_PER_MTOK, known?.input ?? DEFAULT_PRICING.inputPerMillionTokens),
    outputPerMillionTokens: numberFrom(env.AI_PRICE_OUTPUT_PER_MTOK, known?.output ?? DEFAULT_PRICING.outputPerMillionTokens),
    webSearchPerThousand: numberFrom(env.AI_PRICE_WEB_SEARCH_PER_1000, DEFAULT_PRICING.webSearchPerThousand),
  };
}

/**
 * Jetons d'entrée estimés d'un texte français (environ 3,5 caractères par jeton). Sert quand l'API n'a pas
 * répondu (appel coupé par le délai) : l'entrée a été envoyée, donc facturée, mais aucun décompte n'est revenu.
 */
export function estimateInputTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 3.5));
}

export function estimateCostUsd(usage: AiUsage, pricing: Pricing = DEFAULT_PRICING): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillionTokens +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillionTokens +
    (usage.webSearches / 1000) * pricing.webSearchPerThousand
  );
}

// --- Mode du mois : on regarde le RYTHME de la dépense, pas un chiffre atteint -----------
//
// Décision de Nicolas (22/10/2026) : 40 € par mois hors taxes pour Équinoxe (48 € avec la TVA), en plus
// de l'abonnement Claude Pro. Atteindre 25 € le 23 du mois est normal ; en dépenser 10 en quatre jours ne
// l'est pas. On projette donc la dépense de fin de mois d'après le rythme des sept derniers jours, et on
// restreint seulement si cette projection dépasse le budget. Priorités : 1) les articles, 2) les points de
// situation, 3) les synthèses de zone.

export type AiJob = "sync-briefs" | "zone-synthesis" | "situation-report";

/** Budget mensuel en dollars de crédits (40 € hors taxes ≈ 46 $ au taux de référence). Réglable : AI_BUDGET_MONTHLY_USD. */
export const DEFAULT_MONTHLY_BUDGET_USD = 46;

export function monthlyBudgetFromEnv(env: Record<string, string | undefined> = process.env): number {
  const value = numberFrom(env.AI_BUDGET_MONTHLY_USD, DEFAULT_MONTHLY_BUDGET_USD);
  return value > 0 ? value : DEFAULT_MONTHLY_BUDGET_USD;
}

export type BudgetMode = "normal" | "tight" | "critical" | "exhausted";

export const MODE_LABELS: Record<BudgetMode, string> = {
  normal: "normal",
  tight: "tendu",
  critical: "critique",
  exhausted: "épuisé",
};

/** Dépense de fin de mois attendue : déjà dépensé + rythme des sept derniers jours × jours restants. */
export function projectMonthUsd(input: { spentUsd: number; recentUsd: number; dayOfMonth: number; daysInMonth: number }): number {
  const window = Math.max(1, Math.min(7, input.dayOfMonth));
  const pace = input.recentUsd / window;
  return input.spentUsd + pace * Math.max(0, input.daysInMonth - input.dayOfMonth);
}

/** Tendu : la projection dépasse le budget. Critique : elle le dépasse de plus de 40 %. */
export const TIGHT_RATIO = 1;
export const CRITICAL_RATIO = 1.4;
/** Dernier recours : au-delà de cette part du budget réellement dépensée, seul le minimum d'articles continue. */
export const EXHAUSTED_SHARE = 0.95;
/** Avant ce jour du mois, trop peu de données pour juger : mode normal (sauf budget épuisé). */
export const MIN_DAYS_TO_JUDGE = 3;

export function budgetMode(input: { spentUsd: number; projectedUsd: number; dayOfMonth: number; budgetUsd: number }): BudgetMode {
  if (input.spentUsd >= input.budgetUsd * EXHAUSTED_SHARE) return "exhausted";
  if (input.dayOfMonth < MIN_DAYS_TO_JUDGE) return "normal";
  const ratio = input.projectedUsd / input.budgetUsd;
  if (ratio > CRITICAL_RATIO) return "critical";
  if (ratio > TIGHT_RATIO) return "tight";
  return "normal";
}

export type ImportanceFloor = "low" | "medium" | "high";

const IMPORTANCE_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

/** Une synthèse d'importance `importance` passe-t-elle le seuil ? (importance inconnue = moyenne) */
export function meetsImportance(importance: string | null | undefined, floor: ImportanceFloor): boolean {
  return (IMPORTANCE_RANK[importance ?? "medium"] ?? 1) >= IMPORTANCE_RANK[floor];
}

export interface ModePolicy {
  mode: BudgetMode;
  articles: {
    /** Nombre d'articles en attente à partir duquel une zone est rédigée (un événement grave suffit toujours). */
    minNew: number;
    /** Ancienneté (heures) au-delà de laquelle un article isolé déclenche quand même la rédaction. */
    maxAgeHours: number;
    /** Lots de 5 articles au plus par zone et par passage. */
    maxBatches: number;
    /** Importance minimale des nouvelles synthèses publiées. */
    minImportance: ImportanceFloor;
  };
  /** Jours (0 = dimanche) où un point de situation peut partir ; null = aucune restriction. */
  psitWeekdays: number[] | null;
  /** Synthèses de zone : intervalle minimal entre deux passages qui ont appelé le modèle ; 0 = aucun. */
  synthesisIntervalDays: number;
  synthesisEnabled: boolean;
}

export const MODE_POLICIES: Record<BudgetMode, ModePolicy> = {
  normal: {
    mode: "normal",
    articles: { minNew: 3, maxAgeHours: 36, maxBatches: 3, minImportance: "low" },
    psitWeekdays: null,
    synthesisIntervalDays: 0,
    synthesisEnabled: true,
  },
  tight: {
    mode: "tight",
    articles: { minNew: 4, maxAgeHours: 48, maxBatches: 2, minImportance: "medium" },
    psitWeekdays: null,
    synthesisIntervalDays: 3,
    synthesisEnabled: true,
  },
  critical: {
    mode: "critical",
    articles: { minNew: 5, maxAgeHours: 72, maxBatches: 1, minImportance: "high" },
    psitWeekdays: [1],
    synthesisIntervalDays: 3,
    synthesisEnabled: true,
  },
  exhausted: {
    mode: "exhausted",
    articles: { minNew: 99, maxAgeHours: 24 * 365, maxBatches: 1, minImportance: "high" },
    psitWeekdays: [],
    synthesisIntervalDays: 0,
    synthesisEnabled: false,
  },
};

export interface JobDecision {
  allowed: boolean;
  reason: string;
}

/** Tolérance sur « tous les 3 jours » : le cron de Vercel part à ±59 min près. */
const INTERVAL_TOLERANCE_HOURS = 2;

/** Un traitement peut-il tourner dans ce mode ? `lastSynthesisAt` : dernier passage de synthèse de zone qui a appelé le modèle. */
export function decideJob(job: AiJob, policy: ModePolicy, now: Date, lastSynthesisAt: Date | null = null): JobDecision {
  if (job === "sync-briefs") return { allowed: true, reason: "les articles sont la priorité : ils tournent dans tous les modes (seuils relevés si le budget l'exige)" };
  if (job === "situation-report") {
    if (policy.psitWeekdays === null) return { allowed: true, reason: "point de situation autorisé" };
    if (policy.psitWeekdays.includes(now.getUTCDay())) return { allowed: true, reason: "jour de point de situation de ce mode" };
    return {
      allowed: false,
      reason:
        policy.psitWeekdays.length === 0
          ? "budget épuisé : plus de point de situation ce mois-ci (lancement manuel « force » possible)"
          : "mode critique : un seul point de situation par semaine, le lundi (lancement manuel « force » possible)",
    };
  }
  if (!policy.synthesisEnabled) return { allowed: false, reason: "budget épuisé : synthèses de zone suspendues (lancement manuel « force » possible)" };
  if (policy.synthesisIntervalDays > 0 && lastSynthesisAt) {
    const hours = (now.getTime() - lastSynthesisAt.getTime()) / 3_600_000;
    if (hours < policy.synthesisIntervalDays * 24 - INTERVAL_TOLERANCE_HOURS) {
      return {
        allowed: false,
        reason: `mode ${MODE_LABELS[policy.mode]} : une mise à jour des synthèses tous les ${policy.synthesisIntervalDays} jours (dernière il y a ${Math.round(hours)} h)`,
      };
    }
  }
  return { allowed: true, reason: "synthèse de zone autorisée" };
}

/** Règles de génération des articles, relevées selon le mode (jamais abaissées sous les réglages d'environnement). */
export function rulesForMode(rules: GenerationRules, policy: ModePolicy): GenerationRules {
  return {
    minNew: Math.max(rules.minNew, policy.articles.minNew),
    maxAgeHours: Math.max(rules.maxAgeHours, policy.articles.maxAgeHours),
  };
}

// --- Rotation des synthèses de zone ------------------------------------------------

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
