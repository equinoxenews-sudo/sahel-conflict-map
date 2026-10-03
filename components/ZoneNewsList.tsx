"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import {
  EVENT_TYPES, isThemeKey, resolveEventType, resolveTheme, THEMES, themeShortLabel,
} from "@/lib/themes";
import { isValidVeracity, VERACITY_COLORS } from "@/lib/veracity";
import type { NewsItem } from "@/lib/africaNews";
import type { Article } from "@/types/article";
import type { ZoneBrief } from "@/types/brief";
import styles from "./ZoneNewsList.module.css";

type Period = "all" | "day" | "week" | "month" | "quarter";
type Slot = "all" | "morning" | "afternoon" | "evening";

const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: "all", label: "Toute la période (3 mois)", days: null },
  { value: "day", label: "24 dernières heures", days: 1 },
  { value: "week", label: "7 derniers jours", days: 7 },
  { value: "month", label: "30 derniers jours", days: 30 },
];

const SLOTS: { value: Slot; label: string }[] = [
  { value: "all", label: "Tous les créneaux" },
  { value: "morning", label: "Matin (avant 12 h)" },
  { value: "afternoon", label: "Après-midi (12 h – 18 h)" },
  { value: "evening", label: "Soir (après 18 h)" },
];

const PAGE_SIZE = 30;

const parisHour = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" });

