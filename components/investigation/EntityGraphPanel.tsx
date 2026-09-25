"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ENTITY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
  type EntityType,
  type InvestigationEntity,
  type Relation,
  type RelationStatus,
} from "@/lib/investigation/types";
import { useEntities, useInvestigationStorage, useRelations, useSources } from "@/lib/investigation/InvestigationContext";
import styles from "./EntityGraphPanel.module.css";

interface EntityGraphPanelProps {
  dossierId: string;
}

const ENTITY_TYPE_COLOR: Record<EntityType, string> = {
  person: "var(--status-info)",
  organization: "var(--status-watch)",
  location: "var(--status-normal)",
  event: "var(--status-danger)",
  document: "var(--text-secondary)",
  account: "var(--status-critical)",
};

function entitiesToNodes(entities: InvestigationEntity[]): Node[] {
  return entities.map((e) => ({
    id: e.id,
    position: e.position,
    data: { label: `${e.name}\n(${ENTITY_TYPE_LABELS[e.type]})` },
    style: {
      background: "var(--bg-panel-alt)",
      border: `2px solid ${ENTITY_TYPE_COLOR[e.type]}`,
      borderRadius: 8,
      color: "var(--text-primary)",
      fontSize: 12,
      whiteSpace: "pre-line" as const,
      padding: 8,
    },
  }));
}

function relationsToEdges(relations: Relation[]): Edge[] {
  return relations.map((r) => ({
    id: r.id,
    source: r.sourceEntityId,
    target: r.targetEntityId,
    label: r.label,
    animated: r.status === "hypothesis",
    style: { stroke: r.status === "hypothesis" ? "var(--accent-gold)" : "var(--status-info)" },
    labelStyle: { fill: "var(--text-primary)", fontSize: 11 },
  }));
}

function randomPosition(index: number): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 60 + col * 180, y: 60 + row * 140 };
}

