// Passages quotidiens de rédaction : le matin (complet) et l'après-midi (léger). Fonctions pures, sans accès réseau,
// utilisées par la route de réveil des workflows (app/api/cron/dispatch) et par la route de rédaction (app/api/sync-briefs).

/** Plafond de lots de 5 sources par zone dans un passage de rédaction (aussi la valeur du matin). */
export const MAX_BATCHES_PER_ZONE = 3;
/** Passage de l'après-midi : un seul lot par zone, pour borner le coût (le reste est repris le lendemain matin). */
export const AFTERNOON_BATCHES = 1;

export interface DispatchPlan {
  /** Fichier du workflow GitHub à lancer. */
  workflow: string;
  /** Paramètres du lancement (workflow_dispatch). */
  inputs?: Record<string, string>;
}

/**
 * Noms acceptés par la route de réveil. Le passage de l'après-midi a son propre nom (pas de paramètre dans
 * l'adresse, pour que vercel.json reste simple) et relance le même workflow avec passe = apres-midi.
 */
const PLANS: Record<string, DispatchPlan> = {
  "sync-briefs.yml": { workflow: "sync-briefs.yml" },
  "sync-briefs-apres-midi": { workflow: "sync-briefs.yml", inputs: { passe: "apres-midi" } },
  "zone-synthesis.yml": { workflow: "zone-synthesis.yml" },
  "situation-report.yml": { workflow: "situation-report.yml" },
};

export function dispatchPlan(name: string): DispatchPlan | null {
  return Object.prototype.hasOwnProperty.call(PLANS, name) ? PLANS[name] : null;
}

/** Paramètre `batches` de la route de rédaction : un entier de 1 à 3, sinon aucune limite supplémentaire. */
export function parseBatchesLimit(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= 1 && n <= MAX_BATCHES_PER_ZONE ? n : undefined;
}

/** Lots effectifs par zone : le plus petit entre le plafond du code, celui du mode budget du mois et celui du passage. */
export function effectiveMaxBatches(policyMax: number | null | undefined, passMax: number | undefined): number {
  return Math.min(MAX_BATCHES_PER_ZONE, policyMax ?? MAX_BATCHES_PER_ZONE, passMax ?? MAX_BATCHES_PER_ZONE);
}
