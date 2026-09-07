import styles from "./ThreatGauge.module.css";

interface ThreatGaugeProps {
  /** 0 = critique, 100 = safe */
  value: number;
}

export default function ThreatGauge({ value }: ThreatGaugeProps) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Niveau de menace</h2>
      <div className={styles.bar}>
        <div className={styles.cursor} style={{ left: `${value}%` }} />
      </div>
      <div className={styles.labels}>
        <span>Critique</span>
        <span>À surveiller</span>
        <span>Safe</span>
      </div>
    </div>
  );
}
