import assert from "node:assert/strict";
import test from "node:test";
import { classifyApiError, describeApiError, MAX_HTTP_RETRIES, parseRetryAfter, retryDelayMs } from "../lib/anthropicErrors";

test("surcharge et limite de débit sont passagères, le plafond de dépenses non", () => {
  assert.equal(classifyApiError(529, "overloaded_error", "Overloaded"), "overloaded");
  assert.equal(
    classifyApiError(429, "rate_limit_error", "This request would exceed your organization's rate limit of 50,000 input tokens per minute"),
    "rate_limited",
  );
  assert.equal(classifyApiError(429, "rate_limit_error", "You have reached your specified workspace API usage limits."), "spend_limit");
  assert.equal(classifyApiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."), "spend_limit");
  assert.equal(classifyApiError(400, "invalid_request_error", "max_tokens: too large"), "other");
  assert.equal(classifyApiError(401, "authentication_error", "invalid x-api-key"), "other");
  assert.equal(classifyApiError(500, "api_error", "Internal server error"), "other");
});

test("pauses de plus en plus longues, deux reprises au plus, jamais pour une autre erreur", () => {
  assert.equal(retryDelayMs("overloaded", 1, null, 0.5), 8000);
  assert.equal(retryDelayMs("overloaded", 2, null, 0.5), 25000);
  assert.equal(retryDelayMs("rate_limited", 3, null), null);
  assert.equal(MAX_HTTP_RETRIES, 2);
  assert.equal(retryDelayMs("spend_limit", 1, null), null);
  assert.equal(retryDelayMs("other", 1, null), null);
});

test("le décalage aléatoire reste entre -20 % et +20 %", () => {
  assert.equal(retryDelayMs("overloaded", 1, null, 0), 6400);
  assert.equal(retryDelayMs("overloaded", 1, null, 1), 9600);
});

test("retry-after plus long que la pause prévue l'emporte, mais pas au-delà d'une minute", () => {
  assert.equal(retryDelayMs("rate_limited", 1, 20_000, 0.5), 20_000);
  assert.equal(retryDelayMs("rate_limited", 1, 2_000, 0.5), 8000);
  assert.equal(retryDelayMs("rate_limited", 1, 90_000, 0.5), null);
});

test("retry-after : secondes en millisecondes, sinon null", () => {
  assert.equal(parseRetryAfter("12"), 12000);
  assert.equal(parseRetryAfter("0"), 0);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT"), null);
});

test("le message d'erreur dit la cause", () => {
  const info = { status: 529, type: "overloaded_error", message: "Overloaded", retryAfterMs: null, requestId: null };
  assert.equal(describeApiError(info, "overloaded"), "Anthropic API error: 529 (overloaded_error)");
  assert.match(describeApiError({ ...info, status: 429 }, "spend_limit"), /plafond de dépenses/);
});
