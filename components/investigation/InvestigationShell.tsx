"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "@/components/equinoxe/Header";
import CloudAutoSave from "./CloudAutoSave";
import styles from "./InvestigationShell.module.css";

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/investigation", label: "Accueil", match: (p) => p === "/investigation" },
  { href: "/investigation/recherche", label: "Recherche", match: (p) => p.startsWith("/investigation/recherche") },
  { href: "/investigation/dossiers", label: "Dossiers", match: (p) => p.startsWith("/investigation/dossiers") },
  { href: "/investigation/toolbox", label: "Toolbox", match: (p) => p.startsWith("/investigation/toolbox") },
];

export default function InvestigationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.banner}>
        <strong>Dossiers enregistrés dans ce navigateur et copiés en ligne automatiquement</strong> (protégés par mot de
        passe), images et documents compris, quelques instants après chaque modification. Exportez en JSON pour garder
        aussi une copie de votre côté.
      </div>

      <CloudAutoSave />

      <nav className={styles.subnav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={item.match(pathname) ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
