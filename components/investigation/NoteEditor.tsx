"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { countryOf } from "./EntityNode";
import { attributeLink, groupAttributes } from "@/lib/investigation/attributes";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { attributeLabel, renameNote } from "@/lib/investigation/fiches";
import { extractImageIds, imageToken, insertTokenAt, removeImageToken } from "@/lib/investigation/imageRefs";
import { deleteImage, ImageFileError, NOTE_IMAGE_MAX_SIDE, prepareImage, putImage } from "@/lib/investigation/imageStore";
import {
  CLAIM_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  type ClaimType,
  type EntityAttribute,
  type InvestigationEntity,
  type Note,
  type Relation,
  type Source,
} from "@/lib/investigation/types";
import { findBacklinks, normalizeKey, resolveWikiLink } from "@/lib/investigation/wikilinks";
import AttributeIcon from "./AttributeIcon";
import AttributesEditor from "./AttributesEditor";
import EntityForm, { entityPatchFromValues } from "./EntityForm";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import NoteRenderer from "./NoteRenderer";
import RelationsSection from "./RelationsSection";
import { useEntityImage } from "./useEntityImage";
import styles from "./NotesWorkspace.module.css";

interface NoteEditorProps {
  note: Note;
  notes: Note[];
  entities: InvestigationEntity[];
  sources: Source[];
  relations: Relation[];
  onOpenNote: (noteId: string) => void;
  onLinkClick: (target: string) => void;
  onShowInGraph: (entityId: string) => void;
  /** Ouvre la page d'une coordonnée (téléphone, compte, e-mail…) ; elle est créée au premier clic. */
  onOpenAttribute: (entityId: string, attributeId: string) => void;
  /** Ouvre la fiche texte d'une entité ; elle est créée si besoin. */
  onOpenEntityFiche: (entityId: string) => void;
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
  onOpenAttribute,
}: {
  entity: InvestigationEntity;
  onShowInGraph: () => void;
  onEdit: () => void;
  onOpenAttribute: (attributeId: string) => void;
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
              <button
                key={attribute.id}
                type="button"
                className={styles.attrChip}
                title={`Ouvrir la page de cette coordonnée (${attribute.status === "hypothesis" ? "supposée" : "documentée"})`}
                onClick={() => onOpenAttribute(attribute.id)}
              >
                <AttributeIcon kind={group.kind} platform={group.platform} />
                <span>
                  {attribute.value}
                  {attribute.status === "hypothesis" ? " ?" : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// En-tête de la page d'une coordonnée : ce qu'elle est, son statut, sa source, et un accès
// à la fiche de la personne ou de l'entité à laquelle elle appartient.
function AttributePageHeader({
  entity,
  attribute,
  sources,
  onShowInGraph,
  onOpenFiche,
  onSave,
}: {
  entity: InvestigationEntity;
  attribute: EntityAttribute;
  sources: Source[];
  onShowInGraph: () => void;
  onOpenFiche: () => void;
  onSave: (next: EntityAttribute) => void;
}) {
  const [editing, setEditing] = useState(false);
  const link = attributeLink(attribute);
  const source = sources.find((candidate) => candidate.id === attribute.sourceId);

  return (
    <div className={styles.fiche}>
      <div className={styles.ficheMain}>
        <AttributeIcon kind={attribute.kind} platform={attribute.platform} />
        <div className={styles.ficheText}>
          <span className={styles.ficheType}>{attributeLabel(attribute).toUpperCase()}</span>
          <span className={styles.attrValue}>
            {link ? (
              <a href={link} {...(link.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {attribute.value}
              </a>
            ) : (
              attribute.value
            )}
            {attribute.secondary ? ` · ID ${attribute.secondary}` : ""}
          </span>
          <span className={styles.attrMetaLine}>
            {attribute.status === "hypothesis" ? "Supposée" : "Documentée"}
            {source ? ` · source : ${source.title}` : ""} · coordonnée de{" "}
            <button type="button" className={styles.wikiLink} onClick={onOpenFiche}>
              {entity.name}
            </button>
          </span>
        </div>
        <div className={styles.ficheActions}>
          <button type="button" className={styles.gold} onClick={onShowInGraph}>
            Voir dans le graphe
          </button>
          <button type="button" className={styles.ghost} onClick={() => setEditing((value) => !value)}>
            {editing ? "Fermer" : "Modifier la coordonnée"}
          </button>
        </div>
      </div>
      {editing ? (
        <AttributesEditor single value={[attribute]} sources={sources} onChange={(next) => next[0] && onSave(next[0])} />
      ) : null}
    </div>
  );
}

// Vignette d'une image du texte, avec son bouton de suppression.
function GalleryThumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useEntityImage(id);
  return (
    <span className={styles.thumb}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span className={styles.thumbMissing}>?</span>
      )}
      <button type="button" className={styles.thumbRemove} onClick={onRemove} title="Retirer cette image de la note" aria-label="Retirer cette image">
        ×
      </button>
    </span>
  );
}

export default function NoteEditor({
  note,
  notes,
  entities,
  sources,
  relations,
  onOpenNote,
  onLinkClick,
  onShowInGraph,
  onOpenAttribute,
  onOpenEntityFiche,
  onDeleted,
}: NoteEditorProps) {
  const storage = useInvestigationStorage();
  const entity = note.entityId ? (entities.find((e) => e.id === note.entityId) ?? null) : null;
  // Page d'une coordonnée : l'entité propriétaire et la coordonnée concernée.
  const attributeEntity = note.attributeRef ? (entities.find((e) => e.id === note.attributeRef?.entityId) ?? null) : null;
  const attribute = attributeEntity?.attributes?.find((a) => a.id === note.attributeRef?.attributeId) ?? null;

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
  const [imageError, setImageError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Images importées pendant cette ouverture : celles qui ne sont finalement plus
  // citées dans le texte sont supprimées de la mémoire du navigateur.
  const sessionImages = useRef<string[]>([]);

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
    const created = sessionImages.current;
    return () => {
      const stored = storage.load().notes.find((n) => n.id === id);
      if (stored && stored.body !== latestBody.current) storage.updateNote(id, { body: latestBody.current });
      const kept = new Set(extractImageIds(latestBody.current));
      for (const imageId of created) if (!kept.has(imageId)) void deleteImage(imageId).catch(() => undefined);
    };
  }, [note.id, storage]);

  // Ajoute des images (captures d'écran, photos) au texte, à l'endroit du curseur.
  async function addImageFiles(files: File[], pasted = false) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setImporting(true);
    setImageError(null);
    // Position d'insertion : le curseur (mode édition) ou la fin du texte. Les images
    // suivantes sont posées à la suite de la précédente, dans l'ordre choisi.
    let cursor = mode === "edit" && textarea.current ? textarea.current.selectionStart : latestBody.current.length;
    let working = latestBody.current;
    try {
      for (const file of images) {
        const id = await putImage(await prepareImage(file, NOTE_IMAGE_MAX_SIDE));
        sessionImages.current.push(id);
        const caption = pasted
          ? `Capture du ${new Intl.DateTimeFormat("fr-FR").format(new Date())}`
          : file.name.replace(/\.[^.]+$/, "");
        const token = imageToken(id, caption);
        const insertAt = cursor;
        const inserted = insertTokenAt(working, insertAt, token);
        working = inserted.text;
        cursor = inserted.next;
        setBody((current) => insertTokenAt(current, insertAt, token).text);
      }
    } catch (error) {
      setImageError(error instanceof ImageFileError ? error.message : "Impossible d'importer cette image.");
    } finally {
      setImporting(false);
    }
  }

  function removeImage(id: string) {
    setBody((current) => removeImageToken(current, id));
    void deleteImage(id).catch(() => undefined);
  }

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
          <FicheHeader
            entity={entity}
            onShowInGraph={() => onShowInGraph(entity.id)}
            onEdit={() => setEditingEntity(true)}
            onOpenAttribute={(attributeId) => onOpenAttribute(entity.id, attributeId)}
          />
        )
      ) : null}

      {attributeEntity && attribute ? (
        <AttributePageHeader
          key={attribute.id}
          entity={attributeEntity}
          attribute={attribute}
          sources={sources}
          onShowInGraph={() => onShowInGraph(attributeEntity.id)}
          onOpenFiche={() => onOpenEntityFiche(attributeEntity.id)}
          onSave={(next) =>
            storage.updateEntity(attributeEntity.id, {
              attributes: (attributeEntity.attributes ?? []).map((candidate) => (candidate.id === next.id ? next : candidate)),
            })
          }
        />
      ) : null}

      <div className={styles.imageBar}>
        <button type="button" className={styles.ghost} onClick={() => fileInput.current?.click()} disabled={importing}>
          {importing ? "Import…" : "+ Ajouter une image"}
        </button>
        <span className={styles.imageHint}>ou colle une capture d&apos;écran (Ctrl+V) / glisse un fichier dans la note</span>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addImageFiles(files);
          }}
        />
      </div>
      {imageError ? <p className={styles.imageError}>{imageError}</p> : null}

      <div
        className={styles.bodyArea}
        onDragOver={(event) => {
          if ([...event.dataTransfer.items].some((item) => item.kind === "file")) event.preventDefault();
        }}
        onDrop={(event) => {
          const files = [...event.dataTransfer.files];
          if (files.some((file) => file.type.startsWith("image/"))) {
            event.preventDefault();
            void addImageFiles(files);
          }
        }}
      >
        {mode === "edit" ? (
          <div className={styles.textareaWrap}>
            <textarea
              ref={textarea}
              className={styles.textarea}
              value={body}
              placeholder={"Écris ici. Tape [[ pour lier une note ou une fiche.\n\n# Titre   - liste   **gras**   *italique*   > citation"}
              onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart)}
              onKeyDown={handleKeyDown}
              onPaste={(event) => {
                const files = [...event.clipboardData.files].filter((file) => file.type.startsWith("image/"));
                if (files.length === 0) return;
                event.preventDefault();
                void addImageFiles(files, true);
              }}
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

      {entity ? (
        <RelationsSection
          entity={entity}
          relations={relations}
          entities={entities}
          sources={sources}
          onOpenEntityFiche={onOpenEntityFiche}
          onShowInGraph={onShowInGraph}
        />
      ) : null}

      {extractImageIds(body).length > 0 ? (
        <div className={styles.gallery}>
          <span className={styles.backTitle}>Images de cette note ({extractImageIds(body).length})</span>
          <div className={styles.thumbs}>
            {extractImageIds(body).map((id) => (
              <GalleryThumb key={id} id={id} onRemove={() => removeImage(id)} />
            ))}
          </div>
        </div>
      ) : null}

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
          {entity ? "Supprimer la fiche texte" : note.attributeRef ? "Supprimer la page" : "Supprimer la note"}
        </button>
      </div>
    </div>
  );
}
