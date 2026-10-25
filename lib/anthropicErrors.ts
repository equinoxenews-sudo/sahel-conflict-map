// Erreurs de l'API Anthropic : lesquelles valent la peine d'être retentées après une pause, lesquelles non.
// Module sans accès réseau, testé à part (tests/anthropic-errors.test.ts).

export type ApiErrorKind =
  /** 529 : service surchargé, passager. */
  | "overloaded"
  /** 429 de débit (trop de requêtes ou de jetons par minute) : passager. */
  | "rate_limited"
  /** Plafond de dépenses ou crédit épuisé : une pause n'y change rien, il faut agir côté compte. */
  | "spend_limit"
  | "other";

export interface ApiErrorInfo {
  status: number;
  /** Type d'erreur renvoyé par l'API (`error.type`) : overloaded_error, rate_limit_error… */
  type: string | null;
  message: string | null;
  /** En-tête retry-after, converti en millisecondes (null s'il est absent ou illisible). */
  retryAfterMs: number | null;
  /** En-tête request-id, pour retrouver l'appel dans la Console Anthropic. */
  requestId: string | null;
}

/** Messages de l'API quand c'est le plafond de dépenses ou le crédit qui bloque, non le débit. */
const SPEND_LIMIT_PATTERN = /usage limits?|spend(ing)? limit|credit balance|billing|monthly limit/i;

export function classifyApiError(status: number, type: string | null, message: string | null): ApiErrorKind {
  const spend = message ? SPEND_LIMIT_PATTERN.test(message) : false;
  if (status === 429 || type === "rate_limit_error") return spend ? "spend_limit" : "rate_limited";
  if (status === 529 || type === "overloaded_error") return "overloaded";
  if ((status === 400 || status === 402 || status === 403) && spend) return "spend_limit";
  return "other";
}

/** Reprises après une erreur passagère : au plus deux, après une pause de plus en plus longue. */
export const MAX_HTTP_RETRIES = 2;
const BASE_DELAYS_MS = [8_000, 25_000];
/** Une pause plus longue que cela n'est pas attendue : l'appel échoue et le lot reprend au prochain passage. */
const MAX_WAIT_MS = 60_000;

/**
 * Pause avant la reprise n° `retryNumber` (1, 2), ou null s'il ne faut pas reprendre : erreur non passagère,
 * reprises épuisées, ou pause demandée par l'API trop longue. Un en-tête retry-after plus long que la pause
 * prévue l'emporte. `random` (0 à 1) ajoute ±20 % pour que des appels simultanés ne repartent pas ensemble.
 */
export function retryDelayMs(kind: ApiErrorKind, retryNumber: number, retryAfterMs: number | null, random = Math.random()): number | null {
  if (kind !== "overloaded" && kind !== "rate_limited") return null;
  if (retryNumber < 1 || retryNumber > MAX_HTTP_RETRIES) return null;
  const base = BASE_DELAYS_MS[retryNumber - 1] * (0.8 + 0.4 * random);
  const wait = Math.max(base, retryAfterMs ?? 0);
  return wait > MAX_WAIT_MS ? null : Math.round(wait);
}

/** retry-after en secondes (forme utilisée par l'API) → millisecondes ; null sinon. */
export function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : null;
}

/** Erreur de l'API : porte le statut et la catégorie pour que l'appelant sache pourquoi le lot n'a pas été rédigé. */
export class AnthropicApiError extends Error {
  constructor(
    message: string,
    readonly info: ApiErrorInfo,
    readonly kind: ApiErrorKind
  ) {
    super(message);
    this.name = "AnthropicApiError";
  }
}

export function describeApiError(info: ApiErrorInfo, kind: ApiErrorKind): string {
  if (kind === "spend_limit") {
    return `Anthropic API error: plafond de dépenses ou crédit épuisé (${info.status}) — à régler dans la Console Anthropic`;
  }
  return `Anthropic API error: ${info.status}${info.type ? ` (${info.type})` : ""}`;
}
