"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useState } from "react";
import { TEXT_COLORS } from "@/lib/investigation/textFormat";
import { DEFAULT_HIGHLIGHT } from "@/lib/investigation/richText";
import styles from "./RichEditor.module.css";

/** Couleurs de surlignage proposées (le jaune est le surlignage par défaut). */
const HIGHLIGHTS: readonly { color: string; label: string }[] = [
  { color: DEFAULT_HIGHLIGHT, label: "Jaune" },
  { color: "#5ad17a", label: "Vert" },
  { color: "#ff8fc4", label: "Rose" },
  { color: "#7cc4ff", label: "Bleu" },
  { color: "#ffb066", label: "Orange" },
  { color: "#c4ccd8", label: "Gris" },
];

type Open = "highlight" | "color" | null;

// Barre d'outils de la fiche, comme dans un traitement de texte : style de paragraphe, gras, italique, surlignage,
// couleur, listes, citation, retour arrière. Les boutons ne prennent pas le focus : la sélection reste dans le texte.
export default function RichToolbar({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState<Open>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      highlight: current.isActive("highlight"),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      heading: current.isActive("heading", { level: 1 }) ? 1 : current.isActive("heading", { level: 2 }) ? 2 : current.isActive("heading", { level: 3 }) ? 3 : 0,
      textColor: (current.getAttributes("textStyle").color as string | undefined) ?? "",
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      hasSelection: !current.state.selection.empty,
    }),
  });
  const keep = (event: React.MouseEvent) => event.preventDefault();
  const toggle = (name: Open) => setOpen((current) => (current === name ? null : name));

  function chain() {
    return editor.chain().focus();
  }

  return (
    <div className={styles.bar} role="toolbar" aria-label="Mise en forme du texte" onMouseDown={keep}>
      <span className={styles.group}>
        <button type="button" className={styles.btn} disabled={!state.canUndo} title="Annuler (Ctrl+Z)" onClick={() => chain().undo().run()}>
          ↶
        </button>
        <button type="button" className={styles.btn} disabled={!state.canRedo} title="Rétablir (Ctrl+Y)" onClick={() => chain().redo().run()}>
          ↷
        </button>
      </span>

      <span className={styles.group}>
        <select
          className={styles.select}
          value={state.heading}
          aria-label="Style du paragraphe"
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const level = Number(event.target.value);
            if (level === 0) chain().setParagraph().run();
            else chain().setHeading({ level: level as 1 | 2 | 3 }).run();
          }}
        >
          <option value={0}>Texte normal</option>
          <option value={1}>Titre 1</option>
          <option value={2}>Titre 2</option>
          <option value={3}>Titre 3</option>
        </select>
      </span>

      <span className={styles.group}>
        <button type="button" className={state.bold ? `${styles.btn} ${styles.btnOn}` : styles.btn} title="Gras (Ctrl+B)" onClick={() => chain().toggleBold().run()}>
          <strong>G</strong>
        </button>
        <button type="button" className={state.italic ? `${styles.btn} ${styles.btnOn}` : styles.btn} title="Italique (Ctrl+I)" onClick={() => chain().toggleItalic().run()}>
          <em>I</em>
        </button>

        <span className={styles.pop}>
          <button
            type="button"
            className={state.highlight ? `${styles.btn} ${styles.btnOn}` : styles.btn}
            aria-expanded={open === "highlight"}
            title="Surligner le texte sélectionné"
            onClick={() => toggle("highlight")}
          >
            <span className={styles.sample} style={{ background: `${DEFAULT_HIGHLIGHT}66` }}>
              Surligner
            </span>{" "}
            ▾
          </button>
          {open === "highlight" ? (
            <span className={styles.palette} role="group" aria-label="Couleur de surlignage">
              {HIGHLIGHTS.map((entry) => (
                <button
                  key={entry.color}
                  type="button"
                  className={styles.swatch}
                  style={{ background: entry.color }}
                  title={entry.label}
                  aria-label={`Surligner en ${entry.label.toLowerCase()}`}
                  onClick={() => {
                    chain().setHighlight({ color: entry.color }).run();
                    setOpen(null);
                  }}
                />
              ))}
              <input
                type="color"
                className={styles.customColor}
                aria-label="Autre couleur de surlignage"
                title="Autre couleur"
                defaultValue="#ffd60a"
                onChange={(event) => chain().setHighlight({ color: event.target.value }).run()}
              />
              <button
                type="button"
                className={`${styles.swatch} ${styles.swatchNone}`}
                title="Retirer le surlignage"
                aria-label="Retirer le surlignage"
                onClick={() => {
                  chain().unsetHighlight().run();
                  setOpen(null);
                }}
              />
            </span>
          ) : null}
        </span>

        <span className={styles.pop}>
          <button
            type="button"
            className={state.textColor ? `${styles.btn} ${styles.btnOn}` : styles.btn}
            aria-expanded={open === "color"}
            title="Couleur du texte sélectionné"
            onClick={() => toggle("color")}
          >
            <span className={styles.colorA} style={{ color: state.textColor || undefined, borderBottom: `3px solid ${state.textColor || "var(--accent-gold)"}` }}>
              A
            </span>{" "}
            ▾
          </button>
          {open === "color" ? (
            <span className={styles.palette} role="group" aria-label="Couleur du texte">
              {TEXT_COLORS.map((entry) => (
                <button
                  key={entry.color}
                  type="button"
                  className={styles.swatch}
                  style={{ background: entry.color }}
                  title={entry.label}
                  aria-label={`Texte ${entry.label.toLowerCase()}`}
                  onClick={() => {
                    chain().setColor(entry.color).run();
                    setOpen(null);
                  }}
                />
              ))}
              <input
                type="color"
                className={styles.customColor}
                aria-label="Autre couleur de texte"
                title="Autre couleur"
                defaultValue="#d4a017"
                onChange={(event) => chain().setColor(event.target.value).run()}
              />
              <button
                type="button"
                className={`${styles.swatch} ${styles.swatchNone}`}
                title="Couleur d'origine"
                aria-label="Retirer la couleur du texte"
                onClick={() => {
                  chain().unsetColor().run();
                  setOpen(null);
                }}
              />
            </span>
          ) : null}
        </span>
      </span>

      <span className={styles.group}>
        <button type="button" className={state.bullet ? `${styles.btn} ${styles.btnOn}` : styles.btn} title="Liste à puces" onClick={() => chain().toggleBulletList().run()}>
          • Liste
        </button>
        <button type="button" className={state.ordered ? `${styles.btn} ${styles.btnOn}` : styles.btn} title="Liste numérotée" onClick={() => chain().toggleOrderedList().run()}>
          1. Liste
        </button>
        <button type="button" className={state.quote ? `${styles.btn} ${styles.btnOn}` : styles.btn} title="Citation" onClick={() => chain().toggleBlockquote().run()}>
          ❝ Citation
        </button>
      </span>

      <span className={styles.group}>
        <button
          type="button"
          className={styles.btn}
          disabled={!state.hasSelection}
          title="Effacer la mise en forme du texte sélectionné"
          onClick={() => chain().unsetAllMarks().run()}
        >
          Effacer
        </button>
      </span>
    </div>
  );
}
