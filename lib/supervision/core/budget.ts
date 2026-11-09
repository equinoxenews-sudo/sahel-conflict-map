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

/** Plafond mensuel en dollars (null : pas de plafond automatique, fondateur ou contrat Enterprise). */
export function monthlyCapUsd(policy: SupervisionPolicy, tier: Tier): number | null {
  const price = policy.tiers[tier].monthlyPriceEur;
  if (price === null) return null;
  const { costShareOfPrice, usdPerEur, safetyShare } = policy.ai;
  return Math.round(price * costShareOfPrice * usdPerEur * safetyShare * 100_000) / 100_000;
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
