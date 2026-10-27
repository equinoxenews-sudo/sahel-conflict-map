import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dispatchPlan } from "../lib/syncPasses";

// Cohérence des horaires : vercel.json (déclencheur principal), planifications de secours des workflows GitHub, et
// le tableau de docs/JOURNEE_TYPE.md. Un changement d'heure oublié dans l'un des trois fait échouer ce test.

interface VercelCron {
  path: string;
  schedule: string;
}
const { crons } = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: VercelCron[] };
const doc = readFileSync("docs/JOURNEE_TYPE.md", "utf8");

/** Planifications `cron: "m h d M w"` d'un workflow. */
function workflowSchedules(file: string): { minute: number; hour: number; weekday: string }[] {
  const source = readFileSync(`.github/workflows/${file}`, "utf8");
  return [...source.matchAll(/^\s*-\s*cron:\s*"(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)"/gm)].map((m) => ({
    minute: Number(m[1]),
    hour: Number(m[2]),
    weekday: m[5],
  }));
}

const dispatchCrons = crons.filter((c) => c.path.startsWith("/api/cron/dispatch/"));

test("chaque cron de réveil a un secours GitHub à la même heure (quelques minutes plus tard) et aux mêmes jours", () => {
  assert.ok(dispatchCrons.length >= 4);
  for (const cron of dispatchCrons) {
    const plan = dispatchPlan(cron.path.split("/").pop()!);
    assert.ok(plan, `${cron.path} n'est pas reconnu par la route de réveil`);
    const [minute, hour, , , weekday] = cron.schedule.split(" ");
    const backups = workflowSchedules(plan.workflow);
    const match = backups.find((b) => b.hour === Number(hour) && b.weekday === weekday);
    assert.ok(match, `${plan.workflow} n'a pas de planification de secours à ${hour} h UTC (jours « ${weekday} ») comme ${cron.path}`);
    assert.ok(match.minute > Number(minute), `le secours de ${plan.workflow} doit partir après le cron Vercel`);
  }
});

test("aucune planification de secours n'est orpheline : chacune correspond à un cron de réveil", () => {
  for (const file of ["sync-briefs.yml", "zone-synthesis.yml", "situation-report.yml", "veille-osint.yml"]) {
    for (const backup of workflowSchedules(file)) {
      const owner = dispatchCrons.find((c) => {
        const plan = dispatchPlan(c.path.split("/").pop()!);
        const [, hour, , , weekday] = c.schedule.split(" ");
        return plan?.workflow === file && Number(hour) === backup.hour && weekday === backup.weekday;
      });
      assert.ok(owner, `${file} : planification de secours à ${backup.hour} h UTC sans cron Vercel correspondant`);
    }
  }
});

test("le tableau de la journée type liste chaque horaire de vercel.json", () => {
  for (const cron of crons) {
    const [, hour] = cron.schedule.split(" ");
    const label = `| ${String(hour).padStart(2, "0")}:00`;
    assert.ok(doc.includes(label), `docs/JOURNEE_TYPE.md ne mentionne pas ${label} (${cron.path})`);
  }
});

test("l'ordre de la journée est conservé : collecte, point de situation, synthèses, synthèse de zone, après-midi", () => {
  const hour = (end: string) => Number(crons.find((c) => c.path.endsWith(end))?.schedule.split(" ")[1]);
  assert.ok(hour("sync-gdelt") < hour("sync-articles"));
  assert.ok(hour("situation-report.yml") <= hour("sync-briefs.yml"));
  assert.ok(hour("sync-briefs.yml") < hour("zone-synthesis.yml"));
  assert.ok(hour("zone-synthesis.yml") < hour("sync-briefs-apres-midi"));
  // Au moins une heure entre deux étapes dépendantes : la marge de Vercel est de 59 minutes.
  assert.ok(hour("zone-synthesis.yml") - hour("sync-briefs.yml") >= 1);
});
