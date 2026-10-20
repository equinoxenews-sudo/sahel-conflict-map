"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef } from "react";
import { bodyToDoc, docToBody } from "@/lib/investigation/richText";
import type { WikiResolution } from "@/lib/investigation/wikilinks";
import notes from "../NotesWorkspace.module.css";
import { noteExtensions, RichEditorContext } from "./extensions";
import styles from "./RichEditor.module.css";

export interface SuggestRequest {
  query: string;
  /** Plage du « [[mot » en cours de frappe, à remplacer par le lien choisi. */
  from: number;
  to: number;
}

interface RichNoteEditorProps {
  /** Texte enregistré de la fiche. L'éditeur le relit chaque fois qu'il change ailleurs (galerie d'images…). */
  value: string;
  onChange: (body: string) => void;
  resolve: (target: string) => WikiResolution;
  onLinkClick: (target: string) => void;
  onSuggest: (request: SuggestRequest | null) => void;
  /** Touche pressée pendant que la liste de suggestions est ouverte : renvoie vrai si elle l'a utilisée. */
  onSuggestKey: (event: KeyboardEvent) => boolean;
  onSelectionChange: (hasSelection: boolean) => void;
  onContextMenu: (info: { x: number; y: number; from: number; to: number }) => void;
  onPasteImages: (files: File[]) => void;
  onReady: (editor: Editor | null) => void;
}

const PLACEHOLDER = "Écris ici. Tape [[ pour lier une note ou une fiche.";

function detectSuggest(editor: Editor): SuggestRequest | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from } = selection;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = before.match(/\[\[([^\]\n|]*)$/);
  return match ? { query: match[1], from: $from.pos - match[0].length, to: $from.pos } : null;
}

// Éditeur de texte riche d'une fiche : on écrit directement en gras, en couleur, surligné…, sans aucun code
// dans le texte. Le texte enregistré garde sa forme d'avant (voir lib/investigation/richText.ts).
export default function RichNoteEditor(props: RichNoteEditorProps) {
  const { value, resolve, onLinkClick } = props;
  const latest = useRef(props);
  const lastEmitted = useRef(value);

  useEffect(() => {
    latest.current = props;
  });

  const extensions = useMemo(() => noteExtensions(PLACEHOLDER), []);
  const editor = useEditor({
    extensions,
    content: bodyToDoc(value),
    immediatelyRender: false,
    editorProps: {
      handleKeyDown: (_view, event) => latest.current.onSuggestKey(event),
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        latest.current.onPasteImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        latest.current.onPasteImages(files);
        return true;
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const { from, to } = view.state.selection;
          if (from === to) return false;
          event.preventDefault();
          latest.current.onContextMenu({ x: event.clientX, y: event.clientY, from, to });
          return true;
        },
      },
    },
    onUpdate: ({ editor: current }) => {
      const body = docToBody(current.getJSON() as Parameters<typeof docToBody>[0]);
      lastEmitted.current = body;
      latest.current.onChange(body);
      latest.current.onSuggest(detectSuggest(current));
    },
    onSelectionUpdate: ({ editor: current }) => {
      latest.current.onSelectionChange(!current.state.selection.empty);
      latest.current.onSuggest(detectSuggest(current));
    },
  });

  useEffect(() => {
    latest.current.onReady(editor);
    return () => latest.current.onReady(null);
  }, [editor]);

  // Le texte a changé ailleurs que dans l'éditeur (taille d'une image, image retirée, récupération…) : on le relit.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(bodyToDoc(value), { emitUpdate: false });
  }, [editor, value]);

  const context = useMemo(() => ({ resolve, onLinkClick }), [resolve, onLinkClick]);

  return (
    <RichEditorContext.Provider value={context}>
      <div className={`${styles.surface} ${notes.rendered}`} lang="fr" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </RichEditorContext.Provider>
  );
}
