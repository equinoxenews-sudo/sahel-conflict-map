// Veille hebdomadaire OSINT et IA : lit les flux de quelques sources spécialisées, fait choisir au modèle (Haiku, un seul
// appel de quelques centimes au plus) les 5 articles les plus utiles de la semaine avec un titre et un résumé en français,
// et les enregistre dans veille_osint (affichés dans Mon espace > Menu).
//
// Lancé chaque dimanche soir par .github/workflows/veille-osint.yml. Usage local :
//   npx tsx scripts/veille-osint.ts [--force] [--dry-run]
// --dry-run : affiche le choix sans rien enregistrer (l'appel au modèle est tout de même fait et journalisé).
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

for (const name of ["ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (value) process.env[name] = value.trim().replace(/^["']|["']$/g, "");
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

import { fetchArticleContent } from "../lib/articleSummary";
import { callAnthropic } from "../lib/anthropicCall";
import { checkBudget, recordUsage } from "../lib/aiUsage";
import { fetchFeed } from "../lib/rss";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { MODEL } from "../lib/synthesizeBriefs";
import { MAX_PICKS, VEILLE_SOURCES, buildPickPrompt, parsePicks, safeHttpUrl, selectCandidates, type Candidate } from "../lib/veilleOsint";

const args = process.argv.slice(2);
const force = args.includes("--force") || process.env.FORCE === "true";
const dryRun = args.includes("--dry-run");
/** En dessous, l'extrait du flux est trop court pour résumer l'article. */
const THIN_EXCERPT_CHARS = 150;

function notice(title: string, message: string) {
  console.log(message);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=${title}::${message.replace(/\n/g, " ")}`);
}

async function collectCandidates(): Promise<Candidate[]> {
  const perSource = await Promise.all(
    VEILLE_SOURCES.map(async (source) => {
      const items = await fetchFeed(source.feedUrl);
      console.log(`  ${source.name} : ${items.length} article(s) dans le flux${items.length === 0 ? " — flux vide ou inaccessible" : ""}`);
      return items.flatMap((item): Candidate[] =>
        item.publishedAt
          ? [{ url: item.url, title: item.title, excerpt: item.excerpt, imageUrl: item.imageUrl, publishedAt: item.publishedAt, sourceId: source.id, sourceName: source.name }]
          : [],
      );
    }),
  );
  return perSource.flat();
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absent.");

  const budget = await checkBudget("veille-osint", { force });
  if (budget.mode !== "normal" || !budget.allowed) notice("Budget IA", budget.message);
  else console.log(budget.message);
  if (!budget.allowed) return;

  const supabase = getSupabaseAdmin();
  const { data: known, error: knownError } = await supabase.from("veille_osint").select("url").order("picked_at", { ascending: false }).limit(500);
  if (knownError) {
    throw new Error(
      /veille_osint|relation|does not exist|schema cache/i.test(knownError.message)
        ? "La table veille_osint n'existe pas : exécuter supabase/add-veille-osint.sql dans Supabase."
        : `Lecture des articles déjà publiés impossible : ${knownError.message}`,
    );
  }

  console.log("Veille OSINT et IA — lecture des flux :");
  const candidates = selectCandidates(await collectCandidates(), (known ?? []).map((row: { url: string }) => row.url), new Date());
  if (candidates.length === 0) {
    notice("Veille OSINT", "Aucun nouvel article cette semaine : rien à publier.");
    return;
  }
  // Un flux qui ne donne qu'une ligne (« Issue #127 ») ne permet pas de résumer : on complète avec le début de la page.
  await Promise.all(
    candidates
      .filter((candidate) => candidate.excerpt.length < THIN_EXCERPT_CHARS)
      .map(async (candidate) => {
        const page = await fetchArticleContent(candidate.url);
        const text = (page.summary ?? page.bodyText ?? "").replace(/\s+/g, " ").trim();
        if (text.length > candidate.excerpt.length) candidate.excerpt = text.slice(0, 600);
      }),
  );
  console.log(`${candidates.length} candidat(s) soumis au modèle ${MODEL}.`);

  let result;
  try {
    result = await callAnthropic({
      apiKey,
      model: MODEL,
      prompt: buildPickPrompt(candidates),
      maxTokens: 2500,
      onRetry: (status, kind, pause) => console.warn(`  refus ${status} (${kind}), nouvel essai dans ${Math.round(pause / 1000)} s`),
    });
  } catch (err) {
    await recordUsage({ job: "veille-osint", model: MODEL, usage: { inputTokens: 0, outputTokens: 0, webSearches: 0 }, ok: false, note: String(err).slice(0, 200) });
    throw err;
  }

  let picks;
  try {
    picks = parsePicks(result.text, candidates, MAX_PICKS);
  } catch (err) {
    // Le coût est dû dès que le modèle a répondu, même si la réponse est inexploitable.
    await recordUsage({ job: "veille-osint", model: MODEL, usage: result.usage, ok: false, note: "réponse inexploitable" });
    throw err;
  }
  await recordUsage({ job: "veille-osint", model: MODEL, usage: result.usage, note: `${candidates.length} candidats, ${picks.length} retenus` });

  if (picks.length === 0) {
    notice("Veille OSINT", "Le modèle n'a retenu aucun article cette semaine.");
    return;
  }

  // Image : celle du flux, sinon l'image principale de la page (au plus quelques requêtes, seulement pour les articles retenus).
  const rows = [];
  for (const pick of picks) {
    const { candidate } = pick;
    const imageUrl = safeHttpUrl(candidate.imageUrl) ?? safeHttpUrl((await fetchArticleContent(candidate.url)).imageUrl);
    rows.push({
      url: candidate.url,
      source_id: candidate.sourceId,
      source_name: candidate.sourceName,
      title: candidate.title.slice(0, 300),
      title_fr: pick.titleFr,
      summary_fr: pick.summaryFr,
      image_url: imageUrl,
      published_at: candidate.publishedAt,
      model: MODEL,
    });
    console.log(`  + ${candidate.sourceName} — ${pick.titleFr}${imageUrl ? "" : " (sans image)"}`);
  }

  if (dryRun) {
    notice("Veille OSINT", `Simulation : ${rows.length} article(s) retenus, rien enregistré.`);
    return;
  }
  const { error } = await supabase.from("veille_osint").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  notice("Veille OSINT", `${rows.length} article(s) publiés dans la veille.`);
}

main().catch((err) => {
  console.error(err);
  if (process.env.GITHUB_ACTIONS) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 400).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.log(`::error title=Veille OSINT::${message}`);
  }
  process.exit(1);
});
