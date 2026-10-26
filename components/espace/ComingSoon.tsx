import type { ReactNode } from "react";
import styles from "./ComingSoon.module.css";

interface ComingSoonProps {
  title: string;
  /** Une phrase : à quoi servira cette page. */
  summary: string;
  /** Ce que la page permettra, en quelques lignes. */
  points: string[];
  children?: ReactNode;
}

// Page d'une rubrique de « Mon espace » pas encore ouverte : l'emplacement existe dans le menu, la page dit
// honnêtement ce qui viendra, sans rien simuler.
export default function ComingSoon({ title, summary, points, children }: ComingSoonProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.badge}>Bientôt</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.summary}>{summary}</p>
      <ul className={styles.points}>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {children}
    </div>
  );
}
