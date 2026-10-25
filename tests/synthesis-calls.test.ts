import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeBriefs, TIMEOUT_MS, type CallFailure, type SourceArticle } from "../lib/synthesizeBriefs";

const sources: SourceArticle[] = [0, 1].map((id) => ({
  title: `source ${id}`,
  url: `https://source${id}.test/article`,
  domain: `source${id}.test`,
  summary: "Texte",
  bodyText: "Texte",
  imageUrl: null,
}));

const okReply = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  new Response(
    JSON.stringify({ content: [{ type: "text", text: "[]" }], stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 300 }, ...extra }),
    { status: 200, headers },
  );
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

test("Un appel coupé par le délai est signalé avec ses jetons d'entrée estimés ; un refus rapide aussi, sans jetons", async (t) => {
  useKey(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  // Réponse qui n'arrive jamais : seule l'annulation du délai la fait échouer, comme sur le réseau.
  t.mock.method(globalThis, "fetch", (_url: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("This operation was aborted", "AbortError")));
    }),
  );
  const failures: CallFailure[] = [];
  const pending = synthesizeBriefs("Afrique", sources, [], undefined, true, "", null, (failure) => failures.push(failure));
  const rejected = assert.rejects(pending, /aborted/);
  t.mock.timers.tick(TIMEOUT_MS + 1000);
  await rejected;
  assert.equal(failures.length, 1);
  assert.equal(failures[0].kind, "aborted");
  assert.ok(failures[0].usage.inputTokens > 100);
  assert.equal(failures[0].retryInMs, null);

  // Un refus rapide non passager (503) : signalé sans jetons, jamais retenté.
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 503 }));
  await assert.rejects(synthesizeBriefs("Afrique", sources, [], undefined, true, "", null, (failure) => failures.push(failure)));
  assert.equal(failures.length, 2);
  assert.equal(failures[1].kind, "http");
  assert.equal(failures[1].status, 503);
  assert.equal(failures[1].usage.inputTokens, 0);
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

test("La requête envoyée ne change pas : même modèle, mêmes réglages, même prompt", async (t) => {
  useKey(t);
  const bodies: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return okReply();
  });
  await synthesizeBriefs("Afrique", sources);
  assert.equal(bodies.length, 1);
  assert.deepEqual(Object.keys(bodies[0]).sort(), ["max_tokens", "messages", "model"]);
  assert.equal(bodies[0].max_tokens, 9000);
  const messages = bodies[0].messages as { role: string; content: string }[];
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "user");
  assert.match(messages[0].content, /Tu es un journaliste/);
});
