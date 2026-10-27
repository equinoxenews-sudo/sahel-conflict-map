import type { Supervision, SupervisionInput } from "@/lib/supervision/model";
import type { Results } from "@/lib/supervision/results";

// Appels des routes /api/supervision depuis le navigateur. Toute erreur du serveur devient un message lisible.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  } catch {
    throw new ApiError("Connexion impossible : vérifie ta connexion Internet.", "network");
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) throw new ApiError(body.error ?? `Erreur ${response.status}`, body.code ?? "error");
  return body;
}

export interface Overview {
  supervisions: Supervision[];
  activeLimit: number;
  tier: string;
}

export const listSupervisions = () => call<Overview>("/api/supervision");
export const createSupervision = (input: SupervisionInput) => call<{ supervision: Supervision }>("/api/supervision", { method: "POST", body: JSON.stringify(input) });
export const updateSupervision = (id: string, input: SupervisionInput) => call<{ supervision: Supervision }>(`/api/supervision/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const setStatus = (id: string, status: "active" | "paused" | "archived") => call<{ supervision: Supervision }>(`/api/supervision/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const deleteSupervision = (id: string) => call<{ ok: true }>(`/api/supervision/${id}`, { method: "DELETE" });
export const loadResults = (id: string) => call<{ supervision: Supervision; results: Results }>(`/api/supervision/${id}/results`);
export const runCollection = (id: string) => call<{ summary: { matched: number; error: string | null } }>(`/api/supervision/${id}/run`, { method: "POST" });
export const sendFeedback = (id: string, targetId: number, kind: string) =>
  call<{ ok: true }>(`/api/supervision/${id}/feedback`, { method: "POST", body: JSON.stringify({ targetType: "item", targetId: String(targetId), kind }) });
