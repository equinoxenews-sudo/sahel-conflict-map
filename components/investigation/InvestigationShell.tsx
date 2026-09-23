"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "@/components/equinoxe/Header";
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
        <strong>Données enregistrées sur cet appareil.</strong> Rien n&apos;est envoyé à un serveur — vos
        dossiers vivent dans ce navigateur. Exportez-les en JSON pour les sauvegarder ou les transférer.
      </div>

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
