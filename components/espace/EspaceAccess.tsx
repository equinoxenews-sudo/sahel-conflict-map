"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { EspaceSection } from "@/lib/espace";

// Les rubriques fermées au compte connecté, décidées par le serveur (app/mon-espace/layout.tsx) et lues par les écrans qui
// adaptent leur affichage (menu de gauche, tuiles du Menu). Ce n'est qu'un affichage : le refus réel est fait par chaque
// page, sur le serveur (SectionGate).
const LockedContext = createContext<readonly EspaceSection[]>([]);

export function EspaceAccessProvider({ locked, children }: { locked: readonly EspaceSection[]; children: ReactNode }) {
  return <LockedContext.Provider value={locked}>{children}</LockedContext.Provider>;
}

export function useLockedSections(): readonly EspaceSection[] {
  return useContext(LockedContext);
}
