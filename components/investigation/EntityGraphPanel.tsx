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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ENTITY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
  type InvestigationEntity,
  type Relation,
} from "@/lib/investigation/types";
import {
  useDossier,
  useEntities,
  useInvestigationStorage,
  useNotes,
  useRelations,
  useSources,
} from "@/lib/investigation/InvestigationContext";
import {
  attributeLink,
  findSharedValues,
  groupAttributes,
  pivotKey,
  sharedValueLabel,
  type SharedValue,
} from "@/lib/investigation/attributes";
import AttributeIcon from "./AttributeIcon";
import { freePosition } from "@/lib/investigation/layout";
import type { InvestigationData } from "@/lib/investigation/types";
import { renameNote } from "@/lib/investigation/fiches";
import { computeTreeLayout, type Positions } from "@/lib/investigation/autoLayout";
import { findDuplicateCandidates } from "@/lib/investigation/duplicates";
import { planEntityMerge, type MergeChoices } from "@/lib/investigation/merge";
import {
  DUPLICATE_RELATION_KEY,
  edgeLabel,
  getRelationType,
  hierarchyOf,
  isDuplicateRelation,
} from "@/lib/investigation/relationTypes";
import DuplicatesPanel from "./DuplicatesPanel";
import ExportPanel from "./ExportPanel";
import RelationEdge from "./RelationEdge";
import MergeDialog from "./MergeDialog";
import EntityForm, { type EntityFormValues } from "./EntityForm";
import RelationForm, { type RelationFormValues } from "./RelationForm";
import EntityNode, { countryOf, OpenAttributeContext, type EntityFlowNode } from "./EntityNode";
import HexFlag from "./HexFlag";
import { useEntityImage } from "./useEntityImage";
import styles from "./EntityGraphPanel.module.css";

interface EntityGraphPanelProps {
  dossierId: string;
  /** Ouvre (ou crée) la fiche texte d'une entité ; absent = pas de bouton. */
  onOpenFiche?: (entityId: string) => void;
  /** Ouvre la page d'une coordonnée (téléphone, compte, e-mail…). */
  onOpenAttribute?: (entityId: string, attributeId: string) => void;
  /** Demande de centrer le graphe sur une fiche : un nouveau `nonce` relance le centrage. */
  focusRequest?: { entityId: string; nonce: number } | null;
  /** Graphe affiché à côté du texte : il remplit la hauteur disponible. */
  compact?: boolean;
}

// Défini hors du composant : React Flow exige une référence stable.
const NODE_TYPES = { entityCard: EntityNode };
const EDGE_TYPES = { relation: RelationEdge };

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
  return relations.map((r) => {
    const duplicate = isDuplicateRelation(r);
    return {
      id: r.id,
      source: r.sourceEntityId,
      target: r.targetEntityId,
      label: edgeLabel(r),
      type: "relation",
      data: { curved: duplicate },
      // Pointillés animés = lien supposé (hypothèse) ; trait plein = lien documenté.
      animated: r.status === "hypothesis",
      // Un doublon possible est orange : à examiner, jamais fusionné automatiquement.
      // Pointillés écrits explicitement (en plus de l'animation) : ils survivent à l'export en image.
      style: {
        stroke: duplicate ? "var(--status-danger)" : "var(--accent-gold)",
        strokeWidth: 1.6,
        ...(duplicate || r.status === "hypothesis" ? { strokeDasharray: "6 4" } : {}),
      },
      labelStyle: { fill: duplicate ? "var(--status-danger)" : "var(--text-primary)", fontSize: 12, fontStyle: "italic" },
      labelBgStyle: { fill: "var(--bg-primary)", fillOpacity: 0.9 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
    };
  });
}