function slotOf(iso: string | null): Slot | null {
  if (!iso) return null;
  const hour = Number(parisHour.format(new Date(iso)));
  if (Number.isNaN(hour)) return null;
  if (hour < 12) return "morning";
  return hour < 18 ? "afternoon" : "evening";
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface ZoneNewsListProps {
  briefs: ZoneBrief[];
  articles: Article[];
  newsItems: NewsItem[];
}

export default function ZoneNewsList({ briefs, articles, newsItems }: ZoneNewsListProps) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [slot, setSlot] = useState<Slot>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  // Captured once per mount (useMemo must stay pure); minutes of drift are
  // immaterial for "24 dernières heures" style windows.
  const [now] = useState(() => Date.now());
  const useBriefs = briefs.length > 0;
  const useRealArticles = !useBriefs && articles.length > 0;

  const presentThemes = useMemo(() => {
    const keys = new Set<string>();
    briefs.forEach((b) => {
      const primary = resolveTheme(b);
      if (primary) keys.add(primary);
      b.secondary_themes?.forEach((t) => keys.add(t));
    });
    return THEMES.filter((t) => keys.has(t.key));
  }, [briefs]);

  const presentEventTypes = useMemo(() => {
    const keys = new Set(briefs.map(resolveEventType).filter((k): k is NonNullable<typeof k> => k !== null));
    return EVENT_TYPES.filter((t) => keys.has(t.key));
  }, [briefs]);

  const filteredBriefs = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const days = PERIODS.find((p) => p.value === period)?.days ?? null;
    const cutoff = days === null ? null : now - days * 86400000;
    return briefs.filter((b) => {
      if (theme !== "all" && resolveTheme(b) !== theme && !b.secondary_themes?.includes(theme)) return false;
      if (eventType !== "all" && resolveEventType(b) !== eventType) return false;
      if (cutoff !== null && (!b.published_at || new Date(b.published_at).getTime() < cutoff)) return false;
      if (slot !== "all" && slotOf(b.published_at) !== slot) return false;
      if (words.length > 0) {
        const haystack = normalize(`${b.title} ${b.summary}`);
        if (!words.every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [briefs, query, theme, eventType, period, slot, now]);

  const hasFilter = query !== "" || theme !== "all" || eventType !== "all" || period !== "all" || slot !== "all";

  function resetFilters() {
    setQuery("");
    setTheme("all");
    setEventType("all");
    setPeriod("all");
    setSlot("all");
    setVisible(PAGE_SIZE);
  }

  // Any filter change restarts pagination from the top.
  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisible(PAGE_SIZE);
    };
  }

  return (
    <div className={styles.container}>
      {useBriefs ? (
        <div className={styles.filters}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Rechercher un mot-clé…"
            value={query}
            onChange={(e) => withReset(setQuery)(e.target.value)}
            aria-label="Rechercher un mot-clé"
          />
          <div className={styles.filterGrid}>
            <select
              className={styles.filterSelect}
              value={theme}
              onChange={(e) => withReset(setTheme)(e.target.value)}
              aria-label="Thématique"
            >
              <option value="all">Toutes les thématiques</option>
              {presentThemes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={eventType}
              onChange={(e) => withReset(setEventType)(e.target.value)}
              aria-label="Type d'événement"
            >
              <option value="all">Tous les types d&apos;événement</option>
              {presentEventTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={period}
              onChange={(e) => withReset(setPeriod)(e.target.value as Period)}
              aria-label="Période"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={slot}
              onChange={(e) => withReset(setSlot)(e.target.value as Slot)}
              aria-label="Créneau horaire"
            >
              {SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterFooter}>
            <span>
              {filteredBriefs.length} synthèse{filteredBriefs.length > 1 ? "s" : ""}
            </span>
            {hasFilter ? (
              <button type="button" className={styles.resetBtn} onClick={resetFilters}>
                Réinitialiser
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.list}>
        {useBriefs
          ? filteredBriefs.slice(0, visible).map((b) => {
              const veracity = isValidVeracity(b.veracity) ? b.veracity : null;
              const primaryTheme = resolveTheme(b);
              const isGenericImage = b.image_url?.startsWith("/equinoxe/hero-") ?? false;
              return (
                <Link key={b.id} href={`/briefs/${b.id}`} className={styles.newsItem}>
                  {b.image_url ? (
                    <span className={styles.newsImageWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.image_url} alt="" className={styles.newsImage} />
                      {isGenericImage ? (
                        <span className={styles.genericTag} title="Illustration générique de la zone — ne représente pas cet événement précis">
                          Illustration
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  <div className={styles.newsItemBody}>
                    <div className={styles.newsHeader}>
                      <span className={styles.newsMeta}>
                        <span className={styles.newsDate}>{formatDate(b.published_at)}</span>
                        {primaryTheme && isThemeKey(primaryTheme) ? (
                          <span className={styles.themeTag}>{themeShortLabel(primaryTheme)}</span>
                        ) : null}
                      </span>
                      <span
                        className={styles.veracityBadge}
                        style={{ backgroundColor: veracity ? VERACITY_COLORS[veracity] : "#8b96a5" }}
                      >
                        {veracity ?? "Non évalué"}
                      </span>
                    </div>
                    <h2 className={styles.newsTitle}>{b.title}</h2>
                    <p className={styles.newsSummary}>{b.summary}</p>
                  </div>
                </Link>
              );
            })
          : useRealArticles
            ? articles.map((a) => (
                <article key={a.url} className={styles.newsItem}>
                  <div className={styles.newsItemBody}>
                    <span className={styles.newsDate}>{formatDate(a.published_at)}</span>
                    <h2 className={styles.newsTitle}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.title}
                      </a>
                    </h2>
                    <p className={styles.newsSummary}>Source : {a.domain}</p>
                  </div>
                </article>
              ))
            : newsItems.map((item) => (
                <article key={item.title} className={styles.newsItem}>
                  <div className={styles.newsItemBody}>
                    <span className={styles.newsDate}>{item.date}</span>
                    <h2 className={styles.newsTitle}>{item.title}</h2>
                    <p className={styles.newsSummary}>{item.summary}</p>
                  </div>
                </article>
              ))}
        {useBriefs && filteredBriefs.length > visible ? (
          <button type="button" className={styles.moreBtn} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Afficher plus ({filteredBriefs.length - visible} restantes)
          </button>
        ) : null}
        {useBriefs && filteredBriefs.length === 0 ? (
          <p className={styles.empty}>Aucune synthèse ne correspond à ces filtres.</p>
        ) : null}
      </div>
    </div>
  );
}
