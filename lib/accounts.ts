import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Comptes individuels du site (table `accounts`, supabase/add-supervision.sql). Module pur, sans accès réseau ni base :
// hachage des mots de passe, session signée et description des offres. Les mots de passe ne sont jamais stockés ni
// journalisés en clair : seul leur hachage salé existe.

/** Offres : « owner » est le compte du fondateur (aucun plafond), les autres suivent la grille tarifaire. */
export type Tier = "owner" | "plus" | "intelligence" | "pro" | "enterprise";

export const TIERS: readonly Tier[] = ["owner", "plus", "intelligence", "pro", "enterprise"];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

export interface Account {
  /** Identifiant normalisé (minuscules, sans espaces) : clé du compte et propriétaire des données. */
  id: string;
  /** Identifiant tel qu'affiché. */
  name: string;
  tier: Tier;
  timezone: string;
}

/** Identifiant normalisé : sert de clé de compte. */
export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

/** Un identifiant valide : 3 à 40 caractères, lettres, chiffres, point, tiret, souligné. */
export function isValidIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9._-]{3,40}$/.test(normalizeIdentifier(value));
}

const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 10;

/** Hachage salé d'un mot de passe : « scrypt$N$r$p$sel$empreinte » (base64). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Vrai si le mot de passe correspond au hachage enregistré (comparaison à temps constant). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  try {
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (expected.length === 0) return false;
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// --- Session signée -------------------------------------------------------------------------------------------------
// Le cookie contient l'identifiant, l'offre et la date d'expiration, signés (HMAC-SHA256) : il ne peut être ni
// fabriqué ni modifié sans le secret du serveur, et ne contient aucun mot de passe.

export const SESSION_PREFIX = "v1.";
export const SESSION_MAX_AGE_SECONDS = 7 * 86400;

interface SessionPayload {
  id: string;
  name: string;
  tier: Tier;
  timezone: string;
  /** Expiration, en secondes depuis 1970. */
  exp: number;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signSession(account: Account, secret: string, now: number = Date.now()): string {
  const payload: SessionPayload = { ...account, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${SESSION_PREFIX}${body}.${sign(body, secret)}`;
}

/** Le compte d'une session valide et non expirée, sinon null. */
export function readSession(token: string, secret: string, now: number = Date.now()): Account | null {
  if (!token.startsWith(SESSION_PREFIX)) return null;
  const [body, signature, ...rest] = token.slice(SESSION_PREFIX.length).split(".");
  if (!body || !signature || rest.length > 0) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    if (typeof payload.id !== "string" || typeof payload.name !== "string" || !isTier(payload.tier)) return null;
    return {
      id: payload.id,
      name: payload.name,
      tier: payload.tier,
      timezone: typeof payload.timezone === "string" && payload.timezone ? payload.timezone : "Europe/Paris",
    };
  } catch {
    return null;
  }
}
