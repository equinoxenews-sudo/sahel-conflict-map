"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { applyFilters, type FakeEvent } from "@/lib/supervision/dashboard/fixtures";
import { BAND_LABELS, bandFor } from "@/lib/supervision/dashboard/layout";
import { effectiveFilters, THEMES, type Filters, type WidgetConfig } from "@/lib/supervision/dashboard/state";
import { ModuleBody } from "./LabModules";
import styles from "./Lab.module.css";

/**
 * Taille (en pixels) d'un élément, tenue à jour par ResizeObserver : le rendu d'un module dépend de SES dimensions.
 * Pendant une animation de la grille la taille change à chaque image : on ne redessine tout de suite que si le niveau de détail
 * (compact, standard, développé) change, sinon au plus une fois toutes les 120 ms (sur téléphone, une mise à jour par image
 * et par module dépassait les 200 ms d'interaction jugées acceptables).
 */
const SIZE_UPDATE_MS = 120;

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: number | undefined;
    let latest = { w: 0, h: 0 };
    const apply = () => {
      timer = undefined;
      setSize((previous) => (previous.w === latest.w && previous.h === latest.h ? previous : latest));
    };
    const observer = new ResizeObserver(([entry]) => {
      latest = { w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) };
      setSize((previous) => {
        if (previous.w === 0 || bandFor(previous.w, previous.h) !== bandFor(latest.w, latest.h)) return latest; // premier affichage, changement de niveau
        return previous;
      });
      if (timer === undefined) timer = window.setTimeout(apply, SIZE_UPDATE_MS);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
  return { ref, size };
}

export interface LabActions {
  update: (id: string, patch: Partial<Omit<WidgetConfig, "id" | "kind">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  reset: (id: string) => void;
  select: (id: string | null) => void;
  fullscreen: (id: string | null) => void;
}

interface LabFrameProps {
  widget: WidgetConfig | undefined;
  globals: Filters;
  events: FakeEvent[];
  now: number;
  editable: boolean;
  selected: boolean;
  /** Identité stable : ne change jamais d'un rendu à l'autre. */
  actions: LabActions;
  fullscreen?: boolean;
}

/**
 * Cadre d'un module : titre (poignée de déplacement), fraîcheur, filtres, états vide/chargement/erreur/obsolète, boutons d'édition.
 * Mémoïsé : un module ne se redessine que si SES propres réglages changent (sur téléphone, redessiner les huit à chaque clic
 * dépassait 300 ms, seuil à partir duquel Vercel signale un problème d'interaction).
 */
function LabFrameView({ widget, globals, events, now, editable, selected, actions, fullscreen = false }: LabFrameProps) {
  const id = widget?.id ?? "";
  const { ref, size } = useElementSize<HTMLDivElement>();
  const { filters, overridesGlobal } = widget ? effectiveFilters(widget, globals) : { filters: globals, overridesGlobal: false };
  const filtered = useMemo(() => applyFilters(events, filters, now), [events, filters, now]);
  if (!widget) return null;

  const band = bandFor(size.w, size.h);
  const themeLabel = THEMES.find((t) => t.key === filters.theme)?.label ?? "";
  const stale = widget.demoState === "stale";

  return (
    <section
      ref={ref}
      className={`${styles.frame} ${selected && editable ? styles.frameSelected : ""} ${fullscreen ? styles.frameFull : ""}`}
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

const LabFrame = memo(LabFrameView);
export default LabFrame;
