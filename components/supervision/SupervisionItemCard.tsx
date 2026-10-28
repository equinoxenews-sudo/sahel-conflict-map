"use client";

import { formatDate } from "@/lib/formatDate";
import type { ResultItem } from "@/lib/supervision/results";
import styles from "./Supervision.module.css";

export const SOURCE_LABELS: Record<string, string> = { rss: "Presse", telegram: "Telegram", gdelt: "GDELT", zone_brief: "Équinoxe" };

const FEEDBACK: { kind: string; label: string }[] = [
  { kind: "relevant", label: "Pertinent" },
  { kind: "irrelevant", label: "Non pertinent" },
  { kind: "duplicate", label: "Doublon" },
  { kind: "wrong_location", label: "Lieu incorrect" },
];

interface Props {
  item: ResultItem;
  onFeedback: (item: ResultItem, kind: string) => void;
}

// Une publication retenue, dans le style des cartes d'Actualité : cadre doré, pastilles (source, lieu), titre, extrait,
// raison de la correspondance et retours. La date de la publication est toujours distincte du lieu et de la source.
export default function SupervisionItemCard({ item, onFeedback }: Props) {
  const located = item.latitude != null && item.longitude != null;
  return (
    <article className={styles.newsCard}>
      <div className={styles.chipRow}>
        <span className={styles.chipGold}>{SOURCE_LABELS[item.sourceKind] ?? item.sourceKind}</span>
        {located ? (
          <span className={styles.chipGold}>
            {item.geoPlace ?? "Lieu"} · {item.geoPrecision === "exact" ? "précis" : "approximatif"}
          </span>
        ) : (
          <span className={styles.chipWarn}>{item.geoPlace ? `Lieu cité : ${item.geoPlace} (non placé)` : "Lieu inconnu"}</span>
        )}
        <span className={styles.chipDate}>{item.publishedAt ? formatDate(item.publishedAt) : "Date inconnue"}</span>
      </div>
      <h3 className={styles.newsTitle}>
        <a href={item.url} target={item.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
          {item.title}
        </a>
      </h3>
      {item.sourceName ? <span className={styles.newsSource}>{item.sourceName}</span> : null}
      {item.excerpt ? <p className={styles.excerpt}>{item.excerpt}</p> : null}
      {item.reason ? <span className={styles.reason}>{item.reason}</span> : null}
      <div className={styles.feedbackRow}>
        {FEEDBACK.map((entry) => (
          <button key={entry.kind} type="button" className={item.feedback === entry.kind ? `${styles.feedbackBtn} ${styles.feedbackOn}` : styles.feedbackBtn} onClick={() => onFeedback(item, entry.kind)}>
            {entry.label}
          </button>
        ))}
      </div>
    </article>
  );
}
