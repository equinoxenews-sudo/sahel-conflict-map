"use client";

import { Node, mergeAttributes, nodeInputRule, type Extensions } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Highlight } from "@tiptap/extension-highlight";
import { ListItem } from "@tiptap/extension-list";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { createContext, useContext } from "react";
import type { WikiResolution } from "@/lib/investigation/wikilinks";
import { useEntityImage } from "../useEntityImage";
import notes from "../NotesWorkspace.module.css";
import styles from "./RichEditor.module.css";

// Ce que les nœuds de l'éditeur ont besoin de savoir de la fiche (lien vers une note ou une fiche, ouverture).
interface RichEditorContextValue {
  resolve: (target: string) => WikiResolution;
  onLinkClick: (target: string) => void;
}

export const RichEditorContext = createContext<RichEditorContextValue>({
  resolve: () => ({ kind: "missing" }) as WikiResolution,
  onLinkClick: () => undefined,
});

// Surlignage : la couleur choisie sert de fond, adoucie pour que le texte reste lisible (comme à la lecture).
const SoftHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-color"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.color ? { "data-color": String(attributes.color), style: `background-color: ${String(attributes.color)}66; color: inherit` } : {},
      },
    };
  },
});

// ——— Lien vers une note ou une fiche : [[Nom]] ou [[Nom|texte affiché]], un seul bloc dans le texte ———

function WikiLinkView({ node }: NodeViewProps) {
  const { resolve, onLinkClick } = useContext(RichEditorContext);
  const target = String(node.attrs.target ?? "");
  const kind = resolve(target).kind;
  const className = [notes.wikiLink, kind === "entity" ? notes.wikiEntity : "", kind === "ambiguous" ? notes.wikiAmbiguous : "", kind === "missing" ? notes.wikiMissing : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <NodeViewWrapper as="span" className={styles.inlineAtom}>
      <span
        className={className}
        title="Ctrl + clic pour ouvrir"
        onClick={(event) => {
          if (event.ctrlKey || event.metaKey) onLinkClick(target);
        }}
      >
        {String(node.attrs.display ?? target)}
      </span>
    </NodeViewWrapper>
  );
}

const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { target: { default: "" }, display: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-wiki]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-wiki": HTMLAttributes.target }), String(HTMLAttributes.display ?? "")];
  },
  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView);
  },
  // [[Nom]] ou [[Nom|texte]] tapé à la main devient un lien dès le dernier crochet.
  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]$/,
        type: this.type,
        getAttributes: (match) => ({ target: match[1].trim(), display: (match[2] ?? match[1]).trim() }),
      }),
    ];
  },
});

// ——— Repère de source [^ID] (anciennes fiches) : conservé tel quel ———

const CiteRef = Node.create({
  name: "citeRef",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return { id: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "sup[data-cite]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes({ "data-cite": HTMLAttributes.id }), "[source]"];
  },
});

// ——— Image au milieu d'une phrase : une vignette ———

function InlineImageView({ node }: NodeViewProps) {
  const url = useEntityImage(String(node.attrs.id ?? ""));
  return (
    <NodeViewWrapper as="span" className={styles.inlineAtom}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={String(node.attrs.alt ?? "")} className={notes.figureImage} style={{ maxHeight: "1.6em", width: "auto" }} />
      ) : (
        <span className={notes.figureMissing}>image introuvable</span>
      )}
    </NodeViewWrapper>
  );
}

const InlineImage = Node.create({
  name: "inlineImage",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return { id: { default: "" }, alt: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-inline-image]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-inline-image": HTMLAttributes.id }), "[image]"];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineImageView);
  },
});

// ——— Image en bloc : seule sur sa ligne, avec sa légende et sa taille (petite, moyenne, grande, pleine largeur) ———

function ImageBlockView({ node, selected }: NodeViewProps) {
  const id = String(node.attrs.id ?? "");
  const url = useEntityImage(id);
  const size = String(node.attrs.size ?? "l");
  const caption = String(node.attrs.caption ?? "");
  return (
    <NodeViewWrapper className={selected ? `${styles.imageBlock} ${styles.imageBlockSelected}` : styles.imageBlock} data-drag-handle>
      <span className={notes.figureBlock} data-size={size}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={caption} className={notes.figureImage} draggable={false} />
        ) : (
          <span className={notes.figureMissing}>Image introuvable (supprimée ou non importée)</span>
        )}
        {caption ? <span className={notes.figureCaption}>{caption}</span> : null}
      </span>
    </NodeViewWrapper>
  );
}

const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { id: { default: "" }, caption: { default: "" }, size: { default: "l" } };
  },
  parseHTML() {
    return [{ tag: "figure[data-image-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-image-block": HTMLAttributes.id }), "[image]"];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

/** Les extensions de l'éditeur de fiche : texte riche, plus les nœuds propres aux fiches (liens, images). */
export function noteExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      strike: false,
      underline: false,
      codeBlock: false,
      blockquote: false,
      listItem: false,
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: false, linkOnPaste: false },
    }),
    // Une puce = une seule ligne, une citation = des paragraphes : c'est ce que le texte enregistré sait représenter.
    ListItem.extend({ content: "paragraph" }),
    Blockquote.extend({ content: "paragraph+" }),
    TextStyle,
    Color,
    SoftHighlight.configure({ multicolor: true }),
    WikiLink,
    CiteRef,
    InlineImage,
    ImageBlock,
    Placeholder.configure({ placeholder }),
  ];
}

