"use client";

import { useMemo, useState } from "react";
import { ENTITY_TYPE_LABELS, type InvestigationEntity, type Note } from "@/lib/investigation/types";
import { normalizeKey } from "@/lib/investigation/wikilinks";
import styles from "./CitePicker.module.css";

interface LinkPickerProps {
  /** Le passage sélectionné, qui va devenir un lien. */
  selected: string;
  notes: Note[];
  entities: InvestigationEntity[];
  /** La note en cours d'écriture : on ne propose pas de la lier à elle-même. */
  currentNoteId: string;
  onPick: (label: string) => void;
  onClose: () => void;
}

// « Renvoyer vers… » : on choisit la fiche ou la note vers laquelle le passage sélectionné renverra,
// comme un lien hypertexte. Une entité du graphe qui n'a pas encore de fiche est proposée aussi : sa
// fiche se crée au premier clic sur le lien.
export default function LinkPicker({ selected, notes, entities, currentNoteId, onPick, onClose }: LinkPickerProps) {
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const fromNotes = notes
      .filter((note) => !note.attributeRef && note.id !== currentNoteId)
      .map((note) => ({ key: note.id, label: note.title, hint: note.entityId ? "fiche" : "note" }));
    const fromEntities = entities
      .filter((entity) => !notes.some((note) => note.entityId === entity.id))
      .map((entity) => ({ key: entity.id, label: entity.name, hint: `${ENTITY_TYPE_LABELS[entity.type].toLowerCase()} · sans fiche, créée au clic` }));
    const needle = normalizeKey(query);
    return [...fromNotes, ...fromEntities]
      .filter((option) => !needle || normalizeKey(option.label).includes(needle))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [notes, entities, currentNoteId, query]);

  return (
    <div className={styles.picker} role="dialog" aria-label="Renvoyer vers une fiche ou une note">
      <div className={styles.head}>
        <strong>Renvoyer vers…</strong>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>
      <p className={styles.empty}>
        Le passage « {selected.length > 70 ? `${selected.slice(0, 70)}…` : selected} » deviendra un lien vers la fiche ou la note choisie.
      </p>
      <input className={styles.input} type="search" autoFocus placeholder="Chercher une fiche ou une note…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className={styles.list}>
        {options.length === 0 ? <li className={styles.empty}>Aucune fiche ni note ne correspond.</li> : null}
        {options.map((option) => (
          <li key={option.key}>
            <button type="button" className={styles.source} onClick={() => onPick(option.label)}>
              <span className={styles.sourceTitle}>{option.label}</span>
              <small className={styles.sourceMeta}>{option.hint}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
