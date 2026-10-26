import type { ReactNode } from "react";
import type { EspaceSection } from "@/lib/espace";
import styles from "./ComingSoon.module.css";
import EspaceTitle from "./EspaceTitle";

interface ComingSoonProps {
  /** Rubrique du menu : son icône s'affiche à gauche du titre. */
  section: EspaceSection;
  title: string;
  /** Une phrase : à quoi servira cette page. */
  summary: string;
  /** Ce que la page permettra, en quelques lignes. */
  points: string[];
  children?: ReactNode;
}

// Page d'une rubrique de « Mon espace » pas encore ouverte : l'emplacement existe dans le menu, la page dit
// honnêtement ce qui viendra, sans rien simuler.
export default function ComingSoon({ section, title, summary, points, children }: ComingSoonProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.badge}>Bientôt</span>
      <EspaceTitle section={section}>{title}</EspaceTitle>
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
