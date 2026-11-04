"use client";

import { useRef } from "react";
import type { RelationView } from "@/lib/approche/view";
import Icon from "./Icon";
import styles from "./Approche.module.css";

const TYPE_LABELS: Record<RelationView["type"], string> = { treaty: "Engagement conventionnel", cooperation: "Coopération documentée", tension: "Divergence documentée" };

// Une relation bilatérale documentée (traité, coopération, divergence) : carte compacte (drapeau, nom, nature, résumé, date) et
// fenêtre de détail avec domaines, dates, sources et limites de l'analyse.
export default function RelationCard({ relation }: { relation: RelationView }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = `relation-${relation.id}`;

  return (
    <>
      <button type="button" className={styles.relation} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <span className={styles.relationHead}>
          {relation.targetIso2 ? (
            // eslint-disable-next-line @next/next/no-img-element -- drapeaux locaux du site (flag-icons, MIT), voir public/flags
            <img src={`/flags/${relation.targetIso2.toLowerCase()}.svg`} alt="" width={30} height={21} className={styles.relationFlag} loading="lazy" />
          ) : null}
          <strong>{relation.targetName}</strong>
          <span className={styles.relationType}>{TYPE_LABELS[relation.type]}</span>
        </span>
        <span className={styles.relationTitle}>{relation.title}</span>
        <span className={styles.relationSummary}>{relation.summary}</span>
        <span className={styles.relationFoot}>
          {relation.validFrom ? (
            <span className={styles.period}>
              <Icon name="calendar" size={11} /> Depuis {relation.validFrom}
            </span>
          ) : null}
          <span className={styles.sourceHint} aria-hidden>
            Voir la relation ›
          </span>
        </span>
      </button>

      <dialog ref={dialog} className={styles.drawer} aria-labelledby={`${id}-title`} onClick={(event) => (event.target === dialog.current ? dialog.current?.close() : undefined)}>
        <div className={styles.drawerBody}>
          <header className={styles.drawerHead}>
            <h3 id={`${id}-title`}>
              {relation.targetName} — {relation.title}
            </h3>
            <button type="button" className={styles.drawerClose} onClick={() => dialog.current?.close()} aria-label="Fermer">
              ×
            </button>
          </header>
          <p className={styles.cardNote}>{TYPE_LABELS[relation.type]}</p>
          <p>{relation.summary}</p>
          {relation.topics.length > 0 ? (
            <>
              <h4>Domaines concernés</h4>
              <ul className={styles.topics}>
                {relation.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </>
          ) : null}
          <dl className={styles.drawerFacts}>
            {relation.validFrom ? (
              <>
                <dt>Depuis</dt>
                <dd>{relation.validFrom}</dd>
              </>
            ) : null}
            <dt>Dernière vérification</dt>
            <dd>{relation.reviewedAt}</dd>
          </dl>
          <h4>Source{relation.sources.length > 1 ? "s" : ""}</h4>
          <ul className={styles.drawerSources}>
            {relation.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
                <span>
                  {source.publisher} · consultée le {source.accessedAt}
                </span>
                <span className={source.reuse === "allowed" ? styles.licenceOk : styles.licenceWarn}>
                  {source.reuse === "unknown" ? "Licence de réutilisation non vérifiée" : source.license}
                  {source.licenseUrl ? (
                    <>
                      {" · "}
                      <a href={source.licenseUrl} target="_blank" rel="noopener noreferrer">
                        conditions
                      </a>
                    </>
                  ) : null}
                </span>
                {source.notes ? <span className={styles.sourceNotes}>{source.notes}</span> : null}
              </li>
            ))}
          </ul>
          <p className={styles.drawerNote}>Cette relation est décrite par des faits datés et sourcés ; elle ne constitue ni un classement ni une qualification d&apos;« allié » ou de « rival ».</p>
        </div>
      </dialog>
    </>
  );
}
