import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { normalizeIdentifier, readSession, SESSION_MAX_AGE_SECONDS, signSession, type Account } from "./accounts";

export { normalizeIdentifier };

// Comptes du site. Deux sortes de connexion coexistent :
//  - le compte du fondateur (« Nicof » ou ADMIN_USER), dont le mot de passe est la variable ADMIN_PASSWORD : il existe
//    sans base de données et sert aussi de secours ;
//  - les comptes individuels de la table `accounts` (mot de passe haché, offre, fuseau horaire), créés à la main.
// La connexion pose un cookie httpOnly de sept jours ; sans ADMIN_PASSWORD, le compte du fondateur est fermé.
// Un compte ouvre « Mon espace » ; seul le compte du fondateur ouvre l'écran de relecture des points de situation et,
// tant que les dossiers ne sont pas cloisonnés par compte, la copie en ligne des dossiers d'Investigation.
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

/** Cookie de session d'un compte individuel (table `accounts`), ou null si le serveur n'a aucun secret. */
export function sessionTokenFor(account: Account): string | null {
  const secret = sessionSecret();
  return secret ? signSession(account, secret) : null;
}

/** Le compte du fondateur, tel que le voit le reste du site. */
function ownerAccount(): Account {
  return { id: normalizeIdentifier(accountId()), name: accountId(), tier: "owner", timezone: "Europe/Paris" };
}

/** Le compte connecté (cookie valide), sinon null. */
export async function currentAccount(): Promise<Account | null> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (typeof value !== "string") return null;
  const password = configuredPassword();
  if (password && safeEqual(value, tokenFor(accountId(), password))) return ownerAccount();
  const secret = sessionSecret();
  return secret ? readSession(value, secret) : null;
}

/** Vrai si la valeur du cookie de connexion est celle d'un compte (fondateur ou compte individuel) : pour la porte d'entrée, qui lit le cookie de la requête. */
export function isValidSessionToken(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  const password = configuredPassword();
  if (password && safeEqual(value, tokenFor(accountId(), password))) return true;
  const secret = sessionSecret();
  return secret ? readSession(value, secret) !== null : false;
}

/** Identifiant du compte connecté (cookie valide), sinon null. */
export async function currentUser(): Promise<string | null> {
  return (await currentAccount())?.name ?? null;
}

/** Vrai si la requête courante est celle du compte du fondateur (relecture des points de situation, copie en ligne). */
export async function isAdmin(): Promise<boolean> {
  return (await currentAccount())?.tier === "owner";
}

/** Accès aux espaces privés : connecté (n'importe quel compte), ou développement local sans mot de passe configuré. */
export async function privateAccessOpen(): Promise<boolean> {
  if ((await currentAccount()) !== null) return true;
  return !adminConfigured() && process.env.NODE_ENV !== "production";
}
