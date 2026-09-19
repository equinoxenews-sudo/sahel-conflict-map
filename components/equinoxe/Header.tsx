"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ZONES } from "@/lib/zones";
import styles from "./Header.module.css";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <Image
          src="/equinoxe/logo-equinoxe-wordmark.png"
          alt="Équinoxe News"
          width={2167}
          height={726}
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
              <span className={styles.hex}>
                <Image src={zone.icon} alt={zone.name} width={40} height={49} />
              </span>
              <span className={styles.zoneLabel}>{zone.name}</span>
            </Link>
          );
        })}
        <Link href="/mon-espace" className={styles.zoneLink}>
          <span className={styles.hex}>
            <span className={styles.emojiIcon} aria-hidden>
              🗂️
            </span>
          </span>
          <span className={styles.zoneLabel}>Mon espace</span>
        </Link>
      </nav>

      <div className={styles.actions}>
        <button type="button" className={styles.iconBtn} aria-label="Menu">
          <span className={styles.iconGlyph}>&#9776;</span>
          <span className={styles.zoneLabel}>Menu</span>
        </button>
        <button type="button" className={styles.iconBtn} aria-label="À propos">
          <span className={styles.iconGlyph}>?</span>
          <span className={styles.zoneLabel}>A propos</span>
        </button>
        <Link href="/mon-espace" className={styles.iconBtn} aria-label="Log in">
          <span className={styles.iconGlyph}>&#128100;</span>
          <span className={styles.zoneLabel}>Log In</span>
        </Link>
        <div className={styles.search}>
          <input type="search" placeholder="Rechercher" disabled />
        </div>
      </div>
    </header>
  );
}
