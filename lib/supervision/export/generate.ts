import { listAlertStates } from "../alerts/store";
import { isState, capabilities } from "../core/lifecycle";
import { listNotes } from "../core/notesStore";
import { OBJECTIVES } from "../core/scope";
import { adminDb, getScopeSnapshot, getSupervision, type Db } from "../core/store";
import { loadBoardData } from "../data/board";
import { renderPdf } from "./pdf";
import { buildReport, reportFilename, type ExportPeriod } from "./report";
import type { StoredDecision } from "../alerts/rules";

// Supervision V1 : génération du rapport PDF d'UNE Supervision du propriétaire. Serveur seulement ; aucune IA, aucun coût.
//  - Le propriétaire est TOUJOURS le premier argument : une Supervision d'un autre compte n'existe pas pour ce compte.
//  - L'export suit les droits de l'état (lifecycle.ts) : permis en activation, pause, erreur et lecture seule, refusé en brouillon
//    (rien à exporter avant la première collecte) et pour une Supervision supprimée.

export type GenerateResult =
  | { ok: true; bytes: Uint8Array; filename: string; events: number }
  | { ok: false; code: "not_found" | "export_unavailable"; state?: string };

export interface GenerateOptions {
  period: ExportPeriod;
  includeNotes: boolean;
  now?: Date;
  client?: Db;
}

const missingTable = (error: unknown) => /sv_|relation|does not exist|schema cache|function/i.test(error instanceof Error ? error.message : String(error));

export async function generateSupervisionReport(ownerId: string, supervisionId: string, options: GenerateOptions): Promise<GenerateResult> {
  const client = options.client ?? adminDb();
  const now = options.now ?? new Date();
  const supervision = await getSupervision(ownerId, supervisionId, client);
  if (!supervision || !supervision.currentScopeVersionId) return { ok: false, code: "not_found" };
  if (!isState(supervision.state) || !capabilities(supervision.state).export) return { ok: false, code: "export_unavailable", state: supervision.state };

  const snapshot = await getScopeSnapshot(ownerId, supervisionId, supervision.currentScopeVersionId, client);
  if (!snapshot) return { ok: false, code: "not_found" };
  const data = await loadBoardData(snapshot, now, client, supervisionId);

  // Décisions sur les alertes : si la table n'existe pas encore (script SQL pas exécuté), les alertes sont simplement « à traiter ».
  const decisions = new Map<string, StoredDecision>();
  try {
    for (const row of (await listAlertStates(ownerId, supervisionId, client)) ?? []) decisions.set(row.eventRef, { status: row.status, level: row.level });
  } catch (error) {
    if (!missingTable(error)) throw error;
  }
  const notes = options.includeNotes ? ((await listNotes(ownerId, supervisionId, {}, client)) ?? []) : null;

  const objective = OBJECTIVES.find((entry) => entry.key === snapshot.scope.objective)?.label ?? snapshot.scope.objective;
  const report = buildReport({
    supervision: { name: supervision.name, state: supervision.state },
    scope: { countries: data.countries.map((country) => country.name), objective, keywords: snapshot.scope.keywords, entities: snapshot.scope.entities, exclusions: snapshot.scope.exclusions ?? [] },
    events: data.events,
    coverage: { ...data.coverage },
    period: options.period,
    decisions,
    notes,
    pausedAt: supervision.pausedAt,
    generatedAt: now,
  });
  const bytes = await renderPdf(report, now);
  return { ok: true, bytes, filename: reportFilename(supervision.name, now), events: data.events.length };
}
