// Portée des données du navigateur (localStorage et IndexedDB) : une portée par compte, pour que deux comptes qui se
// servent du même navigateur ne voient jamais les dossiers l'un de l'autre. Module pur côté logique (testé dans
// tests/investigation-scope.test.ts) ; la portée courante est posée par InvestigationProvider, d'après le compte que le
// SERVEUR a reconnu.
//
//  - Fondateur : portée vide (""), donc les clés et les noms de bases d'origine, strictement inchangés. Ses dossiers
//    (dont l'enquête APN) ne sont ni migrés, ni copiés, ni renommés : aucun risque de les perdre.
//  - Compte individuel « marc » : chaque clé reçoit le suffixe « :marc » (equinoxe-investigation-v1:marc…).
//  - Portée non posée (null) : toute lecture ou écriture lève une erreur. On échoue fermé plutôt que de retomber sur les
//    clés du fondateur.

/** Identifiant de compte individuel (voir lib/accounts.ts) : jamais de « : » ni d'espace, le suffixe est donc sans ambiguïté. */
const SCOPE_PATTERN = /^[a-z0-9._-]{3,40}$/;

/** Portée valide : "" (fondateur) ou un identifiant de compte individuel. */
export function isValidScope(value: unknown): value is string {
  return value === "" || (typeof value === "string" && SCOPE_PATTERN.test(value));
}

/** Clé ou nom de base pour une portée donnée. */
export function scopedName(base: string, scope: string): string {
  if (!isValidScope(scope)) throw new Error("Portée de stockage invalide.");
  return scope === "" ? base : `${base}:${scope}`;
}

let current: string | null = null;

/** Pose la portée courante (appelé une fois par InvestigationProvider, avant toute lecture). */
export function setStorageScope(scope: string): void {
  if (!isValidScope(scope)) throw new Error("Portée de stockage invalide.");
  current = scope;
}

/** La portée courante, ou null tant qu'elle n'est pas posée. */
export function getStorageScope(): string | null {
  return current;
}

/** Clé de localStorage ou nom de base IndexedDB de la portée courante. Lève une erreur si la portée n'est pas posée. */
export function scopedKey(base: string): string {
  if (current === null) throw new Error("Portée de stockage non définie : aucun compte reconnu.");
  return scopedName(base, current);
}
