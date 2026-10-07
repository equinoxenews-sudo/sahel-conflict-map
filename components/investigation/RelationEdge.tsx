"use client";

import { BaseEdge, getBezierPath, getStraightPath, useInternalNode, type Edge, type EdgeProps } from "@xyflow/react";

export type RelationEdgeData = { curved?: boolean } & Record<string, unknown>;
export type RelationFlowEdge = Edge<RelationEdgeData, "relation">;

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Part (de 0 à 1) du segment [from → to] qui reste dans `box`, `from` étant à l'intérieur. */
function exitFraction(from: { x: number; y: number }, to: { x: number; y: number }, box: Box): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const tx = dx === 0 ? Infinity : ((dx > 0 ? box.maxX : box.minX) - from.x) / dx;
  const ty = dy === 0 ? Infinity : ((dy > 0 ? box.maxY : box.minY) - from.y) / dy;
  return Math.max(0, Math.min(tx, ty, 1));
}

function boxOf(node: ReturnType<typeof useInternalNode>): Box | null {
  const width = node?.measured.width;
  const height = node?.measured.height;
  if (!node || !width || !height) return null;
  const { x, y } = node.internals.positionAbsolute;
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

// Trait d'une relation. Les traits partent du centre des pastilles ; le libellé, lui,
// se place au milieu de la partie VISIBLE du trait (entre les deux cartes) : au milieu
// des centres, il se retrouverait caché sous une carte large.
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

  let path: string;
  let labelX: number;
  let labelY: number;

  if (data?.curved) {
    [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  } else {
    [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    const from = { x: sourceX, y: sourceY };
    const to = { x: targetX, y: targetY };
    const sourceBox = boxOf(sourceNode);
    const targetBox = boxOf(targetNode);
    const leaves = sourceBox ? exitFraction(from, to, sourceBox) : 0;
    const enters = targetBox ? 1 - exitFraction(to, from, targetBox) : 1;
    // Les cartes se touchent ou se chevauchent : à défaut de partie visible, le milieu des centres.
    const t = enters > leaves ? (leaves + enters) / 2 : 0.5;
    labelX = from.x + (to.x - from.x) * t;
    labelY = from.y + (to.y - from.y) * t;
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
