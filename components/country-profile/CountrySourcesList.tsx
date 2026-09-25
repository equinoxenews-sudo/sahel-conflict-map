import type { CountrySource } from "@/types/country";
import styles from "./CountryProfilePage.module.css";

const TYPE_LABELS: Record<CountrySource["type"], string> = {
  institutional: "Institutionnelle",
  media: "Média",
  osint: "OSINT",
  database: "Base de données",
  other: "Autre",
};

export default function CountrySourcesList({ sources }: { sources: CountrySource[] }) {
  if (sources.length === 0) {
    return <div className={styles.emptyState}>Aucune source renseignée pour l&apos;instant.</div>;
  }

  return (
    <div className={styles.sourcesList}>
      {sources.map((source) => (
        <div key={source.id} className={styles.sourceRow}>
          <div>
            <div className={styles.sourceTitle}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              ) : (
                source.title
              )}
            </div>
            {source.notes && <div className={styles.sourceMeta}>{source.notes}</div>}
          </div>
          <div className={styles.sourceMeta}>
            {TYPE_LABELS[source.type]}
            {source.publisher ? ` · ${source.publisher}` : ""}
            {source.accessedAt ? ` · consulté le ${source.accessedAt}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
