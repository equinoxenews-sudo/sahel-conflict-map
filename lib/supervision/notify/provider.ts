// Supervision V1, Lot 9 : fournisseur d'envoi d'e-mails (Resend) et mode « sans envoi ». Aucune IA.
//
// RÈGLES DE SÉCURITÉ (cahier des charges : « aucun e-mail réel envoyé depuis le staging sans destinataire de test ») :
//  - par défaut, AUCUN message ne part : mode « sans envoi » (dry_run), les messages sont seulement écrits dans le journal ;
//  - l'envoi réel exige EMAIL_MODE=live ET une clé RESEND_API_KEY ; sans l'une des deux, retour au mode sans envoi ;
//  - sur la base de PRÉPRODUCTION, même en mode live, seuls les destinataires listés dans EMAIL_TEST_RECIPIENTS reçoivent un vrai message ;
//  - la clé n'est jamais journalisée ni renvoyée au navigateur.

export const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
export const DEFAULT_FROM = "Équinoxe Alertes <alertes@alertes.equinoxe.news>";
const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Clé d'idempotence : un renvoi après une réponse perdue ne crée pas un second message chez le fournisseur. */
  idempotencyKey: string;
}

export type SendResult = { ok: true; id: string; dryRun: boolean } | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  readonly name: "resend" | "dry_run";
  send(message: OutgoingEmail): Promise<SendResult>;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class DryRunProvider implements EmailProvider {
  readonly name = "dry_run" as const;
  async send(message: OutgoingEmail): Promise<SendResult> {
    return { ok: true, id: `dry-${message.idempotencyKey}`.slice(0, 80), dryRun: true };
  }
}

export class ResendProvider implements EmailProvider {
  readonly name = "resend" as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: FetchLike,
  ) {}

  async send(message: OutgoingEmail): Promise<SendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as { id?: unknown; message?: unknown; name?: unknown };
      if (response.ok && typeof body.id === "string") return { ok: true, id: body.id, dryRun: false };
      // 429 et 5xx se réessaient ; les autres 4xx (adresse refusée, domaine non vérifié, clé invalide) ne servent à rien de rejouer.
      const retryable = response.status === 429 || response.status >= 500;
      return { ok: false, retryable, error: `Resend ${response.status}${typeof body.name === "string" ? ` ${body.name}` : ""}${typeof body.message === "string" ? ` : ${body.message.slice(0, 160)}` : ""}` };
    } catch (error) {
      return { ok: false, retryable: true, error: error instanceof Error && error.name === "AbortError" ? "Délai dépassé chez le fournisseur." : "Fournisseur injoignable." };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Enveloppe de sécurité : seuls les destinataires autorisés reçoivent un vrai message, les autres restent en « sans envoi ». */
export class AllowListProvider implements EmailProvider {
  constructor(
    private readonly inner: EmailProvider,
    private readonly allowed: ReadonlySet<string>,
    private readonly fallback: EmailProvider = new DryRunProvider(),
  ) {}
  get name() {
    return this.inner.name;
  }
  send(message: OutgoingEmail): Promise<SendResult> {
    return (this.allowed.has(message.to.toLowerCase()) ? this.inner : this.fallback).send(message);
  }
}

export interface MailEnv {
  EMAIL_MODE?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_TEST_RECIPIENTS?: string;
}

export interface ProviderChoice {
  provider: EmailProvider;
  /** « live » seulement si de vrais messages peuvent partir ; sinon « dry_run ». */
  mode: "live" | "dry_run";
  /** Pourquoi on n'envoie pas (affiché à l'utilisateur) ; null en mode live. */
  reason: string | null;
}

export function isStagingDatabase(supabaseUrl: string): boolean {
  try {
    return new URL(supabaseUrl).host.split(".")[0] === STAGING_PROJECT_REF;
  } catch {
    return false;
  }
}

export function testRecipients(value: string | undefined): Set<string> {
  return new Set((value ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0));
}

export function chooseProvider(env: MailEnv, supabaseUrl: string, fetchImpl: FetchLike): ProviderChoice {
  const dry = (reason: string): ProviderChoice => ({ provider: new DryRunProvider(), mode: "dry_run", reason });
  if (env.EMAIL_MODE !== "live") return dry("Mode sans envoi : les messages sont écrits dans le journal mais ne partent pas.");
  if (!env.RESEND_API_KEY) return dry("Mode sans envoi : la clé du fournisseur n'est pas configurée.");
  const live = new ResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM?.trim() || DEFAULT_FROM, fetchImpl);
  if (isStagingDatabase(supabaseUrl)) {
    const allowed = testRecipients(env.EMAIL_TEST_RECIPIENTS);
    if (allowed.size === 0) return dry("Préproduction : aucun destinataire de test autorisé, aucun message réel ne part.");
    return { provider: new AllowListProvider(live, allowed), mode: "live", reason: "Préproduction : seuls les destinataires de test autorisés reçoivent un vrai message." };
  }
  return { provider: live, mode: "live", reason: null };
}
