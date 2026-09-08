"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./TimeRangeSlider.module.css";

const WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_RANGE_MS = 3 * DAY_MS;

export interface DateRange {
  start: Date;
  end: Date;
}

interface TimeRangeSliderProps {
  onChange: (range: DateRange) => void;
}

type DragMode = "start" | "end" | "range";

function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function formatDate(t: number): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(t));
}

/**
 * Interactive 3-month date range band: drag either handle to shrink/grow
 * the study window, or drag the highlighted middle to move the whole
 * window through time. Bounds are fixed at [today - 90j, today] — only
 * the selection inside that window moves.
 */
export default function TimeRangeSlider({ onChange }: TimeRangeSliderProps) {
  const bounds = useMemo(() => {
    const end = startOfDay(new Date()) + DAY_MS - 1;
    const start = end - WINDOW_DAYS * DAY_MS;
    return { start, end };
  }, []);

  const [selStart, setSelStart] = useState(bounds.start);
  const [selEnd, setSelEnd] = useState(bounds.end);

  const trackRef = useRef<HTMLDivElement>(null);
  const totalMs = bounds.end - bounds.start;

  useEffect(() => {
    onChange({ start: new Date(selStart), end: new Date(selEnd) });
    // Only re-run when the selection itself changes — `onChange` is an
    // inline callback from the parent and isn't stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selStart, selEnd]);

  // Handles are wired via a single stable handler (below) reading the drag
  // mode off a data attribute, rather than a per-handle factory called
  // during render — that pattern trips react-hooks/refs' static analysis
  // even though the ref is only ever actually read post-render.
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
    // Captured once per gesture from the latest render's state — the other
    // endpoint stays fixed for the duration of a single-handle drag.
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.rangeLabel}>
          {formatDate(selStart)} — {formatDate(selEnd)}
        </span>
        {!isFullRange && (
          <button type="button" className={styles.resetButton} onClick={resetFull}>
            Réinitialiser (3 mois)
          </button>
        )}
      </div>

      <div className={styles.track} ref={trackRef}>
        <div className={styles.trackBg} />
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
    </div>
  );
}
