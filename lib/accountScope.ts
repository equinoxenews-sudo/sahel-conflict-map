import type { Account } from "./accounts";

// Où vivent les données d'un compte. Module pur (testé dans tests/account-scope.test.ts). Le compte du fondateur
// (offre « owner ») garde les emplacements d'origine, strictement inchangés ; chaque compte individuel a les siens.

/** Propriétaire des dossiers en ligne (lib/investigationCloud.ts) : null pour le fondateur, l'identifiant du compte sinon. */
export function cloudOwnerOf(account: Pick<Account, "id" | "tier">): string | null {
  return account.tier === "owner" ? null : account.id;
}

/** Portée des données du navigateur (lib/investigation/scope.ts) : "" pour le fondateur, l'identifiant du compte sinon. */
export function storageScopeOf(account: Pick<Account, "id" | "tier">): string {
  return account.tier === "owner" ? "" : account.id;
}
