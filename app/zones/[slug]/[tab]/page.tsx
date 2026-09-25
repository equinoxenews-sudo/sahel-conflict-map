import Link from "next/link";
import { notFound } from "next/navigation";
import DocumentGrid from "@/components/DocumentGrid";
import Header from "@/components/equinoxe/Header";
import MapView from "@/components/MapView";
import ZoneNewsList from "@/components/ZoneNewsList";
import ZoneApprochePage from "@/components/zone-approche/ZoneApprochePage";
import { supabase } from "@/lib/supabaseClient";
import { getZoneApprocheContent } from "@/lib/zoneApprocheContent";
import { getZoneArticles, getZoneBriefs } from "@/lib/zoneBriefs";
import { listZoneDocuments } from "@/lib/zoneDocuments";
import { getZoneMapData } from "@/lib/zoneMaps";
import { ZONE_NEWS } from "@/lib/zoneNews";
import { getZone, TAB_LABELS, TABS, type Tab } from "@/lib/zones";
import type { ConflictEvent } from "@/types/event";
import styles from "./page.module.css";

export const revalidate = 3600;

async function getZoneEvents(countries: string[]): Promise<ConflictEvent[]> {
  try {
    const { data, error } = await supabase
      .from("conflict_events")
      .select("*")
      .in("country", countries)
      .order("event_date", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Failed to load conflict_events:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Failed to reach Supabase:", err);
    return [];
  }
}

export default async function ZoneTabPage({
  params,
}: {
  params: Promise<{ slug: string; tab: string }>;
}) {
  const { slug, tab } = await params;
  const zone = getZone(slug);
  if (!zone || !TABS.includes(tab as Tab)) notFound();

  const isLiveActualite = zone.active && tab === "actualite" && zone.countries.length > 0;
  const isApproche = zone.active && tab === "approche";
  const approcheContent = isApproche ? getZoneApprocheContent(zone.slug) : undefined;
  const approcheMap = isApproche ? getZoneMapData(zone.slug) : undefined;
  const briefs = isLiveActualite ? await getZoneBriefs(zone.slug) : [];
  const articles = isLiveActualite && briefs.length === 0 ? await getZoneArticles(zone.slug) : [];
  const newsItems = ZONE_NEWS[zone.slug] ?? [];
  const documents = isApproche && !(approcheContent && approcheMap) ? await listZoneDocuments(zone.slug) : [];

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.topBar}>
        <Link href={`/zones/${zone.slug}`} className={styles.back}>
          &lsaquo; Retour
        </Link>
        <h1 className={styles.title}>
          {zone.name.toUpperCase()} — {TAB_LABELS[tab as Tab]}
        </h1>
      </div>

      {isLiveActualite ? (
        <div className={styles.splitLayout}>
          <div className={styles.newsList}>
            <ZoneNewsList briefs={briefs} articles={articles} newsItems={newsItems} />
          </div>
          <div className={styles.mapArea}>
            <MapView events={await getZoneEvents(zone.countries)} />
          </div>
        </div>
      ) : isApproche && approcheContent && approcheMap ? (
        <ZoneApprochePage zoneSlug={zone.slug} content={approcheContent} map={approcheMap} />
      ) : isApproche ? (
        <DocumentGrid documents={documents} />
      ) : (
        <div className={styles.placeholder}>
          <p>{zone.active ? "Aperçu à venir" : "Bientôt disponible"}</p>
          <p className={styles.placeholderSub}>
            Cette section est en cours de constitution — contenu détaillé à venir.
          </p>
        </div>
      )}
    </main>
  );
}
