import assert from "node:assert/strict";
import test from "node:test";
import { partialUsage, readMessageStream, StreamBrokenError, StreamCutError } from "../lib/anthropicStream";

type Event = Record<string, unknown> & { type: string };
const encoder = new TextEncoder();
const sse = (event: Event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

const start: Event = { type: "message_start", message: { usage: { input_tokens: 1200, output_tokens: 1 } } };
const delta = (text: string): Event => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
const fullReply: Event[] = [
  start,
  { type: "ping" },
  { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
  delta("[1,"),
  delta("2]"),
  { type: "content_block_stop", index: 0 },
  { type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 300 } },
  { type: "message_stop" },
];

/** Flux qui livre chaque morceau après son délai (minuteries simulées), puis se ferme ou reste ouvert. */
function timedResponse(steps: [number, string][], close: boolean): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [delay, chunk] of steps) {
        if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay));
        controller.enqueue(encoder.encode(chunk));
      }
      if (close) controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};
/** Avance l'horloge simulée par pas, en laissant les promesses avancer entre deux pas. */
async function advance(t: { mock: { timers: { tick: (ms: number) => void } } }, ms: number, step = 1000) {
  for (let done = 0; done < ms; done += step) {
    t.mock.timers.tick(step);
    await settle();
  }
}
const options = (idleMs: number, deadlineIn: number) => ({ idleMs, deadline: Date.now() + deadlineIn, controller: new AbortController() });

test("Un flux complet donne le texte, la fin de génération et les jetons ; un événement coupé entre deux morceaux est recollé", async () => {
  const raw = fullReply.map(sse).join("");
  const res = timedResponse([[0, raw.slice(0, 137)], [0, raw.slice(137)]], true);
  const message = await readMessageStream(res, options(45_000, 170_000));
  assert.deepEqual(message, { text: "[1,2]", stopReason: "max_tokens", usage: { inputTokens: 1200, outputTokens: 300, webSearches: 0 } });
});

test("Des « ping » seuls ne comptent pas comme progrès : coupure pour inactivité", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const pings: [number, string][] = Array.from({ length: 20 }, () => [10_000, sse({ type: "ping" })]);
  const opts = options(45_000, 170_000);
  const pending = readMessageStream(timedResponse([[0, sse(start)], [0, sse(delta("[") )], ...pings], false), opts);
  const rejected = assert.rejects(pending, (err: unknown) => {
    assert.ok(err instanceof StreamCutError);
    assert.equal(err.cut, "idle");
    assert.match(err.message, /was aborted/);
    assert.deepEqual(err.partial, { inputTokens: 1200, outputChars: 1 });
    return true;
  });
  await advance(t, 60_000);
  await rejected;
  assert.equal(opts.controller.signal.aborted, true);
});

test("Un appel lent qui progresse n'est pas coupé pour inactivité, mais l'est au délai absolu", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const slow: [number, string][] = Array.from({ length: 10 }, () => [30_000, sse(delta("x"))]);
  const pending = readMessageStream(timedResponse([[0, sse(start)], ...slow], false), options(45_000, 170_000));
  const rejected = assert.rejects(pending, (err: unknown) => err instanceof StreamCutError && err.cut === "deadline" && err.partial.outputChars === 5);
  await advance(t, 180_000);
  await rejected;
});

test("Une erreur annoncée en cours de réponse, ou un flux sans fin, rejette la réponse partielle", async () => {
  const withError = [start, delta("[1"), { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }].map(sse).join("");
  await assert.rejects(readMessageStream(timedResponse([[0, withError]], true), options(45_000, 170_000)), (err: unknown) =>
    err instanceof StreamBrokenError && err.errorType === "overloaded_error" && err.partial.outputChars === 2);

  const noStop = fullReply.slice(0, -1).map(sse).join("");
  await assert.rejects(readMessageStream(timedResponse([[0, noStop]], true), options(45_000, 170_000)), (err: unknown) =>
    err instanceof StreamBrokenError && /message_stop/.test(err.message));
});

test("Jetons d'un flux interrompu : entrée annoncée, sinon estimée sur le prompt ; sortie estimée sur le texte reçu", () => {
  assert.deepEqual(partialUsage({ inputTokens: 1200, outputChars: 700 }, 99_999), { inputTokens: 1200, outputTokens: 200, webSearches: 0 });
  assert.deepEqual(partialUsage({ inputTokens: 0, outputChars: 0 }, 3500), { inputTokens: 1000, outputTokens: 0, webSearches: 0 });
});
