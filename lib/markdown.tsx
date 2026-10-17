import { Fragment, type ReactNode } from "react";

// Rendu Markdown minimal et sûr pour les articles premium : aucun HTML brut n'est
// interprété, seuls les liens http(s) sont cliquables. Couvre ce que produisent les
// analystes : titres, paragraphes, listes, citations, tableaux, séparateurs, gras,
// italique, code et liens.

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "code"; text: string }
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
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
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

const INLINE =
  /(`[^`]+`)|\*\*(.+?)\*\*|__(.+?)__|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])|(https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"])/g;

export function renderInline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2] ?? m[3]) out.push(<strong key={k}>{renderInline((m[2] ?? m[3])!, k)}</strong>);
    else if (m[4] && m[5])
      out.push(
        <a key={k} href={m[5]} target="_blank" rel="noopener noreferrer nofollow">
          {renderInline(m[4], k)}
        </a>
      );
    else if (m[6] ?? m[7]) out.push(<em key={k}>{renderInline((m[6] ?? m[7])!, k)}</em>);
    else if (m[8])
      out.push(
        <a key={k} href={m[8]} target="_blank" rel="noopener noreferrer nofollow">
          {m[8]}
        </a>
      );
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case "heading": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            return <Tag key={k}>{renderInline(b.text, k)}</Tag>;
          }
          case "paragraph":
            return (
              <p key={k}>
                {b.text.split("\n").map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {renderInline(line, `${k}-${j}`)}
                  </Fragment>
                ))}
              </p>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={k}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${k}-${j}`)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return <blockquote key={k}>{renderInline(b.text, k)}</blockquote>;
          case "table":
            return (
              <div key={k} data-table-wrap="">
                <table>
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j}>{renderInline(c, `${k}-h${j}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((c, j) => (
                          <td key={j}>{renderInline(c, `${k}-${r}-${j}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return <pre key={k}>{b.text}</pre>;
          case "rule":
            return <hr key={k} />;
        }
      })}
    </div>
  );
}
