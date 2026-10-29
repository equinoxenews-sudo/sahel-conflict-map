"use client";

import { useId, useState } from "react";
import styles from "./Approche.module.css";

const LONG_TEXT = 210;

// Synthèse de l'en-tête : trois lignes au plus, le texte complet se déplie à la demande, pour ne pas masquer la photographie.
export default function HeroSummary({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_TEXT;
  return (
    <div className={styles.dekBlock}>
      <p id={id} className={long && !open ? `${styles.dek} ${styles.dekClamp}` : styles.dek}>
        {text}
      </p>
      {long ? (
        <button type="button" className={styles.dekToggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
          {open ? "Réduire la synthèse" : "Lire la synthèse"}
        </button>
      ) : null}
    </div>
  );
}
