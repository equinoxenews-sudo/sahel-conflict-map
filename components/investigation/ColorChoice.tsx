"use client";

import { PALETTE } from "@/lib/investigation/shapes";
import styles from "./ColorChoice.module.css";

interface ColorChoiceProps {
  label: string;
  /** Couleur choisie (#rrggbb) ; absente = couleur d'origine (or). */
  value: string | undefined;
  onChange: (color: string | undefined) => void;
  disabled?: boolean;
}

// Choix d'une couleur : la palette du site, une couleur libre, ou le retour à la couleur d'origine.
// Sert au contour des fiches du graphe et au trait des relations.
export default function ColorChoice({ label, value, onChange, disabled = false }: ColorChoiceProps) {
  return (
    <fieldset className={styles.wrap} disabled={disabled}>
      <legend className={styles.label}>{label}</legend>
      <div className={styles.swatches}>
        <button
          type="button"
          className={value === undefined ? `${styles.original} ${styles.on}` : styles.original}
          onClick={() => onChange(undefined)}
          aria-pressed={value === undefined}
          title="Couleur d'origine (or)"
        >
          Défaut
        </button>
        {PALETTE.map((entry) => (
          <button
            key={entry.color}
            type="button"
            className={value?.toLowerCase() === entry.color ? `${styles.swatch} ${styles.on}` : styles.swatch}
            style={{ background: entry.color }}
            title={entry.label}
            aria-label={`${label} : ${entry.label}`}
            aria-pressed={value?.toLowerCase() === entry.color}
            onClick={() => onChange(entry.color)}
          />
        ))}
        <label className={styles.custom} title="Autre couleur">
          <input type="color" value={value ?? "#c89b3c"} onChange={(event) => onChange(event.target.value)} aria-label={`${label} : couleur libre`} />
        </label>
      </div>
    </fieldset>
  );
}
