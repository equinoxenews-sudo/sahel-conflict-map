import { collectForSupervision } from "@/lib/supervision/collect/run";
import { failure, isUuid, json, storeProblem, supervisionOwner } from "@/lib/supervision/core/http";
import { adminDb, getSupervision } from "@/lib/supervision/core/store";

// Collecte de publications pour UNE Supervision du compte connecté : sans IA (recherche Google Actualités + correspondance
// déterministe), rangement idempotent, journal. GET : derniers passages. POST : lance un passage (au plus un toutes les 15 minutes).
export const maxDuration = 60;

const missingTable = (error: { code?: string; message?: string }) => error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    if (!(await getSupervision(owner.ownerId, id))) return failure("not_found");
    const { data, error } = await adminDb().from("sv_collection_runs").select("id, trigger, started_at, finished_at, status, stats, queries, error").eq("supervision_id", id).order("started_at", { ascending: false }).limit(8);
    if (error) {
      if (missingTable(error)) return json({ ready: false, runs: [] });
      throw error;
    }
    return json({ ready: true, runs: data ?? [] });
  } catch (error) {
    return storeProblem(error);
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await supervisionOwner();
  if (!owner.ok) return owner.response;
  const { id } = await params;
  if (!isUuid(id)) return failure("not_found");
  try {
    const outcome = await collectForSupervision(owner.ownerId, id, { trigger: "manual" });
    if (!outcome.ok) return failure(outcome.code, outcome.detail);
    return json({ runId: outcome.runId, status: outcome.status, stats: outcome.stats });
  } catch (error) {
    return storeProblem(error);
  }
}
