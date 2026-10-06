"use client";

import { parseBlocks, parseInline, type WikiResolution } from "@/lib/investigation/wikilinks";
import styles from "./NotesWorkspace.module.css";

interface NoteRendererProps {
  body: string;
  resolve: (target: string) => WikiResolution;
  onLink: (target: string) => void;
}

const LINK_HINT: Record<WikiResolution["kind"], string> = {
  note: "Ouvrir la note",
  entity: "Cette entité du graphe n'a pas encore de fiche : cliquer pour la créer",
  ambiguous: "Plusieurs entités portent ce nom : cliquer pour choisir",
  missing: "Note inexistante : cliquer pour la créer",
};

function Inline({ text, resolve, onLink }: { text: string } & Omit<NoteRendererProps, "body">) {
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.type) {
          case "text":
            return <span key={index}>{token.text}</span>;
          case "bold":
            return <strong key={index}>{token.text}</strong>;
          case "italic":
            return <em key={index}>{token.text}</em>;
          case "code":
            return (
              <code key={index} className={styles.code}>
                {token.text}
              </code>
            );
          case "url":
            return (
              <a key={index} href={token.url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                {token.url}
              </a>
            );
          case "wiki": {
            const kind = resolve(token.target).kind;
            const className = `${styles.wikiLink} ${kind === "entity" ? styles.wikiEntity : ""} ${
              kind === "ambiguous" ? styles.wikiAmbiguous : ""
            } ${kind === "missing" ? styles.wikiMissing : ""}`;
            return (
              <button key={index} type="button" className={className} title={LINK_HINT[kind]} onClick={() => onLink(token.target)}>
                {token.display}
              </button>
            );
          }
        }
      })}
    </>
  );
}

// Lecture d'une note : sous-ensemble de Markdown (titres, listes, citations,
// gras, italique, code, adresses) et liens [[…]] cliquables. Aucun HTML brut
// n'est interprété : le texte ne produit que des éléments React.
export default function NoteRenderer({ body, resolve, onLink }: NoteRendererProps) {
  const blocks = parseBlocks(body);
  if (blocks.length === 0) return <p className={styles.emptyBody}>Note vide. Passe en mode édition pour écrire.</p>;
  const inline = (text: string) => <Inline text={text} resolve={resolve} onLink={onLink} />;

  return (
    <div className={styles.rendered}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = (["h2", "h3", "h4"] as const)[block.level - 1];
            return <Tag key={index}>{inline(block.text)}</Tag>;
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return <blockquote key={index}>{inline(block.text)}</blockquote>;
          case "rule":
            return <hr key={index} />;
          case "paragraph":
            return <p key={index}>{inline(block.text)}</p>;
        }
      })}
    </div>
  );
}
