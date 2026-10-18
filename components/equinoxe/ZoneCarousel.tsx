"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ZONE_LABELS, type ZoneBriefCard, type ZoneSlug } from "@/lib/homeZones";
import styles from "./ZoneCarousel.module.css";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

interface ZoneCarouselProps {
  zone: ZoneSlug;
  briefs: ZoneBriefCard[];
  /** `dock` : bandeau au bas de l'écran (ordinateur) ; `inline` : dans la fiche (téléphone). */
  variant: "dock" | "inline";
  /** Article surligné (événement cliqué sur le globe) : amené au centre du bandeau. */
  highlightId?: number | null;
}

// Les derniers articles de la zone, en défilement horizontal.
export default function ZoneCarousel({ zone, briefs, variant, highlightId = null }: ZoneCarouselProps) {
  const scroller = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (highlightId == null) return;
    const card = scroller.current?.querySelector<HTMLElement>(`[data-brief-id="${highlightId}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [highlightId]);

  function scrollBy(direction: -1 | 1) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className={`${styles.carousel} ${variant === "dock" ? styles.dock : styles.inline}`} aria-label={`Derniers articles — ${ZONE_LABELS[zone]}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>Derniers articles · {ZONE_LABELS[zone]}</h3>
        <Link href={`/zones/${zone}/actualite`} className={styles.all}>
          Tout voir →
        </Link>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(-1)} aria-label="Articles précédents">
            ‹
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(1)} aria-label="Articles suivants">
            ›
          </button>
        </div>
      </div>

      {briefs.length === 0 ? (
        <p className={styles.empty}>Aucun article récent pour cette zone.</p>
      ) : (
        <ul className={styles.track} ref={scroller}>
          {briefs.map((brief) => (
            <li key={brief.id} className={styles.item} data-brief-id={brief.id}>
              <Link href={`/briefs/${brief.id}`} className={brief.id === highlightId ? `${styles.card} ${styles.cardHighlight}` : styles.card}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brief.imageUrl ?? `/equinoxe/hero-${zone}.webp`}
                  referrerPolicy="no-referrer"
                  alt=""
                  className={styles.image}
                  loading="lazy"
                />
                <span className={styles.body}>
                  <span className={styles.meta}>
                    {brief.publishedAt ? dateFormat.format(new Date(brief.publishedAt)) : ""}
                    {brief.veracity ? ` · ${brief.veracity}` : ""}
                  </span>
                  <span className={styles.cardTitle}>{brief.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
