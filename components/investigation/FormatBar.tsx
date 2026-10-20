"use client";

import { useState } from "react";
import { TEXT_COLORS, type FormatKind } from "@/lib/investigation/textFormat";
import styles from "./FormatBar.module.css";

interface FormatBarProps {
  /** Vrai quand un passage est sélectionné dans le texte. */
  hasSelection: boolean;
  onFormat: (kind: FormatKind, color?: string) => void;
}

// Barre de mise en forme du texte d'une fiche : elle agit sur le passage sélectionné (gras, italique,
// surligné, couleur, effacer). Les boutons ne prennent pas le focus : la sélection du texte reste en place.
export default function FormatBar({ hasSelection, onFormat }: FormatBarProps) {
  const [colorsOpen, setColorsOpen] = useState(false);
  const keep = (event: React.MouseEvent) => event.preventDefault();
  const hint = hasSelection ? "" : " (sélectionne d'abord un passage)";

  return (
    <div className={styles.bar} role="toolbar" aria-label="Mise en forme du texte" onMouseDown={keep}>
      <button type="button" className={styles.btn} disabled={!hasSelection} title={`Gras (Ctrl+B)${hint}`} onClick={() => onFormat("bold")}>
        <strong>G</strong>
      </button>
      <button type="button" className={styles.btn} disabled={!hasSelection} title={`Italique (Ctrl+I)${hint}`} onClick={() => onFormat("italic")}>
        <em>I</em>
      </button>
      <button type="button" className={styles.btn} disabled={!hasSelection} title={`Surligner${hint}`} onClick={() => onFormat("mark")}>
        <span className={styles.markSample}>Surligné</span>
      </button>
      <span className={styles.colorWrap}>
        <button
          type="button"
          className={styles.btn}
          disabled={!hasSelection}
          aria-expanded={colorsOpen}
          title={`Couleur du texte${hint}`}
          onClick={() => setColorsOpen((value) => !value)}
        >
          <span className={styles.colorA}>A</span> ▾
        </button>
        {colorsOpen ? (
          <span className={styles.palette} role="group" aria-label="Couleur du texte">
            {TEXT_COLORS.map((entry) => (
              <button
                key={entry.color}
                type="button"
                className={styles.swatch}
                style={{ background: entry.color }}
                title={entry.label}
                aria-label={`Texte ${entry.label.toLowerCase()}`}
                onClick={() => {
                  onFormat("color", entry.color);
                  setColorsOpen(false);
                }}
              />
            ))}
          </span>
        ) : null}
      </span>
      <button type="button" className={styles.btn} disabled={!hasSelection} title={`Effacer la mise en forme du passage${hint}`} onClick={() => onFormat("clear")}>
        Effacer
      </button>
    </div>
  );
}
