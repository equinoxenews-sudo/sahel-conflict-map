import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Tier } from "../../accounts";
import { spaceAccount } from "../../adminAuth";
import { canOpenSection } from "../../espaceAccess";
import { loadAccess } from "./store";
import type { AccessProfile } from "./entitlements";

// Supervision V1 : aide commune aux routes /api/supervision. Chaque route commence par supervisionOwner() : sans compte reconnu qui a
// le droit d'ouvrir la Supervision, rien n'est lu ni écrit, et le propriétaire de TOUTES les données est celui du compte connecté
// (jamais un identifiant fourni par le navigateur).

export type OwnerResult = { ok: true; ownerId: string; tier: Tier; access: () => Promise<AccessProfile> } | { ok: false; response: NextResponse };

export async function supervisionOwner(): Promise<OwnerResult> {
  const space = await spaceAccount();
  if (!space) return { ok: false, response: NextResponse.json({ error: "Connexion requise.", code: "locked" }, { status: 401 }) };
  // Décision du 09/11/2026 : la rubrique reste réservée au compte du fondateur (lib/espaceAccess.ts).
  if (!canOpenSection(space.account, "supervision")) return { ok: false, response: NextResponse.json({ error: "Cette rubrique n'est pas ouverte à ton offre.", code: "forbidden" }, { status: 403 }) };
  const ownerId = space.account.id;
  return { ok: true, ownerId, tier: space.account.tier, access: () => loadAccess(ownerId, space.account.tier) };
}

const STATUS: Record<string, number> = {
  not_found: 404,
  access_denied: 403,
  read_only: 403,
  invalid_state: 409,
  active_limit_reached: 409,
  paused_limit_reached: 409,
  draft_limit_reached: 409,
  credit_exhausted: 409,
  change_pending: 409,
  activation_failed: 502,
  paused: 409,
  major_change_needs_confirmation: 409,
  idempotency_conflict: 409,
  revision_conflict: 409,
  already_running: 409,
  too_soon: 429,
  no_queries: 422,
  collect_failed: 502,
  cancelled: 409,
  already_committed: 409,
  budget_exceeded: 429,
  invalid_state_document: 400,
  too_large: 413,
};

export function failure(code: string, detail: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: code, code, ...detail }, { status: STATUS[code] ?? 400, headers: { "Cache-Control": "no-store" } });
}

export function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

/** Corps JSON borné : un corps trop gros est refusé avant d'être analysé. */
export async function readJson(request: Request, maxBytes: number): Promise<{ ok: true; value: unknown } | { ok: false; code: "too_large" | "invalid_state_document" }> {
  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, code: "too_large" };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, code: "invalid_state_document" };
  }
}

const OPERATION_KEY = /^[A-Za-z0-9_-]{8,80}$/;

/**
 * Clé d'idempotence d'une opération (activation, pause, reprise) : celle que le navigateur envoie pour un même clic (un double clic ou une
 * relance la rejoue sans rien faire de plus), sinon une clé neuve. Jamais une valeur libre : 8 à 80 caractères simples.
 */
export function operationKey(value: unknown, prefix: string): string {
  return typeof value === "string" && OPERATION_KEY.test(value) ? value : `${prefix}-${randomUUID()}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

/** Message lisible quand la base de préproduction n'a pas encore les scripts SQL. */
export function storeProblem(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const missing = /sv_|relation|does not exist|schema cache|function/i.test(message);
  return NextResponse.json(
    { error: missing ? "Les tables de la Supervision n'existent pas dans cette base : exécuter supabase/supervision-lot1.sql puis supervision-lot2-dashboards.sql." : message, code: missing ? "no_tables" : "error" },
    { status: missing ? 503 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
