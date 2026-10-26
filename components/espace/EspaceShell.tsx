"use client";

import { Suspense, type ReactNode } from "react";
import Header from "@/components/equinoxe/Header";
import CloudAutoSave from "@/components/investigation/CloudAutoSave";
import EspaceRail from "./EspaceRail";
import styles from "./EspaceShell.module.css";

// Cadre de « Mon espace » : bandeau du site, état de la copie en ligne des dossiers, menu de gauche et page.
export default function EspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Header />
      <CloudAutoSave />
      <div className={styles.body}>
        <Suspense fallback={<div className={styles.railFallback} />}>
          <EspaceRail />
        </Suspense>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
