import { getSupabaseAdmin } from "../supabaseAdmin";
import type { Tier } from "../accounts";
import { activeLimit, type Criteria, type Schedule, type SourceSpec, type Status, type Supervision, type SupervisionInput, type Zone } from "./model";

// Lecture et écriture des veilles (table `supervisions`). TOUTES les fonctions prennent le propriétaire en premier
// argument et filtrent dessus : une veille d'un autre compte n'est jamais lue, modifiée ni supprimée, même si on en
// connaît l'identifiant (la clé de service contourne RLS : l'isolation est ici).

const COLUMNS = "id, owner_id, status, name, user_request, zone, criteria, sources, schedule, last_run_at, created_at, updated_at";

/** Nombre maximal de veilles gardées par compte (tous statuts, hors archivées) : évite d'empiler des brouillons. */
export const MAX_SUPERVISIONS_PER_ACCOUNT = 10;

interface Row {
  id: string;
  owner_id: string;
  status: Status;
  name: string;
  user_request: string;
  zone: Zone;
  criteria: Criteria;
  sources: SourceSpec[];
  schedule: Schedule;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

function toSupervision(row: Row): Supervision {
  return {
    id: row.id,
    ownerId: row.owner_id,
    status: row.status,
    name: row.name,
    userRequest: row.user_request,
    zone: row.zone,
    criteria: row.criteria,
    sources: row.sources,
    schedule: row.schedule,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupervisionError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "limit" | "forbidden" | "error",
  ) {
    super(message);
  }
}

function fail(error: { message: string }): never {
  throw new SupervisionError(error.message, "error");
}

export async function listSupervisions(ownerId: string): Promise<Supervision[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("supervisions")
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as Row[]).map(toSupervision);
}

/**
 * Veilles actives à collecter. RÉSERVÉ au traitement de collecte (GitHub Actions ou déclenchement par le propriétaire) : il
 * lit les veilles de tous les comptes pour partager les téléchargements. `ownerId` ou `id` restreignent la lecture.
 */
export async function listActiveForCollection(filter: { ownerId?: string; id?: string } = {}): Promise<Supervision[]> {
  let query = getSupabaseAdmin().from("supervisions").select(COLUMNS).eq("status", "active");
  if (filter.ownerId) query = query.eq("owner_id", filter.ownerId);
  if (filter.id) query = query.eq("id", filter.id);
  const { data, error } = await query;
  if (error) fail(error);
  return ((data ?? []) as Row[]).map(toSupervision);
}

export async function getSupervision(ownerId: string, id: string): Promise<Supervision | null> {
  const { data, error } = await getSupabaseAdmin().from("supervisions").select(COLUMNS).eq("owner_id", ownerId).eq("id", id).maybeSingle();
  if (error) fail(error);
  return data ? toSupervision(data as Row) : null;
}

async function countActive(ownerId: string, exceptId?: string): Promise<number> {
  let query = getSupabaseAdmin().from("supervisions").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "active");
  if (exceptId) query = query.neq("id", exceptId);
  const { count, error } = await query;
  if (error) fail(error);
  return count ?? 0;
}

/** Crée une veille en brouillon. Les offres sans veille (gratuit, Plus) ne peuvent pas en créer. */
export async function createSupervision(ownerId: string, tier: Tier, input: SupervisionInput): Promise<Supervision> {
  if (activeLimit(tier) === 0) throw new SupervisionError("Ton offre ne comprend pas la Supervision.", "forbidden");
  const { count, error: countError } = await getSupabaseAdmin()
    .from("supervisions")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .neq("status", "archived");
  if (countError) fail(countError);
  if ((count ?? 0) >= MAX_SUPERVISIONS_PER_ACCOUNT) {
    throw new SupervisionError(`Tu as déjà ${MAX_SUPERVISIONS_PER_ACCOUNT} veilles : supprime-en une avant d'en créer une autre.`, "limit");
  }
  const { data, error } = await getSupabaseAdmin()
    .from("supervisions")
    .insert({
      owner_id: ownerId,
      status: "draft",
      name: input.name,
      user_request: input.userRequest,
      zone: input.zone,
      criteria: input.criteria,
      sources: input.sources,
      schedule: input.schedule,
    })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toSupervision(data as Row);
}

export async function updateSupervision(ownerId: string, id: string, input: SupervisionInput): Promise<Supervision> {
  const { data, error } = await getSupabaseAdmin()
    .from("supervisions")
    .update({
      name: input.name,
      user_request: input.userRequest,
      zone: input.zone,
      criteria: input.criteria,
      sources: input.sources,
      schedule: input.schedule,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new SupervisionError("Veille introuvable.", "not_found");
  return toSupervision(data as Row);
}

/**
 * Change le statut d'une veille. Activer une veille exige une place libre selon l'offre (1 pour Intelligence, 3 pour
 * Pro) ; suspendre ou archiver libère la place, sans remettre à zéro le budget IA du mois (le journal reste).
 */
export async function setSupervisionStatus(ownerId: string, tier: Tier, id: string, status: Status): Promise<Supervision> {
  const current = await getSupervision(ownerId, id);
  if (!current) throw new SupervisionError("Veille introuvable.", "not_found");
  if (status === "active" && current.status !== "active") {
    const limit = activeLimit(tier);
    if ((await countActive(ownerId, id)) >= limit) {
      throw new SupervisionError(
        limit === 0 ? "Ton offre ne comprend pas la Supervision." : `Ton offre permet ${limit} veille${limit > 1 ? "s" : ""} active${limit > 1 ? "s" : ""} : suspends ou supprime-en une d'abord.`,
        limit === 0 ? "forbidden" : "limit",
      );
    }
  }
  const { data, error } = await getSupabaseAdmin()
    .from("supervisions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new SupervisionError("Veille introuvable.", "not_found");
  return toSupervision(data as Row);
}

/** Supprime la veille et ses résultats (la suppression en cascade est faite par la base). Le journal du coût IA reste. */
export async function deleteSupervision(ownerId: string, id: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().from("supervisions").delete().eq("owner_id", ownerId).eq("id", id).select("id");
  if (error) fail(error);
  return (data ?? []).length > 0;
}
