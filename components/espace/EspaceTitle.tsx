import type { ReactNode } from "react";
import type { EspaceSection } from "@/lib/espace";
import EspaceIcon from "./EspaceIcon";
import styles from "./EspaceTitle.module.css";

// Titre d'une page de « Mon espace » : l'icône de la rubrique (la même que dans le menu) à gauche du nom.
export default function EspaceTitle({ section, children }: { section: EspaceSection; children: ReactNode }) {
  return (
    <h1 className={styles.title}>
      <span className={styles.icon}>
        <EspaceIcon name={section} />
      </span>
      {children}
    </h1>
  );
}
