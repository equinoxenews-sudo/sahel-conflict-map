import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AFTERNOON_BATCHES, MAX_BATCHES_PER_ZONE, dispatchPlan, effectiveMaxBatches, parseBatchesLimit } from "../lib/syncPasses";

test("la route de réveil connaît les passages du matin, de midi et de fin de journée, et rien d'autre", () => {
  assert.deepEqual(dispatchPlan("sync-briefs.yml"), { workflow: "sync-briefs.yml" });
  assert.deepEqual(dispatchPlan("sync-briefs-apres-midi"), { workflow: "sync-briefs.yml", inputs: { passe: "apres-midi" } });
  assert.deepEqual(dispatchPlan("sync-briefs-fin-de-journee"), { workflow: "sync-briefs.yml", inputs: { passe: "apres-midi" } });
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

test("les crons Vercel de midi et de fin de journée existent, après celui du matin", () => {
  const { crons } = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
  const hour = (path: string) => Number(crons.find((c) => c.path.endsWith(path))?.schedule.split(" ")[1]);
  const afternoon = crons.filter((c) => c.path === "/api/cron/dispatch/sync-briefs-apres-midi");
  assert.equal(afternoon.length, 1);
  assert.equal(crons.filter((c) => c.path === "/api/cron/dispatch/sync-briefs-fin-de-journee").length, 1);
  assert.ok(hour("sync-briefs-fin-de-journee") > hour("sync-briefs-apres-midi"), "midi avant la fin de journée");
  assert.ok(hour("sync-briefs-apres-midi") > hour("sync-briefs.yml"));
  // La synthèse de zone reste à une seule exécution par jour.
  assert.equal(crons.filter((c) => c.path.includes("zone-synthesis")).length, 1);
  // Chaque chemin de vercel.json est reconnu par la route de réveil.
  for (const cron of crons.filter((c) => c.path.startsWith("/api/cron/dispatch/"))) {
    assert.ok(dispatchPlan(cron.path.split("/").pop()!), cron.path);
  }
});

test("le workflow ne confond pas les passages : trois fenêtres de garde, un lot par appel, un seul appel aux passages légers", () => {
  const yml = readFileSync(".github/workflows/sync-briefs.yml", "utf8");
  assert.match(yml, /cron: "5 6 \* \* \*"/);
  assert.match(yml, /cron: "5 11 \* \* \*"/);
  assert.match(yml, /cron: "5 16 \* \* \*"/);
  assert.match(yml, /github\.event\.schedule == '5 11 \* \* \*' \|\| github\.event\.schedule == '5 16 \* \* \*'/);
  assert.match(yml, /T00:00:00Z\.\.\$\{today\}T09:59:59Z/);
  assert.match(yml, /T10:00:00Z\.\.\$\{today\}T13:59:59Z/);
  assert.match(yml, /T14:00:00Z\.\.\$\{today\}T23:59:59Z/);
  // Un appel = un lot (4 minutes par réponse de l'IA) ; le matin jusqu'à 3 appels par zone, les passages légers un seul.
  assert.match(yml, /&batches=1/);
  assert.match(yml, /rounds=3/);
  assert.match(yml, /if \[ "\$PASSE" = "apres-midi" \]; then rounds=1; fi/);
  assert.match(yml, /timeout-minutes: 60/);
});
