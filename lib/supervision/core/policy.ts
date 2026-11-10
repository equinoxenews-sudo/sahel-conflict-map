import type { Tier } from "../../accounts";

// Supervision V1, Lot 1 : règles métier, CONFIGURABLES CÔTÉ SERVEUR (décision D7 du 09/11/2026 : les seuils doivent pouvoir être
// ajustés après les mesures réelles du Lot 4, sans toucher au code). Module pur, sans réseau ni base.
//
// Valeurs par défaut = règles validées par Nicolas. Ajustement : variable d'environnement SUPERVISION_POLICY_JSON (JSON partiel,
// fusionné sur les valeurs par défaut, validé ; une valeur invalide est refusée et les valeurs par défaut restent en vigueur).

export interface TierPolicy {
  /** L'offre ouvre-t-elle la Supervision ? (« Plus » : non.) */
  supervisionAccess: boolean;
  /** Supervisions actives en même temps (initialisation comprise). */
  activeLimit: number;
  /** Supervisions en pause conservées. */
  pausedLimit: number;
  /** Créations / refontes majeures par période glissante ; null = pas de plafond (fondateur, Enterprise sur devis). */
  majorCreditsPerWindow: number | null;
  /** Prix mensuel TTC (euros), sert aux contrôles de marge ; null = sur devis ou sans prix. */
  monthlyPriceEur: number | null;
  /**
   * Budget IA MENSUEL du compte, en euros : une barre unique pour tout le compte (décision du 10/11/2026). null = pas de plafond
   * automatique (fondateur, Enterprise sur devis) ; 0 = aucune IA. Il se répartit entre les places de Supervision (voir budget.ts).
   */
  aiBudgetEurPerMonth: number | null;
}

export interface MajorChangeRules {
  /** Hausse estimée du volume de collecte, comparée cumulativement au périmètre de référence, au-delà de laquelle le changement est majeur (0,30 = « plus de 30 % »). */
  volumeIncreaseThreshold: number;
  /** Idem pour le coût mensuel de traitement IA. */
  costIncreaseThreshold: number;
  /** Un élargissement dont l'impact ne peut pas être estimé de façon fiable est traité comme majeur (sinon un gros élargissement contournerait le quota). */
  unreliableExpansionIsMajor: boolean;
}

export interface SupervisionPolicy {
  tiers: Record<Tier, TierPolicy>;
  /** Fenêtre glissante des crédits de création / refonte, en jours (30 × 24 h). */
  creditWindowDays: number;
  /** Une activation jamais confirmée libère son crédit au bout de ce délai (plantage pendant l'initialisation). */
  pendingTtlMinutes: number;
  /** Brouillons simultanés par compte (un brouillon ne consomme aucun crédit : on borne leur accumulation). */
  maxDraftsPerOwner: number;
  majorChange: MajorChangeRules;
  ai: {
    /**
     * Part du budget mensuel mise en COMMUN pour les pics (beaucoup de questions à l'assistant, rapport exceptionnel, nouveau cadrage).
     * Le reste est réparti à parts égales entre les places de Supervision : ouvrir une 2e ou une 3e Supervision en cours de mois ne
     * dégrade donc pas la première (décision du 10/11/2026).
     */
    sharedMarginShare: number;
    /** Dollars par euro (les appels sont facturés en dollars). */
    usdPerEur: number;
    /** On s'arrête à cette part du plafond pour absorber arrondis et écarts de facturation. */
    safetyShare: number;
    /** Part du plafond réservée aux tâches essentielles (synthèses programmées) : l'assistant et les analyses exceptionnelles n'y touchent pas. */
    serviceReserveShare: number;
  };
  /** Durée de lecture seule après résiliation ou rétrogradation (jours). */
  readOnlyGraceDays: number;
}

/**
 * Règles validées le 09/11/2026. Le 10/11/2026 : budget IA fixé à 4 € (Intelligence) et 12 € (Pro) par mois, soit 3 € par place plus une
 * marge commune, et prix ajustés en conséquence (24,99 € et 69,99 € TTC). Les valeurs marquées « provisoire » restent à confirmer
 * après mesures du coût réel (phase enveloppe IA).
 */
