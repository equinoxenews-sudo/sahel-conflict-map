import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../supabaseAdmin";
import { NOTES_MAX, toNote, type NewNote, type Note } from "./notes";
import { StoreError, getSupervision, type FailureCode, type Outcome } from "./store";

// Supervision V1, Lot 7 : accès serveur aux notes (table et fonctions « sv_ », supabase/supervision-lot7-notes.sql).
// Mêmes règles que store.ts : usage serveur seulement, le propriétaire est TOUJOURS le premier argument et filtre chaque lecture et
// chaque écriture ; les quotas et la lecture seule sont décidés par la base, de façon atomique. Aucune IA.

type Db = Pick<SupabaseClient, "rpc" | "from">;

function db(): Db {
  return getSupabaseAdmin();
}

async function callNote(client: Db, fn: string, args: Record<string, unknown>): Promise<Outcome<{ note?: Note }>> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new StoreError(`${fn} : ${error.message}`, error);
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok === true) {
    const raw = body.note as Record<string, unknown> | undefined;
    return { ok: true, replay: body.replay === true, ...(raw ? { note: toNote(raw) } : {}) };
  }
  const { ok: _ok, code, ...detail } = body;
  void _ok;
  if (detail.note && typeof detail.note === "object") detail.note = toNote(detail.note as Record<string, unknown>);
  return { ok: false, code: (code as FailureCode) ?? "not_found", detail };
}

/** Notes (non supprimées) d'une Supervision du propriétaire, les plus récentes d'abord ; `eventRef` ne garde que celles d'une publication. */
export async function listNotes(ownerId: string, supervisionId: string, options: { eventRef?: string | null; eventRefs?: string[] } = {}, client: Db = db()): Promise<Note[] | null> {
  // La lecture reste permise en lecture seule (consultation et export) ; une Supervision d'un autre compte n'existe pas pour ce compte.
  const owned = await getSupervision(ownerId, supervisionId, client);
  if (!owned) return null;
  let query = client
    .from("sv_notes")
    .select("id, event_ref, event_title, body, revision, created_at, updated_at")
    .eq("supervision_id", supervisionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(NOTES_MAX);
  const refs = [...new Set([options.eventRef, ...(options.eventRefs ?? [])].filter((ref): ref is string => !!ref))];
  if (refs.length === 1) query = query.eq("event_ref", refs[0]);
  else if (refs.length > 1) query = query.in("event_ref", refs);
  const { data, error } = await query;
  if (error) throw new StoreError(`Lecture des notes impossible : ${error.message}`, error);
  return ((data ?? []) as Record<string, unknown>[]).map(toNote);
}

export function addNote(ownerId: string, supervisionId: string, key: string, input: NewNote, options: { now?: Date; max?: number } = {}, client: Db = db()) {
  return callNote(client, "sv_add_note", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_key: key,
    p_body: input.body,
    p_event_ref: input.eventRef,
    p_event_title: input.eventTitle,
    p_max: options.max ?? NOTES_MAX,
    ...(options.now ? { p_now: options.now.toISOString() } : {}),
  });
}

export function updateNote(ownerId: string, supervisionId: string, noteId: string, body: string, revision: number, now?: Date, client: Db = db()) {
  return callNote(client, "sv_update_note", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_note_id: noteId,
    p_body: body,
    p_revision: revision,
    ...(now ? { p_now: now.toISOString() } : {}),
  });
}

export function deleteNote(ownerId: string, supervisionId: string, noteId: string, now?: Date, client: Db = db()) {
  return callNote(client, "sv_delete_note", {
    p_owner: ownerId,
    p_supervision_id: supervisionId,
    p_note_id: noteId,
    ...(now ? { p_now: now.toISOString() } : {}),
  });
}
