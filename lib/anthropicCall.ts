// Appel simple à l'API Anthropic (sans recherche web ni outils) pour les petits traitements : une requête, une réponse
// texte, quelques reprises si le service est surchargé. Utilisé par la traduction des fiches OSINT et par la veille
// hebdomadaire. Les synthèses du jour ont leur propre chemin (lib/synthesizeBriefs.ts : journal détaillé, reprises par lot).
import { usageFromResponse, type AiUsage } from "./aiBudget";
import { classifyApiError, parseRetryAfter, retryDelayMs } from "./anthropicErrors";
import { wellFormed } from "./wellFormed";

const API_URL = "https://api.anthropic.com/v1/messages";

export interface AnthropicCallOptions {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  timeoutMs?: number;
  /** Appelé avant chaque pause de reprise (journal du traitement). */
  onRetry?: (status: number, kind: string, pauseMs: number) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Réponse texte du modèle et jetons utilisés. Les refus passagers (surcharge, débit) sont retentés deux fois au plus. */
export async function callAnthropic(options: AnthropicCallOptions): Promise<{ text: string; usage: AiUsage }> {
  for (let retry = 1; ; retry++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "x-api-key": options.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: options.model, max_tokens: options.maxTokens, messages: [{ role: "user", content: wellFormed(options.prompt) }] }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
    });
    if (res.ok) {
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      return { text: data.content?.find((block) => block.type === "text")?.text ?? "", usage: usageFromResponse(data) };
    }
    let type: string | null = null;
    let message: string | null = null;
    try {
      const body = (await res.json()) as { error?: { type?: string; message?: string } };
      type = body.error?.type ?? null;
      message = body.error?.message ?? null;
    } catch {
      // corps illisible : le statut suffit
    }
    const kind = classifyApiError(res.status, type, message);
    const pause = retryDelayMs(kind, retry, parseRetryAfter(res.headers.get("retry-after")));
    if (pause === null) throw new Error(`API Anthropic : ${res.status}${type ? ` (${type})` : ""}${kind === "spend_limit" ? " — plafond de dépenses ou crédit épuisé" : ""}`);
    options.onRetry?.(res.status, kind, pause);
    await sleep(pause);
  }
}
