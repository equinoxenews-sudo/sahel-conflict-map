"use client";

import { ANCHOR_DIAGRAM, ANCHOR_IDS, ANCHOR_LABELS, LINE_STYLES, LINE_STYLE_LABELS } from "@/lib/investigation/anchors";
import type { AnchorId, LineStyle } from "@/lib/investigation/types";
import styles from "./RelationRouting.module.css";

export interface RoutingValue {
  sourceAnchor?: AnchorId;
  targetAnchor?: AnchorId;
  lineStyle?: LineStyle;
}

interface RelationRoutingProps {
  value: RoutingValue;
  sourceName?: string;
  targetName?: string;
  onChange: (patch: RoutingValue) => void;
}

function AnchorPicker({
  title,
  value,
  onChange,
}: {
  title: string;
  value: AnchorId | undefined;
  onChange: (anchor: AnchorId | undefined) => void;
}) {
  return (
    <div className={styles.picker}>
      <span className={styles.pickerTitle} title={title}>
        {title}
      </span>
      <div className={styles.diagram}>
        {ANCHOR_IDS.map((anchor) => (
          <button
            key={anchor}
            type="button"
            className={value === anchor ? `${styles.dot} ${styles.dotOn}` : styles.dot}
            style={{ left: `${ANCHOR_DIAGRAM[anchor].x}%`, top: `${ANCHOR_DIAGRAM[anchor].y}%` }}
            aria-label={ANCHOR_LABELS[anchor]}
            aria-pressed={value === anchor}
            title={ANCHOR_LABELS[anchor]}
            onClick={() => onChange(anchor)}
          />
        ))}
      </div>
      <button
        type="button"
        className={value === undefined ? `${styles.auto} ${styles.autoOn}` : styles.auto}
        aria-pressed={value === undefined}
        title="Le trait choisit lui-même les côtés qui se font face"
        onClick={() => onChange(undefined)}
      >
        Auto
      </button>
    </div>
  );
}

function StyleIcon({ style }: { style: LineStyle }) {
  const common = { width: 34, height: 18, viewBox: "0 0 34 18", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (style === "straight") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 15 31 3" />
      </svg>
    );
  }
  if (style === "curve") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 15C14 15 20 3 31 3" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M3 15H17V3H31" />
    </svg>
  );
}

// Départ, arrivée et forme du trait d'une relation, comme les connecteurs de PowerPoint :
// huit points d'ancrage par fiche (coins et milieux des côtés), trait droit, courbe ou coudé.
export default function RelationRouting({ value, sourceName, targetName, onChange }: RelationRoutingProps) {
  const lineStyle: LineStyle = value.lineStyle ?? "straight";
  return (
    <div className={styles.routing}>
      <div className={styles.pickers}>
        <AnchorPicker
          title={sourceName ? `Départ · ${sourceName}` : "Départ (source)"}
          value={value.sourceAnchor}
          onChange={(sourceAnchor) => onChange({ sourceAnchor })}
        />
        <AnchorPicker
          title={targetName ? `Arrivée · ${targetName}` : "Arrivée (cible)"}
          value={value.targetAnchor}
          onChange={(targetAnchor) => onChange({ targetAnchor })}
        />
      </div>
      <div className={styles.styles} role="group" aria-label="Forme du trait">
        {LINE_STYLES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={lineStyle === candidate ? `${styles.styleBtn} ${styles.styleBtnOn}` : styles.styleBtn}
            aria-pressed={lineStyle === candidate}
            onClick={() => onChange({ lineStyle: candidate })}
          >
            <StyleIcon style={candidate} />
            <span>{LINE_STYLE_LABELS[candidate]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
