import { Fragment, type ReactNode } from "react";
import ArticleChart from "@/components/premium/ArticleChart";
import ArticleMapBlock from "@/components/premium/ArticleMapBlock";
import blockStyles from "@/components/premium/ArticleBlocks.module.css";
import { parseChart, parseMap } from "./articleBlocks";
import { parseBlocks } from "./markdownBlocks";

// Rendu Markdown minimal et sûr pour les articles premium : aucun HTML brut n'est
// interprété, seuls les liens http(s) sont cliquables. Couvre ce que produisent les
// analystes : titres, paragraphes, listes, citations, tableaux, séparateurs, gras,
// italique, code, liens, images, graphiques et cartes.

export { parseBlocks, type Block } from "./markdownBlocks";

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
          case "code": {
            // Blocs enrichis des analystes ; invalides, ils restent affichés comme du code.
            const chart = b.lang === "graphique" ? parseChart(b.text) : null;
            if (chart) return <ArticleChart key={k} spec={chart} />;
            const map = b.lang === "carte" ? parseMap(b.text) : null;
            if (map) return <ArticleMapBlock key={k} spec={map} />;
            return <pre key={k}>{b.text}</pre>;
          }
          case "image":
            return (
              <figure key={k} className={`${blockStyles.image}${i === 0 ? ` ${blockStyles.cover}` : ""}`}>
                {/* Images externes (Wikimedia…) : pas d'optimisation Next, chargement différé. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.src} alt={b.alt} loading={i === 0 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
                {b.alt && <figcaption>{b.alt}</figcaption>}
              </figure>
            );
          case "rule":
            return <hr key={k} />;
        }
      })}
    </div>
  );
}
