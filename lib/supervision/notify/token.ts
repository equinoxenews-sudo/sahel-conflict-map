import { createHmac, timingSafeEqual } from "node:crypto";

// Supervision V1, Lot 9 : lien de confirmation d'une adresse e-mail. Jeton SANS état (rien n'est stocké) : il porte l'identifiant de la
// Supervision, l'adresse et une date d'expiration, signés par HMAC-SHA256 avec un secret du serveur. Il ne prouve que « quelqu'un qui lit
// cette boîte a cliqué » ; la base ne confirme l'adresse que si elle est ENCORE celle des préférences (sv_confirm_recipient).

export const TOKEN_TTL_HOURS = 48;

/** Secret de signature : NOTIFY_TOKEN_SECRET si défini, sinon celui des tâches planifiées. Vide = aucun lien ne peut être signé ni vérifié. */
export function notifyTokenSecret(): string {
  return process.env.NOTIFY_TOKEN_SECRET ?? process.env.CRON_SECRET ?? "";
}

const b64 = (buffer: Buffer | string) => Buffer.from(buffer).toString("base64url");

function sign(body: string, secret: string): string {
  return b64(createHmac("sha256", secret).update(body).digest());
}

export function signConfirmToken(supervisionId: string, email: string, secret: string, now: Date = new Date(), ttlHours = TOKEN_TTL_HOURS): string {
  if (!secret) throw new Error("Secret de signature absent.");
  const body = b64(JSON.stringify({ s: supervisionId, e: email, x: now.getTime() + ttlHours * 3_600_000 }));
  return `${body}.${sign(body, secret)}`;
}

export type TokenCheck = { ok: true; supervisionId: string; email: string } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyConfirmToken(token: string, secret: string, now: Date = new Date()): TokenCheck {
  if (!secret || typeof token !== "string" || token.length > 600) return { ok: false, reason: "malformed" };
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return { ok: false, reason: "malformed" };
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "bad_signature" };
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { s?: unknown; e?: unknown; x?: unknown };
    if (typeof parsed.s !== "string" || typeof parsed.e !== "string" || typeof parsed.x !== "number") return { ok: false, reason: "malformed" };
    if (now.getTime() > parsed.x) return { ok: false, reason: "expired" };
    return { ok: true, supervisionId: parsed.s, email: parsed.e };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
