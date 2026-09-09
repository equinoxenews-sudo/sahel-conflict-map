"use client";

import { useEffect, useState } from "react";
import type { ZoneDocument } from "@/lib/zoneDocuments";
import styles from "./DocumentGrid.module.css";

interface DocumentGridProps {
  documents: ZoneDocument[];
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`;
}

export default function DocumentGrid({ documents }: DocumentGridProps) {
  const [active, setActive] = useState<ZoneDocument | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Aucun document disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {documents.map((doc) => (
          <button key={doc.name} type="button" className={styles.card} onClick={() => setActive(doc)}>
            <span className={styles.icon}>PDF</span>
            <span className={styles.name}>{doc.name}</span>
            {doc.size != null ? <span className={styles.size}>{formatSize(doc.size)}</span> : null}
          </button>
        ))}
      </div>

      {active ? (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{active.name}</span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActive(null)}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <iframe
              key={active.url}
              src={`${active.url}#toolbar=0&navpanes=0`}
              title={active.name}
              className={styles.iframe}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
