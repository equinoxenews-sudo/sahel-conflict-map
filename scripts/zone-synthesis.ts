// Agent de synthèse de zone : lit les synthèses Équinoxe parues depuis la dernière
// synthèse de la zone et enregistre l'analyse dans zone_syntheses.
//
// Rotation : une seule zone par jour (mardi Europe, mercredi Moyen-Orient, jeudi
// Afrique, vendredi Indopacifique, samedi Amérique du Sud ; lundi est réservé aux
// points de situation, dimanche rien). La recherche web payante est désactivée par
// défaut : elle n'est utilisée que si la politique de lib/aiBudget.ts l'autorise
// (information importante non établie, plafond mensuel > 0). Chaque appel est
// journalisé dans ai_usage, et le budget mensuel est vérifié avant de commencer.
//
// Lancé par .github/workflows/zone-synthesis.yml. Usage local :
//   npx tsx scripts/zone-synthesis.ts [--zone=afrique|all] [--force] [--web]
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

// Un secret collé avec un espace, un retour à la ligne ou des guillemets
// ferait échouer chaque requête : on nettoie les valeurs avant usage.
for (const name of ["ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (value) process.env[name] = value.trim().replace(/^["']|["']$/g, "");
}
// Adresse du projet collée depuis la page "Data API" avec son suffixe REST.
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

import { decideWebSearch, webPolicyFromEnv, zoneForWeekday } from "../lib/aiBudget";
import { checkBudget, recordUsage } from "../lib/aiUsage";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import {
  AnthropicRequestError,
  buildSynthesisPrompt,
  callSynthesisModel,
  fingerprintOf,
  inaccessibleDomainsFrom,
  parseSynthesis,
  SYNTHESIS_MODEL,
  type InputBrief,
} from "../lib/zoneSynthesis";
import { isSportsTitle } from "../lib/sportsFilter";
import { SYNTHESIS_ALLOWED_DOMAINS } from "../lib/synthesisSources";
import { ZONES, getZone } from "../lib/zones";

/** Période lue quand la zone n'a encore aucune synthèse, et plafond de remontée. */
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 8;
const MAX_BRIEFS = 25;
const FETCH_BRIEFS = 60;

const args = process.argv.slice(2);
const force = args.includes("--force") || process.env.FORCE === "true";
const forceWeb = args.includes("--web");
const zoneArg = args.find((a) => a.startsWith("--zone="))?.slice("--zone=".length) || undefined;

const IMPORTANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function isWebSearchUnavailable(err: unknown): boolean {
  return err instanceof AnthropicRequestError && [400, 403].includes(err.status) && /web[_ ]search/i.test(err.body);
}

function periodLabel(days: number): string {
  if (days <= 1) return "les dernières 24 heures";
  return `les ${Math.min(Math.round(days), MAX_WINDOW_DAYS)} derniers jours`;
}

