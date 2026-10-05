import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import PsitList from "@/components/situation/PsitList";
import { getPublishedReports } from "@/lib/situationReportData";
import { getZone } from "@/lib/zones";

export const revalidate = 3600;

export default async function PointDeSituationListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone || !zone.active || zone.countries.length === 0) notFound();

  const reports = await getPublishedReports(zone.slug);

  return (
    <AnalyseFrame zoneName={zone.name} section="Point de situation" backHref={`/zones/${zone.slug}/analyse`}>
      <PsitList zoneSlug={zone.slug} reports={reports} />
    </AnalyseFrame>
  );
}
