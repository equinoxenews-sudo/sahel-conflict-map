"use client";

import { Background, Controls, ReactFlow, useEdgesState, useNodesState, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CLAIM_TYPE_LABELS, type CanvasCard, type CanvasCardKind, type ClaimType } from "@/lib/investigation/types";
import {
  useCanvasCards,
  useCanvasLinks,
  useEntities,
  useInvestigationStorage,
  useNotes,
  useSources,
} from "@/lib/investigation/InvestigationContext";
import styles from "./NotesCanvasPanel.module.css";

interface NotesCanvasPanelProps {
  dossierId: string;
}

const CARD_KIND_LABELS: Record<CanvasCardKind, string> = {
  text: "Texte libre",
  source: "Source",
  entity: "Entité",
  note: "Note",
};

function cardsToNodes(cards: CanvasCard[]): Node[] {
  return cards.map((c) => ({
    id: c.id,
    position: c.position,
    data: { label: `[${CARD_KIND_LABELS[c.kind]}]\n${c.text}` },
    style: {
      background: "var(--bg-panel-alt)",
      border: "1px solid var(--border-glass)",
      borderRadius: 8,
      color: "var(--text-primary)",
      fontSize: 12,
      whiteSpace: "pre-line" as const,
      padding: 8,
      width: 180,
    },
  }));
}

function linksToEdges(links: { id: string; fromCardId: string; toCardId: string }[]): Edge[] {
  return links.map((l) => ({
    id: l.id,
    source: l.fromCardId,
    target: l.toCardId,
    style: { stroke: "var(--accent-gold)" },
  }));
}

