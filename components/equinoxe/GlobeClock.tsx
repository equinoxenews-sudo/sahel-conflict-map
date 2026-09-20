"use client";

import { useEffect, useState } from "react";
import { useHasMounted } from "@/lib/useHasMounted";
import styles from "./GlobeClock.module.css";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatUtcOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMin) / 60);
  const minutes = Math.abs(offsetMin) % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function GlobeClock() {
  // Only the interval subscription happens in the effect; the actual
  // date is client-only (see useHasMounted) so server and first client
  // render both show nothing, avoiding a hydration mismatch on the
  // second-by-second clock value.
  const mounted = useHasMounted();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.clock}>
      <span className={styles.date}>{capitalize(DATE_FORMATTER.format(now))}</span>
      <span className={styles.time}>{TIME_FORMATTER.format(now)}</span>
      <span className={styles.offset}>{formatUtcOffset(now)}</span>
    </div>
  );
}
