"use client";

import type { Source } from "@/lib/investigation/types";
import SourceFileChip from "./SourceFileChip";
import styles from "./SourceReference.module.css";

interface SourceReferenceProps {
  source: Source;
  /** Présent : un lien « retirer » détache la source (sans la supprimer du dossier). */
  onRemove?: () => void;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Encart d'une source : son titre, son adresse (lien) et/ou son document (PDF, image) à ouvrir.
// Sert sous une relation, sous une fiche, dans le graphe : partout où une source justifie une information.
export default function SourceReference({ source, onRemove }: SourceReferenceProps) {
  return (
    <div className={styles.ref}>
      <span className={styles.badge}>Source</span>
      <span className={styles.body}>
        <span className={styles.title}>{source.title}</span>
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className={styles.link} title={source.url}>
            {host(source.url)} ↗
          </a>
        ) : null}
        {source.file ? <SourceFileChip file={source.file} /> : null}
        <span className={styles.meta}>
          Fiabilité {source.reliability}/5{source.publishedAt ? ` · publié le ${source.publishedAt}` : ""}
        </span>
      </span>
      {onRemove ? (
        <button type="button" className={styles.remove} onClick={onRemove}>
          retirer
        </button>
      ) : null}
    </div>
  );
}
