"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { parisDay, psitLabel, reportThemes, type SituationReport } from "@/lib/situationReport";
import { themeShortLabel } from "@/lib/themes";
import ThemeIcon from "./ThemeIcon";
import styles from "./PsitList.module.css";

interface PsitListProps {
  zoneSlug: string;
  reports: SituationReport[];
}

const PAGE_SIZE = 20;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

function periodText(report: SituationReport): string {
  return `Du ${dayFormat.format(new Date(report.period_start))} au ${dayFormat.format(new Date(report.period_end))}`;
}

export default function PsitList({ zoneSlug, reports }: PsitListProps) {
  const [query, setQuery] = useState("");
  const [week, setWeek] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // La recherche ne porte que sur les points de situation : titre, événements,
  // lieux et conclusion.
  const prepared = useMemo(
    () =>
      reports.map((report) => {
        const label = psitLabel(report.period_end);
        const text = normalize(
          [report.title, report.conclusion, ...report.items.map((i) => `${i.text} ${i.place ?? ""}`)].join(" ")
        );
        return { report, label, text, day: parisDay(report.period_end), weekKey: `${label.year}-${label.week}` };
      }),
    [reports]
  );

  const weeks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const { label, weekKey } of prepared) {
      if (!seen.has(weekKey)) seen.set(weekKey, `Semaine ${label.week} (${label.year})`);
    }
    return [...seen.entries()];
  }, [prepared]);

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return prepared.filter((entry) => {
      if (week !== "all" && entry.weekKey !== week) return false;
      if (from && entry.day < from) return false;
      if (to && entry.day > to) return false;
      return words.every((word) => entry.text.includes(word));
    });
  }, [prepared, query, week, from, to]);

  const hasFilter = query !== "" || week !== "all" || from !== "" || to !== "";

  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisible(PAGE_SIZE);
    };
  }

  function reset() {
    setQuery("");
    setWeek("all");
    setFrom("");
    setTo("");
    setVisible(PAGE_SIZE);
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder="Rechercher un mot-clé dans les points de situation…"
          value={query}
          onChange={(e) => update(setQuery)(e.target.value)}
          aria-label="Rechercher un mot-clé dans les points de situation"
        />
        <select className={styles.control} value={week} onChange={(e) => update(setWeek)(e.target.value)} aria-label="Semaine">
          <option value="all">Toutes les semaines</option>
          {weeks.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className={styles.dateField}>
          Du
          <input type="date" className={styles.control} value={from} max={to || undefined} onChange={(e) => update(setFrom)(e.target.value)} />
        </label>
        <label className={styles.dateField}>
          au
          <input type="date" className={styles.control} value={to} min={from || undefined} onChange={(e) => update(setTo)(e.target.value)} />
        </label>
      </div>
      <div className={styles.filterFooter}>
        <span>
          {filtered.length} point{filtered.length > 1 ? "s" : ""} de situation
        </span>
        {hasFilter ? (
          <button type="button" className={styles.reset} onClick={reset}>
            Réinitialiser
          </button>
        ) : null}
      </div>

      <div className={styles.list}>
        {filtered.slice(0, visible).map(({ report, label }) => {
          const themes = reportThemes(report.items).slice(0, 3);
          return (
            <Link key={report.id} href={`/zones/${zoneSlug}/analyse/point-de-situation/${report.id}`} className={styles.card}>
              <span className={styles.imageWrap}>
                {report.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={report.image_url} alt="" className={styles.image} />
                ) : null}
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardLabel}>{label.full}</span>
                <span className={styles.cardTitle}>{report.title}</span>
                <span className={styles.tags}>
                  {themes.map((theme) => (
                    <span key={theme} className={`${styles.tag} ${styles.tagMain}`}>
                      <ThemeIcon theme={theme} size={14} />
                      {themeShortLabel(theme)}
                    </span>
                  ))}
                  <span className={styles.tag}>
                    {report.items.length} événement{report.items.length > 1 ? "s" : ""}
                  </span>
                  <span className={styles.period}>{periodText(report)}</span>
                </span>
              </span>
            </Link>
          );
        })}
        {filtered.length > visible ? (
          <button type="button" className={styles.more} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Afficher plus ({filtered.length - visible} restants)
          </button>
        ) : null}
        {filtered.length === 0 ? (
          <p className={styles.empty}>
            {reports.length === 0
              ? "Aucun point de situation publié pour le moment."
              : "Aucun point de situation ne correspond à ces filtres."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
