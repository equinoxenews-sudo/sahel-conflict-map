import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../supabaseAdmin";
import { StoreError, getSupervision, type FailureCode, type Outcome } from "../core/store";
import type { DecisionItem, Decision, StoredDecision, AlertLevel } from "./rules";

// Supervision V1, Lot 8 : accès serveur aux décisions sur les alertes (table et fonction « sv_ », supabase/supervision-lot8-alerts.sql).
// Mêmes règles que core/store.ts : usage serveur seulement, le propriétaire est TOUJOURS le premier argument et filtre chaque lecture et
// chaque écriture ; la lecture seule et le plafond sont décidés par la base, de façon atomique. Aucune IA.

type Db = Pick<SupabaseClient, "rpc" | "from">;

export const DECISIONS_MAX = 2000;

function db(): Db {
  return getSupabaseAdmin();
}

export interface StoredAlertState extends StoredDecision {
  eventRef: string;
  updatedAt: string;
}

/** Décisions enregistrées sur une Supervision du propriétaire ; null si elle n'existe pas pour lui. Permise en lecture seule. */
export async function listAlertStates(ownerId: string, supervisionId: string, client: Db = db()): Promise<StoredAlertState[] | null> {
  const owned = await getSupervision(ownerId, supervisionId, client);
  if (!owned) return null;
  const { data, error } = await client.from("sv_alert_states").select("event_ref, status, level, updated_at").eq("supervision_id", supervisionId).limit(DECISIONS_MAX);
  if (error) throw new StoreError(`Lecture des alertes impossible : ${error.message}`, error);
  return ((data ?? []) as { event_ref: string; status: Decision; level: AlertLevel; updated_at: string }[]).map((row) => ({ eventRef: row.event_ref, status: row.status, level: row.level, updatedAt: row.updated_at }));
}

export async function setAlertStates(
  ownerId: string,
  supervisionId: string,
  status: Decision | "new",
  items: DecisionItem[],
  options: { now?: Date; max?: number } = {},
  client: Db = db(),
): Promise<Outcome<{ applied: number }>> {
  const { data, error } = await client.rpc("sv_set_alert_states", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_status: status,
    p_items: items.map((item) => ({ event_ref: item.eventRef, level: item.level })),
    p_max: options.max ?? DECISIONS_MAX,
    ...(options.now ? { p_now: options.now.toISOString() } : {}),
  });
  if (error) throw new StoreError(`sv_set_alert_states : ${error.message}`, error);
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok === true) return { ok: true, replay: false, applied: Number(body.applied ?? 0) };
  const { ok: _ok, code, ...detail } = body;
  void _ok;
  return { ok: false, code: (code as FailureCode) ?? "not_found", detail };
}
