"use client";

import { useRef, type ReactNode } from "react";
import styles from "./Approche.module.css";

interface DetailProps {
  /** Contenu du bouton qui ouvre le détail. */
  trigger: ReactNode;
  /** Titre de la fenêtre (et nom accessible du bouton). */
  title: string;
  className?: string;
  /** Contenu du détail, rendu côté serveur. */
  children: ReactNode;
}

// Bouton + fenêtre de détail réutilisables (dossier, équipement, scénario, ligne de SWOT…). La fenêtre est un <dialog> natif :
// Échap la ferme, le focus y est piégé, un clic à l'extérieur la ferme.
export default function Detail({ trigger, title, className, children }: DetailProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className ?? styles.itemButton} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`${title} : voir le détail`}>
        {trigger}
      </button>
      <dialog ref={dialog} className={styles.drawer} aria-label={title} onClick={(event) => (event.target === dialog.current ? dialog.current?.close() : undefined)}>
        <div className={styles.drawerBody}>
          <header className={styles.drawerHead}>
            <h3>{title}</h3>
            <button type="button" className={styles.drawerClose} onClick={() => dialog.current?.close()} aria-label="Fermer">
              ×
            </button>
          </header>
          {children}
        </div>
      </dialog>
    </>
  );
}
