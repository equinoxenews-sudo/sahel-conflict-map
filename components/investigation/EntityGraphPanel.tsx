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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ENTITY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
  type AnchorId,
  type EntityType,
  type GraphShape,
  type InvestigationEntity,
  type LineStyle,
  type Relation,
  type ShapeKind,
} from "@/lib/investigation/types";
import { LINE_STYLES, LINE_STYLE_LABELS } from "@/lib/investigation/anchors";
import { ImageFileError, NOTE_IMAGE_MAX_SIDE, NOTE_IMAGE_QUALITY, prepareImage, putImage } from "@/lib/investigation/imageStore";
import {
  useDossier,
  useEntities,
  useInvestigationStorage,
  useNotes,
  useRelations,
  useShapes,
  useSources,
} from "@/lib/investigation/InvestigationContext";
import { frontZ, newShape, reorderShape, type LayerOperation, IMAGE_CARD_MAX, IMAGE_CARD_MIN, clampImageWidth } from "@/lib/investigation/shapes";
import {
  attributeLink,
  findSharedValues,
  groupAttributes,
  pivotKey,
  sharedValueLabel,
  type SharedValue,
} from "@/lib/investigation/attributes";
import AttributeIcon from "./AttributeIcon";
import ColorChoice from "./ColorChoice";
import SourceReference from "./SourceReference";
import { freePosition } from "@/lib/investigation/layout";
import type { InvestigationData } from "@/lib/investigation/types";
import { renameNote } from "@/lib/investigation/fiches";
import { computeTreeLayout, type Positions } from "@/lib/investigation/autoLayout";
import {
  SHAPES_FILTER,
  edgeHidden,
  entityHidden,
  filterRows,
  filterStorageKey,
  parseHidden,
  serializeHidden,
  toggleHidden,
  type FilterKey,
} from "@/lib/investigation/graphFilter";
import { pushLimited, sameGraph, sliceOf, type GraphSlice } from "@/lib/investigation/graphHistory";
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
import RelationRouting from "./RelationRouting";
import MergeDialog from "./MergeDialog";
import EntityForm, { type EntityFormValues } from "./EntityForm";
import RelationForm, { type RelationFormValues } from "./RelationForm";
import EntityNode, {
  ActiveAnchorsContext,
  countryOf,
  OpenAttributeContext,
  ToggleAttributesContext,
  ResizeImageContext,
  ToggleLockContext,
  type EntityFlowNode,
} from "./EntityNode";
import LockIcon from "./LockIcon";
import GraphFilters from "./GraphFilters";
import GraphToolbox, { type ColorTarget } from "./GraphToolbox";
import ShapeNode, { ShapeActionsContext, type ShapeFlowNode } from "./ShapeNode";
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
const NODE_TYPES = { entityCard: EntityNode, shape: ShapeNode };

type GraphNode = EntityFlowNode | ShapeFlowNode;
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
    // Cadenas fermé : la carte ne se déplace plus.
    draggable: entity.locked !== true,
    data: { entity, sharedWith: sharedWith.get(entity.id) ?? {} },
  }));
}

