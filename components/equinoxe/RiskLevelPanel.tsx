import styles from "./RiskLevelPanel.module.css";

const LEVELS = [
  { label: "Critique", description: "Conflit majeur / Situation très instable", color: "var(--status-critical)" },
  { label: "Danger", description: "Tension élevée / Risque d'escalade", color: "var(--status-danger)" },
  { label: "À surveiller", description: "Situation sensible", color: "var(--status-watch)" },
  { label: "Normal", description: "Situation stable", color: "var(--status-normal)" },
  { label: "Information", description: "Événement OSINT / Autre", color: "var(--status-info)" },
] as const;

export default function RiskLevelPanel() {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>
        <span className={styles.headingIcon} aria-hidden>
          ◎
        </span>
        Niveau de risque
        <span className={styles.info} aria-hidden title="Basé sur les événements des 90 derniers jours">
          ⓘ
        </span>
      </h2>
      <div className={styles.list}>
        {LEVELS.map((level) => (
          <div key={level.label} className={styles.item}>
            <span className={styles.dot} style={{ backgroundColor: level.color }} />
            <span className={styles.text}>
              <span className={styles.label}>{level.label}</span>
              <span className={styles.description}>{level.description}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
