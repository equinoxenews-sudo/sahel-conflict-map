"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { countryOf } from "./EntityNode";
import { groupAttributes } from "@/lib/investigation/attributes";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { renameNote } from "@/lib/investigation/fiches";
import {
  CLAIM_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  type ClaimType,
  type InvestigationEntity,
  type Note,
  type Source,
} from "@/lib/investigation/types";
import { findBacklinks, normalizeKey, resolveWikiLink } from "@/lib/investigation/wikilinks";
import AttributeIcon from "./AttributeIcon";
import EntityForm, { entityPatchFromValues } from "./EntityForm";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import NoteRenderer from "./NoteRenderer";
import { useEntityImage } from "./useEntityImage";
import styles from "./NotesWorkspace.module.css";

interface NoteEditorProps {
  note: Note;
  notes: Note[];
  entities: InvestigationEntity[];
  sources: Source[];
  onOpenNote: (noteId: string) => void;
  onLinkClick: (target: string) => void;
  onShowInGraph: (entityId: string) => void;
  onDeleted: () => void;
}

const SAVE_DELAY_MS = 500;
const MAX_SUGGESTIONS = 8;

interface Suggestion {
  label: string;
  hint: string;
}

function FicheHeader({
  entity,
  onShowInGraph,
  onEdit,
}: {
  entity: InvestigationEntity;
  onShowInGraph: () => void;
  onEdit: () => void;
}) {
  const image = useEntityImage(entity.imageId, entity.imageUrl);
  const country = countryOf(entity);
  const groups = groupAttributes(entity.attributes ?? []);

  return (
    <div className={styles.fiche}>
      <div className={styles.ficheMain}>
        <span className={styles.ficheAvatar}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" referrerPolicy="no-referrer" />
          ) : (
            <EntityTypeIcon type={entity.type} size={24} />
          )}
        </span>
        <div className={styles.ficheText}>
          <span className={styles.ficheType}>{ENTITY_TYPE_LABELS[entity.type].toUpperCase()}</span>
          {entity.role ? <span>{entity.role}</span> : null}
          {country ? (
            <span className={styles.ficheCountry}>
              {country.label}
              <HexFlag iso2={country.iso2} name={country.name} />
            </span>
          ) : null}
        </div>
        <div className={styles.ficheActions}>
          <button type="button" className={styles.gold} onClick={onShowInGraph}>
            Voir dans le graphe
          </button>
          <button type="button" className={styles.ghost} onClick={onEdit}>
            Modifier les infos
          </button>
        </div>
      </div>
      {groups.length > 0 ? (
        <div className={styles.ficheAttrs}>
          {groups.map((group) =>
            group.items.map((attribute) => (
              <span key={attribute.id} className={styles.attrChip} title={attribute.status === "hypothesis" ? "Supposée" : "Documentée"}>
                <AttributeIcon kind={group.kind} platform={group.platform} />
                <span>
                  {attribute.value}
                  {attribute.status === "hypothesis" ? " ?" : ""}
                </span>
              </span>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function NoteEditor({
  note,
  notes,
  entities,
  sources,
  onOpenNote,
  onLinkClick,
  onShowInGraph,
  onDeleted,
}: NoteEditorProps) {
  const storage = useInvestigationStorage();
  const entity = note.entityId ? (entities.find((e) => e.id === note.entityId) ?? null) : null;

  // Titre en cours de saisie ; null = on affiche le titre enregistré (qui peut changer
  // ailleurs, par exemple le renommage de l'entité dans le graphe).
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const title = editedTitle ?? note.title;
  const [body, setBody] = useState(note.body);
  const [mode, setMode] = useState<"edit" | "read">(note.body.trim() ? "read" : "edit");
  const [editingEntity, setEditingEntity] = useState(false);
  const [suggest, setSuggest] = useState<{ query: string; start: number } | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Enregistrement différé du texte, et à la fermeture de la note.
  useEffect(() => {
    if (body === note.body) return;
    const timer = window.setTimeout(() => storage.updateNote(note.id, { body }), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [body, note.body, note.id, storage]);

  const latestBody = useRef(body);
  useEffect(() => {
    latestBody.current = body;
  });
  useEffect(() => {
    const id = note.id;
    return () => {
      const stored = storage.load().notes.find((n) => n.id === id);
      if (stored && stored.body !== latestBody.current) storage.updateNote(id, { body: latestBody.current });
    };
  }, [note.id, storage]);

  const resolve = useMemo(() => (target: string) => resolveWikiLink(target, notes, entities), [notes, entities]);
  const backlinks = useMemo(() => findBacklinks(note, notes, entities), [note, notes, entities]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!suggest) return [];
    const query = normalizeKey(suggest.query);
    const candidates: Suggestion[] = [
      ...notes.filter((n) => n.id !== note.id).map((n) => ({ label: n.title, hint: n.entityId ? "fiche" : "note" })),
      ...entities
        .filter((e) => !notes.some((n) => n.entityId === e.id))
        .map((e) => ({ label: e.name, hint: `${ENTITY_TYPE_LABELS[e.type].toLowerCase()} · sans fiche` })),
    ];
    return candidates.filter((c) => !query || normalizeKey(c.label).includes(query)).slice(0, MAX_SUGGESTIONS);
  }, [suggest, notes, entities, note.id]);

  function handleBodyChange(value: string, caret: number) {
    setBody(value);
    const match = value.slice(0, caret).match(/\[\[([^\]\n|]*)$/);
    setSuggest(match ? { query: match[1], start: caret - match[1].length } : null);
    setActiveSuggestion(0);
  }

  function applySuggestion(label: string) {
    const el = textarea.current;
    if (!suggest || !el) return;
    const caret = el.selectionStart;
    const after = body.slice(caret).replace(/^\]\]/, "");
    setBody(`${body.slice(0, suggest.start)}${label}]]${after}`);
    setSuggest(null);
    const position = suggest.start + label.length + 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(position, position);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggest || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applySuggestion(suggestions[activeSuggestion].label);
    } else if (event.key === "Escape") {
      setSuggest(null);
    }
  }

  function commitTitle() {
    if (editedTitle === null) return;
    renameNote(storage, notes, note, editedTitle);
    setEditedTitle(null);
  }

  function toggleSource(sourceId: string) {
    const linked = note.linkedSourceIds.includes(sourceId)
      ? note.linkedSourceIds.filter((id) => id !== sourceId)
      : [...note.linkedSourceIds, sourceId];
    storage.updateNote(note.id, { linkedSourceIds: linked });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorTop}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setEditedTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Titre de la note"
        />
        <div className={styles.modeToggle} role="group" aria-label="Mode d'affichage">
          <button type="button" className={mode === "edit" ? styles.modeOn : styles.mode} onClick={() => setMode("edit")}>
            Édition
          </button>
          <button type="button" className={mode === "read" ? styles.modeOn : styles.mode} onClick={() => setMode("read")}>
            Lecture
          </button>
        </div>
      </div>

      {entity ? (
        editingEntity ? (
          <div className={styles.ficheForm}>
            <EntityForm
              key={entity.id}
              initial={entity}
              submitLabel="Enregistrer"
              sources={sources}
              onCancel={() => setEditingEntity(false)}
              onSubmit={(values) => {
                // Le nom de l'entité et le titre de sa fiche restent identiques.
                if (values.name !== note.title) renameNote(storage, notes, note, values.name);
                storage.updateEntity(entity.id, entityPatchFromValues(values));
                setEditingEntity(false);
              }}
            />
          </div>
        ) : (
          <FicheHeader entity={entity} onShowInGraph={() => onShowInGraph(entity.id)} onEdit={() => setEditingEntity(true)} />
        )
      ) : null}

      <div className={styles.bodyArea}>
        {mode === "edit" ? (
          <div className={styles.textareaWrap}>
            <textarea
              ref={textarea}
              className={styles.textarea}
              value={body}
              placeholder={"Écris ici. Tape [[ pour lier une note ou une fiche.\n\n# Titre   - liste   **gras**   *italique*   > citation"}
              onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart)}
              onKeyDown={handleKeyDown}
              onClick={(e) => handleBodyChange(body, e.currentTarget.selectionStart)}
              onBlur={() => window.setTimeout(() => setSuggest(null), 120)}
              spellCheck
              autoFocus={!body.trim()}
            />
            {suggest && suggestions.length > 0 ? (
              <ul className={styles.suggestions} role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.label}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeSuggestion}
                      className={index === activeSuggestion ? `${styles.suggestion} ${styles.suggestionOn}` : styles.suggestion}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySuggestion(suggestion.label);
                      }}
                    >
                      <span>{suggestion.label}</span>
                      <span className={styles.suggestionHint}>{suggestion.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <NoteRenderer body={body} resolve={resolve} onLink={onLinkClick} />
        )}
      </div>

      <div className={styles.meta}>
        <details className={styles.details}>
          <summary>Propriétés</summary>
          <div className={styles.props}>
            <label className={styles.propRow}>
              <span>Nature de l&apos;information</span>
              <select
                className={styles.select}
                value={note.claimType}
                onChange={(e) => storage.updateNote(note.id, { claimType: e.target.value as ClaimType })}
              >
                {(Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]).map((claim) => (
                  <option key={claim} value={claim}>
                    {CLAIM_TYPE_LABELS[claim]}
                  </option>
                ))}
              </select>
            </label>
            {sources.length > 0 ? (
              <div className={styles.propRow}>
                <span>Sources liées</span>
                <div className={styles.sourceList}>
                  {sources.map((source) => (
                    <label key={source.id} className={styles.sourceItem}>
                      <input type="checkbox" checked={note.linkedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} />
                      {source.title}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <div className={styles.backlinks}>
          <span className={styles.backTitle}>Rétroliens ({backlinks.length})</span>
          {backlinks.length === 0 ? (
            <span className={styles.backEmpty}>Aucune note ne cite celle-ci.</span>
          ) : (
            <ul>
              {backlinks.map((other) => (
                <li key={other.id}>
                  <button type="button" className={styles.wikiLink} onClick={() => onOpenNote(other.id)}>
                    {other.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            const warning = entity
              ? `Supprimer la fiche texte « ${note.title} » ? La carte du graphe est conservée.`
              : `Supprimer la note « ${note.title} » ?`;
            if (!window.confirm(warning)) return;
            storage.deleteNote(note.id);
            onDeleted();
          }}
        >
          {entity ? "Supprimer la fiche texte" : "Supprimer la note"}
        </button>
      </div>
    </div>
  );
}
