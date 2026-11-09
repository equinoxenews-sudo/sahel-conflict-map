import { parseState, type LabState } from "../dashboard/state";
import { StoreError, adminDb, callRpc, getSupervision, type Db, type FailureCode, type Outcome } from "./store";

// Supervision V1, Lot 2 intégré : tableau de bord d'une Supervision enregistré côté serveur (supabase/supervision-lot2-dashboards.sql).
// Même règles que le reste du modèle : serveur seulement, propriétaire toujours vérifié, écriture atomique avec CONTRÔLE DE RÉVISION
// (jamais d'écrasement silencieux entre deux onglets ou deux appareils).

/** Taille maximale d'un tableau de bord enregistré (octets de JSON) : un tableau réel en fait quelques ko. */
export const MAX_DASHBOARD_BYTES = 200_000;

export type DashboardFailure = FailureCode | "invalid_state_document" | "too_large";

export interface DashboardDocument {
  /** 0 : jamais enregistré. */
  revision: number;
  /** null tant que rien n'a été enregistré (tableau vierge). */
  state: LabState | null;
  savedAt: string | null;
}

/** Valide un tableau de bord reçu du navigateur : taille bornée, structure complète, aucune incohérence (modules sans place, chevauchements…). */
export function validateDashboardState(input: unknown): { ok: true; state: LabState } | { ok: false; code: "invalid_state_document" | "too_large" } {
  let text: string;
  try {
    text = JSON.stringify(input);
  } catch {
    return { ok: false, code: "invalid_state_document" };
  }
  if (typeof text !== "string" || text.length > MAX_DASHBOARD_BYTES) return { ok: false, code: "too_large" };
  const state = parseState(text);
  return state ? { ok: true, state } : { ok: false, code: "invalid_state_document" };
}

interface DashboardRow {
  revision: number;
  state: unknown;
  saved_at: string;
}

/** Tableau de bord d'une Supervision DU PROPRIÉTAIRE (null si la Supervision n'est pas la sienne). */
export async function getDashboard(ownerId: string, supervisionId: string, client: Db = adminDb()): Promise<DashboardDocument | null> {
  const supervision = await getSupervision(ownerId, supervisionId, client);
  if (!supervision) return null;
  const { data, error } = await client.from("sv_dashboards").select("revision, state, saved_at").eq("supervision_id", supervisionId).maybeSingle();
  if (error) throw new StoreError(`Tableau de bord illisible : ${error.message}`, error);
  if (!data) return { revision: 0, state: null, savedAt: null };
  const row = data as DashboardRow;
  // Un enregistrement devenu illisible (ancienne version du format) ne casse pas l'ouverture : tableau vierge, l'historique reste.
  const state = parseState(JSON.stringify(row.state));
  return { revision: row.revision, state, savedAt: row.saved_at };
}

export type SaveOutcome = Outcome<{ revision: number; saved_at: string }> | { ok: false; code: "invalid_state_document" | "too_large"; detail: Record<string, never> };

/**
 * Enregistre un tableau de bord si — et seulement si — `expectedRevision` est la révision courante. Sinon la base renvoie
 * `revision_conflict` avec la version du serveur (dans `detail.current_state`), et rien n'est écrasé.
 */
export async function saveDashboard(ownerId: string, supervisionId: string, expectedRevision: number, state: unknown, client: Db = adminDb()): Promise<SaveOutcome> {
  const valid = validateDashboardState(state);
  if (!valid.ok) return { ok: false, code: valid.code, detail: {} };
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return { ok: false, code: "invalid_state_document", detail: {} };
  return callRpc<{ revision: number; saved_at: string }>(client, "sv_save_dashboard", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_expected_revision: expectedRevision,
    p_state: valid.state,
  });
}

export interface DashboardRevisionInfo {
  revision: number;
  savedAt: string;
}

/** Dernières révisions conservées (sans leur contenu), de la plus récente à la plus ancienne. */
export async function listDashboardRevisions(ownerId: string, supervisionId: string, client: Db = adminDb()): Promise<DashboardRevisionInfo[]> {
  if (!(await getSupervision(ownerId, supervisionId, client))) return [];
  const { data, error } = await client.from("sv_dashboard_revisions").select("revision, saved_at").eq("supervision_id", supervisionId).order("revision", { ascending: false });
  if (error) throw new StoreError(`Historique illisible : ${error.message}`, error);
  return ((data ?? []) as { revision: number; saved_at: string }[]).map((row) => ({ revision: row.revision, savedAt: row.saved_at }));
}

/** Contenu d'une ancienne révision (pour la restaurer : on l'enregistre alors comme une NOUVELLE révision). */
export async function getDashboardRevision(ownerId: string, supervisionId: string, revision: number, client: Db = adminDb()): Promise<LabState | null> {
  if (!(await getSupervision(ownerId, supervisionId, client))) return null;
  const { data, error } = await client.from("sv_dashboard_revisions").select("state").eq("supervision_id", supervisionId).eq("revision", revision).maybeSingle();
  if (error) throw new StoreError(`Révision illisible : ${error.message}`, error);
  return data ? parseState(JSON.stringify((data as { state: unknown }).state)) : null;
}
