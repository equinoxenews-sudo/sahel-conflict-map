"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ESPACE_NAV, activeSection, type EspaceSection } from "@/lib/espace";
import EspaceIcon from "./EspaceIcon";
import styles from "./EspaceRail.module.css";

// Menu de gauche de « Mon espace » : seules les icônes sont visibles ; le menu se déploie au passage de la souris
// (ou au clavier) et chaque entrée s'allume au survol, sans clic. L'entrée de la page ouverte reste en évidence.
// Une entrée verrouillée (rubrique pas encore ouverte à ce compte) garde son lien mais porte la pastille « Bientôt » :
// c'est la page elle-même, côté serveur, qui refuse le contenu.
export default function EspaceRail({ locked = [] }: { locked?: readonly EspaceSection[] }) {
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
            className={[styles.item, item.key === active ? styles.itemActive : "", locked.includes(item.key) ? styles.itemLocked : ""].filter(Boolean).join(" ")}
          >
            <span className={styles.icon}>
              <EspaceIcon name={item.key} />
            </span>
            <span className={styles.label}>{item.label}</span>
            {locked.includes(item.key) ? <span className={styles.soon}>Bientôt</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
