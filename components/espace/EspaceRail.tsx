"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ESPACE_NAV, activeSection } from "@/lib/espace";
import EspaceIcon from "./EspaceIcon";
import styles from "./EspaceRail.module.css";

// Menu de gauche de « Mon espace » : seules les icônes sont visibles ; le menu se déploie au passage de la souris
// (ou au clavier) et chaque entrée s'allume au survol, sans clic. L'entrée de la page ouverte reste en évidence.
export default function EspaceRail() {
  const pathname = usePathname() ?? "";
  const view = useSearchParams().get("vue");
  const active = activeSection(pathname, view);

  return (
    <div className={styles.slot}>
      <nav className={styles.rail} aria-label="Mon espace">
        {ESPACE_NAV.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            aria-current={item.key === active ? "page" : undefined}
            className={item.key === active ? `${styles.item} ${styles.itemActive}` : styles.item}
          >
            <span className={styles.icon}>
              <EspaceIcon name={item.key} />
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
