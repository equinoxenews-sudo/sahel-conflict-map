"use client";

import type { SearchKind } from "./search";

// Ouvre la fenêtre de recherche globale (écoutée par SearchDialog, montée une fois dans le layout) :
// depuis la barre du haut, la barre du globe, le raccourci « / » ou le menu mobile.
export const OPEN_SEARCH_EVENT = "equinoxe:open-search";

export interface OpenSearchDetail {
  query?: string;
  kind?: SearchKind;
}

export function openSearch(detail: OpenSearchDetail = {}): void {
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail }));
}
