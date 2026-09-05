import Image from "next/image";
import Link from "next/link";
import { ZONES } from "@/lib/zones";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <Image
          src="/equinoxe/logo-globe.png"
          alt=""
          width={46}
          height={46}
          className={styles.logoGlobe}
        />
        <span className={styles.wordmark}>EQUINOXE</span>
      </Link>

      <nav className={styles.zones}>
        {ZONES.map((zone) => (
          <Link key={zone.slug} href={`/zones/${zone.slug}`} className={styles.zoneLink}>
            <span className={styles.hex}>
              <Image src={zone.icon} alt={zone.name} width={40} height={49} />
            </span>
            <span className={styles.zoneLabel}>{zone.name}</span>
          </Link>
        ))}
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
        <button type="button" className={styles.iconBtn} aria-label="Log in">
          <span className={styles.iconGlyph}>&#128100;</span>
          <span className={styles.zoneLabel}>Log In</span>
        </button>
        <div className={styles.search}>
          <input type="search" placeholder="Rechercher" disabled />
        </div>
      </div>
    </header>
  );
}
