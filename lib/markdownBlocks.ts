// Analyse du Markdown des articles premium en blocs (sans rendu, testable seule).
import { parseImage } from "./articleBlocks";

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; lang: string; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "rule" };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    // Les retours à la ligne simples sont conservés (lignes « Analyste : … », « Période : … »).
    if (para.length) blocks.push({ type: "paragraph", text: para.join("\n") });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.trim().startsWith("```")) {
      flush();
      const lang = line.trim().slice(3).trim().toLowerCase();
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i]);
      blocks.push({ type: "code", lang, text: code.join("\n") });
      continue;
    }
    const image = parseImage(line);
    if (image) {
      flush();
      blocks.push({ type: "image", ...image });
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      flush();
      blocks.push({ type: "heading", level: Math.min(4, Math.max(2, h[1].length)) as 2 | 3 | 4, text: h[2] });
      continue;
    }
    if (RULE.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }
    if (line.trim().startsWith("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      flush();
      const head = cells(line);
      const rows: string[][] = [];
      i += 1;
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) rows.push(cells(lines[++i]));
      blocks.push({ type: "table", head, rows });
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const quote: string[] = [line.replace(/^\s*>\s?/, "")];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) quote.push(lines[++i].replace(/^\s*>\s?/, ""));
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const pattern = ordered ? NUMBERED : BULLET;
      const items = [(bullet ?? numbered)![1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const m = pattern.exec(next);
        if (m) items.push(m[1]);
        // Ligne de continuation (indentée) : rattachée à l'élément précédent.
        else if (next.trim() && /^\s{2,}/.test(next) && !BULLET.test(next) && !NUMBERED.test(next)) items[items.length - 1] += ` ${next.trim()}`;
        else break;
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

