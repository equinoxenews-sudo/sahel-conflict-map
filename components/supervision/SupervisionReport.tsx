"use client";

import { formatDate } from "@/lib/formatDate";
import type { ReportView, ResultItem } from "@/lib/supervision/results";
import styles from "./Supervision.module.css";

interface Props {
  report: ReportView | null;
  items: ResultItem[];
  /** Mode compact (tableau de bord) : résumé et points, sans détails. */
  compact?: boolean;
}

// Synthèse quotidienne d'une veille : le résumé, les points (« rapporté » ou « lecture prudente ») avec les liens vers les
// publications citées, les incertitudes. Un jour sans donnée ou un budget atteint est dit tel quel, jamais comblé.
export default function SupervisionReport({ report, items, compact = false }: Props) {
  if (!report) {
    return <p className={styles.meta}>Aucune synthèse pour l&apos;instant. Elle n&apos;est rédigée qu&apos;à partir des publications retenues, avec leurs références : le site n&apos;invente rien.</p>;
  }
  const content = report.content;
  return (
    <div className={styles.reportBox}>
      <div className={styles.itemMeta}>
        <span>Synthèse du {formatDate(report.day)}</span>
        <span>rédigée le {formatDate(report.createdAt)}</span>
        {report.costUsd > 0 ? <span>coût IA : {report.costUsd.toFixed(4)} $</span> : null}
      </div>
      {content.status === "ok" ? (
        <>
          <p className={compact ? styles.reportSummaryCompact : styles.itemTitle}>{content.summary}</p>
          {content.points.slice(0, compact ? 3 : content.points.length).map((point, index) => (
            <p key={index} className={styles.excerpt}>
              <strong>{point.kind === "hypothese" ? "Lecture prudente · " : "Rapporté · "}</strong>
              {point.text}{" "}
              {point.itemIds.map((id) => {
                const source = items.find((entry) => entry.id === id);
                return source ? (
                  <a key={id} href={source.url} target={source.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" title={source.title}>
                    [{source.sourceName ?? "source"}]
                  </a>
                ) : null;
              })}
            </p>
          ))}
          {compact && content.points.length > 3 ? <p className={styles.meta}>… et {content.points.length - 3} autre(s) point(s) dans l&apos;onglet Analyses.</p> : null}
          {content.uncertainties.length > 0 ? <p className={styles.reason}>Incertitudes : {content.uncertainties.join(" · ")}</p> : null}
          <p className={styles.meta}>Synthèse générée par IA à partir des publications retenues ; à recouper avec les sources citées.</p>
        </>
      ) : (
        <p className={styles.excerpt}>{content.message}</p>
      )}
    </div>
  );
}
