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

/** En-tête que la page joint à chaque requête de copie en ligne : l'identifiant du compte pour lequel elle a été construite. */
export const ACCOUNT_HEADER = "x-equinoxe-account";

/**
 * Une page restée ouverte pour un compte peut se retrouver avec le cookie d'un autre (déconnexion et reconnexion dans un
 * autre onglet du même navigateur). Sans cette vérification, elle enverrait les dossiers du premier compte dans l'espace en
 * ligne du second, ou récupérerait les siens. L'en-tête doit donc être celui du compte de la session, sinon la requête est refusée.
 */
export function requestMatchesAccount(header: string | null, account: Pick<Account, "id">): boolean {
  return header === account.id;
}
