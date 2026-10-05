import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Accès à l'écran de relecture des points de situation. Le site n'a pas de
// comptes : un mot de passe unique (variable ADMIN_PASSWORD) donne un cookie
// httpOnly. Sans cette variable, l'accès est fermé pour tout le monde.
export const ADMIN_COOKIE = "equinoxe_admin";
export const ADMIN_COOKIE_MAX_AGE = 7 * 86400;

function configuredPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  return value ? value : null;
}

// Le cookie ne contient pas le mot de passe, seulement son empreinte salée.
function tokenFor(password: string): string {
  return createHash("sha256").update(`equinoxe-admin:${password}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function adminConfigured(): boolean {
  return configuredPassword() !== null;
}

/** Jeton à poser en cookie si le mot de passe saisi est le bon, sinon null. */
export function tokenForPassword(input: unknown): string | null {
  const password = configuredPassword();
  if (!password || typeof input !== "string") return null;
  return safeEqual(tokenFor(input), tokenFor(password)) ? tokenFor(password) : null;
}

/** Vrai si la requête courante porte le cookie d'administration valide. */
export async function isAdmin(): Promise<boolean> {
  const password = configuredPassword();
  if (!password) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return typeof value === "string" && safeEqual(value, tokenFor(password));
}
