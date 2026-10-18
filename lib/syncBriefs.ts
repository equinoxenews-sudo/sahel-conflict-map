import { shouldGenerateBriefs, generationRulesFromEnv } from "./aiBudget";
import { checkBudget, recordUsage } from "./aiUsage";
import { isAnalystV2Zone } from "./analystZones";
import { holdForReview, reviewsReady } from "./briefReviews";
import { chooseBriefImage } from "./briefImages";
import { fetchArticleContent } from "./articleSummary";
import { legacyVeracity } from "./confidence";
import { mapWithConcurrency } from "./gdelt";
import { locateBrief } from "./geocode";
import { isSportsTitle } from "./sportsFilter";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { MODEL, TIMEOUT_MS, synthesizeBriefs, type PreviousBrief, type SourceArticle } from "./synthesizeBriefs";
import { channelNote } from "./telegramChannels";
import { getZone } from "./zones";
import { activeDirective, directiveKeywords, directivePrompt, prioritize, type ZoneDirective } from "./zoneDirectives";
import { ZONE_KEYWORDS } from "./zoneKeywords";

// Kept small so one Claude call finishes inside the route's 60 s budget
// (all zones run concurrently); leftovers stay unacknowledged and are
// picked up on the next run.
const ARTICLES_PER_ZONE = 5;
const SUMMARY_FETCH_CONCURRENCY = 6;

// Zones « analyste » (lib/analystZones.ts) : jusqu'3 lots de 5 sources par passage, chacun
// complété par les messages Telegram récents de la zone. La route dispose de 300 s : un
// lot ne démarre que s'il peut finir à temps (ANALYST_TIME_BUDGET_MS).
// 5 sources par lot (au lieu de 8) : avec des articles de 150 à 400 mots, un lot de 8
// pouvait dépasser deux minutes de rédaction et être coupé.
const ANALYST_BATCH = 5;
const ANALYST_MAX_BATCHES = 3;
/** Un nouveau lot ne démarre que si ce temps n'est pas écoulé : ce budget + un lot complet
 *  (rédaction, TIMEOUT_MS, et téléchargement des pages) restent sous les 300 s de la route. */
const ANALYST_TIME_BUDGET_MS = 300_000 - TIMEOUT_MS - 45_000;
const TELEGRAM_PER_BATCH = 10;
const TELEGRAM_PROMPT_CHARS = 700;
const TELEGRAM_MAX_AGE_HOURS = 72;
/** Sans article de presse en attente, un appel « Telegram seul » demande au moins ce nombre de messages. */
const TELEGRAM_ONLY_MIN_POSTS = 2;

interface StoredArticle {
  id: number;
  title: string;
  url: string;
  domain: string | null;
  published_at: string | null;
  /** Image fournie par le flux RSS ; absente si la migration n'a pas été exécutée. */
  image_url?: string | null;
}

interface StoredTelegramPost {
  id: number;
  channel: string;
  url: string;
  text: string;
  image_url: string | null;
  published_at: string | null;
}

interface BatchResult {
  zoneSlug: string;
  articleCount: number;
  briefCount: number;
  telegramUsed: number;
  /** Articles mis en attente de la décision de Nicolas (doute de l'analyste). */
  held?: number;
  deferred?: string;
}

/** Colonnes et tables de la V2 présentes ? Sinon, la zone garde l'ancien fonctionnement. */
async function analystSchemaReady(): Promise<boolean> {
  const db = getSupabaseAdmin();
  const [a, b] = await Promise.all([
    db.from("zone_briefs").select("confidence, latitude").limit(1),
    db.from("telegram_posts").select("id").limit(1),
  ]);
  if (a.error || b.error) {
    console.warn("Analystes V2 : appliquer supabase/add-analyst-v2.sql ; ancien fonctionnement conservé en attendant.");
    return false;
  }
  return true;
}

