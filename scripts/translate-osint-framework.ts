// Traduit en français les fiches d'outils de la carte OSINT (public/data/osint-framework.json) et écrit le résultat dans
// public/data/osint-framework.fr.json, indexé par adresse d'outil. Reprenable : les outils déjà traduits sont sautés.
//
//   ANTHROPIC_API_KEY=… npx tsx scripts/translate-osint-framework.ts [--limit=40]
//
// Lancé en général par le workflow « Traduction des outils OSINT » (GitHub, à la main). Environ 1 100 outils par lots
// de 20, avec le modèle des synthèses du jour (Haiku) : de l'ordre de 1 $ en tout, affiché à la fin (estimation).
import fs from "node:fs";
import path from "node:path";
import { estimateCostUsd, pricingFromEnv, type AiUsage } from "../lib/aiBudget";
import { callAnthropic } from "../lib/anthropicCall";
import type { OsintNode, OsintTranslations } from "../lib/osintFramework";
import { buildTranslationPrompt, chunk, collectToTranslate, numberBatch, parseTranslationBatch } from "../lib/osintTranslate";
import { MODEL } from "../lib/synthesizeBriefs";

const DATA = path.join(process.cwd(), "public", "data", "osint-framework.json");
const OUT = path.join(process.cwd(), "public", "data", "osint-framework.fr.json");
const BATCH_SIZE = 20;
const MAX_TOKENS = 8000;
const CALL_TIMEOUT_MS = 180_000;

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.slice("--limit=".length)) || 0) : Infinity;

function callModel(apiKey: string, prompt: string) {
  return callAnthropic({
    apiKey,
    model: MODEL,
    prompt,
    maxTokens: MAX_TOKENS,
    timeoutMs: CALL_TIMEOUT_MS,
    onRetry: (status, kind, pause) => console.warn(`  refus ${status} (${kind}), nouvel essai dans ${Math.round(pause / 1000)} s`),
  });
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absent.");

  const root = JSON.parse(fs.readFileSync(DATA, "utf8")) as OsintNode;
  const done: OsintTranslations = fs.existsSync(OUT) ? (JSON.parse(fs.readFileSync(OUT, "utf8")) as OsintTranslations) : {};
  const todo = collectToTranslate(root, done).slice(0, LIMIT);
  console.log(`${Object.keys(done).length} outils déjà traduits ; ${todo.length} à traduire (modèle ${MODEL}, lots de ${BATCH_SIZE}).`);

  const total: AiUsage = { inputTokens: 0, outputTokens: 0, webSearches: 0 };
  let added = 0;
  let skipped = 0;
  let failedBatches = 0;
  const batches = chunk(todo, BATCH_SIZE);

  for (const [index, items] of batches.entries()) {
    const batch = numberBatch(items);
    try {
      const { text, usage } = await callModel(apiKey, buildTranslationPrompt(batch));
      total.inputTokens += usage.inputTokens;
      total.outputTokens += usage.outputTokens;
      const translations = parseTranslationBatch(text, batch);
      Object.assign(done, translations);
      added += Object.keys(translations).length;
      skipped += batch.length - Object.keys(translations).length;
      // Écrit après chaque lot : une interruption ne fait rien perdre, le lancement suivant reprend là où il s'est arrêté.
      fs.writeFileSync(OUT, JSON.stringify(done));
      console.log(`  lot ${index + 1}/${batches.length} : ${Object.keys(translations).length}/${batch.length} traduits`);
    } catch (error) {
      failedBatches += 1;
      console.error(`  lot ${index + 1}/${batches.length} : échec — ${error instanceof Error ? error.message : error}`);
      // Un plafond de dépenses ne se règle pas en insistant : on s'arrête.
      if (error instanceof Error && /plafond de dépenses/.test(error.message)) break;
    }
  }

  const cost = estimateCostUsd(total, pricingFromEnv(process.env, MODEL));
  console.log(
    `Terminé : ${added} traductions ajoutées, ${skipped} ignorées (réponse invalide), ${failedBatches} lot(s) en échec. ` +
      `Jetons : ${total.inputTokens} en entrée, ${total.outputTokens} en sortie, coût estimé ${cost.toFixed(2)} $ (la Console fait foi).`,
  );
  if (failedBatches > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
