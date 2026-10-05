import Link from "next/link";
import { psitLabel, type SituationReport } from "@/lib/situationReport";
import styles from "./ZoneAnalysisPanel.module.css";

interface ZoneAnalysisPanelProps {
  zoneSlug: string;
  /** Derniers points de situation publiés, du plus récent au plus ancien. */
  reports: SituationReport[];
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export default function ZoneAnalysisPanel({ zoneSlug, reports }: ZoneAnalysisPanelProps) {
  const analyseHref = `/zones/${zoneSlug}/analyse`;
  const listHref = `${analyseHref}/point-de-situation`;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden>
            <IconChart />
          </span>
          Analyses
        </h2>
        <Link href={analyseHref} className={styles.seeAll}>
          Voir tout →
        </Link>
      </div>
      <p className={styles.subtitle}>Points de situation, deux fois par semaine</p>

      {reports.length === 0 ? (
        <p className={styles.empty}>Aucun point de situation publié pour le moment.</p>
      ) : (
        <ul className={styles.list}>
          {reports.map((report) => {
            const label = psitLabel(report.period_end);
            return (
              <li key={report.id}>
                <Link href={`${listHref}/${report.id}`} className={styles.item}>
                  <span className={styles.itemLabel}>
                    {label.full} · {dayFormat.format(new Date(report.period_end))}
                  </span>
                  <span className={styles.itemTitle}>{report.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href={listHref} className={styles.more}>
        Tous les points de situation →
      </Link>
    </div>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}
