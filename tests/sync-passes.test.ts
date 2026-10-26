import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AFTERNOON_BATCHES, MAX_BATCHES_PER_ZONE, dispatchPlan, effectiveMaxBatches, parseBatchesLimit } from "../lib/syncPasses";

test("la route de réveil connaît les passages du matin et de l'après-midi, et rien d'autre", () => {
  assert.deepEqual(dispatchPlan("sync-briefs.yml"), { workflow: "sync-briefs.yml" });
  assert.deepEqual(dispatchPlan("sync-briefs-apres-midi"), { workflow: "sync-briefs.yml", inputs: { passe: "apres-midi" } });
  assert.deepEqual(dispatchPlan("zone-synthesis.yml"), { workflow: "zone-synthesis.yml" });
  assert.deepEqual(dispatchPlan("situation-report.yml"), { workflow: "situation-report.yml" });
  for (const name of ["", "country-indicators.yml", "../sync-briefs.yml", "constructor", "__proto__", "toString"]) {
    assert.equal(dispatchPlan(name), null, name);
  }
});

test("le passage de l'après-midi ne touche jamais la synthèse de zone ni le point de situation", () => {
  const plan = dispatchPlan("sync-briefs-apres-midi");
  assert.equal(plan?.workflow, "sync-briefs.yml");
});

test("le plafond de lots demandé par le passage n'accepte qu'un entier de 1 à 3", () => {
  assert.equal(parseBatchesLimit("1"), 1);
  assert.equal(parseBatchesLimit("3"), 3);
  for (const bad of [null, "", "0", "4", "-1", "1.5", "abc", "1;2", "10"]) assert.equal(parseBatchesLimit(bad), undefined, String(bad));
});

test("le plus petit des plafonds l'emporte : code, mode budget du mois, passage", () => {
  assert.equal(effectiveMaxBatches(undefined, undefined), MAX_BATCHES_PER_ZONE);
  assert.equal(effectiveMaxBatches(3, 1), AFTERNOON_BATCHES);
  assert.equal(effectiveMaxBatches(2, undefined), 2);
  assert.equal(effectiveMaxBatches(1, 3), 1);
  assert.equal(effectiveMaxBatches(null, 2), 2);
  assert.equal(AFTERNOON_BATCHES, 1);
});

test("le cron Vercel de l'après-midi existe, après celui du matin et avant la synthèse de zone", () => {
  const { crons } = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
  const hour = (path: string) => Number(crons.find((c) => c.path.endsWith(path))?.schedule.split(" ")[1]);
  const afternoon = crons.filter((c) => c.path === "/api/cron/dispatch/sync-briefs-apres-midi");
  assert.equal(afternoon.length, 1);
  assert.ok(hour("sync-briefs-apres-midi") > hour("sync-briefs.yml"));
  // La synthèse de zone reste à une seule exécution par jour.
  assert.equal(crons.filter((c) => c.path.includes("zone-synthesis")).length, 1);
  // Chaque chemin de vercel.json est reconnu par la route de réveil.
  for (const cron of crons.filter((c) => c.path.startsWith("/api/cron/dispatch/"))) {
    assert.ok(dispatchPlan(cron.path.split("/").pop()!), cron.path);
  }
});

test("le workflow ne confond pas les passages : fenêtres de garde distinctes et un seul lot l'après-midi", () => {
  const yml = readFileSync(".github/workflows/sync-briefs.yml", "utf8");
  assert.match(yml, /cron: "5 7 \* \* \*"/);
  assert.match(yml, /cron: "5 12 \* \* \*"/);
  assert.match(yml, /github\.event\.schedule == '5 12 \* \* \*'/);
  assert.match(yml, /T10:00:00Z\.\.\$\{today\}T23:59:59Z/);
  assert.match(yml, /T00:00:00Z\.\.\$\{today\}T09:59:59Z/);
  assert.match(yml, /batches="&batches=1"/);
});