export const DEFAULT_POLICY: SupervisionPolicy = {
  tiers: {
    owner: { supervisionAccess: true, activeLimit: 3, pausedLimit: 10, majorCreditsPerWindow: null, monthlyPriceEur: null, aiBudgetEurPerMonth: null },
    plus: { supervisionAccess: false, activeLimit: 0, pausedLimit: 0, majorCreditsPerWindow: 0, monthlyPriceEur: 7.99, aiBudgetEurPerMonth: 0 },
    intelligence: { supervisionAccess: true, activeLimit: 1, pausedLimit: 3, majorCreditsPerWindow: 1, monthlyPriceEur: 24.99, aiBudgetEurPerMonth: 4 },
    pro: { supervisionAccess: true, activeLimit: 3, pausedLimit: 10, majorCreditsPerWindow: 3, monthlyPriceEur: 69.99, aiBudgetEurPerMonth: 12 },
    // Enterprise : sur devis, modalités à définir. Valeurs provisoires, surchargées compte par compte via les droits (sv_entitlements).
    enterprise: { supervisionAccess: true, activeLimit: 10, pausedLimit: 30, majorCreditsPerWindow: null, monthlyPriceEur: null, aiBudgetEurPerMonth: null },
  },
  creditWindowDays: 30,
  pendingTtlMinutes: 30,
  maxDraftsPerOwner: 3,
  majorChange: { volumeIncreaseThreshold: 0.3, costIncreaseThreshold: 0.3, unreliableExpansionIsMajor: true },
  // serviceReserveShare et sharedMarginShare : provisoires (à confirmer après mesures).
  ai: { sharedMarginShare: 0.25, usdPerEur: 1.15, safetyShare: 0.95, serviceReserveShare: 0.2 },
  readOnlyGraceDays: 90,
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type PolicyResult = { ok: true; policy: SupervisionPolicy } | { ok: false; errors: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, override: unknown, path: string, errors: string[]): T {
  if (override === undefined) return base;
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) {
      errors.push(`${path} : objet attendu.`);
      return base;
    }
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(override)) {
      if (!(key in out)) {
        errors.push(`${path ? path + "." : ""}${key} : réglage inconnu.`);
        continue;
      }
      out[key] = merge(out[key], override[key], `${path ? path + "." : ""}${key}`, errors);
    }
    return out as T;
  }
  // Valeur simple : même type que la valeur par défaut (null accepté seulement là où le défaut peut l'être).
  if (base === null || typeof base === "number") {
    if (override === null) {
      // « null » (sans plafond) n'est permis que là où il a un sens ; ailleurs c'est une erreur, jamais ignorée en silence.
      if (base === null || path.endsWith("majorCreditsPerWindow") || path.endsWith("monthlyPriceEur") || path.endsWith("aiBudgetEurPerMonth")) return null as T;
      errors.push(`${path} : nombre positif ou nul attendu (null n'est pas permis ici).`);
      return base;
    }
    if (typeof override !== "number" || !Number.isFinite(override) || override < 0) {
      errors.push(`${path} : nombre positif ou nul attendu.`);
      return base;
    }
    return override as T;
  }
  if (typeof base === "boolean") {
    if (typeof override !== "boolean") {
      errors.push(`${path} : vrai ou faux attendu.`);
      return base;
    }
    return override as T;
  }
  return base;
}

/** Valide un jeu de réglages partiel et le fusionne sur les valeurs par défaut. */
export function applyPolicyOverride(override: DeepPartial<SupervisionPolicy> | unknown, base: SupervisionPolicy = DEFAULT_POLICY): PolicyResult {
  const errors: string[] = [];
  const merged = merge(base, override, "", errors);
  // Cohérences que les types seuls ne garantissent pas.
  const { majorChange, ai, creditWindowDays, pendingTtlMinutes } = merged;
  if (majorChange.volumeIncreaseThreshold <= 0 || majorChange.volumeIncreaseThreshold > 10) errors.push("majorChange.volumeIncreaseThreshold : entre 0 (exclu) et 10.");
  if (majorChange.costIncreaseThreshold <= 0 || majorChange.costIncreaseThreshold > 10) errors.push("majorChange.costIncreaseThreshold : entre 0 (exclu) et 10.");
  if (ai.safetyShare <= 0 || ai.safetyShare > 1) errors.push("ai.safetyShare : entre 0 (exclu) et 1.");
  if (ai.serviceReserveShare < 0 || ai.serviceReserveShare >= 1) errors.push("ai.serviceReserveShare : entre 0 et 1 (exclu).");
  if (ai.sharedMarginShare < 0 || ai.sharedMarginShare >= 1) errors.push("ai.sharedMarginShare : entre 0 et 1 (exclu).");
  if (ai.usdPerEur <= 0) errors.push("ai.usdPerEur : positif.");
  if (!Number.isInteger(creditWindowDays) || creditWindowDays < 1) errors.push("creditWindowDays : entier d'au moins 1 jour.");
  if (!Number.isInteger(pendingTtlMinutes) || pendingTtlMinutes < 1) errors.push("pendingTtlMinutes : entier d'au moins 1 minute.");
  for (const [tier, rules] of Object.entries(merged.tiers)) {
    for (const key of ["activeLimit", "pausedLimit"] as const) {
      if (!Number.isInteger(rules[key])) errors.push(`tiers.${tier}.${key} : entier attendu.`);
    }
    if (rules.majorCreditsPerWindow !== null && !Number.isInteger(rules.majorCreditsPerWindow)) errors.push(`tiers.${tier}.majorCreditsPerWindow : entier ou null.`);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, policy: merged };
}

/** Lit SUPERVISION_POLICY_JSON. Un JSON illisible ou invalide est refusé en bloc : les valeurs par défaut (validées) restent en vigueur. */
export function policyFromEnv(env: Record<string, string | undefined> = process.env): PolicyResult {
  const raw = env.SUPERVISION_POLICY_JSON?.trim();
  if (!raw) return { ok: true, policy: DEFAULT_POLICY };
  try {
    return applyPolicyOverride(JSON.parse(raw));
  } catch {
    return { ok: false, errors: ["SUPERVISION_POLICY_JSON : JSON illisible."] };
  }
}

let cached: SupervisionPolicy | null = null;

/** Politique en vigueur (mémorisée). Réglage invalide : erreur journalisée, valeurs par défaut conservées (jamais de plantage). */
export function getPolicy(env: Record<string, string | undefined> = process.env): SupervisionPolicy {
  if (cached && env === process.env) return cached;
  const result = policyFromEnv(env);
  if (!result.ok) console.error("Réglages de Supervision invalides, valeurs par défaut conservées :", result.errors.join(" "));
  const policy = result.ok ? result.policy : DEFAULT_POLICY;
  if (env === process.env) cached = policy;
  return policy;
}

/** Pour les tests : oublie la politique mémorisée. */
export function resetPolicyCache(): void {
  cached = null;
}
