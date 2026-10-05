"use client";

import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ENTITY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
  type InvestigationEntity,
  type Relation,
  type RelationStatus,
} from "@/lib/investigation/types";
import { useEntities, useInvestigationStorage, useRelations, useSources } from "@/lib/investigation/InvestigationContext";
import {
  attributeLink,
  findSharedValues,
  groupAttributes,
  pivotKey,
  sharedValueLabel,
  type SharedValue,
} from "@/lib/investigation/attributes";
import AttributeIcon from "./AttributeIcon";
import EntityForm, { type EntityFormValues } from "./EntityForm";
import EntityNode, { countryOf, type EntityFlowNode } from "./EntityNode";
import HexFlag from "./HexFlag";
import { useEntityImage } from "./useEntityImage";
import styles from "./EntityGraphPanel.module.css";

interface EntityGraphPanelProps {
  dossierId: string;
}

// Défini hors du composant : React Flow exige une référence stable.
const NODE_TYPES = { entityCard: EntityNode };

/** Pour chaque coordonnée partagée : les noms des autres fiches qui portent la même valeur. */
function sharedWithByAttribute(entities: InvestigationEntity[], shared: SharedValue[]): Map<string, Record<string, string[]>> {
  const byEntity = new Map<string, Record<string, string[]>>();
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));
  const sharedByKey = new Map(shared.map((value) => [value.key, value]));
  for (const entity of entities) {
    const perAttribute: Record<string, string[]> = {};
    for (const attribute of entity.attributes ?? []) {
      const key = pivotKey(attribute);
      const value = key ? sharedByKey.get(key) : undefined;
      if (!value) continue;
      perAttribute[attribute.id] = value.entityIds.filter((id) => id !== entity.id).map((id) => names.get(id) ?? id);
    }
    byEntity.set(entity.id, perAttribute);
  }
  return byEntity;
}

function entitiesToNodes(entities: InvestigationEntity[], shared: SharedValue[]): EntityFlowNode[] {
  const sharedWith = sharedWithByAttribute(entities, shared);
  return entities.map((entity) => ({
    id: entity.id,
    type: "entityCard" as const,
    position: entity.position,
    data: { entity, sharedWith: sharedWith.get(entity.id) ?? {} },
  }));
}

/** Traits gris entre deux fiches qui portent la même valeur (même e-mail, même téléphone, même compte). */
function pivotEdges(shared: SharedValue[]): Edge[] {
  const edges: Edge[] = [];
  for (const value of shared) {
    const ids = value.entityIds.slice(0, 6);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        edges.push({
          id: `pivot:${value.key}:${ids[i]}:${ids[j]}`,
          source: ids[i],
          target: ids[j],
          // Courbe : le trait ne se superpose pas à un lien direct entre les mêmes fiches.
          type: "default",
          label: sharedValueLabel(value),
          style: { stroke: "#8f9baa", strokeWidth: 1.4, strokeDasharray: "2 5" },
          labelStyle: { fill: "#8f9baa", fontSize: 11, fontStyle: "italic" },
          labelBgStyle: { fill: "var(--bg-primary)", fillOpacity: 0.9 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          selectable: false,
        });
      }
    }
  }
  return edges;
}

