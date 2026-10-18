"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FOCUS_ZONE_EVENT, ZONE_FOCUSED_EVENT, isHomeZone, zoneHomeHref } from "@/lib/homeZones";
import { ZONES } from "@/lib/zones";
import styles from "./Header.module.css";
import MobileDrawer from "./MobileDrawer";

/** Libellés courts sur mobile, où toute la navigation tient sur une ligne qui défile. */
const SHORT_NAMES: Record<string, string> = { "amerique-du-sud": "Am. du Sud", "moyen-orient": "Moyen-Orient" };

export default function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Zone au centre du globe d'accueil (signalée par le globe) : surlignée comme une page active.
  const [globeZone, setGlobeZone] = useState<string | null>(null);
  useEffect(() => {
    const onFocused = (event: Event) => setGlobeZone((event as CustomEvent<{ zone: string | null }>).detail?.zone ?? null);
    window.addEventListener(ZONE_FOCUSED_EVENT, onFocused);
    return () => window.removeEventListener(ZONE_FOCUSED_EVENT, onFocused);
  }, []);

  return (
    <header className={styles.header} data-intro-hide>
      <Link href="/" className={styles.logo}>
        {/* unoptimized: the source PNG has a real alpha channel (confirmed
            by sampling it directly), but Next's /_next/image resizer
            flattens it to opaque black — skip it for this asset. */}
        <Image
          src="/equinoxe/logo-equinoxe-wordmark.png"
          alt="Équinoxe News"
          width={2167}
          height={726}
          unoptimized
          priority
          className={styles.logoImage}
        />
      </Link>

      <nav className={styles.zones}>
        {ZONES.filter((zone) => zone.active).map((zone) => {
          const isActive = pathname?.startsWith(`/zones/${zone.slug}`) || (pathname === "/" && globeZone === zone.slug);
          return (
            <Link
              key={zone.slug}
              href={zone.slug === "tracking" ? `/zones/${zone.slug}` : zoneHomeHref(zone.slug)}
              className={isActive ? `${styles.zoneLink} ${styles.zoneLinkActive}` : styles.zoneLink}
              onClick={(event) => {
                // Sur l'accueil, le menu centre le globe sur la zone (la fiche donne ensuite accès
                // aux pages). Partout ailleurs, ou avec Ctrl/Cmd-clic, le lien garde son effet normal.
                if (pathname !== "/" || !isHomeZone(zone.slug)) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                window.dispatchEvent(new CustomEvent(FOCUS_ZONE_EVENT, { detail: { zone: zone.slug } }));
              }}
            >
              <Image src={zone.icon} alt="" width={24} height={30} className={styles.zoneHex} aria-hidden="true" />
              {SHORT_NAMES[zone.slug] ? (
                <>
                  <span className={styles.longName}>{zone.name}</span>
                  <span className={styles.shortName}>{SHORT_NAMES[zone.slug]}</span>
                </>
              ) : (
                zone.name
              )}
            </Link>
          );
        })}
        <Link href="/mon-espace" className={styles.zoneLink}>
          Mon espace
        </Link>
        <Link
          href="/investigation"
          className={pathname?.startsWith("/investigation") ? `${styles.zoneLink} ${styles.zoneLinkActive}` : styles.zoneLink}
        >
          Investigation
        </Link>
      </nav>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.mobileMenuBtn}`}
          aria-label="Menu"
          onClick={() => setDrawerOpen(true)}
        >
          <span className={styles.iconGlyph}>&#9776;</span>
          <span className={styles.zoneLabel}>Menu</span>
        </button>
        <button type="button" className={`${styles.iconBtn} ${styles.compactOnMobile}`} aria-label="À propos">
          <span className={styles.iconGlyph}>?</span>
          <span className={styles.zoneLabel}>A propos</span>
        </button>
        <Link href="/mon-espace" className={`${styles.iconBtn} ${styles.compactOnMobile}`} aria-label="Log in">
          <span className={styles.iconGlyph}>&#128100;</span>
          <span className={styles.zoneLabel}>Log In</span>
        </Link>
        <div className={`${styles.search} ${styles.desktopOnly}`}>
          <input type="search" placeholder="Rechercher" disabled />
        </div>
        <button type="button" className={`${styles.iconBtn} ${styles.mobileSearchBtn}`} aria-label="Rechercher">
          <span className={styles.iconGlyph}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
        </button>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
