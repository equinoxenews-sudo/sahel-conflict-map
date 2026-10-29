"use client";

import { useRef } from "react";
import type { MetricView } from "@/lib/approche/view";
import Sparkline from "./Sparkline";
import styles from "./Approche.module.css";

interface MetricCardProps {
  label: string;
  metric: MetricView | null;
  /** Texte quand la donnée manque : « Donnée non disponible » par défaut. */
  missing?: string;
  /** Mise en page : tuile de chiffre clé (par défaut) ou ligne d'un tableau. */
  variant?: "tile" | "row";
  /** Valeur à afficher à la place de celle de l'observation (ex. une phrase d'appartenance). */
  display?: string;
}

// Un chiffre ou un fait, avec le tiroir de provenance qui s'ouvre au clic : valeur, unité, période, périmètre, méthode,
// source(s) avec adresse exacte, licence, date de consultation et autres mesures du même sujet.
export default function MetricCard({ label, metric, missing = "Donnée non disponible", variant = "tile", display }: MetricCardProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = `metric-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  if (!metric) {
    return (
      <div className={variant === "tile" ? `${styles.tile} ${styles.tileMissing}` : `${styles.row} ${styles.rowMissing}`}>
        <span className={styles.tileLabel}>{label}</span>
        <span className={styles.missing}>{missing}</span>
      </div>
    );
  }

  const shown = display ?? metric.value;
  return (
    <>
      <button type="button" className={variant === "tile" ? styles.tile : styles.row} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog" aria-label={`${label} : ${shown} ${metric.unit}, voir les sources`}>
        <span className={styles.tileLabel}>{label}</span>
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
          <p className={styles.drawerValue}>
            {shown} {metric.unit}
          </p>
          <dl className={styles.drawerFacts}>
            <dt>Période</dt>
            <dd>{metric.period}</dd>
            <dt>Périmètre</dt>
            <dd>{metric.scope}</dd>
            <dt>Nature</dt>
            <dd>{metric.kind}</dd>
            <dt>Dernière vérification</dt>
            <dd>{metric.verifiedAt}</dd>
          </dl>
          <h4>Méthode</h4>
          <p>{metric.methodology}</p>
          <h4>Source{metric.sources.length > 1 ? "s" : ""}</h4>
          <ul className={styles.drawerSources}>
            {metric.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
                <span>
                  {source.publisher} · consultée le {source.accessedAt}
                </span>
                <span className={source.reuse === "allowed" ? styles.licenceOk : styles.licenceWarn}>{source.reuse === "allowed" ? source.license : "Licence de réutilisation non vérifiée"}</span>
                {source.notes ? <span className={styles.sourceNotes}>{source.notes}</span> : null}
              </li>
            ))}
          </ul>
          {metric.others.length > 0 ? (
            <>
              <h4>Autres mesures du même sujet</h4>
              <ul className={styles.drawerOthers}>
                {metric.others.map((other) => (
                  <li key={`${other.publisher}-${other.period}-${other.value}`}>
                    <strong>
                      {other.value} {other.unit}
                    </strong>{" "}
                    · {other.publisher} · {other.period} · {other.scope}
                  </li>
                ))}
              </ul>
              <p className={styles.drawerNote}>Ces mesures ont des définitions et des dates différentes : elles ne sont pas additionnées ni moyennées.</p>
            </>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
