import assert from "node:assert/strict";
import test from "node:test";
import { IDLE_TIMEOUT_MS, synthesizeBriefs, TIMEOUT_MS, type CallFailure, type SourceArticle } from "../lib/synthesizeBriefs";
import { streamReply } from "./streamReply";

const sources: SourceArticle[] = [0, 1].map((id) => ({
  title: `source ${id}`,
  url: `https://source${id}.test/article`,
  domain: `source${id}.test`,
  summary: "Texte",
  bodyText: "Texte",
  imageUrl: null,
}));

const okReply = (extra: { stop_reason?: string } = {}, headers: Record<string, string> = {}) =>
  streamReply("[]", { stopReason: extra.stop_reason, headers });
const errorReply = (status: number, type: string, message: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ type: "error", error: { type, message } }), { status, headers });
const useKey = (t: { after: (fn: () => void) => void }) => {
  const oldKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-only";
  t.after(() => {
    if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = oldKey;
  });
};
/** Laisse les promesses en attente avancer d'un cran (setImmediate n'est pas simulé). */
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test("Un appel bloqué est coupé pour inactivité, retenté une fois, puis abandonné ; un refus rapide est signalé sans jetons", async (t) => {
  useKey(t);
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  // Réponse qui n'arrive jamais : seule l'annulation la fait échouer, comme sur le réseau.
  const hanging = t.mock.method(globalThis, "fetch", (_url: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("This operation was aborted", "AbortError")));
    }),
  );
  const failures: CallFailure[] = [];
  const pending = synthesizeBriefs("Afrique", sources, [], undefined, true, "", null, (failure) => failures.push(failure));
  const rejected = assert.rejects(pending, /was aborted : aucune progression/);
  t.mock.timers.tick(IDLE_TIMEOUT_MS);
  await settle();
  t.mock.timers.tick(IDLE_TIMEOUT_MS);
  await rejected;
  assert.equal(hanging.mock.callCount(), 2);
  assert.deepEqual(failures.map((f) => [f.kind, f.cut, f.retryInMs]), [["aborted", "idle", 0], ["aborted", "idle", null]]);
  assert.ok(failures[0].usage.inputTokens > 100);
  assert.ok(TIMEOUT_MS - 2 * IDLE_TIMEOUT_MS < 90_000, "le deuxième blocage ne laisse plus le temps d'un troisième appel");

  // Un refus rapide non passager (503) : signalé sans jetons, jamais retenté.
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 503 }));
  await assert.rejects(synthesizeBriefs("Afrique", sources, [], undefined, true, "", null, (failure) => failures.push(failure)));
  assert.equal(failures.length, 3);
  assert.equal(failures[2].kind, "http");
  assert.equal(failures[2].status, 503);
  assert.equal(failures[2].usage.inputTokens, 0);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("Un appel réussi remonte sa durée, sa fin de génération et son identifiant de requête", async (t) => {
  useKey(t);
  t.mock.method(globalThis, "fetch", async () => okReply({ stop_reason: "max_tokens" }, { "request-id": "req_abc" }));
  const seen: { inputTokens: number; outputTokens: number; stopReason: string | null; requestId: string | null; attempt: number }[] = [];
  await synthesizeBriefs("Afrique", sources, [], (usage, meta) =>
    seen.push({ inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, stopReason: meta.stopReason, requestId: meta.requestId, attempt: meta.attempt }),
  );
  assert.deepEqual(seen, [{ inputTokens: 1200, outputTokens: 300, stopReason: "max_tokens", requestId: "req_abc", attempt: 1 }]);
});

test("Une surcharge (529) est retentée après une pause, puis la rédaction aboutit", async (t) => {
  useKey(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const replies = [errorReply(529, "overloaded_error", "Overloaded", { "request-id": "req_x" }), okReply()];
  const fetchMock = t.mock.method(globalThis, "fetch", async () => replies.shift()!);
  const failures: CallFailure[] = [];
  const attempts: number[] = [];
  const pending = synthesizeBriefs("Afrique", sources, [], (_usage, meta) => attempts.push(meta.attempt), true, "", null, (failure) => failures.push(failure));
  await settle();
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].errorKind, "overloaded");
  assert.equal(failures[0].requestId, "req_x");
  assert.ok(failures[0].retryInMs !== null && failures[0].retryInMs >= 6000 && failures[0].retryInMs <= 10000);
  t.mock.timers.tick(30_000);
  assert.deepEqual(await pending, []);
  assert.equal(fetchMock.mock.callCount(), 2);
  assert.deepEqual(attempts, [2]);
});

test("Une limite de débit (429) passagère est retentée en respectant retry-after, deux reprises au plus", async (t) => {
  useKey(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    errorReply(429, "rate_limit_error", "This request would exceed your organization's rate limit of 50,000 input tokens per minute", { "retry-after": "12" }),
  );
  const failures: CallFailure[] = [];
  const pending = synthesizeBriefs("Afrique", sources, [], undefined, true, "", null, (failure) => failures.push(failure));
  const rejected = assert.rejects(pending, /429/);
  await settle();
  assert.ok((failures[0].retryInMs ?? 0) >= 12_000);
  t.mock.timers.tick(30_000);
  await settle();
  t.mock.timers.tick(60_000);
  await rejected;
  // 1 appel + 2 reprises, pas davantage.
  assert.equal(fetchMock.mock.callCount(), 3);
  assert.equal(failures.at(-1)?.retryInMs, null);
});

test("Un plafond de dépenses (429 ou 400) n'est jamais retenté et le dit clairement", async (t) => {
  useKey(t);
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    errorReply(429, "rate_limit_error", "You have reached your specified workspace API usage limits. You will regain access on 2026-11-01."),
  );
  await assert.rejects(synthesizeBriefs("Afrique", sources), /plafond de dépenses/);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async () => errorReply(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."));
  await assert.rejects(synthesizeBriefs("Afrique", sources), /plafond de dépenses/);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("Une réponse interrompue par une erreur de l'API n'est jamais utilisée ni retentée", async (t) => {
  useKey(t);
  const broken = [
    { type: "message_start", message: { usage: { input_tokens: 1500, output_tokens: 1 } } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "[]" } },
    { type: "error", error: { type: "overloaded_error", message: "Overloaded" } },
  ].map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join("");
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(broken, { status: 200 }));
  const failures: CallFailure[] = [];
  let used = false;
  await assert.rejects(
    synthesizeBriefs("Afrique", sources, [], () => { used = true; }, true, "", null, (failure) => failures.push(failure)),
    /overloaded_error/,
  );
  assert.equal(used, false);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(failures[0].kind, "stream");
  assert.equal(failures[0].usage.inputTokens, 1500);
});

test("La requête envoyée ne change pas : même modèle, mêmes réglages, même prompt", async (t) => {
  useKey(t);
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return okReply();
  });
  await synthesizeBriefs("Afrique", sources);
  assert.equal(bodies.length, 1);
  assert.deepEqual(Object.keys(bodies[0]).sort(), ["max_tokens", "messages", "model", "stream"]);
  assert.equal(bodies[0].max_tokens, 9000);
  assert.equal(bodies[0].stream, true);
  const messages = bodies[0].messages as { role: string; content: string }[];
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "user");
  assert.match(messages[0].content, /Tu es un journaliste/);
});
