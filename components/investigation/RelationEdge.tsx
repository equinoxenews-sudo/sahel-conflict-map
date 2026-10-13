"use client";

import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
  useInternalNode,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { autoAnchors, isAnchorId, isLineStyle, sideOf, type AnchorSide, type Rect } from "@/lib/investigation/anchors";
import type { AnchorId, LineStyle } from "@/lib/investigation/types";

export type RelationEdgeData = { lineStyle?: LineStyle; sourceAnchor?: AnchorId; targetAnchor?: AnchorId } & Record<string, unknown>;
export type RelationFlowEdge = Edge<RelationEdgeData, "relation">;

const POSITIONS: Record<AnchorSide, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

type FlowNode = ReturnType<typeof useInternalNode>;
type Point = { x: number; y: number };

/** Position (dans le graphe) d'un point d'ancrage d'une fiche, d'après les poignées mesurées. */
function anchorPoint(node: FlowNode, type: "source" | "target", anchor: AnchorId): Point | null {
  const handle = node?.internals.handleBounds?.[type]?.find((candidate) => candidate.id === anchor);
  if (!node || !handle) return null;
  const { x, y } = node.internals.positionAbsolute;
  return { x: x + handle.x + handle.width / 2, y: y + handle.y + handle.height / 2 };
}

/** Rectangle de la carte principale (pastille et cadre, sans les coordonnées dessous). */
function headRect(node: FlowNode, type: "source" | "target"): Rect | null {
  const topLeft = anchorPoint(node, type, "tl");
  const bottomRight = anchorPoint(node, type, "br");
  const left = anchorPoint(node, type, "ml");
  if (!topLeft || !bottomRight) return null;
  const x = Math.min(topLeft.x, left?.x ?? topLeft.x);
  return { x, y: topLeft.y, width: bottomRight.x - x, height: bottomRight.y - topLeft.y };
}

/** Part (de 0 à 1) du segment [from → to] qui reste dans `rect`, `from` étant dedans ou sur son bord. */
function exitFraction(from: Point, to: Point, rect: Rect): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const tx = dx === 0 ? Infinity : ((dx > 0 ? rect.x + rect.width : rect.x) - from.x) / dx;
  const ty = dy === 0 ? Infinity : ((dy > 0 ? rect.y + rect.height : rect.y) - from.y) / dy;
  return Math.max(0, Math.min(tx, ty, 1));
}

// Trait d'une relation. Il part d'un point d'ancrage de la fiche source et arrive à un point
// d'ancrage de la fiche cible : ceux choisis pour la relation, sinon les côtés qui se font face.
// Trois formes : droit (par défaut), courbe, coude. Le libellé se place sur la partie VISIBLE du
// trait droit (entre les deux cartes) : au milieu des centres, il serait caché sous une carte.
export default function RelationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  style,
  data,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth,
}: EdgeProps<RelationFlowEdge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const sourceRect = headRect(sourceNode, "source");
  const targetRect = headRect(targetNode, "target");
  const auto = sourceRect && targetRect ? autoAnchors(sourceRect, targetRect) : null;
  const sourceAnchor: AnchorId = isAnchorId(data?.sourceAnchor) ? data.sourceAnchor : (auto?.source ?? "mr");
  const targetAnchor: AnchorId = isAnchorId(data?.targetAnchor) ? data.targetAnchor : (auto?.target ?? "ml");
  const from = anchorPoint(sourceNode, "source", sourceAnchor) ?? { x: sourceX, y: sourceY };
  const to = anchorPoint(targetNode, "target", targetAnchor) ?? { x: targetX, y: targetY };
  const lineStyle: LineStyle = isLineStyle(data?.lineStyle) ? data.lineStyle : "straight";

  let path: string;
  let labelX: number;
  let labelY: number;

  if (lineStyle === "straight") {
    [path] = getStraightPath({ sourceX: from.x, sourceY: from.y, targetX: to.x, targetY: to.y });
    const leaves = sourceRect ? exitFraction(from, to, sourceRect) : 0;
    const enters = targetRect ? 1 - exitFraction(to, from, targetRect) : 1;
    // Les cartes se touchent ou se chevauchent : à défaut de partie visible, le milieu du trait.
    const t = enters > leaves ? (leaves + enters) / 2 : 0.5;
    labelX = from.x + (to.x - from.x) * t;
    labelY = from.y + (to.y - from.y) * t;
  } else {
    const params = {
      sourceX: from.x,
      sourceY: from.y,
      sourcePosition: POSITIONS[sideOf(sourceAnchor)],
      targetX: to.x,
      targetY: to.y,
      targetPosition: POSITIONS[sideOf(targetAnchor)],
    };
    [path, labelX, labelY] = lineStyle === "curve" ? getBezierPath(params) : getSmoothStepPath({ ...params, borderRadius: 6, offset: 22 });
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      interactionWidth={interactionWidth}
    />
  );
}
