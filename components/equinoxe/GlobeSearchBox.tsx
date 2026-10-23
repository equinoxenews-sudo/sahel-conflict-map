"use client";

import { openSearch } from "@/lib/searchUi";
import styles from "./GlobeSearchBox.module.css";

// Barre du globe : ouvre la recherche globale (components/search/SearchDialog.tsx).
export default function GlobeSearchBox() {
  return (
    <button type="button" className={styles.box} aria-label="Rechercher" onClick={() => openSearch()}>
      <span className={styles.icon} aria-hidden>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <span className={styles.placeholder}>Rechercher un pays, une actualité, une analyse, une entité…</span>
      <span className={styles.shortcut}>/</span>
    </button>
  );
}
