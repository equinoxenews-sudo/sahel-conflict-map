"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { APPROCHE_TABS, tabHref, type ApprocheTab } from "@/lib/approche/tabs";
import Icon from "./Icon";
import styles from "./Approche.module.css";

const TAB_ICONS: Record<ApprocheTab, string> = { overview: "map", relations: "handshake", economy: "chart", defense: "shield", issues: "target", outlook: "radar" };

// Les six onglets : adresses partageables (sous-pages pré-rendues), onglet actif en or ramené dans la vue sur petit écran,
// navigation fixe pendant le défilement sur ordinateur.
export default function TabNav({ basePath, active }: { basePath: string; active: ApprocheTab }) {
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const current = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const container = nav.current;
    if (current && container) container.scrollTo({ left: current.offsetLeft - container.clientWidth / 2 + current.clientWidth / 2, behavior: "auto" });
  }, [active]);

  return (
    <nav ref={nav} className={styles.tabs} aria-label="Sections de la fiche">
      {APPROCHE_TABS.map((item) => (
        <Link key={item.key} href={tabHref(basePath, item.key)} scroll={false} className={item.key === active ? `${styles.tab} ${styles.tabActive}` : styles.tab} aria-current={item.key === active ? "page" : undefined}>
          <Icon name={TAB_ICONS[item.key]} size={16} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
