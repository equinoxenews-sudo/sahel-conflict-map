"use client";

import { Suspense, type ReactNode } from "react";
import type { EspaceSection } from "@/lib/espace";
import Header from "@/components/equinoxe/Header";
import CloudAutoSave from "@/components/investigation/CloudAutoSave";
import { EspaceAccessProvider } from "./EspaceAccess";
import EspaceRail from "./EspaceRail";
import styles from "./EspaceShell.module.css";

// Cadre de « Mon espace » : bandeau du site, état de la copie en ligne des dossiers, menu de gauche et page.
// « locked » : les rubriques que le compte ne peut pas ouvrir (décidées par le serveur), marquées « Bientôt » dans le menu.
export default function EspaceShell({ children, locked = [] }: { children: ReactNode; locked?: readonly EspaceSection[] }) {
  return (
    <EspaceAccessProvider locked={locked}>
      <div className={styles.page}>
        <Header />
        <CloudAutoSave />
        <div className={styles.body}>
          <Suspense fallback={<div className={styles.railFallback} />}>
            <EspaceRail locked={locked} />
          </Suspense>
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </EspaceAccessProvider>
  );
}