function EntityDetails({
  entity,
  entities,
  sources,
  sharedValues,
  hasFiche,
  onTogglePin,
  mergeCandidates,
  onMergeWith,
  onOpenFiche,
  onOpenAttribute,
  onEdit,
  onDelete,
}: {
  hasFiche: boolean;
  onTogglePin: () => void;
  mergeCandidates: InvestigationEntity[];
  onMergeWith: (otherId: string) => void;
  onOpenAttribute?: (attributeId: string) => void;
  onOpenFiche?: () => void;
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
                {onOpenAttribute ? (
                  <button type="button" className={styles.pageLink} onClick={() => onOpenAttribute(attribute.id)}>
                    Ouvrir la page ↗
                  </button>
                ) : null}
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
      {onOpenFiche ? (
        <button type="button" className={styles.ficheBtn} onClick={onOpenFiche}>
          {hasFiche ? "Ouvrir la fiche" : "Créer la fiche"}
        </button>
      ) : null}
      <button type="button" className={styles.editBtn} onClick={onEdit}>
        Modifier les infos
      </button>
      <button type="button" className={styles.editBtn} onClick={onTogglePin}>
        {entity.pinned ? "Désépingler la position" : "Épingler la position"}
      </button>
      {mergeCandidates.length > 0 ? (
        <select
          className={styles.mergeSelect}
          value=""
          onChange={(e) => e.target.value && onMergeWith(e.target.value)}
          aria-label="Fusionner avec une autre fiche"
        >
          <option value="">Fusionner avec une autre fiche…</option>
          {mergeCandidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      ) : null}
      <button type="button" className={styles.deleteBtn} onClick={onDelete}>
        Supprimer l&apos;entité
      </button>
    </>
  );
}

export default function EntityGraphPanel({
  dossierId,
  onOpenFiche,
  onOpenAttribute,
  focusRequest = null,
  compact = false,
}: EntityGraphPanelProps) {
  const entities = useEntities(dossierId);
  const relations = useRelations(dossierId);
  const sources = useSources(dossierId);
  const notes = useNotes(dossierId);
  const dossier = useDossier(dossierId);
  const storage = useInvestigationStorage();
  const duplicates = useMemo(
    () => findDuplicateCandidates(entities, relations, dossier?.dismissedDuplicates),
    [entities, relations, dossier?.dismissedDuplicates]
  );
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");
  const [layoutUndo, setLayoutUndo] = useState<Positions | null>(null);
  const [merging, setMerging] = useState<{ primaryId: string; secondaryId: string } | null>(null);
  const [lastMerge, setLastMerge] = useState<{ before: InvestigationData; after: InvestigationData; text: string; failed?: boolean } | null>(null);
  const ficheEntityIds = useMemo(() => new Set(notes.flatMap((note) => (note.entityId ? [note.entityId] : []))), [notes]);
  const [flow, setFlow] = useState<ReactFlowInstance<EntityFlowNode> | null>(null);
  const [appliedFocus, setAppliedFocus] = useState(0);

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

  // Une demande de l'éditeur de notes (« Voir dans le graphe ») sélectionne la fiche.
  if (focusRequest && focusRequest.nonce !== appliedFocus) {
    setAppliedFocus(focusRequest.nonce);
    setSelected({ kind: "entity", id: focusRequest.entityId });
  }

  const focusedId = focusRequest?.entityId;
  const focusNonce = focusRequest?.nonce;
  useEffect(() => {
    if (!flow || !focusedId) return;
    const id = window.setTimeout(() => void flow.fitView({ nodes: [{ id: focusedId }], duration: 450, maxZoom: 1, padding: 0.6 }), 60);
    return () => window.clearTimeout(id);
  }, [flow, focusedId, focusNonce]);

  const selectedEntity = selected?.kind === "entity" ? entities.find((e) => e.id === selected.id) : null;
  const selectedRelation = selected?.kind === "relation" ? relations.find((r) => r.id === selected.id) : null;

  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);

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
    // La fiche texte porte le nom de l'entité : un renommage les suit toutes les deux.
    const fiche = notes.find((note) => note.entityId === id);
    if (fiche && fiche.title !== values.name) renameNote(storage, notes, fiche, values.name);
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

  // Range le graphe en arbre selon les relations hiérarchiques. Les positions d'avant sont
  // gardées pour « Annuler la mise en page » : le placement manuel a de la valeur.
  function organize() {
    if (!flow || entities.length === 0) return;
    const measured = new Map(flow.getNodes().map((n) => [n.id, n.measured]));
    const nodes = entities.map((entity) => ({
      id: entity.id,
      x: entity.position.x,
      y: entity.position.y,
      width: measured.get(entity.id)?.width ?? 340,
      height: measured.get(entity.id)?.height ?? 120,
      pinned: entity.pinned,
    }));
    const hierarchy = relations.flatMap((relation) => {
      if (isDuplicateRelation(relation)) return [];
      const link = hierarchyOf(relation);
      return link ? [link] : [];
    });
    const lateral = relations
      .filter((relation) => !isDuplicateRelation(relation) && !hierarchyOf(relation))
      .map((relation) => ({ a: relation.sourceEntityId, b: relation.targetEntityId }));
    const positions = computeTreeLayout(nodes, hierarchy, lateral, { direction: layoutDirection });
    setLayoutUndo(Object.fromEntries(entities.map((entity) => [entity.id, entity.position])));
    storage.setEntityPositions(positions);
    window.setTimeout(() => void flow.fitView({ duration: 500, padding: 0.15 }), 80);
  }

  function undoLayout() {
    if (!layoutUndo) return;
    storage.setEntityPositions(layoutUndo);
    setLayoutUndo(null);
    window.setTimeout(() => void flow?.fitView({ duration: 400, padding: 0.15 }), 80);
  }

  // Marque deux fiches comme « possible doublon » : un trait orange, sans rien fusionner.
  function markDuplicate(aId: string, bId: string) {
    storage.addRelation({
      dossierId,
      sourceEntityId: aId,
      targetEntityId: bId,
      typeKey: DUPLICATE_RELATION_KEY,
      label: getRelationType(DUPLICATE_RELATION_KEY)?.label ?? "",
      status: "hypothesis",
      confidence: 50,
      justifyingSourceId: null,
    });
  }

  function confirmMerge(choices: MergeChoices) {
    if (!merging) return;
    const primary = entities.find((e) => e.id === merging.primaryId);
    const secondary = entities.find((e) => e.id === merging.secondaryId);
    if (!primary || !secondary) return;
    const plan = planEntityMerge(primary, secondary, choices);
    const result = storage.mergeEntities(primary.id, secondary.id, plan);
    setMerging(null);
    if (!result) return;
    setLastMerge({ ...result, text: `« ${secondary.name} » a été fusionnée dans « ${plan.patch.name} ».` });
    setSelected({ kind: "entity", id: primary.id });
    setShowDuplicates(false);
  }

  function undoMerge() {
    if (!lastMerge) return;
    if (storage.restoreSnapshot(lastMerge.before, lastMerge.after)) setLastMerge(null);
    else setLastMerge({ ...lastMerge, failed: true });
  }

  function relationFields(values: RelationFormValues) {
    return {
      sourceEntityId: values.sourceEntityId,
      targetEntityId: values.targetEntityId,
      // Le libellé suit le type du catalogue ; « Autre » garde le texte libre.
      typeKey: values.typeKey === "custom" ? undefined : values.typeKey,
      label: values.label,
      status: values.status,
      confidence: values.confidence,
      justifyingSourceId: values.justifyingSourceId,
      period: values.period || undefined,
    };
  }

  function handleAddRelation(values: RelationFormValues) {
    storage.addRelation({ dossierId, ...relationFields(values) });
    setShowRelationForm(false);
  }

  function handleUpdateRelation(id: string, values: RelationFormValues) {
    storage.updateRelation(id, relationFields(values));
    setEditingRelationId(null);
  }
  return (
    <div className={compact ? `${styles.wrap} ${styles.wrapCompact}` : styles.wrap}>
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
        {entities.length > 1 ? (
          <>
            <button type="button" className={styles.toolbarBtn} onClick={organize} title="Range les fiches en arbre selon les relations hiérarchiques ; les fiches épinglées ne bougent pas">
              Organiser
            </button>
            <select
              className={styles.layoutSelect}
              value={layoutDirection}
              onChange={(e) => setLayoutDirection(e.target.value as "TB" | "LR")}
              aria-label="Sens de la mise en page"
            >
              <option value="TB">de haut en bas</option>
              <option value="LR">de gauche à droite</option>
            </select>
          </>
        ) : null}
        {entities.length > 0 ? (
          <button type="button" className={styles.toolbarBtn} onClick={() => setShowExport((value) => !value)}>
            Exporter en image
          </button>
        ) : null}
        {duplicates.length > 0 ? (
          <button type="button" className={styles.toolbarBtn} onClick={() => setShowDuplicates((value) => !value)}>
            Doublons possibles ({duplicates.length})
          </button>
        ) : null}
      </div>

      {showExport ? (
        <ExportPanel
          getContainer={() => canvasRef.current?.querySelector<HTMLElement>(".react-flow") ?? null}
          dossierName={dossier?.name ?? "Graphe"}
          onClose={() => setShowExport(false)}
        />
      ) : null}

      {layoutUndo ? (
        <div className={styles.notice} role="status">
          <span>Mise en page appliquée.</span>
          <button type="button" className={styles.noticeBtn} onClick={undoLayout}>
            Annuler la mise en page
          </button>
          <button type="button" className={styles.noticeBtn} onClick={() => setLayoutUndo(null)} aria-label="Fermer">
            ×
          </button>
        </div>
      ) : null}

      {lastMerge ? (
        <div className={styles.notice} role="status">
          <span>
            {lastMerge.failed ? "Impossible d'annuler : des modifications ont eu lieu depuis la fusion." : lastMerge.text}
          </span>
          {lastMerge.failed ? null : (
            <button type="button" className={styles.noticeBtn} onClick={undoMerge}>
              Annuler la fusion
            </button>
          )}
          <button type="button" className={styles.noticeBtn} onClick={() => setLastMerge(null)} aria-label="Fermer">
            ×
          </button>
        </div>
      ) : null}

      {showDuplicates ? (
        <DuplicatesPanel
          candidates={duplicates}
          entities={entities}
          onFocus={(entityId) => setSelected({ kind: "entity", id: entityId })}
          onDismiss={(key) => storage.dismissDuplicate(dossierId, key)}
          onMark={markDuplicate}
          onMerge={(aId, bId) => setMerging({ primaryId: aId, secondaryId: bId })}
        />
      ) : null}

      {merging && entities.find((e) => e.id === merging.primaryId) && entities.find((e) => e.id === merging.secondaryId) ? (
        <MergeDialog
          key={`${merging.primaryId}|${merging.secondaryId}`}
          primary={entities.find((e) => e.id === merging.primaryId)!}
          secondary={entities.find((e) => e.id === merging.secondaryId)!}
          movedRelations={
            relations.filter(
              (r) =>
                (r.sourceEntityId === merging.secondaryId || r.targetEntityId === merging.secondaryId) &&
                r.sourceEntityId !== merging.primaryId &&
                r.targetEntityId !== merging.primaryId
            ).length
          }
          bothHaveText={
            notes.some((n) => n.entityId === merging.primaryId && n.body.trim() !== "") &&
            notes.some((n) => n.entityId === merging.secondaryId && n.body.trim() !== "")
          }
          onSwap={() => setMerging({ primaryId: merging.secondaryId, secondaryId: merging.primaryId })}
          onCancel={() => setMerging(null)}
          onConfirm={confirmMerge}
        />
      ) : null}

      {showEntityForm && (
        <div className={styles.formCard}>
          <EntityForm submitLabel="Ajouter" sources={sources} onSubmit={handleAddEntity} onCancel={() => setShowEntityForm(false)} />
        </div>
      )}

      {showRelationForm && (
        <div className={styles.formCard}>
          <RelationForm entities={entities} sources={sources} submitLabel="Ajouter" onSubmit={handleAddRelation} onCancel={() => setShowRelationForm(false)} />
        </div>
      )}
      {entities.length === 0 ? (
        <div className={styles.emptyState}>
          Aucune entité — ajoutez-en pour commencer à construire le graphe relationnel.
        </div>
      ) : (
        <div className={compact ? `${styles.body} ${styles.bodyCompact}` : styles.body}>
          <div ref={canvasRef} className={compact ? `${styles.canvasWrap} ${styles.canvasCompact}` : styles.canvasWrap}>
            <OpenAttributeContext.Provider value={onOpenAttribute}>
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
              edgeTypes={EDGE_TYPES}
              onInit={setFlow}
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
            </OpenAttributeContext.Provider>
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
                  hasFiche={ficheEntityIds.has(selectedEntity.id)}
                  onTogglePin={() => storage.updateEntity(selectedEntity.id, { pinned: !selectedEntity.pinned })}
                  mergeCandidates={entities.filter((e) => e.id !== selectedEntity.id)}
                  onMergeWith={(otherId) => setMerging({ primaryId: selectedEntity.id, secondaryId: otherId })}
                  onOpenAttribute={onOpenAttribute ? (attributeId) => onOpenAttribute(selectedEntity.id, attributeId) : undefined}
                  onOpenFiche={onOpenFiche ? () => onOpenFiche(selectedEntity.id) : undefined}
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
              {editingRelationId === selectedRelation.id ? (
                <RelationForm
                  key={selectedRelation.id}
                  entities={entities}
                  sources={sources}
                  initial={selectedRelation}
                  submitLabel="Enregistrer"
                  onSubmit={(values) => handleUpdateRelation(selectedRelation.id, values)}
                  onCancel={() => setEditingRelationId(null)}
                />
              ) : (
                <>
                  <span className={styles.detailTitle}>
                    {entities.find((e) => e.id === selectedRelation.sourceEntityId)?.name} {edgeLabel(selectedRelation)}{" "}
                    {entities.find((e) => e.id === selectedRelation.targetEntityId)?.name}
                  </span>
                  {(() => {
                    const type = getRelationType(selectedRelation.typeKey);
                    return type && !type.symmetric ? (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Dans l&apos;autre sens</span>
                        <span className={styles.detailValue}>
                          {entities.find((e) => e.id === selectedRelation.targetEntityId)?.name} {type.inverse}{" "}
                          {entities.find((e) => e.id === selectedRelation.sourceEntityId)?.name}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Statut</span>
                    <span className={styles.detailValue}>{RELATION_STATUS_LABELS[selectedRelation.status]}</span>
                  </div>
                  {selectedRelation.period ? (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Période</span>
                      <span className={styles.detailValue}>{selectedRelation.period}</span>
                    </div>
                  ) : null}
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
                  <button type="button" className={styles.editBtn} onClick={() => setEditingRelationId(selectedRelation.id)}>
                    Modifier la relation
                  </button>
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
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