export default function EntityGraphPanel({ dossierId }: EntityGraphPanelProps) {
  const entities = useEntities(dossierId);
  const relations = useRelations(dossierId);
  const sources = useSources(dossierId);
  const storage = useInvestigationStorage();

  const [showEntityForm, setShowEntityForm] = useState(false);
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [selected, setSelected] = useState<{ kind: "entity" | "relation"; id: string } | null>(null);

  const initialNodes = useMemo(() => entitiesToNodes(entities), [entities]);
  const initialEdges = useMemo(() => relationsToEdges(relations), [relations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // React Flow owns node/edge arrays locally for drag performance; this
  // resyncs them whenever the underlying entities/relations change (add,
  // delete, or an external update) — the standard pattern for a
  // React-Flow canvas backed by external state.
  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  const handleNodeDragStop: OnNodeDrag = (_evt, node) => {
    storage.updateEntity(node.id, { position: node.position });
  };

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    setSelected({ kind: "entity", id: node.id });
  };

  const handleEdgeClick: EdgeMouseHandler = (_evt, edge) => {
    setSelected({ kind: "relation", id: edge.id });
  };

  const selectedEntity = selected?.kind === "entity" ? entities.find((e) => e.id === selected.id) : null;
  const selectedRelation = selected?.kind === "relation" ? relations.find((r) => r.id === selected.id) : null;

  const [entityForm, setEntityForm] = useState({ name: "", type: "person" as EntityType, aliases: "", notes: "" });
  const [relationForm, setRelationForm] = useState({
    sourceEntityId: "",
    targetEntityId: "",
    label: "",
    status: "hypothesis" as RelationStatus,
    confidence: "50",
    justifyingSourceId: "",
  });

  function handleAddEntity(e: FormEvent) {
    e.preventDefault();
    if (!entityForm.name.trim()) return;
    storage.addEntity({
      dossierId,
      type: entityForm.type,
      name: entityForm.name.trim(),
      aliases: entityForm.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      notes: entityForm.notes.trim(),
      position: randomPosition(entities.length),
    });
    setEntityForm({ name: "", type: "person", aliases: "", notes: "" });
    setShowEntityForm(false);
  }

  function handleAddRelation(e: FormEvent) {
    e.preventDefault();
    if (!relationForm.sourceEntityId || !relationForm.targetEntityId || !relationForm.label.trim()) return;
    storage.addRelation({
      dossierId,
      sourceEntityId: relationForm.sourceEntityId,
      targetEntityId: relationForm.targetEntityId,
      label: relationForm.label.trim(),
      status: relationForm.status,
      confidence: Number(relationForm.confidence),
      justifyingSourceId: relationForm.justifyingSourceId || null,
    });
    setRelationForm({
      sourceEntityId: "",
      targetEntityId: "",
      label: "",
      status: "hypothesis",
      confidence: "50",
      justifyingSourceId: "",
    });
    setShowRelationForm(false);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolbarBtn} onClick={() => setShowEntityForm((v) => !v)}>
          + Ajouter une entité
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => setShowRelationForm((v) => !v)}
          disabled={entities.length < 2}
          title={entities.length < 2 ? "Ajoutez au moins deux entités d'abord" : undefined}
        >
          + Ajouter une relation
        </button>
      </div>

      {showEntityForm && (
        <form className={styles.formCard} onSubmit={handleAddEntity}>
          <div className={styles.field}>
            <label className={styles.label}>Nom</label>
            <input
              className={styles.input}
              value={entityForm.name}
              onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <select
              className={styles.select}
              value={entityForm.type}
              onChange={(e) => setEntityForm({ ...entityForm, type: e.target.value as EntityType })}
            >
              {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((t) => (
                <option key={t} value={t}>
                  {ENTITY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Alias (séparés par virgule)</label>
            <input
              className={styles.input}
              value={entityForm.aliases}
              onChange={(e) => setEntityForm({ ...entityForm, aliases: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <input
              className={styles.input}
              value={entityForm.notes}
              onChange={(e) => setEntityForm({ ...entityForm, notes: e.target.value })}
            />
          </div>
          <button type="submit" className={styles.submitBtn}>
            Ajouter
          </button>
        </form>
      )}

      {showRelationForm && (
        <form className={styles.formCard} onSubmit={handleAddRelation}>
          <div className={styles.field}>
            <label className={styles.label}>Entité source</label>
            <select
              className={styles.select}
              value={relationForm.sourceEntityId}
              onChange={(e) => setRelationForm({ ...relationForm, sourceEntityId: e.target.value })}
              required
            >
              <option value="">—</option>
              {entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Entité cible</label>
            <select
              className={styles.select}
              value={relationForm.targetEntityId}
              onChange={(e) => setRelationForm({ ...relationForm, targetEntityId: e.target.value })}
              required
            >
              <option value="">—</option>
              {entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Libellé</label>
            <input
              className={styles.input}
              value={relationForm.label}
              onChange={(e) => setRelationForm({ ...relationForm, label: e.target.value })}
              placeholder="ex: dirige, finance, membre de..."
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Statut</label>
            <select
              className={styles.select}
              value={relationForm.status}
              onChange={(e) => setRelationForm({ ...relationForm, status: e.target.value as RelationStatus })}
            >
              {(Object.keys(RELATION_STATUS_LABELS) as RelationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {RELATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confiance ({relationForm.confidence}%)</label>
            <input
              className={styles.input}
              type="range"
              min={0}
              max={100}
              value={relationForm.confidence}
              onChange={(e) => setRelationForm({ ...relationForm, confidence: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Source justificative</label>
            <select
              className={styles.select}
              value={relationForm.justifyingSourceId}
              onChange={(e) => setRelationForm({ ...relationForm, justifyingSourceId: e.target.value })}
            >
              <option value="">Aucune</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={styles.submitBtn}>
            Ajouter
          </button>
        </form>
      )}

      {entities.length === 0 ? (
        <div className={styles.emptyState}>
          Aucune entité — ajoutez-en pour commencer à construire le graphe relationnel.
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.canvasWrap}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={() => setSelected(null)}
              fitView
              colorMode="dark"
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>

          {selectedEntity && (
            <div className={styles.detailPanel}>
              <span className={styles.detailTitle}>{selectedEntity.name}</span>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{ENTITY_TYPE_LABELS[selectedEntity.type]}</span>
              </div>
              {selectedEntity.aliases.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Alias</span>
                  <span className={styles.detailValue}>{selectedEntity.aliases.join(", ")}</span>
                </div>
              )}
              {selectedEntity.notes && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Notes</span>
                  <span className={styles.detailValue}>{selectedEntity.notes}</span>
                </div>
              )}
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => {
                  storage.deleteEntity(selectedEntity.id);
                  setSelected(null);
                }}
              >
                Supprimer l&apos;entité
              </button>
            </div>
          )}

          {selectedRelation && (
            <div className={styles.detailPanel}>
              <span className={styles.detailTitle}>{selectedRelation.label}</span>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Statut</span>
                <span className={styles.detailValue}>{RELATION_STATUS_LABELS[selectedRelation.status]}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Confiance</span>
                <span className={styles.detailValue}>{selectedRelation.confidence}%</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Source justificative</span>
                <span className={styles.detailValue}>
                  {sources.find((s) => s.id === selectedRelation.justifyingSourceId)?.title ?? "Aucune"}
                </span>
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => {
                  storage.deleteRelation(selectedRelation.id);
                  setSelected(null);
                }}
              >
                Supprimer la relation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
