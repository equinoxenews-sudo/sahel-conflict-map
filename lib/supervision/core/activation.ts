import { collectForSupervision, type CollectDeps, type CollectStats } from "../collect/run";
import type { AccessProfile } from "./entitlements";
import { activate, cancelOperation, confirmOperation, type Db, type FailureCode } from "./store";

// Supervision V1, Lot 6a : ACTIVATION d'une Supervision (brouillon -> initialisation -> active). Enchaînement testable, sans IA.
//
//  1. activate : réserve les droits (place active libre, crédit) ; la Supervision passe en « initializing ». Rejouable avec la même clé.
//  2. initialisation : une première collecte de presse (premier remplissage du tableau).
//  3. succès -> confirmOperation : la Supervision devient « active » (collecte programmée, alertes et IA ne la concernent qu'à partir de là) ;
//     échec -> cancelOperation : retour en brouillon, le crédit est rendu, RIEN n'est consommé.
//
// Les crédits restent en place mais INVISIBLES pour le fondateur (crédits illimités) : ils seront remplacés par la barre de consommation
// mensuelle (décision du 10/11/2026).

export type ActivationFailure = FailureCode | "activation_failed";

export type ActivationResult =
  | { ok: true; state: "active"; replay: boolean; collection: CollectStats | null }
  | { ok: false; code: ActivationFailure; detail: Record<string, unknown> };

export interface ActivationOptions {
  now?: Date;
  /** Pour les tests : flux simulés, base, horloge. */
  deps?: CollectDeps;
  client?: Db;
}

export async function activateSupervision(ownerId: string, supervisionId: string, key: string, access: AccessProfile, options: ActivationOptions = {}): Promise<ActivationResult> {
  const started = await activate(ownerId, supervisionId, key, access, options.now, undefined, options.client);
  if (!started.ok) return { ok: false, code: started.code, detail: started.detail };

  if (started.replay) {
    // Même clé rejouée : double clic ou relance. Déjà confirmée : rien à refaire ; annulée : c'est fini ; en attente : on reprend l'initialisation.
    if (started.status === "committed") return { ok: true, state: "active", replay: true, collection: null };
    if (started.status === "cancelled") return { ok: false, code: "cancelled", detail: {} };
  }

  let reason = "initialization_failed";
  try {
    const first = await collectForSupervision(ownerId, supervisionId, { trigger: "manual", minIntervalMinutes: 0, deps: { ...options.deps, db: options.client ?? options.deps?.db, now: options.now ?? options.deps?.now } });
    if (first.ok && first.status !== "failed") {
      const confirmed = await confirmOperation(ownerId, key, options.now, options.client);
      if (!confirmed.ok) return { ok: false, code: confirmed.code, detail: confirmed.detail };
      return { ok: true, state: "active", replay: started.replay, collection: first.stats };
    }
    // Une autre collecte tourne déjà : on ne l'interrompt pas et on n'annule rien, l'activation peut être rejouée avec la même clé.
    if (!first.ok && first.code === "already_running") return { ok: false, code: "already_running", detail: first.detail };
    reason = first.ok ? "Aucune recherche n'a répondu." : String(first.detail.message ?? first.code);
  } catch (error) {
    reason = error instanceof Error ? error.message.slice(0, 200) : "Erreur inconnue.";
  }
  // Échec technique de l'initialisation : le crédit est rendu et la Supervision revient en brouillon.
  await cancelOperation(ownerId, key, "initialization_failed", options.now, options.client).catch(() => undefined);
  return { ok: false, code: "activation_failed", detail: { reason } };
}
