"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyFilters } from "@/lib/supervision/lab/fixtures";
import { BAND_LABELS, bandFor } from "@/lib/supervision/lab/layout";
import { effectiveFilters, THEMES } from "@/lib/supervision/lab/state";
import { useLab } from "./LabContext";
import { ModuleBody } from "./LabModules";
import styles from "./Lab.module.css";

/** Taille (en pixels) d'un élément, tenue à jour par ResizeObserver : le rendu d'un module dépend de SES dimensions. */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize((previous) => (Math.abs(previous.w - box.width) < 1 && Math.abs(previous.h - box.height) < 1 ? previous : { w: Math.round(box.width), h: Math.round(box.height) }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

/** Cadre d'un module : titre (poignée de déplacement), fraîcheur, filtres, états vide/chargement/erreur/obsolète, boutons d'édition. */
export default function LabFrame({ id, fullscreen = false }: { id: string; fullscreen?: boolean }) {
  const { state, events, now, editable, selectedId, actions } = useLab();
  const widget = state.widgets[id];
  const { ref, size } = useElementSize<HTMLDivElement>();
  const { filters, overridesGlobal } = widget ? effectiveFilters(widget, state.globals) : { filters: state.globals, overridesGlobal: false };
  const filtered = useMemo(() => applyFilters(events, filters, now), [events, filters, now]);
  if (!widget) return null;

  const band = bandFor(size.w, size.h);
  const themeLabel = THEMES.find((t) => t.key === filters.theme)?.label ?? "";
  const stale = widget.demoState === "stale";

  return (
    <section
      ref={ref}
      className={`${styles.frame} ${selectedId === id && editable ? styles.frameSelected : ""} ${fullscreen ? styles.frameFull : ""}`}
      data-band={band}
      aria-label={widget.title}
      onPointerDownCapture={() => editable && !fullscreen && actions.select(id)}
    >
      <header className={styles.frameHead}>
        <div className={`${styles.frameTitle} ${editable && !fullscreen ? styles.handle : ""}`} data-lab-handle>
          <h3>{widget.title}</h3>
          <span className={styles.fresh} data-stale={stale || undefined}>{stale ? "Mis à jour il y a 3 jours" : "Mis à jour il y a 12 min"}</span>
        </div>
        <div className={styles.frameActions}>
          <button type="button" className={styles.iconBtn} aria-label="Plein écran" title="Plein écran" onClick={() => actions.fullscreen(fullscreen ? null : id)}>
            {fullscreen ? "✕" : "⤢"}
          </button>
          {editable && !fullscreen ? (
            <>
              <button type="button" className={styles.iconBtn} aria-label="Configurer" title="Configurer" onClick={() => actions.select(id)}>
                ⚙
              </button>
              <button type="button" className={styles.iconBtn} aria-label="Dupliquer" title="Dupliquer" onClick={() => actions.duplicate(id)}>
                ⧉
              </button>
              <button type="button" className={`${styles.iconBtn} ${styles.danger}`} aria-label="Supprimer" title="Supprimer" onClick={() => actions.remove(id)}>
                🗑
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className={styles.frameSub}>
        <span>{filters.periodDays} j · {themeLabel}</span>
        <span className={styles.badge}>{widget.follow ? (overridesGlobal ? "filtre local prioritaire" : "suit les filtres globaux") : "filtres propres"}</span>
        <span className={styles.badge} title="Rendu adaptatif d'après les dimensions du module">
          {BAND_LABELS[band]} · {size.w}×{size.h}
        </span>
      </div>

      <div className={styles.frameBody} data-stale={stale || undefined}>
        {stale ? <p className={styles.staleNote}>Données de plus de 48 h : ce n&apos;est pas la situation actuelle.</p> : null}
        {widget.demoState === "loading" ? (
          <div className={styles.skeleton} aria-busy="true"><i /><i /><i /></div>
        ) : widget.demoState === "error" ? (
          <div className={styles.errorBox}>
            <p>Impossible de charger ce module.</p>
            <button type="button" className={styles.btn} onClick={() => actions.update(id, { demoState: "normal" })}>Réessayer</button>
          </div>
        ) : widget.demoState === "empty" ? (
          <p className={styles.muted}>Aucun résultat dans la collecte disponible.</p>
        ) : (
          <ModuleBody kind={widget.kind} band={band} events={filtered} now={now} />
        )}
      </div>
    </section>
  );
}
