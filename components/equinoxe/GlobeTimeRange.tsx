"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./GlobeTimeRange.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
// Covers the layers that actually carry a per-item date (séismes, feux
// de forêt/tempêtes/volcans/inondations, lancements) — wide enough to
// hold a EONET "open" event's recent history and Launch Library's
// upcoming window without being so wide the handles are hard to place.
const PAST_DAYS = 30;
const FUTURE_DAYS = 21;
const MIN_RANGE_MS = DAY_MS;

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
 * Compact date-range band for the globe's time-bound layers (séismes,
 * événements naturels, lancements) — aircraft/navires/satellites/pays en
 * crise have no meaningful per-item date and are unaffected regardless
 * of the selection (see Globe3D.tsx's eventTime filtering effect).
 * Interaction mirrors components/TimeRangeSlider.tsx (drag a handle to
 * resize, drag the middle to shift the window) restyled for this panel.
 */
export default function GlobeTimeRange({ onChange }: GlobeTimeRangeProps) {
  const bounds = useMemo(() => {
    const now = new Date().getTime();
    return { start: now - PAST_DAYS * DAY_MS, end: now + FUTURE_DAYS * DAY_MS };
  }, []);
  const totalMs = bounds.end - bounds.start;

  const [selStart, setSelStart] = useState(bounds.start);
  const [selEnd, setSelEnd] = useState(bounds.end);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChange({ start: selStart, end: selEnd });
    // `onChange` is an inline callback from the parent, not stable across
    // renders — only the selection itself should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selStart, selEnd]);

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
    const originSel = { start: selStart, end: selEnd };

    const handleMove = (e: PointerEvent) => {
      if (mode === "start") {
        const t = Math.min(xToTime(e.clientX), originSel.end - MIN_RANGE_MS);
        setSelStart(Math.max(t, bounds.start));
      } else if (mode === "end") {
        const t = Math.max(xToTime(e.clientX), originSel.start + MIN_RANGE_MS);
        setSelEnd(Math.min(t, bounds.end));
      } else {
        const deltaMs = xToTime(e.clientX) - originTime;
        const width = originSel.end - originSel.start;
        let newStart = originSel.start + deltaMs;
        let newEnd = originSel.end + deltaMs;
        if (newStart < bounds.start) {
          newStart = bounds.start;
          newEnd = newStart + width;
        }
        if (newEnd > bounds.end) {
          newEnd = bounds.end;
          newStart = newEnd - width;
        }
        setSelStart(newStart);
        setSelEnd(newEnd);
      }
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const resetFull = () => {
    setSelStart(bounds.start);
    setSelEnd(bounds.end);
  };

  const startPct = ((selStart - bounds.start) / totalMs) * 100;
  const endPct = ((selEnd - bounds.start) / totalMs) * 100;
  const isFullRange = selStart === bounds.start && selEnd === bounds.end;
  // bounds itself is anchored to "now" (see the useMemo above), so this
  // fraction is fixed by the two day-count constants — no need to read
  // the clock again here.
  const nowPct = (PAST_DAYS / (PAST_DAYS + FUTURE_DAYS)) * 100;

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
        {!isFullRange ? (
          <button type="button" className={styles.resetBtn} onClick={resetFull}>
            Réinitialiser
          </button>
        ) : null}
      </div>

      <p className={styles.rangeLabel}>
        {formatDate(selStart)} — {formatDate(selEnd)}
      </p>

      <div className={styles.track} ref={trackRef}>
        <div className={styles.trackBg} />
        <div className={styles.nowMark} style={{ left: `${nowPct}%` }} title="Maintenant" />
        <div
          className={styles.selectedRange}
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
          data-mode="range"
          onPointerDown={handlePointerDown}
        />
        <div
          className={styles.handle}
          style={{ left: `${startPct}%` }}
          data-mode="start"
          onPointerDown={handlePointerDown}
        />
        <div
          className={styles.handle}
          style={{ left: `${endPct}%` }}
          data-mode="end"
          onPointerDown={handlePointerDown}
        />
      </div>

      <div className={styles.boundsLabels}>
        <span>{formatDate(bounds.start)}</span>
        <span>{formatDate(bounds.end)}</span>
      </div>
      <p className={styles.scope}>Séismes · Événements naturels · Lancements</p>
    </div>
  );
}
