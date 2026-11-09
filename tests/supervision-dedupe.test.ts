import assert from "node:assert/strict";
import test from "node:test";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";
import { applyFilters } from "../lib/supervision/dashboard/fixtures";
import { dedupeEvents, normalizeUrl } from "../lib/supervision/data/dedupe";

const base: BoardEvent = { id: "x", title: "t", theme: "conflits", priority: "information", verification: "signalement", at: "2026-11-09T12:00:00.000Z", place: "Nigeria", publications: 1 };
const ev = (patch: Partial<BoardEvent>): BoardEvent => ({ ...base, ...patch });

test("adresse normalisée : www, ancre, suivi, barre finale, casse et ordre des paramètres n'y changent rien", () => {
  const same = [
    "https://www.Example.com/a/b/",
    "https://example.com/a/b?utm_source=x&fbclid=1#haut",
    "http://example.com/A/B",
  ].map(normalizeUrl);
  assert.equal(new Set(same).size, 1, JSON.stringify(same));
  assert.equal(normalizeUrl("https://e.com/p?b=2&a=1"), normalizeUrl("https://e.com/p?a=1&b=2"));
  assert.notEqual(normalizeUrl("https://e.com/p?id=1"), normalizeUrl("https://e.com/p?id=2"), "un paramètre utile distingue deux pages");
  for (const bad of [null, undefined, "", "pas une adresse", "ftp://e.com/x", "javascript:alert(1)"]) assert.equal(normalizeUrl(bad as string | null), null);
});

test("doublons : plusieurs lignes d'une même publication deviennent une seule, l'ordre est conservé", () => {
  const input = [
    ev({ id: "e-1", url: "https://news.ng/a", publications: 4, at: "2026-11-09T12:00:00.000Z" }),
    ev({ id: "e-2", url: "https://www.news.ng/a/", publications: 9, at: "2026-11-09T12:00:00.000Z" }),
    ev({ id: "e-3", url: "https://autre.org/b", at: "2026-11-08T12:00:00.000Z" }),
    ev({ id: "e-4", url: "https://news.ng/a?utm_campaign=z", publications: 1, at: "2026-11-07T12:00:00.000Z" }),
  ];
  const { events, merged } = dedupeEvents(input);
  assert.equal(merged, 2);
  assert.deepEqual(events.map((e) => e.id), ["e-2", "e-3"], "le plus repris représente le groupe, à la place de la première occurrence");
  assert.equal(events[0].merged, 2);
  assert.equal(events[1].merged, undefined);
});

test("doublons : un article analysé l'emporte sur un signalement qui cite la même adresse", () => {
  const { events } = dedupeEvents([
    ev({ id: "e-1", kind: "signal", url: "https://news.ng/a", publications: 30 }),
    ev({ id: "a-1", kind: "article", url: "https://news.ng/a", publications: 1, domains: ["news.ng"] }),
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "a-1");
});

test("doublons : sans adresse, ou avec des adresses différentes, rien n'est regroupé (on ne devine pas)", () => {
  const input = [ev({ id: "1" }), ev({ id: "2" }), ev({ id: "3", url: "https://a.org/1" }), ev({ id: "4", url: "https://a.org/2" }), ev({ id: "5", url: "illisible" }), ev({ id: "6", url: "illisible" })];
  const { events, merged } = dedupeEvents(input);
  assert.equal(merged, 0);
  assert.equal(events.length, 6);
});

test("doublons : les domaines des entrées regroupées sont réunis, la liste vide reste vide", () => {
  assert.deepEqual(dedupeEvents([]), { events: [], merged: 0 });
  const { events } = dedupeEvents([ev({ id: "1", url: "https://a.org/x", domains: ["a.org"] }), ev({ id: "2", url: "https://a.org/x", domains: ["a.org", "b.org"] })]);
  assert.deepEqual([...(events[0].domains ?? [])].sort(), ["a.org", "b.org"]);
});

test("filtres : la période et le thème s'appliquent aux événements réels comme aux fictifs ; zéro résultat reste une liste vide", () => {
  const now = Date.parse("2026-11-10T00:00:00Z");
  const events = [
    ev({ id: "1", at: "2026-11-09T10:00:00.000Z", theme: "conflits" }),
    ev({ id: "2", at: "2026-11-01T10:00:00.000Z", theme: "politique" }),
    ev({ id: "3", at: "2026-09-01T10:00:00.000Z", theme: "conflits" }),
  ];
  assert.deepEqual(applyFilters(events, { periodDays: 7, theme: "all" }, now).map((e) => e.id), ["1"]);
  assert.deepEqual(applyFilters(events, { periodDays: 30, theme: "all" }, now).map((e) => e.id), ["1", "2"]);
  assert.deepEqual(applyFilters(events, { periodDays: 90, theme: "conflits" }, now).map((e) => e.id), ["1", "3"]);
  assert.deepEqual(applyFilters(events, { periodDays: 7, theme: "humanitaire" }, now), []);
});
