"use client";

import { useState } from "react";
import { type FilterKey, type FilterRow, SHAPES_FILTER } from "@/lib/investigation/graphFilter";
import { ENTITY_TYPE_LABELS } from "@/lib/investigation/types";
import styles from "./GraphFilters.module.css";

interface GraphFiltersProps {
  rows: FilterRow[];
  hidden: Set<FilterKey>;
  onToggle: (key: FilterKey) => void;
  onShowAll: () => void;
}

const labelOf = (key: FilterKey) => (key === SHAPES_FILTER ? "Formes et textes" : ENTITY_TYPE_LABELS[key]);

// Couches du graphe : une case par catégorie. Décocher masque la catégorie sans rien déplacer.
export default function GraphFilters({ rows, hidden, onToggle, onShowAll }: GraphFiltersProps) {
  const [open, setOpen] = useState(false);
  const hiddenCount = rows.filter((row) => hidden.has(row.key)).length;

  return (
    <div className={styles.wrap} onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={hiddenCount > 0 ? `${styles.toggle} ${styles.toggleActive}` : styles.toggle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Afficher ou masquer des catégories de fiches, sans toucher à la mise en forme"
      >
        ☰ Couches{hiddenCount > 0 ? ` · ${hiddenCount} masquée${hiddenCount > 1 ? "s" : ""}` : ""} {open ? "▾" : "▸"}
      </button>
      {open ? (
        <div className={styles.panel} role="group" aria-label="Catégories affichées">
          {rows.map((row) => (
            <label key={row.key} className={styles.row}>
              <input type="checkbox" checked={!hidden.has(row.key)} onChange={() => onToggle(row.key)} />
              <span className={styles.name}>{labelOf(row.key)}</span>
              <span className={styles.count}>{row.count}</span>
            </label>
          ))}
          {hiddenCount > 0 ? (
            <button type="button" className={styles.showAll} onClick={onShowAll}>
              Tout afficher
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
