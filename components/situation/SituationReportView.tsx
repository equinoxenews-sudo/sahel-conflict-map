"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { shortItemDate, type SituationItem } from "@/lib/situationReport";
import { themeLabel } from "@/lib/themes";
import SituationMap from "./SituationMapLoader";
import styles from "./SituationReportView.module.css";

interface SituationReportViewProps {
  zoneSlug: string;
  title: string;
  /** Déjà triés par thématique et numérotés (sortAndNumber). */
  items: SituationItem[];
  conclusion: string;
  /** En aperçu de relecture, les liens vers les synthèses restent actifs mais s'ouvrent ailleurs. */
  openLinksInNewTab?: boolean;
}

interface Group {
  theme: SituationItem["theme"];
  items: SituationItem[];
}

function groupByTheme(items: SituationItem[]): Group[] {
  const groups: Group[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.theme === item.theme) last.items.push(item);
    else groups.push({ theme: item.theme, items: [item] });
  }
  return groups;
}

export default function SituationReportView({
  zoneSlug,
  title,
  items,
  conclusion,
  openLinksInNewTab = false,
}: SituationReportViewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const groups = useMemo(() => groupByTheme(items), [items]);
  const points = useMemo(
    () =>
      items.flatMap((item) =>
        item.lat !== null && item.lon !== null ? [{ n: item.n, lat: item.lat, lon: item.lon, label: item.place ?? item.text }] : []
      ),
    [items]
  );
  const paragraphs = conclusion.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className={styles.report}>
      <h2 className={styles.headline}>{title}</h2>

      <div className={styles.body}>
        <div className={styles.mapBox}>
          <SituationMap points={points} zoneSlug={zoneSlug} selectedN={selected} onSelect={setSelected} />
          {points.length === 0 ? <p className={styles.mapNote}>Aucun événement localisé sur cette période.</p> : null}
        </div>

        <div className={styles.infos}>
          {groups.map((group, groupIndex) => (
            <section key={`${group.theme ?? "autre"}-${groupIndex}`} className={styles.group}>
              <h3 className={groupIndex === 0 ? `${styles.pill} ${styles.pillMain}` : styles.pill}>
                {group.theme ? themeLabel(group.theme) : "Autres"}
              </h3>
              <ul className={styles.itemList}>
                {group.items.map((item) => {
                  const localized = item.lat !== null && item.lon !== null;
                  return (
                    <li
                      key={item.n}
                      className={item.n === selected ? `${styles.item} ${styles.itemSelected}` : styles.item}
                      onMouseEnter={() => localized && setSelected(item.n)}
                    >
                      <button
                        type="button"
                        className={localized ? styles.bullet : `${styles.bullet} ${styles.bulletOff}`}
                        onClick={() => setSelected(item.n)}
                        title={localized ? "Repérer sur la carte" : "Lieu non localisé"}
                        aria-label={`Événement ${item.n}`}
                      >
                        {item.n}
                      </button>
                      <p className={styles.itemText}>
                        <span className={styles.itemDate}>{shortItemDate(item.date)}</span> : {item.text}
                        {item.place ? <span className={styles.place}> — {item.place}</span> : null}
                        {item.brief_id !== null ? (
                          <>
                            {" "}
                            <Link
                              href={`/briefs/${item.brief_id}`}
                              className={styles.link}
                              {...(openLinksInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            >
                              Lire l&apos;article →
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className={styles.conclusion}>
        <h3 className={styles.conclusionTitle}>Conclusion et perspectives</h3>
        {paragraphs.map((paragraph, index) => (
          <p key={index} className={styles.conclusionText} lang="fr">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
