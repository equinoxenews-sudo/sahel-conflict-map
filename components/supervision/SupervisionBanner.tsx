"use client";

import { formatDate } from "@/lib/formatDate";
import type { ResultItem } from "@/lib/supervision/results";
import { SOURCE_LABELS } from "./SupervisionItemCard";
import styles from "./Supervision.module.css";

export interface Alert {
  text: string;
}

interface Props {
  items: ResultItem[];
  alerts: Alert[];
}

/** Vitesse de lecture, en pixels par seconde (celle du bandeau LATEST du site). */
const SPEED_PX_PER_S = 55;
const MAX_ITEMS = 10;

// Bandeau du tableau de bord : les alertes de la veille (collecte en erreur, budget atteint, rien de neuf) puis les
// dernières publications retenues, qui défilent doucement et s'arrêtent au survol.
export default function SupervisionBanner({ items, alerts }: Props) {
  const latest = [...items].sort((a, b) => Date.parse(b.publishedAt ?? "0") - Date.parse(a.publishedAt ?? "0")).slice(0, MAX_ITEMS);
  const entries = [
    ...alerts.map((alert) => ({ key: `a-${alert.text}`, alert: true, text: alert.text, href: null as string | null, meta: "" })),
    ...latest.map((item) => ({ key: `i-${item.id}`, alert: false, text: item.titleFr ?? item.title, href: item.url, meta: `${SOURCE_LABELS[item.sourceKind] ?? item.sourceKind}${item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}` })),
  ];
  const width = entries.reduce((sum, entry) => sum + entry.text.length * 7 + 120, 0);
  const duration = Math.max(25, Math.round(width / SPEED_PX_PER_S));

  if (entries.length === 0) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerBadge}>EN DIRECT</span>
        <span className={styles.bannerEmpty}>Aucune information pour l&apos;instant : lancez la collecte.</span>
      </div>
    );
  }
  const render = (suffix: string) =>
    entries.map((entry) => (
      <span key={`${entry.key}${suffix}`} className={entry.alert ? `${styles.bannerItem} ${styles.bannerAlert}` : styles.bannerItem}>
        {entry.alert ? <strong>Alerte · </strong> : entry.meta ? <em>{entry.meta} · </em> : null}
        {entry.href ? (
          <a href={entry.href} target={entry.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
            {entry.text}
          </a>
        ) : (
          entry.text
        )}
        <span className={styles.bannerDot}>•</span>
      </span>
    ));
  return (
    <div className={styles.banner}>
      <span className={styles.bannerBadge}>EN DIRECT</span>
      <div className={styles.bannerWrap}>
        <div className={styles.bannerTrack} style={{ animationDuration: `${duration}s` }}>
          {render("")}
          <span aria-hidden="true" style={{ display: "contents" }}>
            {render("-copie")}
          </span>
        </div>
      </div>
    </div>
  );
}