async function synthesizeZone(
  zoneSlug: string,
  apiKey: string,
  webSearchesThisMonth: number
): Promise<{ status: "créée" | "inchangée" | "ignorée"; webSearches: number }> {
  const supabase = getSupabaseAdmin();
  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const now = Date.now();

  // La période commence à la dernière synthèse de la zone (plafonnée à 8 jours) :
  // avec une synthèse par semaine, elle couvre tout ce qui s'est passé depuis.
  const { data: lastRows, error: lastError } = await supabase
    .from("zone_syntheses")
    .select("fingerprint, generated_at")
    .eq("zone_slug", zoneSlug)
    .order("generated_at", { ascending: false })
    .limit(1);
  if (lastError) throw new Error(`Lecture de la dernière synthèse impossible : ${lastError.message}`);
  const last = lastRows?.[0] as { fingerprint: string | null; generated_at: string } | undefined;

  const earliest = now - MAX_WINDOW_DAYS * 86_400_000;
  const startMs = last ? Math.max(new Date(last.generated_at).getTime(), earliest) : now - DEFAULT_WINDOW_DAYS * 86_400_000;
  const since = new Date(startMs).toISOString();

  const { data, error } = await supabase
    .from("zone_briefs")
    .select("id, title, summary, veracity, importance, category, primary_theme, source_domains, updated_at")
    .eq("zone_slug", zoneSlug)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(FETCH_BRIEFS);
  if (error) throw new Error(`Lecture des synthèses impossible : ${error.message}`);

  // Les événements les plus importants d'abord, puis les plus récents.
  const briefs = ((data ?? []) as InputBrief[])
    .filter((b) => !isSportsTitle(b.title))
    .sort((a, b) => (IMPORTANCE_RANK[a.importance ?? "medium"] ?? 1) - (IMPORTANCE_RANK[b.importance ?? "medium"] ?? 1))
    .slice(0, MAX_BRIEFS);
  if (briefs.length === 0) {
    console.log(`  ${zoneName} : aucune synthèse Équinoxe depuis la dernière analyse, rien à faire.`);
    return { status: "ignorée", webSearches: 0 };
  }

  const fingerprint = fingerprintOf(briefs);
  if (!force && last?.fingerprint === fingerprint) {
    console.log(`  ${zoneName} : aucune nouveauté depuis la dernière synthèse, conservée.`);
    return { status: "inchangée", webSearches: 0 };
  }

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" }).format(new Date());
  const period = periodLabel((now - startMs) / 86_400_000);
  const web = decideWebSearch(briefs, webSearchesThisMonth, webPolicyFromEnv(), forceWeb);
  console.log(`  ${zoneName} : ${briefs.length} synthèses lues sur ${period} — web : ${web.allowed ? `oui (${web.maxUses} max, ${web.reason})` : `non (${web.reason})`}`);

  let result;
  try {
    if (!web.allowed) {
      result = await callSynthesisModel(apiKey, buildSynthesisPrompt(zoneName, briefs, today, false, period), false);
    } else {
      const webPrompt = buildSynthesisPrompt(zoneName, briefs, today, true, period);
      try {
        try {
          result = await callSynthesisModel(apiKey, webPrompt, true, SYNTHESIS_ALLOWED_DOMAINS, web.maxUses);
        } catch (err) {
          // Un domaine de la liste blanche bloque le robot d'Anthropic : l'API refuse
          // toute la requête et nomme les domaines fautifs. On les retire et on réessaie une fois.
          const blocked = err instanceof AnthropicRequestError ? inaccessibleDomainsFrom(err.body) : [];
          if (blocked.length === 0) throw err;
          console.warn(`  ${zoneName} : domaines inaccessibles retirés de la recherche : ${blocked.join(", ")}`);
          result = await callSynthesisModel(
            apiKey,
            webPrompt,
            true,
            SYNTHESIS_ALLOWED_DOMAINS.filter((domain) => !blocked.includes(domain)),
            web.maxUses
          );
        }
      } catch (err) {
        if (!isWebSearchUnavailable(err)) throw err;
        console.warn(`  ${zoneName} : recherche web indisponible sur ce compte, synthèse sans web.`);
        result = await callSynthesisModel(apiKey, buildSynthesisPrompt(zoneName, briefs, today, false, period), false);
      }
    }
  } catch (err) {
    await recordUsage({ job: "zone-synthesis", zoneSlug, model: SYNTHESIS_MODEL, usage: { inputTokens: 0, outputTokens: 0, webSearches: 0 }, ok: false, note: String(err).slice(0, 200) });
    throw err;
  }

  // Le coût est dû dès que le modèle a répondu, même si la réponse est inexploitable.
  let content;
  try {
    content = parseSynthesis(result.text);
  } catch (err) {
    await recordUsage({ job: "zone-synthesis", zoneSlug, model: SYNTHESIS_MODEL, usage: result.usage, ok: false, note: "réponse inexploitable" });
    throw err;
  }
  await recordUsage({ job: "zone-synthesis", zoneSlug, model: SYNTHESIS_MODEL, usage: result.usage, note: `${briefs.length} synthèses lues` });

  const { error: insertError } = await supabase.from("zone_syntheses").insert({
    zone_slug: zoneSlug,
    headline: content.headline,
    sections: content.sections,
    sources: result.sources,
    brief_ids: briefs.map((b) => b.id),
    fingerprint,
    used_web_search: result.usedWebSearch,
    model: SYNTHESIS_MODEL,
  });
  if (insertError) throw new Error(`Enregistrement impossible : ${insertError.message}`);

  console.log(
    `  ${zoneName} : synthèse créée (${briefs.length} synthèses Équinoxe, ${result.sources.length} sources, web : ${result.usedWebSearch ? "oui" : "non"}).`
  );
  return { status: "créée", webSearches: result.usage.webSearches };
}

// Dans GitHub Actions, une annotation d'erreur est lisible sur la page de
// l'exécution (et via l'API) sans ouvrir les journaux.
function reportFailure(label: string, message: string) {
  console.error(`  ${label} : ÉCHEC — ${message}`);
  if (process.env.GITHUB_ACTIONS) {
    const safe = message.slice(0, 400).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.log(`::error title=Synthèse ${label}::${safe}`);
  }
}

function notice(title: string, message: string) {
  console.log(message);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=${title}::${message.replace(/\n/g, " ")}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absent.");

  const zoneSlugs = ZONES.filter((z) => z.active && z.countries.length > 0 && z.slug !== "tracking").map((z) => z.slug);

  // Quelles zones ? --zone=all : toutes ; --zone=<zone> : celle-là ; sinon la zone du jour.
  let targets: string[];
  if (zoneArg === "all") targets = zoneSlugs;
  else if (zoneArg) targets = zoneSlugs.filter((s) => s === zoneArg);
  else {
    const today = zoneForWeekday(new Date().getUTCDay());
    targets = today && zoneSlugs.includes(today) ? [today] : [];
    if (targets.length === 0) {
      notice("Synthèse de zone", "Pas de synthèse de zone programmée aujourd'hui (lundi : points de situation, dimanche : repos).");
      return;
    }
  }
  if (targets.length === 0) throw new Error(`Zone inconnue : ${zoneArg}`);

  const budget = await checkBudget("zone-synthesis");
  if (budget.level !== "ok") notice("Budget IA", budget.message);
  else console.log(budget.message);
  if (!budget.allowed) return;

  console.log(`Synthèses de zone (modèle ${SYNTHESIS_MODEL}${force ? ", forcé" : ""}) : ${targets.join(", ")}`);
  let failed = 0;
  let webUsed = budget.spend.webSearches;
  for (const zoneSlug of targets) {
    try {
      const outcome = await synthesizeZone(zoneSlug, apiKey, webUsed);
      webUsed += outcome.webSearches;
    } catch (err) {
      failed++;
      reportFailure(zoneSlug, err instanceof Error ? err.message : String(err));
    }
  }
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
