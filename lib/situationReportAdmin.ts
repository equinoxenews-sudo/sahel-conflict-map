import { getSupabaseAdmin } from "./supabaseAdmin";
import type { ReportEdit, SituationReport } from "./situationReport";

// Accès service (contourne la RLS) : réservé aux pages et routes protégées par
// lib/adminAuth.ts. Ne jamais importer depuis un composant client.
const COLUMNS =
  "id, zone_slug, status, period_start, period_end, title, items, conclusion, image_url, brief_ids, model, created_at, updated_at, published_at";

export async function listReportsAdmin(limit = 100): Promise<SituationReport[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("situation_reports")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SituationReport[];
}

export async function getReportAdmin(id: number): Promise<SituationReport | null> {
  const { data, error } = await getSupabaseAdmin().from("situation_reports").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SituationReport | null) ?? null;
}

export async function saveReportAdmin(id: number, edit: ReportEdit): Promise<SituationReport | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("situation_reports")
    .update({
      title: edit.title,
      conclusion: edit.conclusion,
      image_url: edit.image_url,
      items: edit.items,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SituationReport | null) ?? null;
}

export async function setReportStatusAdmin(id: number, status: "draft" | "published"): Promise<SituationReport | null> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("situation_reports")
    .update(status === "published" ? { status, published_at: now, updated_at: now } : { status, published_at: null, updated_at: now })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SituationReport | null) ?? null;
}

/** Suppression réservée aux brouillons : un rapport publié se repasse d'abord en brouillon. */
export async function deleteDraftAdmin(id: number): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("situation_reports")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
