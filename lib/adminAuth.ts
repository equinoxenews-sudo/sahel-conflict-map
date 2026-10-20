import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Compte du site. Il n'y a pas d'inscription : un seul compte, dont l'identifiant est « Nicof » (ou
// ADMIN_USER si définie) et le mot de passe la variable ADMIN_PASSWORD. La connexion pose un cookie
// httpOnly de sept jours ; sans ADMIN_PASSWORD, la connexion est fermée pour tout le monde.
// Ce compte ouvre « Mon espace », « Investigation » (dossiers et leur copie en ligne) et l'écran de
// relecture des points de situation.
export const ADMIN_COOKIE = "equinoxe_session";
export const ADMIN_COOKIE_MAX_AGE = 7 * 86400;
export const DEFAULT_ACCOUNT_ID = "Nicof";

function configuredPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  return value ? value : null;
}

/** Identifiant du compte (casse conservée pour l'affichage). */
export function accountId(): string {
  const value = process.env.ADMIN_USER?.trim().replace(/^["']|["']$/g, "");
  return value ? value : DEFAULT_ACCOUNT_ID;
}

/** Les identifiants se comparent sans tenir compte de la casse ni des espaces autour. */
export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

// Le cookie ne contient ni l'identifiant ni le mot de passe, seulement leur empreinte salée.
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

/** Jeton à poser en cookie si l'identifiant et le mot de passe saisis sont les bons, sinon null. */
export function tokenForCredentials(identifier: unknown, password: unknown): string | null {
  const expected = configuredPassword();
  if (!expected || typeof identifier !== "string" || typeof password !== "string") return null;
  const given = tokenFor(identifier, password);
  const wanted = tokenFor(accountId(), expected);
  return safeEqual(given, wanted) ? wanted : null;
}

/** Identifiant du compte connecté (cookie valide), sinon null. */
export async function currentUser(): Promise<string | null> {
  const password = configuredPassword();
  if (!password) return null;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return typeof value === "string" && safeEqual(value, tokenFor(accountId(), password)) ? accountId() : null;
}

/** Vrai si la requête courante porte un cookie de connexion valide. */
export async function isAdmin(): Promise<boolean> {
  return (await currentUser()) !== null;
}

/** Accès aux espaces privés : connecté, ou développement local sans mot de passe configuré. */
export async function privateAccessOpen(): Promise<boolean> {
  if (await isAdmin()) return true;
  return !adminConfigured() && process.env.NODE_ENV !== "production";
}
