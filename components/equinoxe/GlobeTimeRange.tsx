"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  MIN_RANGE_MS,
  absoluteLimits,
  clampSelection,
  defaultBounds,
  defaultSelection,
  fromInputValue,
  sameBounds,
  toInputValue,
  withEdge,
  type TimeBounds,
} from "@/lib/globeTimeRange";
import styles from "./GlobeTimeRange.module.css";

export interface GlobeDateRange {
  start: number;
  end: number;
}

interface GlobeTimeRangeProps {
  onChange: (range: GlobeDateRange) => void;
}

type DragMode = "start" | "end" | "range";

function formatDate(t: number): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(t));
}

/**
 * Bande de période du globe (couches datées : événements analysés, séismes, événements naturels, lancements ; avions, navires, satellites
 * et pays en crise n'ont pas de date propre et ne sont pas filtrés, voir l'effet de filtrage de Globe3D.tsx).
 *
 * Par défaut : les 5 derniers jours sélectionnés sur une frise de 10 jours, pour que la plage et ses poignées soient larges. Deux calendriers,
 * à gauche et à droite de la frise, l'allongent ou la raccourcissent (jusqu'à 60 jours d'historique et 30 jours à venir). Glisser une
 * poignée redimensionne la sélection, glisser la barre la déplace.
 */
export default function GlobeTimeRange(props: GlobeTimeRangeProps) {
  // Les dates dépendent du jour et du fuseau de la personne : le serveur ne peut pas les calculer. Il envoie un cadre vide de la bonne
  // hauteur, la bande se dessine dès que la page est chargée (sinon React garderait les positions calculées par le serveur).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? <TimeRangeBand {...props} /> : <div className={styles.panel} style={{ minHeight: 150 }} aria-hidden />;
}

function TimeRangeBand({ onChange }: GlobeTimeRangeProps) {
  // L'horloge n'est lue qu'au montage : la frise reste ancrée sur le jour d'ouverture de la page.
  const [now] = useState(() => Date.now());
  const [bounds, setBounds] = useState<TimeBounds>(() => defaultBounds(now));
  const [selection, setSelection] = useState<TimeBounds>(() => defaultSelection(now));
  const trackRef = useRef<HTMLDivElement>(null);
  const totalMs = bounds.end - bounds.start;
  const limits = absoluteLimits(now);

  useEffect(() => {
    onChange({ start: selection.start, end: selection.end });
    // `onChange` est un rappel en ligne du parent, instable d'un rendu à l'autre : seule la sélection doit relancer l'effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.start, selection.end]);

  const handlePointerDown = (downEvent: React.PointerEvent<HTMLDivElement>) => {
    downEvent.preventDefault();
    const mode = downEvent.currentTarget.dataset.mode as DragMode;
    const track = trackRef.current;
    if (!track) return;

    const xToTime = (clientX: number): number => {
      const rect = track.getBoundingClientRect();
      const fraction = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return bounds.start + fraction * totalMs;
    };

    const originTime = xToTime(downEvent.clientX);
    const origin = { ...selection };

    const handleMove = (e: PointerEvent) => {
      if (mode === "start") {
        const t = Math.min(xToTime(e.clientX), origin.end - MIN_RANGE_MS);
        setSelection({ start: Math.max(t, bounds.start), end: origin.end });
      } else if (mode === "end") {
        const t = Math.max(xToTime(e.clientX), origin.start + MIN_RANGE_MS);
        setSelection({ start: origin.start, end: Math.min(t, bounds.end) });
      } else {
        const delta = xToTime(e.clientX) - originTime;
        setSelection(clampSelection({ start: origin.start + delta, end: origin.end + delta }, bounds));
      }
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  /** Calendrier de gauche ou de droite : allonge ou raccourcit la frise ; la sélection reste dedans. */
  const changeEdge = (edge: "start" | "end", value: string) => {
    const next = withEdge(bounds, edge, value, now);
    if (sameBounds(next, bounds)) return;
    setBounds(next);
    setSelection((current) => clampSelection(current, next));
  };

  const reset = () => {
    setBounds(defaultBounds(now));
    setSelection(defaultSelection(now));
  };

  const startPct = ((selection.start - bounds.start) / totalMs) * 100;
  const endPct = ((selection.end - bounds.start) / totalMs) * 100;
  const isDefault = sameBounds(bounds, defaultBounds(now)) && sameBounds(selection, defaultSelection(now));
  // Repère « maintenant » : visible seulement si la frise s'étend au-delà d'aujourd'hui (lancements à venir).
  const nowPct = ((now - bounds.start) / totalMs) * 100;
  const showNow = now < bounds.end - 24 * 60 * 60 * 1000 && nowPct > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </span>
          Période
        </h2>
        {!isDefault ? (
          <button type="button" className={styles.resetBtn} onClick={reset}>
            Réinitialiser
          </button>
        ) : null}
      </div>

      <p className={styles.rangeLabel}>
        {formatDate(selection.start)} — {formatDate(selection.end)}
      </p>

      <div className={styles.track} ref={trackRef}>
        <div className={styles.trackBg} />
        {showNow ? <div className={styles.nowMark} style={{ left: `${nowPct}%` }} title="Aujourd’hui" /> : null}
        <div className={styles.selectedRange} style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} data-mode="range" onPointerDown={handlePointerDown} />
        <div className={styles.handle} style={{ left: `${startPct}%` }} data-mode="start" onPointerDown={handlePointerDown} />
        <div className={styles.handle} style={{ left: `${endPct}%` }} data-mode="end" onPointerDown={handlePointerDown} />
      </div>

      <div className={styles.boundsLabels}>
        <label className={styles.calendar} title="Début de la frise : choisir une date pour l’allonger ou la raccourcir">
          <span className={styles.calendarLabel}>Du</span>
          <input
            type="date"
            className={styles.dateInput}
            value={toInputValue(bounds.start)}
            min={toInputValue(limits.start)}
            max={toInputValue(bounds.end)}
            onChange={(event) => event.target.value && fromInputValue(event.target.value, false) !== null && changeEdge("start", event.target.value)}
            aria-label="Début de la frise"
          />
        </label>
        <label className={`${styles.calendar} ${styles.calendarEnd}`} title="Fin de la frise : choisir une date pour l’allonger ou la raccourcir">
          <span className={styles.calendarLabel}>Au</span>
          <input
            type="date"
            className={styles.dateInput}
            value={toInputValue(bounds.end)}
            min={toInputValue(bounds.start)}
            max={toInputValue(limits.end)}
            onChange={(event) => event.target.value && fromInputValue(event.target.value, true) !== null && changeEdge("end", event.target.value)}
            aria-label="Fin de la frise"
          />
        </label>
      </div>
      <p className={styles.scope}>Événements analysés · Séismes · Événements naturels · Lancements</p>
    </div>
  );
}
