"use client";

import { useEffect, useState } from "react";
import { citationNumbers } from "@/lib/investigation/citations";
import { parseImageAlt } from "@/lib/investigation/imageRefs";
import type { Source } from "@/lib/investigation/types";
import { parseBlocks, parseInline, type WikiResolution } from "@/lib/investigation/wikilinks";
import SourceFileChip from "./SourceFileChip";
import { useEntityImage } from "./useEntityImage";
import styles from "./NotesWorkspace.module.css";

interface NoteRendererProps {
  body: string;
  resolve: (target: string) => WikiResolution;
  onLink: (target: string) => void;
  /** Sources du dossier : elles donnent leur titre, leur adresse et leur document aux repères [n]. */
  sources?: Source[];
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const LINK_HINT: Record<WikiResolution["kind"], string> = {
  note: "Ouvrir la note",
  entity: "Cette entité du graphe n'a pas encore de fiche : cliquer pour la créer",
  ambiguous: "Plusieurs entités portent ce nom : cliquer pour choisir",
  missing: "Note inexistante : cliquer pour la créer",
};

type Zoom = (image: { url: string; alt: string }) => void;

// Image du texte : cliquable pour l'agrandir (image à sa définition d'origine), légende dessous. Seule sur
// sa ligne, c'est une figure en bloc dont la taille se règle (S, M, grande, pleine largeur) ; au milieu d'une
// phrase, c'est une vignette dans le texte.
function NoteImage({ id, alt, onZoom, block = false }: { id: string; alt: string; onZoom: Zoom; block?: boolean }) {
  const url = useEntityImage(id);
  const { caption, size } = parseImageAlt(alt);
  return (
    <span className={block ? styles.figureBlock : styles.figure} data-size={block ? size : undefined}>
      {url ? (
        <button type="button" className={styles.figureButton} onClick={() => onZoom({ url, alt: caption })} title="Agrandir">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption} className={styles.figureImage} />
        </button>
      ) : (
        <span className={styles.figureMissing}>Image introuvable (supprimée ou non importée)</span>
      )}
      {caption ? <span className={styles.figureCaption}>{caption}</span> : null}
    </span>
  );
}

function Inline({
  text,
  resolve,
  onLink,
  onZoom,
  numbers,
  sourceById,
}: { text: string; onZoom: Zoom; numbers: Map<string, number>; sourceById: Map<string, Source> } & Pick<NoteRendererProps, "resolve" | "onLink">) {
  // Un passage mis en forme peut en contenir d'autres (gras + couleur + surlignage) : on le relit.
  const nested = (inner: string) => (
    <Inline text={inner} resolve={resolve} onLink={onLink} onZoom={onZoom} numbers={numbers} sourceById={sourceById} />
  );
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.type) {
          case "text":
            return <span key={index}>{token.text}</span>;
          case "bold":
            return <strong key={index}>{nested(token.text)}</strong>;
          case "italic":
            return <em key={index}>{nested(token.text)}</em>;
          case "bolditalic":
            return (
              <strong key={index}>
                <em>{nested(token.text)}</em>
              </strong>
            );
          case "mark":
            return (
              <mark key={index} className={styles.mark}>
                {nested(token.text)}
              </mark>
            );
          case "highlight":
            return (
              <mark key={index} className={styles.mark} style={{ background: `${token.color}66` }}>
                {nested(token.text)}
              </mark>
            );
          case "color":
            return (
              <span key={index} style={{ color: token.color }}>
                {nested(token.text)}
              </span>
            );
          case "code":
            return (
              <code key={index} className={styles.code}>
                {token.text}
              </code>
            );
          case "image":
            return <NoteImage key={index} id={token.id} alt={token.alt} onZoom={onZoom} />;
          case "link":
            return (
              <a key={index} href={token.url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                {token.label}
              </a>
            );
          case "cite": {
            const number = numbers.get(token.id) ?? 0;
            const source = sourceById.get(token.id);
            return (
              <sup key={index} className={styles.citeWrap}>
                <a
                  href={`#ref-${number}`}
                  className={source ? styles.cite : `${styles.cite} ${styles.citeMissing}`}
                  title={source ? source.title : "Source supprimée"}
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(`ref-${number}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  [{number}]
                </a>
              </sup>
            );
          }
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
export default function NoteRenderer({ body, resolve, onLink, sources = [] }: NoteRendererProps) {
  const [zoomed, setZoomed] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    if (!zoomed) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [zoomed]);

  const blocks = parseBlocks(body);
  if (blocks.length === 0) return <p className={styles.emptyBody}>Note vide. Passe en mode édition pour écrire.</p>;
  const numbers = citationNumbers(body);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const inline = (text: string) => (
    <Inline text={text} resolve={resolve} onLink={onLink} onZoom={setZoomed} numbers={numbers} sourceById={sourceById} />
  );

  return (
    <div className={styles.rendered} lang="fr">
      {zoomed ? (
        <div className={styles.lightbox} onClick={() => setZoomed(null)} role="dialog" aria-label="Image agrandie">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomed.url} alt={zoomed.alt} className={styles.lightboxImage} />
          {zoomed.alt ? <span className={styles.lightboxCaption}>{zoomed.alt}</span> : null}
          <a href={zoomed.url} target="_blank" rel="noopener noreferrer" className={styles.lightboxOpen} onClick={(e) => e.stopPropagation()}>
            Ouvrir dans un nouvel onglet
          </a>
        </div>
      ) : null}
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
          case "image":
            return <NoteImage key={index} id={block.id} alt={block.alt} onZoom={setZoomed} block />;
          case "paragraph":
            return <p key={index}>{inline(block.text)}</p>;
        }
      })}
      {numbers.size > 0 ? (
        <section className={styles.references} aria-label="Références">
          <h4 className={styles.referencesTitle}>Références</h4>
          <ol className={styles.referenceList}>
            {[...numbers.entries()].map(([id, number]) => {
              const source = sourceById.get(id);
              return (
                <li key={id} id={`ref-${number}`} className={styles.reference}>
                  <span className={styles.refNumber}>[{number}]</span>
                  {source ? (
                    <span className={styles.refBody}>
                      <span className={styles.refTitle}>{source.title}</span>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                          {host(source.url)}
                        </a>
                      ) : null}
                      {source.file ? <SourceFileChip file={source.file} /> : null}
                      <span className={styles.refMeta}>
                        Fiabilité {source.reliability}/5{source.publishedAt ? ` · publié le ${source.publishedAt}` : ""}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.refMissing}>Source supprimée du dossier.</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
