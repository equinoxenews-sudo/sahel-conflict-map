import assert from "node:assert/strict";
import test from "node:test";
import type { BoardEvent } from "../lib/supervision/dashboard/fixtures";
import { STORY_MIN_SHARED, STORY_THRESHOLD, STORY_WINDOW_HOURS, groupStories, titleTokens } from "../lib/supervision/data/stories";

const pub = (id: string, title: string, at: string, extra: Partial<BoardEvent> = {}): BoardEvent => ({
  id: `p-${id}`,
  kind: "publication",
  title,
  theme: "securite",
  priority: "information",
  verification: "signalement",
  at,
  place: "Nigeria",
  publications: 1,
  domains: [id],
  url: `https://${id}.example.com/x`,
  ...extra,
});

// Titres réels collectés sur « Test Nigeria » (préproduction, 10/11/2026).
const GUNMEN_A = "Gunmen kill 11 relatives of security volunteer in northwest Nigeria, abduct 13";
const GUNMEN_FIRSTPOST = "Nigeria gunmen kill security volunteer, 10 relatives, abduct 13 in Zamfara village attack";
const CEASEFIRE_A = "Nigeria Rules Out Ceasefire With Boko Haram, ISWAP, Vows Sustained Military Offensive";
const CEASEFIRE_B = "Nigeria rules out ceasefire with Islamists, vows sustained military offensive";
const FAMILY_A = "12 members of same family killed in gunmen's attack in Nigeria";
const FAMILY_B = "Twelve killed as bandits set family home ablaze in Nigeria";
const FORCES = "Nigeria security forces kill dozens of gang members: police";
const TOLL = "Death toll in Nigeria gang attack rises to 62";
const PAY = "Nigeria Raises Military Pay up to 80% as Security Threats Persist";

test("constantes décidées : titres proches à 45 %, au moins 4 mots communs, fenêtre de 72 h", () => {
  assert.deepEqual([STORY_THRESHOLD, STORY_MIN_SHARED, STORY_WINDOW_HOURS], [0.45, 4, 72]);
});

test("mots d'un titre : sans accents, sans mots courants, pluriels réduits, nombres écrits en chiffres", () => {
  assert.deepEqual(titleTokens("Twelve killed as bandits set family home ablaze in Nigeria").sort(), ["12", "ablaze", "bandit", "family", "home", "killed", "nigeria", "set"].sort());
  assert.ok(titleTokens("Douze personnes tuées à Zamfara").includes("12"));
  assert.ok(titleTokens("L'attaque des relatives").includes("relative"));
  assert.deepEqual(titleTokens("The and of"), []);
});

test("la même histoire racontée par plusieurs médias est regroupée sous la plus ancienne ; les autres histoires ne bougent pas", () => {
  const events = [
    pub("firstpost", GUNMEN_FIRSTPOST, "2026-11-09T14:00:00Z"),
    pub("streetinsider", GUNMEN_A, "2026-11-09T11:00:00Z"),
    pub("reuters", CEASEFIRE_B, "2026-11-08T09:00:00Z"),
    pub("internazionale", GUNMEN_A, "2026-11-09T08:00:00Z"),
    pub("businesspost", CEASEFIRE_A, "2026-11-08T07:00:00Z"),
    pub("trt", TOLL, "2026-11-09T10:00:00Z"),
    pub("dabafinance", PAY, "2026-11-07T10:00:00Z"),
  ];
  const result = groupStories(events);
  assert.equal(result.grouped, 3);
  // Le représentant est la publication la plus ancienne de chaque histoire, à sa place dans l ordre d origine (du plus récent au plus ancien).
  const ids = result.events.map((e) => e.id);
  assert.deepEqual(ids, ["p-internazionale", "p-businesspost", "p-trt", "p-dabafinance"]);
  assert.ok(ids.includes("p-internazionale") && !ids.includes("p-streetinsider") && !ids.includes("p-firstpost"));
  assert.ok(ids.includes("p-businesspost") && !ids.includes("p-reuters"));
  const gunmen = result.events.find((e) => e.id === "p-internazionale")!;
  assert.deepEqual(gunmen.story?.members.map((m) => m.id).sort(), ["p-firstpost", "p-streetinsider"]);
  assert.equal(gunmen.publications, 3);
  assert.deepEqual([...(gunmen.domains ?? [])].sort(), ["firstpost", "internazionale", "streetinsider"]);
  assert.equal(result.events.find((e) => e.id === "p-trt")?.story, undefined);
});

