"use client";

import Link from "next/link";
import type { ZoneBriefCard } from "@/lib/cinematic/zoneBriefs";
import { ZONE_LABELS, type ZoneSlug } from "@/lib/cinematic/zoneMap";
import { ZONE_COUNTRIES } from "@/lib/cinematic/zoneCountries";
import styles from "./ZonePanel.module.css";
import ZoneCarousel from "./ZoneCarousel";

const SECTIONS = [
  { label: "Approche", path: "approche", hint: "Fiches pays et repères" },
  { label: "Actualités", path: "actualite", hint: "Briefs et carte" },
  { label: "Analyse", path: "analyse", hint: "Points de situation" },
];

// Seule l'Europe a pour l'instant des fiches pays complètes : les autres zones n'en listent pas les pays.
const COUNTRY_LINKS: ZoneSlug[] = ["europe"];

interface ZonePanelProps {
  zone: ZoneSlug;
  briefs: ZoneBriefCard[];
  onClose: () => void;
}

export default function ZonePanel({ zone, briefs, onClose }: ZonePanelProps) {
  const countries = ZONE_COUNTRIES[zone];
  return (
    <aside className={styles.panel} aria-label={`Zone ${ZONE_LABELS[zone]}`} key={zone}>
      <button type="button" className={styles.back} onClick={onClose}>
        ← Retour au globe
      </button>
      <h2 className={styles.title}>{ZONE_LABELS[zone]}</h2>
      <p className={styles.count}>{countries.length} pays suivis</p>

      <ul className={styles.sections}>
        {SECTIONS.map((section) => (
          <li key={section.path}>
            <Link href={`/zones/${zone}/${section.path}`} className={styles.section}>
              <span className={styles.sectionLabel}>{section.label}</span>
              <span className={styles.sectionHint}>{section.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Sur téléphone, les articles sont dans la fiche ; sur ordinateur, ils sont dans le bandeau du bas. */}
      <ZoneCarousel zone={zone} briefs={briefs} variant="inline" />

      {COUNTRY_LINKS.includes(zone) ? (
        <>
          <h3 className={styles.subtitle}>Fiches pays</h3>
          <ul className={styles.countries}>
            {countries.map((country) => (
              <li key={country.slug}>
                <Link href={`/zones/${zone}/approche/pays/${country.slug}`} className={styles.country}>
                  {country.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </aside>
  );
}
