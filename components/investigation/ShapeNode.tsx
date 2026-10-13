"use client";

import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { GraphShape } from "@/lib/investigation/types";
import styles from "./ShapeNode.module.css";

export type ShapeNodeData = { shape: GraphShape } & Record<string, unknown>;
export type ShapeFlowNode = Node<ShapeNodeData, "shape">;

/** Modifications d'une forme depuis la carte (redimensionnement, texte). Passé par un contexte pour ne
 * pas reconstruire les cartes du graphe à chaque rendu. */
export const ShapeActionsContext = createContext<((id: string, patch: Partial<GraphShape>) => void) | undefined>(undefined);

/** En dessous de cette taille, une ligne ou une flèche est horizontale (ou verticale) : pas de diagonale. */
const FLAT = 16;

function Geometry({ shape, width, height }: { shape: GraphShape; width: number; height: number }) {
  const strokeWidth = shape.stroke ? (shape.strokeWidth ?? 2) : 0;
  const half = strokeWidth / 2;
  const fill = shape.fill ?? "none";
  const common = {
    fill,
    fillOpacity: shape.fill ? (shape.fillOpacity ?? 1) : undefined,
    stroke: shape.stroke ?? "none",
    strokeWidth,
    strokeLinejoin: "round" as const,
    className: styles.paint,
  };

  switch (shape.kind) {
    case "rect":
      return <rect x={half} y={half} width={Math.max(0, width - strokeWidth)} height={Math.max(0, height - strokeWidth)} rx={3} {...common} />;
    case "roundRect":
      return <rect x={half} y={half} width={Math.max(0, width - strokeWidth)} height={Math.max(0, height - strokeWidth)} rx={Math.min(22, width / 4, height / 2)} {...common} />;
    case "ellipse":
      return <ellipse cx={width / 2} cy={height / 2} rx={Math.max(0, (width - strokeWidth) / 2)} ry={Math.max(0, (height - strokeWidth) / 2)} {...common} />;
    case "triangle":
      return <polygon points={`${width / 2},${half} ${width - half},${height - half} ${half},${height - half}`} {...common} />;
    case "diamond":
      return <polygon points={`${width / 2},${half} ${width - half},${height / 2} ${width / 2},${height - half} ${half},${height / 2}`} {...common} />;
    default:
      return null;
  }
}

function LineGeometry({ shape, width, height }: { shape: GraphShape; width: number; height: number }) {
  const stroke = shape.stroke ?? "#e0b44c";
  const strokeWidth = shape.strokeWidth ?? 2;
  const flatH = height <= FLAT;
  const flatV = !flatH && width <= FLAT;
  let x1 = 0;
  let y1 = 0;
  let x2 = width;
  let y2 = height;
  if (flatH) {
    y1 = height / 2;
    y2 = height / 2;
  } else if (flatV) {
    x1 = width / 2;
    x2 = width / 2;
  } else if (shape.flipped) {
    y1 = height;
    y2 = 0;
  }
  const markerId = `arrowhead-${shape.id}`;
  const head = 8 + strokeWidth * 2;
  return (
    <>
      {shape.kind === "arrow" ? (
        <defs>
          <marker id={markerId} markerWidth={head} markerHeight={head} refX={head - 1} refY={head / 2} orient="auto" markerUnits="userSpaceOnUse">
            <path d={`M0,0 L${head},${head / 2} L0,${head} z`} fill={stroke} />
          </marker>
        </defs>
      ) : null}
      {/* Zone de clic élargie : un trait de 2 px serait impossible à attraper. */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(14, strokeWidth + 10)} className={styles.hit} />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        markerEnd={shape.kind === "arrow" ? `url(#${markerId})` : undefined}
        className={styles.line}
      />
    </>
  );
}

// Forme ou annotation du graphe : un cadre qu'on déplace et qu'on redimensionne, rempli et contouré
// à volonté, avec un texte (double-clic pour l'écrire). Les formes pleines se saisissent par leur
// surface ; les formes creuses et les lignes seulement par leur trait, pour ne pas bloquer les fiches dessous.
export default function ShapeNode({ id, data, selected, width, height }: NodeProps<ShapeFlowNode>) {
  const { shape } = data;
  const actions = useContext(ShapeActionsContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(shape.text ?? "");
  const field = useRef<HTMLTextAreaElement>(null);
  const w = width ?? shape.width;
  const h = height ?? shape.height;
  const isLine = shape.kind === "line" || shape.kind === "arrow";
  const isText = shape.kind === "text";
  const locked = shape.locked === true;

  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== (shape.text ?? "")) actions?.(id, { text: draft });
  }

  return (
    <div className={styles.shape}>
      <NodeResizer
        isVisible={selected && !locked}
        minWidth={isLine ? 8 : 24}
        minHeight={isLine ? 8 : 20}
        color="#e0b44c"
        handleStyle={{ width: 9, height: 9, borderRadius: 2 }}
        lineStyle={{ borderWidth: 1 }}
        onResizeEnd={(_event, params) =>
          actions?.(id, {
            position: { x: Math.round(params.x), y: Math.round(params.y) },
            width: Math.round(params.width),
            height: Math.round(params.height),
          })
        }
      />

      {isText ? (
        <div
          className={styles.textBox}
          style={{ background: shape.fill ? shape.fill : "transparent", outline: shape.stroke ? `${shape.strokeWidth ?? 1}px solid ${shape.stroke}` : undefined }}
        />
      ) : (
        <svg className={styles.svg} width={w} height={h} viewBox={`0 0 ${w} ${h}`} overflow="visible">
          {isLine ? <LineGeometry shape={shape} width={w} height={h} /> : <Geometry shape={shape} width={w} height={h} />}
        </svg>
      )}

      {!isLine ? (
        <div
          className={isText ? `${styles.label} ${styles.labelText}` : styles.label}
          style={{ color: shape.textColor ?? "#ffffff", fontSize: shape.fontSize ?? 14 }}
          onDoubleClick={(event) => {
            if (locked) return;
            event.stopPropagation();
            setDraft(shape.text ?? "");
            setEditing(true);
          }}
        >
          {editing ? (
            <textarea
              ref={field}
              className={`${styles.editor} nodrag nowheel nopan`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Escape") {
                  setDraft(shape.text ?? "");
                  setEditing(false);
                }
              }}
              style={{ color: shape.textColor ?? "#ffffff", fontSize: shape.fontSize ?? 14, textAlign: isText ? "left" : "center" }}
            />
          ) : shape.text ? (
            <span className={styles.labelText2}>{shape.text}</span>
          ) : isText && selected ? (
            <span className={styles.placeholder}>Double-clic pour écrire…</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
