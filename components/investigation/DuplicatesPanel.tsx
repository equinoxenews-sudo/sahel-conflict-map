"use client";

import type { DuplicateCandidate } from "@/lib/investigation/duplicates";
import { ENTITY_TYPE_LABELS, type InvestigationEntity } from "@/lib/investigation/types";
import EntityTypeIcon from "./EntityTypeIcon";
import styles from "./DuplicatesPanel.module.css";

interface DuplicatesPanelProps {
  candidates: DuplicateCandidate[];
  entities: InvestigationEntity[];
  onFocus: (entityId: string) => void;
  onDismiss: (key: string) => void;
  onMark: (aId: string, bId: string) => void;
  onMerge: (aId: string, bId: string) => void;
}

// Suggestions de doublons : des paires à EXAMINER. Aucune fusion n'a lieu sans ton
// accord : ignorer, marquer « possible doublon » (trait orange sur le graphe) ou fusionner.
export default function DuplicatesPanel({ candidates, entities, onFocus, onDismiss, onMark, onMerge }: DuplicatesPanelProps) {
  if (candidates.length === 0) return <div className={styles.panel}>Aucun doublon possible.</div>;

  return (
    <div className={styles.panel}>
      <p className={styles.lead}>
        Ces fiches se ressemblent. Ce sont des suggestions : vérifie avant de décider.
      </p>
      <ul className={styles.list}>
        {candidates.map((candidate) => {
          const a = entities.find((e) => e.id === candidate.aId);
          const b = entities.find((e) => e.id === candidate.bId);
          if (!a || !b) return null;
          return (
            <li key={candidate.key} className={styles.row}>
              <div className={styles.names}>
                <button type="button" className={styles.name} onClick={() => onFocus(a.id)}>
                  <EntityTypeIcon type={a.type} size={16} /> {a.name}
                </button>
                <span className={styles.vs}>≟</span>
                <button type="button" className={styles.name} onClick={() => onFocus(b.id)}>
                  <EntityTypeIcon type={b.type} size={16} /> {b.name}
                </button>
                <span className={styles.type}>{ENTITY_TYPE_LABELS[a.type]}</span>
              </div>
              <div className={styles.reasons}>
                {candidate.reasons.map((reason) => (
                  <span key={reason} className={styles.reason}>
                    {reason}
                  </span>
                ))}
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.merge} onClick={() => onMerge(a.id, b.id)}>
                  Fusionner…
                </button>
                <button type="button" className={styles.ghost} onClick={() => onMark(a.id, b.id)}>
                  Marquer « possible doublon »
                </button>
                <button type="button" className={styles.ghost} onClick={() => onDismiss(candidate.key)}>
                  Ignorer
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
