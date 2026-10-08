"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ZONES } from "@/lib/zones";
import styles from "./CinematicNav.module.css";

// Les cinq zones, dans l'ordre demandé, avec les libellés typographiques du bandeau.
const NAV_ZONES = ["europe", "moyen-orient", "afrique", "indopacifique", "amerique-du-sud"].map((slug) => {
  const zone = ZONES.find((z) => z.slug === slug);
  return { slug, label: slug === "moyen-orient" ? "Moyen-Orient" : (zone?.name ?? slug) };
});

const SECTIONS = [
  { key: "approche", label: "Approche", path: "approche" },
  { key: "actualite", label: "Actualités", path: "actualite" },
  { key: "analyse", label: "Analyse", path: "analyse" },
];

export default function CinematicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openZone, setOpenZone] = useState<string | null>(null);

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
        {NAV_ZONES.map((zone) => {
          const open = openZone === zone.slug;
          return (
            <div key={zone.slug} className={styles.zone} data-open={open}>
              <button
                type="button"
                className={styles.zoneButton}
                aria-expanded={open}
                onClick={() => setOpenZone(open ? null : zone.slug)}
              >
                {zone.label}
                <span className={styles.caret} aria-hidden="true" />
              </button>
              <ul className={styles.sections}>
                {SECTIONS.map((section) => (
                  <li key={section.key}>
                    <Link href={`/zones/${zone.slug}/${section.path}`} className={styles.sectionLink}>
                      {section.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
