"use client";

import Link from "next/link";
import { ZONE_LABELS, type ZoneBriefCard, type ZoneSlug } from "@/lib/homeZones";
import { ZONE_COUNTRIES } from "@/lib/zoneCountries";
import styles from "./ZonePanel.module.css";
import ZoneCarousel from "./ZoneCarousel";

const SECTIONS = [
  { label: "Approche", path: "approche", hint: "Fiches pays et repères" },
  { label: "Actualités", path: "actualite", hint: "Briefs et carte" },
  { label: "Analyse", path: "analyse", hint: "Points de situation" },
];

interface ZonePanelProps {
  zone: ZoneSlug;
  briefs: ZoneBriefCard[];
  /** Article surligné (événement cliqué sur le globe), aussi sur téléphone. */
  highlightId?: number | null;
  onClose: () => void;
}

export default function ZonePanel({ zone, briefs, highlightId = null, onClose }: ZonePanelProps) {
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
      <ZoneCarousel zone={zone} briefs={briefs} variant="inline" highlightId={highlightId} />
    </aside>
  );
}
