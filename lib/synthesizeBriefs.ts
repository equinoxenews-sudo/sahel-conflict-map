const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 6000;
const TIMEOUT_MS = 30000;

export interface SourceArticle {
  title: string;
  url: string;
  domain: string;
  summary: string | null;
  bodyText: string | null;
  imageUrl: string | null;
}

export interface BriefSection {
  heading: string | null;
  body: string;
}

// Same categories already used for map event markers (types/event.ts) —
// reusing them lets one thematic filter work across both the map and the
// Actualité article list.
const CATEGORIES = [
  "Battles",
  "Explosions/Remote violence",
  "Violence against civilians",
  "Protests",
  "Riots",
  "Strategic developments",
] as const;
type Category = (typeof CATEGORIES)[number];

export interface SynthesizedBrief {
  title: string;
  /** One-sentence hook for card previews — the detail page shows `sections` in full. */
  excerpt: string;
  sections: BriefSection[];
  category: Category;
  sourceUrls: string[];
  sourceDomains: string[];
  /**
   * Every source's image, in citation order, deduplicated — not just the
   * first. Several outlets (middleeasteye.net, france24.com) reuse one
   * generic og:image across many unrelated articles, so the caller
   * (lib/syncBriefs.ts) needs alternatives to fall back to when the first
   * candidate is already showing on another brief.
   */
  imageCandidates: string[];
}

function buildPrompt(zoneName: string, articles: SourceArticle[]): string {
  const listing = articles
    .map((a, i) => {
      const body = a.bodyText ?? a.summary ?? "non disponible";
      return `[${i}] Source: ${a.domain}\nTitre: ${a.title}\nTexte: ${body}`;
    })
    .join("\n\n---\n\n");

  return `Tu es un journaliste qui rédige des articles d'analyse géopolitique en français pour un site OSINT, à partir de sources ouvertes réelles.

Voici plusieurs articles récents sur la zone "${zoneName}" :

${listing}

Regroupe ces articles par sujet/événement (chaque article n'appartient qu'à un seul groupe ; ignore ceux qui ne concernent pas un sujet géopolitique ou sécuritaire clair). Pour chaque groupe distinct, rédige un article dont la longueur s'adapte à la matière réellement disponible — mais exploite TOUJOURS le texte source à fond avant de conclure qu'il n'y a pas assez de matière : la plupart des dépêches contiennent, même en quelques phrases, plusieurs éléments exploitables (acteurs impliqués, lieu précis, chiffres, déclarations, chronologie, réactions, contexte antérieur). Un article qui se contente de reformuler le titre en une phrase est un échec, même pour un sujet mineur.

- Si tu n'as qu'un texte court sur le sujet : un article COURT mais complet, une seule section (heading: null), 180 à 280 mots — assez pour couvrir le fait, le contexte immédiat (qui, où, depuis quand) et sa portée, pas juste l'énoncé brut.
- Si la matière est modérée (une source moyennement détaillée, ou deux sources courtes) : un article de 280 à 450 mots, une ou deux sections.
- Si plusieurs sources fournissent du texte substantiel sur le même sujet : un article LONG et structuré, 3 à 5 sections avec un titre court chacune (par exemple "Ce que l'on sait", "Contexte", "Réactions", "Ce qui reste incertain", "Prochaines étapes"), 500 à 800 mots au total.

Dans tous les cas, va au-delà du simple constat factuel quand la source le permet : situe l'événement dans son contexte (acteurs, antécédents, enjeux) plutôt que de te limiter à la première phrase de la dépêche.

Classe aussi chaque article dans EXACTEMENT une de ces catégories : ${CATEGORIES.join(", ")}.

Règles strictes : n'utilise QUE les informations présentes dans les textes ci-dessus. N'invente aucun fait, aucune citation, aucun chiffre, aucune date qui n'y figure pas explicitement — étoffer veut dire mieux exploiter le texte source fourni, jamais ajouter une information qui n'y figure pas. Rédaction neutre, factuelle et journalistique en français.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni markdown autour, au format exact :
[{"title": "Titre de l'article", "excerpt": "Une phrase d'accroche pour la vignette.", "category": "Battles", "sections": [{"heading": null, "body": "Texte du paragraphe."}], "sourceIndexes": [0, 2]}]`;
}

function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

function isValidSection(value: unknown): value is BriefSection {
  if (typeof value !== "object" || value === null) return false;
  const section = value as { heading?: unknown; body?: unknown };
  return (
    (section.heading === null || typeof section.heading === "string") &&
    typeof section.body === "string" &&
    section.body.trim().length > 0
  );
}

function parseResponse(text: string, articles: SourceArticle[]): SynthesizedBrief[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const briefs: SynthesizedBrief[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const { title, excerpt, sections, category, sourceIndexes } = item as {
      title?: unknown;
      excerpt?: unknown;
      sections?: unknown;
      category?: unknown;
      sourceIndexes?: unknown;
    };

    if (
      typeof title !== "string" ||
      typeof excerpt !== "string" ||
      !Array.isArray(sections) ||
      sections.length === 0 ||
      !sections.every(isValidSection) ||
      !Array.isArray(sourceIndexes)
    ) {
      continue;
    }

    const sources = (sourceIndexes as number[])
      .map((i) => articles[i])
      .filter((a): a is SourceArticle => a !== undefined);
    if (sources.length === 0) continue;

    briefs.push({
      title,
      excerpt,
      sections: sections as BriefSection[],
      category: isValidCategory(category) ? category : "Strategic developments",
      // Kept 1:1 aligned with sourceUrls (not deduplicated) — the UI
      // indexes into both arrays together to link each domain label to
      // its URL.
      sourceUrls: sources.map((s) => s.url),
      sourceDomains: sources.map((s) => s.domain),
      imageCandidates: [...new Set(sources.map((s) => s.imageUrl).filter((u): u is string => !!u))],
    });
  }
  return briefs;
}

/**
 * Groups a batch of real OSINT articles into a handful of AI-written
 * pieces, each citing the source articles it draws on. Length adapts to
 * how much real body text is actually available per topic (see
 * buildPrompt) rather than a fixed target — short factual items stay
 * short instead of being padded with invented detail. Requires
 * ANTHROPIC_API_KEY — returns an empty array without making any request
 * if it isn't configured (this feature is opt-in), and on any API
 * failure, so a flaky/unset key never blocks the rest of a sync run.
 */
export async function synthesizeBriefs(
  zoneName: string,
  articles: SourceArticle[]
): Promise<SynthesizedBrief[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || articles.length === 0) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildPrompt(zoneName, articles) }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text ?? "";
    return parseResponse(text, articles);
  } catch (err) {
    console.error("Failed to synthesize briefs:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
