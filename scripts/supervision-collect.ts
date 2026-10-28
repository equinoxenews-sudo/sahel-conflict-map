// Collecte de toutes les veilles actives (traitement quotidien, GitHub Actions) : télécharge une fois les flux, les
// messages Telegram, les événements GDELT et les synthèses, puis rattache à chaque veille ce qui lui correspond.
// Un passage échoué est consigné dans supervision_runs et peut être relancé sans créer de doublon.
//
//   npx tsx scripts/supervision-collect.ts
import { collectSupervisions } from "../lib/supervision/collect";

async function main() {
  const summaries = await collectSupervisions();
  if (summaries.length === 0) {
    console.log("Aucune veille active.");
    return;
  }
  for (const summary of summaries) {
    const f = summary.fetched;
    console.log(
      `${summary.supervisionId} (${summary.ownerId}) : ${summary.matched} retenue(s) sur flux ${f.rss}, Telegram ${f.telegram}, événements ${f.events}, synthèses ${f.briefs} ; lieux : ${summary.located.placed} précisé(s), ${summary.located.excluded} écartée(s) hors zone` +
        (summary.error ? ` — ERREUR : ${summary.error}` : ""),
    );
  }
  if (summaries.some((summary) => summary.error)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
