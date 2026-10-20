"use client";

import { useState } from "react";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import type { Note, Source } from "@/lib/investigation/types";
import CitePicker from "./CitePicker";
import SourceReference from "./SourceReference";
import styles from "./NoteSources.module.css";

interface NoteSourcesProps {
  note: Note;
  /** Sources du dossier. */
  sources: Source[];
  /** Fiche fermée (cadenas) : les sources se lisent mais ne se modifient plus. */
  readOnly?: boolean;
}

// Sources d'une fiche ou d'une note, en encart sous le texte (rien dans le texte lui-même) : un lien (URL),
// un document (PDF), une image. On en choisit une du dossier ou on en crée une sur place.
export default function NoteSources({ note, sources, readOnly = false }: NoteSourcesProps) {
  const storage = useInvestigationStorage();
  const [picking, setPicking] = useState(false);
  const linked = note.linkedSourceIds.flatMap((id) => {
    const source = sources.find((candidate) => candidate.id === id);
    return source ? [source] : [];
  });

  if (readOnly && linked.length === 0) return null;

  return (
    <section className={styles.block} aria-label="Sources">
      <div className={styles.head}>
        <span className={styles.title}>Sources ({linked.length})</span>
        {readOnly ? null : (
          <button type="button" className={styles.add} onClick={() => setPicking((value) => !value)} aria-expanded={picking}>
            {picking ? "Fermer" : "+ Ajouter une source"}
          </button>
        )}
      </div>

      {linked.length === 0 && !picking ? <span className={styles.empty}>Aucune source. Ajoute un lien, un document PDF ou une image qui appuie cette fiche.</span> : null}

      <div className={styles.list}>
        {linked.map((source) => (
          <SourceReference
            key={source.id}
            source={source}
            onRemove={readOnly ? undefined : () => storage.updateNote(note.id, { linkedSourceIds: note.linkedSourceIds.filter((id) => id !== source.id) })}
          />
        ))}
      </div>

      {picking && !readOnly ? (
        <CitePicker
          heading="Ajouter une source à cette fiche"
          submitLabel="Créer et ajouter"
          dossierId={note.dossierId}
          sources={sources.filter((source) => !note.linkedSourceIds.includes(source.id))}
          onPick={(sourceId) => {
            if (!note.linkedSourceIds.includes(sourceId)) storage.updateNote(note.id, { linkedSourceIds: [...note.linkedSourceIds, sourceId] });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </section>
  );
}
