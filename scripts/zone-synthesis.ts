// Agent de synthèse de zone : lit les synthèses Équinoxe des 72 dernières
// heures, complète avec une recherche web restreinte aux domaines autorisés
// (lib/synthesisSources.ts) et enregistre la synthèse dans zone_syntheses.
// Lancé chaque jour par .github/workflows/zone-synthesis.yml (pas de limite
// de 60 s comme sur Vercel). Usage local :
//   npx tsx scripts/zone-synthesis.ts [--force] [--zone=afrique]
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

// Un secret collé avec un espace, un retour à la ligne ou des guillemets
// ferait échouer chaque requête : on nettoie les valeurs avant usage.
for (const name of ["ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (value) process.env[name] = value.trim().replace(/^["']|["']$/g, "");
}

import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import {
  AnthropicRequestError,
  buildSynthesisPrompt,
  callSynthesisModel,
  fingerprintOf,
  parseSynthesis,
  SYNTHESIS_MODEL,
  type InputBrief,
} from "../lib/zoneSynthesis";
import { ZONES, getZone } from "../lib/zones";

const WINDOW_HOURS = 72;
const MAX_BRIEFS = 25;

const args = process.argv.slice(2);
const force = args.includes("--force") || process.env.FORCE === "true";
const onlyZone = args.find((a) => a.startsWith("--zone="))?.slice("--zone=".length);

function isWebSearchUnavailable(err: unknown): boolean {
  return err instanceof AnthropicRequestError && [400, 403].includes(err.status) && /web[_ ]search/i.test(err.body);
}

async function synthesizeZone(zoneSlug: string, apiKey: string): Promise<"créée" | "inchangée" | "ignorée"> {
  const supabase = getSupabaseAdmin();
  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();

  const { data, error } = await supabase
    .from("zone_briefs")
    .select("id, title, summary, veracity, importance, category, primary_theme, source_domains, updated_at")
    .eq("zone_slug", zoneSlug)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(MAX_BRIEFS);
  if (error) throw new Error(`Lecture des synthèses impossible : ${error.message}`);

  const briefs = (data ?? []) as InputBrief[];
  if (briefs.length === 0) {
    console.log(`  ${zoneName} : aucune synthèse Équinoxe récente, rien à faire.`);
    return "ignorée";
  }

  const fingerprint = fingerprintOf(briefs);
  const { data: last, error: lastError } = await supabase
    .from("zone_syntheses")
    .select("fingerprint")
    .eq("zone_slug", zoneSlug)
    .order("generated_at", { ascending: false })
    .limit(1);
  if (lastError) throw new Error(`Lecture de la dernière synthèse impossible : ${lastError.message}`);
  if (!force && last?.[0]?.fingerprint === fingerprint) {
    console.log(`  ${zoneName} : aucune nouveauté depuis la dernière synthèse, conservée.`);
    return "inchangée";
  }

  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" }).format(new Date());
  let result;
  try {
    result = await callSynthesisModel(apiKey, buildSynthesisPrompt(zoneName, briefs, today, true), true);
  } catch (err) {
    if (!isWebSearchUnavailable(err)) throw err;
    console.warn(`  ${zoneName} : recherche web indisponible sur ce compte, synthèse sans web.`);
    result = await callSynthesisModel(apiKey, buildSynthesisPrompt(zoneName, briefs, today, false), false);
  }

  const content = parseSynthesis(result.text);
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
  return "créée";
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

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absent.");

  const zoneSlugs = ZONES.filter((z) => z.active && z.countries.length > 0 && z.slug !== "tracking").map((z) => z.slug);
  const targets = onlyZone ? zoneSlugs.filter((s) => s === onlyZone) : zoneSlugs;
  if (targets.length === 0) throw new Error(`Zone inconnue : ${onlyZone}`);

  console.log(`Synthèses de zone (modèle ${SYNTHESIS_MODEL}${force ? ", forcé" : ""}) :`);
  let failed = 0;
  for (const zoneSlug of targets) {
    try {
      await synthesizeZone(zoneSlug, apiKey);
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
