// Agent « point de situation » : prépare, pour chaque zone, le brouillon du
// rapport de la période écoulée (lundi matin : jeudi soir → lundi matin ;
// jeudi soir : lundi matin → jeudi soir) à partir des synthèses Équinoxe.
// Le brouillon n'est PAS publié : il est relu et validé depuis /admin/situation.
// Lancé par .github/workflows/situation-report.yml. Usage local :
//   npx tsx scripts/situation-report.ts [--force] [--zone=afrique]
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

// Un secret collé avec un espace, un retour à la ligne ou des guillemets
// ferait échouer chaque requête : on nettoie les valeurs avant usage.
for (const name of ["ANTHROPIC_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL"]) {
  const value = process.env[name];
  if (value) process.env[name] = value.trim().replace(/^["']|["']$/g, "");
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import {
  buildSituationPrompt,
  parseSituationReport,
  psitLabel,
  SituationParseError,
  type SituationInputBrief,
} from "../lib/situationReport";
import { callSynthesisModel, SYNTHESIS_MODEL } from "../lib/zoneSynthesis";
import { ZONES, getZone } from "../lib/zones";

const DEFAULT_WINDOW_DAYS = 4;
const MAX_WINDOW_DAYS = 8;
const MIN_BRIEFS = 2;
const MAX_BRIEFS = 40;
// Deux lancements rapprochés (relance manuelle, cron en retard puis rattrapé)
// ne doivent pas produire deux brouillons pour la même période.
const DUPLICATE_GUARD_HOURS = 12;

const args = process.argv.slice(2);
const force = args.includes("--force") || process.env.FORCE === "true";
const onlyZone = args.find((a) => a.startsWith("--zone="))?.slice("--zone=".length);

const IMPORTANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

async function draftZone(zoneSlug: string, apiKey: string): Promise<"créé" | "ignoré"> {
  const supabase = getSupabaseAdmin();
  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const now = new Date();

  const { data: lastRows, error: lastError } = await supabase
    .from("situation_reports")
    .select("period_end, created_at")
    .eq("zone_slug", zoneSlug)
    .order("period_end", { ascending: false })
    .limit(1);
  if (lastError) throw new Error(`Lecture des rapports impossible : ${lastError.message}`);
  const last = lastRows?.[0] as { period_end: string; created_at: string } | undefined;

  if (!force && last && now.getTime() - new Date(last.created_at).getTime() < DUPLICATE_GUARD_HOURS * 3600_000) {
    console.log(`  ${zoneName} : un rapport a déjà été préparé il y a moins de ${DUPLICATE_GUARD_HOURS} h, ignoré.`);
    return "ignoré";
  }

  // La période commence où la précédente s'est arrêtée (aucun trou, aucun
  // chevauchement même si le cron GitHub a pris du retard), bornée à 8 jours.
  const earliest = new Date(now.getTime() - MAX_WINDOW_DAYS * 86400_000);
  const fallbackStart = new Date(now.getTime() - DEFAULT_WINDOW_DAYS * 86400_000);
  const periodStart = last ? new Date(Math.max(new Date(last.period_end).getTime(), earliest.getTime())) : fallbackStart;

  const { data, error } = await supabase
    .from("zone_briefs")
    .select("id, title, summary, sections, primary_theme, category, importance, veracity, source_domains, published_at, image_url")
    .eq("zone_slug", zoneSlug)
    .gte("updated_at", periodStart.toISOString())
    .order("updated_at", { ascending: false })
    .limit(MAX_BRIEFS);
  if (error) throw new Error(`Lecture des synthèses impossible : ${error.message}`);

  const briefs = (data ?? []) as SituationInputBrief[];
  if (briefs.length < MIN_BRIEFS) {
    console.log(`  ${zoneName} : ${briefs.length} synthèse(s) sur la période, pas assez pour un rapport.`);
    return "ignoré";
  }

  const prompt = buildSituationPrompt(zoneName, briefs, periodStart, now);
  let content;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await callSynthesisModel(apiKey, prompt, false);
      content = parseSituationReport(result.text, briefs, zoneSlug);
      break;
    } catch (err) {
      // Réponse mal formée : le modèle n'est pas déterministe, un second essai suffit souvent.
      if (!(err instanceof SituationParseError) || attempt >= 2) throw err;
      console.warn(`  ${zoneName} : réponse inexploitable (${err.message}), nouvel essai.`);
    }
  }

  // Image « majeure » : celle de la synthèse la plus importante parmi celles
  // retenues, de préférence une vraie photo plutôt que l'illustration de zone.
  const byId = new Map(briefs.map((b) => [b.id, b]));
  const usedIds = [...new Set(content.items.flatMap((i) => (i.brief_id !== null ? [i.brief_id] : [])))];
  const candidates = usedIds
    .map((id) => byId.get(id))
    .filter((b): b is SituationInputBrief => !!b?.image_url)
    .sort((a, b) => {
      const generic = Number(a.image_url?.startsWith("/equinoxe/hero-")) - Number(b.image_url?.startsWith("/equinoxe/hero-"));
      return generic || (IMPORTANCE_RANK[a.importance ?? "medium"] ?? 1) - (IMPORTANCE_RANK[b.importance ?? "medium"] ?? 1);
    });

  const { error: insertError } = await supabase.from("situation_reports").insert({
    zone_slug: zoneSlug,
    status: "draft",
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    title: content.title,
    items: content.items,
    conclusion: content.conclusion,
    image_url: candidates[0]?.image_url ?? null,
    brief_ids: usedIds,
    model: SYNTHESIS_MODEL,
  });
  if (insertError) throw new Error(`Enregistrement impossible : ${insertError.message}`);

  console.log(
    `  ${zoneName} : brouillon ${psitLabel(now).short} créé (${briefs.length} synthèses lues, ${content.items.length} événements).`
  );
  return "créé";
}

// Dans GitHub Actions, une annotation d'erreur est lisible sur la page de
// l'exécution (et via l'API) sans ouvrir les journaux.
function reportFailure(label: string, message: string) {
  console.error(`  ${label} : ÉCHEC — ${message}`);
  if (process.env.GITHUB_ACTIONS) {
    const safe = message.slice(0, 400).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.log(`::error title=Point de situation ${label}::${safe}`);
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absent.");

  const zoneSlugs = ZONES.filter((z) => z.active && z.countries.length > 0 && z.slug !== "tracking").map((z) => z.slug);
  const targets = onlyZone ? zoneSlugs.filter((s) => s === onlyZone) : zoneSlugs;
  if (targets.length === 0) throw new Error(`Zone inconnue : ${onlyZone}`);

  console.log(`Points de situation, brouillons (modèle ${SYNTHESIS_MODEL}${force ? ", forcé" : ""}) :`);
  let failed = 0;
  for (const zoneSlug of targets) {
    try {
      await draftZone(zoneSlug, apiKey);
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
