"use client";

import { useMemo, useRef, useState } from "react";
import { createFiche, ensureFiche } from "@/lib/investigation/fiches";
import {
  useEntities,
  useInvestigationStorage,
  useNotes,
  useSources,
} from "@/lib/investigation/InvestigationContext";
import { ENTITY_TYPE_LABELS, type EntityType, type InvestigationEntity } from "@/lib/investigation/types";
import { normalizeKey, resolveWikiLink, uniqueTitle } from "@/lib/investigation/wikilinks";
import EntityGraphPanel from "./EntityGraphPanel";
import EntityTypeIcon from "./EntityTypeIcon";
import NoteEditor from "./NoteEditor";
import styles from "./NotesWorkspace.module.css";

interface NotesWorkspaceProps {
  dossierId: string;
  activeNoteId: string | null;
  onActiveNoteChange: (noteId: string | null) => void;
  showGraph: boolean;
  onShowGraphChange: (show: boolean) => void;
  focusRequest: { entityId: string; nonce: number } | null;
  onShowInGraph: (entityId: string) => void;
  onOpenFiche: (entityId: string) => void;
}

const FICHE_TYPES: EntityType[] = ["person", "organization", "location", "building", "equipment", "event", "document", "account"];

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" />
    </svg>
  );
}

// Espace de notes façon Obsidian : la liste des notes et des fiches à gauche,
// l'éditeur au centre, et, à la demande, le graphe à droite — le texte et le
// graphe restent ouverts en même temps et se pilotent l'un l'autre.
export default function NotesWorkspace({
  dossierId,
  activeNoteId,
  onActiveNoteChange,
  showGraph,
  onShowGraphChange,
  focusRequest,
  onShowInGraph,
  onOpenFiche,
}: NotesWorkspaceProps) {
  const storage = useInvestigationStorage();
  const notes = useNotes(dossierId);
  const entities = useEntities(dossierId);
  const sources = useSources(dossierId);

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingType, setPendingType] = useState<EntityType | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [chooser, setChooser] = useState<{ target: string; entities: InvestigationEntity[] } | null>(null);
  const [ratio, setRatio] = useState(0.55);
  const panes = useRef<HTMLDivElement>(null);

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;

  const { fiches, free } = useMemo(() => {
    const words = normalizeKey(query).split(" ").filter(Boolean);
    const matches = (title: string, body: string) => {
      const haystack = normalizeKey(`${title} ${body}`);
      return words.every((word) => haystack.includes(word));
    };
    const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "fr");
    const visible = notes.filter((note) => matches(note.title, note.body)).sort(byTitle);
    return { fiches: visible.filter((note) => note.entityId), free: visible.filter((note) => !note.entityId) };
  }, [notes, query]);

  function createFreeNote(title = "Sans titre") {
    const note = storage.addNote({
      dossierId,
      title: uniqueTitle(title, notes),
      body: "",
      claimType: "observed",
      linkedSourceIds: [],
      linkedEntityIds: [],
    });
    onActiveNoteChange(note.id);
    return note;
  }

  function submitFiche() {
    if (!pendingType || !pendingName.trim()) return;
    const note = createFiche(storage, dossierId, entities, notes, pendingType, pendingName);
    onActiveNoteChange(note.id);
    setPendingType(null);
    setPendingName("");
  }

  // Clic sur un lien [[…]] : on ouvre la note, on crée la fiche d'une entité qui
  // n'en a pas, ou la note manquante (comme Obsidian). Un nom ambigu demande confirmation.
  function openLink(target: string) {
    const resolution = resolveWikiLink(target, notes, entities);
    if (resolution.kind === "note") onActiveNoteChange(resolution.note.id);
    else if (resolution.kind === "entity") onActiveNoteChange(ensureFiche(storage, notes, resolution.entity).id);
    else if (resolution.kind === "ambiguous") setChooser({ target, entities: resolution.entities });
    else createFreeNote(target);
  }

  function startResize(event: React.PointerEvent) {
    event.preventDefault();
    const rect = panes.current?.getBoundingClientRect();
    if (!rect) return;
    const move = (e: PointerEvent) => setRatio(Math.min(0.75, Math.max(0.3, (e.clientX - rect.left) / rect.width)));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function renderItem(note: (typeof notes)[number]) {
    const entity = note.entityId ? entities.find((e) => e.id === note.entityId) : undefined;
    return (
      <li key={note.id}>
        <button
          type="button"
          className={note.id === activeNoteId ? `${styles.item} ${styles.itemOn}` : styles.item}
          onClick={() => onActiveNoteChange(note.id)}
        >
          <span className={styles.itemIcon}>{entity ? <EntityTypeIcon type={entity.type} size={18} /> : <DocumentIcon />}</span>
          <span className={styles.itemTitle}>{note.title}</span>
        </button>
      </li>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <span className={styles.topTitle}>Notes &amp; fiches</span>
        <button type="button" className={showGraph ? styles.gold : styles.ghost} onClick={() => onShowGraphChange(!showGraph)}>
          {showGraph ? "Masquer le graphe" : "Afficher le graphe à droite"}
        </button>
      </div>

      <div className={styles.panes} ref={panes}>
        <div className={styles.left} style={showGraph ? { flex: `0 0 ${ratio * 100}%` } : undefined}>
          <aside className={styles.sidebar}>
            <div className={styles.sideHeader}>
              <input
                className={styles.search}
                type="search"
                placeholder="Rechercher…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher dans les notes"
              />
              <div className={styles.plusWrap}>
                <button
                  type="button"
                  className={styles.plus}
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title="Ajouter une note ou une fiche"
                >
                  +
                </button>
                {menuOpen ? (
                  <div className={styles.menu} role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        createFreeNote();
                      }}
                    >
                      Note libre (texte)
                    </button>
                    <span className={styles.menuLabel}>Nouvelle fiche (aussi dans le graphe)</span>
                    {FICHE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setPendingType(type);
                          setPendingName("");
                        }}
                      >
                        <EntityTypeIcon type={type} size={16} /> {ENTITY_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {pendingType ? (
              <form
                className={styles.pending}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitFiche();
                }}
              >
                <span className={styles.pendingLabel}>Fiche · {ENTITY_TYPE_LABELS[pendingType]}</span>
                <input
                  className={styles.search}
                  autoFocus
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder="Nom de la fiche"
                  onKeyDown={(e) => e.key === "Escape" && setPendingType(null)}
                />
                <div className={styles.pendingActions}>
                  <button type="submit" className={styles.gold} disabled={!pendingName.trim()}>
                    Créer
                  </button>
                  <button type="button" className={styles.ghost} onClick={() => setPendingType(null)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : null}

            <div className={styles.list}>
              {fiches.length > 0 ? (
                <>
                  <span className={styles.groupTitle}>Fiches ({fiches.length})</span>
                  <ul>{fiches.map(renderItem)}</ul>
                </>
              ) : null}
              {free.length > 0 ? (
                <>
                  <span className={styles.groupTitle}>Notes ({free.length})</span>
                  <ul>{free.map(renderItem)}</ul>
                </>
              ) : null}
              {notes.length === 0 ? <p className={styles.hint}>Aucune note. Clique sur + pour écrire une note libre ou créer une fiche.</p> : null}
              {notes.length > 0 && fiches.length + free.length === 0 ? <p className={styles.hint}>Aucun résultat.</p> : null}
            </div>
          </aside>

          <section className={styles.editorPane}>
            {activeNote ? (
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                notes={notes}
                entities={entities}
                sources={sources}
                onOpenNote={(id) => onActiveNoteChange(id)}
                onLinkClick={openLink}
                onShowInGraph={onShowInGraph}
                onDeleted={() => onActiveNoteChange(null)}
              />
            ) : (
              <div className={styles.empty}>
                <p>Choisis une note à gauche, ou clique sur + pour en écrire une.</p>
                <p className={styles.hint}>Dans le texte, [[Nom]] crée un lien vers une note ou une fiche. Un lien vers une fiche absente la crée au clic.</p>
              </div>
            )}
          </section>
        </div>

        {showGraph ? (
          <>
            <div className={styles.divider} onPointerDown={startResize} role="separator" aria-orientation="vertical" title="Glisser pour redimensionner" />
            <div className={styles.right}>
              <EntityGraphPanel dossierId={dossierId} compact onOpenFiche={onOpenFiche} focusRequest={focusRequest} />
            </div>
          </>
        ) : null}
      </div>

      {chooser ? (
        <div className={styles.overlay} role="dialog" aria-label="Choisir l'entité">
          <div className={styles.dialog}>
            <p>
              Plusieurs entités portent le nom « {chooser.target} ». Laquelle ?
            </p>
            <ul>
              {chooser.entities.map((entity) => (
                <li key={entity.id}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => {
                      onActiveNoteChange(ensureFiche(storage, notes, entity).id);
                      setChooser(null);
                    }}
                  >
                    <span className={styles.itemIcon}>
                      <EntityTypeIcon type={entity.type} size={18} />
                    </span>
                    <span className={styles.itemTitle}>
                      {entity.name} — {ENTITY_TYPE_LABELS[entity.type]}
                      {entity.role ? ` · ${entity.role}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.ghost} onClick={() => setChooser(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
