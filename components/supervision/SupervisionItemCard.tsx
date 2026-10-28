"use client";

import { useState } from "react";
import HexFlag from "@/components/investigation/HexFlag";
import { flagsInText } from "@/lib/flagMentions";
import { formatDate } from "@/lib/formatDate";
import { briefImageSrc } from "@/lib/imageUrls";
import type { ResultItem } from "@/lib/supervision/results";
import { isThemeKey, themeShortLabel } from "@/lib/themes";
import styles from "./Supervision.module.css";

export const SOURCE_LABELS: Record<string, string> = { rss: "Presse", telegram: "Telegram", gdelt: "GDELT", zone_brief: "Équinoxe" };

const FEEDBACK: { kind: string; label: string }[] = [
  { kind: "relevant", label: "Pertinent" },
  { kind: "irrelevant", label: "Non pertinent" },
  { kind: "duplicate", label: "Doublon" },
  { kind: "wrong_location", label: "Lieu incorrect" },
];

/** Image fournie par la source ; si elle ne se charge pas, elle disparaît sans laisser d'icône cassée. */
function Photo({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className={styles.photoWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={briefImageSrc(url)} referrerPolicy="no-referrer" alt="" className={styles.photo} onError={() => setFailed(true)} />
    </span>
  );
}

function relevanceColor(percent: number): string {
  return percent >= 75 ? "#7cc46b" : percent >= 50 ? "#e0b44c" : "#e87932";
}

interface Props {
  item: ResultItem;
  onFeedback: (item: ResultItem, kind: string) => void;
}

// Une publication retenue, dans le style des cartes d'Actualité : image de la source, pastilles de thèmes, indicateur de
// pertinence, drapeau et titre en français, résumé, source et date. Une publication pas encore triée le dit clairement.
export default function SupervisionItemCard({ item, onFeedback }: Props) {
  const located = item.latitude != null && item.longitude != null;
  const title = item.titleFr ?? item.title;
  const summary = item.summaryFr ?? item.excerpt;
  const flag = flagsInText(title, 1)[0] ?? flagsInText(item.country ?? "", 1)[0];
  const themes = item.themes.filter(isThemeKey).slice(0, 3);
  return (
    <article className={styles.newsCard}>
      {item.imageUrl ? <Photo url={item.imageUrl} /> : null}
      <div className={styles.newsBody}>
        <div className={styles.newsTop}>
          <span className={styles.chipRow}>
            {themes.map((key) => (
              <span key={key} className={styles.chipGold}>
                {themeShortLabel(key)}
              </span>
            ))}
            {!item.judged ? <span className={styles.chipWarn}>Non trié</span> : null}
            {item.geoPlace ? <span className={located ? styles.chipGold : styles.chipWarn}>{located ? item.geoPlace : `Lieu cité : ${item.geoPlace} (non placé)`}</span> : null}
          </span>
          {item.relevance != null ? (
            <span className={styles.relBox} title={item.judgeNote ?? undefined}>
              <span className={styles.relHead}>
                <span>{SOURCE_LABELS[item.sourceKind] ?? item.sourceKind}</span>
                <strong style={{ color: relevanceColor(item.relevance) }}>Pertinence · {item.relevance} %</strong>
              </span>
              <span className={styles.relBar}>
                <span className={styles.relMarker} style={{ left: `${item.relevance}%` }} />
              </span>
            </span>
          ) : (
            <span className={styles.chipDate}>{SOURCE_LABELS[item.sourceKind] ?? item.sourceKind}</span>
          )}
        </div>
        <div className={styles.newsHead}>
          {flag ? (
            <span className={styles.newsFlag}>
              <HexFlag iso2={flag.iso2} name={flag.name} />
            </span>
          ) : null}
          <h3 className={styles.newsTitle}>
            <a href={item.url} target={item.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
              {title}
            </a>
          </h3>
        </div>
        {summary ? <p className={styles.excerpt}>{summary}</p> : null}
        <div className={styles.newsFoot}>
          <span className={styles.newsSource}>
            {item.sourceName ?? SOURCE_LABELS[item.sourceKind]} · {item.publishedAt ? formatDate(item.publishedAt) : "date inconnue"}
          </span>
          {item.judgeNote ? <span className={styles.reason}>{item.judgeNote}</span> : item.reason ? <span className={styles.reason}>{item.reason}</span> : null}
        </div>
        <div className={styles.feedbackRow}>
          {FEEDBACK.map((entry) => (
            <button key={entry.kind} type="button" className={item.feedback === entry.kind ? `${styles.feedbackBtn} ${styles.feedbackOn}` : styles.feedbackBtn} onClick={() => onFeedback(item, entry.kind)}>
              {entry.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
