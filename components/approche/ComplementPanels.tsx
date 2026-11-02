import type { ComplementPanel } from "@/lib/approche/complements";
import MetricCard from "./MetricCard";
import styles from "./Approche.module.css";

interface ComplementPanelsProps {
  panels: ComplementPanel[];
}

// Données complémentaires d'un onglet : un panneau dépliable par rubrique, refermé par défaut, lignes compactes (libellé, valeur,
// unité, millésime, statut) dont le clic ouvre la source. Un panneau n'existe que si la fiche documente au moins une valeur.
export default function ComplementPanels({ panels }: ComplementPanelsProps) {
  if (panels.length === 0) return null;
  return (
    <section className={styles.complements} aria-label="Données complémentaires">
      {panels.map((panel) => (
        <details key={panel.id} className={styles.compPanel}>
          <summary>
            <span className={styles.compTitle}>{panel.title}</span>
            <span className={styles.compCount}>
              {panel.rows.length} indicateur{panel.rows.length > 1 ? "s" : ""}
            </span>
          </summary>
          <div className={styles.rows}>
            {panel.rows.map((row) => (
              <MetricCard
                key={row.id}
                variant="row"
                label={row.label}
                metric={row.metric}
                missing="À vérifier sur la source officielle"
                badge={row.metric ? "Vérifié" : "À vérifier"}
              />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
