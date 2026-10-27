import { CONFIDENCE_LEVELS, confidenceColor } from "@/lib/confidence";
import styles from "./ConfidenceBar.module.css";

interface Props {
  percent: number;
  label: string;
  sourceCount?: number | null;
  claimedBy?: string | null;
  /** Version compacte pour les vignettes (sans légende des tranches). */
  compact?: boolean;
  /** Version de la carte d'actualité : nombre de sources et étiquette sur une ligne, petite barre en dégradé. */
  card?: boolean;
}

/** Indice de confiance d'une synthèse : barre graduée par tranches et curseur. */
export default function ConfidenceBar({ percent, label, sourceCount, claimedBy, compact, card }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const color = confidenceColor(label);
  if (card) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>
          {sourceCount != null && (
            <span className={styles.sources}>
              {sourceCount} source{sourceCount > 1 ? "s" : ""}
            </span>
          )}
          <span className={styles.label} style={{ color }}>
            {label} · {p} %
          </span>
        </div>
        <div
          className={styles.cardBar}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p}
          aria-label={`Indice de confiance : ${label}, ${p} %`}
        >
          <span className={styles.cardMarker} style={{ left: `${p}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className={compact ? `${styles.wrap} ${styles.compact}` : styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label} style={{ color }}>
          {label} · {p} %
        </span>
        {sourceCount != null && (
          <span className={styles.sources}>
            {sourceCount} source{sourceCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div
        className={styles.bar}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label={`Indice de confiance : ${label}, ${p} %`}
      >
        {CONFIDENCE_LEVELS.map((level) => (
          <span
            key={level.label}
            className={styles.segment}
            style={{ width: `${level.max - level.min}%`, background: level.color }}
            title={`${level.label} (${level.min}-${level.max} %)`}
          />
        ))}
        <span className={styles.cursor} style={{ left: `${p}%` }} />
      </div>
      {claimedBy && <p className={styles.claim}>Revendiqué par {claimedBy}</p>}
    </div>
  );
}
