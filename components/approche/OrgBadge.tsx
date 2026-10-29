"use client";

import { useRef } from "react";
import type { MetricView } from "@/lib/approche/view";
import Icon from "./Icon";
import MetricDrawerBody from "./MetricDrawerBody";
import styles from "./Approche.module.css";

// Badge d'appartenance à une organisation (UE, OTAN, ONU…) : affiché seulement si le statut est vérifié ; un clic ouvre le statut
// exact, ses dates, sa méthode et ses sources. Pas d'emblème : seul le nom, tant que la licence d'un logo n'est pas établie.
export default function OrgBadge({ label, metric }: { label: string; metric: MetricView }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={styles.orgBadge} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`${label} : voir le statut et les sources`}>
        <Icon name="shieldCheck" size={14} />
        {label}
      </button>
      <dialog ref={dialog} className={styles.drawer} aria-label={label} onClick={(event) => (event.target === dialog.current ? dialog.current?.close() : undefined)}>
        <div className={styles.drawerBody}>
          <header className={styles.drawerHead}>
            <h3>{label}</h3>
            <button type="button" className={styles.drawerClose} onClick={() => dialog.current?.close()} aria-label="Fermer">
              ×
            </button>
          </header>
          <MetricDrawerBody metric={metric} />
        </div>
      </dialog>
    </>
  );
}
