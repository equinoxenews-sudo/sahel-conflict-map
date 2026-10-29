import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeBriefs, type CallFailure, type SourceArticle } from "../lib/synthesizeBriefs";
import { streamReply } from "./streamReply";
import { wellFormed } from "../lib/wellFormed";

test("un texte sans caractère invalide est renvoyé tel quel, emojis entiers compris", () => {
  const text = "Frappe à Bogotá 🔴 puis 🇧🇷 et 𝒳 : fin";
  assert.equal(wellFormed(text), text);
  assert.equal(wellFormed(""), "");
});

test("une moitié d'emoji orpheline est remplacée par le caractère de remplacement", () => {
  const cut = ("x".repeat(698) + "🔴 suite").slice(0, 699);
  assert.equal(cut.charCodeAt(698), 0xd83d);
  assert.equal(wellFormed(cut), "x".repeat(698) + "�");
  // Moitié basse isolée (début coupé) et moitié haute au milieu d'un texte.
  assert.equal(wellFormed("\udd34 début"), "� début");
  assert.equal(wellFormed("a\ud83db"), "a�b");
});

test("un drapeau coupé en deux : la première lettre reste entière, la moitié orpheline disparaît", () => {
  const flag = "\u{1F1E7}\u{1F1F7}"; // deux lettres régionales, chacune sur deux unités
  const cut = flag.slice(0, 3);
  assert.equal(wellFormed(cut), "\u{1F1E7}�");
});

const sources = (bodyText: string): SourceArticle[] => [
  { title: "Message Telegram", url: "https://t.me/test/1", domain: "t.me/test", summary: null, bodyText, imageUrl: null },
];

test("une source coupée au milieu d'un emoji ne produit plus de requête invalide", async (t) => {
  const oldKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-only";
  t.after(() => {
    if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = oldKey;
  });
  const sent: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
    sent.push(body.messages[0].content);
    return streamReply("[]", { inputTokens: 10, outputTokens: 1 });
  });
  const brokenBody = ("y".repeat(699) + "🔴 reste").slice(0, 700);
  await synthesizeBriefs("Amérique du Sud", sources(brokenBody));
  assert.equal(sent.length, 1);
  assert.equal(wellFormed(sent[0]), sent[0], "le prompt ne contient aucune moitié d'emoji orpheline");
  assert.ok(sent[0].includes("y".repeat(699) + "�"));
});

test("le message d'erreur de l'API est conservé (200 caractères au plus) dans l'échec signalé", async (t) => {
  const oldKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-only";
  t.after(() => {
    if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = oldKey;
  });
  const message = "The request body is not valid JSON: no low surrogate in string. " + "z".repeat(400);
  t.mock.method(globalThis, "fetch", async () =>
    new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message } }), { status: 400 }),
  );
  const failures: CallFailure[] = [];
  await assert.rejects(synthesizeBriefs("Amérique du Sud", sources("Texte"), [], undefined, true, "", null, (failure) => failures.push(failure)), /400/);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].errorType, "invalid_request_error");
  assert.equal(failures[0].errorMessage?.length, 200);
  assert.match(failures[0].errorMessage ?? "", /^The request body is not valid JSON/);
});
