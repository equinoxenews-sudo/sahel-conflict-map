import { Children, type ReactNode } from "react";
import styles from "./Approche.module.css";

/**
 * Grille des chiffres clés, commune aux six onglets. La disposition suit la largeur de la grille (pas celle de l'écran) et le
 * nombre de tuiles : 6 → 3×2, 5 → 3+2 sur une rangée équilibrée, 4 → 2×2 (4×1 en très large), 3 → 3×1 ; jamais une tuile orpheline.
 */
export default function KpiGrid({ children, compact = false }: { children: ReactNode; /** Bandeau de repères sur une ligne (peu de tuiles, décomptes éditoriaux) plutôt que de grandes tuiles. */ compact?: boolean }) {
  const cells = Children.toArray(children);
  return (
    <div className={compact ? `${styles.kpiGrid} ${styles.kpiCompact}` : styles.kpiGrid}>
      <div className={styles.kpiInner} data-count={cells.length}>
        {cells.map((cell, index) => (
          <div key={index} className={styles.kpiCell}>
            {cell}
          </div>
        ))}
      </div>
    </div>
  );
}