test("prudence : deux histoires voisines (mêmes mots, faits différents) ne sont pas fusionnées", () => {
  const result = groupStories([
    pub("a", FAMILY_A, "2026-11-09T10:00:00Z"),
    pub("b", FAMILY_B, "2026-11-09T11:00:00Z"),
    pub("c", FORCES, "2026-11-09T12:00:00Z"),
    pub("d", TOLL, "2026-11-09T13:00:00Z"),
  ]);
  assert.equal(result.grouped, 0);
  assert.equal(result.events.length, 4);
});

test("fenêtre de 72 h : le même titre à plus de trois jours d'écart reste deux publications", () => {
  const near = groupStories([pub("a", GUNMEN_A, "2026-11-05T10:00:00Z"), pub("b", GUNMEN_A, "2026-11-08T09:00:00Z")]);
  assert.equal(near.grouped, 1, "71 h : regroupé");
  const far = groupStories([pub("a", GUNMEN_A, "2026-11-05T10:00:00Z"), pub("b", GUNMEN_A, "2026-11-08T11:00:00Z")]);
  assert.equal(far.grouped, 0, "73 h : séparé");
});

test("seules les publications de presse sont regroupées : un article analysé et un signalement au même titre restent intacts", () => {
  const result = groupStories([
    pub("a", GUNMEN_A, "2026-11-09T08:00:00Z", { kind: "article", id: "a-1" }),
    pub("b", GUNMEN_A, "2026-11-09T09:00:00Z", { kind: "signal", id: "e-2" }),
    pub("c", GUNMEN_A, "2026-11-09T10:00:00Z"),
  ]);
  assert.equal(result.grouped, 0);
  assert.equal(result.events.length, 3);
  assert.equal(groupStories([]).grouped, 0);
  assert.equal(groupStories([pub("solo", GUNMEN_A, "2026-11-09T10:00:00Z")]).events.length, 1);
});

test("le représentant est stable : une reprise plus tardive ne le change pas, une même entrée donne toujours le même résultat", () => {
  const first = pub("first", GUNMEN_A, "2026-11-09T08:00:00Z");
  const second = pub("second", GUNMEN_A, "2026-11-09T09:00:00Z");
  const later = pub("later", GUNMEN_FIRSTPOST, "2026-11-10T09:00:00Z");
  const before = groupStories([second, first]).events;
  const after = groupStories([later, second, first]).events;
  assert.deepEqual(before.map((e) => e.id), ["p-first"]);
  assert.deepEqual(after.map((e) => e.id), ["p-first"], "la reprise du lendemain rejoint la même histoire sans changer de représentant");
  assert.deepEqual(groupStories([later, second, first]).events, after);
});

test("le regroupement n'augmente jamais la vérification ni la priorité, et ne modifie pas les entrées d'origine", () => {
  const input = [pub("a", GUNMEN_A, "2026-11-09T08:00:00Z"), pub("b", GUNMEN_A, "2026-11-09T09:00:00Z"), pub("c", GUNMEN_FIRSTPOST, "2026-11-09T10:00:00Z")];
  const snapshot = JSON.stringify(input);
  const [story] = groupStories(input).events;
  assert.equal(story.verification, "signalement");
  assert.equal(story.priority, "information");
  assert.equal(JSON.stringify(input), snapshot);
});

test("si le représentant n'a pas de lieu mais qu'un membre en a un, l'histoire hérite de ce lieu et le dit", () => {
  const located = pub("c", GUNMEN_FIRSTPOST, "2026-11-09T10:00:00Z", { place: "Zamfara State", lat: 12.17, lon: 6.25, geo: { source: "geonames", precision: "zone", name: "Zamfara State" } });
  const [story] = groupStories([pub("a", GUNMEN_A, "2026-11-09T08:00:00Z"), located]).events;
  assert.equal(story.id, "p-a");
  assert.deepEqual([story.place, story.lat, story.lon, story.storyGeo], ["Zamfara State", 12.17, 6.25, true]);
  // Un représentant déjà localisé garde son lieu.
  const own = pub("a", GUNMEN_A, "2026-11-09T08:00:00Z", { place: "Lagos", lat: 6.52, lon: 3.38, geo: { source: "geonames", precision: "ville", name: "Lagos" } });
  const [kept] = groupStories([own, located]).events;
  assert.deepEqual([kept.place, kept.storyGeo], ["Lagos", undefined]);
});
