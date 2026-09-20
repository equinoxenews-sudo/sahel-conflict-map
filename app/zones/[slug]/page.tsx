import { notFound } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import Ticker from "@/components/equinoxe/Ticker";
import ZoneAnalysisPanel from "@/components/equinoxe/ZoneAnalysisPanel";
import ZoneHero from "@/components/equinoxe/ZoneHero";
import ZoneKnowledgePanel from "@/components/equinoxe/ZoneKnowledgePanel";
import ZoneNewsPanel from "@/components/equinoxe/ZoneNewsPanel";
import ZoneSubNav from "@/components/equinoxe/ZoneSubNav";
import { getZoneArticles, getZoneBriefs } from "@/lib/zoneBriefs";
import { getZoneHubContent } from "@/lib/zoneHubContent";
import { ZONE_NEWS } from "@/lib/zoneNews";
import { getZone } from "@/lib/zones";
import styles from "./page.module.css";

export const revalidate = 3600;

export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const zone = getZone(slug);
  if (!zone) notFound();

  const isLive = zone.active && zone.countries.length > 0;
  const briefs = isLive ? await getZoneBriefs(zone.slug, 5) : [];
  const articles = isLive && briefs.length === 0 ? await getZoneArticles(zone.slug, 5) : [];
  const newsItems = ZONE_NEWS[zone.slug] ?? [];
  const content = getZoneHubContent(zone.slug);

  return (
    <main className={styles.main}>
      <Header />
      <Ticker />

      <ZoneHero zone={zone} content={content} />
      <ZoneSubNav zoneSlug={zone.slug} active="overview" />

      <div className={styles.grid}>
        <ZoneKnowledgePanel zoneSlug={zone.slug} categories={content?.categories} />
        <ZoneNewsPanel
          zoneSlug={zone.slug}
          zoneName={zone.name}
          briefs={briefs}
          articles={articles}
          newsItems={newsItems}
        />
        <ZoneAnalysisPanel zoneSlug={zone.slug} />
      </div>
    </main>
  );
}
