const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4000;
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

export interface SynthesizedBrief {
  title: string;
  /** One-sentence hook for card previews — the detail page shows `sections` in full. */
  excerpt: string;
  sections: BriefSection[];
  sourceUrls: string[];
  sourceDomains: string[];
  imageUrl: string | null;
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

Regroupe ces articles par sujet/événement (chaque article n'appartient qu'à un seul groupe ; ignore ceux qui ne concernent pas un sujet géopolitique ou sécuritaire clair). Pour chaque groupe distinct, rédige un article dont la longueur s'adapte à la matière réellement disponible :

- Si tu n'as qu'un texte court ou peu de matière sur le sujet : un article COURT, une seule section (heading: null), 100 à 200 mots.
- Si plusieurs sources fournissent du texte substantiel sur le même sujet : un article PLUS LONG et structuré, 2 à 4 sections avec un titre court chacune (par exemple "Ce que l'on sait", "Contexte", "Réactions", "Ce qui reste incertain"), 400 à 700 mots au total.

Règles strictes : n'utilise QUE les informations présentes dans les textes ci-dessus. N'invente aucun fait, aucune citation, aucun chiffre, aucune date qui n'y figure pas explicitement. Rédaction neutre, factuelle et journalistique en français.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni markdown autour, au format exact :
[{"title": "Titre de l'article", "excerpt": "Une phrase d'accroche pour la vignette.", "sections": [{"heading": null, "body": "Texte du paragraphe."}], "sourceIndexes": [0, 2]}]`;
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
    const { title, excerpt, sections, sourceIndexes } = item as {
      title?: unknown;
      excerpt?: unknown;
      sections?: unknown;
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
      // Kept 1:1 aligned with sourceUrls (not deduplicated) — the UI
      // indexes into both arrays together to link each domain label to
      // its URL.
      sourceUrls: sources.map((s) => s.url),
      sourceDomains: sources.map((s) => s.domain),
      imageUrl: sources.find((s) => s.imageUrl)?.imageUrl ?? null,
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
