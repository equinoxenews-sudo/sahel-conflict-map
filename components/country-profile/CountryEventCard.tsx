import type { ConflictEvent } from "@/types/event";
import { formatDate } from "@/lib/formatDate";
import styles from "./CountryProfilePage.module.css";

// Renders a ConflictEvent (the project's existing shared event type — see
// types/event.ts) as a card. Click target is a future /event/[id] page,
// not built yet, so this stays a plain (non-navigating) card for now.
export default function CountryEventCard({ event }: { event: ConflictEvent }) {
  return (
    <div className={styles.eventCard}>
      <div className={styles.eventMeta}>
        <span>{formatDate(event.event_date)}</span>
        <span>{event.country}</span>
        {event.reliability != null && <span>Fiabilité {event.reliability}/5</span>}
      </div>
      <span className={styles.eventTitle}>{event.category}</span>
      {event.summary && <p className={styles.eventSummary}>{event.summary}</p>}
      {event.source && <span className={styles.entityMeta}>Source : {event.source}</span>}
    </div>
  );
}
