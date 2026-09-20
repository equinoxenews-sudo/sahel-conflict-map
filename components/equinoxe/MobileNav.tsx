"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import styles from "./MobileNav.module.css";

type NavKey = "accueil" | "actualites" | "zones" | "tracking" | "espace";

const ICONS: Record<NavKey, ReactElement> = {
  accueil: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9s1.3-6.4 3.8-9z" />
    </svg>
  ),
  actualites: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M7 8.5h6M7 12h10M7 15.5h10" />
    </svg>
  ),
  zones: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6.5" cy="7" r="2.5" />
      <circle cx="17.5" cy="7" r="2.5" />
      <circle cx="6.5" cy="17" r="2.5" />
      <circle cx="17.5" cy="17" r="2.5" />
    </svg>
  ),
  tracking: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </svg>
  ),
  espace: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 4.2-6 7.5-6s6 2 7.5 6" />
    </svg>
  ),
};

const ITEMS: { key: NavKey; label: string }[] = [
  { key: "accueil", label: "Accueil" },
  { key: "actualites", label: "Actualités" },
  { key: "zones", label: "Zones" },
  { key: "tracking", label: "Suivi" },
  { key: "espace", label: "Mon espace" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const homeTab = searchParams.get("tab") ?? "accueil";

  function isActive(key: NavKey) {
    if (key === "tracking") return pathname === "/zones/tracking";
    if (key === "espace") return pathname === "/mon-espace";
    if (!isHome) return false;
    return homeTab === key;
  }

  function handleClick(key: NavKey) {
    if (key === "tracking") {
      router.push("/zones/tracking");
      return;
    }
    if (key === "espace") {
      router.push("/mon-espace");
      return;
    }
    const target = key === "accueil" ? "/" : `/?tab=${key}`;
    router.push(target);
  }

  return (
    <nav className={styles.nav}>
      {ITEMS.map((item) => {
        const active = isActive(item.key);
        return (
          <button
            key={item.key}
            type="button"
            className={active ? `${styles.item} ${styles.itemActive}` : styles.item}
            onClick={() => handleClick(item.key)}
          >
            <span className={styles.icon}>{ICONS[item.key]}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
