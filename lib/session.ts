"use client";

import { useSyncExternalStore } from "react";

// Session côté navigateur : qui est connecté, lu une fois après le chargement de la page (/api/session).
// Les pages publiques ne dépendent pas du visiteur et restent en cache ; seul le menu change.
export interface SessionState {
  /** Identifiant connecté, ou null. */
  user: string | null;
  /** Faux tant que la première lecture n'est pas revenue. */
  ready: boolean;
}

export const OPEN_LOGIN_EVENT = "equinoxe:open-login";

const SERVER_STATE: SessionState = { user: null, ready: false };
let state: SessionState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  if (next.user === state.user && next.ready === state.ready) return;
  state = next;
  for (const listener of listeners) listener();
}

/** Relit la session auprès du serveur. */
export async function refreshSession(): Promise<void> {
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    const body = (await response.json()) as { user?: string | null };
    set({ user: typeof body.user === "string" ? body.user : null, ready: true });
  } catch {
    set({ user: state.user, ready: true });
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refreshSession();
  }
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** Connexion : identifiant et mot de passe. Lève une erreur au message lisible si refusée. */
export async function login(identifier: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new Error("Connexion impossible : vérifie ta connexion Internet.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Connexion impossible.");
  }
  await refreshSession();
}

export async function logout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
  set({ user: null, ready: true });
}

/** Ouvre la fenêtre de connexion (écoutée par LoginDialog, montée une fois dans la page). */
export function openLogin(): void {
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT));
}
