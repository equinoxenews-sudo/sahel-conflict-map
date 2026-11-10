import type { Tier } from "../../accounts";
import type { SupervisionPolicy } from "./policy";

// Supervision V1, Lot 1 : plafond de coût IA par abonnement. Version pure et testée de la décision que la base prend de façon
// ATOMIQUE (fonction SQL sv_reserve_ai_budget : verrou par compte, réservation avant l'appel, règlement après). Constat de l'audit
// du Lot 0 : l'ancien mécanisme lisait la dépense puis écrivait, ce qui laissait deux traitements simultanés dépasser ensemble le
// plafond. Ici la réservation et la vérification se font dans la même transaction.
//
// Règles du cahier : budget partagé par abonnement avec réserve de service (les tâches essentielles gardent une part que
// l'assistant et les analyses exceptionnelles ne peuvent pas consommer) ; à l'épuisement on suspend les NOUVEAUX enrichissements,
// jamais l'accès aux archives.

const round5 = (value: number) => Math.round(value * 100_000) / 100_000;

/**
 * Plafond mensuel en dollars du COMPTE (null : pas de plafond automatique, fondateur ou contrat Enterprise). C'est la barre unique :
 * budget en euros de l'offre, converti en dollars, moins la marge de sécurité de facturation.
 */
export function monthlyCapUsd(policy: SupervisionPolicy, tier: Tier): number | null {
  const euros = policy.tiers[tier].aiBudgetEurPerMonth;
  if (euros === null) return null;
  const { usdPerEur, safetyShare } = policy.ai;
  return round5(euros * usdPerEur * safetyShare);
}

/**
 * Allocation STANDARD d'une place de Supervision (dollars par mois) : le plafond, moins la marge commune, réparti à parts égales entre
 * les places de l'offre. Le fonctionnement par défaut de l'IA est calibré pour tenir dans cette part : ouvrir une 2e ou une 3e
 * Supervision en cours de mois ne dégrade donc pas la première. null : pas de plafond.
 */
export function slotAllocationUsd(policy: SupervisionPolicy, tier: Tier): number | null {
  const cap = monthlyCapUsd(policy, tier);
  if (cap === null) return null;
  const slots = policy.tiers[tier].activeLimit;
  return slots > 0 ? round5((cap * (1 - policy.ai.sharedMarginShare)) / slots) : 0;
}

/** Marge COMMUNE aux places (dollars par mois) : pics d'assistant, rapports exceptionnels, nouveaux cadrages. */
export function sharedMarginUsd(policy: SupervisionPolicy, tier: Tier): number | null {
  const cap = monthlyCapUsd(policy, tier);
  return cap === null ? null : round5(cap * policy.ai.sharedMarginShare);
}

// --- Contrôle de marge ----------------------------------------------------------------------------------------------------
/** TVA française et frais de paiement : estimations pour juger la marge, pas des valeurs de facturation. */
export const VAT_RATE = 0.2;
export const PAYMENT_FEE_SHARE = 0.03;

/** Recette nette estimée d'un abonnement mensuel TTC (après TVA et frais de paiement), en euros. */
export function netRevenueEur(priceEurTtc: number): number {
  return (priceEurTtc / (1 + VAT_RATE)) * (1 - PAYMENT_FEE_SHARE);
}

/** Part de la recette nette que le budget IA représenterait s'il était consommé EN ENTIER (pire cas). null : pas de prix ou pas de plafond. */
export function worstCaseAiShareOfNet(policy: SupervisionPolicy, tier: Tier): number | null {
  const { monthlyPriceEur, aiBudgetEurPerMonth } = policy.tiers[tier];
  if (monthlyPriceEur === null || aiBudgetEurPerMonth === null || monthlyPriceEur <= 0) return null;
  return aiBudgetEurPerMonth / netRevenueEur(monthlyPriceEur);
}

/** Part du plafond réservée aux tâches essentielles (dollars). */
export function serviceReserveUsd(policy: SupervisionPolicy, capUsd: number | null): number {
  return capUsd === null ? 0 : Math.round(capUsd * policy.ai.serviceReserveShare * 100_000) / 100_000;
}

export type ReservationDecision = { allowed: true; remainingUsd: number | null } | { allowed: false; remainingUsd: number; effectiveCapUsd: number };

/**
 * Peut-on réserver `estimateUsd` ? `spentUsd` inclut déjà les réservations en cours (non expirées) et le coût réel des appels
 * réglés. Une tâche non essentielle n'a droit qu'au plafond moins la réserve de service.
 */
export function decideReservation(input: { capUsd: number | null; serviceReserveUsd: number; essential: boolean; spentUsd: number; estimateUsd: number }): ReservationDecision {
  if (input.capUsd === null) return { allowed: true, remainingUsd: null };
  const effectiveCap = input.essential ? input.capUsd : Math.max(0, input.capUsd - input.serviceReserveUsd);
  const after = input.spentUsd + input.estimateUsd;
  if (after > effectiveCap + 1e-9) return { allowed: false, remainingUsd: Math.max(0, effectiveCap - input.spentUsd), effectiveCapUsd: effectiveCap };
  return { allowed: true, remainingUsd: effectiveCap - after };
}

/** Début du mois courant (UTC) : la période de facturation du budget. */
export function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
