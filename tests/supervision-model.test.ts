import assert from "node:assert/strict";
import test from "node:test";
import { aiCapEur, activeLimit, validateSupervisionInput, validateZone } from "../lib/supervision/model";

const VALID = {
  name: "El Fasher",
  userRequest: "Événements sécuritaires et humanitaires autour d'El Fasher.",
  zone: { kind: "circle", lat: 13.63, lon: 25.35, radiusKm: 150 },
  criteria: { themes: ["conflicts"], entities: ["RSF"], keywords: ["El Fasher", "الفاشر"], exclusions: ["sport"], languages: ["fr", "en", "ar"] },
  sources: [{ type: "gdelt" }, { type: "rss", ref: "https://exemple.org/flux.xml" }, { type: "telegram", ref: "canal_public" }],
  schedule: { dailyHour: 7, weeklyDay: 5 },
};

test("une veille valide est acceptée et normalisée", () => {
  const checked = validateSupervisionInput(VALID);
  assert.ok(checked.ok);
  if (!checked.ok) return;
  assert.equal(checked.value.name, "El Fasher");
  assert.equal(checked.value.zone.kind, "circle");
  assert.equal(checked.value.sources.length, 3);
  assert.deepEqual(checked.value.schedule, { dailyHour: 7, weeklyDay: 5 });
});

test("les plafonds de coût IA valent 10 % du prix affiché de l'offre", () => {
  assert.equal(aiCapEur("plus"), 0.799);
  assert.equal(aiCapEur("intelligence"), 1.999);
  assert.equal(aiCapEur("pro"), 4.999);
  assert.equal(aiCapEur("owner"), null);
  assert.equal(aiCapEur("enterprise"), null);
});

test("nombre de veilles actives selon l'offre", () => {
  assert.equal(activeLimit("plus"), 0);
  assert.equal(activeLimit("intelligence"), 1);
  assert.equal(activeLimit("pro"), 3);
});

test("le nom, la zone et les critères sont obligatoires", () => {
  assert.equal(validateSupervisionInput(null).ok, false);
  assert.equal(validateSupervisionInput({ ...VALID, name: "ab" }).ok, false);
  assert.equal(validateSupervisionInput({ ...VALID, zone: undefined }).ok, false);
  assert.equal(validateSupervisionInput({ ...VALID, criteria: { themes: [], entities: [], keywords: [] } }).ok, false);
});

test("une zone hors limites est refusée", () => {
  const errors: string[] = [];
  assert.equal(validateZone({ kind: "circle", lat: 91, lon: 0, radiusKm: 100 }, errors), null);
  assert.equal(validateZone({ kind: "circle", lat: 10, lon: 200, radiusKm: 100 }, errors), null);
  assert.equal(validateZone({ kind: "circle", lat: 10, lon: 10, radiusKm: 2 }, errors), null);
  assert.equal(validateZone({ kind: "circle", lat: 10, lon: 10, radiusKm: 5000 }, errors), null);
  assert.equal(validateZone({ kind: "circle", lat: "10", lon: 10, radiusKm: 100 }, errors), null);
  assert.equal(validateZone({ kind: "countries", codes: [] }, errors), null);
  assert.equal(validateZone({ kind: "countries", codes: ["soudan"] }, errors), null);
  assert.equal(errors.length, 7);
  assert.deepEqual(validateZone({ kind: "countries", codes: ["sd", "SD", "td"] }, []), { kind: "countries", codes: ["SD", "TD"] });
});

test("thèmes inconnus, sources invalides et doublons sont traités", () => {
  const unknownTheme = validateSupervisionInput({ ...VALID, criteria: { ...VALID.criteria, themes: ["inventé"] } });
  assert.equal(unknownTheme.ok, false);
  const badSources = validateSupervisionInput({ ...VALID, sources: [{ type: "rss", ref: "javascript:alert(1)" }, { type: "telegram", ref: "@canal" }, { type: "tiktok" }] });
  assert.equal(badSources.ok, false);
  const dup = validateSupervisionInput({ ...VALID, criteria: { ...VALID.criteria, keywords: ["Kidal", "kidal", " KIDAL "] }, sources: [{ type: "gdelt" }, { type: "gdelt" }] });
  assert.ok(dup.ok);
  if (dup.ok) {
    assert.deepEqual(dup.value.criteria.keywords, ["Kidal"]);
    assert.equal(dup.value.sources.length, 1);
  }
});

test("sans calendrier ni sources, des valeurs par défaut sûres s'appliquent", () => {
  const checked = validateSupervisionInput({ ...VALID, sources: undefined, schedule: { dailyHour: 99, weeklyDay: "lundi" } });
  assert.ok(checked.ok);
  if (!checked.ok) return;
  assert.deepEqual(checked.value.sources, [
    { type: "gdelt", ref: "", enabled: true },
    { type: "rss", ref: "", enabled: true },
    { type: "telegram", ref: "", enabled: true },
    { type: "gnews", ref: "", enabled: true },
  ]);
  assert.deepEqual(checked.value.schedule, { dailyHour: 8, weeklyDay: 1 });
});

test("le texte libre est borné et nettoyé", () => {
  const checked = validateSupervisionInput({ ...VALID, name: "  Mon   nom  ", userRequest: "x".repeat(5000) });
  assert.ok(checked.ok);
  if (!checked.ok) return;
  assert.equal(checked.value.name, "Mon nom");
  assert.equal(checked.value.userRequest.length, 2000);
});
