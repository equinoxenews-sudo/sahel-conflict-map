import Link from "next/link";
import styles from "./WeeklySituationCard.module.css";

interface WeeklySituationCardProps {
  href: string;
}

export default function WeeklySituationCard({ href }: WeeklySituationCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.icon} aria-hidden>
        <IconDocument />
      </span>
      <h3 className={styles.title}>Point de situation hebdomadaire</h3>
      <p className={styles.description}>
        Une synthèse complète des événements majeurs de la semaine.
      </p>
      <Link href={href} className={styles.button}>
        <IconDocument />
        Lire le dernier rapport →
      </Link>
    </div>
  );
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3.5h9l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" />
    </svg>
  );
}
