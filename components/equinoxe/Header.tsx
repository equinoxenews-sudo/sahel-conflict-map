"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ZONES } from "@/lib/zones";
import styles from "./Header.module.css";
import MobileDrawer from "./MobileDrawer";

export default function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className={styles.header}>
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
        {ZONES.map((zone) => {
          const isActive = pathname?.startsWith(`/zones/${zone.slug}`);
          return (
            <Link
              key={zone.slug}
              href={`/zones/${zone.slug}`}
              className={isActive ? `${styles.zoneLink} ${styles.zoneLinkActive}` : styles.zoneLink}
            >
              {zone.name}
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
        <button type="button" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="À propos">
          <span className={styles.iconGlyph}>?</span>
          <span className={styles.zoneLabel}>A propos</span>
        </button>
        <Link href="/mon-espace" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="Log in">
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
