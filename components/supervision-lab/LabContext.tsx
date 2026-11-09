"use client";

import { createContext, useContext } from "react";
import type { FakeEvent } from "@/lib/supervision/lab/fixtures";
import type { LabState, WidgetConfig } from "@/lib/supervision/lab/state";

// Contexte du prototype : tout ce dont un module a besoin, sans que les moteurs de grille (qui n'affichent que des cases) le sachent.

export interface LabActions {
  update: (id: string, patch: Partial<Omit<WidgetConfig, "id" | "kind">>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  reset: (id: string) => void;
  select: (id: string | null) => void;
  fullscreen: (id: string | null) => void;
}

export interface LabContextValue {
  state: LabState;
  events: FakeEvent[];
  now: number;
  editable: boolean;
  selectedId: string | null;
  actions: LabActions;
}

export const LabContext = createContext<LabContextValue | null>(null);

export function useLab(): LabContextValue {
  const value = useContext(LabContext);
  if (!value) throw new Error("useLab doit être utilisé dans LabShell.");
  return value;
}
