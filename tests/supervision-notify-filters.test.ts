import assert from "node:assert/strict";
import test from "node:test";
import type { Alert } from "../lib/supervision/alerts/rules";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";
import { EMPTY_FILTERS, FILTER_TERMS_MAX, comparable, describeFilters, filtersOf, hasFilters, matchesFilters, validateFilters, type AlertFilters } from "../lib/supervision/notify/filters";
import { selectAlertsToQueue, validateRules, type NotificationRules } from "../lib/supervision/notify/rules";

const event = (id: string, extra: Partial<BoardEvent> = {}): BoardEvent => ({
  id,
  kind: "article",
  title: `Attaque à Zamfara : ${id}`,
  theme: "securite",
  priority: "critique",
  verification: "signalement",
  at: "2026-11-10T10:00:00Z",
  place: "Nigeria",
  publications: 1,
  ...extra,
});
const alertOf = (e: BoardEvent): Alert => ({ id: e.id, level: "critique", event: e, why: "Article analysé d'importance haute." });
const filters = (extra: Partial<AlertFilters> = {}): AlertFilters => ({ ...EMPTY_FILTERS, ...extra });
const rules = (f: AlertFilters): NotificationRules => ({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "moi@exemple.fr", recipientVerified: true, enabledAt: "2026-11-09T00:00:00Z", filters: f });

test("sans règle, tout passe ; les règles ne se lisent que si elles existent", () => {
  assert.equal(matchesFilters(event("a-1"), EMPTY_FILTERS), true);
  assert.equal(hasFilters(EMPTY_FILTERS), false);
  assert.equal(hasFilters(filters({ themes: ["conflits"] })), true);
  assert.match(describeFilters(EMPTY_FILTERS), /Aucune restriction/);
});

test("thèmes : seuls les thèmes choisis passent", () => {
  const f = filters({ themes: ["conflits", "politique"] });
  assert.equal(matchesFilters(event("a-1", { theme: "conflits" }), f), true);
  assert.equal(matchesFilters(event("a-2", { theme: "securite" }), f), false);
  assert.equal(matchesFilters(event("a-3", { theme: "humanitaire" }), f), false);
});

test("mots-clés : au moins un doit être cité (titre, résumé ou lieu), sans accents ni majuscules, sur des mots entiers", () => {
  const f = filters({ keywords: ["Zamfara", "boko haram"] });
  assert.equal(matchesFilters(event("a-1", { title: "Attaque à ZAMFARA" }), f), true);
  assert.equal(matchesFilters(event("a-2", { title: "Un autre sujet", summary: "Des combats attribués à Boko-Haram." }), f), true, "résumé, casse et trait d'union");
  assert.equal(matchesFilters(event("a-3", { title: "Autre sujet", place: "Zamfara State" }), f), true, "lieu");
  assert.equal(matchesFilters(event("a-4", { title: "Violence à Lagos" }), f), false);
  assert.equal(matchesFilters(event("a-5", { title: "Attaque à Zamfarabad" }), f), false, "mot entier : « Zamfara » n'est pas « Zamfarabad »");
  const accents = filters({ keywords: ["Ségou"] });
  assert.equal(matchesFilters(event("a-6", { title: "Combats près de SEGOU" }), accents), true, "accents ignorés dans les deux sens");
  assert.equal(matchesFilters(event("a-7", { title: "Combats près de Ségou" }), filters({ keywords: ["segou"] })), true);
});

test("exclusions : elles l'emportent toujours, même si un mot-clé est cité", () => {
  const f = filters({ keywords: ["Zamfara"], exclusions: ["football", "match"] });
  assert.equal(matchesFilters(event("a-1", { title: "Attaque à Zamfara" }), f), true);
  assert.equal(matchesFilters(event("a-2", { title: "Match de football à Zamfara" }), f), false);
  assert.equal(matchesFilters(event("a-3", { title: "Attaque à Zamfara", summary: "après le match" }), f), false);
  assert.equal(matchesFilters(event("a-4", { title: "Rematch à Zamfara" }), f), true, "mot entier : « match » n'est pas « rematch »");
});

test("les trois règles se cumulent : thème ET (un mot-clé) ET aucune exclusion", () => {
  const f = filters({ themes: ["securite"], keywords: ["Zamfara"], exclusions: ["football"] });
  assert.equal(matchesFilters(event("a-1"), f), true);
  assert.equal(matchesFilters(event("a-2", { theme: "politique" }), f), false);
  assert.equal(matchesFilters(event("a-3", { title: "Autre lieu" }), f), false);
  assert.equal(matchesFilters(event("a-4", { title: "Attaque à Zamfara, football" }), f), false);
  assert.equal(describeFilters(f), "Seules les alertes thèmes : securite ; citant l'un de : Zamfara ; sans : football.");
});