function relationsToEdges(relations: Relation[]): Edge[] {
  return relations.map((r) => ({
    id: r.id,
    source: r.sourceEntityId,
    target: r.targetEntityId,
    label: r.label,
    type: "straight",
    // Pointillés animés = lien supposé (hypothèse) ; trait plein = lien documenté.
    animated: r.status === "hypothesis",
    style: { stroke: "var(--accent-gold)", strokeWidth: 1.6 },
    labelStyle: { fill: "var(--text-primary)", fontSize: 12, fontStyle: "italic" },
    labelBgStyle: { fill: "var(--bg-primary)", fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 4,
  }));
}

// Première case libre d'une grille assez large pour les cartes : une nouvelle
// fiche ne se pose jamais sur une fiche existante.
function freePosition(existing: { x: number; y: number }[]): { x: number; y: number } {
  for (let index = 0; index < 400; index++) {
    const candidate = { x: 60 + (index % 3) * 400, y: 60 + Math.floor(index / 3) * 170 };
    const taken = existing.some((p) => Math.abs(p.x - candidate.x) < 330 && Math.abs(p.y - candidate.y) < 130);
    if (!taken) return candidate;
  }
  return { x: 60, y: 60 };
}

function EntityDetails({
  entity,
  entities,
  sources,
  sharedValues,
  onEdit,
  onDelete,
}: {
  entity: InvestigationEntity;
  entities: InvestigationEntity[];
  sources: { id: string; title: string }[];
  sharedValues: SharedValue[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const image = useEntityImage(entity.imageId, entity.imageUrl);
  const country = countryOf(entity);
  return (
    <>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={styles.detailImage} referrerPolicy="no-referrer" />
      ) : null}
      <span className={styles.detailTitle}>{entity.name}</span>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Type</span>
        <span className={styles.detailValue}>{ENTITY_TYPE_LABELS[entity.type]}</span>
      </div>
      {entity.role ? (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Rôle</span>
          <span className={styles.detailValue}>{entity.role}</span>
        </div>
      ) : null}
      {country ? (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Pays</span>
          <span className={styles.detailValue}>
            {country.label} <HexFlag iso2={country.iso2} name={country.name} />
          </span>
        </div>
      ) : null}
      {groupAttributes(entity.attributes ?? []).map((group) => (
        <div key={group.key} className={styles.attrGroup}>
          <div className={styles.attrGroupTitle}>
            <AttributeIcon kind={group.kind} platform={group.platform} />
            {group.title}
          </div>
          {group.items.map((attribute) => {
            const link = attributeLink(attribute);
            const key = pivotKey(attribute);
            const shared = key ? sharedValues.find((value) => value.key === key) : undefined;
            const others = shared ? shared.entityIds.filter((id) => id !== entity.id).map((id) => entities.find((e) => e.id === id)?.name ?? id) : [];
            const source = sources.find((s) => s.id === attribute.sourceId);
            return (
              <div key={attribute.id} className={styles.attrItem}>
                {link ? (
                  <a href={link} {...(link.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {attribute.value}
                  </a>
                ) : (
                  <span>{attribute.value}</span>
                )}
                {attribute.secondary ? <span className={styles.attrMeta}> · ID {attribute.secondary}</span> : null}
                <span className={styles.attrMeta}>
                  {" · "}
                  {attribute.status === "hypothesis" ? "supposée" : "documentée"}
                  {source ? ` · ${source.title}` : ""}
                </span>
                {others.length > 0 ? (
                  <span className={styles.attrShared}>⛓ Même valeur sur : {others.join(", ")}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
      {entity.aliases.length > 0 && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Alias</span>
          <span className={styles.detailValue}>{entity.aliases.join(", ")}</span>
        </div>
      )}
      {entity.notes && (
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Notes</span>
          <span className={styles.detailValue}>{entity.notes}</span>
        </div>
      )}
      <button type="button" className={styles.editBtn} onClick={onEdit}>
        Modifier la fiche
      </button>
      <button type="button" className={styles.deleteBtn} onClick={onDelete}>
        Supprimer l&apos;entité
      </button>
    </>
  );
}

export default function EntityGraphPanel({ dossierId }: EntityGraphPanelProps) {
  const entities = useEntities(dossierId);
  const relations = useRelations(dossierId);
  const sources = useSources(dossierId);
  const storage = useInvestigationStorage();

  const [showEntityForm, setShowEntityForm] = useState(false);
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [selected, setSelected] = useState<{ kind: "entity" | "relation"; id: string } | null>(null);

  const [showPivots, setShowPivots] = useState(true);
  const sharedValues = useMemo(() => findSharedValues(entities), [entities]);
  const initialNodes = useMemo(() => entitiesToNodes(entities, sharedValues), [entities, sharedValues]);
  const initialEdges = useMemo(
    () => [...relationsToEdges(relations), ...(showPivots ? pivotEdges(sharedValues) : [])],
    [relations, sharedValues, showPivots]
  );

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
    if (edge.id.startsWith("pivot:")) return;
    setSelected({ kind: "relation", id: edge.id });
  };

  const selectedEntity = selected?.kind === "entity" ? entities.find((e) => e.id === selected.id) : null;
  const selectedRelation = selected?.kind === "relation" ? relations.find((r) => r.id === selected.id) : null;

  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [relationForm, setRelationForm] = useState({
    sourceEntityId: "",
    targetEntityId: "",
    label: "",
    status: "hypothesis" as RelationStatus,
    confidence: "50",
    justifyingSourceId: "",
  });

  function handleAddEntity(values: EntityFormValues) {
    storage.addEntity({
      dossierId,
      type: values.type,
      name: values.name,
      aliases: values.aliases,
      notes: values.notes,
      role: values.role || undefined,
      countryIso2: values.countryIso2 || undefined,
      countryLabel: values.countryLabel || undefined,
      imageId: values.imageId,
      imageUrl: values.imageUrl,
      attributes: values.attributes.length > 0 ? values.attributes : undefined,
      position: freePosition(entities.map((entity) => entity.position)),
    });
    setShowEntityForm(false);
  }

  function handleUpdateEntity(id: string, values: EntityFormValues) {
    storage.updateEntity(id, {
      type: values.type,
      name: values.name,
      aliases: values.aliases,
      notes: values.notes,
      role: values.role || undefined,
      countryIso2: values.countryIso2 || undefined,
      countryLabel: values.countryLabel || undefined,
      imageId: values.imageId,
      imageUrl: values.imageUrl,
      attributes: values.attributes.length > 0 ? values.attributes : undefined,
    });
    setEditingEntityId(null);
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
        {sharedValues.length > 0 ? (
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => setShowPivots((value) => !value)}
            title="Fiches qui portent la même coordonnée (e-mail, téléphone, compte…)"
          >
            {showPivots ? "Masquer" : "Afficher"} les valeurs communes ({sharedValues.length})
          </button>
        ) : null}
      </div>

      {showEntityForm && (
        <div className={styles.formCard}>
          <EntityForm submitLabel="Ajouter" sources={sources} onSubmit={handleAddEntity} onCancel={() => setShowEntityForm(false)} />
        </div>
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
              nodeTypes={NODE_TYPES}
              fitView
              colorMode="dark"
              minZoom={0.2}
              nodesConnectable={false}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
              <Panel position="bottom-center" className={styles.legend}>
                <span className={styles.legendItem}>
                  <svg width="30" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="30" y2="4" stroke="#c89b3c" strokeWidth="2" />
                  </svg>
                  Lien documenté
                </span>
                <span className={styles.legendItem}>
                  <svg width="30" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="30" y2="4" stroke="#c89b3c" strokeWidth="2" strokeDasharray="5 4" />
                  </svg>
                  Lien supposé
                </span>
              </Panel>
            </ReactFlow>
          </div>

          {selectedEntity && (
            <div className={styles.detailPanel}>
              {editingEntityId === selectedEntity.id ? (
                <EntityForm
                  key={selectedEntity.id}
                  initial={selectedEntity}
                  submitLabel="Enregistrer"
                  sources={sources}
                  onSubmit={(values) => handleUpdateEntity(selectedEntity.id, values)}
                  onCancel={() => setEditingEntityId(null)}
                />
              ) : (
                <EntityDetails
                  entity={selectedEntity}
                  sources={sources}
                  sharedValues={sharedValues}
                  entities={entities}
                  onEdit={() => setEditingEntityId(selectedEntity.id)}
                  onDelete={() => {
                    storage.deleteEntity(selectedEntity.id);
                    setSelected(null);
                  }}
                />
              )}
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
