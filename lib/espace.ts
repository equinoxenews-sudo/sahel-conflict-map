// « Mon espace » : l'espace privé de l'abonné (dossiers, notes, graphes, recherche, supervision, suivi, outils).
// Logique de navigation pure (sans React), testée dans tests/espace-nav.test.ts.

export const ESPACE_ROOT = "/mon-espace";

export type EspaceSection = "menu" | "notes" | "graph" | "investigation" | "supervision" | "tracking" | "outils";

export interface EspaceNavItem {
  key: EspaceSection;
  label: string;
  href: string;
}

/** Les sept entrées du menu de gauche, dans l'ordre d'affichage. */
export const ESPACE_NAV: readonly EspaceNavItem[] = [
  { key: "menu", label: "Menu", href: ESPACE_ROOT },
  { key: "notes", label: "Notes", href: `${ESPACE_ROOT}/notes` },
  { key: "graph", label: "Graph", href: `${ESPACE_ROOT}/graph` },
  { key: "investigation", label: "Investigation", href: `${ESPACE_ROOT}/investigation` },
  { key: "supervision", label: "Supervision", href: `${ESPACE_ROOT}/supervision` },
  { key: "tracking", label: "Tracking", href: `${ESPACE_ROOT}/tracking` },
  { key: "outils", label: "Outils", href: `${ESPACE_ROOT}/outils` },
];

/** Ce que montre la page d'un dossier : ses sources, son graphe ou ses notes. */
export type DossierView = "sources" | "graphe" | "notes";

const VIEWS: readonly DossierView[] = ["sources", "graphe", "notes"];

/** Vue demandée dans l'adresse (`?vue=`) ; les notes par défaut. */
export function parseDossierView(value: string | null | undefined): DossierView {
  return VIEWS.includes(value as DossierView) ? (value as DossierView) : "notes";
}

export function dossierHref(dossierId: string, view: DossierView = "notes"): string {
  return `${ESPACE_ROOT}/dossier/${encodeURIComponent(dossierId)}?vue=${view}`;
}

/**
 * Entrée du menu à mettre en évidence. La page d'un dossier suit la vue ouverte : le graphe allume « Graph »,
 * les notes et les sources allument « Notes ».
 */
export function activeSection(pathname: string, view: string | null | undefined): EspaceSection {
  const clean = pathname.replace(/\/+$/, "");
  if (clean === ESPACE_ROOT || !clean.startsWith(`${ESPACE_ROOT}/`)) return "menu";
  const first = clean.slice(ESPACE_ROOT.length + 1).split("/")[0];
  switch (first) {
    case "notes":
      return "notes";
    case "graph":
      return "graph";
    case "dossier":
      return parseDossierView(view) === "graphe" ? "graph" : "notes";
    case "investigation":
    case "supervision":
    case "tracking":
    case "outils":
      return first;
    default:
      return "menu";
  }
}