/** Formes et annotations : devant (z > 0) ou derrière (z < 0) les fiches, qui sont à 0. */
function shapesToNodes(shapes: GraphShape[]): ShapeFlowNode[] {
  return shapes.map((shape) => ({
    id: shape.id,
    type: "shape" as const,
    position: shape.position,
    width: shape.width,
    height: shape.height,
    zIndex: shape.z,
    draggable: shape.locked !== true,
    data: { shape },
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
          // Arc au-dessus des cartes : le trait ne se superpose pas à un lien direct entre les mêmes fiches.
          type: "relation",
          data: { lineStyle: "curve" as const, sourceAnchor: "tc" as const, targetAnchor: "tc" as const },
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
      // Droit par défaut ; un doublon possible est courbe pour ne pas se confondre avec un lien direct.
      data: {
        lineStyle: r.lineStyle ?? (duplicate ? "curve" : "straight"),
        sourceAnchor: r.sourceAnchor,
        targetAnchor: r.targetAnchor,
      },
      // Pointillés animés = lien supposé (hypothèse) ; trait plein = lien documenté.
      animated: r.status === "hypothesis",
      // Un doublon possible est orange : à examiner, jamais fusionné automatiquement.
      // Pointillés écrits explicitement (en plus de l'animation) : ils survivent à l'export en image.
      style: {
        stroke: r.lineColor ?? (duplicate ? "var(--status-danger)" : "var(--accent-gold)"),
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
  onToggleLock,
  onChangeBorderColor,
  onChangeImageWidth,
  mergeCandidates,
  onMergeWith,
  onOpenFiche,
  onOpenAttribute,
  onEdit,
  onDelete,
}: {
  hasFiche: boolean;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onChangeBorderColor: (color: string | undefined) => void;
  onChangeImageWidth: (width: number) => void;
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
      {entity.type === "image" ? (
        <label className={styles.imageSize}>
          <span>Taille de l&apos;image : {clampImageWidth(entity.imageWidth)} px</span>
          <input
            type="range"
            min={IMAGE_CARD_MIN}
            max={IMAGE_CARD_MAX}
            step={10}
            value={clampImageWidth(entity.imageWidth)}
            disabled={entity.locked === true}
            onChange={(event) => onChangeImageWidth(Number(event.target.value))}
          />
        </label>
      ) : null}
      <ColorChoice label="Couleur du contour" value={entity.borderColor} onChange={onChangeBorderColor} disabled={entity.locked === true} />
      <button type="button" className={styles.editBtn} onClick={onToggleLock}>
        <LockIcon locked={entity.locked === true} />{" "}
        {entity.locked ? "Fiche fermée — rouvrir pour modifier" : "Fiche ouverte — fermer et enregistrer"}
      </button>
      {entity.locked ? (
        <p className={styles.lockedNote}>
          Fiche fermée : elle ne peut plus être déplacée, modifiée, fusionnée ni supprimée tant que le cadenas est fermé.
        </p>
      ) : (
        <>
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
      )}
    </>
  );
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // stockage indisponible : le filtre ne sera simplement pas mémorisé
  }
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");
  const [layoutUndo, setLayoutUndo] = useState<Positions | null>(null);
  const [merging, setMerging] = useState<{ primaryId: string; secondaryId: string } | null>(null);
  const [lastMerge, setLastMerge] = useState<{ before: InvestigationData; after: InvestigationData; text: string; failed?: boolean } | null>(null);
  const ficheEntityIds = useMemo(() => new Set(notes.flatMap((note) => (note.entityId ? [note.entityId] : []))), [notes]);
  const shapes = useShapes(dossierId);
  const [flow, setFlow] = useState<ReactFlowInstance<GraphNode> | null>(null);
  const [toolsOpen, setToolsOpen] = useState(!compact);
  const [pipetteTarget, setPipetteTarget] = useState<ColorTarget | null>(null);
  const [appliedFocus, setAppliedFocus] = useState(0);

  const [showEntityForm, setShowEntityForm] = useState(false);
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [selected, setSelected] = useState<{ kind: "entity" | "relation" | "shape"; id: string } | null>(null);

  const [showPivots, setShowPivots] = useState(true);
  const sharedValues = useMemo(() => findSharedValues(entities), [entities]);
  const initialNodes = useMemo<GraphNode[]>(
    () => [...entitiesToNodes(entities, sharedValues), ...shapesToNodes(shapes)],
    [entities, sharedValues, shapes]
  );
  const initialEdges = useMemo(
    () => [...relationsToEdges(relations), ...(showPivots ? pivotEdges(sharedValues) : [])],
    [relations, sharedValues, showPivots]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Couches : catégories masquées (réglage de vue, mémorisé par dossier ; rien n'est déplacé ni modifié).
  const [hiddenKinds, setHiddenKinds] = useState<Set<FilterKey>>(() =>
    typeof window === "undefined" ? new Set() : parseHidden(safeRead(filterStorageKey(dossierId)))
  );
  const entityTypeById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity.type])), [entities]);
  const filterList = useMemo(
    () => filterRows(entities.map((entity) => entity.type), shapes.length, Object.keys(ENTITY_TYPE_LABELS) as EntityType[]),
    [entities, shapes.length]
  );
  const shownNodes = useMemo(
    () =>
      hiddenKinds.size === 0
        ? nodes
        : nodes.map((node) =>
            (node.type === "shape" ? hiddenKinds.has(SHAPES_FILTER) : entityHidden(hiddenKinds, entityTypeById.get(node.id))) ? { ...node, hidden: true } : node
          ),
    [nodes, hiddenKinds, entityTypeById]
  );
  const shownEdges = useMemo(
    () => (hiddenKinds.size === 0 ? edges : edges.map((edge) => (edgeHidden(hiddenKinds, entityTypeById, edge.source, edge.target) ? { ...edge, hidden: true } : edge))),
    [edges, hiddenKinds, entityTypeById]
  );
  function changeHiddenKinds(next: Set<FilterKey>) {
    setHiddenKinds(next);
    safeWrite(filterStorageKey(dossierId), next.size === 0 ? null : serializeHidden(next));
    // Une fiche ou une forme qui disparaît ne reste pas sélectionnée.
    setSelected((current) => {
      if (!current) return current;
      if (current.kind === "shape") return next.has(SHAPES_FILTER) ? null : current;
      if (current.kind === "entity") return entityHidden(next, entityTypeById.get(current.id)) ? null : current;
      return current;
    });
  }

  // React Flow owns node/edge arrays locally for drag performance; this
  // resyncs them whenever the underlying entities/relations change (add,
  // delete, or an external update) — the standard pattern for a
  // React-Flow canvas backed by external state.
  // La sélection (cadre de redimensionnement d'une forme) survit au rafraîchissement des données.
  const selectedShapeId = selected?.kind === "shape" ? selected.id : null;
  useEffect(
    () =>
      setNodes((previous) => {
        const keep = new Set(previous.filter((node) => node.selected).map((node) => node.id));
        return initialNodes.map((node) => (keep.has(node.id) ? { ...node, selected: true } : node)) as GraphNode[];
      }),
    [initialNodes, setNodes]
  );
  useEffect(
    () =>
      setNodes((previous) =>
        previous.map((node) => (node.type === "shape" && (node.selected === true) !== (node.id === selectedShapeId) ? { ...node, selected: node.id === selectedShapeId } : node)) as GraphNode[]
      ),
    [selectedShapeId, initialNodes, setNodes]
  );
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  // Historique du graphe : chaque série de modifications (fiches, relations, formes, déplacements) est un pas
  // d'annulation ; des changements rapprochés (frappe, rafale de couleurs) n'en font qu'un.
  const undoStack = useRef<GraphSlice[]>([]);
  const redoStack = useRef<GraphSlice[]>([]);
  const lastSlice = useRef<GraphSlice | null>(null);
  const lastChangeAt = useRef(0);
  const restoring = useRef(false);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  useEffect(() => {
    const current = sliceOf(entities, relations, shapes, notes);
    const previous = lastSlice.current;
    lastSlice.current = current;
    if (!previous) return;
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    if (sameGraph(previous, current)) return;
    const now = Date.now();
    if (now - lastChangeAt.current > 800) undoStack.current = pushLimited(undoStack.current, previous);
    lastChangeAt.current = now;
    redoStack.current = [];
    setHistorySize({ undo: undoStack.current.length, redo: 0 });
  }, [entities, relations, shapes, notes]);

  function stepHistory(direction: "undo" | "redo") {
    const from = direction === "undo" ? undoStack : redoStack;
    const to = direction === "undo" ? redoStack : undoStack;
    const target = from.current[from.current.length - 1];
    const current = lastSlice.current;
    if (!target || !current) return;
    from.current = from.current.slice(0, -1);
    to.current = pushLimited(to.current, current);
    restoring.current = true;
    lastChangeAt.current = 0;
    storage.restoreGraph(dossierId, target);
    setSelected(null);
    setHistorySize({ undo: undoStack.current.length, redo: redoStack.current.length });
  }

  // Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z) hors saisie de texte.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      event.preventDefault();
      stepHistory(key === "y" || event.shiftKey ? "redo" : "undo");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleNodeDragStop: OnNodeDrag = (_evt, node) => {
    if (node.type === "shape") storage.updateShape(node.id, { position: node.position });
    else storage.updateEntity(node.id, { position: node.position });
  };

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    if (node.type === "shape") {
      // Pipette (repli) : cliquer une autre forme copie sa couleur dans la forme sélectionnée.
      const source = shapes.find((shape) => shape.id === node.id);
      const target = shapes.find((shape) => shape.id === selectedShapeId);
      if (pipetteTarget && source && target && source.id !== target.id) {
        const color =
          pipetteTarget === "fill" ? (source.fill ?? source.stroke) : pipetteTarget === "stroke" ? (source.stroke ?? source.fill) : (source.textColor ?? source.fill ?? source.stroke);
        if (color) {
          storage.updateShape(
            target.id,
            pipetteTarget === "fill" ? { fill: color } : pipetteTarget === "stroke" ? { stroke: color } : { textColor: color }
          );
        }
        setPipetteTarget(null);
        return;
      }
      setSelected({ kind: "shape", id: node.id });
      setToolsOpen(true);
      return;
    }
    setPipetteTarget(null);
    setSelected({ kind: "entity", id: node.id });
    // Graphe à côté des notes : cliquer une fiche qui a déjà sa page l'ouvre directement dans la liste.
    // (Une fiche sans page n'en crée pas d'office : le panneau propose « Créer la fiche ».)
    if (compact && onOpenFiche && notes.some((note) => note.entityId === node.id)) onOpenFiche(node.id);
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

  // Plein écran : le graphe recouvre la page (et le navigateur passe en plein écran quand il le permet).
  // Échap en sort.
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) setFullscreen(false);
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [fullscreen]);

  function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    if (next) {
      void wrapRef.current?.requestFullscreen?.().catch(() => undefined);
    } else if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    // Le graphe a changé de taille : on le recadre une fois la mise en page appliquée.
    window.setTimeout(() => void flow?.fitView({ duration: 300, padding: 0.12 }), 160);
  }

  const selectedEntity = selected?.kind === "entity" ? entities.find((e) => e.id === selected.id) : null;
  const selectedRelation = selected?.kind === "relation" ? relations.find((r) => r.id === selected.id) : null;
  const selectedShape = selected?.kind === "shape" ? (shapes.find((s) => s.id === selected.id) ?? null) : null;

  // Boîte à outils : ajouter une forme au centre de la vue, la régler, la ranger, la supprimer.
  function addShape(kind: ShapeKind) {
    const rect = canvasRef.current?.getBoundingClientRect();
    const center =
      flow && rect
        ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        : { x: 0, y: 0 };
    const created = storage.addShape(newShape(kind, dossierId, center, frontZ(shapes)));
    setSelected({ kind: "shape", id: created.id });
  }
  // Images posées directement dans le graphe (bouton, ou glisser-déposer d'un fichier PNG / JPEG) : chacune devient une
  // fiche de type « Image », avec contour, points de liaison, titre, description et pays comme une entité.
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  async function addImageEntities(files: File[], at?: { x: number; y: number }) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setImageError(null);
    const rect = canvasRef.current?.getBoundingClientRect();
    const origin =
      at ??
      (flow && rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 0, y: 0 });
    let firstId: string | null = null;
    try {
      for (const [index, file] of images.entries()) {
        const imageId = await putImage(await prepareImage(file, NOTE_IMAGE_MAX_SIDE, NOTE_IMAGE_QUALITY));
        const created = storage.addEntity({
          dossierId,
          type: "image",
          name: file.name.replace(/\.[^.]+$/, "").trim() || "Image",
          aliases: [],
          notes: "",
          imageId,
          // La carte est posée autour du point visé (centre de la vue ou point de dépôt), les suivantes en cascade.
          position: { x: Math.round(origin.x - 140 + index * 40), y: Math.round(origin.y - 120 + index * 40) },
        });
        firstId ??= created.id;
      }
    } catch (error) {
      setImageError(error instanceof ImageFileError ? error.message : "Impossible d'importer cette image.");
    }
    // La première image s'ouvre en modification : titre, description, pays.
    if (firstId) {
      setSelected({ kind: "entity", id: firstId });
      setEditingEntityId(firstId);
    }
  }
  function changeSelectedShape(patch: Partial<GraphShape>) {
    if (selectedShape) storage.updateShape(selectedShape.id, patch);
  }
  function layerSelectedShape(operation: LayerOperation) {
    if (selectedShape) storage.setShapeLayers(reorderShape(shapes, selectedShape.id, operation));
  }
  function duplicateSelectedShape() {
    if (!selectedShape) return;
    const { id: _id, createdAt: _createdAt, ...copy } = selectedShape;
    void _id;
    void _createdAt;
    const created = storage.addShape({
      ...copy,
      position: { x: selectedShape.position.x + 28, y: selectedShape.position.y + 28 },
      z: frontZ(shapes),
      locked: false,
    });
    setSelected({ kind: "shape", id: created.id });
  }
  const deleteSelectedShape = useCallback(() => {
    if (!selectedShape || selectedShape.locked) return;
    storage.deleteShape(selectedShape.id);
    setSelected(null);
  }, [selectedShape, storage]);
  const updateShapeFromNode = useCallback(
    (id: string, patch: Partial<GraphShape>) => storage.updateShape(id, patch),
    [storage]
  );

  // Suppr / Retour arrière efface la forme sélectionnée (hors saisie de texte).
  useEffect(() => {
    if (!selectedShape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      event.preventDefault();
      deleteSelectedShape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedShape, deleteSelectedShape]);

  const activeAnchors = useMemo<Record<string, AnchorId[]>>(() => {
    const map: Record<string, AnchorId[]> = {};
    if (!selectedRelation) return map;
    if (selectedRelation.sourceAnchor) map[selectedRelation.sourceEntityId] = [selectedRelation.sourceAnchor];
    if (selectedRelation.targetAnchor) {
      map[selectedRelation.targetEntityId] = [...(map[selectedRelation.targetEntityId] ?? []), selectedRelation.targetAnchor];
    }
    return map;
  }, [selectedRelation]);

  // Forme commune de tous les traits (vide = mélange) ; la changer l'applique à toutes les relations.
  const commonLineStyle: LineStyle | "" = (() => {
    if (relations.length === 0) return "straight";
    const first = relations[0].lineStyle ?? "straight";
    return relations.every((relation) => (relation.lineStyle ?? "straight") === first) ? first : "";
  })();
  function setAllLineStyles(lineStyle: LineStyle) {
    for (const relation of relations) {
      if ((relation.lineStyle ?? "straight") !== lineStyle) storage.updateRelation(relation.id, { lineStyle });
    }
  }

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
  // Fiches sélectionnées dans le graphe (au moins deux : cadre de sélection ou Maj+clic).
  const selectedEntityIds = nodes.filter((node) => node.type === "entityCard" && node.selected).map((node) => node.id);
  const organizeScope = selectedEntityIds.length >= 2 ? new Set(selectedEntityIds) : null;

  function organize() {
    if (!flow || entities.length === 0) return;
    const measured = new Map(flow.getNodes().map((n) => [n.id, n.measured]));
    // Avec une sélection, seules ces fiches sont rangées ; le reste du graphe ne bouge pas.
    const nodes = entities.filter((entity) => !entityHidden(hiddenKinds, entity.type) && (!organizeScope || organizeScope.has(entity.id))).map((entity) => ({
      id: entity.id,
      x: entity.position.x,
      y: entity.position.y,
      width: measured.get(entity.id)?.width ?? 340,
      height: measured.get(entity.id)?.height ?? 120,
      pinned: entity.pinned || entity.locked,
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
    // Les fiches hors de la sélection gardent leur place.
    for (const entity of entities) if (!(entity.id in positions)) positions[entity.id] = entity.position;
    setLayoutUndo(Object.fromEntries(entities.map((entity) => [entity.id, entity.position])));
    storage.setEntityPositions(positions);
    if (!organizeScope) window.setTimeout(() => void flow.fitView({ duration: 500, padding: 0.15 }), 80);
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
      labelInverse: values.labelInverse || undefined,
      label: values.label,
      status: values.status,
      confidence: values.confidence,
      justifyingSourceId: values.justifyingSourceId,
      sourceAnchor: values.sourceAnchor,
      targetAnchor: values.targetAnchor,
      lineStyle: values.lineStyle,
      period: values.period || undefined,
    };
  }

  // Replier / déplier les coordonnées d'une fiche, ou de toutes à la fois.
  const toggleAttributes = useCallback(
    (entityId: string, collapsed: boolean) => storage.updateEntity(entityId, { attributesCollapsed: collapsed }),
    [storage],
  );
  const resizeImage = useCallback((entityId: string, width: number) => storage.updateEntity(entityId, { imageWidth: width }), [storage]);
  const toggleLock = useCallback(
    (entityId: string, locked: boolean) => storage.updateEntity(entityId, { locked }),
    [storage],
  );
  const withAttributes = entities.filter((entity) => (entity.attributes?.length ?? 0) > 0);
  const anyExpanded = withAttributes.some((entity) => entity.attributesCollapsed !== true);
  function setAllAttributes(collapsed: boolean) {
    for (const entity of withAttributes) {
      if ((entity.attributesCollapsed === true) !== collapsed) toggleAttributes(entity.id, collapsed);
    }
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
    <div
      ref={wrapRef}
      className={[styles.wrap, compact ? styles.wrapCompact : "", fullscreen ? styles.wrapFullscreen : ""].filter(Boolean).join(" ")}
    >
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolbarBtn} onClick={() => setShowEntityForm((v) => !v)}>
          + Ajouter une entité
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => imageInput.current?.click()}
          title="Poser une image (PNG, JPEG) dans le graphe : elle devient une fiche avec contour, points de liaison, titre, description et pays"
        >
          + Ajouter une image
        </button>
        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addImageEntities(files);
          }}
        />
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
        {withAttributes.length > 0 ? (
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => setAllAttributes(anyExpanded)}
            title="Masque ou affiche les coordonnées (sites web, e-mails, comptes…) sous toutes les fiches ; chaque fiche a aussi son propre bouton"
          >
            {anyExpanded ? "Replier les coordonnées" : "Déplier les coordonnées"}
          </button>
        ) : null}
        {entities.length > 1 ? (
          <>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={organize}
              title={
                organizeScope
                  ? "Range seulement les fiches sélectionnées ; les autres ne bougent pas"
                  : "Range toutes les fiches en arbre selon les relations hiérarchiques ; les fiches épinglées ne bougent pas. Astuce : sélectionne quelques fiches (cadre de sélection ou Maj+clic) pour ne ranger qu'elles. Retour annule."
              }
            >
              {organizeScope ? `Organiser la sélection (${organizeScope.size})` : "Organiser"}
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
        {relations.length > 0 ? (
          <label className={styles.toolbarSelect} title="Forme de tous les traits ; chaque relation peut aussi avoir la sienne (clic sur le trait)">
            <span>Traits</span>
            <select
              className={styles.layoutSelect}
              value={commonLineStyle}
              onChange={(e) => e.target.value && setAllLineStyles(e.target.value as LineStyle)}
              aria-label="Forme de tous les traits"
            >
              {commonLineStyle === "" ? <option value="">mélangés</option> : null}
              {LINE_STYLES.map((style) => (
                <option key={style} value={style}>
                  {LINE_STYLE_LABELS[style].toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className={fullscreen ? `${styles.toolbarBtn} ${styles.toolbarBtnOn}` : styles.toolbarBtn}
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          title={fullscreen ? "Quitter le plein écran (Échap)" : "Agrandir le graphe sur tout l'écran"}
        >
          {fullscreen ? "⤫ Quitter le plein écran" : "⛶ Plein écran"}
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => stepHistory("undo")}
          disabled={historySize.undo === 0}
          title="Annuler la dernière modification du graphe (Ctrl+Z)"
        >
          ↶ Retour
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => stepHistory("redo")}
          disabled={historySize.redo === 0}
          title="Rétablir la modification annulée (Ctrl+Y)"
        >
          ↷ Rétablir
        </button>
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

      {imageError ? (
        <div className={styles.notice} role="alert">
          <span>{imageError}</span>
          <button type="button" className={styles.noticeBtn} onClick={() => setImageError(null)} aria-label="Fermer">
            ×
          </button>
        </div>
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
          <div
            ref={canvasRef}
            className={compact ? `${styles.canvasWrap} ${styles.canvasCompact}` : styles.canvasWrap}
            onDragOver={(event) => {
              if ([...event.dataTransfer.items].some((item) => item.kind === "file")) event.preventDefault();
            }}
            onDrop={(event) => {
              const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
              if (files.length === 0) return;
              event.preventDefault();
              void addImageEntities(files, flow ? flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }) : undefined);
            }}
          >
            <OpenAttributeContext.Provider value={onOpenAttribute}>
            <ToggleAttributesContext.Provider value={toggleAttributes}>
            <ResizeImageContext.Provider value={resizeImage}>
            <ToggleLockContext.Provider value={toggleLock}>
            <ActiveAnchorsContext.Provider value={activeAnchors}>
            <ShapeActionsContext.Provider value={updateShapeFromNode}>
            <ReactFlow
              nodes={shownNodes}
              edges={shownEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={() => {
                setSelected(null);
                setPipetteTarget(null);
              }}
              elevateNodesOnSelect={false}
              deleteKeyCode={null}
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
              <Panel position="top-left" className={styles.toolsPanel}>
                <button
                  type="button"
                  className={toolsOpen ? `${styles.toolsToggle} ${styles.toolsToggleOn}` : styles.toolsToggle}
                  aria-expanded={toolsOpen}
                  onClick={() => setToolsOpen((value) => !value)}
                  title="Formes, annotations, couleurs et couches"
                >
                  ✎ Outils {toolsOpen ? "▾" : "▸"}
                </button>
                {toolsOpen ? (
                  <GraphToolbox
                    selected={selectedShape}
                    onAdd={addShape}
                    onChange={changeSelectedShape}
                    onLayer={layerSelectedShape}
                    onDuplicate={duplicateSelectedShape}
                    onDelete={deleteSelectedShape}
                    pipetteTarget={pipetteTarget}
                    onPipetteTarget={setPipetteTarget}
                  />
                ) : null}
              </Panel>
              {filterList.length > 1 ? (
                <Panel position="top-right">
                  <GraphFilters
                    rows={filterList}
                    hidden={hiddenKinds}
                    onToggle={(key) => changeHiddenKinds(toggleHidden(hiddenKinds, key))}
                    onShowAll={() => changeHiddenKinds(new Set())}
                  />
                </Panel>
              ) : null}
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
            </ShapeActionsContext.Provider>
            </ActiveAnchorsContext.Provider>
            </ToggleLockContext.Provider>
            </ResizeImageContext.Provider>
            </ToggleAttributesContext.Provider>
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
                  onToggleLock={() => storage.updateEntity(selectedEntity.id, { locked: selectedEntity.locked !== true })}
                  onChangeBorderColor={(color) => storage.updateEntity(selectedEntity.id, { borderColor: color })}
                  onChangeImageWidth={(width) => storage.updateEntity(selectedEntity.id, { imageWidth: clampImageWidth(width) })}
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
                    {(() => {
                      const justifying = sources.find((s) => s.id === selectedRelation.justifyingSourceId);
                      return justifying ? <SourceReference source={justifying} /> : <span className={styles.detailValue}>Aucune (à ajouter depuis la fiche, section Relations)</span>;
                    })()}
                  </div>
                  <ColorChoice
                    label="Couleur du trait"
                    value={selectedRelation.lineColor}
                    onChange={(color) => storage.updateRelation(selectedRelation.id, { lineColor: color })}
                  />
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Tracé du trait</span>
                    <RelationRouting
                      value={{
                        sourceAnchor: selectedRelation.sourceAnchor,
                        targetAnchor: selectedRelation.targetAnchor,
                        lineStyle: selectedRelation.lineStyle,
                      }}
                      sourceName={entities.find((e) => e.id === selectedRelation.sourceEntityId)?.name}
                      targetName={entities.find((e) => e.id === selectedRelation.targetEntityId)?.name}
                      onChange={(patch) => storage.updateRelation(selectedRelation.id, patch)}
                    />
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
