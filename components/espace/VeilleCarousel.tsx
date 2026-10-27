"use client";

import { useEffect, useState } from "react";
import DragScroll from "./DragScroll";
import styles from "./VeilleCarousel.module.css";

interface VeilleItem {
  id: number;
  url: string;
  source: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: string;
  pickedAt: string;
}

type State = { status: "loading" } | { status: "ready"; items: VeilleItem[] } | { status: "error"; message: string };

/** Une vignette est « nouvelle » pendant la semaine qui suit son choix (le passage a lieu le dimanche soir). */
const NEW_FOR_MS = 7 * 86_400_000;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Thumb({ item }: { item: VeilleItem }) {
  const [broken, setBroken] = useState(false);
  if (!item.imageUrl || broken) return <div className={`${styles.photo} ${styles.noPhoto}`} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- image d'un site tiers, adresse variable
    <img
      src={item.imageUrl}
      alt=""
      className={styles.photo}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}

// Fil d'actualité OSINT et IA du Menu : une vignette par article (photo, titre et résumé en français, source), qui ouvre
// l'article d'origine dans un nouvel onglet. Les articles sont choisis chaque dimanche soir (scripts/veille-osint.ts).
export default function VeilleCarousel() {
  const [state, setState] = useState<State>({ status: "loading" });
  // Instant de référence pris au montage (un rendu pur ne lit pas l'horloge).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/espace/veille", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { items?: VeilleItem[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? `Erreur ${response.status}`);
        if (!cancelled) setState({ status: "ready", items: body.items ?? [] });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "Veille indisponible." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.wrap} aria-label="Actualité OSINT et IA">
      <h2 className={styles.kicker}>Veille · OSINT et intelligence artificielle</h2>
      {state.status === "loading" && <p className={styles.note}>Chargement…</p>}
      {state.status === "error" && <p className={styles.note}>{state.message}</p>}
      {state.status === "ready" && state.items.length === 0 && (
        <p className={styles.note}>
          Les articles de la semaine arrivent ici chaque dimanche soir, vers 19 h : titre et résumé en français, avec un lien vers
          l&apos;article d&apos;origine.
        </p>
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <DragScroll>
          {state.items.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className={styles.card} draggable={false}>
              <Thumb item={item} />
              <div className={styles.body}>
                <div className={styles.meta}>
                  <span className={styles.source}>{item.source}</span>
                  <span>{shortDate(item.publishedAt)}</span>
                  {now - new Date(item.pickedAt).getTime() < NEW_FOR_MS && <span className={styles.badge}>Nouveau</span>}
                </div>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.summary}>{item.summary}</span>
              </div>
            </a>
          ))}
        </DragScroll>
      )}
    </section>
  );
}
