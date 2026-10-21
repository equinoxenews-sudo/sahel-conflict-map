"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { countryOf } from "./EntityNode";
import { attributeLink, groupAttributes } from "@/lib/investigation/attributes";
import { useDossier, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { attributeLabel, renameNote } from "@/lib/investigation/fiches";
import { extractCitationIds, stripCitations } from "@/lib/investigation/citations";
import {
  IMAGE_SIZES,
  IMAGE_SIZE_LABELS,
  extractImageIds,
  imageSizeOf,
  imageToken,
  insertTokenAt,
  removeImageToken,
  setImageSize,
} from "@/lib/investigation/imageRefs";
import { linkSelection } from "@/lib/investigation/selectionLink";
import { DEFAULT_HIGHLIGHT } from "@/lib/investigation/richText";
import { formatSelection, type FormatKind } from "@/lib/investigation/textFormat";
import { deleteImage, ImageFileError, NOTE_IMAGE_MAX_SIDE, NOTE_IMAGE_QUALITY, prepareImage, putImage } from "@/lib/investigation/imageStore";
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
import LinkPicker from "./LinkPicker";
import NoteSources from "./NoteSources";
import SelectionMenu from "./SelectionMenu";
import EntityForm, { entityPatchFromValues } from "./EntityForm";
import type { Editor } from "@tiptap/core";
import FormatBar from "./FormatBar";
import RichNoteEditor, { type SuggestRequest } from "./richEditor/RichNoteEditor";
import RichToolbar from "./richEditor/RichToolbar";
import ExportFichePanel from "./ExportFichePanel";
import EntityTypeIcon from "./EntityTypeIcon";
import EntityTypeLabel from "./EntityTypeLabel";
import HexFlag from "./HexFlag";
import NoteRenderer from "./NoteRenderer";
import RelationsSection from "./RelationsSection";
import LockIcon from "./LockIcon";
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
  readOnly = false,
}: {
  entity: InvestigationEntity;
  onShowInGraph: () => void;
  onEdit: () => void;
  onOpenAttribute: (attributeId: string) => void;
  readOnly?: boolean;
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
          <span className={styles.ficheType}>
            <EntityTypeLabel type={entity.type} upper size={14} />
          </span>
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
          {readOnly ? null : (
            <button type="button" className={styles.ghost} onClick={onEdit}>
              Modifier les infos
            </button>
          )}
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
function GalleryThumb({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const url = useEntityImage(id);
  return (
    <span className={styles.thumb}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span className={styles.thumbMissing}>?</span>
      )}
      {onRemove ? (
        <button type="button" className={styles.thumbRemove} onClick={onRemove} title="Retirer cette image de la note" aria-label="Retirer cette image">
          ×
        </button>
      ) : null}
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
  const dossier = useDossier(note.dossierId);
  const [showExport, setShowExport] = useState(false);
  const entity = note.entityId ? (entities.find((e) => e.id === note.entityId) ?? null) : null;
  // Page d'une coordonnée : l'entité propriétaire et la coordonnée concernée.
  const attributeEntity = note.attributeRef ? (entities.find((e) => e.id === note.attributeRef?.entityId) ?? null) : null;
  const attribute = attributeEntity?.attributes?.find((a) => a.id === note.attributeRef?.attributeId) ?? null;

  // Titre en cours de saisie ; null = on affiche le titre enregistré (qui peut changer
  // ailleurs, par exemple le renommage de l'entité dans le graphe).
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const title = editedTitle ?? note.title;
  // Anciens repères de citation [^ID] : retirés du texte à l'ouverture (les sources sont dans l'encart « Sources »).
  const lockedAtOpen = entity ? entity.locked === true : note.locked === true;
  const [body, setBody] = useState(() => (lockedAtOpen ? note.body : stripCitations(note.body)));
  // Cadenas : celui de l'entité pour une fiche du graphe (le même que sur sa carte), sinon celui de la note.
  const locked = entity ? entity.locked === true : note.locked === true;
  // Cadenas ouvert = édition (texte, modification, suppression) ; fermé = lecture seule.
  const mode: "edit" | "read" = locked ? "read" : "edit";
  const [editingEntity, setEditingEntity] = useState(false);
  const [suggest, setSuggest] = useState<{ query: string; start: number; to?: number } | null>(null);
  // Éditeur de texte riche (par défaut) ou texte brut (secours) ; le choix est mémorisé sur cet appareil.
  const [rawMode, setRawMode] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("equinoxe-note-raw") === "1";
    } catch {
      return false; // stockage indisponible : éditeur riche
    }
  });
  const [richEditor, setRichEditor] = useState<Editor | null>(null);
  const richActive = !rawMode && !locked;
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Passage sélectionné : menu du clic droit et sélecteur « Renvoyer vers… ».
  const [menu, setMenu] = useState<{ x: number; y: number; start: number; end: number } | null>(null);
  const [linking, setLinking] = useState<{ start: number; end: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  // Images importées pendant cette ouverture : celles qui ne sont finalement plus
  // citées dans le texte sont supprimées de la mémoire du navigateur.
  const sessionImages = useRef<string[]>([]);

  // Les sources que le texte citait rejoignent l'encart « Sources » de la fiche (une seule fois, à l'ouverture).
  useEffect(() => {
    if (lockedAtOpen) return;
    const missing = extractCitationIds(note.body).filter((id) => !note.linkedSourceIds.includes(id));
    if (missing.length > 0) storage.updateNote(note.id, { linkedSourceIds: [...note.linkedSourceIds, ...missing] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const id = await putImage(await prepareImage(file, NOTE_IMAGE_MAX_SIDE, NOTE_IMAGE_QUALITY));
        sessionImages.current.push(id);
        const caption = pasted
          ? `Capture du ${new Intl.DateTimeFormat("fr-FR").format(new Date())}`
          : file.name.replace(/\.[^.]+$/, "");
        if (richActive && richEditor) {
          // Éditeur riche : l'image se pose à l'endroit du curseur, en bloc, sans rien écrire dans le texte.
          richEditor.chain().focus().insertContent({ type: "imageBlock", attrs: { id, caption, size: "l" } }).run();
          continue;
        }
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

  // Renvoyer vers une fiche : le passage sélectionné devient un lien [[Fiche|passage]], cliquable en lecture.
  function openLinkPicker() {
    if (richActive && richEditor) {
      const { from, to } = richEditor.state.selection;
      if (from === to) return;
      setMenu(null);
      setLinking({ start: from, end: to });
      return;
    }
    const el = textarea.current;
    if (!el || el.selectionStart === el.selectionEnd) return;
    setMenu(null);
    setLinking({ start: el.selectionStart, end: el.selectionEnd });
  }

  function applyLink(label: string) {
    if (!linking) return;
    if (richActive && richEditor) {
      // Les espaces de bord de la sélection (un double-clic prend souvent l'espace suivant) restent dans le texte.
      const raw = richEditor.state.doc.textBetween(linking.start, linking.end, " ");
      const shown = raw.trim();
      const from = linking.start + (raw.length - raw.trimStart().length);
      const to = linking.end - (raw.length - raw.trimEnd().length);
      setLinking(null);
      if (!shown) return;
      richEditor.chain().focus().insertContentAt({ from, to }, { type: "wikiLink", attrs: { target: label, display: shown } }).run();
      return;
    }
    const result = linkSelection(latestBody.current, linking.start, linking.end, label);
    setLinking(null);
    if (!result) return;
    latestBody.current = result.text;
    setBody(result.text);
    const el = textarea.current;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(result.next, result.next);
    });
  }

  function copySelection(cut: boolean) {
    const range = menu;
    if (!range) return;
    if (richActive && richEditor) {
      const copied = richEditor.state.doc.textBetween(range.start, range.end, "\n");
      void navigator.clipboard?.writeText(copied).catch(() => undefined);
      if (cut) richEditor.chain().focus().deleteRange({ from: range.start, to: range.end }).run();
      return;
    }
    const text = latestBody.current.slice(range.start, range.end);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    if (cut) {
      const next = latestBody.current.slice(0, range.start) + latestBody.current.slice(range.end);
      latestBody.current = next;
      setBody(next);
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
    if (richActive && richEditor && suggest) {
      richEditor
        .chain()
        .focus()
        .insertContentAt({ from: suggest.start, to: suggest.to ?? richEditor.state.selection.from }, [
          { type: "wikiLink", attrs: { target: label, display: label } },
          { type: "text", text: " " },
        ])
        .run();
      setSuggest(null);
      return;
    }
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

  // Met en forme le passage sélectionné (gras, italique, surligné, couleur) ; la sélection reste sur le passage.
  function applyFormat(kind: FormatKind, color?: string) {
    if (richActive && richEditor) {
      const chain = richEditor.chain().focus();
      if (kind === "bold") chain.toggleBold().run();
      else if (kind === "italic") chain.toggleItalic().run();
      else if (kind === "mark") (richEditor.isActive("highlight") ? chain.unsetHighlight() : chain.setHighlight({ color: DEFAULT_HIGHLIGHT })).run();
      else if (kind === "color" && color) chain.setColor(color).run();
      else if (kind === "clear") chain.unsetAllMarks().run();
      return;
    }
    const el = textarea.current;
    if (!el) return;
    const result = formatSelection(latestBody.current, el.selectionStart, el.selectionEnd, kind, color);
    if (!result) return;
    latestBody.current = result.text;
    setBody(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (event.key === "b" || event.key === "i")) {
      event.preventDefault();
      applyFormat(event.key === "b" ? "bold" : "italic");
      return;
    }
    handleSuggestKey(event);
  }

  // Liste de suggestions « [[ » : flèches, Entrée ou Tab pour choisir, Échap pour fermer. Renvoie vrai si la touche a servi.
  function handleSuggestKey(event: { key: string; preventDefault: () => void }): boolean {
    if (!suggest || suggestions.length === 0) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applySuggestion(suggestions[Math.min(activeSuggestion, suggestions.length - 1)].label);
      return true;
    }
    if (event.key === "Escape") {
      setSuggest(null);
      return true;
    }
    return false;
  }

  function toggleLock() {
    const next = !locked;
    // Fermer le cadenas enregistre d'abord le texte en cours.
    if (next && body !== note.body) storage.updateNote(note.id, { body });
    if (next && editedTitle !== null) commitTitle();
    if (entity) storage.updateEntity(entity.id, { locked: next });
    else storage.updateNote(note.id, { locked: next });
    if (next) {
      setSuggest(null);
      setEditingEntity(false);
    }
  }

  function commitTitle() {
    if (editedTitle === null) return;
    renameNote(storage, notes, note, editedTitle);
    setEditedTitle(null);
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
          readOnly={locked}
        />
        <button
          type="button"
          className={locked ? `${styles.lockBtn} ${styles.lockBtnOn}` : styles.lockBtn}
          aria-pressed={locked}
          title={
            locked
              ? "Fermée (lecture seule) : cliquer pour rouvrir et modifier"
              : "Ouverte (modification) : cliquer pour fermer et passer en lecture"
          }
          onClick={toggleLock}
        >
          <LockIcon locked={locked} size={16} />
          <span>{locked ? "Fermée" : "Ouverte"}</span>
        </button>
        <button
          type="button"
          className={showExport ? `${styles.lockBtn} ${styles.lockBtnOn}` : styles.lockBtn}
          aria-pressed={showExport}
          title="Exporter cette fiche en image PNG (pour une diapo ou un rapport)"
          onClick={() => setShowExport((value) => !value)}
        >
          <span>Exporter en image</span>
        </button>
      </div>
      {showExport ? (
        <ExportFichePanel
          note={note}
          body={body}
          entity={entity}
          entities={entities}
          relations={relations}
          sources={sources}
          dossierName={dossier?.name ?? "Dossier"}
          resolve={resolve}
          onClose={() => setShowExport(false)}
        />
      ) : null}

      {entity ? (
        editingEntity && !locked ? (
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
            readOnly={locked}
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

      {locked ? null : richActive ? (
        richEditor ? (
          <RichToolbar editor={richEditor} />
        ) : null
      ) : (
        <FormatBar hasSelection={hasSelection} onFormat={applyFormat} />
      )}
      {locked ? null : (
      <div className={styles.imageBar}>
        <button type="button" className={styles.ghost} onClick={() => fileInput.current?.click()} disabled={importing}>
          {importing ? "Import…" : "+ Ajouter une image"}
        </button>
        <button type="button" className={styles.ghost} onClick={openLinkPicker} disabled={!hasSelection} title="Sélectionne un passage du texte, puis renvoie-le vers une fiche (ou clic droit sur la sélection)">
          🔗 Lier la sélection
        </button>
        <button
          type="button"
          className={styles.ghost}
          aria-pressed={rawMode}
          title={rawMode ? "Revenir à l'éditeur de texte riche" : "Mode secours : voir et modifier le texte brut, avec ses marques"}
          onClick={() => {
            const next = !rawMode;
            setRawMode(next);
            setSuggest(null);
            setHasSelection(false);
            try {
              window.localStorage.setItem("equinoxe-note-raw", next ? "1" : "0");
            } catch {
              // stockage indisponible : le choix vaut pour cette ouverture seulement
            }
          }}
        >
          {rawMode ? "Éditeur riche" : "Texte brut"}
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
      )}
      {linking && !locked ? (
        <LinkPicker
          selected={
            richActive && richEditor
              ? richEditor.state.doc.textBetween(linking.start, linking.end, " ").trim()
              : latestBody.current.slice(linking.start, linking.end).trim()
          }
          notes={notes}
          entities={entities}
          currentNoteId={note.id}
          onPick={applyLink}
          onClose={() => setLinking(null)}
        />
      ) : null}
      {menu && !locked ? (
        <SelectionMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: "Gras", onClick: () => applyFormat("bold") },
            { label: "Italique", onClick: () => applyFormat("italic") },
            { label: "Surligner", onClick: () => applyFormat("mark") },
            { label: "🔗 Renvoyer vers une fiche ou une note…", onClick: () => setLinking({ start: menu.start, end: menu.end }), separated: true },
            { label: "Copier", onClick: () => copySelection(false), separated: true },
            { label: "Couper", onClick: () => copySelection(true) },
          ]}
        />
      ) : null}
      {imageError ? <p className={styles.imageError}>{imageError}</p> : null}

      <div
        className={styles.bodyArea}
        onDragOver={(event) => {
          if ([...event.dataTransfer.items].some((item) => item.kind === "file")) event.preventDefault();
        }}
        onDrop={(event) => {
          if (richActive) return;
          const files = [...event.dataTransfer.files];
          if (files.some((file) => file.type.startsWith("image/"))) {
            event.preventDefault();
            void addImageFiles(files);
          }
        }}
      >
        {mode === "edit" && richActive ? (
          <div className={styles.textareaWrap}>
            <RichNoteEditor
              value={body}
              onChange={setBody}
              resolve={resolve}
              onLinkClick={onLinkClick}
              onSuggest={(request: SuggestRequest | null) => {
                if (!request) {
                  setSuggest((current) => (current ? null : current));
                  return;
                }
                setSuggest({ query: request.query, start: request.from, to: request.to });
                setActiveSuggestion(0);
              }}
              onSuggestKey={(event) => handleSuggestKey(event)}
              onSelectionChange={setHasSelection}
              onContextMenu={({ x, y, from, to }) => setMenu({ x, y, start: from, end: to })}
              onPasteImages={(files) => void addImageFiles(files, true)}
              onReady={setRichEditor}
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
        ) : mode === "edit" ? (
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
              onSelect={(e) => setHasSelection(e.currentTarget.selectionStart !== e.currentTarget.selectionEnd)}
              onContextMenu={(e) => {
                const el = e.currentTarget;
                if (el.selectionStart === el.selectionEnd) return; // sans sélection : le menu habituel du navigateur
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, start: el.selectionStart, end: el.selectionEnd });
              }}
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
          <NoteRenderer body={body} resolve={resolve} onLink={onLinkClick} sources={sources} />
        )}
      </div>

      {mode === "edit" && rawMode && extractImageIds(body).length > 0 ? (
        <div className={styles.livePreview}>
          <span className={styles.backTitle}>Aperçu, comme dans la note fermée</span>
          <p className={styles.imageHint}>
            Dans le texte ci-dessus, une ligne « ![légende](img:…) » est une image : elle s&apos;affiche ici. Ne la modifie pas à la main ; la taille
            et la suppression se règlent dans « Images de cette note », plus bas.
          </p>
          <NoteRenderer body={body} resolve={resolve} onLink={onLinkClick} sources={sources} />
        </div>
      ) : null}

      {entity ? (
        <RelationsSection
          entity={entity}
          relations={relations}
          entities={entities}
          sources={sources}
          onOpenEntityFiche={onOpenEntityFiche}
          onShowInGraph={onShowInGraph}
          readOnly={locked}
        />
      ) : null}

      <NoteSources note={note} sources={sources} readOnly={locked} />

      {extractImageIds(body).length > 0 ? (
        <div className={styles.gallery}>
          <span className={styles.backTitle}>Images de cette note ({extractImageIds(body).length})</span>
          <div className={styles.thumbs}>
            {extractImageIds(body).map((id) => (
              <div key={id} className={styles.thumbCell}>
                <GalleryThumb id={id} onRemove={locked ? undefined : () => removeImage(id)} />
                {locked ? null : (
                  <div className={styles.sizeBtns} role="group" aria-label="Taille d'affichage de l'image">
                    {IMAGE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={imageSizeOf(body, id) === size ? `${styles.sizeBtn} ${styles.sizeBtnOn}` : styles.sizeBtn}
                        title={`${IMAGE_SIZE_LABELS[size]} dans le texte`}
                        onClick={() => setBody((current) => setImageSize(current, id, size))}
                      >
                        {size === "full" ? "Plein" : size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
          disabled={locked}
          title={locked ? "Rouvre le cadenas pour supprimer cette fiche" : undefined}
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
