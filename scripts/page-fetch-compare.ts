// Étape 3 du chantier Synthèses du jour : les pages d'articles se téléchargent-elles aussi
// bien depuis GitHub Actions que depuis Vercel ? Demande à la route
// /api/diagnostic/page-fetch de lire un échantillon côté Vercel, relit les mêmes pages
// ici, puis compare. Lecture seule : aucun appel au modèle, aucune écriture en base.
// Lancé à la main par .github/workflows/page-fetch-compare.yml. Usage local :
//   SITE_URL=… CRON_SECRET=… npx tsx scripts/page-fetch-compare.ts [--per-zone=12] [--hours=72]
import { appendFileSync } from "node:fs";
import { compareProbes, probePages, type ProbeResult } from "../lib/pageFetchProbe";

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const perZone = Number(arg("per-zone")) || 12;
const hours = Number(arg("hours")) || 72;

async function main() {
  const site = process.env.SITE_URL?.replace(/\/+$/, "");
  const secret = process.env.CRON_SECRET?.trim();
  if (!site || !secret) throw new Error("SITE_URL et CRON_SECRET sont requis.");

  const res = await fetch(`${site}/api/diagnostic/page-fetch?per_zone=${perZone}&hours=${hours}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(150_000),
  });
  const body = await res.json().catch(() => null) as { ok?: boolean; error?: string; durationMs?: number; results?: ProbeResult[] } | null;
  if (!res.ok || !body?.results) throw new Error(`Route Vercel : HTTP ${res.status} ${body?.error ?? ""}`.trim());

  const vercel = body.results;
  console.log(`Vercel : ${vercel.length} pages lues en ${Math.round((body.durationMs ?? 0) / 1000)} s.`);
  const started = Date.now();
  const github = await probePages(vercel.map((r) => r.url));
  console.log(`GitHub Actions : ${github.length} pages lues en ${Math.round((Date.now() - started) / 1000)} s.`);

  const c = compareProbes(vercel, github);
  const line = (name: string, t: typeof c.vercel) =>
    `| ${name} | ${t.pages} | ${t.lu} (${t.rate} %) | ${t.vide} | ${t.refus} | ${t.echec} |`;
  const report = [
    `## Lecture des pages d'articles : Vercel ou GitHub Actions`,
    ``,
    `Échantillon : ${perZone} articles au plus par zone, publiés depuis ${hours} h.`,
    ``,
    `| Origine | Pages | Lues | Vides | Refus (HTTP ≥ 400) | Échecs (délai, réseau) |`,
    `|---|---|---|---|---|---|`,
    line("Vercel", c.vercel),
    line("GitHub Actions", c.github),
    ``,
    `**Écart : ${c.github.rate - c.vercel.rate >= 0 ? "+" : ""}${c.github.rate - c.vercel.rate} point(s) pour GitHub Actions.** ` +
      `${c.lostOnGithub.length} page(s) lue(s) sur Vercel mais pas depuis GitHub, ${c.gainedOnGithub.length} dans l'autre sens.`,
    ``,
    `### Sites où les deux origines diffèrent`,
    ``,
    ...(c.domainGaps.length
      ? [`| Site | Pages | Lues Vercel | Lues GitHub |`, `|---|---|---|---|`,
          ...c.domainGaps.map((d) => `| ${d.domain} | ${d.pages} | ${d.vercel} | ${d.github} |`)]
      : [`Aucun : chaque site donne le même nombre de pages lues des deux côtés.`]),
    ``,
    `### Pages perdues depuis GitHub`,
    ``,
    ...(c.lostOnGithub.length
      ? c.lostOnGithub.map((r) => `- ${r.domain} : ${r.outcome}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ""} — ${r.url}`)
      : [`Aucune.`]),
  ].join("\n");

  console.log(`\n${report}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::notice title=Lecture des pages::Vercel ${c.vercel.rate} % · GitHub Actions ${c.github.rate} % (${c.vercel.pages} pages) · ${c.lostOnGithub.length} perdue(s) depuis GitHub`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
