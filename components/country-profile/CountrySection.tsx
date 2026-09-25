import type { ReactNode } from "react";
import styles from "./CountryProfilePage.module.css";

interface CountrySectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export default function CountrySection({ id, title, children }: CountrySectionProps) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionHeading}>{title}</h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}
