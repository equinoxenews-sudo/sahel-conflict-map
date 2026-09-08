const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1200;
const TIMEOUT_MS = 20000;

export interface SourceArticle {
  title: string;
  url: string;
  domain: string;
  summary: string | null;
}

export interface SynthesizedBrief {
  title: string;
  summary: string;
  sourceUrls: string[];
  sourceDomains: string[];
}

function buildPrompt(zoneName: string, articles: SourceArticle[]): string {
  const listing = articles
    .map(
      (a, i) =>
        `[${i}] Source: ${a.domain}\nTitre: ${a.title}\nDescription: ${a.summary ?? "non disponible"}`
    )
    .join("\n\n");

  return `Tu es un assistant qui aide à synthétiser des articles de sources ouvertes (OSINT) pour un site d'analyse géopolitique en français, sur la zone "${zoneName}".

Voici une liste d'articles récents :

${listing}

Regroupe ces articles par sujet/événement (chaque article n'appartient qu'à un seul groupe, ignore ceux qui ne concernent pas un sujet géopolitique ou sécuritaire clair). Pour chaque groupe distinct, rédige une synthèse factuelle et neutre de 2 à 3 phrases en français, basée uniquement sur les informations données ci-dessus — n'invente aucun fait qui n'y figure pas.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni markdown autour, au format exact :
[{"title": "Titre court du sujet", "summary": "Synthèse en 2-3 phrases.", "sourceIndexes": [0, 2]}]`;
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
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as { title?: unknown }).title !== "string" ||
      typeof (item as { summary?: unknown }).summary !== "string" ||
      !Array.isArray((item as { sourceIndexes?: unknown }).sourceIndexes)
    ) {
      continue;
    }
    const { title, summary, sourceIndexes } = item as {
      title: string;
      summary: string;
      sourceIndexes: number[];
    };
    const sources = sourceIndexes
      .map((i) => articles[i])
      .filter((a): a is SourceArticle => a !== undefined);
    if (sources.length === 0) continue;

    briefs.push({
      title,
      summary,
      // Kept 1:1 aligned with sourceUrls (not deduplicated) — the UI
      // indexes into both arrays together to link each domain label to
      // its URL.
      sourceUrls: sources.map((s) => s.url),
      sourceDomains: sources.map((s) => s.domain),
    });
  }
  return briefs;
}

/**
 * Groups a batch of real OSINT articles into a handful of short (2-3
 * sentence) synthesized briefs, each citing the source articles it draws
 * on. Requires ANTHROPIC_API_KEY — returns an empty array without making
 * any request if it isn't configured (this feature is opt-in), and on any
 * API failure, so a flaky/unset key never blocks the rest of a sync run.
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
