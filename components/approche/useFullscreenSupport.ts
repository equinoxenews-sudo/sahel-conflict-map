"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => undefined;

/** Vrai si le navigateur permet le plein écran ; faux côté serveur et à l'hydratation (aucune différence de rendu). */
export function useFullscreenSupport(): boolean {
  return useSyncExternalStore(noop, () => Boolean(document.fullscreenEnabled), () => false);
}
