import { notFound } from "next/navigation";
import AnalyseFrame from "@/components/situation/AnalyseFrame";
import { getZone } from "@/lib/zones";

export default async function PremiumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone || !zone.active || zone.countries.length === 0) notFound();

  return (
    <AnalyseFrame zoneName={zone.name} section="Articles premium" backHref={`/zones/${zone.slug}/analyse`}>
      <p style={{ textAlign: "center", margin: "80px 0", color: "var(--text-secondary)" }}>
        Les articles premium arrivent bientôt.
      </p>
    </AnalyseFrame>
  );
}
