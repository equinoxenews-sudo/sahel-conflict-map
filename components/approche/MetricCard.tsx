"use client";

import { useRef } from "react";
import { iconForMetric } from "@/lib/approche/metricIcons";
import type { MetricView } from "@/lib/approche/view";
import Icon from "./Icon";
import MetricDrawerBody from "./MetricDrawerBody";
import Sparkline from "./Sparkline";
import styles from "./Approche.module.css";

interface MetricCardProps {
  label: string;
  metric: MetricView | null;
  /** Texte quand la donnée manque : « Donnée non disponible » par défaut. */
  missing?: string;
  /** Explication courte de l'absence, en infobulle et en petit à côté du texte (ex. pourquoi une valeur n'est pas calculée). */
  missingHint?: string;
  /** Mise en page : tuile de chiffre clé (par défaut) ou ligne d'un tableau. */
  variant?: "tile" | "row";
  /** Valeur à afficher à la place de celle de l'observation (ex. une phrase d'appartenance). */
  display?: string;
  /** Pictogramme ; par défaut déduit de la nature de la valeur. */
  icon?: string;
}

// Un chiffre ou un fait, avec le tiroir de provenance qui s'ouvre au clic : valeur, unité, période, périmètre, méthode,
// source(s) avec adresse exacte, licence, date de consultation et autres mesures du même sujet.
export default function MetricCard({ label, metric, missing = "Donnée non disponible", missingHint, variant = "tile", display, icon }: MetricCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = `metric-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const iconName = icon ?? iconForMetric(metric?.key ?? label);

  if (!metric) {
    return (
      <div className={variant === "tile" ? `${styles.tile} ${styles.tileMissing}` : `${styles.row} ${styles.rowMissing}`}>
        <span className={styles.tileLabel}>
          <Icon name={iconName} size={15} />
          {label}
        </span>
        <span className={styles.missing} title={missingHint}>
          {missing}
          {missingHint ? <small className={styles.missingHint}> · {missingHint}</small> : null}
        </span>
      </div>
    );
  }

  const shown = display ?? metric.value;
  return (
    <>
      <button type="button" className={variant === "tile" ? styles.tile : styles.row} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`${label} : ${shown} ${metric.unit}, voir les sources`}>
        <span className={styles.tileLabel}>
          <Icon name={iconName} size={15} />
          {label}
        </span>
        <span className={styles.tileValue}>
          {shown}
          {metric.unit ? <small> {metric.unit}</small> : null}
        </span>
        <span className={styles.tileMeta}>
          <span className={styles.period}>{metric.period}</span>
          <span className={styles.spark}>
            <Sparkline series={metric.series} label={label} />
          </span>
          <span className={styles.sourceHint} aria-hidden>
            Sources ›
          </span>
        </span>
      </button>

      <dialog ref={dialog} className={styles.drawer} aria-labelledby={`${id}-title`} onClick={(event) => (event.target === dialog.current ? dialog.current?.close() : undefined)}>
        <div className={styles.drawerBody}>
          <header className={styles.drawerHead}>
            <h3 id={`${id}-title`}>{label}</h3>
            <button type="button" className={styles.drawerClose} onClick={() => dialog.current?.close()} aria-label="Fermer">
              ×
            </button>
          </header>
          <MetricDrawerBody metric={metric} shown={shown} />
        </div>
      </dialog>
    </>
  );
}
