// Passage entre le texte enregistré d'une fiche (le même qu'avant : **gras**, ==surligné==, [[Fiche]], image
// ![légende](img:ID)…) et le document de l'éditeur de texte riche. Fonctions pures, sans navigateur : c'est le
// point critique (un texte mal relu ou mal réécrit serait abîmé), donc entièrement testé par aller-retour.
//
// Le texte enregistré ne change pas de forme : les fiches existantes, la recherche, les liens, les citations,
// les exports et la sauvegarde en ligne continuent de fonctionner. Seule marque ajoutée : le surlignage en
// couleur, {{~#rrggbb|texte}} ; ==texte== reste le surlignage jaune par défaut.
import { imageToken, parseImageAlt, type ImageSize } from "./imageRefs";
import { parseBlocks, parseInline } from "./wikilinks";

export interface RichMark {
  type: "bold" | "italic" | "code" | "link" | "highlight" | "textStyle";
  attrs?: Record<string, unknown>;
}

export interface RichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

/** Couleur du surlignage enregistré en ==texte== (sans couleur choisie). */
export const DEFAULT_HIGHLIGHT = "#ffd60a";

const ZWSP = "​";

type MarkState = RichMark[];

const withMark = (marks: MarkState, mark: RichMark): MarkState => [...marks.filter((existing) => existing.type !== mark.type), mark];

function textNodes(text: string, marks: MarkState): RichNode[] {
  // Un retour à la ligne dans un paragraphe est un saut de ligne de l'éditeur.
  const nodes: RichNode[] = [];
  text.split("\n").forEach((part, index) => {
    if (index > 0) nodes.push({ type: "hardBreak" });
    if (part) nodes.push(marks.length ? { type: "text", text: part, marks } : { type: "text", text: part });
  });
  return nodes;
}

/** Texte en ligne (avec ses marques) → nœuds de l'éditeur. Les passages mis en forme sont relus récursivement. */
function inlineToNodes(text: string, marks: MarkState = []): RichNode[] {
  const nodes: RichNode[] = [];
  for (const token of parseInline(text)) {
    switch (token.type) {
      case "text":
        nodes.push(...textNodes(token.text, marks));
        break;
      case "bold":
        nodes.push(...inlineToNodes(token.text, withMark(marks, { type: "bold" })));
        break;
      case "italic":
        nodes.push(...inlineToNodes(token.text, withMark(marks, { type: "italic" })));
        break;
      case "bolditalic":
        nodes.push(...inlineToNodes(token.text, withMark(withMark(marks, { type: "bold" }), { type: "italic" })));
        break;
      case "mark":
        nodes.push(...inlineToNodes(token.text, withMark(marks, { type: "highlight", attrs: { color: DEFAULT_HIGHLIGHT } })));
        break;
      case "highlight":
        nodes.push(...inlineToNodes(token.text, withMark(marks, { type: "highlight", attrs: { color: token.color } })));
        break;
      case "color":
        nodes.push(...inlineToNodes(token.text, withMark(marks, { type: "textStyle", attrs: { color: token.color } })));
        break;
      case "code":
        nodes.push(...textNodes(token.text, [{ type: "code" }]));
        break;
      case "link":
        nodes.push(...textNodes(token.label, withMark(marks, { type: "link", attrs: { href: token.url } })));
        break;
      case "url":
        // Une adresse nue reste du texte : elle redevient cliquable à la lecture.
        nodes.push(...textNodes(token.url, marks));
        break;
      case "wiki":
        nodes.push({ type: "wikiLink", attrs: { target: token.target, display: token.display } });
        break;
      case "image":
        nodes.push({ type: "inlineImage", attrs: { id: token.id, alt: token.alt } });
        break;
      case "cite":
        nodes.push({ type: "citeRef", attrs: { id: token.id } });
        break;
    }
  }
  return nodes;
}

const paragraph = (nodes: RichNode[]): RichNode => (nodes.length ? { type: "paragraph", content: nodes } : { type: "paragraph" });