export default function NotesCanvasPanel({ dossierId }: NotesCanvasPanelProps) {
  const notes = useNotes(dossierId);
  const sources = useSources(dossierId);
  const entities = useEntities(dossierId);
  const cards = useCanvasCards(dossierId);
  const links = useCanvasLinks(dossierId);
  const storage = useInvestigationStorage();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: "",
    body: "",
    claimType: "observed" as ClaimType,
    linkedSourceIds: [] as string[],
    linkedEntityIds: [] as string[],
  });

  function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteForm.title.trim()) return;
    storage.addNote({
      dossierId,
      title: noteForm.title.trim(),
      body: noteForm.body.trim(),
      claimType: noteForm.claimType,
      linkedSourceIds: noteForm.linkedSourceIds,
      linkedEntityIds: noteForm.linkedEntityIds,
    });
    setNoteForm({ title: "", body: "", claimType: "observed", linkedSourceIds: [], linkedEntityIds: [] });
    setShowNoteForm(false);
  }

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ kind: "text" as CanvasCardKind, refId: "", text: "" });

  function handleAddCard(e: FormEvent) {
    e.preventDefault();
    if (!cardForm.text.trim()) return;
    storage.addCanvasCard({
      dossierId,
      kind: cardForm.kind,
      refId: cardForm.kind === "text" ? null : cardForm.refId || null,
      text: cardForm.text.trim(),
      position: { x: 60 + cards.length * 40, y: 60 + cards.length * 30 },
    });
    setCardForm({ kind: "text", refId: "", text: "" });
    setShowCardForm(false);
  }

  const initialNodes = useMemo(() => cardsToNodes(cards), [cards]);
  const initialEdges = useMemo(() => linksToEdges(links), [links]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.sectionTitle}>Notes</div>
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolbarBtn} onClick={() => setShowNoteForm((v) => !v)}>
            + Nouvelle note
          </button>
        </div>

        {showNoteForm && (
          <form className={styles.formCard} onSubmit={handleAddNote}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Titre</label>
                <input
                  className={styles.input}
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Statut</label>
                <select
                  className={styles.select}
                  value={noteForm.claimType}
                  onChange={(e) => setNoteForm({ ...noteForm, claimType: e.target.value as ClaimType })}
                >
                  {(Object.keys(CLAIM_TYPE_LABELS) as ClaimType[]).map((c) => (
                    <option key={c} value={c}>
                      {CLAIM_TYPE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Contenu</label>
              <textarea
                className={styles.textarea}
                value={noteForm.body}
                onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Sources liées</label>
                <select
                  multiple
                  className={`${styles.select} ${styles.multiSelect}`}
                  value={noteForm.linkedSourceIds}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      linkedSourceIds: Array.from(e.target.selectedOptions, (o) => o.value),
                    })
                  }
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Entités liées</label>
                <select
                  multiple
                  className={`${styles.select} ${styles.multiSelect}`}
                  value={noteForm.linkedEntityIds}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      linkedEntityIds: Array.from(e.target.selectedOptions, (o) => o.value),
                    })
                  }
                >
                  {entities.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className={styles.submitBtn}>
              Ajouter la note
            </button>
          </form>
        )}

        {notes.length === 0 ? (
          <div className={styles.emptyState}>Aucune note.</div>
        ) : (
          <div className={styles.notesList}>
            {[...notes]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((n) => (
                <div key={n.id} className={styles.noteCard}>
                  <div className={styles.noteHead}>
                    <span className={styles.noteTitle}>{n.title}</span>
                    <button type="button" className={styles.deleteBtn} onClick={() => storage.deleteNote(n.id)}>
                      Supprimer
                    </button>
                  </div>
                  {n.body && <div className={styles.noteBody}>{n.body}</div>}
                  {(n.linkedSourceIds.length > 0 || n.linkedEntityIds.length > 0) && (
                    <div className={styles.noteLinks}>
                      {n.linkedSourceIds.length > 0 && `${n.linkedSourceIds.length} source(s) liée(s)`}
                      {n.linkedSourceIds.length > 0 && n.linkedEntityIds.length > 0 && " · "}
                      {n.linkedEntityIds.length > 0 && `${n.linkedEntityIds.length} entité(s) liée(s)`}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div>
        <div className={styles.sectionTitle}>Canevas libre</div>
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolbarBtn} onClick={() => setShowCardForm((v) => !v)}>
            + Nouvelle carte
          </button>
        </div>

        {showCardForm && (
          <form className={styles.formCard} onSubmit={handleAddCard}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Type de carte</label>
                <select
                  className={styles.select}
                  value={cardForm.kind}
                  onChange={(e) => setCardForm({ ...cardForm, kind: e.target.value as CanvasCardKind, refId: "" })}
                >
                  {(Object.keys(CARD_KIND_LABELS) as CanvasCardKind[]).map((k) => (
                    <option key={k} value={k}>
                      {CARD_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              {cardForm.kind === "source" && (
                <div className={styles.field}>
                  <label className={styles.label}>Source</label>
                  <select
                    className={styles.select}
                    value={cardForm.refId}
                    onChange={(e) => setCardForm({ ...cardForm, refId: e.target.value })}
                  >
                    <option value="">—</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {cardForm.kind === "entity" && (
                <div className={styles.field}>
                  <label className={styles.label}>Entité</label>
                  <select
                    className={styles.select}
                    value={cardForm.refId}
                    onChange={(e) => setCardForm({ ...cardForm, refId: e.target.value })}
                  >
                    <option value="">—</option>
                    {entities.map((en) => (
                      <option key={en.id} value={en.id}>
                        {en.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {cardForm.kind === "note" && (
                <div className={styles.field}>
                  <label className={styles.label}>Note</label>
                  <select
                    className={styles.select}
                    value={cardForm.refId}
                    onChange={(e) => setCardForm({ ...cardForm, refId: e.target.value })}
                  >
                    <option value="">—</option>
                    {notes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Texte affiché sur la carte</label>
              <input
                className={styles.input}
                value={cardForm.text}
                onChange={(e) => setCardForm({ ...cardForm, text: e.target.value })}
                required
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Ajouter la carte
            </button>
          </form>
        )}

        {cards.length === 0 ? (
          <div className={styles.emptyState}>
            Aucune carte — ajoutez-en, puis reliez-les en glissant depuis le bord d&apos;une carte vers une autre.
          </div>
        ) : (
          <div className={styles.canvasWrap}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={(_evt, node) => storage.updateCanvasCard(node.id, { position: node.position })}
              onConnect={(connection) => {
                if (!connection.source || !connection.target) return;
                storage.addCanvasLink({ dossierId, fromCardId: connection.source, toCardId: connection.target });
              }}
              onEdgeClick={(_evt, edge) => {
                if (window.confirm("Supprimer ce lien ?")) storage.deleteCanvasLink(edge.id);
              }}
              onNodeDoubleClick={(_evt, node) => {
                if (window.confirm("Supprimer cette carte ?")) storage.deleteCanvasCard(node.id);
              }}
              fitView
              colorMode="dark"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
