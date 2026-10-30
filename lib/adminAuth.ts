import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { normalizeIdentifier, readSession, SESSION_MAX_AGE_SECONDS, signSession, type Account } from "./accounts";
import { loadActiveAccount } from "./accountStore";

export { normalizeIdentifier };

// Comptes du site. Deux sortes de connexion coexistent :
//  - le compte du fondateur (« Nicof » ou ADMIN_USER), dont le mot de passe est la variable ADMIN_PASSWORD : il existe
//    sans base de données (son jeton est inchangé depuis la version à compte unique) et sert aussi de secours ;
//  - les comptes individuels de la table `accounts` (mot de passe haché, offre, fuseau horaire), créés à la main avec
//    scripts/create-account.ts. Il n'y a pas d'inscription.
// La connexion pose un cookie httpOnly de sept jours ; sans ADMIN_PASSWORD, le compte du fondateur est fermé.
// Un compte ouvre « Mon espace » (Notes, Graph, Outils) ; seul le compte du fondateur (offre « owner ») ouvre
// Investigation, Supervision, Tracking (lib/espaceAccess.ts) et l'écran de relecture des points de situation.
// Invariant : l'offre « owner » est celle du fondateur et d'elle seule. Un compte individuel qui porterait cette offre,
// ou l'identifiant du fondateur, est refusé : sinon il aurait les données (dossiers) du fondateur.
export const ADMIN_COOKIE = "equinoxe_session";
export const ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
export const DEFAULT_ACCOUNT_ID = "Nicof";

function configuredPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  return value ? value : null;
}

/** Identifiant du compte du fondateur (casse conservée pour l'affichage). */
export function accountId(): string {
  const value = process.env.ADMIN_USER?.trim().replace(/^["']|["']$/g, "");
  return value ? value : DEFAULT_ACCOUNT_ID;
}

// Le cookie du fondateur ne contient ni l'identifiant ni le mot de passe, seulement leur empreinte salée.
function tokenFor(identifier: string, password: string): string {
  return createHash("sha256").update(`equinoxe-session:${normalizeIdentifier(identifier)}:${password}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function adminConfigured(): boolean {
  return configuredPassword() !== null;
}

/** Jeton à poser en cookie si l'identifiant et le mot de passe saisis sont ceux du fondateur, sinon null. */
export function tokenForCredentials(identifier: unknown, password: unknown): string | null {
  const expected = configuredPassword();
  if (!expected || typeof identifier !== "string" || typeof password !== "string") return null;
  const given = tokenFor(identifier, password);
  const wanted = tokenFor(accountId(), expected);
  return safeEqual(given, wanted) ? wanted : null;
}

/** Secret de signature des sessions individuelles : dérivé d'une variable serveur déjà secrète, sans nouveau réglage. */
function sessionSecret(): string | null {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || configuredPassword();
  return base ? createHash("sha256").update(`equinoxe-session-secret:${base}`).digest("hex") : null;
}

/** Vrai si le serveur peut ouvrir une session (mot de passe du fondateur ou clé de service pour les comptes individuels). */
export function loginAvailable(): boolean {
  return sessionSecret() !== null;
}

/** Cookie de session d'un compte individuel (table `accounts`), ou null si le serveur n'a aucun secret. */
export function sessionTokenFor(account: Account): string | null {
  const secret = sessionSecret();
  return secret ? signSession(account, secret) : null;
}

/** Le compte du fondateur, tel que le voit le reste du site. */
function ownerAccount(): Account {
  return { id: normalizeIdentifier(accountId()), name: accountId(), tier: "owner", timezone: "Europe/Paris" };
}

/**
 * Un compte de la table `accounts` peut-il ouvrir une session ? Non s'il porte l'offre « owner » ou l'identifiant du
 * fondateur : ces deux choses n'appartiennent qu'au compte du fondateur.
 */
export function isEligibleIndividual(account: Account): boolean {
  return account.tier !== "owner" && account.id !== normalizeIdentifier(accountId());
}

/**
 * Le compte que désigne un cookie de connexion, sinon null. Le fondateur se reconnaît à l'empreinte de son mot de passe.
 * Un compte individuel se reconnaît à la signature du cookie PUIS est relu en base : un compte suspendu ou rétrogradé perd
 * son accès tout de suite, sans attendre l'expiration du cookie, et si la base est injoignable il est refusé (échec fermé).
 * Le chargement du compte est injectable pour les tests.
 */
export async function accountFromCookie(
  value: string | undefined,
  load: (id: string) => Promise<Account | null> = loadActiveAccount,
): Promise<Account | null> {
  if (typeof value !== "string" || !value) return null;
  const password = configuredPassword();
  if (password && safeEqual(value, tokenFor(accountId(), password))) return ownerAccount();
  const secret = sessionSecret();
  const session = secret ? readSession(value, secret) : null;
  if (!session) return null;
  let current: Account | null;
  try {
    current = await load(session.id);
  } catch {
    return null;
  }
  return current && isEligibleIndividual(current) ? current : null;
}

/** Le compte connecté (cookie valide), sinon null. */
export async function currentAccount(): Promise<Account | null> {
  return accountFromCookie((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Vrai si la valeur du cookie de connexion est celle d'un compte (fondateur ou compte individuel) : pour la porte d'entrée, qui lit le cookie de la requête. */
export function isValidSessionToken(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const password = configuredPassword();
  if (password && safeEqual(value, tokenFor(accountId(), password))) return true;
  const secret = sessionSecret();
  return secret ? readSession(value, secret) !== null : false;
}

/** Identifiant affiché du compte connecté (cookie valide), sinon null. */
export async function currentUser(): Promise<string | null> {
  return (await currentAccount())?.name ?? null;
}

/** Vrai si la requête courante est celle du compte du fondateur (relecture des points de situation, rubriques réservées). */
export async function isAdmin(): Promise<boolean> {
  return (await currentAccount())?.tier === "owner";
}

/** Développement local sans mot de passe configuré : l'espace privé est ouvert, au nom du fondateur. */
function localOpenAccess(): boolean {
  return !adminConfigured() && process.env.NODE_ENV !== "production";
}

/**
 * Le compte qui travaille dans « Mon espace » : le compte connecté, ou le fondateur en développement local sans mot de
 * passe (« signedIn » est alors faux). Null : l'accès est fermé (la page de connexion s'affiche).
 */
export async function spaceAccount(): Promise<{ account: Account; signedIn: boolean } | null> {
  const account = await currentAccount();
  if (account) return { account, signedIn: true };
  return localOpenAccess() ? { account: ownerAccount(), signedIn: false } : null;
}

/** Accès aux espaces privés : connecté (n'importe quel compte), ou développement local sans mot de passe configuré. */
export async function privateAccessOpen(): Promise<boolean> {
  return (await spaceAccount()) !== null;
}
