"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createLocalStorageEngine, type InvestigationStorage } from "./storage";
import { emptyInvestigationData, type InvestigationData } from "./types";

interface InvestigationContextValue {
  data: InvestigationData;
  storage: InvestigationStorage;
}

const InvestigationReactContext = createContext<InvestigationContextValue | null>(null);

// A single stable reference — useSyncExternalStore calls getServerSnapshot
// on every hydration-phase render, and a freshly-built object each time
// (emptyInvestigationData() returns a new one) looks like a change every
// time, which loops forever.
const EMPTY_DATA = emptyInvestigationData();

export function InvestigationProvider({ children }: { children: ReactNode }) {
  // Lazy useState initializer (not a ref) — the linter's react-hooks/refs
  // rule flags reading `ref.current` during render even for a once-only
  // lazy-init pattern, so useState's own once-only initializer is used
  // instead. Identity stays stable across renders since setStorage is
  // never called.
  const [storage] = useState<InvestigationStorage>(() => createLocalStorageEngine());

  // useSyncExternalStore (not useState+useEffect) so the store — which
  // only exists in the browser (localStorage) — never mismatches between
  // server and client render: the server snapshot is always empty, and
  // React resyncs to the real data during hydration itself.
  const data = useSyncExternalStore(storage.subscribe, storage.load, () => EMPTY_DATA);

  const value = useMemo<InvestigationContextValue>(() => ({ data, storage }), [data, storage]);

  return <InvestigationReactContext.Provider value={value}>{children}</InvestigationReactContext.Provider>;
}

function useInvestigationContext(): InvestigationContextValue {
  const ctx = useContext(InvestigationReactContext);
  if (!ctx) throw new Error("useInvestigation* hooks must be used within an InvestigationProvider");
  return ctx;
}

export function useInvestigationStorage(): InvestigationStorage {
  return useInvestigationContext().storage;
}

export function useDossiers() {
  return useInvestigationContext().data.dossiers;
}

export function useDossier(dossierId: string) {
  return useInvestigationContext().data.dossiers.find((d) => d.id === dossierId) ?? null;
}

// Each hook below memoizes its filter on the underlying array + dossierId:
// `data.*` arrays are only ever replaced by an actual mutation (see the
// `cached` comment in storage.ts), so this gives callers a stable array
// reference across renders when nothing changed — required for anything
// downstream that depends on it (e.g. React Flow's node/edge sync effect
// in EntityGraphPanel, which loops forever otherwise).
export function useSources(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.sources.filter((s) => s.dossierId === dossierId), [data.sources, dossierId]);
}

export function useEntities(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.entities.filter((e) => e.dossierId === dossierId), [data.entities, dossierId]);
}

export function useRelations(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.relations.filter((r) => r.dossierId === dossierId), [data.relations, dossierId]);
}

export function useNotes(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.notes.filter((n) => n.dossierId === dossierId), [data.notes, dossierId]);
}

export function useCanvasCards(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.canvasCards.filter((c) => c.dossierId === dossierId), [data.canvasCards, dossierId]);
}

export function useCanvasLinks(dossierId: string) {
  const { data } = useInvestigationContext();
  return useMemo(() => data.canvasLinks.filter((l) => l.dossierId === dossierId), [data.canvasLinks, dossierId]);
}
