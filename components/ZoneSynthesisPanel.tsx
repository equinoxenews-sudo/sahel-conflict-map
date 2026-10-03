import styles from "./ZoneSynthesisPanel.module.css";

interface ZoneSynthesisPanelProps {
  zoneName: string;
}

// Emplacement réservé à l'agent IA de synthèse politico-sécuritaire de la
// zone (articles Équinoxe + sources ouvertes), mise à jour quotidienne à
// 9 h si nécessaire. Volontairement vide de contenu tant que l'agent
// n'existe pas : aucun texte factice n'est affiché comme une synthèse.
export default function ZoneSynthesisPanel({ zoneName }: ZoneSynthesisPanelProps) {
  return (
    <section className={styles.panel} aria-label={`Synthèse ${zoneName}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Synthèse — {zoneName}</h2>
        <span className={styles.status}>Bientôt disponible</span>
      </div>
      <p className={styles.text}>
        Un agent IA analysera nos articles et des sources ouvertes pour proposer ici une synthèse des
        événements politico-sécuritaires de la zone, mise à jour chaque jour à 9 h si nécessaire.
      </p>
    </section>
  );
}
