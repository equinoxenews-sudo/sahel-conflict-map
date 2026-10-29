import { estimateInputTokens, type AiUsage } from "./aiBudget";

// Lecture d'une réponse de l'API Messages en streaming (« stream": true », événements SSE).
// Deux délais (étape 4 du chantier Synthèses du jour) :
//  - inactivité : aucun progrès depuis `idleMs` (les événements « ping » ne comptent pas,
//    seuls les débuts de message ou de bloc, le texte et la fin de génération en sont un) ;
//  - absolu : `deadline`, quelle que soit l'activité.
// Une réponse partielle n'est jamais une génération valide : sans « message_stop »,
// la lecture échoue, même si du texte est arrivé.

export interface StreamedMessage {
  text: string;
  stopReason: string | null;
  usage: AiUsage;
}

/** Ce qui était arrivé avant l'échec : jetons d'entrée annoncés par l'API et texte reçu (pour estimer la sortie facturée). */
export interface PartialStream {
  inputTokens: number;
  outputChars: number;
}

/** Coupure : « idle » = plus aucun progrès, « deadline » = délai absolu atteint. Le message garde « was aborted »,
 *  que le workflow sync-briefs.yml reconnaît pour ne pas relancer aussitôt. */
export class StreamCutError extends Error {
  constructor(readonly cut: "idle" | "deadline", readonly waitedMs: number, readonly partial: PartialStream) {
    super(cut === "idle"
      ? `This operation was aborted : aucune progression depuis ${Math.round(waitedMs / 1000)} s`
      : `This operation was aborted : délai absolu atteint`);
  }
}

/** Erreur annoncée par l'API au milieu de la réponse (événement « error », par exemple overloaded_error), ou flux
 *  terminé sans « message_stop ». Dans les deux cas la réponse est incomplète, donc rejetée. */
export class StreamBrokenError extends Error {
  constructor(readonly errorType: string | null, message: string, readonly partial: PartialStream) {
    super(message);
  }
}

/** Jetons facturés estimés d'un flux interrompu : l'entrée annoncée (à défaut estimée sur le prompt) et le texte reçu. */
export function partialUsage(partial: PartialStream, promptChars: number): AiUsage {
  return {
    inputTokens: partial.inputTokens || estimateInputTokens(promptChars),
    outputTokens: estimateInputTokens(partial.outputChars),
    webSearches: 0,
  };
}

interface StreamEvent {
  type?: string;
  message?: { usage?: { input_tokens?: number } };
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  usage?: { output_tokens?: number };
  error?: { type?: string; message?: string };
}

/** Promesse qui échoue après `ms`, annulable. Passe par setTimeout (simulable dans les tests). */
function timer(ms: number): { promise: Promise<never>; clear: () => void } {
  let id: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    id = setTimeout(() => reject(new Error("timer")), Math.max(ms, 0));
  });
  promise.catch(() => {});
  return { promise, clear: () => clearTimeout(id) };
}

/**
 * Lit le flux d'une réponse 200 jusqu'à « message_stop ». `controller` est celui de la requête :
 * il est annulé en cas de coupure, pour fermer la connexion.
 */
export async function readMessageStream(
  res: Response,
  opts: { idleMs: number; deadline: number; controller: AbortController },
): Promise<StreamedMessage> {
  if (!res.body) throw new StreamBrokenError(null, "Réponse en streaming sans corps", { inputTokens: 0, outputChars: 0 });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let stopReason: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastProgress = Date.now();
  const partial = (): PartialStream => ({ inputTokens, outputChars: text.length });

  const handle = (event: StreamEvent): boolean => {
    switch (event.type) {
      case "message_start":
        inputTokens = event.message?.usage?.input_tokens ?? 0;
        break;
      case "content_block_start":
      case "content_block_stop":
        break;
      case "content_block_delta":
        if (event.delta?.type === "text_delta") text += event.delta.text ?? "";
        break;
      case "message_delta":
        stopReason = event.delta?.stop_reason ?? stopReason;
        outputTokens = event.usage?.output_tokens ?? outputTokens;
        break;
      case "message_stop":
        return true;
      case "error":
        throw new StreamBrokenError(
          event.error?.type ?? null,
          `Erreur de l'API en cours de réponse : ${event.error?.type ?? "inconnue"}${event.error?.message ? ` (${event.error.message.slice(0, 200)})` : ""}`,
          partial(),
        );
      default:
        // « ping » et types inconnus : la connexion vit, mais la génération n'a pas avancé.
        return false;
    }
    lastProgress = Date.now();
    return false;
  };

  try {
    for (;;) {
      const now = Date.now();
      const idleLeft = lastProgress + opts.idleMs - now;
      const deadlineLeft = opts.deadline - now;
      const cut: "idle" | "deadline" = idleLeft <= deadlineLeft ? "idle" : "deadline";
      const wait = timer(Math.min(idleLeft, deadlineLeft));
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await Promise.race([reader.read(), wait.promise]);
      } catch (err) {
        if (err instanceof Error && err.message === "timer") {
          opts.controller.abort();
          throw new StreamCutError(cut, cut === "idle" ? Date.now() - lastProgress : 0, partial());
        }
        throw err;
      } finally {
        wait.clear();
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      // Un événement SSE se termine par une ligne vide ; seule la ligne « data: » porte le JSON.
      let end: number;
      while ((end = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const raw = buffer.slice(0, end);
        buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, "");
        const data = raw.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        let event: StreamEvent;
        try {
          event = JSON.parse(data) as StreamEvent;
        } catch {
          continue;
        }
        if (handle(event)) return { text, stopReason, usage: { inputTokens, outputTokens, webSearches: 0 } };
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  throw new StreamBrokenError(null, "Réponse interrompue avant sa fin (pas de message_stop)", partial());
}
