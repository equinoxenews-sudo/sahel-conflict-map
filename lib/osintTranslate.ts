// Traduction française des fiches d'outils de la carte OSINT (Mon espace > Outils). Logique pure, sans réseau :
// l'appel à l'API est dans scripts/translate-osint-framework.ts. Testée dans tests/osint-framework.test.ts.
import { TRANSLATED_FIELDS, type OsintNode, type OsintTranslation, type OsintTranslations } from "./osintFramework";
import { FRENCH_STYLE_RULES } from "./frenchStyle";

type Field = (typeof TRANSLATED_FIELDS)[number];

/** Un outil à traduire : son numéro dans le lot, son adresse (clé de la traduction) et ses textes d'origine. */
export interface TranslationItem {
  id: number;
  url: string;
  fields: Partial<Record<Field, string>>;
}

/** Longueur maximale d'un texte traduit : une réponse hors norme est refusée plutôt qu'affichée. */
export const MAX_TRANSLATED_CHARS = 700;

/** Outils à traduire : un par adresse (un même outil listé dans plusieurs catégories ne se traduit qu'une fois). */
export function collectToTranslate(root: OsintNode, done: OsintTranslations = {}): Omit<TranslationItem, "id">[] {
  const seen = new Set<string>();
  const items: Omit<TranslationItem, "id">[] = [];
  (function walk(node: OsintNode) {
    if (node.type === "folder") {
      node.children?.forEach(walk);
      return;
    }
    if (!node.url || seen.has(node.url) || done[node.url]) return;
    const fields: Partial<Record<Field, string>> = {};
    for (const field of TRANSLATED_FIELDS) {
      const value = node[field]?.trim();
      if (value) fields[field] = value;
    }
    if (Object.keys(fields).length === 0) return;
    seen.add(node.url);
    items.push({ url: node.url, fields });
  })(root);
  return items;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Lot numéroté à partir de 1 (l'adresse reste de notre côté : le modèle ne la voit pas, elle ne peut pas être déformée). */
export function numberBatch(items: readonly Omit<TranslationItem, "id">[]): TranslationItem[] {
  return items.map((item, index) => ({ ...item, id: index + 1 }));
}

export function buildTranslationPrompt(batch: readonly TranslationItem[]): string {
  const payload = batch.map((item) => ({ id: item.id, ...item.fields }));
  return `Tu traduis en français des fiches d'outils OSINT (renseignement en sources ouvertes) destinées à des enquêteurs et des journalistes.

Règles :
- Traduis fidèlement, simplement, en phrases courtes. N'ajoute aucune information et n'interprète rien.
- Garde tels quels les noms de produits et de sites, les sigles et les termes techniques d'usage courant (OSINT, API, IP, DNS, WHOIS, Tor, Google Dork, OpSec, CLI, URL…).
- Ne traduis pas les adresses web, les noms de fichiers, de plateformes ni les exemples saisis.
${FRENCH_STYLE_RULES}
- Rends exactement les mêmes champs que ceux fournis pour chaque \`id\`, sans en ajouter ni en retirer.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte ni markdown autour, au même format que l'entrée (mêmes \`id\`, mêmes clés).

${JSON.stringify(payload)}`;
}

/** Tableau JSON de la réponse du modèle, même s'il l'a entouré de ``` ou de texte. */
function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("Réponse sans tableau JSON");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Traductions d'une réponse, indexées par adresse. Chaque entrée est vérifiée : numéro connu, champs attendus, textes non
 * vides et de longueur raisonnable. Une entrée invalide est écartée (l'outil restera en anglais), jamais publiée.
 */
export function parseTranslationBatch(text: string, batch: readonly TranslationItem[]): OsintTranslations {
  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed)) throw new Error("La réponse n'est pas un tableau");
  const byId = new Map(batch.map((item) => [item.id, item]));
  const result: OsintTranslations = {};
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const item = typeof record.id === "number" ? byId.get(record.id) : undefined;
    if (!item) continue;
    const translation: OsintTranslation = {};
    for (const field of TRANSLATED_FIELDS) {
      if (!(field in item.fields)) continue;
      const value = record[field];
      if (typeof value !== "string") continue;
      const clean = value.replace(/\s+/g, " ").trim();
      if (clean && clean.length <= MAX_TRANSLATED_CHARS) translation[field] = clean;
    }
    if (Object.keys(translation).length > 0) result[item.url] = translation;
  }
  return result;
}
