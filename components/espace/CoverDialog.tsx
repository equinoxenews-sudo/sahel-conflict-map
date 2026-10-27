"use client";

import { useEffect } from "react";
import type { Dossier } from "@/lib/investigation/types";
import styles from "./DeleteDossierDialog.module.css";

interface CoverDialogProps {
  dossier: Dossier;
  onCancel: () => void;
  onChange: () => void;
  onRemove: () => void;
}

// « Modifier la photo de couverture » : propose de la changer ou de la retirer. Reprend l'habillage de la fenêtre de
// suppression d'un dossier (DeleteDossierDialog).
export default function CoverDialog({ dossier, onCancel, onChange, onRemove }: CoverDialogProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="cover-dialog-title">
        <h2 id="cover-dialog-title" className={styles.title}>
          Modifier la photo de couverture
        </h2>
        <p className={styles.lead}>
          Dossier « {dossier.name} ». Retirer la photo ne touche ni aux notes ni au graphe : tu pourras en remettre une à tout moment.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.plain} onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className={styles.danger} onClick={onRemove}>
            Retirer la photo
          </button>
          <button type="button" className={styles.cancel} onClick={onChange} autoFocus>
            Changer la photo
          </button>
        </div>
      </div>
    </div>
  );
}
