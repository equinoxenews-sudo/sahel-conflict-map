"use client";

import { useState } from "react";
import { formatFileSize, openFile } from "@/lib/investigation/fileStore";
import type { SourceFile } from "@/lib/investigation/types";
import styles from "./SourceFileChip.module.css";

interface SourceFileChipProps {
  file: SourceFile;
  /** Présent : un bouton × permet de retirer le document de la source. */
  onRemove?: () => void;
}

// Document-preuve d'une source : un bouton qui l'ouvre dans un nouvel onglet (PDF et images s'affichent
// directement). Le fichier est dans IndexedDB : sur un autre navigateur, il peut être absent.
export default function SourceFileChip({ file, onRemove }: SourceFileChipProps) {
  const [missing, setMissing] = useState(false);

  async function open() {
    const opened = await openFile(file.id).catch(() => false);
    setMissing(!opened);
  }

  return (
    <span className={styles.wrap}>
      <span className={styles.chip}>
        <button type="button" className={styles.open} onClick={() => void open()} title="Ouvrir le document dans un nouvel onglet">
          <span className={styles.kind} aria-hidden="true">
            {file.mime === "application/pdf" ? "PDF" : "IMG"}
          </span>
          <span className={styles.name}>{file.name}</span>
          <small className={styles.size}>{formatFileSize(file.size)}</small>
        </button>
        {onRemove ? (
          <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Retirer le document ${file.name}`} title="Retirer le document">
            ×
          </button>
        ) : null}
      </span>
      {missing ? <span className={styles.missing}>Fichier absent de ce navigateur (dossier importé sans ses documents ?).</span> : null}
    </span>
  );
}
