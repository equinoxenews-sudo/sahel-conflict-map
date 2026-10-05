import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import SituationReportView from "@/components/situation/SituationReportView";
import { psitLabel } from "@/lib/situationReport";
import { getBriefImages, getPublishedReport } from "@/lib/situationReportData";
import { getZone } from "@/lib/zones";
import styles from "./page.module.css";

export const revalidate = 3600;

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export default async function PointDeSituationPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const zone = getZone(slug);
  const reportId = Number(id);
  if (!zone || !zone.active || !Number.isInteger(reportId) || reportId <= 0) notFound();

  const report = await getPublishedReport(zone.slug, reportId);
  if (!report) notFound();

  const label = psitLabel(report.period_end);
  const images = await getBriefImages(report.items.flatMap((item) => (item.brief_id !== null ? [item.brief_id] : [])));

  return (
    <AnalyseFrame zoneName={zone.name} section={label.short} backHref={`/zones/${zone.slug}/analyse/point-de-situation`}>
      <p className={styles.meta}>
        {label.full} · du {dayFormat.format(new Date(report.period_start))} au {dayFormat.format(new Date(report.period_end))}
      </p>
      <SituationReportView
        zoneSlug={zone.slug}
        title={report.title}
        items={report.items}
        conclusion={report.conclusion}
        images={images}
      />
      <p className={styles.disclaimer}>
        Point de situation rédigé avec l&apos;aide d&apos;une IA à partir des articles Équinoxe, puis relu avant publication.
        Les lieux sont indicatifs ; les affirmations non confirmées sont attribuées à leurs sources.
      </p>
    </AnalyseFrame>
  );
}
