"use client";

import { useEffect, useRef } from "react";
import { useInvestigationData } from "@/lib/investigation/InvestigationContext";
import type { Dossier } from "@/lib/investigation/types";
import styles from "./DeleteDossierDialog.module.css";

interface DeleteDossierDialogProps {
  dossier: Dossier;
  onCancel: () => void;
  onConfirm: () => void;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

// Confirmation avant de supprimer un dossier : dit ce qui sera perdu, et le bouton « Annuler » est celui qui a le
// focus (Entrée n'efface donc rien ; Échap ferme).
export default function DeleteDossierDialog({ dossier, onCancel, onConfirm }: DeleteDossierDialogProps) {
  const data = useInvestigationData();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const counts = [
    plural(data.notes.filter((n) => n.dossierId === dossier.id).length, "note", "notes"),
    plural(data.sources.filter((s) => s.dossierId === dossier.id).length, "source", "sources"),
    plural(data.entities.filter((e) => e.dossierId === dossier.id).length, "entité", "entités"),
    plural(data.relations.filter((r) => r.dossierId === dossier.id).length, "relation", "relations"),
  ];

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-dossier-title">
        <h2 id="delete-dossier-title" className={styles.title}>
          Supprimer le dossier « {dossier.name} » ?
        </h2>
        <p className={styles.lead}>
          Tout son contenu sera effacé de cet appareil : <strong>{counts.join(", ")}</strong>, ainsi que la carte du graphe.
        </p>
        <p className={styles.warning}>Cette action est définitive. Pense à exporter le dossier avant si tu veux en garder une trace.</p>
        <div className={styles.actions}>
          <button type="button" ref={cancelRef} className={styles.cancel} onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className={styles.danger} onClick={onConfirm}>
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}
