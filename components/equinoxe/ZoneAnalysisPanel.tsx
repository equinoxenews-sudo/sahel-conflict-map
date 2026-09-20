import Link from "next/link";
import styles from "./ZoneAnalysisPanel.module.css";
import WeeklySituationCard from "./WeeklySituationCard";

interface ZoneAnalysisPanelProps {
  zoneSlug: string;
}

// No dedicated "analysis" content model exists in the project yet — the
// only synthesized articles (zone_briefs) already power ZoneNewsPanel.
// Rather than duplicate that feed or invent fake analyses, this shows an
// honest empty state until a real analysis source is wired up.
export default function ZoneAnalysisPanel({ zoneSlug }: ZoneAnalysisPanelProps) {
  const analyseHref = `/zones/${zoneSlug}/analyse`;

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
      <p className={styles.subtitle}>Décryptages et points de situation</p>

      <p className={styles.empty}>Aucune analyse disponible actuellement.</p>

      <WeeklySituationCard href={analyseHref} />
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
