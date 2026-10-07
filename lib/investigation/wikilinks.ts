import type { InvestigationEntity, Note } from "./types";

// Liens [[Titre]] entre notes, façon Obsidian : [[Titre]] ou [[Titre|texte affiché]].
// Un lien désigne une note par son titre, ou une entité du graphe par son nom
// ou un de ses alias. Jamais de rapprochement automatique ambigu : si un nom
// correspond à plusieurs entités, on demande laquelle.

export function normalizeKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const WIKI = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;

export interface WikiLinkRef {
  /** Cible telle qu'écrite entre les crochets. */
  target: string;
  display: string;
}

export function extractWikiLinks(body: string): WikiLinkRef[] {
  return [...body.matchAll(WIKI)].map((m) => ({ target: m[1].trim(), display: (m[2] ?? m[1]).trim() }));
}

export type WikiResolution =
  | { kind: "note"; note: Note }
  /** Une entité du graphe qui n'a pas encore de fiche texte. */
  | { kind: "entity"; entity: InvestigationEntity }
  | { kind: "ambiguous"; entities: InvestigationEntity[] }
  | { kind: "missing" };

export function resolveWikiLink(target: string, notes: Note[], entities: InvestigationEntity[]): WikiResolution {
  const key = normalizeKey(target);
  if (!key) return { kind: "missing" };

  const note = notes.find((n) => normalizeKey(n.title) === key);
  if (note) return { kind: "note", note };

  const matches = entities.filter(
    (entity) => normalizeKey(entity.name) === key || entity.aliases.some((alias) => normalizeKey(alias) === key)
  );
  if (matches.length === 0) return { kind: "missing" };
  if (matches.length > 1) return { kind: "ambiguous", entities: matches };

  const fiche = notes.find((n) => n.entityId === matches[0].id);
  return fiche ? { kind: "note", note: fiche } : { kind: "entity", entity: matches[0] };
}

/** Notes qui citent `target` par un lien [[…]]. */
export function findBacklinks(target: Note, notes: Note[], entities: InvestigationEntity[]): Note[] {
  return notes.filter((other) => {
    if (other.id === target.id) return false;
    return extractWikiLinks(other.body).some((link) => {
      const resolution = resolveWikiLink(link.target, notes, entities);
      return resolution.kind === "note" && resolution.note.id === target.id;
    });
  });
}

/** Titre libre : `base`, ou `base (2)`, `base (3)`… si une autre note le porte déjà. */
export function uniqueTitle(base: string, notes: Note[], ignoreId?: string): string {
  const taken = new Set(notes.filter((n) => n.id !== ignoreId).map((n) => normalizeKey(n.title)));
  const clean = base.trim() || "Sans titre";
  if (!taken.has(normalizeKey(clean))) return clean;
  for (let i = 2; ; i++) {
    const candidate = `${clean} (${i})`;
    if (!taken.has(normalizeKey(candidate))) return candidate;
  }
}

/** Renommage d'une note : les liens qui la désignaient suivent. */
export function replaceLinkTarget(body: string, oldTitle: string, newTitle: string): string {
  const oldKey = normalizeKey(oldTitle);
  return body.replace(WIKI, (whole, target: string, display?: string) =>
    normalizeKey(target) === oldKey ? `[[${newTitle}${display ? `|${display}` : ""}]]` : whole
  );
}

// ——— Mise en forme légère du texte (sous-ensemble de Markdown) ———

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "wiki"; target: string; display: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "image"; id: string; alt: string }
  | { type: "link"; label: string; url: string }
  | { type: "url"; url: string };

// Ordre des groupes : 1-2 lien [[…]] ; 3-4 image ![légende](img:ID) ; 5-6 lien [texte](adresse) ;
// 7 gras ; 8 italique ; 9 code ; 10 adresse nue.
const INLINE =
  /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]|!\[([^\]\n]*)\]\(img:([\w-]+)\)|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|(https?:\/\/[^\s<>\])]+)/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ type: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) tokens.push({ type: "wiki", target: match[1].trim(), display: (match[2] ?? match[1]).trim() });
    else if (match[4] !== undefined) tokens.push({ type: "image", id: match[4], alt: (match[3] ?? "").trim() });
    else if (match[6] !== undefined) tokens.push({ type: "link", label: match[5], url: match[6] });
    else if (match[7] !== undefined) tokens.push({ type: "bold", text: match[7] });
    else if (match[8] !== undefined) tokens.push({ type: "italic", text: match[8] });
    else if (match[9] !== undefined) tokens.push({ type: "code", text: match[9] });
    else tokens.push({ type: "url", url: match[10] });
    last = index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", text: text.slice(last) });
  return tokens;
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "rule" }
  | { type: "paragraph"; text: string };

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (!line.trim()) flush();
    else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flush();
      blocks.push({ type: "rule" });
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? lines[i].match(/^\s*\d+[.)]\s+(.+)$/) : lines[i].match(/^\s*[-*]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      i--;
      blocks.push({ type: "list", ordered, items });
    } else if (quote) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^>\s?(.*)$/);
        if (!m) break;
        quoted.push(m[1]);
        i++;
      }
      i--;
      blocks.push({ type: "quote", text: quoted.join("\n") });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