async function loadTelegram(zoneSlug: string, exclude: Set<number>, keywords: string[] = []): Promise<StoredTelegramPost[]> {
  const since = new Date(Date.now() - TELEGRAM_MAX_AGE_HOURS * 3600_000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("telegram_posts")
    .select("id, channel, url, text, image_url, published_at")
    .eq("zone_slug", zoneSlug)
    .eq("used_in_brief", false)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    // Consigne du jour : un réservoir plus large, trié pour que les messages concernés passent d'abord.
    .limit((keywords.length ? TELEGRAM_PER_BATCH * 3 : TELEGRAM_PER_BATCH) + exclude.size);
  if (error) throw new Error(`Telegram : lecture impossible (${error.message})`);
  const posts = ((data ?? []) as StoredTelegramPost[]).filter((p) => !exclude.has(p.id));
  return prioritize(posts, (p) => p.text, keywords).slice(0, TELEGRAM_PER_BATCH);
}

function telegramSource(p: StoredTelegramPost): SourceArticle {
  return {
    title: p.text.split("\n")[0].slice(0, 140),
    url: p.url,
    domain: `t.me/${p.channel}`,
    summary: null,
    bodyText: p.text.slice(0, TELEGRAM_PROMPT_CHARS),
    imageUrl: p.image_url,
    publishedAt: p.published_at,
    telegram: { channel: p.channel, note: channelNote(p.channel) },
  };
}

async function briefBatch(
  zoneSlug: string,
  analyst: boolean,
  limit: number,
  telegramExclude: Set<number>,
  directive: ZoneDirective | null = null,
): Promise<BatchResult> {
  const keywords = directive ? directiveKeywords(directive.text) : [];
  const supabase = getSupabaseAdmin();

  const loadUnbriefed = (columns: string) =>
    supabase
      .from("articles")
      .select(columns)
      .eq("zone_slug", zoneSlug)
      .eq("used_in_brief", false)
      .order("published_at", { ascending: false })
      .limit(keywords.length ? limit * 4 : limit);
  // La colonne image_url (supabase/add-article-images.sql) peut ne pas exister encore.
  let { data, error } = await loadUnbriefed("id, title, url, domain, published_at, image_url");
  if (error && /image_url/.test(error.message)) {
    ({ data, error } = await loadUnbriefed("id, title, url, domain, published_at"));
  }

  if (error) {
    throw new Error(`Failed to load unbriefed articles for ${zoneSlug}: ${error.message}`);
  }

  // Articles de sport déjà en base (collectés avant le filtre) : écartés et
  // acquittés pour ne plus jamais être proposés à l'IA.
  const stored = (data ?? []) as unknown as StoredArticle[];
  const sportsIds = stored.filter((article) => isSportsTitle(article.title)).map((article) => article.id);
  if (sportsIds.length) {
    const { error: sportsError } = await supabase.from("articles").update({ used_in_brief: true }).in("id", sportsIds);
    if (sportsError) throw new Error(`Failed to set aside sports articles: ${sportsError.message}`);
  }
  // Consigne du jour : les articles qui en parlent passent en tête du lot.
  const articles = prioritize(stored.filter((article) => !sportsIds.includes(article.id)), (a) => a.title, keywords).slice(0, limit);
  const telegram = analyst ? await loadTelegram(zoneSlug, telegramExclude, keywords) : [];
  const telegramOnly = articles.length === 0;
  if (telegramOnly && telegram.length < TELEGRAM_ONLY_MIN_POSTS) {
    return { zoneSlug, articleCount: 0, briefCount: 0, telegramUsed: 0 };
  }

  // Génération conditionnelle : tant que le lot en attente est mince et récent, on ne
  // paie ni téléchargement de pages ni appel au modèle. Rien n'est acquitté : les
  // articles restent en attente et seront repris à la prochaine exécution.
  if (!telegramOnly) {
    const decision = shouldGenerateBriefs(
      articles.map((article) => ({ title: article.title, publishedAt: article.published_at })),
      new Date(),
      generationRulesFromEnv(),
    );
    if (!decision.generate) {
      console.log(`Brief sync ${zoneSlug} : report — ${decision.reason}`);
      return { zoneSlug, articleCount: articles.length, briefCount: 0, telegramUsed: 0, deferred: decision.reason };
    }
  }

  const pressSources: SourceArticle[] = await mapWithConcurrency(
    articles,
    SUMMARY_FETCH_CONCURRENCY,
    async (a) => {
      const { summary, imageUrl, bodyText } = await fetchArticleContent(a.url);
      return {
        title: a.title,
        url: a.url,
        domain: a.domain ?? new URL(a.url).hostname,
        summary,
        bodyText,
        // Photo de la page de l'article (souvent la plus grande), à défaut
        // celle du flux RSS, qui ne dépend pas du téléchargement de la page.
        imageUrl: imageUrl ?? a.image_url ?? null,
        publishedAt: a.published_at,
      };
    }
  );

  const { data: previousData, error: previousError } = await supabase
    .from("zone_briefs")
    .select("id, title, summary, sections, source_urls, source_domains, published_at")
    .eq("zone_slug", zoneSlug)
    .gte("published_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("published_at", { ascending: false }).limit(10);
  // Fail closed: without the previous briefs, a retry could create duplicates.
  if (previousError) throw new Error(`Cannot load previous briefs: ${previousError.message}`);
  const previous = (previousData ?? []) as PreviousBrief[];
  const alreadyCited = new Set(previous.flatMap((brief) => brief.source_urls));
  const acknowledgedIds = articles.filter((article) => alreadyCited.has(article.url)).map((article) => article.id);
  if (acknowledgedIds.length) {
    const { error: retryError } = await supabase.from("articles").update({ used_in_brief: true }).in("id", acknowledgedIds);
    if (retryError) throw new Error(`Failed to acknowledge existing citations: ${retryError.message}`);
  }
  const pendingPress = pressSources.filter((article) => !alreadyCited.has(article.url)
    && !!(article.bodyText?.trim() || article.summary?.trim()));
  const pendingTelegram = telegram.filter((p) => !alreadyCited.has(p.url)).map(telegramSource);
  // La presse d'abord : les messages Telegram suivent, en complément.
  const pendingSources = [...pendingPress, ...pendingTelegram];
  const zoneName = getZone(zoneSlug)?.name ?? zoneSlug;
  const briefs = await synthesizeBriefs(zoneName, pendingSources, previous, (usage) => {
    void recordUsage({
      job: "sync-briefs", zoneSlug, model: MODEL, usage,
      note: `${pendingPress.length} articles${analyst ? ` + ${pendingTelegram.length} Telegram` : ""}`,
    });
  }, analyst, directivePrompt(directive));

  const { data: recentImages, error: imageError } = await supabase.from("zone_briefs")
    .select("image_url").order("published_at", { ascending: false }).limit(100);
  if (imageError) throw new Error(`Cannot load recent images: ${imageError.message}`);
  const usedImages = new Set<string>((recentImages ?? []).map((row) => row.image_url).filter(Boolean));

  let telegramUsed = 0;
  let held = 0;
  // Only acknowledge sources after their corresponding brief was persisted.
  // A missing API key, malformed JSON or failed API request must not consume them.
  for (const brief of briefs) {
    const row: Record<string, unknown> = {
      zone_slug: zoneSlug, title: brief.title, summary: brief.excerpt,
      sections: brief.sections, veracity: brief.veracity,
      primary_theme: brief.primaryTheme, secondary_themes: brief.secondaryThemes,
      event_type: brief.eventType, importance: brief.importance,
      source_urls: brief.sourceUrls, source_domains: brief.sourceDomains,
      updated_at: new Date().toISOString(),
      image_url: chooseBriefImage(brief.imageCandidates, usedImages, zoneSlug),
    };
    if (analyst && brief.confidence) {
      row.confidence = brief.confidence.percent;
      row.confidence_label = brief.confidence.label;
      row.claimed_by = brief.confidence.claimedBy;
      row.veracity = legacyVeracity(brief.confidence.label);
      row.source_count = brief.sourceUrls.length;
      const point = brief.place ? await locateBrief(brief.place.city, brief.place.country) : null;
      row.place_name = point?.placeName ?? null;
      row.place_country = point?.country ?? brief.place?.country ?? null;
      row.latitude = point?.latitude ?? null;
      row.longitude = point?.longitude ?? null;
      row.geo_precision = point?.precision ?? null;
    }
    // Doute de l'analyste sur un nouvel article : pas de publication, Nicolas tranche
    // par Telegram (lib/briefReviews.ts). Les sources sont acquittées comme d'habitude.
    if (analyst && brief.doubt && brief.existingBriefId == null && (await reviewsReady())) {
      row.published_at = new Date().toISOString();
      await holdForReview(zoneSlug, row, brief.doubt);
      held += 1;
    } else {
      const result = brief.existingBriefId == null
        ? await supabase.from("zone_briefs").insert(row).select("id").single()
        : await supabase.from("zone_briefs").update(row).eq("id", brief.existingBriefId)
          .eq("zone_slug", zoneSlug).select("id").single();
      if (result.error) throw new Error(`Failed to persist brief: ${result.error.message}`);
    }
    const citedIds = articles.filter((article) => brief.newSourceUrls.includes(article.url)).map((article) => article.id);
    const { error: acknowledgeError } = await supabase.from("articles")
      .update({ used_in_brief: true }).in("id", citedIds);
    if (acknowledgeError) throw new Error(`Failed to acknowledge sources: ${acknowledgeError.message}`);
    // Messages Telegram cités : utilisés. Les autres restent disponibles 72 h pour
    // étoffer un futur article de presse.
    const citedTelegram = telegram.filter((p) => brief.newSourceUrls.includes(p.url)).map((p) => p.id);
    if (citedTelegram.length) {
      const { error: tgError } = await supabase.from("telegram_posts").update({ used_in_brief: true }).in("id", citedTelegram);
      if (tgError) throw new Error(`Failed to acknowledge Telegram sources: ${tgError.message}`);
      telegramUsed += citedTelegram.length;
    }
  }
  for (const p of telegram) telegramExclude.add(p.id);

  // A valid response (including []) means the entire submitted batch was
  // processed. Omitted articles must not be billed again each day. Exceptions
  // above preserve pending state; unavailable source text was never submitted.
  const submittedUrls = new Set(pendingPress.map((article) => article.url));
  const submittedIds = articles.filter((article) => submittedUrls.has(article.url)).map((article) => article.id);
  if (submittedIds.length) {
    const { error: processedError } = await supabase.from("articles").update({ used_in_brief: true }).in("id", submittedIds);
    if (processedError) throw new Error(`Failed to acknowledge processed batch: ${processedError.message}`);
  }
  return { zoneSlug, articleCount: articles.length, briefCount: briefs.length - held, telegramUsed, held };
}

async function briefZone(zoneSlug: string): Promise<BatchResult> {
  const analyst = isAnalystV2Zone(zoneSlug) && (await analystSchemaReady());
  if (!analyst) return briefBatch(zoneSlug, false, ARTICLES_PER_ZONE, new Set());
  const directive = await activeDirective(zoneSlug);

  // Plusieurs lots tant qu'il reste des articles, dans la limite du temps et du
  // plafond quotidien. Un même message Telegram n'est proposé qu'une fois par passage.
  const started = Date.now();
  const seenTelegram = new Set<number>();
  const total: BatchResult = { zoneSlug, articleCount: 0, briefCount: 0, telegramUsed: 0 };
  for (let batch = 0; batch < ANALYST_MAX_BATCHES && Date.now() - started < ANALYST_TIME_BUDGET_MS; batch++) {
    const r = await briefBatch(zoneSlug, true, ANALYST_BATCH, seenTelegram, directive);
    total.articleCount += r.articleCount;
    total.briefCount += r.briefCount;
    total.telegramUsed += r.telegramUsed;
    total.held = (total.held ?? 0) + (r.held ?? 0);
    if (r.deferred) total.deferred = r.deferred;
    // Lot incomplet ou reporté : plus rien à traiter pour aujourd'hui.
    if (r.deferred || r.articleCount < ANALYST_BATCH) break;
  }
  return total;
}

/**
 * Groups a batch of already-stored raw articles (lib/syncArticles.ts) per
 * zone into AI-written briefs (lib/synthesizeBriefs.ts) — each drawing on
 * the real extracted body text of its sources, not just a one-line
 * description, so the result can be a genuine short or long-form piece
 * depending on how much material is actually available. Reads only from
 * Supabase and the individual source URLs — no GDELT DOC calls here, so
 * it does not depend on GDELT DOC. Monitor execution time and API cost:
 * all zones run concurrently, but upstream latency can exceed the budget.
 */
export async function syncBriefs(onlyZone?: string) {
  // Before source downloads or paid AI calls: explicit, actionable migration gate.
  const admin = getSupabaseAdmin();
  const { error: columnError } = await admin.from("zone_briefs").select("updated_at").limit(1);
  const { error: archiveError } = await admin.from("brief_revisions").select("id").limit(1);
  if (columnError || archiveError) throw new Error(
    "Schéma des synthèses indisponible. Vérifier Supabase et appliquer supabase/add-brief-revisions.sql avant ce déploiement."
  );
  // Budget mensuel : au-delà du plafond de sécurité, aucun appel payant n'est lancé
  // (la collecte, les cartes et les contenus déjà publiés ne sont pas concernés).
  const budget = await checkBudget("sync-briefs");
  if (!budget.allowed) {
    console.warn(budget.message);
    return { summary: {}, errors: {}, skipped: budget.message };
  }
  if (budget.level !== "ok") console.warn(budget.message);

  const allZoneSlugs = Object.keys(ZONE_KEYWORDS);
  if (onlyZone && !allZoneSlugs.includes(onlyZone)) throw new Error(`Zone inconnue : ${onlyZone}`);
  const zoneSlugs = onlyZone ? [onlyZone] : allZoneSlugs;

  const results = await Promise.allSettled(zoneSlugs.map(async (zoneSlug) => {
    const startedAt = Date.now();
    try {
      return await briefZone(zoneSlug);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${message} (après ${Math.round((Date.now() - startedAt) / 1000)} s)`);
    }
  }));

  const summary: Record<string, { articles: number; briefs: number; telegram?: number; aTrancher?: number; deferred?: string } | -1> = {};
  const errors: Record<string, string> = {};
  results.forEach((result, i) => {
    const zoneSlug = zoneSlugs[i];
    if (result.status === "fulfilled") {
      summary[zoneSlug] = { articles: result.value.articleCount, briefs: result.value.briefCount, ...(result.value.telegramUsed ? { telegram: result.value.telegramUsed } : {}), ...(result.value.held ? { aTrancher: result.value.held } : {}), ...(result.value.deferred ? { deferred: result.value.deferred } : {}) };
    } else {
      console.error(`Brief sync failed for ${zoneSlug}:`, result.reason);
      summary[zoneSlug] = -1;
      errors[zoneSlug] = result.reason instanceof Error ? result.reason.message : String(result.reason);
    }
  });

  return { summary, errors, ...(budget.level !== "ok" ? { budget: budget.message } : {}) };
}
