// Supervision V1, Lot 1 : crédit de création / refonte majeure sur FENÊTRE GLISSANTE (30 × 24 h), calculé depuis chaque opération
// valide et non au premier jour du mois. Version pure et testée de la règle que la base applique de façon atomique
// (fonction SQL sv_activate / sv_apply_scope_change). Sert aussi à afficher la « date de prochaine admissibilité ».

export interface CreditOperation {
  /** Date à laquelle l'opération compte : sa validation ; à défaut (opération en attente), sa création. */
  countedAt: Date;
  status: "pending" | "committed" | "cancelled";
  consumesCredit: boolean;
}

const DAY_MS = 86_400_000;

export interface CreditStatus {
  /** Crédits consommés dans la fenêtre (les opérations en attente comptent : sinon deux demandes simultanées contourneraient le quota). */
  used: number;
  /** Plafond ; null = illimité. */
  limit: number | null;
  /** Reste-t-il au moins un crédit ? */
  available: boolean;
  /** Quand la prochaine création / refonte sera possible (null : possible maintenant, ou illimité). */
  nextEligibleAt: Date | null;
}

/** Opérations qui comptent à l'instant `now` : consomment un crédit, ne sont pas annulées, et sont dans la fenêtre glissante. */
export function countedOperations(operations: readonly CreditOperation[], now: Date, windowDays: number): CreditOperation[] {
  const from = now.getTime() - windowDays * DAY_MS;
  return operations.filter((op) => op.consumesCredit && op.status !== "cancelled" && op.countedAt.getTime() > from).sort((a, b) => a.countedAt.getTime() - b.countedAt.getTime());
}

export function creditStatus(operations: readonly CreditOperation[], limit: number | null, now: Date, windowDays: number): CreditStatus {
  const counted = countedOperations(operations, now, windowDays);
  const used = counted.length;
  if (limit === null) return { used, limit, available: true, nextEligibleAt: null };
  if (used < limit) return { used, limit, available: true, nextEligibleAt: null };
  // Plafond atteint : il se libère quand l'opération qui le fait dépasser sort de la fenêtre (la (used − limit + 1)-ième plus ancienne).
  const releasing = counted[used - limit];
  return { used, limit, available: false, nextEligibleAt: new Date(releasing.countedAt.getTime() + windowDays * DAY_MS) };
}