/** Texte enregistré d'une fiche → document de l'éditeur. */
export function bodyToDoc(body: string): RichDoc {
  const content: RichNode[] = [];
  for (const block of parseBlocks(body)) {
    switch (block.type) {
      case "heading":
        content.push({ type: "heading", attrs: { level: block.level }, content: inlineToNodes(block.text) });
        break;
      case "list":
        content.push({
          type: block.ordered ? "orderedList" : "bulletList",
          content: block.items.map((item) => ({ type: "listItem", content: [paragraph(inlineToNodes(item))] })),
        });
        break;
      case "quote":
        content.push({ type: "blockquote", content: [paragraph(inlineToNodes(block.text))] });
        break;
      case "rule":
        content.push({ type: "horizontalRule" });
        break;
      case "image": {
        const { caption, size } = parseImageAlt(block.alt);
        content.push({ type: "imageBlock", attrs: { id: block.id, caption, size } });
        break;
      }
      case "paragraph":
        content.push(paragraph(inlineToNodes(block.text)));
        break;
    }
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

// ——— Document de l'éditeur → texte enregistré ———

const markOf = (node: RichNode, type: RichMark["type"]) => node.marks?.find((mark) => mark.type === type);

/** Entoure un texte de ses marques, dans l'ordre : lien, couleur, surlignage, gras / italique. Les espaces de bord restent dehors. */
function wrapText(text: string, node: RichNode): string {
  if (markOf(node, "code")) return `\`${text}\``;
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.slice(lead.length).match(/\s*$/)?.[0] ?? "";
  let core = text.slice(lead.length, text.length - trail.length);
  if (!core) return text;

  const link = markOf(node, "link");
  const href = typeof link?.attrs?.href === "string" ? (link.attrs.href as string) : null;
  if (href && /^https?:\/\//.test(href)) core = `[${core.replace(/[\]\n]/g, " ")}](${href})`;

  const color = markOf(node, "textStyle")?.attrs?.color;
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) core = `{{${color.toLowerCase()}|${core}}}`;

  const highlight = markOf(node, "highlight");
  if (highlight) {
    const bg = highlight.attrs?.color;
    core =
      typeof bg === "string" && /^#[0-9a-fA-F]{6}$/.test(bg) && bg.toLowerCase() !== DEFAULT_HIGHLIGHT ? `{{~${bg.toLowerCase()}|${core}}}` : `==${core}==`;
  }

  const bold = Boolean(markOf(node, "bold"));
  const italic = Boolean(markOf(node, "italic"));
  if (bold && italic) core = `***${core}***`;
  else if (bold) core = `**${core}**`;
  else if (italic) core = `*${core}*`;
  return `${lead}${core}${trail}`;
}

function inlineToText(nodes: RichNode[] | undefined, hardBreak: string): string {
  return (nodes ?? [])
    .map((node) => {
      switch (node.type) {
        case "text":
          return wrapText(node.text ?? "", node);
        case "hardBreak":
          return hardBreak;
        case "wikiLink": {
          const target = String(node.attrs?.target ?? "");
          const display = String(node.attrs?.display ?? target);
          return display && display !== target ? `[[${target}|${display}]]` : `[[${target}]]`;
        }
        case "inlineImage":
          return `![${String(node.attrs?.alt ?? "")}](img:${String(node.attrs?.id ?? "")})`;
        case "citeRef":
          return `[^${String(node.attrs?.id ?? "")}]`;
        default:
          return "";
      }
    })
    .join("");
}

/** Une ligne dont le début serait relu comme un titre, une liste, une citation ou un trait reçoit un caractère invisible devant. */
function guardLine(line: string): string {
  return /^(#{1,3}\s|\s*[-*]\s|\s*\d+[.)]\s|>|\s*(---+|\*\*\*+)\s*$)/.test(line) ? `${ZWSP}${line}` : line;
}

const clampSize = (value: unknown): ImageSize => (value === "s" || value === "m" || value === "full" ? value : "l");

function blockToText(node: RichNode): string | null {
  switch (node.type) {
    case "paragraph": {
      const text = inlineToText(node.content, "\n");
      if (!text.trim()) return null;
      return text
        .split("\n")
        .map((line) => (line.trim() ? guardLine(line) : ""))
        .join("\n");
    }
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)));
      const text = inlineToText(node.content, " ").trim();
      return text ? `${"#".repeat(level)} ${text}` : null;
    }
    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      const items = (node.content ?? [])
        .map((item) => (item.content ?? []).map((child) => inlineToText(child.content, " ")).join(" ").trim())
        .filter(Boolean);
      return items.length ? items.map((item, index) => (ordered ? `${index + 1}. ${item}` : `- ${item}`)).join("\n") : null;
    }
    case "blockquote": {
      const lines = (node.content ?? [])
        .flatMap((child) => inlineToText(child.content, "\n").split("\n"))
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.length ? lines.map((line) => `> ${line}`).join("\n") : null;
    }
    case "horizontalRule":
      return "---";
    case "imageBlock":
      return imageToken(String(node.attrs?.id ?? ""), String(node.attrs?.caption ?? ""), clampSize(node.attrs?.size));
    default:
      return null;
  }
}

/** Document de l'éditeur → texte enregistré (blocs séparés par une ligne vide). */
export function docToBody(doc: RichDoc | RichNode): string {
  return (doc.content ?? [])
    .map(blockToText)
    .filter((block): block is string => block !== null)
    .join("\n\n");
}
