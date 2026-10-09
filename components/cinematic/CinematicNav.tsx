"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ZONE_LABELS, ZONE_ORDER, type ZoneSlug } from "@/lib/cinematic/zoneMap";
import styles from "./CinematicNav.module.css";

const SECTIONS = [
  { key: "approche", label: "Approche", path: "approche" },
  { key: "actualite", label: "Actualités", path: "actualite" },
  { key: "analyse", label: "Analyse", path: "analyse" },
];

interface CinematicNavProps {
  /** Zone actuellement au centre du globe. */
  activeZone: ZoneSlug | null;
  /** Clic sur une zone du bandeau : le globe se centre dessus. */
  onFocusZone: (zone: ZoneSlug) => void;
}

export default function CinematicNav({ activeZone, onFocusZone }: CinematicNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="ÉQUINOXE News — accueil du site">
        <Image src="/equinoxe/logo-equinoxe-wordmark.png" alt="ÉQUINOXE News" width={161} height={54} priority />
      </Link>

      <button
        type="button"
        className={styles.burger}
        aria-expanded={menuOpen}
        aria-controls="cinematic-zones"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={styles.burgerLabel}>Zones</span>
        <span className={styles.burgerIcon} aria-hidden="true" />
      </button>

      <nav
        id="cinematic-zones"
        className={menuOpen ? `${styles.zones} ${styles.zonesOpen}` : styles.zones}
        aria-label="Zones géographiques"
      >
        {ZONE_ORDER.map((zone) => (
          <div key={zone} className={styles.zone} data-active={activeZone === zone}>
            <button
              type="button"
              className={styles.zoneButton}
              aria-pressed={activeZone === zone}
              onClick={() => {
                onFocusZone(zone);
                setMenuOpen(false);
              }}
            >
              {ZONE_LABELS[zone]}
              <span className={styles.caret} aria-hidden="true" />
            </button>
            <ul className={styles.sections}>
              {SECTIONS.map((section) => (
                <li key={section.key}>
                  <Link href={`/zones/${zone}/${section.path}`} className={styles.sectionLink}>
                    {section.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </header>
  );
}