test("forme comparable : minuscules, sans accents, ponctuation en espaces, bordée d'espaces", () => {
  assert.equal(comparable("  Été, à L'Ouest !  "), " ete a l ouest ");
  assert.equal(comparable("Boko-Haram"), " boko haram ");
});

test("saisie : doublons fusionnés, thèmes dans l'ordre, termes nettoyés, limites annoncées, rien d'autre qu'une liste de textes", () => {
  const ok = validateFilters({ themes: ["politique", "conflits", "conflits"], keywords: [" Zamfara ", "zamfara", "Boko\nHaram"], exclusions: ["football"] });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { themes: ["conflits", "politique"], keywords: ["Zamfara", "Boko Haram"], exclusions: ["football"] });
  assert.deepEqual(validateFilters(undefined), { ok: true, value: EMPTY_FILTERS });
  assert.deepEqual(validateFilters(null), { ok: true, value: EMPTY_FILTERS });
  assert.deepEqual(validateFilters({}), { ok: true, value: EMPTY_FILTERS });
  for (const bad of [
    "texte",
    { themes: ["economie"] },
    { themes: "conflits" },
    { keywords: "Zamfara" },
    { keywords: [12] },
    { keywords: ["a"] },
    { keywords: ["x".repeat(61)] },
    { keywords: ["!!!"] },
    { exclusions: Array.from({ length: FILTER_TERMS_MAX + 1 }, (_, n) => `terme ${n}`) },
  ]) {
    assert.equal(validateFilters(bad).ok, false, JSON.stringify(bad));
  }
});

test("lecture de la base : tolérante, jamais d'exception, une valeur illisible vaut « aucune restriction »", () => {
  assert.deepEqual(filtersOf(null), EMPTY_FILTERS);
  assert.deepEqual(filtersOf("n'importe quoi"), EMPTY_FILTERS);
  assert.deepEqual(filtersOf({}), EMPTY_FILTERS);
  assert.deepEqual(filtersOf({ themes: ["conflits", "inconnu"], keywords: ["Zamfara", 3, ""], exclusions: "x" }), { themes: ["conflits"], keywords: ["Zamfara"], exclusions: [] });
});

test("préférences : les règles sont validées avec le reste et renvoyées normalisées", () => {
  const ok = validateRules({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "moi@exemple.fr", filters: { themes: ["conflits"], keywords: ["Zamfara"], exclusions: [] } });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value.filters, { themes: ["conflits"], keywords: ["Zamfara"], exclusions: [] });
  const none = validateRules({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "moi@exemple.fr" });
  assert.ok(none.ok);
  if (none.ok) assert.deepEqual(none.value.filters, EMPTY_FILTERS, "règles absentes : aucune restriction");
  const bad = validateRules({ enabled: true, immediateLevels: ["critique"], digest: "off", recipient: "moi@exemple.fr", filters: { themes: ["economie"] } });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.errors.join(" "), /thème est inconnu/);
});

test("mise en file : les règles restreignent les e-mails, jamais n'ajoutent une alerte", () => {
  const alerts = [
    alertOf(event("a-1", { title: "Attaque à Zamfara", theme: "securite" })),
    alertOf(event("a-2", { title: "Combats à Ségou", theme: "conflits" })),
    alertOf(event("a-3", { title: "Match de football à Zamfara", theme: "securite" })),
  ];
  const ids = (f: AlertFilters) => selectAlertsToQueue(alerts, rules(f), new Map(), new Set()).map((a) => a.eventRef);
  assert.deepEqual(ids(EMPTY_FILTERS), ["a-1", "a-2", "a-3"]);
  assert.deepEqual(ids(filters({ keywords: ["Zamfara"] })), ["a-1", "a-3"]);
  assert.deepEqual(ids(filters({ keywords: ["Zamfara"], exclusions: ["football"] })), ["a-1"]);
  assert.deepEqual(ids(filters({ themes: ["conflits"] })), ["a-2"]);
  assert.deepEqual(ids(filters({ themes: ["humanitaire"] })), [], "aucun événement de ce thème : rien n'est envoyé");
  // Un événement « information » reste hors alerte quelles que soient les règles : les règles ne font que filtrer des alertes existantes.
  assert.deepEqual(selectAlertsToQueue([], rules(filters({ keywords: ["Zamfara"] })), new Map(), new Set()), []);
});
