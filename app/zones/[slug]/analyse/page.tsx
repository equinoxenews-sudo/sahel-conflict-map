import Link from "next/link";
import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import { psitLabel } from "@/lib/situationReport";
import { getPublishedReports } from "@/lib/situationReportData";
import { getZone } from "@/lib/zones";
import styles from "./page.module.css";

export const revalidate = 3600;

export default async function ZoneAnalysePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone || !zone.active || zone.countries.length === 0) notFound();

  const reports = await getPublishedReports(zone.slug);
  const latest = reports[0];

  return (
    <AnalyseFrame zoneName={zone.name} backHref={`/zones/${zone.slug}`}>
      <div className={styles.choices}>
        <Link href={`/zones/${zone.slug}/analyse/point-de-situation`} className={styles.choice}>
          <span className={styles.choiceTitle}>Point de situation</span>
          <span className={styles.choiceText}>
            Deux rapports par semaine : l&apos;idée maîtresse de la période, la carte des événements et les perspectives à court et moyen terme.
          </span>
          <span className={styles.choiceMeta}>
            {latest
              ? `Dernier : ${psitLabel(latest.period_end).full} · ${reports.length} publié${reports.length > 1 ? "s" : ""}`
              : "Premier rapport bientôt publié"}
          </span>
        </Link>
        <Link href={`/zones/${zone.slug}/analyse/premium`} className={styles.choice}>
          <span className={styles.choiceTitle}>Articles premium</span>
          <span className={styles.choiceText}>Analyses de fond réservées aux abonnés.</span>
          <span className={styles.choiceMeta}>Bientôt disponible</span>
        </Link>
      </div>
    </AnalyseFrame>
  );
}
