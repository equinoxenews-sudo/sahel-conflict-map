"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ZONE_BRIEF_DAYS, ZONE_LABELS, type ZoneBriefCard, type ZoneSlug } from "@/lib/homeZones";
import styles from "./ZoneCarousel.module.css";
import { briefImageSrc } from "@/lib/imageUrls";
import { setHoveredBrief } from "@/lib/briefHover";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

interface ZoneCarouselProps {
  zone: ZoneSlug;
  briefs: ZoneBriefCard[];
  /** `dock` : bandeau au bas de l'écran (ordinateur) ; `inline` : dans la fiche (téléphone). */
  variant: "dock" | "inline";
  /** Article surligné (événement cliqué sur le globe) : amené au centre du bandeau. */
  highlightId?: number | null;
}

// Les articles des cinq derniers jours de la zone, en défilement horizontal ; l'historique complet est dans Actualités.
export default function ZoneCarousel({ zone, briefs, variant, highlightId = null }: ZoneCarouselProps) {
  const scroller = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (highlightId == null) return;
    const card = scroller.current?.querySelector<HTMLElement>(`[data-brief-id="${highlightId}"]`);
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [highlightId]);

  // Bandeau fermé pendant un survol : le point du globe reprend sa taille.
  useEffect(() => () => setHoveredBrief(null), []);

  function scrollBy(direction: -1 | 1) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section className={`${styles.carousel} ${variant === "dock" ? styles.dock : styles.inline}`} aria-label={`Articles des ${ZONE_BRIEF_DAYS} derniers jours — ${ZONE_LABELS[zone]}`}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          {ZONE_BRIEF_DAYS} derniers jours · {ZONE_LABELS[zone]}
          {briefs.length > 0 ? ` (${briefs.length})` : ""}
        </h3>
        <Link href={`/zones/${zone}/actualite`} className={styles.all}>
          Historique complet →
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
        <p className={styles.empty}>Aucun article ces {ZONE_BRIEF_DAYS} derniers jours : l&apos;historique complet est dans Actualités.</p>
      ) : (
        <ul className={styles.track} ref={scroller}>
          {briefs.map((brief) => (
            <li key={brief.id} className={styles.item} data-brief-id={brief.id}>
              <Link
                href={`/briefs/${brief.id}`}
                // Survol : le point de l'événement grossit sur le globe et cesse de clignoter.
                onMouseEnter={() => setHoveredBrief(brief.id)}
                onMouseLeave={() => setHoveredBrief(null)}
                onFocus={() => setHoveredBrief(brief.id)}
                onBlur={() => setHoveredBrief(null)}
                className={brief.id === highlightId ? `${styles.card} ${styles.cardHighlight}` : styles.card}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={briefImageSrc(brief.imageUrl) ?? `/equinoxe/hero-${zone}.webp`}
                  referrerPolicy="no-referrer"
                  alt=""
                  className={styles.image}
                  loading="lazy"
                  // Image disparue chez la source : illustration de la zone plutôt qu'un cadre vide.
                  onError={(e) => {
                    const hero = `/equinoxe/hero-${zone}.webp`;
                    if (!e.currentTarget.src.endsWith(hero)) e.currentTarget.src = hero;
                  }}
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
