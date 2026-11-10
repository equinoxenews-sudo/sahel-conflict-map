// Supervision V1, Lot 5c : collecte PROGRAMMÉE. Sans IA, sans coût : la même collecte que le bouton « Actualiser », lancée par une tâche
// planifiée (Vercel Cron) pour toutes les Supervisions qui doivent collecter.
//
// Pourquoi une route qui boucle plutôt qu'une tâche par Supervision : une seule entrée dans vercel.json suffit, et le nombre de
// Supervisions ne change rien à la planification. Chaque passage reste isolé : une panne sur l'une n'empêche pas les autres.
//
// Contraintes d'exécution (Vercel, plan Hobby) :
//  - une tâche ne s'exécute qu'UNE fois par jour avec une précision de ±59 minutes ; on obtient plusieurs passages par jour en déclarant
//    plusieurs entrées (6 h, 12 h, 18 h par exemple), comme le site le fait déjà pour ses synthèses ;
//  - une exécution est limitée en durée : on s'arrête avant la limite (budget de temps) et la prochaine exécution reprend par les
//    Supervisions les moins récemment collectées, donc aucune n'est oubliée.
// Aucune dépense IA ici : ni appel de modèle, ni réservation de budget.

import { STATES, capabilities, type SupervisionState } from "../core/lifecycle";
import { adminDb, type Db } from "../core/store";
import { collectForSupervision, type CollectDeps } from "./run";

/** Écart minimal entre deux passages RÉUSSIS d'une même Supervision lors d'une exécution programmée (minutes). */
export const SCHEDULED_MIN_INTERVAL_MINUTES = 180;
/** Temps maximal d'une exécution (millisecondes) : sous la durée autorisée de la fonction, avec de la marge pour répondre. */
export const DEFAULT_TIME_BUDGET_MS = 40_000;
/** Nombre maximal de Supervisions traitées par exécution (les suivantes passent à l'exécution suivante). */
export const DEFAULT_BATCH_LIMIT = 25;

/** États dans lesquels une Supervision collecte (source unique : lifecycle.ts). */
export function collectingStates(): SupervisionState[] {
  return STATES.filter((state) => capabilities(state).collect);
}

export interface Candidate {
  id: string;
  ownerId: string;
  /** Début du dernier passage réussi, ou null si jamais collectée. */
  lastCollectedAt: string | null;
}

/** Les Supervisions jamais collectées d'abord, puis les moins récemment collectées. Pur : même entrée, même ordre. */
export function orderByStaleness(candidates: readonly Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    if (a.lastCollectedAt === b.lastCollectedAt) return a.id.localeCompare(b.id);
    if (a.lastCollectedAt === null) return -1;
    if (b.lastCollectedAt === null) return 1;
    return a.lastCollectedAt.localeCompare(b.lastCollectedAt);
  });
}

export interface ScheduledReport {
  /** Supervisions en état de collecter. */
  considered: number;
  /** Passages lancés et terminés avec succès (complets ou partiels). */
  collected: number;
  /** Passages refusés parce que trop récents ou déjà en cours : normal, rien à faire. */
  skipped: number;
  /** Passages en échec (réseau, base, zone non gérée…), avec la raison. */
  failed: { id: string; reason: string }[];
  /** Vrai si l'exécution s'est arrêtée faute de temps ou de place : le reste attend la prochaine exécution. */
  stoppedEarly: boolean;
  /** Supervisions restées en attente à cause de cet arrêt. */
  deferred: number;
}

export interface ScheduledOptions {
  now?: Date;
  db?: Db;
  deps?: CollectDeps;
  timeBudgetMs?: number;
  batchLimit?: number;
  minIntervalMinutes?: number;
  /** Réservé aux tests : limite l'exécution à ces Supervisions. */
  only?: readonly string[];
}

const CODES_NORMAL = new Set(["too_soon", "already_running"]);

/** Collecte toutes les Supervisions qui doivent l'être, les plus anciennes d'abord, dans la limite du temps et du nombre. */
export async function collectScheduled(options: ScheduledOptions = {}): Promise<ScheduledReport> {
  const db = options.db ?? adminDb();
  const now = options.now ?? new Date();
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const batchLimit = options.batchLimit ?? DEFAULT_BATCH_LIMIT;
  const started = Date.now();

  let query = db.from("sv_supervisions").select("id, owner_id").in("state", collectingStates());
  if (options.only) query = query.in("id", [...options.only]);
  const { data, error } = await query;
  if (error) throw new Error(`Lecture des Supervisions : ${error.message}`);
  const rows = (data ?? []) as { id: string; owner_id: string }[];

  // Dernier passage réussi de chacune : sert uniquement à l'ordre (la règle d'écart minimal est appliquée par la base, de façon atomique).
  const last = new Map<string, string>();
  if (rows.length > 0) {
    const { data: runs, error: runsError } = await db.from("sv_collection_runs").select("supervision_id, started_at").in("supervision_id", rows.map((row) => row.id)).in("status", ["ok", "partial"]);
    if (runsError) throw new Error(`Lecture du journal de collecte : ${runsError.message}`);
    for (const run of (runs ?? []) as { supervision_id: string; started_at: string }[]) {
      const known = last.get(run.supervision_id);
      if (!known || run.started_at > known) last.set(run.supervision_id, run.started_at);
    }
  }
  const ordered = orderByStaleness(rows.map((row) => ({ id: row.id, ownerId: row.owner_id, lastCollectedAt: last.get(row.id) ?? null })));

  const report: ScheduledReport = { considered: ordered.length, collected: 0, skipped: 0, failed: [], stoppedEarly: false, deferred: 0 };
  let processed = 0;
  for (const candidate of ordered) {
    if (processed >= batchLimit || Date.now() - started >= timeBudgetMs) {
      report.stoppedEarly = true;
      report.deferred = ordered.length - processed;
      break;
    }
    processed++;
    try {
      const outcome = await collectForSupervision(candidate.ownerId, candidate.id, { trigger: "scheduled", minIntervalMinutes: options.minIntervalMinutes ?? SCHEDULED_MIN_INTERVAL_MINUTES, deps: { ...options.deps, db, now } });
      if (outcome.ok) {
        if (outcome.status === "failed") report.failed.push({ id: candidate.id, reason: "Aucune recherche n'a répondu." });
        else report.collected++;
      } else if (CODES_NORMAL.has(outcome.code)) report.skipped++;
      else report.failed.push({ id: candidate.id, reason: outcome.code });
    } catch (error) {
      // Une Supervision en panne ne doit jamais empêcher les suivantes.
      report.failed.push({ id: candidate.id, reason: error instanceof Error ? error.message.slice(0, 200) : "Erreur inconnue." });
    }
  }
  return report;
}
