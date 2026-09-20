import { Suspense } from "react";
import type { ReactNode } from "react";
import HomeTabSync, { HOME_BODY_ID } from "./HomeTabSync";
import styles from "./HomeBody.module.css";
import LatestCard from "./LatestCard";

interface HomeBodyProps {
  newsSlot: ReactNode;
  globeSlot: ReactNode;
  zonesSlot: ReactNode;
  latest: { title: string; date: string | null; href: string; imageUrl?: string | null } | null;
}

// Server-rendered (and cached via the page's ISR revalidate) always as the
// "accueil" tab — HomeTabSync corrects the visible tab client-side from the
// URL's ?tab= param after hydration, so a bottom-nav tap only needs a DOM
// attribute flip, not a server round-trip or losing the page's cache.
export default function HomeBody({ newsSlot, globeSlot, zonesSlot, latest }: HomeBodyProps) {
  return (
    <div id={HOME_BODY_ID} className={styles.body} data-tab="accueil">
      <div className={styles.newsSection}>{newsSlot}</div>
      <div className={styles.globeSection}>
        {globeSlot}
        {latest ? (
          <LatestCard title={latest.title} date={latest.date} href={latest.href} imageUrl={latest.imageUrl} />
        ) : null}
      </div>
      <div className={styles.zonesSection}>{zonesSlot}</div>
      <Suspense fallback={null}>
        <HomeTabSync />
      </Suspense>
    </div>
  );
}
