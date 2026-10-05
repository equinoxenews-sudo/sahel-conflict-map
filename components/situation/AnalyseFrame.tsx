import Link from "next/link";
import Header from "@/components/equinoxe/Header";
import styles from "./AnalyseFrame.module.css";

interface AnalyseFrameProps {
  zoneName: string;
  /** Suite du titre après « ZONE — Analyse », par exemple « Point de situation ». */
  section?: string;
  backHref: string;
  children: React.ReactNode;
}

// Cadre commun des pages Analyse d'une zone : en-tête du site, barre de titre
// et contenu qui défile (la page Actualité, elle, est figée à la hauteur de l'écran).
export default function AnalyseFrame({ zoneName, section, backHref, children }: AnalyseFrameProps) {
  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.topBar}>
        <Link href={backHref} className={styles.back}>
          &lsaquo; Retour
        </Link>
        <h1 className={styles.title}>
          {zoneName.toUpperCase()} — Analyse{section ? ` — ${section}` : ""}
        </h1>
      </div>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
