"use client";

import { useEffect, useState } from "react";
import HexFlag from "@/components/investigation/HexFlag";
import type { EntityPopupData } from "@/lib/layers/types";
import styles from "./GlobeEntityPopup.module.css";

interface WikiCard {
  title: string;
  extract: string;
  image: string | null;
  url: string;
}

function significant(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !["satellite", "the", "les", "des"].includes(w));
}

/** Photo et résumé Wikipédia (français, puis anglais) : seulement si l'article trouvé
 *  porte bien le nom de l'objet, pour ne jamais afficher une photo sans rapport. */
async function lookupWiki(query: string, signal: AbortSignal): Promise<WikiCard | null> {
  const wanted = significant(query);
  if (!wanted.length) return null;
  for (const lang of ["fr", "en"]) {
    const search = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${query} satellite`)}&srlimit=3&format=json&origin=*`,
      { signal },
    ).then((r) => (r.ok ? r.json() : null));
    const hits = (search?.query?.search ?? []) as { title: string }[];
    const hit = hits.find((h) => wanted.every((w) => significant(h.title).includes(w)) || significant(h.title).includes(wanted[0]));
    if (!hit) continue;
    const summary = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, { signal }).then((r) =>
      r.ok ? r.json() : null,
    );
    if (!summary?.extract) continue;
    const sentence = String(summary.extract).split(/(?<=[.!?])s/).slice(0, 2).join(" ");
    return {
      title: summary.title,
      extract: sentence.length > 320 ? `${sentence.slice(0, 317)}…` : sentence,
      image: summary.thumbnail?.source ?? null,
      url: summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
    };
  }
  return null;
}

function WikiBlock({ query }: { query: string }) {
  const [card, setCard] = useState<WikiCard | null | "loading">("loading");
  useEffect(() => {
    const controller = new AbortController();
    lookupWiki(query, controller.signal)
      .then((c) => setCard(c))
      .catch(() => setCard(null));
    return () => controller.abort();
  }, [query]);
  if (card === "loading") return <p className={styles.wikiNote}>Recherche d’une photo…</p>;
  if (!card) return null;
  return (
    <div className={styles.wiki}>
      {card.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={card.image} alt={card.title} loading="lazy" referrerPolicy="no-referrer" />
      ) : null}
      <p className={styles.wikiText}>{card.extract}</p>
      <a className={styles.link} href={card.url} target="_blank" rel="noopener noreferrer">
        Wikipédia : {card.title} →
      </a>
    </div>
  );
}

interface GlobeEntityPopupProps {
  data: EntityPopupData;
  x: number;
  y: number;
  onClose: () => void;
}

// A small "bulle" anchored to the clicked point's screen position (see
// Globe3D.tsx's click handler) — deliberately not Cesium's default
// InfoBox (a large sidebar) or SelectionIndicator, neither of which
// matches this site's floating glass-card style.
export default function GlobeEntityPopup({ data, x, y, onClose }: GlobeEntityPopupProps) {
  return (
    <div className={styles.popup} style={{ left: x, top: y }}>
      <div className={styles.header}>
        <span className={styles.badge}>{data.badge}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      {data.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={data.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : null}
      <h3 className={styles.title}>
        {data.flagIso2 ? (
          <span className={styles.flag}>
            <HexFlag iso2={data.flagIso2} name={data.fields.find((f) => f.label === "Propriétaire")?.value ?? data.flagIso2.toUpperCase()} />
          </span>
        ) : null}
        {data.title}
      </h3>
      {data.fields.length > 0 ? (
        <dl className={styles.fields}>
          {data.fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <dt className={styles.fieldLabel}>{field.label}</dt>
              <dd className={styles.fieldValue}>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {data.href || data.links?.length ? (
        <div className={styles.links}>
          {data.href ? (
            <a className={styles.link} href={data.href} target={data.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              {data.hrefLabel ?? "Lire l’article →"}
            </a>
          ) : null}
          {data.links?.map((l) => (
            <a key={l.href} className={styles.link} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
      {data.wikiQuery ? <WikiBlock key={data.wikiQuery} query={data.wikiQuery} /> : null}
    </div>
  );
}
